import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { findActiveLyric, chorusLines } from "../lib/utils"

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

  // Current lyric tracking
  const [activeLyric, setActiveLyric] = useState("")
  const [isChorus, setIsChorus] = useState(false)

  // UI state
  const [showControls, setShowControls] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // Refs
  const containerRef = useRef(null)
  const lastActiveIndexRef = useRef(-1)
  const idleTimerRef = useRef(null)
  const isMountedRef = useRef(true)

  // Check for mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
    }
  }, [])

  // Handle time update from audio player
  const handleTimeUpdate = (time) => {
    if (!isMountedRef.current) return
    setCurrentTime(time)

    // Find current lyric based on time
    const activeLyricData = findActiveLyric(time)
    if (activeLyricData) {
      const lyricIndex = activeLyricData.index
      const lyricText = activeLyricData.text

      // Only update if the index changed (prevents unnecessary re-renders)
      if (lyricIndex !== lastActiveIndexRef.current) {
        lastActiveIndexRef.current = lyricIndex
        setActiveLyric(lyricText)

        // Check if this is a chorus line
        const isChorusLine = chorusLines.some((line) => 
          lyricText.includes(line) || line.includes(lyricText)
        )
        setIsChorus(isChorusLine)
      }
    }
  }

  // Handle play state change
  const handlePlayStateChange = (playing) => {
    if (!isMountedRef.current) return
    setIsPlaying(playing)
  }

  // Handle audio level update for visualizations
  const handleAudioLevelUpdate = (levels) => {
    if (!isMountedRef.current) return
    setAudioLevel(levels)
  }

  // Handle duration update
  const handleDurationUpdate = (newDuration) => {
    if (!isMountedRef.current) return
    setDuration(newDuration)
  }

  // Handle UI idle state
  useEffect(() => {
    if (!isMountedRef.current) return

    const handleActivity = () => {
      setShowControls(true)

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)

      const timer = setTimeout(() => {
        if (isPlaying && isMountedRef.current) {
          setShowControls(false)
        }
      }, 4000)

      idleTimerRef.current = timer
    }

    window.addEventListener("mousemove", handleActivity)
    window.addEventListener("click", handleActivity)
    window.addEventListener("touchstart", handleActivity)
    window.addEventListener("keydown", handleActivity)

    return () => {
      window.removeEventListener("mousemove", handleActivity)
      window.removeEventListener("click", handleActivity)
      window.removeEventListener("touchstart", handleActivity)
      window.removeEventListener("keydown", handleActivity)
      
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [isPlaying])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isMountedRef.current) return

    const handleKeyDown = (e) => {
      // Space key toggles play/pause
      if (e.key === " " && document.activeElement.tagName !== "BUTTON" && document.activeElement.tagName !== "INPUT") {
        // Prevent default space behavior (scrolling)
        e.preventDefault()
        // Toggle play state
        setIsPlaying(prev => !prev)
      }
      // 'Escape' key shows controls
      else if (e.key === "Escape") {
        setShowControls(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <motion.div
      ref={containerRef}
      className="relative min-h-screen overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* Background */}
      <Background 
        isPlaying={isPlaying} 
        audioLevel={audioLevel} 
        currentLyric={activeLyric} 
        isChorus={isChorus} 
      />

      {/* Lyrics Visualizer - Always centered */}
      <LyricsVisualizer 
        currentTime={currentTime} 
        isPlaying={isPlaying} 
        audioLevel={audioLevel} 
      />

      {/* Code Visualizer - Positioned based on device */}
      <CodeVisualizer 
        currentTime={currentTime} 
        isPlaying={isPlaying} 
        currentLyric={activeLyric}
        isMobile={isMobile}
      />

      {/* Header - only visible when not playing or on hover */}
      <AnimatePresence>
        {showControls && (
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed top-0 left-0 right-0 z-40 pt-8 pb-4 px-6 text-center bg-gradient-to-b from-black/80 to-transparent"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-gradient-gold mb-1 tracking-tight text-shadow-gold">
              Die With A Smile
            </h1>
            <p className="text-lg md:text-xl font-elegant italic text-gradient">Bruno Mars & Lady Gaga</p>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Controls Container - bottom of screen */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-black/80 to-transparent"
          >
            <div className="max-w-3xl mx-auto">
              <AudioPlayer
                onTimeUpdate={handleTimeUpdate}
                onPlayStateChange={handlePlayStateChange}
                onAudioLevelUpdate={handleAudioLevelUpdate}
                onDurationUpdate={handleDurationUpdate}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click anywhere to show controls when hidden */}
      {!showControls && (
        <button
          onClick={() => setShowControls(true)}
          className="fixed inset-0 w-full h-full z-10 cursor-default bg-transparent"
          aria-label="Show controls"
        />
      )}

      {/* Section indicator */}
      <AnimatePresence>
        {isPlaying && !showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.7, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
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
      </AnimatePresence>

      {/* Current lyric mini display */}
      <AnimatePresence>
        {isPlaying && !showControls && activeLyric && activeLyric !== "..." && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.9, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-4 right-4 z-30 pointer-events-none"
          >
            <div className="px-3 py-2 rounded-lg backdrop-blur-md bg-gray-900/40 text-sm max-w-xs truncate">
              {activeLyric}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard shortcuts hint - shown briefly */}
      <AnimatePresence>
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
              Tekan <kbd className="px-1 py-0.5 bg-gray-800 rounded">Esc</kbd> untuk menampilkan kontrol
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default DieWithASmile
