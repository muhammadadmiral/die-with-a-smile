"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { motion, AnimatePresence, useAnimationControls } from "framer-motion"
import { lyrics, chorusLines, getLyricTimingInfo, getActiveWord } from "../lib/utils"

const LyricsVisualizer = ({ currentTime, isPlaying, audioLevel = [] }) => {
  // Core state
  const [activeIndex, setActiveIndex] = useState(-1)
  const [activeLine, setActiveLine] = useState("")
  const [activeWords, setActiveWords] = useState([])
  const [isChorus, setIsChorus] = useState(false)
  const [lyricsVisible, setLyricsVisible] = useState(true)
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1)
  const [timingInfo, setTimingInfo] = useState(null)
  const [audioIntensity, setAudioIntensity] = useState(1)
  const [showChorusFlash, setShowChorusFlash] = useState(false)
  
  // Device capability detection
  const [isMobile, setIsMobile] = useState(false)
  const [isLowPerfDevice, setIsLowPerfDevice] = useState(false)

  // Animation controls
  const containerControls = useAnimationControls()
  const glowControls = useAnimationControls()
  const chorusGlowControls = useAnimationControls()

  // Refs
  const containerRef = useRef(null)
  const wordsContainerRef = useRef(null)
  const animationFrameRef = useRef(null)
  const isMountedRef = useRef(true)
  const lastUpdateTimeRef = useRef(0)
  const audioProcessTimeRef = useRef(0)
  const fpsTimeRef = useRef(Date.now())
  const frameCountRef = useRef(0)
  const fpsRef = useRef(60)
  
  // Detect device capabilities on mount
  useEffect(() => {
    // Device detection
    const checkDeviceCapabilities = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      
      // Performance detection based on FPS monitoring
      const monitorPerformance = () => {
        const now = Date.now()
        frameCountRef.current++
        
        if (now - fpsTimeRef.current >= 1000) {
          fpsRef.current = frameCountRef.current
          setIsLowPerfDevice(fpsRef.current < 40)
          frameCountRef.current = 0
          fpsTimeRef.current = now
        }
        
        requestAnimationFrame(monitorPerformance)
      }
      
      requestAnimationFrame(monitorPerformance)
    }
    
    checkDeviceCapabilities()
    
    // Debounced resize handler
    let resizeTimeout
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        setIsMobile(window.innerWidth < 768)
      }, 250)
    }
    
    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
      clearTimeout(resizeTimeout)
    }
  }, [])

  // Optimized particles with memoization and quantity based on device
  const particles = useMemo(() => {
    const particleCount = isLowPerfDevice ? 10 : (isMobile ? 20 : (isChorus ? 30 : 20))
    
    return Array.from({ length: particleCount }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.3,
      speed: Math.random() * 2 + 1,
      delay: Math.random() * 5,
      color: isChorus ? "#ff6b9d" : "#ffffff",
    }))
  }, [isChorus, isMobile, isLowPerfDevice])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // Process audio level changes with throttling
  useEffect(() => {
    if (!audioLevel || audioLevel.length === 0 || !isPlaying) return

    // Throttle audio processing based on device capabilities
    const now = Date.now()
    const throttleTime = isLowPerfDevice ? 100 : 50
    if (now - audioProcessTimeRef.current < throttleTime) return
    audioProcessTimeRef.current = now

    // Calculate average of bass frequencies - only use a subset of data for better performance
    const sampleCount = Math.min(8, audioLevel.length)
    let bassSum = 0
    
    for (let i = 0; i < sampleCount; i++) {
      bassSum += audioLevel[i] || 0
    }

    const bassAvg = bassSum / sampleCount / 255
    // Smooth out intensity changes
    const newIntensity = 1 + bassAvg * 1.8
    setAudioIntensity(prev => prev * 0.7 + newIntensity * 0.3) // Smooth transition

    // Apply animations based on audio intensity
    containerControls.start({
      scale: 1 + bassAvg * 0.05,
      transition: { duration: 0.2 },
    })

    glowControls.start({
      opacity: isChorus ? 0.7 * newIntensity : 0.3 * newIntensity,
      transition: { duration: 0.3 },
    })

    chorusGlowControls.start({
      opacity: isChorus ? 0.8 * newIntensity : 0,
      transition: { duration: 0.3 },
    })
  }, [audioLevel, isPlaying, isChorus, containerControls, glowControls, chorusGlowControls, isLowPerfDevice])

  // Find active lyric with binary search - memoized for better performance
  const findActiveLyric = useCallback(() => {
    let start = 0
    let end = lyrics.length - 1
    let result = -1

    while (start <= end) {
      const mid = Math.floor((start + end) / 2)
      if (lyrics[mid].time <= currentTime) {
        result = mid
        start = mid + 1
      } else {
        end = mid - 1
      }
    }

    if (result !== -1) {
      // Check if next lyric is closer
      const nextIndex = result + 1
      if (nextIndex < lyrics.length && currentTime >= lyrics[nextIndex].time) {
        return nextIndex
      }
      return result
    }

    return -1
  }, [currentTime])

  // Update active lyric based on current time with throttling
  useEffect(() => {
    if (!isMountedRef.current) return

    // Throttle updates for performance
    const now = Date.now()
    const updateInterval = isLowPerfDevice ? 100 : 50
    if (now - lastUpdateTimeRef.current < updateInterval) return
    lastUpdateTimeRef.current = now

    const foundIndex = findActiveLyric()

    if (foundIndex !== -1 && foundIndex !== activeIndex) {
      setActiveIndex(foundIndex)
      const currentLyricText = lyrics[foundIndex].text
      setActiveLine(currentLyricText)

      // Check if chorus
      const isChorusLine = chorusLines.some((line) => {
        const lowerLyric = currentLyricText.toLowerCase()
        const lowerLine = line.toLowerCase()
        return lowerLyric.includes(lowerLine) || lowerLine.includes(lowerLyric)
      })

      // If transitioning to/from chorus, add special effect
      if (isChorusLine !== isChorus) {
        setShowChorusFlash(true)
        setTimeout(() => {
          if (isMountedRef.current) {
            setShowChorusFlash(false)
          }
        }, 500)
      }

      setIsChorus(isChorusLine)

      // Get timing info for word-by-word animation
      const timing = getLyricTimingInfo(foundIndex)
      setTimingInfo(timing)

      // Split line into words - skip if it's a special marker
      if (currentLyricText !== "..." && !currentLyricText.includes("[") && currentLyricText.trim().length > 0) {
        setActiveWords(timing.words)
        setLyricsVisible(true)
        setHighlightedWordIndex(-1) // Reset highlighted word
      } else {
        // Empty or special tag
        setLyricsVisible(false)
      }
    } else if (foundIndex === -1 && activeIndex !== -1) {
      // No active lyric
      setLyricsVisible(false)
    }
  }, [currentTime, activeIndex, findActiveLyric, isChorus, isLowPerfDevice])

  // Word-by-word highlighting with precise timing and RAF optimization
  useEffect(() => {
    if (!isPlaying || !lyricsVisible || !timingInfo || activeWords.length === 0 || !isMountedRef.current) return

    // Clean up existing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    const updateHighlight = () => {
      if (!isMountedRef.current || !isPlaying) return

      // Calculate which word should be highlighted
      const wordIndex = getActiveWord(currentTime, timingInfo.startTime, timingInfo.duration, timingInfo.wordCount)

      // Only update if needed
      if (wordIndex >= 0 && wordIndex !== highlightedWordIndex) {
        setHighlightedWordIndex(wordIndex)
      }

      animationFrameRef.current = requestAnimationFrame(updateHighlight)
    }

    animationFrameRef.current = requestAnimationFrame(updateHighlight)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [currentTime, isPlaying, lyricsVisible, activeWords, timingInfo, highlightedWordIndex])

  // Dynamic word animation - memoized for better performance
  const getWordAnimation = useCallback(
    (isActive, isPast) => {
      if (isActive) {
        return {
          opacity: 1,
          y: 0,
          scale: 1.1 * Math.min(1.2, audioIntensity), // Capped scale for better performance
          color: isChorus ? "#ff6b9d" : "#ffffff",
          textShadow: isChorus
            ? "0 0 10px rgba(227, 74, 123, 0.7), 0 0 20px rgba(227, 74, 123, 0.4)"
            : "0 0 10px rgba(255, 255, 255, 0.5)",
        }
      } else if (isPast) {
        return {
          opacity: 0.9,
          y: 0,
          scale: 1,
          color: isChorus ? "#ff6b9d" : "#ffffff",
          textShadow: "none",
        }
      } else {
        return {
          opacity: 0.5,
          y: 0,
          scale: 0.9,
          color: "#a0a0a0",
          textShadow: "none",
        }
      }
    },
    [audioIntensity, isChorus],
  )

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 flex items-center justify-center z-20 pointer-events-none overflow-hidden"
      style={{
        transform: "translateZ(0)", // Force GPU
        backfaceVisibility: "hidden", // Prevent blur
        willChange: "transform", // Hint for browser optimization
      }}
    >
      {/* Background tint - simple opacity animation */}
      <motion.div
        className="absolute inset-0 bg-black/50"
        animate={{
          opacity: lyricsVisible ? (isChorus ? 0.6 : 0.4) : 0,
        }}
        transition={{ duration: 0.5 }}
      />

      {/* Custom particles with reduced quantity for better performance */}
      {!isLowPerfDevice && (
        <div className="absolute inset-0 z-0">
          {particles.map((particle) => (
            <motion.div
              key={`particle-${particle.id}`}
              className="absolute rounded-full"
              style={{
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                backgroundColor: particle.color,
                filter: particle.size > 2 ? "blur(2px)" : "blur(1px)",
                opacity: particle.opacity,
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                willChange: "transform, opacity", // Performance hint
              }}
              animate={{
                y: ["0%", "100%"],
                opacity: [particle.opacity, 0],
                scale: [1, 0.5],
              }}
              transition={{
                y: {
                  duration: 10 / particle.speed,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                  delay: particle.delay,
                },
                opacity: {
                  duration: 10 / particle.speed,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeOut",
                  delay: particle.delay + 5,
                },
                scale: {
                  duration: 10 / particle.speed,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeOut",
                  delay: particle.delay + 5,
                },
              }}
            />
          ))}
        </div>
      )}

      {/* Ambient glow with simplified animation */}
      <motion.div
        className="absolute inset-0 bg-gradient-radial from-primary-500/20 via-transparent to-transparent lyrics-glow"
        animate={glowControls}
        initial={{ opacity: 0.3, scale: 1 }}
        style={{
          backgroundPosition: "center",
          backgroundSize: "150% 150%",
        }}
      />

      {/* Chorus flash effect - only shows during transitions */}
      <AnimatePresence>
        {showChorusFlash && (
          <motion.div
            className="absolute inset-0 bg-white/30"
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>

      {/* Main centered lyrics display with optimized rendering */}
      <AnimatePresence mode="wait">
        {lyricsVisible && activeLine && activeLine !== "..." && (
          <motion.div
            key={`line-${activeIndex}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="relative max-w-5xl w-full text-center px-6 py-4 z-30"
          >
            <motion.div
              className="w-full"
              animate={{
                // Simplified 3D effects on low-performance devices
                rotateX: !isLowPerfDevice && isChorus ? [0, 2, 0, -2, 0] : 0,
                rotateY: !isLowPerfDevice && isChorus ? [0, -2, 0, 2, 0] : 0,
                scale: 1.02,
              }}
              transition={{
                rotateX: {
                  duration: 8,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                },
                rotateY: {
                  duration: 8,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                },
              }}
              style={{
                perspective: "1000px",
                transformStyle: "preserve-3d",
              }}
            >
              <div className="flex flex-col items-center justify-center w-full">
                {/* Main text with word-by-word highlighting */}
                <motion.div
                  ref={wordsContainerRef}
                  className="relative flex flex-wrap justify-center items-center gap-x-2 gap-y-3"
                  animate={containerControls}
                  initial={{ scale: 1 }}
                  style={{
                    perspective: "1000px",
                    transformStyle: "preserve-3d",
                  }}
                >
                  {activeWords.map((word, idx) => {
                    const isActive = idx === highlightedWordIndex
                    const isPast = idx < highlightedWordIndex

                    return (
                      <motion.span
                        key={`word-${activeIndex}-${idx}`}
                        className={`word-${idx} text-4xl md:text-5xl lg:text-6xl font-bold relative inline-block`}
                        initial={{
                          opacity: 0.5,
                          y: 10,
                          scale: 0.9,
                        }}
                        animate={getWordAnimation(isActive, isPast)}
                        transition={{
                          duration: 0.2,
                          type: "spring",
                          stiffness: 300,
                          damping: 20,
                        }}
                      >
                        {word}

                        {/* Active word underline - only render when active */}
                        {isActive && (
                          <motion.div
                            layoutId="activeWordUnderline"
                            className="absolute left-0 right-0 h-1 -bottom-2 rounded-full"
                            initial={{ width: "0%" }}
                            animate={{
                              width: "100%",
                              background: isChorus
                                ? "linear-gradient(90deg, #e34a7b, #7c3aed)"
                                : "linear-gradient(90deg, #ffffff, rgba(255,255,255,0.7))",
                            }}
                          />
                        )}

                        {/* Glow for active word - simplified for performance */}
                        {isActive && !isLowPerfDevice && (
                          <motion.div
                            className="absolute inset-0 -z-10 rounded-xl"
                            animate={{
                              opacity: [0.3, 0.6 * audioIntensity, 0.3],
                              scale: [0.9, 1.1, 0.9],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Number.POSITIVE_INFINITY,
                              repeatType: "reverse",
                            }}
                            style={{
                              background: isChorus
                                ? `radial-gradient(circle, rgba(227, 74, 123, 0.3) 0%, transparent 70%)`
                                : `radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)`,
                              filter: "blur(8px)",
                            }}
                          />
                        )}
                      </motion.span>
                    )
                  })}
                </motion.div>

                {/* Progress line animation - only when playing */}
                {isPlaying && (
                  <motion.div
                    className="absolute -bottom-10 left-0 right-0 h-[2px]"
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{
                      scaleX: 1,
                      opacity: 0.8,
                    }}
                    style={{
                      background: isChorus
                        ? "linear-gradient(90deg, transparent, #e34a7b, transparent)"
                        : "linear-gradient(90deg, transparent, #7c3aed, transparent)",
                      transformOrigin: "left",
                    }}
                    transition={{
                      duration: timingInfo?.duration || 2,
                      ease: "linear",
                    }}
                  />
                )}
              </div>
            </motion.div>

            {/* Chorus special effects - only on chorus and not on low-performance devices */}
            {isChorus && !isLowPerfDevice && (
              <motion.div
                animate={chorusGlowControls}
                initial={{ opacity: 0, scale: 0.9 }}
                className="absolute -inset-10 -z-10"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-primary-500/20 via-secondary-500/20 to-primary-500/20 rounded-full blur-3xl"
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.3, 0.5 * audioIntensity, 0.3],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: "mirror",
                  }}
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio-reactive glow - simplified */}
      {!isLowPerfDevice && (
        <motion.div
          className="absolute inset-0"
          animate={{
            opacity: isPlaying ? (isChorus ? 0.4 : 0.2) * audioIntensity : 0,
            scale: isPlaying ? [1, 1.05, 1] : 1,
          }}
          transition={{
            opacity: { duration: 0.5 },
            scale: { duration: 2, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" },
          }}
          style={{
            background: isChorus
              ? `radial-gradient(circle at center, rgba(227, 74, 123, 0.3) 0%, rgba(123, 58, 237, 0.2) 50%, transparent 70%)`
              : `radial-gradient(circle at center, rgba(123, 58, 237, 0.3) 0%, rgba(227, 74, 123, 0.2) 50%, transparent 70%)`,
            filter: "blur(30px)",
          }}
        />
      )}

      {/* Light beams during chorus - only on regular performance devices */}
      {isChorus && !isLowPerfDevice && (
        <>
          <motion.div
            className="absolute h-[1px] left-0 right-0"
            style={{
              top: "40%",
              background: "linear-gradient(90deg, transparent 0%, rgba(227, 74, 123, 0.6) 50%, transparent 100%)",
            }}
            animate={{
              opacity: [0.2, 0.6 * audioIntensity, 0.2],
              scaleY: [1, 4, 1],
              y: [0, -10, 0],
            }}
            transition={{
              duration: 4,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
          />
          <motion.div
            className="absolute h-[1px] left-0 right-0"
            style={{
              top: "60%",
              background: "linear-gradient(90deg, transparent 0%, rgba(123, 58, 237, 0.6) 50%, transparent 100%)",
            }}
            animate={{
              opacity: [0.2, 0.6 * audioIntensity, 0.2],
              scaleY: [1, 4, 1],
              y: [0, 10, 0],
            }}
            transition={{
              duration: 4,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
              delay: 2,
            }}
          />
        </>
      )}

      {/* Blur vignette around lyrics */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-10"
        animate={{
          opacity: lyricsVisible ? 0.7 : 0,
        }}
        transition={{ duration: 0.5 }}
        style={{
          background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.8) 100%)`,
        }}
      />

      {/* Beat effect on audio peak - simplified */}
      <AnimatePresence>
        {lyricsVisible && isPlaying && audioIntensity > 1.3 && !isLowPerfDevice && (
          <motion.div
            className="absolute inset-0 bg-white/5 z-5 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: audioIntensity * 0.05 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      {/* 3D text effect for chorus - only on higher performance devices */}
      {isChorus && !isLowPerfDevice && !isMobile && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-4">
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl md:text-7xl lg:text-8xl font-bold text-primary-500/10"
            initial={{ opacity: 0, scale: 0.8, rotateX: 30 }}
            animate={{
              opacity: [0.05, 0.1, 0.05],
              scale: [0.8, 0.85, 0.8],
              rotateX: [30, 25, 30],
              rotateY: [0, 5, 0],
            }}
            transition={{
              duration: 4,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "mirror",
            }}
            style={{
              transformStyle: "preserve-3d",
              textShadow: "0 0 20px rgba(227, 74, 123, 0.3)",
            }}
          >
            CHORUS
          </motion.div>
        </div>
      )}

      {/* Audio spectrum visualizer - simplified and only when needed */}
      {isPlaying && audioLevel.length > 0 && !isLowPerfDevice && (
        <div className="absolute bottom-0 left-0 right-0 h-12 flex items-end justify-center gap-[1px] opacity-20 pointer-events-none z-3">
          {/* Render fewer bars on mobile */}
          {audioLevel.slice(0, isMobile ? 20 : 40).map((level, i) => {
            const height = (level / 255) * 100
            const hue = isChorus ? 340 - i * 2 : 280 - i * 2

            return (
              <motion.div
                key={`bar-${i}`}
                className="w-1 rounded-t-sm"
                style={{
                  backgroundColor: `hsl(${hue}, 80%, 65%)`,
                  height: `${Math.max(2, height)}%`,
                }}
                initial={{ height: "2%" }}
                animate={{ height: `${Math.max(2, height)}%` }}
                transition={{ duration: 0.1 }}
              />
            )
          })}
        </div>
      )}

      {/* Holographic scanlines - very subtle, keep for all devices */}
      <div
        className="absolute inset-0 pointer-events-none z-2 opacity-5"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            rgba(255, 255, 255, 0.1),
            rgba(255, 255, 255, 0.1) 1px,
            transparent 1px,
            transparent 4px
          )`,
          backgroundSize: "100% 4px",
          mixBlendMode: "overlay",
        }}
      />

      {/* Floating accent dots - reduced for better performance */}
      {isPlaying && !isLowPerfDevice && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-1">
          {/* Reduce number of dots on mobile */}
          {Array.from({ length: isMobile ? 4 : 8 }).map((_, i) => (
            <motion.div
              key={`accent-${i}`}
              className="absolute rounded-full"
              initial={{
                x: `${Math.random() * 100}%`,
                y: `${Math.random() * 100}%`,
                opacity: 0.1 + Math.random() * 0.2,
                scale: 0.5 + Math.random() * 0.5,
              }}
              animate={{
                x: `calc(${Math.random() * 100}% + ${Math.sin(i) * 50}px)`,
                y: `calc(${Math.random() * 100}% + ${Math.cos(i) * 50}px)`,
                opacity: [0.1 + Math.random() * 0.2, 0.2 + Math.random() * 0.3, 0.1 + Math.random() * 0.2],
                scale: [0.5 + Math.random() * 0.5, 0.7 + Math.random() * 0.6, 0.5 + Math.random() * 0.5],
              }}
              transition={{
                duration: 5 + Math.random() * 10,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "reverse",
                ease: "easeInOut",
              }}
              style={{
                width: `${4 + Math.random() * 6}px`,
                height: `${4 + Math.random() * 6}px`,
                background: isChorus
                  ? `rgba(227, 74, 123, ${0.4 + Math.random() * 0.6})`
                  : `rgba(123, 58, 237, ${0.4 + Math.random() * 0.6})`,
                filter: `blur(${1 + Math.random() * 2}px)`,
                boxShadow: isChorus ? `0 0 10px 2px rgba(227, 74, 123, 0.3)` : `0 0 10px 2px rgba(123, 58, 237, 0.3)`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default LyricsVisualizer