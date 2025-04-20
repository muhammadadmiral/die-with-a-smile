import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { lyrics, chorusLines } from "../lib/utils"

const LyricsVisualizer = ({ currentTime, isPlaying, audioLevel = [] }) => {
  const [activeIndex, setActiveIndex] = useState(-1)
  const [activeLine, setActiveLine] = useState("")
  const [activeWords, setActiveWords] = useState([])
  const [wordIndex, setWordIndex] = useState(0)
  const [isChorus, setIsChorus] = useState(false)
  const [lyricsVisible, setLyricsVisible] = useState(true)
  const [highlightedWords, setHighlightedWords] = useState([])
  const [activeWordTiming, setActiveWordTiming] = useState([])
  const [previousLyric, setPreviousLyric] = useState("")

  const containerRef = useRef(null)
  const wordAnimationRef = useRef(null)
  const lyricsContainerRef = useRef(null)
  const lyricsTimerRef = useRef(null)
  const highlightTimerRef = useRef(null)
  const isMountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false

      if (wordAnimationRef.current) {
        clearTimeout(wordAnimationRef.current)
        wordAnimationRef.current = null
      }

      if (lyricsTimerRef.current) {
        clearTimeout(lyricsTimerRef.current)
        lyricsTimerRef.current = null
      }

      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current)
        highlightTimerRef.current = null
      }
    }
  }, [])

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
          lyricsTimerRef.current = null
        }
        setLyricsVisible(true)

        // Check if current line is chorus
        const isChorusLine = chorusLines.some(
          (line) => currentLyricText.includes(line) || line.includes(currentLyricText),
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
            wordAnimationRef.current = null
          }

          if (highlightTimerRef.current) {
            clearTimeout(highlightTimerRef.current)
            highlightTimerRef.current = null
          }

          // Generate word timing based on line duration
          generateWordTiming(words, foundIndex)

          // Start word-by-word animation if playing
          if (isPlaying) {
            animateWords(words)
          }

          // Auto-hide lyrics after a delay when "..." is coming next
          const nextLyric = lyrics[foundIndex + 1]
          if (nextLyric && nextLyric.text === "...") {
            lyricsTimerRef.current = setTimeout(
              () => {
                if (isMountedRef.current) {
                  setLyricsVisible(false)
                }
              },
              (nextLyric.time - lyrics[foundIndex].time) * 1000 * 0.8,
            )
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
    if (!words || words.length === 0 || !isMountedRef.current) return

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
        duration: wordTime,
      })

      totalTime += wordTime
    })

    setActiveWordTiming(timing)
  }

  // Animate words one by one with timing based on line length
  const animateWords = (words) => {
    if (!isMountedRef.current) return

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
      if (!isMountedRef.current) return

      if (index < words.length) {
        setWordIndex(index)

        // Add to highlighted words array
        setHighlightedWords((prev) => [...prev, index])

        wordAnimationRef.current = setTimeout(() => {
          animateNextWord(index + 1)
        }, wordDuration * 1000)
      }
    }

    animateNextWord(0)
  }

  // Get current active word based on timing
  useEffect(() => {
    if (!isPlaying || activeWordTiming.length === 0 || !isMountedRef.current) return

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
        setHighlightedWords((prev) => [...prev, activeWordIndex])
      }
    }
  }, [currentTime, isPlaying, activeWordTiming, wordIndex, highlightedWords])

  // Pause/resume word animation based on isPlaying
  useEffect(() => {
    if (!isMountedRef.current) return

    if (!isPlaying) {
      // Pause animation
      if (wordAnimationRef.current) {
        clearTimeout(wordAnimationRef.current)
        wordAnimationRef.current = null
      }

      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current)
        highlightTimerRef.current = null
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
        wordAnimationRef.current = null
      }
      if (lyricsTimerRef.current) {
        clearTimeout(lyricsTimerRef.current)
        lyricsTimerRef.current = null
      }
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current)
        highlightTimerRef.current = null
      }
    }
  }, [isPlaying, activeWords, wordIndex, highlightedWords.length])

  // Audio level influence on animation
  const getAudioAmplification = () => {
    if (!audioLevel || audioLevel.length === 0) return 1

    // Get average audio level
    const avgLevel = audioLevel.reduce((sum, val) => sum + val, 0) / audioLevel.length / 255

    // Map to amplification factor (1.0 to 1.5)
    return 1 + avgLevel * 0.5
  }

  return (
    <div ref={containerRef} className="lyric-container fixed inset-0 flex items-center justify-center z-20 pointer-events-none">
      {/* Background tint when lyrics are active */}
      <motion.div
        className="lyric-backdrop absolute inset-0 bg-black/50"
        animate={{
          opacity: lyricsVisible ? (isChorus ? 0.6 : 0.4) : 0,
        }}
        transition={{ duration: 0.5 }}
      />

      {/* Ambient glow effect */}
      <motion.div
        className="lyric-glow absolute inset-0 bg-gradient-radial from-primary-500/20 via-transparent to-transparent"
        animate={{
          opacity: lyricsVisible ? (isChorus ? 0.7 : 0.3) : 0,
          scale: isChorus ? 1.2 : 1,
        }}
        transition={{ duration: 0.8 }}
        style={{ 
          backgroundPosition: 'center',
          backgroundSize: '150% 150%'
        }}
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
            <div className="flex flex-col items-center justify-center w-full">
              <div className="relative">
                {/* Background text (shadow) */}
                <div className="absolute inset-0 flex flex-wrap justify-center items-center opacity-20 blur-sm">
                  {activeLine}
                </div>

                {/* Main text with word-by-word highlight */}
                <div className="relative z-10 flex flex-wrap justify-center items-center gap-x-2 gap-y-3">
                  {activeWords.map((word, idx) => {
                    const isActiveWord = idx === wordIndex
                    const isHighlightedWord = highlightedWords.includes(idx)
                    const audioAmplification = getAudioAmplification()

                    return (
                      <motion.span
                        key={`word-${activeIndex}-${idx}`}
                        initial={{
                          opacity: 0,
                          y: 20,
                          scale: 0.8,
                        }}
                        animate={{
                          opacity: isHighlightedWord ? 1 : 0.5,
                          y: 0,
                          scale: isActiveWord ? 1.1 * audioAmplification : 1,
                          color: isHighlightedWord ? (isChorus ? "#ff6b9d" : "#ffffff") : "#a0a0a0",
                        }}
                        transition={{
                          duration: 0.3,
                          type: "spring",
                          stiffness: 300,
                          damping: 20,
                        }}
                        className={`
                          text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold
                          ${isActiveWord ? "text-shadow-strong" : ""}
                          ${isChorus ? "text-primary-400" : "text-white"}
                        `}
                        style={{
                          textShadow: isActiveWord ? "0 0 15px rgba(255,255,255,0.8)" : "none",
                          fontFamily: "'Montserrat', sans-serif",
                          fontWeight: isActiveWord ? 800 : 600,
                        }}
                      >
                        {word}

                        {/* Animated underline for active word */}
                        {isActiveWord && (
                          <motion.div
                            className="absolute left-0 right-0 h-[3px] bottom-[-5px] rounded-full bg-gradient-to-r from-primary-500 to-secondary-500"
                            layoutId="activeWordUnderline"
                            initial={{ width: "0%", opacity: 0 }}
                            animate={{ width: "100%", opacity: 1 }}
                            transition={{ duration: 0.2 }}
                          />
                        )}
                      </motion.span>
                    )
                  })}
                </div>
              </div>

              {/* CapCut-style animated elements */}
              <motion.div
                className="absolute bottom-[-50px] left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary-400 to-transparent"
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{
                  scaleX: isPlaying ? 1 : 0,
                  opacity: isPlaying ? 0.6 : 0,
                }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
              />

              {/* Animated particles for chorus */}
              {isChorus && isPlaying && (
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(10)].map((_, i) => (
                    <motion.div
                      key={`particle-${i}`}
                      className="absolute w-2 h-2 rounded-full bg-primary-500"
                      initial={{
                        x: Math.random() * 100 - 50 + "%",
                        y: "100%",
                        opacity: 0.7,
                        scale: Math.random() * 0.5 + 0.5,
                      }}
                      animate={{
                        y: "-100%",
                        opacity: 0,
                        scale: 0,
                      }}
                      transition={{
                        duration: Math.random() * 3 + 2,
                        repeat: Number.POSITIVE_INFINITY,
                        delay: Math.random() * 5,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

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
                    opacity: [0.3, 0.5, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: "mirror",
                  }}
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default LyricsVisualizer
