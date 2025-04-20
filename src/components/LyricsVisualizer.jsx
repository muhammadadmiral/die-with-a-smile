"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { lyrics, chorusLines } from "../lib/utils"

const LyricsVisualizer = ({ currentTime, isPlaying, audioLevel = [] }) => {
  const [activeIndex, setActiveIndex] = useState(-1)
  const [activeLine, setActiveLine] = useState("")
  const [activeWords, setActiveWords] = useState([])
  const [wordIndex, setWordIndex] = useState(0)
  const [effectType, setEffectType] = useState("default")
  const [effectIntensity, setEffectIntensity] = useState(1)
  const [isChorus, setIsChorus] = useState(false)
  const [lyricsVisible, setLyricsVisible] = useState(true)
  const [displayMode, setDisplayMode] = useState("word") // word, karaoke, cinematic
  const [activeWordTiming, setActiveWordTiming] = useState([])
  const [previousLyric, setPreviousLyric] = useState("")
  const [highlightedWords, setHighlightedWords] = useState([])
  
  const containerRef = useRef(null)
  const wordAnimationRef = useRef(null)
  const lyricsContainerRef = useRef(null)
  const lyricsTimerRef = useRef(null)
  const highlightTimerRef = useRef(null)

  // Update active lyric based on current time
  useEffect(() => {
    const findActiveLyric = () => {
      const currentIndex = lyrics.findIndex((lyric, index) => {
        const nextLyric = lyrics[index + 1]
        if (nextLyric) {
          return currentTime >= lyric.time && currentTime < nextLyric.time
        }
        return currentTime >= lyric.time
      })
      
      return currentIndex
    }
    
    const foundIndex = findActiveLyric()
    
    if (foundIndex !== -1 && foundIndex !== activeIndex) {
      setActiveIndex(foundIndex)
      const currentLyricText = lyrics[foundIndex].text
      setActiveLine(currentLyricText)
      
      // Prevent duplicate processing when repeating a lyric
      if (currentLyricText !== previousLyric) {
        setPreviousLyric(currentLyricText)
        
        // Reset timeout to ensure lyrics stay visible
        if (lyricsTimerRef.current) {
          clearTimeout(lyricsTimerRef.current)
        }
        setLyricsVisible(true)
        
        // Check if current line is chorus
        const isChorusLine = chorusLines.some(line => 
          currentLyricText.includes(line) || 
          line.includes(currentLyricText)
        )
        setIsChorus(isChorusLine)
        
        // Split line into words for animation
        if (currentLyricText !== "...") {
          const words = currentLyricText.split(" ")
          setActiveWords(words)
          setWordIndex(0)
          setHighlightedWords([])
          
          // Clear any existing animation
          if (wordAnimationRef.current) {
            clearTimeout(wordAnimationRef.current)
          }
          
          if (highlightTimerRef.current) {
            clearTimeout(highlightTimerRef.current)
          }
          
          // Choose effect type based on section
          let newEffect
          if (isChorusLine) {
            // More dramatic effects for chorus
            newEffect = chooseRandomEffect(["spotlight", "dramatic", "kinetic", "glitch"])
            setDisplayMode(chooseRandomEffect(["cinematic", "karaoke"]))
          } else {
            // Subtler effects for verses
            newEffect = chooseRandomEffect(["rise", "slide", "fade", "bounce"])
            setDisplayMode(chooseRandomEffect(["word", "karaoke"]))
          }
          
          setEffectType(newEffect)
          setEffectIntensity(isChorusLine ? (Math.random() * 0.5 + 1.5) : (Math.random() * 0.5 + 0.8))
          
          // Generate word timing based on line duration
          generateWordTiming(words, foundIndex)
          
          // Start word-by-word animation if playing
          if (isPlaying) {
            animateWords(words)
          }
          
          // Auto-hide lyrics after a delay when "..." is coming next
          const nextLyric = lyrics[foundIndex + 1]
          if (nextLyric && nextLyric.text === "...") {
            lyricsTimerRef.current = setTimeout(() => {
              setLyricsVisible(false)
            }, (nextLyric.time - lyrics[foundIndex].time) * 1000 * 0.8)
          }
        } else {
          // If current lyric is "...", keep previous words but fade them out
          setLyricsVisible(false)
        }
      }
    } else if (foundIndex === -1 && activeIndex !== -1) {
      // No active lyric found but we had one before
      setLyricsVisible(false)
    }
  }, [currentTime, activeIndex, isPlaying, previousLyric])

  // Generate timing for each word in a lyric line
  const generateWordTiming = (words, lineIndex) => {
    if (!words || words.length === 0) return
    
    const currentLyric = lyrics[lineIndex]
    const nextLyric = lyrics[lineIndex + 1]
    
    // Calculate total line duration
    let lineDuration = 2 // default fallback
    if (currentLyric && nextLyric) {
      lineDuration = nextLyric.time - currentLyric.time
    }
    
    // Calculate approximate timing for each word
    // Distribute unevenly to simulate natural speech
    const timing = []
    let totalTime = 0
    
    // Give different weights to words based on length
    const totalWeights = words.reduce((sum, word) => sum + Math.max(1, word.length * 0.6), 0)
    
    words.forEach((word, i) => {
      // Words with more letters get more time
      const wordWeight = Math.max(1, word.length * 0.6)
      const wordTime = (lineDuration * wordWeight) / totalWeights
      
      timing.push({
        startTime: currentLyric.time + totalTime,
        duration: wordTime
      })
      
      totalTime += wordTime
    })
    
    setActiveWordTiming(timing)
  }

  // Choose random effect from a list
  const chooseRandomEffect = (effects) => {
    return effects[Math.floor(Math.random() * effects.length)]
  }

  // Animate words one by one with timing based on line length
  const animateWords = (words) => {
    // Calculate word duration based on total line duration and words count
    const lineIndex = activeIndex
    const currentLyric = lyrics[lineIndex]
    const nextLyric = lyrics[lineIndex + 1]
    
    let totalDuration = 2 // default fallback
    
    if (currentLyric && nextLyric) {
      totalDuration = nextLyric.time - currentLyric.time
    }
    
    // Ensure reasonably paced animation
    const wordDuration = Math.max(0.15, Math.min(0.5, totalDuration / (words.length * 1.2)))
    
    const animateNextWord = (index) => {
      if (index < words.length) {
        setWordIndex(index)
        
        // Add to highlighted words array
        setHighlightedWords(prev => [...prev, index])
        
        wordAnimationRef.current = setTimeout(() => {
          animateNextWord(index + 1)
        }, wordDuration * 1000)
      }
    }
    
    animateNextWord(0)
  }

  // Get current active word based on timing
  useEffect(() => {
    if (!isPlaying || activeWordTiming.length === 0) return
    
    // Find word that should be active at current time
    const activeWordIndex = activeWordTiming.findIndex((timing, index) => {
      const nextWord = activeWordTiming[index + 1]
      if (nextWord) {
        return currentTime >= timing.startTime && currentTime < nextWord.startTime
      }
      return currentTime >= timing.startTime
    })
    
    if (activeWordIndex !== -1 && activeWordIndex !== wordIndex) {
      setWordIndex(activeWordIndex)
      
      // Add to highlighted words for karaoke effect
      if (!highlightedWords.includes(activeWordIndex)) {
        setHighlightedWords(prev => [...prev, activeWordIndex])
      }
    }
  }, [currentTime, isPlaying, activeWordTiming, wordIndex, highlightedWords])

  // Pause/resume word animation based on isPlaying
  useEffect(() => {
    if (!isPlaying) {
      // Pause animation
      if (wordAnimationRef.current) {
        clearTimeout(wordAnimationRef.current)
      }
      
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current)
      }
    } else if (activeWords.length > 0) {
      // Resume animation from current word
      const remainingWords = activeWords.slice(wordIndex)
      
      // Only restart animation if we're not already highlighting all words
      if (highlightedWords.length < activeWords.length) {
        animateWords(remainingWords)
      }
    }
    
    return () => {
      if (wordAnimationRef.current) {
        clearTimeout(wordAnimationRef.current)
      }
      if (lyricsTimerRef.current) {
        clearTimeout(lyricsTimerRef.current)
      }
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current)
      }
    }
  }, [isPlaying, activeWords, wordIndex, highlightedWords.length])

  // Dynamic variant selection based on effect type
  const getWordVariant = (wordPos, totalWords, isActive = false) => {
    const delay = wordPos * 0.05
    const isLastWord = wordPos === totalWords - 1
    
    // Base variants that all effects build upon
    const baseVariants = {
      hidden: { 
        opacity: 0,
        y: 0,
        x: 0,
        scale: 1,
        rotate: 0,
        filter: "blur(0px)",
      },
      visible: { 
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
        rotate: 0,
        filter: "blur(0px)",
        transition: {
          duration: 0.3,
          delay: delay,
          ease: "easeOut"
        }
      },
      active: {
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1.1 * effectIntensity,
        rotate: 0,
        filter: "blur(0px)",
        textShadow: "0 0 10px rgba(227,74,123,0.8), 0 0 20px rgba(123,58,237,0.5)",
        transition: {
          duration: 0.2,
          ease: "easeOut"
        }
      },
      exit: { 
        opacity: 0,
        y: -20,
        transition: { 
          duration: 0.2,
          ease: "easeIn" 
        }
      }
    }
    
    // Modify variants based on effect type
    switch(effectType) {
      case "rise":
        return {
          ...baseVariants,
          hidden: { 
            ...baseVariants.hidden,
            y: 40 * effectIntensity,
            scale: 0.9,
          },
          visible: {
            ...baseVariants.visible,
            transition: {
              ...baseVariants.visible.transition,
              ease: "backOut"
            }
          },
          active: {
            ...baseVariants.active,
            y: -5 * effectIntensity,
            transition: {
              ...baseVariants.active.transition,
              ease: "easeOut"
            }
          },
          exit: {
            ...baseVariants.exit,
            y: -40 * effectIntensity
          }
        }
        
      case "slide":
        return {
          ...baseVariants,
          hidden: { 
            ...baseVariants.hidden,
            x: (wordPos % 2 === 0 ? -60 : 60) * effectIntensity,
          },
          visible: {
            ...baseVariants.visible,
            x: 0,
            transition: {
              ...baseVariants.visible.transition,
              type: "spring",
              damping: 12,
              stiffness: 100
            }
          },
          active: {
            ...baseVariants.active,
            x: 0,
            scale: 1.15 * effectIntensity,
            transition: {
              ...baseVariants.active.transition,
              type: "spring",
              damping: 5,
              stiffness: 300
            }
          },
          exit: {
            ...baseVariants.exit,
            x: (wordPos % 2 === 0 ? 60 : -60) * effectIntensity,
          }
        }
        
      case "spotlight":
        return {
          ...baseVariants,
          hidden: { 
            ...baseVariants.hidden,
            opacity: 0, 
            scale: 2.5 * effectIntensity, 
            filter: `blur(${10 * effectIntensity}px)`,
            y: -10 * effectIntensity
          },
          visible: { 
            ...baseVariants.visible,
            scale: 1,
            filter: "blur(0px)",
            transition: {
              ...baseVariants.visible.transition,
              duration: 0.6
            }
          },
          active: {
            ...baseVariants.active,
            scale: 1.3 * effectIntensity,
            filter: "blur(0px)",
            textShadow: "0 0 20px rgba(227,74,123,1), 0 0 30px rgba(123,58,237,0.8)",
            transition: {
              ...baseVariants.active.transition,
              duration: 0.3
            }
          },
          exit: {
            ...baseVariants.exit,
            opacity: 0,
            scale: 0.8,
            filter: `blur(${5 * effectIntensity}px)`,
          }
        }
        
      case "dramatic":
        return {
          ...baseVariants,
          hidden: { 
            ...baseVariants.hidden,
            opacity: 0, 
            scale: 0.5,
            rotate: (wordPos % 2 === 0 ? -10 : 10) * effectIntensity
          },
          visible: { 
            ...baseVariants.visible, 
            rotate: 0,
            transition: {
              ...baseVariants.visible.transition,
              type: "spring", 
              stiffness: 300, 
              damping: 15
            }
          },
          active: {
            ...baseVariants.active,
            scale: 1.4 * effectIntensity,
            rotate: 0,
            y: -10 * effectIntensity,
            transition: {
              ...baseVariants.active.transition,
              type: "spring", 
              stiffness: 500, 
              damping: 10
            }
          },
          exit: { 
            ...baseVariants.exit, 
            scale: 1.2 * effectIntensity, 
            rotate: (wordPos % 2 === 0 ? 10 : -10) * effectIntensity
          }
        }
        
      case "bounce":
        return {
          ...baseVariants,
          hidden: { 
            ...baseVariants.hidden,
            y: -100 * effectIntensity, 
          },
          visible: { 
            ...baseVariants.visible,
            transition: {
              ...baseVariants.visible.transition,
              type: "spring", 
              stiffness: 300, 
              damping: isLastWord ? 8 : 15
            }
          },
          active: {
            ...baseVariants.active,
            y: -15 * effectIntensity,
            transition: {
              ...baseVariants.active.transition,
              type: "spring", 
              stiffness: 500, 
              damping: 5
            }
          },
          exit: { 
            ...baseVariants.exit,
            y: 100 * effectIntensity
          }
        }
        
      case "glitch":
        return {
          ...baseVariants,
          hidden: { 
            ...baseVariants.hidden,
            opacity: 0,
            x: (Math.random() * 20 - 10) * effectIntensity,
            y: (Math.random() * 20 - 10) * effectIntensity,
            scale: 0.9
          },
          visible: { 
            ...baseVariants.visible,
            x: 0,
            y: 0,
            transition: {
              ...baseVariants.visible.transition,
              duration: 0.2,
              ease: "linear"
            }
          },
          active: {
            ...baseVariants.active,
            x: 0,
            y: 0,
            scale: 1.2 * effectIntensity,
            transition: {
              ...baseVariants.active.transition,
              duration: 0.05,
              repeatDelay: 0.05,
              repeat: 1,
              ease: "linear"
            }
          },
          exit: { 
            ...baseVariants.exit,
            x: (Math.random() * 40 - 20) * effectIntensity,
            opacity: 0,
            scale: 1.1
          }
        }
        
      case "kinetic":
        return {
          ...baseVariants,
          hidden: { 
            ...baseVariants.hidden,
            scale: 0.2 * effectIntensity, 
            y: 0,
            opacity: 0
          },
          visible: { 
            ...baseVariants.visible,
            scale: 1,
            opacity: 1,
            transition: {
              ...baseVariants.visible.transition,
              type: "spring",
              stiffness: 400,
              damping: 20,
              mass: 2
            }
          },
          active: {
            ...baseVariants.active,
            scale: [1, 1.3 * effectIntensity, 1.2 * effectIntensity],
            rotate: [0, 3, -2, 0],
            transition: {
              duration: 0.3,
              times: [0, 0.4, 0.7, 1],
              ease: "easeInOut"
            }
          },
          exit: { 
            ...baseVariants.exit,
            scale: 0,
            opacity: 0
          }
        }
        
      case "fade":
      default:
        return {
          ...baseVariants,
          hidden: { 
            ...baseVariants.hidden,
            opacity: 0
          },
          visible: { 
            ...baseVariants.visible
          },
          active: {
            ...baseVariants.active
          },
          exit: { 
            ...baseVariants.exit,
            opacity: 0
          }
        }
    }
  }

  // Get custom style based on effect type and word position
  const getCustomStyle = (wordPos, isChorusSection, isActive = false, isHighlighted = false) => {
    const baseStyle = {
      display: 'inline-block',
      margin: '0 0.15em',
      position: 'relative',
    }
    
    // Add color for chorus or active words
    if (isChorusSection) {
      baseStyle.color = "rgb(var(--color-primary))"
      baseStyle.filter = "drop-shadow(0 0 3px rgba(var(--color-primary), 0.5))"
    }
    
    if (isActive) {
      baseStyle.color = isChorusSection 
        ? "rgb(var(--color-primary))" 
        : "rgb(var(--color-light))"
      baseStyle.fontWeight = "bold"
      baseStyle.zIndex = 10
    } else if (isHighlighted) {
      // Karaoke mode highlight
      baseStyle.opacity = 1
      baseStyle.color = isChorusSection 
        ? "rgb(var(--color-primary))" 
        : "rgb(var(--color-light))"
      baseStyle.fontWeight = 600
    } else if (displayMode === "karaoke") {
      // Not yet highlighted in karaoke mode
      baseStyle.opacity = 0.4
    }
    
    // Add effect-specific styles
    switch(effectType) {
      case "spotlight":
        return {
          ...baseStyle,
          fontWeight: isActive || isHighlighted ? "bold" : baseStyle.fontWeight || "normal",
          textShadow: isChorusSection 
            ? "0 0 10px rgba(227,74,123,0.8), 0 0 20px rgba(123,58,237,0.5)"
            : isActive ? "0 0 10px rgba(255,255,255,0.7)" : "none"
        }
      case "dramatic":
        return {
          ...baseStyle,
          fontWeight: isActive || isHighlighted ? 700 : baseStyle.fontWeight || 500,
          transformOrigin: 'center',
          transform: !isActive && wordPos % 2 === 0 ? "skewX(-3deg)" : wordPos % 2 === 1 ? "skewX(3deg)" : "skewX(0deg)"
        }
      case "glitch":
        return {
          ...baseStyle,
          fontFamily: "monospace",
          letterSpacing: "0.05em",
          textShadow: isActive 
            ? "1px 0 0 rgba(227,74,123,0.8), -1px 0 0 rgba(123,58,237,0.8)" 
            : isHighlighted
              ? "1px 0 0 rgba(227,74,123,0.6), -1px 0 0 rgba(123,58,237,0.6)"
              : "1px 0 0 rgba(227,74,123,0.3), -1px 0 0 rgba(123,58,237,0.3)"
        }
      case "kinetic":
        return {
          ...baseStyle,
          fontWeight: isActive || isHighlighted ? "bold" : baseStyle.fontWeight || "normal",
          transformOrigin: 'center',
        }
      default:
        return baseStyle
    }
  }

  // Audio level influence on animation
  const getAudioAmplification = () => {
    if (!audioLevel || audioLevel.length === 0) return 1
    
    // Get average audio level
    const avgLevel = audioLevel.reduce((sum, val) => sum + val, 0) / audioLevel.length / 255
    
    // Map to amplification factor (1.0 to 1.5)
    return 1 + avgLevel * 0.5
  }
  
  // Find next few lyrics for preview
  const getUpcomingLyrics = () => {
    if (activeIndex < 0 || activeIndex >= lyrics.length - 1) return []
    
    const upcomingLyrics = []
    let index = activeIndex + 1
    
    // Get up to 3 upcoming non-empty lyrics
    while (upcomingLyrics.length < 3 && index < lyrics.length) {
      if (lyrics[index].text !== "...") {
        upcomingLyrics.push({
          text: lyrics[index].text,
          time: lyrics[index].time - (lyrics[activeIndex].time || 0)
        })
      }
      index++
    }
    
    return upcomingLyrics
  }

  // Cinematic mode with centered, one word at a time
  const renderCinematicMode = () => {
    if (!activeWords || activeWords.length === 0) return null
    
    return (
      <div className="flex flex-col items-center justify-center w-full text-center">
        <AnimatePresence mode="wait">
          {wordIndex < activeWords.length && (
            <motion.div
              key={`cinematic-${activeIndex}-${wordIndex}`}
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ 
                opacity: 1, 
                scale: 1 + (getAudioAmplification() - 1) * 0.5, 
                y: 0,
                textShadow: isChorus 
                  ? "0 0 15px rgba(227,74,123,0.8), 0 0 30px rgba(123,58,237,0.6)" 
                  : "0 0 10px rgba(255,255,255,0.5)"
              }}
              exit={{ opacity: 0, scale: 1.5, transition: { duration: 0.2 } }}
              transition={{ duration: 0.3, type: "spring" }}
              className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold py-10 px-4
                ${isChorus ? 'text-gradient-gold' : 'text-white'}
              `}
            >
              {activeWords[wordIndex]}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Word by word mode
  const renderWordMode = () => {
    // Apply audio level amplification to animations
    const audioAmplification = getAudioAmplification()
    
    return (
      <div className="flex flex-wrap justify-center items-center gap-x-2 gap-y-3">
        {activeWords.map((word, idx) => {
          const isActiveWord = idx === wordIndex
          const isHighlightedWord = displayMode === "karaoke" && highlightedWords.includes(idx)
          
          return (
            <AnimatePresence key={`word-${activeIndex}-${idx}`}>
              <motion.span
                variants={getWordVariant(idx, activeWords.length, isActiveWord)}
                initial="hidden"
                animate={isActiveWord ? "active" : "visible"}
                exit="exit"
                style={getCustomStyle(idx, isChorus, isActiveWord, isHighlightedWord)}
                className={`
                  text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold
                  ${isActiveWord ? 'current-word' : ''}
                  ${isChorus ? 'chorus-word' : 'normal-word'}
                  ${isHighlightedWord ? 'highlighted-word' : ''}
                `}
                // Apply audio reactivity to current word
                animate={isActiveWord ? {
                  scale: [1, 1 + 0.1 * audioAmplification, 1],
                  filter: isChorus ? [
                    `drop-shadow(0 0 5px rgba(227,74,123,${0.5 * audioAmplification}))`,
                    `drop-shadow(0 0 10px rgba(227,74,123,${0.8 * audioAmplification}))`,
                    `drop-shadow(0 0 5px rgba(227,74,123,${0.5 * audioAmplification}))`
                  ] : undefined,
                  transition: { 
                    duration: 0.3, 
                    repeat: Infinity, 
                    repeatType: "mirror"
                  }
                } : undefined}
              >
                {word}
                
                {/* Glow underline for active word */}
                {isActiveWord && (
                  <motion.div 
                    className="absolute left-0 right-0 h-[3px] bottom-[-5px] rounded-full bg-gradient-to-r from-primary-500 to-secondary-500"
                    layoutId="activeWordUnderline"
                    initial={{ opacity: 0, width: "0%" }}
                    animate={{ opacity: 0.8, width: "100%" }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </motion.span>
            </AnimatePresence>
          )
        })}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="lyric-container">
      {/* Background tint when lyrics are active */}
      <motion.div 
        className="lyric-backdrop"
        animate={{ 
          opacity: lyricsVisible ? (isChorus ? 0.8 : 0.7) : 0 
        }}
        transition={{ duration: 0.5 }}
      />
      
      {/* Ambient glow effect */}
      <motion.div 
        className="lyric-glow" 
        animate={{ 
          opacity: lyricsVisible ? (isChorus ? 0.7 : 0.3) : 0,
          scale: isChorus ? 1.2 : 1
        }}
        transition={{ duration: 0.8 }}
      />
      
      {/* Main centered lyrics display */}
      <AnimatePresence mode="wait">
        {lyricsVisible && activeLine && activeLine !== "..." && (
          <motion.div
            key={`line-${activeIndex}`}
            ref={lyricsContainerRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="relative max-w-5xl w-full text-center px-6 py-4 z-30"
          >
            {displayMode === "cinematic" ? renderCinematicMode() : renderWordMode()}
            
            {/* Display mode indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="absolute top-2 right-2 text-xs bg-black/40 px-2 py-1 rounded-full flex items-center"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary-400 animate-pulse mr-1.5"></span>
              <span>
                {displayMode === "cinematic" ? "Cinematic" : 
                 displayMode === "karaoke" ? "Karaoke" : "Word"}
              </span>
            </motion.div>
            
            {/* Extra effects for chorus */}
            {isChorus && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.2 }}
                className="absolute -inset-10 -z-10"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-primary-500/20 via-secondary-500/20 to-primary-500/20 rounded-full blur-3xl"
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.3, 0.5, 0.3]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "mirror"
                  }}
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview of upcoming lyrics - mini timeline */}
      <AnimatePresence>
        {isPlaying && activeIndex > 0 && !isChorus && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.9, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-28 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none"
          >
            <div className="flex flex-col items-center space-y-2">
              {getUpcomingLyrics().map((lyric, idx) => (
                <motion.div 
                  key={`upcoming-${idx}`}
                  initial={{ opacity: 0.4, y: 10 }}
                  animate={{ opacity: 0.7 - (idx * 0.2), y: 0 }}
                  className="text-sm bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full max-w-xs truncate"
                  style={{ 
                    fontSize: `${Math.max(0.7, 1 - idx * 0.15)}rem`,
                    marginTop: idx * 4
                  }}
                >
                  {lyric.text}
                  <span className="text-xs ml-2 opacity-70">
                    +{lyric.time.toFixed(1)}s
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* "Now Playing" indicator when not showing lyrics */}
      <AnimatePresence>
        {isPlaying && (!lyricsVisible || activeLine === "...") && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="fixed top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center z-20"
          >
            <motion.div
              className="text-lg sm:text-xl text-white/60 mb-2"
              animate={{
                opacity: [0.6, 1, 0.6]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "mirror"
              }}
            >
              Now Playing
            </motion.div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display text-gradient-gold text-shadow-gold">
              Die With A Smile
            </h2>
            <p className="text-lg sm:text-xl text-gradient mt-2">
              Bruno Mars & Lady Gaga
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Audio reactive particles when chorus is active */}
      {isChorus && isPlaying && lyricsVisible && (
        <div className="audio-particles">
          {audioLevel && audioLevel.length > 0 && Array.from({ length: 10 }).map((_, idx) => {
            const dataIndex = Math.floor((idx / 10) * audioLevel.length)
            const audioValue = audioLevel[dataIndex] || 0
            const normAudio = audioValue / 255
            
            if (normAudio < 0.3) return null // Only show for significant audio levels
            
            const size = normAudio * 100 + 20
            const opacity = normAudio * 0.3
            
            return (
              <motion.div
                key={`particle-${idx}`}
                className="audio-particle"
                initial={{ 
                  top: `${Math.random() * 100}%`, 
                  left: `${Math.random() * 100}%`,
                  width: size,
                  height: size,
                  opacity: 0
                }}
                animate={{ 
                  width: size,
                  height: size,
                  opacity: opacity
                }}
                transition={{ duration: 0.2 }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export default LyricsVisualizer