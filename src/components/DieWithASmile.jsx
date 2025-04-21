"use client"

import { useState, useRef, useEffect, useCallback, Suspense, lazy } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { lyrics, chorusLines } from "../lib/utils"

import ErrorBoundary from "./ErrorBoundary"
// Lazy load the background component to reduce initial load
const Background = lazy(() => import('./Background'))
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
  const [backgroundMounted, setBackgroundMounted] = useState(true)
  const [backgroundKey, setBackgroundKey] = useState(0) // Used to force remount if needed

  // Refs for performance
  const lastActiveIndexRef = useRef(-1)
  const audioLevelTimestampRef = useRef(0)
  const animationFrameRef = useRef(null)
  const isMountedRef = useRef(true)
  const recoveryAttemptsRef = useRef(0)
  const throttledAudioLevel = useRef([])

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
        animationFrameRef.current = null
      }
    }
  }, [])

  // Set up global WebGL context loss recovery
  useEffect(() => {
    const handleContextLost = () => {
      console.warn("WebGL context lost - attempting recovery...")
      
      if (recoveryAttemptsRef.current < 3) {
        // Try to recover by remounting the background component
        setBackgroundMounted(false)
        
        setTimeout(() => {
          recoveryAttemptsRef.current++
          setBackgroundKey(prev => prev + 1)
          setBackgroundMounted(true)
        }, 1000)
      } else {
        // After multiple recovery attempts, show a simplified background
        console.warn("Multiple recovery attempts failed - using fallback mode")
        // We'll just keep the background mounted but with reduced features
      }
    }

    window.addEventListener('webglcontextlost', handleContextLost)
    
    return () => {
      window.removeEventListener('webglcontextlost', handleContextLost)
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
        if (lyricText !== activeLyric) {
          lastActiveIndexRef.current = lyricIndex
          setActiveLyric(lyricText)

          // Check if this is a chorus line
          const isChorusLine = chorusLines.some((line) => {
            const lowerLyric = lyricText.toLowerCase()
            const lowerLine = line.toLowerCase()
            return lowerLyric.includes(lowerLine) || lowerLine.includes(lowerLyric)
          })
          
          if (isChorusLine !== isChorus) {
            setIsChorus(isChorusLine)
          }
        }
      }
    },
    [findActiveLyric, activeLyric, isChorus],
  )

  // Handle play state change
  const handlePlayStateChange = useCallback((playing) => {
    if (!isMountedRef.current) return
    setIsPlaying(playing)
  }, [])

  // Handle audio level update with throttling to reduce workload
  const handleAudioLevelUpdate = useCallback((levels) => {
    if (!isMountedRef.current) return

    // Store the latest audio levels, but only update state periodically
    throttledAudioLevel.current = levels

    const now = performance.now()
    // Only process audio data every 50ms to reduce load on WebGL context
    if (now - audioLevelTimestampRef.current > 50) {
      audioLevelTimestampRef.current = now
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        setAudioLevel(throttledAudioLevel.current)
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

  // Handle background loading
  const handleBackgroundLoaded = useCallback(() => {
    setBackgroundLoaded(true)
  }, [])

  // Create a memoized subset of audio levels for the background
  // This helps reduce memory usage and processing for the WebGL context
  const optimizedAudioLevels = useCallback(() => {
    if (!audioLevel || audioLevel.length === 0) return [];
    
    // Only send a subset of the audio data to reduce processing
    const stride = Math.ceil(audioLevel.length / 16); // Only use 16 data points
    const result = [];
    
    for (let i = 0; i < audioLevel.length; i += stride) {
      result.push(audioLevel[i]);
    }
    
    return result;
  }, [audioLevel]);

  return (
    <motion.div
      className="relative min-h-screen overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* Background - Now with better error handling and performance optimizations */}
      <div className="fixed inset-0 z-[-1]">
        <ErrorBoundary>
          <AnimatePresence mode="wait">
            {backgroundMounted && (
              <Suspense fallback={
                <div className="w-full h-full bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
                  <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              }>
                <Background 
                  key={`background-${backgroundKey}`} 
                  isPlaying={isPlaying} 
                  audioLevel={optimizedAudioLevels()} 
                  currentLyric={activeLyric} 
                  isChorus={isChorus}
                  onLoad={handleBackgroundLoaded}
                  recoveryMode={recoveryAttemptsRef.current > 0}
                />
              </Suspense>
            )}
          </AnimatePresence>
        </ErrorBoundary>
      </div>

      {/* Loading overlay */}
      <AnimatePresence>
        {!backgroundLoaded && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="text-center">
              <div className="w-16 h-16 mb-4 mx-auto border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xl">Loading experience...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: backgroundLoaded ? 1 : 0, y: backgroundLoaded ? 0 : -20 }}
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
        animate={{ opacity: backgroundLoaded ? 1 : 0, y: backgroundLoaded ? 0 : 50 }}
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

      {/* WebGL Context recovery message */}
      <AnimatePresence>
        {recoveryAttemptsRef.current > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-black/80 px-4 py-2 rounded-lg text-white text-center"
          >
            <p className="text-sm">Optimizing visuals for your device...</p>
          </motion.div>
        )}
      </AnimatePresence>

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