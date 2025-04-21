"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { lyrics, isChorusLine } from "../lib/utils"
import confetti from "canvas-confetti"

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
  const [backgroundLoaded, setBackgroundLoaded] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [chorusTransition, setChorusTransition] = useState(false)
  const [chorusCount, setChorusCount] = useState(0)

  // Refs for performance optimization
  const lastActiveIndexRef = useRef(-1)
  const audioLevelTimestampRef = useRef(0)
  const animationFrameRef = useRef(null)
  const isMountedRef = useRef(true)
  const throttledAudioLevel = useRef([])
  const resizeTimeoutRef = useRef(null)
  const confettiCanvasRef = useRef(null)
  const confettiInstanceRef = useRef(null)
  const lastChorusTimeRef = useRef(0)
  const prevIsChorusRef = useRef(false)

  // Check for mobile devices with debounce
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()

    // Debounced resize handler
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
      resizeTimeoutRef.current = setTimeout(checkMobile, 200)
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
    }
  }, [])

  // Initialize confetti
  useEffect(() => {
    // Create a canvas for confetti
    const canvas = document.createElement("canvas")
    canvas.className = "fixed inset-0 pointer-events-none z-30"
    canvas.style.width = "100%"
    canvas.style.height = "100%"
    document.body.appendChild(canvas)

    confettiCanvasRef.current = canvas
    confettiInstanceRef.current = confetti.create(canvas, {
      resize: true,
      useWorker: true,
    })

    return () => {
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas)
      }
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [])

  // Find active lyric based on current time - optimized with binary search
  const findActiveLyric = useCallback((time) => {
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
          const chorusDetected = isChorusLine(lyricText)

          // Detect transition to chorus
          if (chorusDetected !== isChorus) {
            setIsChorus(chorusDetected)

            // If transitioning TO chorus, trigger effects
            if (chorusDetected) {
              setChorusTransition(true)
              setChorusCount((prev) => prev + 1)

              // Trigger confetti for chorus
              if (confettiInstanceRef.current) {
                const now = Date.now()
                // Limit how often we trigger confetti (at least 5 seconds between)
                if (now - lastChorusTimeRef.current > 5000) {
                  lastChorusTimeRef.current = now

                  // Different confetti patterns for different chorus sections
                  if (chorusCount % 3 === 0) {
                    // First chorus - celebratory burst
                    confettiInstanceRef.current({
                      particleCount: 100,
                      spread: 70,
                      origin: { y: 0.6 },
                      colors: ["#e34a7b", "#7c3aed", "#ffffff"],
                    })
                  } else if (chorusCount % 3 === 1) {
                    // Second chorus - side bursts
                    confettiInstanceRef.current({
                      particleCount: 50,
                      angle: 60,
                      spread: 55,
                      origin: { x: 0, y: 0.65 },
                      colors: ["#e34a7b", "#7c3aed", "#ffffff"],
                    })

                    setTimeout(() => {
                      if (confettiInstanceRef.current) {
                        confettiInstanceRef.current({
                          particleCount: 50,
                          angle: 120,
                          spread: 55,
                          origin: { x: 1, y: 0.65 },
                          colors: ["#e34a7b", "#7c3aed", "#ffffff"],
                        })
                      }
                    }, 300)
                  } else {
                    // Third chorus - firework effect
                    const duration = 5 * 1000
                    const animationEnd = Date.now() + duration
                    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

                    const interval = setInterval(() => {
                      const timeLeft = animationEnd - Date.now()

                      if (timeLeft <= 0) {
                        return clearInterval(interval)
                      }

                      const particleCount = 50 * (timeLeft / duration)

                      // Since particles fall down, start a bit higher than random
                      confettiInstanceRef.current({
                        ...defaults,
                        particleCount,
                        origin: { x: Math.random(), y: Math.random() - 0.2 },
                        colors: ["#e34a7b", "#ff6b9d", "#7c3aed", "#ffffff"],
                      })
                    }, 250)
                  }
                }
              }

              // Reset transition flag after a delay
              setTimeout(() => {
                if (isMountedRef.current) {
                  setChorusTransition(false)
                }
              }, 2000)
            }
          }
        }
      }
    },
    [findActiveLyric, isChorus],
  )

  // Handle play state change
  const handlePlayStateChange = useCallback((playing) => {
    if (!isMountedRef.current) return
    setIsPlaying(playing)
  }, [])

  // Handle audio level update with throttling for better performance
  const handleAudioLevelUpdate = useCallback((levels) => {
    if (!isMountedRef.current) return

    // Store the latest audio levels, but only update state periodically
    throttledAudioLevel.current = levels

    const now = performance.now()
    // Only process audio data every 50ms to reduce load
    if (now - audioLevelTimestampRef.current > 50) {
      audioLevelTimestampRef.current = now

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        if (isMountedRef.current) {
          setAudioLevel(throttledAudioLevel.current)
        }
      })
    }
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

  // Handle background load
  const handleBackgroundLoad = useCallback(() => {
    setBackgroundLoaded(true)
  }, [])

  // Create a memoized subset of audio levels for the background
  // This helps reduce memory usage and processing for the WebGL context
  const optimizedAudioLevels = useCallback(() => {
    if (!audioLevel || audioLevel.length === 0) return []

    // Only send a subset of the audio data to reduce processing
    const stride = Math.ceil(audioLevel.length / 16) // Only use 16 data points
    const result = []

    for (let i = 0; i < audioLevel.length; i += stride) {
      result.push(audioLevel[i])
    }

    return result
  }, [audioLevel])

  // Special chorus background effect
  const ChorusBackground = useCallback(() => {
    if (!isChorus) return null

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 z-[-5] pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, rgba(227, 74, 123, 0.2) 0%, rgba(123, 58, 237, 0.1) 50%, transparent 70%)`,
          filter: "blur(40px)",
        }}
      />
    )
  }, [isChorus])

  // Chorus transition effect
  const ChorusTransitionEffect = useCallback(() => {
    if (!chorusTransition) return null

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8, scale: [1, 1.2, 0] }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.5 }}
        className="fixed inset-0 z-30 pointer-events-none flex items-center justify-center"
      >
        <div className="relative w-full h-full">
          {/* Central burst */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.5, 0] }}
            transition={{ duration: 1.2 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full"
            style={{
              background: `radial-gradient(circle, rgba(227, 74, 123, 0.7) 0%, rgba(227, 74, 123, 0) 70%)`,
              filter: "blur(10px)",
            }}
          />

          {/* Light rays */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0] }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at center, transparent 30%, rgba(227, 74, 123, 0.3) 70%)`,
            }}
          />
        </div>
      </motion.div>
    )
  }, [chorusTransition])

  return (
    <motion.div
      className="relative min-h-screen overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      style={{ transform: "translateZ(0)" }}
    >
      {/* Background */}
      <div className="fixed inset-0 z-[-1]">
        <ErrorBoundary>
          <Background
            isPlaying={isPlaying}
            audioLevel={optimizedAudioLevels()}
            currentLyric={activeLyric}
            isChorus={isChorus}
            isMobile={isMobile}
            onLoad={handleBackgroundLoad}
          />
        </ErrorBoundary>
      </div>

      {/* Special chorus background effect */}
      <AnimatePresence>{isChorus && <ChorusBackground />}</AnimatePresence>

      {/* Chorus transition effect */}
      <AnimatePresence>{<ChorusTransitionEffect />}</AnimatePresence>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
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
        <LyricsVisualizer currentTime={currentTime} isPlaying={isPlaying} audioLevel={audioLevel} isMobile={isMobile} />
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
        transition={{ duration: 0.3, delay: 0.3 }}
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
    </motion.div>
  )
}

export default DieWithASmile
