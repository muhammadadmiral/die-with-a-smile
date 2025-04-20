"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { lyrics, findActiveLyric, chorusLines } from "../lib/utils"

import Background from "./Background"
import AudioPlayer from "./AudioPlayer"
import LyricsVisualizer from "./LyricsVisualizer"
import CodeVisualizer from "./CodeVisualizer"

const DieWithASmile = () => {
  // Core state
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [pageLoaded, setPageLoaded] = useState(false)
  const [audioLevel, setAudioLevel] = useState([])
  const [showFallback, setShowFallback] = useState(false)
  
  // Current lyric tracking
  const [activeLyric, setActiveLyric] = useState("")
  const [currentSection, setCurrentSection] = useState("intro")
  const [isChorus, setIsChorus] = useState(false)
  
  // UI state
  const [idleTimer, setIdleTimer] = useState(null)
  const [showIntro, setShowIntro] = useState(true)
  const [visualizerMode, setVisualizerMode] = useState("full") // full, code, lyrics
  const [showControls, setShowControls] = useState(true)
  const [isInitialPlay, setIsInitialPlay] = useState(true)
  
  // Error tracking
  const [errors, setErrors] = useState([])
  
  // Refs
  const containerRef = useRef(null)
  const lastActiveIndexRef = useRef(-1)
  const lastErrorTimeRef = useRef(0)

  // Handle time update from audio player
  const handleTimeUpdate = (time) => {
    setCurrentTime(time)
    
    // Find current lyric based on time
    const activeLyricData = findActiveLyric(time)
    if (activeLyricData) {
      const lyricIndex = activeLyricData.index
      
      // Only update if the index changed (prevents unnecessary re-renders)
      if (lyricIndex !== lastActiveIndexRef.current) {
        lastActiveIndexRef.current = lyricIndex
        setActiveLyric(activeLyricData.text)
        
        // Check if this is a chorus line
        const isChorusLine = chorusLines.some(line => 
          activeLyricData.text.includes(line) || 
          line.includes(activeLyricData.text)
        )
        setIsChorus(isChorusLine)
        
        // Determine current section
        if (time < 36) {
          setCurrentSection("intro")
        } else if (time >= 36 && time < 60) {
          setCurrentSection("chorus")
        } else if (time >= 60 && time < 92) {
          setCurrentSection("verse2")
        } else if (time >= 92 && time < 129) {
          setCurrentSection("chorus")
        } else if (time >= 129) {
          setCurrentSection("outro")
        }
      }
    }
  }

  // Handle play state change
  const handlePlayStateChange = (playing) => {
    setIsPlaying(playing)
    
    // First play - remove intro automatically
    if (playing && isInitialPlay) {
      setIsInitialPlay(false)
      setShowIntro(false)
    }
  }
  
  // Handle audio level update for visualizations
  const handleAudioLevelUpdate = (levels) => {
    setAudioLevel(levels)
  }

  // Handle errors with rate limiting
  const handleError = (error) => {
    // Only record one error per second (prevent flood)
    const now = Date.now()
    if (now - lastErrorTimeRef.current < 1000) return
    
    lastErrorTimeRef.current = now
    console.error("Component error:", error)
    
    setErrors(prev => {
      // Keep last 5 errors max
      const newErrors = [...prev, error.toString()].slice(-5)
      
      // Show fallback after 3 errors
      if (newErrors.length >= 3) {
        setShowFallback(true)
      }
      
      return newErrors
    })
  }

  // Page load animation
  useEffect(() => {
    const loadTimer = setTimeout(() => {
      setPageLoaded(true)
      
      // After page load, show intro for a few seconds
      const introTimer = setTimeout(() => {
        if (!isPlaying) {
          // Only auto-hide intro if not playing - otherwise let play state handle it
          setShowIntro(false)
        }
      }, 5000)
      
      return () => clearTimeout(introTimer)
    }, 1500)
    
    return () => clearTimeout(loadTimer)
  }, [isPlaying])

  // Handle UI idle state
  useEffect(() => {
    const handleActivity = () => {
      setShowControls(true)
      
      if (idleTimer) clearTimeout(idleTimer)
      
      const timer = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false)
        }
      }, 4000) 
      
      setIdleTimer(timer)
    }
    
    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('click', handleActivity)
    window.addEventListener('keydown', handleActivity)
    
    return () => {
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('click', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      if (idleTimer) clearTimeout(idleTimer)
    }
  }, [isPlaying, idleTimer])

  // Toggle visualizer modes
  const toggleCodeView = () => {
    if (visualizerMode === "code") {
      setVisualizerMode("full")
    } else {
      setVisualizerMode("code")
    }
  }
  
  const toggleLyricsView = () => {
    if (visualizerMode === "lyrics") {
      setVisualizerMode("full")
    } else {
      setVisualizerMode("lyrics")
    }
  }
  
  // Start the experience
  const startExperience = () => {
    setShowIntro(false)
  }
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 'C' key toggles code visualizer
      if (e.key === 'c' && e.ctrlKey) {
        toggleCodeView()
      } 
      // 'L' key toggles lyrics visualizer
      else if (e.key === 'l' && e.ctrlKey) {
        toggleLyricsView()
      }
      // 'F' key toggles full experience
      else if (e.key === 'f' && e.ctrlKey) {
        setVisualizerMode("full")
      }
      // 'Escape' key shows controls
      else if (e.key === 'Escape') {
        setShowControls(true)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  
  // Error boundary handler
  useEffect(() => {
    const errorHandler = (event) => {
      console.error("Global error:", event.error)
      handleError(event.error || "Unknown error")
    }
    
    window.addEventListener('error', errorHandler)
    
    return () => {
      window.removeEventListener('error', errorHandler)
    }
  }, [])

  return (
    <AnimatePresence mode="wait">
      {!pageLoaded ? (
        // Loading screen
        <motion.div 
          className="fixed inset-0 bg-dark-950 z-50 flex items-center justify-center"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              transition: { duration: 0.5 }
            }}
            exit={{ 
              opacity: 0, 
              scale: 1.2,
              transition: { duration: 0.5 }
            }}
            className="text-center"
          >
            <h1 className="text-5xl font-display text-gradient-gold mb-4">
              Die With A Smile
            </h1>
            <p className="text-xl mb-6 text-gray-300">Bruno Mars & Lady Gaga</p>
            
            <div className="flex space-x-3 justify-center">
              <motion.div
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: 0
                }}
                className="w-3 h-3 rounded-full bg-primary-500"
              />
              <motion.div
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: 0.2
                }}
                className="w-3 h-3 rounded-full bg-secondary-500"
              />
              <motion.div
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: 0.4
                }}
                className="w-3 h-3 rounded-full bg-primary-500"
              />
            </div>
          </motion.div>
        </motion.div>
      ) : showIntro ? (
        // Intro screen
        <motion.div 
          className="fixed inset-0 bg-dark-950 bg-opacity-80 z-40 flex items-center justify-center"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-xl p-8 glass-dark rounded-xl shadow-glow"
          >
            <h2 className="text-4xl font-display text-gradient mb-4">
              Die With A Smile Experience
            </h2>
            <p className="text-lg mb-6">
              Pengalaman interaktif dengan lirik yang dramatis, visualisasi kode dan audio yang responsif. Nikmati lagu dengan cara yang berbeda.
            </p>
            <button
              onClick={startExperience}
              className="px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full text-white font-bold hover:shadow-glow transition-all duration-300"
            >
              Mulai Pengalaman
            </button>
            
            <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-gray-900/50 rounded-lg">
                <div className="text-primary-400 mb-1">🎵 Audio</div>
                <p className="text-xs text-gray-300">Dengarkan audio dengan visualizer yang responsif</p>
              </div>
              <div className="p-3 bg-gray-900/50 rounded-lg">
                <div className="text-primary-400 mb-1">🎤 Lirik</div>
                <p className="text-xs text-gray-300">Nikmati lirik dengan animasi yang dinamis</p>
              </div>
              <div className="p-3 bg-gray-900/50 rounded-lg">
                <div className="text-primary-400 mb-1">💻 Kode</div>
                <p className="text-xs text-gray-300">Lihat "kode cinta" dengan animasi typewriter</p>
              </div>
            </div>
            
            <div className="mt-4 text-xs text-gray-400">
              Tip: Gunakan <kbd className="px-1 py-0.5 bg-gray-800 rounded">Ctrl+L</kbd> untuk mode lirik, <kbd className="px-1 py-0.5 bg-gray-800 rounded">Ctrl+C</kbd> untuk mode kode
            </div>
            
            <div className="mt-6 text-gray-400">
              <p className="text-sm">Atau mulai pemutaran untuk langsung menikmati pengalaman</p>
            </div>
          </motion.div>
        </motion.div>
      ) : (
        // Main content
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

          {/* Lyrics Visualizer (conditionally shown based on visualizerMode) */}
          {(visualizerMode === "full" || visualizerMode === "lyrics") && (
            <LyricsVisualizer 
              currentTime={currentTime} 
              isPlaying={isPlaying} 
              audioLevel={audioLevel}
            />
          )}
          
          {/* Code Visualizer (conditionally shown based on visualizerMode) */}
          {(visualizerMode === "full" || visualizerMode === "code") && (
            <CodeVisualizer 
              currentTime={currentTime} 
              isPlaying={isPlaying} 
              currentLyric={activeLyric}
            />
          )}

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
                <p className="text-lg md:text-xl font-elegant italic text-gradient">
                  Bruno Mars & Lady Gaga
                </p>
                
                {/* Show error count as warning if errors present */}
                {errors.length > 0 && (
                  <div className="mt-2 text-yellow-300 text-sm">
                    <p>Beberapa kesalahan terdeteksi: {errors.length}</p>
                  </div>
                )}
                
                {/* Visualizer mode toggles */}
                <div className="mt-4 flex justify-center space-x-4">
                  <button 
                    onClick={toggleLyricsView}
                    className={`p-2 rounded-full transition-all ${visualizerMode === "lyrics" ? 'bg-primary-500 text-white' : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80'}`}
                    title="Lyrics view (Ctrl+L)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.5 10c.5-.756.5-2.244 0-3a1 1 0 0 0-1-1 3 3 0 0 0-3 3c0 .256.01.51.03.764a5 5 0 0 0-4.56 4.266 3 3 0 1 0 1.913.47 3 3 0 0 1 2.218-2.226 3 3 0 1 0 4.4-2.274Z"/>
                      <circle cx="5" cy="17" r="1"/><circle cx="15" cy="5" r="1"/>
                    </svg>
                  </button>
                  
                  <button 
                    onClick={toggleCodeView}
                    className={`p-2 rounded-full transition-all ${visualizerMode === "code" ? 'bg-primary-500 text-white' : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80'}`}
                    title="Code view (Ctrl+C)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 18 22 12 16 6"></polyline>
                      <polyline points="8 6 2 12 8 18"></polyline>
                    </svg>
                  </button>
                  
                  <button 
                    onClick={() => setVisualizerMode("full")}
                    className={`p-2 rounded-full transition-all ${visualizerMode === "full" ? 'bg-primary-500 text-white' : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80'}`}
                    title="Full experience (Ctrl+F)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
                      <path d="M12 12 4.5 19.5"></path><path d="M12 12l-1-9"></path><path d="M12 12l9-1"></path>
                    </svg>
                  </button>
                </div>
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
                    onError={handleError}
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
                <div className={`px-3 py-1 rounded-full backdrop-blur-sm text-xs
                  ${isChorus ? 'bg-primary-500/30 text-primary-300' : 'bg-gray-800/30 text-gray-300'}`}
                >
                  {isChorus ? (
                    <span className="flex items-center">
                      <span className="inline-block w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse mr-1.5"></span>
                      CHORUS
                    </span>
                  ) : (
                    currentSection.toUpperCase()
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
            {isPlaying && !isInitialPlay && (
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
      )}
    </AnimatePresence>
  )
}

export default DieWithASmile