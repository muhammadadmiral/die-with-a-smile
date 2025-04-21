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
  const [codeType, setCodeType] = useState("chorus") // chorus, verse, interlude, climax
  const [typewriterText, setTypewriterText] = useState("")
  const [typewriterActive, setTypewriterActive] = useState(false)
  const [typewriterComplete, setTypewriterComplete] = useState(false)
  const [climaxMode, setClimaxMode] = useState(false)
  const [isVocalizing, setIsVocalizing] = useState(false)
  const [isBridge, setIsBridge] = useState(false)

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
  const glitchTimeoutRef = useRef(null)

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
      
      if (glitchTimeoutRef.current) {
        clearTimeout(glitchTimeoutRef.current)
      }
    }
  }, [])

  // Main function code snippet for chorus sections - semantic connection to "If the world was ending" lyrics
  const chorusCodeSnippet = `/**
 * Die With A Smile - Core logic for chorus section
 */
function dieWithASmile() {
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

  // Climax code snippet - enhanced for the final section of the song
  const climaxCodeSnippet = `/**
 * Die With A Smile - Final chorus with intensified emotions
 */
function finalChorus() {
  // The ultimate truth when everything else fades away
  const finalMoment = {
    truth: "love",
    duration: Infinity
  }
  
  // When faced with the end of everything
  if (apocalypse.isImminent()) {
    // The only thing that matters
    return createEternalMemory({
      feeling: "love",
      person: "you",
      proximity: "next to",
      action: "die with a smile"
    })
  }
  
  // The deepest connection that transcends even the end of time
  return {
    priority: ["you", "us", "together"],
    forever: true,
    lastThought: "die with a smile"
  }
}

// No matter what happens, this remains true
const ETERNAL_TRUTH = "If the world was ending, I'd wanna be next to you"

// Create a moment that lasts forever
function createEternalMemory(options) {
  return {
    type: "timeless",
    focus: options.person,
    essence: "If the world was ending, I'd wanna be " + options.proximity + " " + options.person,
    lastWords: options.action
  }
}`

  // Verse code snippets based on specific lyrics - enhanced to better match lyrical content
  const verseCodeSnippets = {
    dream: `/**
 * "I just woke up from a dream"
 * "Where you and I had to say goodbye"
 */
function processNightmareDream() {
  const dream = {
    content: "You and I had to say goodbye",
    type: "nightmare",
    intensity: 0.9
  }
  
  // "I don't know what it all means"
  try {
    const interpretation = analyzeDream(dream)
    console.log("Dream analysis:", interpretation)
    console.log("I don't know what it all means")
  } catch (emotion) {
    // "Since I survived, I realized"
    return {
      revelation: "Since I survived, I realized...",
      conclusion: "I need you close to me",
      emotion: "gratitude"
    }
  }
}

function analyzeDream(dream) {
  // Extract emotions and symbols
  const emotions = dream.content
    .split(" ")
    .map(word => getEmotionalWeight(word))
    .filter(emotion => emotion.intensity > 0.7)
  
  if (emotions.length === 0) {
    throw new Error("Dream too complex to analyze")
  }
  
  return {
    primaryEmotion: emotions[0].type,
    subconscious: "fear of loss",
    message: "cherish every moment"
  }
}`,

    wherever: `/**
 * "Wherever you go, that's where I'll follow"
 * "Nobody's promised tomorrow"
 */
function followYouEverywhere() {
  // Your path becomes my path
  const yourPath = getLifeJourney()
  const myPath = yourPath.map(step => followBehind(step))
  
  // Time is fleeting, tomorrow isn't guaranteed
  const tomorrow = Promise.race([
    Promise.resolve("another day"),
    Promise.reject("no more time")
  ]).catch(reason => {
    console.log("Nobody's promised tomorrow")
    return reason
  })
  
  // "I'mma love you every night like it's the last night"
  return loveLikeLastNight({
    intensity: 1.0,
    duration: "until dawn",
    assumption: "might be our last together"
  })
}

function getLifeJourney() {
  return [
    { location: "happiness", duration: "fleeting" },
    { location: "sadness", duration: "temporary" },
    { location: "challenges", duration: "as_needed" },
    { location: "love", duration: "eternal" }
  ]
}

function loveLikeLastNight(options) {
  // When every moment counts
  if (options.assumption === "might be our last together") {
    return {
      approach: "give everything",
      holdBack: "nothing",
      message: "I'mma love you every night like it's the last night"
    }
  }
}`,

    lost: `/**
 * "Lost in the words that we scream"
 * "I don't even wanna do this anymore"
 */
function lostInWords() {
  try {
    const argument = {
      words: getWordsWeScream(),
      emotion: "frustration",
      volume: 0.9
    }
    
    if (argument.words.includes("I DON'T EVEN WANNA DO THIS ANYMORE")) {
      // Breaking point reached
      return giveUp()
    }
    
  } catch (understanding) {
    // "You already know what you mean to me"
    console.log("You already know what you mean to me")
    
    // "Our love is the only war worth fighting for"
    return {
      priority: "us",
      worth: "everything",
      conclusion: "Our love is the only war worth fighting for"
    }
  }
}

function getWordsWeScream() {
  const emotions = {
    anger: 0.2,
    frustration: 0.5,
    love: 0.9,
    devotion: 1.0
  }
  
  // Words spoken in heat of the moment
  return Object.entries(emotions)
    .filter(([_, intensity]) => intensity > 0.7)
    .map(([emotion]) => emotion.toUpperCase())
}

function giveUp() {
  throw new Error("But I can't give up on us")
}`,

    vocalizing: `/**
 * [VOCALIZING]
 * When words fail but emotions remain
 */
function expressWithoutWords() {
  // Some emotions transcend language
  const feelings = [
    { type: "love", intensity: 0.95 },
    { type: "devotion", intensity: 0.9 },
    { type: "longing", intensity: 0.85 },
    { type: "eternity", intensity: 1.0 }
  ]
  
  // Create harmony from pure emotion
  const melody = createHarmony(feelings)
  
  // When words fail, music speaks
  return melody.play({
    intensity: 0.95,
    duration: "forever",
    key: "E minor"
  })
}

function createHarmony(emotions) {
  // Convert emotions to musical elements
  const notes = emotions.map(emotion => {
    return {
      pitch: convertEmotionToPitch(emotion.type),
      duration: emotion.intensity * 4,
      expression: emotion.intensity > 0.9 ? "vibrato" : "standard"
    }
  })
  
  return {
    notes,
    play: (options) => {
      // Implementation of playing the harmony
      return { 
        sound: "beautiful", 
        impact: "eternal",
        message: "I'd wanna be next to you" 
      }
    }
  }
}`,

  bridge: `/**
 * Bridge section - Musical contemplation
 * A moment of quiet reflection before the final chorus
 */
function musicalInterlude() {
  // A space for reflection
  const thoughts = collectThoughts()
  
  // Let the music breathe
  setTimeout(() => {
    // Building anticipation for what comes next
    const intensity = 0
    const buildUp = setInterval(() => {
      intensity += 0.1
      if (intensity >= 1) {
        clearInterval(buildUp)
        return finalChorus()
      }
    }, 500)
  }, 3000)
  
  return {
    type: "instrumental",
    emotion: "anticipation",
    leadingTo: "climax"
  }
}

function collectThoughts() {
  return [
    "If the world was ending",
    "I'd wanna be next to you",
    "Time is precious",
    "Love is all that matters"
  ].map(thought => ({
    content: thought,
    weight: thought.includes("next to you") ? 0.9 : 0.6
  }))
}`,

    default: `/**
 * "I just woke up from a dream"
 * Current verse section
 */
function processCurrentVerse() {
  // Extract meaning from current lyrics
  const currentLyrics = getCurrentLyrics()
  
  // Find emotional core of the verse
  const emotionalCore = currentLyrics.reduce((core, line) => {
    const emotionWeight = calculateEmotionWeight(line)
    return emotionWeight > core.weight 
      ? { line, weight: emotionWeight }
      : core
  }, { line: "", weight: 0 })
  
  // Every verse leads back to the same conclusion
  if (emotionalCore.weight > 0.7) {
    return {
      message: "Love transcends everything else",
      conclusion: "I'd wanna be next to you",
      certainty: 1.0
    }
  }
  
  return {
    status: "processing",
    emotionalDirection: "building",
    leadingTo: "chorus"
  }
}

function getCurrentLyrics() {
  return [
    "I just woke up from a dream",
    "Where you and I had to say goodbye",
    "And I don't know what it all means",
    "But since I survived, I realized"
  ]
}`,
  }

  // Interlude code snippet - enhanced with more complex logic
  const interludeCodeSnippet = `/**
 * Die With A Smile - Emotional Core
 * 
 * A deeper look at the song's central message
 */

// Define emotions as powerful constants
const LOVE = Symbol("unconditional")
const DEVOTION = Symbol("eternal")
const TIME = Symbol("finite")
const PROXIMITY = Symbol("together")

// The heart of everything - what matters most
function ifTheWorldWasEnding(person1, person2) {
  // When faced with the end of everything
  const apocalypse = {
    type: "extinction",
    timeRemaining: 0,
    options: ["panic", "despair", "acceptance"]
  }
  
  // The only thing that truly matters
  const coreDesire = () => {
    return {
      wish: "proximity",
      to: person2,
      intensity: Infinity,
      reason: "love transcends apocalypse"
    }
  }
  
  // The final moment of clarity
  return {
    realization: "If the world was ending, I wanna be next to you",
    emotion: LOVE,
    action: coreDesire(),
    meaning: "Love is the only thing worth holding onto"
  }
}

/**
 * When everything else fades away, this remains
 */
function whatTrulyMatters(you, me) {
  // All possessions and concerns become irrelevant
  const worldlyPossessions = null
  const mundaneConcerns = []
  
  // Only one thing remains important
  return {
    priority: "togetherness",
    essence: "next to you",
    duration: "until the end",
    expressedAs: "die with a smile"
  }
}`

  // Map specific timestamp ranges to code snippets for precise timing
  const timestampSnippetMap = useMemo(() => [
    { start: 0, end: 10, type: "verse", snippet: "default" },
    { start: 10, end: 28, type: "verse", snippet: "dream" },
    { start: 28, end: 43, type: "verse", snippet: "wherever" },
    { start: 44, end: 70, type: "chorus", snippet: "chorus" },
    { start: 70, end: 85, type: "interlude", snippet: "interlude" },
    { start: 85, end: 107, type: "verse", snippet: "lost" },
    { start: 107, end: 121, type: "verse", snippet: "wherever" },
    { start: 121, end: 170, type: "chorus", snippet: "chorus" },
    { start: 170, end: 190, type: "verse", snippet: "vocalizing" },
    { start: 190, end: 208, type: "bridge", snippet: "bridge" },
    { start: 208, end: 245, type: "climax", snippet: "climax" }
  ], [])

  // Custom typewriter effect implementation - optimized
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

  // Determine snippet based on current time and lyrics
  const determineSnippetFromTime = useCallback((time) => {
    const matchingRange = timestampSnippetMap.find(
      range => time >= range.start && time < range.end
    )
    
    if (matchingRange) {
      return {
        type: matchingRange.type,
        snippet: matchingRange.type === "chorus" 
          ? chorusCodeSnippet 
          : matchingRange.type === "interlude" 
            ? interludeCodeSnippet 
            : matchingRange.type === "climax"
              ? climaxCodeSnippet
              : matchingRange.type === "bridge"
                ? verseCodeSnippets.bridge
                : verseCodeSnippets[matchingRange.snippet]
      }
    }
    
    // Default fallback
    return { 
      type: "verse", 
      snippet: verseCodeSnippets.default 
    }
  }, [chorusCodeSnippet, interludeCodeSnippet, climaxCodeSnippet, verseCodeSnippets, timestampSnippetMap])

  // Generate dynamic code snippet based on current lyric - enhanced with timestamp awareness
  const generateCodeSnippet = useCallback(
    (lyric, time) => {
      // First try to match based on timestamp for more accurate transitions
      const timeBasedSnippet = determineSnippetFromTime(time)
      
      // Update the type based on timestamp mapping
      setCodeType(timeBasedSnippet.type)
      
      // Set special modes based on section type
      setClimaxMode(timeBasedSnippet.type === "climax")
      setInterludeActive(timeBasedSnippet.type === "interlude")
      setIsVocalizing(lyric && (lyric.includes("[VOCALIZING]") || lyric.includes("[BOTH VOCALIZING]")))
      setIsBridge(timeBasedSnippet.type === "bridge")
      
      return timeBasedSnippet.snippet
    },
    [determineSnippetFromTime]
  )

  // Handle glitch effect
  const triggerGlitchEffect = useCallback(() => {
    setIsGlitching(true)
    setCodeVisible(false)
    
    // Clear any existing timeout
    if (glitchTimeoutRef.current) {
      clearTimeout(glitchTimeoutRef.current)
    }
    
    glitchTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setCodeVisible(true)
        
        setTimeout(() => {
          if (isMountedRef.current) {
            setIsGlitching(false)
          }
        }, 300)
      }
    }, 300)
  }, [])

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
    const newIsInterlude = currentLyric.includes("[BOTH VOCALIZING]") || 
      currentLyric.includes("[VOCALIZING]") ||
      (currentLyric === "..." && currentTime > 170 && currentTime < 190)
    
    // Detect climax mode
    const newIsClimax = currentTime > 208 && currentTime < 245
    
    // Handle state changes based on section type
    if (newIsInterlude !== interludeActive || 
        newIsClimax !== climaxMode || 
        isChorus !== (codeType === "chorus")) {
      
      // Trigger glitch animation for transition
      triggerGlitchEffect()

      setTimeout(() => {
        if (isMountedRef.current) {
          setInterludeActive(newIsInterlude)
          setClimaxMode(newIsClimax)
          
          const newCodeSnippet = generateCodeSnippet(currentLyric, currentTime)
          setCodeSnippet(newCodeSnippet)

          // Start typewriter effect if playing
          if (isPlaying) {
            startTypewriter(newCodeSnippet)
          }
        }
      }, 300)
    } else {
      // Just update the code snippet without animation
      const newCodeSnippet = generateCodeSnippet(currentLyric, currentTime)
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
    climaxMode,
    triggerGlitchEffect
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
          setHighlightedLine(4) // if (worldIsEnding()) line
        } else if (lowerLyric.includes("i'd wanna be next to you") || lowerLyric.includes("next to you")) {
          setHighlightedLine(5) // return "I'd wanna be next to you"
        } else if (
          lowerLyric.includes("if the party was over") ||
          lowerLyric.includes("time on earth") ||
          lowerLyric.includes("was through")
        ) {
          setHighlightedLine(6) // else if (partyIsOver...)
        } else if (lowerLyric.includes("i'd wanna hold you") || lowerLyric.includes("die with a smile")) {
          setHighlightedLine(7) // return "I'd wanna hold you..."
        } else {
          setHighlightedLine(9) // else block or closing
        }
      } else if (codeType === "climax") {
        // Highlight climax code lines
        if (lowerLyric.includes("if the world was ending")) {
          setHighlightedLine(10) // if (apocalypse.isImminent())
        } else if (lowerLyric.includes("i'd wanna be next to you")) {
          setHighlightedLine(13)
        } else if (lowerLyric.includes("die with a smile")) {
          setHighlightedLine(23) // lastThought: "die with a smile"
        } else {
          // Pulse through important lines
          const importantLines = [5, 10, 13, 23, 28]
          const currentIndex = importantLines.indexOf(highlightedLine)
          const nextIndex = (currentIndex + 1) % importantLines.length
          setHighlightedLine(importantLines[nextIndex])
        }
      } else if (codeType === "verse") {
        // Highlight verse code lines based on current snippet
        if (codeSnippet.includes("processNightmareDream")) {
          if (lowerLyric.includes("dream") || lowerLyric.includes("woke up")) {
            setHighlightedLine(5)
          } else if (lowerLyric.includes("goodbye") || lowerLyric.includes("don't know")) {
            setHighlightedLine(12)
          } else if (lowerLyric.includes("survived") || lowerLyric.includes("realized")) {
            setHighlightedLine(15)
          }
        } else if (codeSnippet.includes("followYouEverywhere")) {
          if (lowerLyric.includes("wherever") || lowerLyric.includes("follow")) {
            setHighlightedLine(7)
          } else if (lowerLyric.includes("tomorrow")) {
            setHighlightedLine(11)
          } else if (lowerLyric.includes("love you every night") || lowerLyric.includes("last night")) {
            setHighlightedLine(21)
          }
        } else if (codeSnippet.includes("lostInWords")) {
          if (lowerLyric.includes("words") || lowerLyric.includes("scream")) {
            setHighlightedLine(7)
          } else if (lowerLyric.includes("don't even wanna")) {
            setHighlightedLine(13)
          } else if (lowerLyric.includes("what you mean to me")) {
            setHighlightedLine(20)
          } else if (lowerLyric.includes("war worth fighting for")) {
            setHighlightedLine(24)
          }
        } else if (codeSnippet.includes("expressWithoutWords")) {
          // Vocalizing section - highlight multiple lines
          const vocalizeLines = [4, 12, 22, 33]
          const currentIndex = vocalizeLines.indexOf(highlightedLine)
          const nextIndex = (currentIndex + 1) % vocalizeLines.length
          setHighlightedLine(vocalizeLines[nextIndex])
        } else if (codeSnippet.includes("musicalInterlude")) {
          // Bridge section - highlight building anticipation
          const bridgeLines = [6, 10, 16, 24, 34]
          const currentIndex = bridgeLines.indexOf(highlightedLine)
          const nextIndex = (currentIndex + 1) % bridgeLines.length
          setHighlightedLine(bridgeLines[nextIndex])
        } else {
          // Default verse snippet
          if (lowerLyric.includes("dream") || lowerLyric.includes("woke up")) {
            setHighlightedLine(6)
          } else if (lowerLyric.includes("wherever") || lowerLyric.includes("follow")) {
            setHighlightedLine(15)
          } else if (lowerLyric.includes("love you every night") || lowerLyric.includes("last night")) {
            setHighlightedLine(22)
          } else {
            // Cycle through important lines
            const defaultLines = [6, 15, 22, 34]
            const currentIndex = defaultLines.indexOf(highlightedLine)
            const nextIndex = (currentIndex + 1) % defaultLines.length
            setHighlightedLine(defaultLines[nextIndex])
          }
        }
      } else if (codeType === "interlude") {
        // For interlude, highlight specific sections based on lyric content
        if (lowerLyric.includes("next to you")) {
          setHighlightedLine(27)
        } else {
          const interludeLines = [4, 12, 27, 32, 46, 51]
          const currentIndex = interludeLines.indexOf(highlightedLine)
          const nextIndex = (currentIndex + 1) % interludeLines.length
          setHighlightedLine(interludeLines[nextIndex])
        }
      }
    })
  }, [currentLyric, codeSnippet, interludeActive, interludeCodeSnippet, codeType, highlightedLine])

  // Position the component based on device type
  const getCodePosition = useCallback(() => {
    if (isMobile) {
      // Avoid overlap with header on mobile
      return "fixed top-32 left-1/2 -translate-x-1/2 max-w-[90%] w-full z-20 pointer-events-none"
    } else {
      return "fixed top-28 left-1/2 -translate-x-1/2 max-w-lg w-full z-20 pointer-events-none"
    }
  }, [isMobile])

  // Get the container class based on current section
  const getContainerClass = useCallback(() => {
    const baseClass = "code-visualizer rounded-xl overflow-hidden backdrop-blur-md border border-gray-800/50"
    
    if (isGlitching) {
      return `${baseClass} glitch`
    }
    
    if (climaxMode) {
      return `${baseClass} bg-black/50 border-primary-500/50`
    }
    
    if (interludeActive) {
      return `${baseClass} bg-black/50 border-secondary-500/50`
    }
    
    if (isChorus) {
      return `${baseClass} bg-black/45 border-primary-800/50`
    }
    
    if (isVocalizing) {
      return `${baseClass} bg-black/40 border-blue-500/30`
    }
    
    if (isBridge) {
      return `${baseClass} bg-black/40 border-yellow-800/30`
    }
    
    return `${baseClass} bg-black/40`
  }, [isGlitching, climaxMode, interludeActive, isChorus, isVocalizing, isBridge])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isPlaying ? 1 : 0.8 }}
      transition={{ duration: 0.5 }}
      className={getCodePosition()}
      style={{
        maxHeight: isMobile ? "35vh" : "40vh",
        willChange: "transform, opacity",
      }}
    >
      <AnimatePresence mode="wait">
        {codeVisible && (
          <motion.div
            ref={containerRef}
            className={getContainerClass()}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
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
                  {climaxMode ? "DieWithASmile.final.js" : 
                   isChorus ? "DieWithASmile.chorus.js" : 
                   interludeActive ? "DieWithASmile.interlude.js" : 
                   isBridge ? "DieWithASmile.bridge.js" :
                   "DieWithASmile.verse.js"}
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
                className="overflow-auto rounded-md relative custom-scrollbar"
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
                            backgroundColor: isHighlighted ? 
                              (climaxMode ? "rgba(227, 74, 123, 0.3)" : 
                               isChorus ? "rgba(227, 74, 123, 0.2)" : 
                               interludeActive ? "rgba(123, 58, 237, 0.2)" :
                               isVocalizing ? "rgba(59, 130, 246, 0.2)" :
                               isBridge ? "rgba(234, 179, 8, 0.15)" :
                               "rgba(123, 58, 237, 0.15)") : "",
                            display: "block",
                            padding: "0 1rem",
                            borderRadius: isHighlighted ? "4px" : "0",
                            transition: "all 0.2s ease",
                            borderLeft: isHighlighted ? 
                              (climaxMode ? "2px solid #e34a7b" : 
                               isChorus ? "2px solid #e34a7b" : 
                               interludeActive ? "2px solid #7c3aed" :
                               isVocalizing ? "2px solid #3b82f6" :
                               isBridge ? "2px solid #eab308" :
                               "2px solid #7c3aed") : "",
                          },
                        }
                      }}
                    >
                      {typewriterText}
                    </SyntaxHighlighter>
                    <motion.span 
                      className="typewriter-cursor absolute bottom-4 right-4 opacity-70"
                      animate={{ opacity: [0.7, 0, 0.7] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    >
                      |
                    </motion.span>
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
                          backgroundColor: isHighlighted ? 
                            (climaxMode ? "rgba(227, 74, 123, 0.3)" : 
                             isChorus ? "rgba(227, 74, 123, 0.2)" : 
                             interludeActive ? "rgba(123, 58, 237, 0.2)" :
                             isVocalizing ? "rgba(59, 130, 246, 0.2)" :
                             isBridge ? "rgba(234, 179, 8, 0.15)" :
                             "rgba(123, 58, 237, 0.15)") : "",
                          display: "block",
                          padding: "0 1rem",
                          borderRadius: isHighlighted ? "4px" : "0",
                          transition: "all 0.2s ease",
                          borderLeft: isHighlighted ? 
                            (climaxMode ? "2px solid #e34a7b" : 
                             isChorus ? "2px solid #e34a7b" : 
                             interludeActive ? "2px solid #7c3aed" :
                             isVocalizing ? "2px solid #3b82f6" :
                             isBridge ? "2px solid #eab308" :
                             "2px solid #7c3aed") : "",
                        },
                      }
                    }}
                  >
                    {codeSnippet || (codeType === "chorus" ? chorusCodeSnippet : verseCodeSnippets.default)}
                  </SyntaxHighlighter>
                )}
              </div>

              {/* Section indicators */}
              {climaxMode && (
                <motion.div 
                  className="absolute top-2 right-2 px-2 py-0.5 bg-primary-500/40 rounded-full text-[10px] flex items-center"
                  animate={{ 
                    opacity: [0.7, 1, 0.7],
                    scale: [1, 1.05, 1] 
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 1.5 
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-400 animate-pulse mr-1.5"></span>
                  <span className="text-primary-200">CLIMAX</span>
                </motion.div>
              )}

              {interludeActive && !climaxMode && (
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-secondary-500/30 rounded-full text-[10px] flex items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-secondary-400 animate-pulse mr-1.5"></span>
                  <span className="text-secondary-200">INTERLUDE</span>
                </div>
              )}

              {isChorus && !interludeActive && !climaxMode && (
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-primary-500/30 rounded-full text-[10px] flex items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-400 animate-pulse mr-1.5"></span>
                  <span className="text-primary-200">CHORUS</span>
                </div>
              )}
              
              {isVocalizing && !isChorus && !interludeActive && !climaxMode && (
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-blue-500/30 rounded-full text-[10px] flex items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse mr-1.5"></span>
                  <span className="text-blue-200">VOCALIZING</span>
                </div>
              )}
              
              {isBridge && !isChorus && !interludeActive && !climaxMode && !isVocalizing && (
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-yellow-500/20 rounded-full text-[10px] flex items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse mr-1.5"></span>
                  <span className="text-yellow-200">BRIDGE</span>
                </div>
              )}
            </div>
            
            {/* Subtle glow effect for climax mode */}
            {climaxMode && (
              <motion.div 
                className="absolute inset-0 -z-10 pointer-events-none"
                animate={{ opacity: [0.2, 0.3, 0.2] }}
                transition={{ repeat: Infinity, duration: 2 }}
                style={{
                  background: "radial-gradient(circle at center, rgba(227, 74, 123, 0.2) 0%, transparent 70%)",
                  filter: "blur(20px)"
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default CodeVisualizer