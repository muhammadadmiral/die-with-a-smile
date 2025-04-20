import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { chorusLines } from "../lib/utils"

const CodeVisualizer = ({ currentTime, isPlaying, currentLyric, isMobile }) => {
  // Original code snippets
  const [codeSnippets] = useState({
    default: `// Die With A Smile - Music Visualizer
function handleLoveVisualization(world, feelings) {
  if (world.isEnding) {
    return "I'd wanna be next to you";
  } else if (feelings.intensity > 100) {
    display("I'd wanna hold you just for a while");
    return "and die with a smile";
  } else {
    const memories = feelings.createMemory({
      type: "eternal",
      withPerson: "you"
    });
    return memories.save();
  }
}`,
    chorus: `// If the world was ending
function getNextToYou(world) {
  if (world.isEnding) {                 
    visualize("particles.explosion");   
    return "I'd wanna be next to you";  
  } else if (time.isRunningOut()) {
    clearCanvas();
    draw("you & me", { 
      filter: "forever"
    });
    return "die with a smile";
  }
}`,
    bridge: `// Lost in the words that we scream
class Emotions {
  constructor(feelings) {
    this.intensity = feelings.measure();
    this.connection = new BondType("eternal");
    this.worth = "fighting for";
  }

  express() {
    try {
      return this.connection.strength;
    } catch(heartbreak) {
      return "I don't even wanna do this anymore";
    }
  }
}`,
    outro: `// I'd wanna be next to you
const forever = {
  promise: () => {
    return new Promise((resolve) => {
      const love = {
        today: "every moment",
        tomorrow: "like it's the last"
      };
      
      resolve(love.tomorrow);
    });
  }
};

await forever.promise(); // "like it's the last"`,
  })

  // State for code display and animation
  const [currentSnippet, setCurrentSnippet] = useState("default")
  const [highlightedLine, setHighlightedLine] = useState(0)
  const [isGlitching, setIsGlitching] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [codeOpacity, setCodeOpacity] = useState(1)
  const [isTypewriting, setIsTypewriting] = useState(false)
  const [typewriterPosition, setTypewriterPosition] = useState(0)
  const [activeTypingLine, setActiveTypingLine] = useState(-1)
  const [isChorus, setIsChorus] = useState(false)
  const [previousLyric, setPreviousLyric] = useState("")
  const [typingSpeed, setTypingSpeed] = useState({ min: 30, max: 80 })
  const [codePulse, setCodePulse] = useState(false)
  const [codeVisible, setCodeVisible] = useState(true)

  // Refs
  const codeRef = useRef(null)
  const containerRef = useRef(null)
  const typewriterTimerRef = useRef(null)
  const snippetChangeTimeoutRef = useRef(null)
  const typewritingLinesRef = useRef([])
  const currentSnippetRef = useRef("default")
  const pulseIntervalRef = useRef(null)
  const isMountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false

      if (typewriterTimerRef.current) {
        clearTimeout(typewriterTimerRef.current)
        typewriterTimerRef.current = null
      }

      if (snippetChangeTimeoutRef.current) {
        clearTimeout(snippetChangeTimeoutRef.current)
        snippetChangeTimeoutRef.current = null
      }

      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current)
        pulseIntervalRef.current = null
      }
    }
  }, [])

  // Check for chorus sections in lyrics and update state
  useEffect(() => {
    if (!isMountedRef.current) return

    // Skip if no current lyric
    if (!currentLyric) return

    // Skip if same lyric (prevents duplicate processing)
    if (currentLyric === previousLyric) return
    setPreviousLyric(currentLyric)

    // Check if current lyric is part of chorus
    const lyricsInChorus = chorusLines.some((line) => currentLyric.includes(line) || line.includes(currentLyric))

    // Set chorus state
    const wasChorus = isChorus
    setIsChorus(lyricsInChorus)

    // Handle transitions between sections
    if (lyricsInChorus && !wasChorus) {
      // Entering chorus section
      console.log("Entering chorus section")
      handleSectionChange("chorus")
      // Trigger a stronger pulse effect
      triggerCodePulse()
    } else if (currentLyric.includes("LOST") || currentLyric.includes("Lost in the words")) {
      // Entering bridge section
      console.log("Entering bridge section")
      handleSectionChange("bridge")
    } else if (currentLyric.includes("RIGHT NEXT TO YOU")) {
      // Entering outro section
      console.log("Entering outro section")
      handleSectionChange("outro")
    } else if (!lyricsInChorus && wasChorus) {
      // Exiting chorus section
      console.log("Exiting chorus section")
      handleSectionChange("default")
    }
  }, [currentLyric, isChorus])

  // Create pulse effect for code transitions
  const triggerCodePulse = () => {
    if (!isMountedRef.current) return

    // Set pulse to true, then false after animation
    setCodePulse(true)
    setTimeout(() => {
      if (isMountedRef.current) {
        setCodePulse(false)
      }
    }, 1000)
  }

  // Handle section changes with animations
  const handleSectionChange = (newSection) => {
    if (!isMountedRef.current) return

    console.log(`Changing to ${newSection} section`)

    // Don't change if already in this section
    if (currentSnippet === newSection) return

    // Start glitch effect
    setIsGlitching(true)
    setCodeVisible(false)

    // Clear any existing timeouts
    if (snippetChangeTimeoutRef.current) {
      clearTimeout(snippetChangeTimeoutRef.current)
      snippetChangeTimeoutRef.current = null
    }

    // After short delay, change snippet and start typewriter
    snippetChangeTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return

      // Update current snippet
      setCurrentSnippet(newSection)
      currentSnippetRef.current = newSection
      setIsGlitching(false)
      setCodeVisible(true)

      // Start typewriter effect for new section
      if (newSection !== "default") {
        console.log(`Starting typewriter for ${newSection}`)

        // Speed up typewriter for chorus sections
        setTypingSpeed(newSection === "chorus" ? { min: 20, max: 50 } : { min: 30, max: 80 })

        startTypewriterEffect(newSection)
        setIsAnimating(true)
      } else {
        // Reset typewriter and animation for default section
        resetTypewriterEffect()
        setIsAnimating(false)
      }
    }, 300)
  }

  // Start typewriter effect with proper timing
  const startTypewriterEffect = (snippetKey) => {
    if (!isMountedRef.current) return

    // Clear any existing typewriter animation
    resetTypewriterEffect()

    console.log("Starting typewriter effect for:", snippetKey)
    setIsTypewriting(true)
    setTypewriterPosition(0)

    // Get code snippet and split into lines
    const codeLines = codeSnippets[snippetKey].split("\n")

    // Select lines to type based on section
    let typingLines = []

    // For chorus
    if (snippetKey === "chorus") {
      typingLines = [1, 2, 3, 4]
    }
    // For bridge
    else if (snippetKey === "bridge") {
      typingLines = [2, 3, 4, 9, 10, 11]
    }
    // For outro
    else if (snippetKey === "outro") {
      typingLines = [2, 3, 8, 9, 10, 15]
    }

    typewritingLinesRef.current = typingLines

    // Start typing animation
    setTimeout(() => {
      if (!isMountedRef.current) return
      typeWriter(codeLines, typingLines, 0, 0)
    }, 300) // Add a small delay before starting
  }

  // Reset typewriter effect
  const resetTypewriterEffect = () => {
    if (!isMountedRef.current) return

    console.log("Resetting typewriter effect")
    if (typewriterTimerRef.current) {
      clearTimeout(typewriterTimerRef.current)
      typewriterTimerRef.current = null
    }
    setIsTypewriting(false)
    setTypewriterPosition(0)
    setActiveTypingLine(-1)
    typewritingLinesRef.current = []
  }

  // Typewriter animation function
  const typeWriter = (codeLines, typingLines, lineIndex, charIndex) => {
    if (!isMountedRef.current) return

    // If we're no longer typing or playing, stop
    if (!isTypewriting || !isPlaying) {
      return
    }

    // If we've gone through all lines, stop
    if (lineIndex >= typingLines.length) {
      setIsTypewriting(false)
      return
    }

    // Get current section from ref to ensure we're using the latest value
    const currentSnippet = currentSnippetRef.current

    // Get the actual line index from the typing lines array
    const actualLineIndex = typingLines[lineIndex]
    const currentLine = codeLines[actualLineIndex]

    // If this is a line we're actively typing
    setActiveTypingLine(actualLineIndex)

    // If we're still typing this line
    if (charIndex < currentLine.length) {
      // Type next character
      setTypewriterPosition(charIndex + 1)

      // Schedule next character
      const speed = Math.random() * (typingSpeed.max - typingSpeed.min) + typingSpeed.min
      typewriterTimerRef.current = setTimeout(() => {
        if (!isMountedRef.current) return
        typeWriter(codeLines, typingLines, lineIndex, charIndex + 1)
      }, speed)
    }
    // This line is complete, move to next line
    else {
      // Schedule next line with a pause between lines
      typewriterTimerRef.current = setTimeout(() => {
        if (!isMountedRef.current) return
        setActiveTypingLine(-1) // Reset active typing line
        typeWriter(codeLines, typingLines, lineIndex + 1, 0)
      }, 400) // Longer pause between lines
    }
  }

  // Handle play/pause changes
  useEffect(() => {
    if (!isMountedRef.current) return

    // If not playing, pause typewriter
    if (!isPlaying && isTypewriting) {
      if (typewriterTimerRef.current) {
        clearTimeout(typewriterTimerRef.current)
        typewriterTimerRef.current = null
      }
    }
    // If resumed playing and we were typewriting, continue
    else if (isPlaying && isTypewriting) {
      // Resume typewriter from current position
      const codeLines = codeSnippets[currentSnippet].split("\n")
      const typingLines = typewritingLinesRef.current

      // Find current line index
      let currentLineIdx = 0
      for (let i = 0; i < typingLines.length; i++) {
        if (typingLines[i] === activeTypingLine) {
          currentLineIdx = i
          break
        }
      }

      if (activeTypingLine !== -1) {
        typeWriter(codeLines, typingLines, currentLineIdx, typewriterPosition)
      }
    }

    // Start/stop code pulsing with music
    if (isPlaying) {
      // Set up interval for subtle code pulsing
      pulseIntervalRef.current = setInterval(() => {
        if (!isMountedRef.current) return

        setCodeOpacity((prev) => Math.random() * 0.1 + 0.9) // Subtle random flickering

        // Random chance of glitch effect
        if (Math.random() < 0.05) {
          setIsGlitching(true)
          setTimeout(() => {
            if (isMountedRef.current) {
              setIsGlitching(false)
            }
          }, 100)
        }
      }, 500)
    } else {
      // Clear interval when not playing
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current)
        pulseIntervalRef.current = null
        setCodeOpacity(1)
      }
    }

    return () => {
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current)
        pulseIntervalRef.current = null
      }
    }
  }, [isPlaying, isTypewriting, currentSnippet, activeTypingLine, typewriterPosition])

  // Animate moving line highlight in active sections
  useEffect(() => {
    if (!isMountedRef.current) return

    if (!isAnimating || !isPlaying) {
      setHighlightedLine(0)
      return
    }

    // Get the number of lines in the current snippet
    const lineCount = codeSnippets[currentSnippet].split("\n").length

    // Create animation for moving highlighted line
    const interval = setInterval(() => {
      if (!isMountedRef.current) return
      setHighlightedLine((prev) => (prev + 1) % lineCount)
    }, 800) // Adjust speed based on song tempo

    return () => clearInterval(interval)
  }, [isAnimating, isPlaying, currentSnippet, codeSnippets])

  // Customize line style based on state
  const getLineStyle = (lineIndex, codeLines) => {
    const isHighlighted = lineIndex === highlightedLine && isAnimating
    const isTyping = lineIndex === activeTypingLine

    const baseStyle = {
      display: "block",
      padding: "0 1rem",
      transition: "all 0.3s ease",
      position: "relative",
    }

    if (isTyping) {
      return {
        ...baseStyle,
        backgroundColor: "rgba(227, 74, 123, 0.3)",
        borderLeft: "3px solid rgb(227, 74, 123)",
      }
    }

    if (isHighlighted) {
      return {
        ...baseStyle,
        backgroundColor: "rgba(227, 74, 123, 0.2)",
        borderLeft: "3px solid rgb(227, 74, 123)",
      }
    }

    return baseStyle
  }

  // Render code with typewriter effect for active line
  const renderCodeWithTypewriter = () => {
    const codeLines = codeSnippets[currentSnippet].split("\n")

    return codeLines.map((line, index) => {
      // Only apply typewriter effect to the active typing line
      if (index === activeTypingLine) {
        const visiblePart = line.substring(0, typewriterPosition)
        const hiddenPart = line.substring(typewriterPosition)

        return (
          <div key={`${currentSnippet}-${index}`} style={getLineStyle(index, codeLines)} className="line">
            <span className="code-text">{visiblePart}</span>
            <span className="hidden">{hiddenPart}</span>
            {typewriterPosition < line.length && (
              <span className="inline-block w-2 h-4 bg-primary-500 ml-0.5 animate-pulse"></span>
            )}
          </div>
        )
      }

      // Normal line, no typewriter effect
      return (
        <div key={`${currentSnippet}-${index}`} style={getLineStyle(index, codeLines)} className="line">
          <span className="code-text">{line}</span>
        </div>
      )
    })
  }

  // Position the code visualizer based on device type
  const getCodePosition = () => {
    if (isMobile) {
      return "fixed top-20 left-4 right-4 max-w-full z-20 pointer-events-none"
    } else {
      return "fixed top-20 right-4 max-w-md z-20 pointer-events-none"
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isPlaying ? 1 : 0.7 }}
      transition={{ duration: 0.5 }}
      className={getCodePosition()}
      style={{ maxHeight: isMobile ? "30vh" : "40vh" }}
    >
      <AnimatePresence>
        {codeVisible && (
          <motion.div
            ref={containerRef}
            className={`code-visualizer ${isGlitching ? "glitch" : ""}`}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{
              opacity: codeOpacity,
              scale: codePulse ? [1, 1.02, 0.98, 1] : isPlaying ? [1, 1.01, 1] : 1,
              x: isGlitching ? [0, -2, 3, -1, 0] : 0,
              y: 0,
            }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{
              duration: codePulse ? 0.8 : 0.4,
              times: codePulse ? [0, 0.3, 0.7, 1] : undefined,
              scale: {
                repeat: isPlaying && !codePulse ? Number.POSITIVE_INFINITY : 0,
                duration: 0.8,
              },
              x: {
                duration: 0.2,
              },
            }}
          >
            <div className="code-header">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span className="code-filename">dieWithASmile.js</span>
              <span className="code-status">
                {isPlaying ? (
                  isTypewriting ? (
                    <span className="text-primary-400 flex items-center">
                      <span className="inline-block w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse mr-1.5"></span>
                      Typing...
                    </span>
                  ) : (
                    <span className="text-green-400 flex items-center">
                      <span className="inline-block w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse mr-1.5"></span>
                      Running
                    </span>
                  )
                ) : (
                  <span className="text-gray-400">○ Idle</span>
                )}
              </span>
            </div>

            <div className="code-content custom-scrollbar">
              <pre className={`language-javascript line-numbers ${isGlitching ? "glitch-text" : ""}`}>
                <code ref={codeRef} className="language-javascript">
                  {renderCodeWithTypewriter()}
                </code>
              </pre>
            </div>

            {isPlaying && (
              <motion.div
                className="code-pulse"
                animate={{
                  opacity: [0.05, 0.2, 0.05],
                  scale: [1, 1.02, 1],
                }}
                transition={{
                  duration: 4,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              />
            )}

            {/* Add indicator if in chorus mode */}
            {isChorus && (
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary-500/30 rounded-full text-[10px] flex items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-400 animate-pulse mr-1.5"></span>
                <span className="text-primary-200">CHORUS MODE</span>
              </div>
            )}

            {/* Add snippet type indicator */}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-dark-800/50 rounded-full text-[10px] flex items-center">
              <span className="text-gray-300">
                {currentSnippet === "default"
                  ? "Main"
                  : currentSnippet === "chorus"
                    ? "Chorus"
                    : currentSnippet === "bridge"
                      ? "Bridge"
                      : "Outro"}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default CodeVisualizer
