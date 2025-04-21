"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
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

  // Refs
  const containerRef = useRef(null)
  const codeRef = useRef(null)
  const isMountedRef = useRef(true)
  const animationFrameRef = useRef(null)
  const lastTimeRef = useRef(0)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // Main function code snippet for chorus sections
  const chorusCodeSnippet = useMemo(
    () => `function dieWithASmile() {
  if (worldIsEnding()) {
    return "I wanna be next to you"
  } else if (partyIsOver() && timeOnEarthIsThrough()) {
    return "I wanna hold you just for a while and die with a smile"
  } else {
    return "I'd still choose you, even in the bugs of life"
  }
}`,
    [],
  )

  // Verse code snippet
  const verseCodeSnippet = useMemo(
    () => `function loveYouEveryNight() {
  const dream = justWokeUpFrom()
  
  if (dream.includes("goodbye")) {
    console.log("I don't know what it all means")
    return "Since I survived, I realized"
  }
  
  // Wherever you go, that's where I'll follow
  const tomorrow = Promise.resolve("uncertain")
  
  return "I'mma love you every night like it's the last night"
}`,
    [],
  )

  // Interlude code snippet
  const interludeCodeSnippet = useMemo(
    () => `/**
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
}`,
    [],
  )

  // Generate code snippet based on current lyric
  const generateCodeSnippet = useCallback(
    (lyric) => {
      if (!lyric) return chorusCodeSnippet

      const lowerLyric = lyric.toLowerCase()

      // Check for specific lyric content to determine which snippet to show
      if (
        lowerLyric.includes("if the world was ending") ||
        lowerLyric.includes("i'd wanna be next to you") ||
        lowerLyric.includes("if the party was over") ||
        lowerLyric.includes("time on earth") ||
        lowerLyric.includes("i'd wanna hold you") ||
        lowerLyric.includes("die with a smile")
      ) {
        return chorusCodeSnippet
      } else if (lowerLyric.includes("vocalizing") || lowerLyric === "...") {
        return interludeCodeSnippet
      } else {
        return verseCodeSnippet
      }
    },
    [chorusCodeSnippet, verseCodeSnippet, interludeCodeSnippet],
  )

  // Handle lyric changes and update code snippet
  useEffect(() => {
    if (!isMountedRef.current || !currentLyric) return

    // Skip if same lyric (prevents duplicate processing)
    if (currentLyric === previousLyric) return

    setPreviousLyric(currentLyric)

    // Check if current lyric is part of interlude
    const newIsInterlude =
      currentLyric.includes("[BOTH VOCALIZING]") ||
      currentLyric.includes("[VOCALIZING]") ||
      (currentLyric === "..." && currentTime > 170 && currentTime < 190)

    // Handle state changes based on section type
    if (newIsInterlude !== interludeActive || isChorus !== (codeSnippet === chorusCodeSnippet)) {
      // Trigger glitch animation for transition
      setIsGlitching(true)
      setCodeVisible(false)

      setTimeout(() => {
        if (isMountedRef.current) {
          setInterludeActive(newIsInterlude)
          setCodeSnippet(generateCodeSnippet(currentLyric))
          setCodeVisible(true)
          setIsGlitching(false)
        }
      }, 300)
    } else {
      // Just update the code snippet without animation
      setCodeSnippet(generateCodeSnippet(currentLyric))
    }
  }, [currentLyric, previousLyric, isChorus, interludeActive, currentTime, generateCodeSnippet, chorusCodeSnippet])

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

      if (codeSnippet === chorusCodeSnippet) {
        // Highlight chorus code lines
        if (lowerLyric.includes("if the world was ending")) {
          setHighlightedLine(1) // if (worldIsEnding()) line
        } else if (lowerLyric.includes("i'd wanna be next to you") || lowerLyric.includes("i wanna be next to you")) {
          setHighlightedLine(2) // return "I wanna be next to you"
        } else if (
          lowerLyric.includes("if the party was over") ||
          lowerLyric.includes("time on earth") ||
          lowerLyric.includes("was through")
        ) {
          setHighlightedLine(3) // else if (partyIsOver...)
        } else if (lowerLyric.includes("i'd wanna hold you") || lowerLyric.includes("die with a smile")) {
          setHighlightedLine(4) // return "I wanna hold you..."
        } else {
          setHighlightedLine(6) // else block or closing
        }
      } else if (codeSnippet === verseCodeSnippet) {
        // Highlight verse code lines
        if (lowerLyric.includes("dream") || lowerLyric.includes("woke up")) {
          setHighlightedLine(1) // const dream = justWokeUpFrom()
        } else if (lowerLyric.includes("goodbye") || lowerLyric.includes("don't know")) {
          setHighlightedLine(4) // console.log("I don't know what it all means")
        } else if (lowerLyric.includes("wherever you go") || lowerLyric.includes("follow")) {
          setHighlightedLine(9) // // Wherever you go, that's where I'll follow
        } else if (lowerLyric.includes("tomorrow")) {
          setHighlightedLine(10) // const tomorrow = Promise.resolve("uncertain")
        } else if (lowerLyric.includes("love you every night") || lowerLyric.includes("last night")) {
          setHighlightedLine(12) // return "I'mma love you every night like it's the last night"
        } else {
          setHighlightedLine(Math.floor(Math.random() * 13)) // Random line
        }
      }
    })
  }, [currentLyric, codeSnippet, interludeActive, interludeCodeSnippet, chorusCodeSnippet, verseCodeSnippet])

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
                <span className="code-filename text-xs text-gray-400">
                  {interludeActive ? "EmotionalLogic.js" : isChorus ? "dieWithASmile.js" : "loveYouEveryNight.js"}
                </span>
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
                className="overflow-auto rounded-md"
                style={{
                  maxHeight: "calc(100% - 2rem)",
                  backgroundColor: "transparent",
                }}
              >
                {/* Use SyntaxHighlighter for better code display */}
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
                  {codeSnippet}
                </SyntaxHighlighter>
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
