"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"

const CodeVisualizer = ({ currentTime, isPlaying, currentLyric, isChorus, isMobile }) => {
  // State
  const [codeVisible, setCodeVisible] = useState(true)
  const [isGlitching, setIsGlitching] = useState(false)
  const [highlightedLine, setHighlightedLine] = useState(-1)
  const [previousLyric, setPreviousLyric] = useState("")
  const [interludeActive, setInterludeActive] = useState(false)
  const [codeSnippet, setCodeSnippet] = useState("")
  const [codeType, setCodeType] = useState("chorus") // chorus, verse, interlude
  const [typewriterText, setTypewriterText] = useState("")
  const [typewriterActive, setTypewriterActive] = useState(false)
  const [typewriterComplete, setTypewriterComplete] = useState(false)

  // Refs
  const containerRef = useRef(null)
  const codeRef = useRef(null)
  const typewriterTimerRef = useRef(null)
  const typewriterTargetRef = useRef("")
  const typewriterIndexRef = useRef(0)
  const isMountedRef = useRef(true)
  const animationFrameRef = useRef(null)
  const lastTimeRef = useRef(0)
  const lastLyricChangeRef = useRef(0)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      if (typewriterTimerRef.current) {
        clearTimeout(typewriterTimerRef.current)
      }
    }
  }, [])

  // Main function code snippet for chorus sections
  const chorusCodeSnippet = `function dieWithASmile() {
  if (worldIsEnding()) {
    return "I'd wanna be next to you"
  } else if (partyIsOver() && timeOnEarthIsThrough()) {
    return "I'd wanna hold you just for a while"
  } else {
    return "And die with a smile"
  }
}

function worldIsEnding() {
  const world = {
    status: "ending",
    timeRemaining: 0
  }
  return world.status === "ending" && world.timeRemaining <= 0
}

function partyIsOver() {
  const party = getLifeParty()
  return party.status === "over"
}

function timeOnEarthIsThrough() {
  const earth = getPlanet("Earth")
  return earth.remainingTime <= 0
}`

  // Verse code snippets based on specific lyrics
  const verseCodeSnippets = {
    dream: `function justWokeUpFromDream() {
  const dream = {
    content: "You and I had to say goodbye",
    meaning: "unknown"
  }
  
  if (dream.content.includes("goodbye")) {
    console.log("I don't know what it all means")
    return "Since I survived, I realized"
  }
}

function processEmotions(dream) {
  try {
    const emotions = extractEmotions(dream)
    return emotions.filter(e => e.intensity > 0.8)
  } catch (error) {
    console.error("Failed to process dream emotions")
    return []
  }
}`,

    wherever: `function followYouEverywhere() {
  // Wherever you go, that's where I'll follow
  const yourPath = getLifeJourney()
  const myPath = yourPath.map(step => followBehind(step))
  
  // Nobody's promised tomorrow
  const tomorrow = Promise.resolve("uncertain")
  
  return "I'mma love you every night like it's the last night"
}

function getLifeJourney() {
  return [
    { location: "happiness", duration: "forever" },
    { location: "sadness", duration: "temporary" },
    { location: "challenges", duration: "as_needed" },
    { location: "love", duration: "eternal" }
  ]
}`,

    lost: `function lostInWords() {
  try {
    const words = getWordsWeScream()
    if (words.length > 0) {
      return "I don't even wanna do this anymore"
    }
  } catch (emotion) {
    console.log("You already know what you mean to me")
    return "Our love is the only war worth fighting for"
  }
}

function getWordsWeScream() {
  const emotions = {
    anger: 0.2,
    frustration: 0.5,
    love: 0.9,
    devotion: 1.0
  }
  
  return Object.entries(emotions)
    .filter(([_, intensity]) => intensity > 0.7)
    .map(([emotion]) => emotion.toUpperCase())
}`,

    vocalizing: `/**
 * [VOCALIZING]
 * Musical expression beyond words
 */
function expressWithoutWords() {
  const emotions = ["love", "devotion", "eternity"]
  const melody = createHarmony(emotions)
  
  // When words fail, music speaks
  return melody.play({
    intensity: 0.95,
    duration: "forever"
  })
}

function createHarmony(emotions) {
  return {
    notes: emotions.map(e => convertToNote(e)),
    play: (options) => {
      // Implementation of playing the harmony
      const { intensity, duration } = options
      return { sound: "beautiful", impact: "eternal" }
    }
  }
}`,

    default: `function loveYouEveryNight() {
  // I just woke up from a dream
  const dream = justWokeUpFrom()
  
  if (dream.includes("goodbye")) {
    console.log("I don't know what it all means")
    return "Since I survived, I realized"
  }
  
  // Wherever you go, that's where I'll follow
  const tomorrow = Promise.resolve("uncertain")
  
  return "I'mma love you every night like it's the last night"
}

function justWokeUpFrom() {
  return {
    includes: (text) => Math.random() > 0.5,
    emotions: ["love", "fear", "hope"],
    intensity: 0.9
  }
}`,
  }

  // Interlude code snippet - more complex and technical
  const interludeCodeSnippet = `/**
 * Die With A Smile - Emotional Logic
 * 
 * A beautiful expression of love through code
 */

// Define emotions as constants
const LOVE = Symbol("unconditional")
const DEVOTION = Symbol("eternal")
const TIME = Symbol("finite")

// The core function that powers everything
function ifTheWorldWasEnding(person1, person2) {
  // Time becomes irrelevant when facing eternity
  const timeRemaining = Infinity
  
  // The only thing that matters in the end
  const finalWish = () => {
    return {
      location: nextTo(person1, person2),
      feeling: "smile",
      duration: "forever"
    }
  }
  
  // When worlds collide
  return {
    message: "If the world was ending, I wanna be next to you",
    emotion: LOVE,
    action: finalWish()
  }
}

// What truly matters in the end
function nextTo(you, me) {
  return "together"
}`

  // Custom typewriter effect implementation
  const startTypewriter = useCallback((text) => {
    if (!isMountedRef.current) return

    // Reset typewriter state
    typewriterIndexRef.current = 0
    typewriterTargetRef.current = text
    setTypewriterText("")
    setTypewriterComplete(false)
    setTypewriterActive(true)

    // Clear any existing timer
    if (typewriterTimerRef.current) {
      clearTimeout(typewriterTimerRef.current)
    }

    // Function to type each character
    const typeNextChar = () => {
      if (!isMountedRef.current) return

      if (typewriterIndexRef.current < typewriterTargetRef.current.length) {
        const nextChar = typewriterTargetRef.current.charAt(typewriterIndexRef.current)
        setTypewriterText((prev) => prev + nextChar)
        typewriterIndexRef.current++

        // Random typing speed for more natural effect
        const speed = Math.random() * 10 + 15 // 15-25ms
        typewriterTimerRef.current = setTimeout(typeNextChar, speed)
      } else {
        setTypewriterComplete(true)
      }
    }

    // Start typing
    typewriterTimerRef.current = setTimeout(typeNextChar, 100)
  }, [])

  // Generate dynamic code snippet based on current lyric
  const generateCodeSnippet = useCallback(
    (lyric) => {
      if (!lyric) return chorusCodeSnippet

      const lowerLyric = lyric.toLowerCase()

      // Exact matching for specific lyrics from the SRT file
      if (lowerLyric.includes("if the world was ending")) {
        setCodeType("chorus")
        return chorusCodeSnippet
      }

      if (lowerLyric.includes("if the party was over") || lowerLyric.includes("time on earth was through")) {
        setCodeType("chorus")
        return chorusCodeSnippet
      }

      if (lowerLyric.includes("i'd wanna hold you") || lowerLyric.includes("die with a smile")) {
        setCodeType("chorus")
        return chorusCodeSnippet
      }

      if (lowerLyric.includes("next to you")) {
        setCodeType("chorus")
        return chorusCodeSnippet
      }

      if (lowerLyric.includes("[both vocalizing]") || lowerLyric.includes("[vocalizing]")) {
        setCodeType("interlude")
        return interludeCodeSnippet
      }

      if (
        lowerLyric.includes("i just woke up from a dream") ||
        lowerLyric.includes("had to say goodbye") ||
        lowerLyric.includes("don't know what it all means") ||
        lowerLyric.includes("since i survived")
      ) {
        setCodeType("verse")
        return verseCodeSnippets.dream
      }

      if (
        lowerLyric.includes("wherever you go") ||
        lowerLyric.includes("that's where i'll follow") ||
        lowerLyric.includes("nobody's promised tomorrow") ||
        lowerLyric.includes("imma love you every night") ||
        lowerLyric.includes("like it's the last night")
      ) {
        setCodeType("verse")
        return verseCodeSnippets.wherever
      }

      if (
        lowerLyric.includes("lost in the words") ||
        lowerLyric.includes("that we scream") ||
        lowerLyric.includes("don't even wanna do this anymore") ||
        lowerLyric.includes("you already know what you mean to me") ||
        lowerLyric.includes("our love is the only war worth fighting for")
      ) {
        setCodeType("verse")
        return verseCodeSnippets.lost
      }

      // Default fallback
      if (lowerLyric.includes("uhh")) {
        setCodeType("verse")
        return verseCodeSnippets.default
      }

      // For any other lyrics, determine if it's more likely a verse or chorus
      if (isChorus) {
        setCodeType("chorus")
        return chorusCodeSnippet
      } else {
        setCodeType("verse")
        return verseCodeSnippets.default
      }
    },
    [chorusCodeSnippet, verseCodeSnippets, interludeCodeSnippet, isChorus],
  )

  // Handle lyric changes and update code snippet
  useEffect(() => {
    if (!isMountedRef.current || !currentLyric) return

    // Skip if same lyric (prevents duplicate processing)
    if (currentLyric === previousLyric) return

    const now = Date.now()
    // Throttle lyric changes to prevent too frequent updates
    if (now - lastLyricChangeRef.current < 500) return
    lastLyricChangeRef.current = now

    setPreviousLyric(currentLyric)

    // Check if current lyric is part of interlude
    const newIsInterlude =
      currentLyric.includes("[BOTH VOCALIZING]") ||
      currentLyric.includes("[VOCALIZING]") ||
      (currentLyric === "..." && currentTime > 170 && currentTime < 190)

    // Handle state changes based on section type
    if (newIsInterlude !== interludeActive || isChorus !== (codeType === "chorus")) {
      // Trigger glitch animation for transition
      setIsGlitching(true)
      setCodeVisible(false)

      setTimeout(() => {
        if (isMountedRef.current) {
          setInterludeActive(newIsInterlude)
          const newCodeSnippet = generateCodeSnippet(currentLyric)
          setCodeSnippet(newCodeSnippet)

          // Start typewriter effect if playing
          if (isPlaying) {
            startTypewriter(newCodeSnippet)
          }

          setCodeVisible(true)
          setIsGlitching(false)
        }
      }, 300)
    } else {
      // Just update the code snippet without animation
      const newCodeSnippet = generateCodeSnippet(currentLyric)
      setCodeSnippet(newCodeSnippet)

      // Update typewriter with new code if playing
      if (isPlaying) {
        startTypewriter(newCodeSnippet)
      }
    }
  }, [
    currentLyric,
    previousLyric,
    isChorus,
    interludeActive,
    currentTime,
    generateCodeSnippet,
    codeType,
    isPlaying,
    startTypewriter,
  ])

  // Handle play state changes
  useEffect(() => {
    if (isPlaying && codeSnippet) {
      // Start typewriter when playing begins
      startTypewriter(codeSnippet)
    } else if (!isPlaying) {
      // Stop typewriter when paused
      if (typewriterTimerRef.current) {
        clearTimeout(typewriterTimerRef.current)
      }
    }
  }, [isPlaying, codeSnippet, startTypewriter])

  // Determine highlighted code line based on lyrics
  useEffect(() => {
    if (!isMountedRef.current || !codeSnippet) return

    // Process animation frame to avoid React state updates too frequently
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      // Only update every 100ms for performance
      const now = Date.now()
      if (now - lastTimeRef.current < 100) return
      lastTimeRef.current = now

      if (interludeActive) {
        // For interlude, cycle through lines
        const totalLines = interludeCodeSnippet.split("\n").length
        setHighlightedLine((prev) => (prev + 1) % totalLines)
        return
      }

      if (!currentLyric) {
        setHighlightedLine(-1)
        return
      }

      // Match lyric content to code lines
      const lowerLyric = currentLyric.toLowerCase()

      if (codeType === "chorus") {
        // Highlight chorus code lines
        if (lowerLyric.includes("if the world was ending")) {
          setHighlightedLine(1) // if (worldIsEnding()) line
        } else if (lowerLyric.includes("i'd wanna be next to you") || lowerLyric.includes("next to you")) {
          setHighlightedLine(2) // return "I'd wanna be next to you"
        } else if (
          lowerLyric.includes("if the party was over") ||
          lowerLyric.includes("time on earth") ||
          lowerLyric.includes("was through")
        ) {
          setHighlightedLine(3) // else if (partyIsOver...)
        } else if (lowerLyric.includes("i'd wanna hold you") || lowerLyric.includes("die with a smile")) {
          setHighlightedLine(4) // return "I'd wanna hold you..."
        } else {
          setHighlightedLine(6) // else block or closing
        }
      } else if (codeType === "verse") {
        // Highlight verse code lines based on current snippet
        if (codeSnippet.includes("justWokeUpFromDream")) {
          if (lowerLyric.includes("dream") || lowerLyric.includes("woke up")) {
            setHighlightedLine(1)
          } else if (lowerLyric.includes("goodbye") || lowerLyric.includes("don't know")) {
            setHighlightedLine(7)
          } else if (lowerLyric.includes("survived") || lowerLyric.includes("realized")) {
            setHighlightedLine(8)
          }
        } else if (codeSnippet.includes("followYouEverywhere")) {
          if (lowerLyric.includes("wherever") || lowerLyric.includes("follow")) {
            setHighlightedLine(2)
          } else if (lowerLyric.includes("tomorrow")) {
            setHighlightedLine(6)
          } else if (lowerLyric.includes("love you every night") || lowerLyric.includes("last night")) {
            setHighlightedLine(8)
          }
        } else if (codeSnippet.includes("lostInWords")) {
          if (lowerLyric.includes("words") || lowerLyric.includes("scream")) {
            setHighlightedLine(2)
          } else if (lowerLyric.includes("don't even wanna")) {
            setHighlightedLine(4)
          } else if (lowerLyric.includes("what you mean to me")) {
            setHighlightedLine(7)
          } else if (lowerLyric.includes("war worth fighting for")) {
            setHighlightedLine(8)
          }
        } else {
          // Default verse snippet
          if (lowerLyric.includes("dream") || lowerLyric.includes("woke up")) {
            setHighlightedLine(2)
          } else if (lowerLyric.includes("wherever") || lowerLyric.includes("follow")) {
            setHighlightedLine(9)
          } else if (lowerLyric.includes("love you every night") || lowerLyric.includes("last night")) {
            setHighlightedLine(12)
          } else {
            setHighlightedLine(Math.floor(Math.random() * 13))
          }
        }
      }
    })
  }, [currentLyric, codeSnippet, interludeActive, interludeCodeSnippet, codeType])

  // Position the component based on device type
  const getCodePosition = useCallback(() => {
    if (isMobile) {
      // Avoid overlap with header on mobile
      return "fixed top-32 left-1/2 -translate-x-1/2 max-w-[90%] w-full z-20 pointer-events-none"
    } else {
      return "fixed top-28 left-1/2 -translate-x-1/2 max-w-lg w-full z-20 pointer-events-none"
    }
  }, [isMobile])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isPlaying ? 1 : 0.7 }}
      transition={{ duration: 0.5 }}
      className={getCodePosition()}
      style={{
        maxHeight: isMobile ? "35vh" : "45vh",
        willChange: "transform, opacity",
      }}
    >
      <AnimatePresence mode="wait">
        {codeVisible && (
          <motion.div
            ref={containerRef}
            className={`code-visualizer rounded-xl overflow-hidden backdrop-blur-md bg-black/40 border border-gray-800/50 ${
              isGlitching ? "glitch" : ""
            }`}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{
              opacity: 1,
              scale: isPlaying ? [1, 1.01, 1] : 1,
              x: isGlitching ? [0, -2, 3, -1, 0] : 0,
              y: 0,
            }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{
              duration: 0.4,
              scale: {
                repeat: isPlaying ? Number.POSITIVE_INFINITY : 0,
                duration: 2,
                repeatType: "reverse",
              },
            }}
          >
            {/* Code content */}
            <div className="code-content p-4 h-full">
              <div className="code-header flex justify-between items-center mb-3">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="code-filename text-xs text-gray-400">DieWithASmile.jsx</span>
                <span className="code-status text-xs">
                  {isPlaying ? (
                    <span className="text-green-400 flex items-center">
                      <span className="inline-block w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse mr-1.5"></span>
                      Running
                    </span>
                  ) : (
                    <span className="text-gray-400">○ Idle</span>
                  )}
                </span>
              </div>

              <div
                ref={codeRef}
                className="overflow-auto rounded-md relative"
                style={{
                  maxHeight: "calc(100% - 2rem)",
                  backgroundColor: "transparent",
                }}
              >
                {/* Custom typewriter effect with syntax highlighting */}
                {isPlaying && typewriterActive ? (
                  <div className="relative">
                    <SyntaxHighlighter
                      language="javascript"
                      style={vscDarkPlus}
                      customStyle={{
                        backgroundColor: "transparent",
                        margin: 0,
                        padding: 0,
                        fontSize: isMobile ? "11px" : "13px",
                      }}
                      wrapLines={true}
                      showLineNumbers={!isMobile}
                      lineProps={(lineNumber) => {
                        // +1 because SyntaxHighlighter line numbers start at 1
                        const isHighlighted = lineNumber === highlightedLine + 1
                        return {
                          style: {
                            backgroundColor: isHighlighted ? "rgba(227, 74, 123, 0.2)" : "",
                            display: "block",
                            padding: "0 1rem",
                            borderRadius: isHighlighted ? "4px" : "0",
                            transition: "all 0.2s ease",
                            borderLeft: isHighlighted ? "2px solid #e34a7b" : "",
                          },
                        }
                      }}
                    >
                      {typewriterText}
                    </SyntaxHighlighter>
                    <span className="typewriter-cursor absolute bottom-4 right-4">|</span>
                  </div>
                ) : (
                  /* Regular syntax highlighting when not typing */
                  <SyntaxHighlighter
                    language="javascript"
                    style={vscDarkPlus}
                    customStyle={{
                      backgroundColor: "transparent",
                      margin: 0,
                      padding: 0,
                      fontSize: isMobile ? "11px" : "13px",
                    }}
                    wrapLines={true}
                    showLineNumbers={!isMobile}
                    lineProps={(lineNumber) => {
                      // +1 because SyntaxHighlighter line numbers start at 1
                      const isHighlighted = lineNumber === highlightedLine + 1
                      return {
                        style: {
                          backgroundColor: isHighlighted ? "rgba(227, 74, 123, 0.2)" : "",
                          display: "block",
                          padding: "0 1rem",
                          borderRadius: isHighlighted ? "4px" : "0",
                          transition: "all 0.2s ease",
                          borderLeft: isHighlighted ? "2px solid #e34a7b" : "",
                        },
                      }
                    }}
                  >
                    {codeSnippet || (codeType === "chorus" ? chorusCodeSnippet : verseCodeSnippets.default)}
                  </SyntaxHighlighter>
                )}
              </div>

              {interludeActive && (
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-secondary-500/30 rounded-full text-[10px] flex items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-secondary-400 animate-pulse mr-1.5"></span>
                  <span className="text-secondary-200">INTERLUDE</span>
                </div>
              )}

              {isChorus && !interludeActive && (
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-primary-500/30 rounded-full text-[10px] flex items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-400 animate-pulse mr-1.5"></span>
                  <span className="text-primary-200">CHORUS</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default CodeVisualizer
