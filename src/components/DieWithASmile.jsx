"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { lyrics, chorusLines } from "../lib/utils"

import ErrorBoundary from "./ErrorBoundary"
import Background from "./Background"
import AudioPlayer from "./AudioPlayer"
import LyricsVisualizer from "./LyricsVisualizer"
import CodeVisualizer from "./CodeVisualizer"

const DieWithASmile = () => {
  // Core state
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioLevel, setAudioLevel] = useState([])
  const [duration, setDuration] = useState(0)
  const [activeLyric, setActiveLyric] = useState("")
  const [isChorus, setIsChorus] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [audioError, setAudioError] = useState(false)

  // Refs for performance
  const lastActiveIndexRef = useRef(-1)
  const animationFrameRef = useRef(null)
  const isMountedRef = useRef(true)

  // Check for mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // Find active lyric based on current time
  const findActiveLyric = useCallback((time) => {
    // Binary search for better performance with sorted data
    let start = 0
    let end = lyrics.length - 1
    let result = -1

    while (start <= end) {
      const mid = Math.floor((start + end) / 2)
      if (lyrics[mid].time <= time) {
        result = mid
        start = mid + 1
      } else {
        end = mid - 1
      }
    }

    if (result !== -1) {
      // Check next lyric timing to ensure we're in the right segment
      const nextIndex = result + 1
      if (nextIndex < lyrics.length && time >= lyrics[nextIndex].time) {
        return { index: nextIndex, text: lyrics[nextIndex].text }
      }
      return { index: result, text: lyrics[result].text }
    }

    return null
  }, [])

  // Handle time update from audio player
  const handleTimeUpdate = useCallback(
    (time) => {
      if (!isMountedRef.current) return

      setCurrentTime(time)

      // Find current lyric
      const activeLyricData = findActiveLyric(time)

      if (activeLyricData) {
        const lyricIndex = activeLyricData.index
        const lyricText = activeLyricData.text

        // Only update if index changed (prevents unnecessary re-renders)
        if (lyricIndex !== lastActiveIndexRef.current) {
          lastActiveIndexRef.current = lyricIndex
          setActiveLyric(lyricText)

          // Check if this is a chorus line
          const isChorusLine = chorusLines.some((line) => {
            const lowerLyric = lyricText.toLowerCase()
            const lowerLine = line.toLowerCase()
            return lowerLyric.includes(lowerLine) || lowerLine.includes(lowerLyric)
          })
          setIsChorus(isChorusLine)
        }
      }
    },
    [findActiveLyric],
  )

  // Handle play state change
  const handlePlayStateChange = useCallback((playing) => {
    if (!isMountedRef.current) return
    setIsPlaying(playing)
  }, [])

  // Handle audio level update with throttling for better performance
  const handleAudioLevelUpdate = useCallback((levels) => {
    if (!isMountedRef.current) return

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      setAudioLevel(levels)
    })
  }, [])

  // Handle duration update
  const handleDurationUpdate = useCallback((newDuration) => {
    if (!isMountedRef.current) return
    setDuration(newDuration)
  }, [])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e) => {
      // Space key toggles play/pause
      if (e.key === " " && document.activeElement.tagName !== "BUTTON" && document.activeElement.tagName !== "INPUT") {
        e.preventDefault()
        setIsPlaying((prev) => !prev)
      }

      // Left arrow key seeks backward
      if (e.key === "ArrowLeft") {
        setCurrentTime((prev) => Math.max(0, prev - 5))
      }

      // Right arrow key seeks forward
      if (e.key === "ArrowRight") {
        setCurrentTime((prev) => Math.min(duration, prev + 5))
      }
    },
    [duration],
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  // Handle errors
  const handleError = useCallback((error) => {
    console.error("Application error:", error)
    setAudioError(true)
  }, [])

  return (
    <motion.div
      className="relative min-h-screen overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      style={{ transform: "translateZ(0)" }}
    >
      {/* Background - Make sure it fills the entire screen */}
      <div className="fixed inset-0 z-[-1]">
        <ErrorBoundary>
          <Background isPlaying={isPlaying} audioLevel={audioLevel} currentLyric={activeLyric} isChorus={isChorus} />
        </ErrorBoundary>
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed top-0 left-0 right-0 z-40 pt-8 pb-4 px-6 text-center bg-gradient-to-b from-black/80 to-transparent"
      >
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-1 tracking-tight bg-gradient-to-r from-white via-primary-300 to-secondary-300 text-transparent bg-clip-text">
          Die With A Smile
        </h1>
        <p className="text-lg md:text-xl italic bg-gradient-to-r from-white/80 to-white/60 text-transparent bg-clip-text">
          Bruno Mars & Lady Gaga
        </p>
      </motion.header>

      {/* Lyrics Visualizer - Center of screen */}
      <ErrorBoundary>
        <LyricsVisualizer currentTime={currentTime} isPlaying={isPlaying} audioLevel={audioLevel} />
      </ErrorBoundary>

      {/* Code Visualizer - Below header */}
      <ErrorBoundary>
        <CodeVisualizer
          currentTime={currentTime}
          isPlaying={isPlaying}
          currentLyric={activeLyric}
          isChorus={isChorus}
          isMobile={isMobile}
        />
      </ErrorBoundary>

      {/* Audio player - Always visible at bottom */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-black/80 to-transparent"
      >
        <ErrorBoundary>
          <AudioPlayer
            onTimeUpdate={handleTimeUpdate}
            onPlayStateChange={handlePlayStateChange}
            onAudioLevelUpdate={handleAudioLevelUpdate}
            onDurationUpdate={handleDurationUpdate}
            onError={handleError}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
          />
        </ErrorBoundary>
      </motion.div>

      {/* Section indicator */}
      {isPlaying && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.7, y: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-4 left-4 z-30 pointer-events-none"
        >
          <div
            className={`px-3 py-1 rounded-full backdrop-blur-sm text-xs
            ${isChorus ? "bg-primary-500/30 text-primary-300" : "bg-gray-800/30 text-gray-300"}`}
          >
            {isChorus ? (
              <span className="flex items-center">
                <span className="inline-block w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse mr-1.5"></span>
                CHORUS
              </span>
            ) : (
              "VERSE"
            )}
          </div>
        </motion.div>
      )}

      {/* Error message for audio loading issues */}
      {audioError && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-black/80 p-4 rounded-lg text-white text-center max-w-md">
          <h3 className="text-xl mb-2">Audio Loading Error</h3>
          <p>There was a problem loading the audio file. Please check your connection and try again.</p>
          <button
            className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-md"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      )}

      {/* Keyboard shortcut hint */}
      {isPlaying && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="fixed top-4 right-4 z-30 pointer-events-none"
        >
          <motion.div
            className="px-3 py-2 rounded-lg backdrop-blur-md bg-gray-900/40 text-xs"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -10 }}
            transition={{ delay: 5, duration: 2 }}
          >
            Press <kbd className="px-1 py-0.5 bg-gray-800 rounded">Space</kbd> to play/pause
          </motion.div>
        </motion.div>
      )}

      {/* Global styles */}
      <style jsx global>{`
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans",
            "Helvetica Neue", sans-serif;
          background-color: #000;
          color: #fff;
        }

        .text-gradient {
          background: linear-gradient(to right, #e34a7b, #7c3aed);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .text-gradient-gold {
          background: linear-gradient(to right, #fff, #f0f0f0);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .text-shadow-gold {
          text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
        }

        .glass-dark {
          background: rgba(15, 15, 20, 0.6);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .glitch {
          animation: glitch 0.3s linear;
        }

        @keyframes glitch {
          0% {
            transform: translate(0);
          }
          20% {
            transform: translate(-2px, 2px);
          }
          40% {
            transform: translate(-2px, -2px);
          }
          60% {
            transform: translate(2px, 2px);
          }
          80% {
            transform: translate(2px, -2px);
          }
          100% {
            transform: translate(0);
          }
        }
      `}</style>
    </motion.div>
  )
}

export default DieWithASmile
