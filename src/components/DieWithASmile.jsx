"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence, useSpring } from "framer-motion"
import { lyrics, isChorusLine } from "../lib/utils"
import confetti from "canvas-confetti"

import ErrorBoundary from "./ErrorBoundary"
import Background from "./Background"
import AudioPlayer from "./AudioPlayer"
import LyricsVisualizer from "./LyricsVisualizer"
import CodeVisualizer from "./CodeVisualizer"

// Accurate timestamps for song sections based on user's specification
const SECTIONS = {
  CHORUS: [
    { start: 44.711, end: 53.345 },
    { start: 53.679, end: 62.521 },
    { start: 62.771, end: 67.359 },
    { start: 67.442, end: 71.446 },
    { start: 71.989, end: 79.037 },
    { start: 122.289, end: 130.797 },
    { start: 131.173, end: 133.842 },
    { start: 133.925, end: 140.14 },
    { start: 140.223, end: 142.184 },
    { start: 142.601, end: 144.227 },
    { start: 144.811, end: 148.857 },
    { start: 149.566, end: 155.697 },
    { start: 158.116, end: 160.786 },
    { start: 162.954, end: 165.832 },
    { start: 167.459, end: 170.42 },
    { start: 190.482, end: 197.28 },
    { start: 199.574, end: 206.957 },
    { start: 208.667, end: 212.712 },
    { start: 213.338, end: 217.259 },
    { start: 217.968, end: 225.058 },
    { start: 226.685, end: 233.358 },
    { start: 239.239, end: 242.909 },
  ],
  SLOW: [
    { start: 190.482, end: 212.712 }
  ],
  CLIMAX: [
    { start: 213.338, end: 242.909 }
  ],
  INTERLUDE: [
    { start: 171.171, end: 190.0 }
  ],
  VOCALIZING: [
    { start: 235.944, end: 242.909 }
  ]
}

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
  const [showConfetti, setShowConfetti] = useState(false)
  const [chorusTransition, setChorusTransition] = useState(false)
  const [chorusCount, setChorusCount] = useState(0)
  const [isClimax, setIsClimax] = useState(false)
  const [isSlowSection, setIsSlowSection] = useState(false)
  const [isInterlude, setIsInterlude] = useState(false)
  const [isVocalizing, setIsVocalizing] = useState(false)
  const [activeSection, setActiveSection] = useState("verse")
  const [audioIntensity, setAudioIntensity] = useState(1)
  const [particleEffects, setParticleEffects] = useState(false)

  // Refs for performance optimization
  const lastActiveIndexRef = useRef(-1)
  const audioLevelTimestampRef = useRef(0)
  const animationFrameRef = useRef(null)
  const isMountedRef = useRef(true)
  const throttledAudioLevel = useRef([])
  const resizeTimeoutRef = useRef(null)
  const confettiCanvasRef = useRef(null)
  const confettiInstanceRef = useRef(null)
  const lastChorusTimeRef = useRef(0)
  const prevIsChorusRef = useRef(false)
  const confettiTimeoutRef = useRef(null)
  const sectionChangeTimeRef = useRef(0)
  const prevSectionRef = useRef("verse")

  // Check for mobile devices with debounce
  useEffect(() => {
    // Set mounted flag
    isMountedRef.current = true
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()

    // Debounced resize handler
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
      resizeTimeoutRef.current = setTimeout(checkMobile, 200)
    }

    window.addEventListener("resize", handleResize)

    return () => {
      isMountedRef.current = false
      window.removeEventListener("resize", handleResize)
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
    }
  }, [])

  // Initialize confetti
  useEffect(() => {
    // Create a canvas for confetti
    const canvas = document.createElement("canvas")
    canvas.className = "fixed inset-0 pointer-events-none z-30"
    canvas.style.width = "100%"
    canvas.style.height = "100%"
    document.body.appendChild(canvas)

    confettiCanvasRef.current = canvas
    confettiInstanceRef.current = confetti.create(canvas, {
      resize: true,
      useWorker: true,
    })

    return () => {
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas)
      }
      
      if (confettiTimeoutRef.current) {
        clearTimeout(confettiTimeoutRef.current);
        clearInterval(confettiTimeoutRef.current);
        confettiTimeoutRef.current = null;
      }
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

  // Check if current time is in a specific section
  const isInSection = useCallback((time, sectionType) => {
    return SECTIONS[sectionType].some(({ start, end }) => time >= start && time <= end)
  }, [])

  // Process audio levels for visual effects
  useEffect(() => {
    if (!audioLevel || audioLevel.length === 0) return;

    // Only process a few times per second for performance
    const now = Date.now();
    if (now - lastActiveIndexRef.current < 100) return;
    lastActiveIndexRef.current = now;

    // Process bass frequencies
    const bassRange = Math.min(8, audioLevel.length); 
    let bassSum = 0;
    
    for (let i = 0; i < bassRange; i++) {
      bassSum += audioLevel[i] || 0;
    }
    
    const bassAvg = bassSum / bassRange / 255;
    
    // Update intensity based on audio level
    setAudioIntensity(prev => {
      const target = 1 + bassAvg * 2;
      return prev * 0.7 + target * 0.3; // Smooth transition
    });

    // Trigger particle effects on heavy beats
    if (bassAvg > 0.6 && Date.now() - sectionChangeTimeRef.current > 500) {
      setParticleEffects(true);
      setTimeout(() => setParticleEffects(false), 300);
    }
  }, [audioLevel]);

  // Trigger appropriate confetti based on section
  const triggerConfetti = useCallback((section) => {
    if (!confettiInstanceRef.current || !isMountedRef.current) return

    const now = Date.now()
    // Limit how often we trigger confetti (at least 3 seconds between)
    if (now - lastChorusTimeRef.current < 3000) return
    lastChorusTimeRef.current = now

    if (section === "chorus") {
      // Different confetti patterns based on chorus count
      if (chorusCount % 3 === 0) {
        // First chorus - celebratory burst
        confettiInstanceRef.current({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#e34a7b", "#7c3aed", "#ffffff"],
        })
      } else if (chorusCount % 3 === 1) {
        // Second chorus - side bursts
        confettiInstanceRef.current({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.65 },
          colors: ["#e34a7b", "#7c3aed", "#ffffff"],
        })

        setTimeout(() => {
          if (confettiInstanceRef.current && isMountedRef.current) {
            confettiInstanceRef.current({
              particleCount: 50,
              angle: 120,
              spread: 55,
              origin: { x: 1, y: 0.65 },
              colors: ["#e34a7b", "#7c3aed", "#ffffff"],
            })
          }
        }, 300)
      } else {
        // Third chorus - firework effect
        const duration = 3 * 1000
        const animationEnd = Date.now() + duration
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

        const interval = setInterval(() => {
          const timeLeft = animationEnd - Date.now()

          if (timeLeft <= 0 || !isMountedRef.current) {
            clearInterval(interval)
            return
          }

          const particleCount = 50 * (timeLeft / duration)

          // Since particles fall down, start a bit higher than random
          confettiInstanceRef.current({
            ...defaults,
            particleCount,
            origin: { x: Math.random(), y: Math.random() - 0.2 },
            colors: ["#e34a7b", "#ff6b9d", "#7c3aed", "#ffffff"],
          })
        }, 250)
        
        // Store interval for cleanup
        confettiTimeoutRef.current = interval
      }
    } else if (section === "slow") {
      // Gentle confetti for slow section
      confettiInstanceRef.current({
        particleCount: 50,
        spread: 120,
        angle: 60,
        origin: { x: 0, y: 0.65 },
        colors: ["#e34a7b", "#7c3aed", "#ffffff"],
        gravity: 0.5,
        scalar: 0.8,
      })

      setTimeout(() => {
        if (confettiInstanceRef.current && isMountedRef.current) {
          confettiInstanceRef.current({
            particleCount: 50,
            spread: 120,
            angle: 120,
            origin: { x: 1, y: 0.65 },
            colors: ["#e34a7b", "#7c3aed", "#ffffff"],
            gravity: 0.5,
            scalar: 0.8,
          })
        }
      }, 300)
    } else if (section === "climax") {
      // Intense firework effect for climax
      const duration = 3 * 1000
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now()

        if (timeLeft <= 0 || !isMountedRef.current) {
          clearInterval(interval)
          return
        }

        const particleCount = 50 * (timeLeft / duration)

        // Since particles fall down, start a bit higher than random
        confettiInstanceRef.current({
          ...defaults,
          particleCount,
          origin: { x: Math.random(), y: Math.random() - 0.2 },
          colors: ["#e34a7b", "#ff6b9d", "#7c3aed", "#ffffff"],
        })
      }, 250)
      
      // Store interval for cleanup
      confettiTimeoutRef.current = interval
    } else if (section === "interlude") {
      // Subtle sparkles for interlude
      confettiInstanceRef.current({
        particleCount: 30,
        spread: 100,
        origin: { y: 0.5 },
        colors: ["#7c3aed", "#3b82f6", "#ffffff"],
        gravity: 0.3,
        scalar: 0.7,
        drift: 1,
        ticks: 300
      })
    }
  }, [chorusCount])

  // Find active lyric based on current time - optimized with binary search
  const findActiveLyric = useCallback((time) => {
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

  // Handle time update from audio player - this is the core function
  // that updates all section states
  const handleTimeUpdate = useCallback(
    (time) => {
      if (!isMountedRef.current) return

      // Update current time immediately to reflect in UI
      setCurrentTime(time)

      // Throttle section detection to improve performance
      const now = Date.now()
      if (now - sectionChangeTimeRef.current < 100) {
        // Find lyric even during throttle period
        const activeLyricData = findActiveLyric(time)
        if (activeLyricData && activeLyricData.index !== lastActiveIndexRef.current) {
          lastActiveIndexRef.current = activeLyricData.index
          setActiveLyric(activeLyricData.text)
        }
        return
      }
      sectionChangeTimeRef.current = now

      // Check for all section types based on precise timestamps
      const inChorus = isInSection(time, "CHORUS")
      const inSlow = isInSection(time, "SLOW")
      const inClimax = isInSection(time, "CLIMAX")
      const inInterlude = isInSection(time, "INTERLUDE")
      const inVocalizing = isInSection(time, "VOCALIZING")
      
      // Determine active section for UI display
      let newActiveSection = "verse"
      if (inClimax) newActiveSection = "climax"
      else if (inChorus) newActiveSection = "chorus"
      else if (inSlow) newActiveSection = "slow"
      else if (inInterlude) newActiveSection = "interlude"
      else if (inVocalizing) newActiveSection = "vocalizing"
      
      // Only trigger section change effects when section changes
      if (newActiveSection !== prevSectionRef.current) {
        prevSectionRef.current = newActiveSection
        setActiveSection(newActiveSection)
        
        // Trigger appropriate effect for the new section
        if (isPlaying) {
          if (inChorus && !isChorus) {
            setChorusTransition(true)
            setChorusCount(prev => prev + 1)
            triggerConfetti("chorus")
            
            setTimeout(() => {
              if (isMountedRef.current) setChorusTransition(false)
            }, 2000)
          }
          else if (inSlow && !isSlowSection) triggerConfetti("slow")
          else if (inClimax && !isClimax) triggerConfetti("climax")
          else if (inInterlude && !isInterlude) triggerConfetti("interlude")
        }
      }
      
      // Update section states if changed
      if (inChorus !== isChorus) setIsChorus(inChorus)
      if (inSlow !== isSlowSection) setIsSlowSection(inSlow)
      if (inClimax !== isClimax) setIsClimax(inClimax)
      if (inInterlude !== isInterlude) setIsInterlude(inInterlude)
      if (inVocalizing !== isVocalizing) setIsVocalizing(inVocalizing)

      // Find current lyric and update if needed
      const activeLyricData = findActiveLyric(time)
      if (activeLyricData && activeLyricData.index !== lastActiveIndexRef.current) {
        lastActiveIndexRef.current = activeLyricData.index
        setActiveLyric(activeLyricData.text)
      }
    },
    [findActiveLyric, isChorus, isSlowSection, isClimax, isInterlude, isVocalizing, 
     isPlaying, isInSection, triggerConfetti]
  )

  // Handle play state change
  const handlePlayStateChange = useCallback((playing) => {
    if (!isMountedRef.current) return
    setIsPlaying(playing)
  }, [])

  // Handle audio level update with throttling for better performance
  const handleAudioLevelUpdate = useCallback((levels) => {
    if (!isMountedRef.current) return

    // Store the latest audio levels, but only update state periodically
    throttledAudioLevel.current = levels

    const now = performance.now()
    // Only process audio data every 50ms to reduce load
    if (now - audioLevelTimestampRef.current > 50) {
      audioLevelTimestampRef.current = now

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        if (isMountedRef.current) {
          setAudioLevel(throttledAudioLevel.current)
        }
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

  // Handle background load
  const handleBackgroundLoad = useCallback(() => {
    setBackgroundLoaded(true)
  }, [])

  // Create a memoized subset of audio levels for the background
  // This helps reduce memory usage and processing for the WebGL context
  const optimizedAudioLevels = useCallback(() => {
    if (!audioLevel || audioLevel.length === 0) return []

    // Only send a subset of the audio data to reduce processing
    const stride = Math.ceil(audioLevel.length / 16) // Only use 16 data points
    const result = []

    for (let i = 0; i < audioLevel.length; i += stride) {
      result.push(audioLevel[i])
    }

    return result
  }, [audioLevel])

  // Special chorus background effect
  const ChorusBackground = useCallback(() => {
    if (!isChorus) return null

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 z-[-5] pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, rgba(227, 74, 123, 0.2) 0%, rgba(123, 58, 237, 0.1) 50%, transparent 70%)`,
          filter: "blur(40px)",
        }}
      />
    )
  }, [isChorus])

  // Chorus transition effect - enhanced with more dynamic motion
  const ChorusTransitionEffect = useCallback(() => {
    if (!chorusTransition) return null

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8, scale: [1, 1.2, 0] }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.5 }}
        className="fixed inset-0 z-30 pointer-events-none flex items-center justify-center"
      >
        <div className="relative w-full h-full">
          {/* Outer rings */}
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 2, 2.5], 
              opacity: [0, 0.7, 0]
            }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-2 border-primary-500/40"
          />
          
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1.5, 2], 
              opacity: [0, 0.5, 0]
            }}
            transition={{ duration: 1.8, ease: "easeOut", delay: 0.2 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-2 border-secondary-500/40"
          />

          {/* Central burst */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.5, 0] }}
            transition={{ duration: 1.2 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full"
            style={{
              background: `radial-gradient(circle, rgba(227, 74, 123, 0.7) 0%, rgba(227, 74, 123, 0) 70%)`,
              filter: "blur(10px)",
            }}
          />

          {/* Light rays */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0] }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at center, transparent 30%, rgba(227, 74, 123, 0.3) 70%)`,
            }}
          />
          
          {/* Particles */}
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              className="absolute top-1/2 left-1/2 w-1 h-1 rounded-full bg-primary-400"
              initial={{ x: 0, y: 0, opacity: 0 }}
              animate={{ 
                x: (Math.random() - 0.5) * 400,
                y: (Math.random() - 0.5) * 400,
                opacity: [0, 1, 0],
                scale: [1, 2, 0]
              }}
              transition={{ 
                duration: 1 + Math.random(),
                ease: "easeOut" 
              }}
            />
          ))}
        </div>
      </motion.div>
    )
  }, [chorusTransition])

  // Enhanced Slow section effect
  const SlowSectionEffect = useCallback(() => {
    if (!isSlowSection) return null

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1 }}
        className="fixed inset-0 z-[-4] pointer-events-none"
      >
        {/* Slow section background */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at center, rgba(123, 58, 237, 0.1) 0%, rgba(227, 74, 123, 0.05) 50%, transparent 70%)`,
            filter: "blur(30px)",
          }}
        />

        {/* Floating particles - more dynamic and with audio reactivity */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary-400"
          animate={{
            y: [-20, 20],
            x: [-20, 20],
            opacity: [0.2, 0.8 * audioIntensity, 0.2],
            scale: [1, 1.5 * audioIntensity, 1],
          }}
          transition={{
            duration: 5,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          }}
        />

        <motion.div
          className="absolute top-1/3 left-1/4 w-3 h-3 rounded-full bg-secondary-400"
          animate={{
            y: [20, -20],
            x: [20, -20],
            opacity: [0.2, 0.6 * audioIntensity, 0.2],
            scale: [1, 1.3 * audioIntensity, 1],
          }}
          transition={{
            duration: 7,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            delay: 1,
          }}
        />

        <motion.div
          className="absolute top-2/3 left-3/4 w-2 h-2 rounded-full bg-primary-300"
          animate={{
            y: [-30, 30],
            x: [-10, 10],
            opacity: [0.1, 0.5 * audioIntensity, 0.1],
            scale: [1, 1.2 * audioIntensity, 1],
          }}
          transition={{
            duration: 6,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            delay: 2,
          }}
        />
        
        {/* Haze effect */}
        <motion.div 
          className="absolute inset-0 opacity-30"
          animate={{
            opacity: [0.2, 0.4 * audioIntensity, 0.2]
          }}
          transition={{
            duration: 4,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse"
          }}
          style={{
            background: "linear-gradient(to bottom, transparent, rgba(123, 58, 237, 0.05), transparent)",
          }}
        />
      </motion.div>
    )
  }, [isSlowSection, audioIntensity])

  // Enhanced Climax section effect with audio reactivity
  const ClimaxEffect = useCallback(() => {
    if (!isClimax) return null

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 z-[-3] pointer-events-none"
      >
        {/* Intense background glow with audio reactivity */}
        <motion.div
          className="absolute inset-0"
          animate={{
            opacity: [0.3, 0.6 * audioIntensity, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          }}
          style={{
            background: `radial-gradient(circle at center, rgba(227, 74, 123, 0.3) 0%, rgba(123, 58, 237, 0.2) 50%, transparent 70%)`,
            filter: "blur(40px)",
          }}
        />

        {/* Light beams - reacting to audio */}
        <motion.div
          className="absolute h-[2px] left-0 right-0 bg-gradient-to-r from-transparent via-primary-500/60 to-transparent"
          style={{ top: "30%" }}
          animate={{
            opacity: [0.2, 0.8 * audioIntensity, 0.2],
            scaleY: [1, 5 * audioIntensity, 1],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 3,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          }}
        />

        <motion.div
          className="absolute h-[2px] left-0 right-0 bg-gradient-to-r from-transparent via-secondary-500/60 to-transparent"
          style={{ top: "70%" }}
          animate={{
            opacity: [0.2, 0.8 * audioIntensity, 0.2],
            scaleY: [1, 5 * audioIntensity, 1],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 3,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            delay: 1,
          }}
        />

        {/* Vertical beams */}
        <motion.div
          className="absolute w-[2px] top-0 bottom-0 bg-gradient-to-b from-transparent via-primary-500/60 to-transparent"
          style={{ left: "20%" }}
          animate={{
            opacity: [0.2, 0.8 * audioIntensity, 0.2],
            scaleX: [1, 5 * audioIntensity, 1],
            x: [0, 10, 0],
          }}
          transition={{
            duration: 4,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            delay: 0.5,
          }}
        />

        <motion.div
          className="absolute w-[2px] top-0 bottom-0 bg-gradient-to-b from-transparent via-secondary-500/60 to-transparent"
          style={{ right: "20%" }}
          animate={{
            opacity: [0.2, 0.8 * audioIntensity, 0.2],
            scaleX: [1, 5 * audioIntensity, 1],
            x: [0, -10, 0],
          }}
          transition={{
            duration: 4,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            delay: 1.5,
          }}
        />

        {/* Rotating light rays */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200vw] h-[200vw] chorus-rays"
          animate={{
            rotate: 360,
            scale: [1, 1.05 * audioIntensity, 1]
          }}
          transition={{
            rotate: {
              duration: 20,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            },
            scale: {
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse"
            }
          }}
        />
        
        {/* Extra intensity particles when audio peaks */}
        {particleEffects && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.div
                key={`intensity-particle-${i}`}
                className="absolute w-1 h-1 bg-white rounded-full"
                initial={{ 
                  x: 0, 
                  y: 0,
                  scale: 1,
                  opacity: 1 
                }}
                animate={{ 
                  x: (Math.random() - 0.5) * 300,
                  y: (Math.random() - 0.5) * 300,
                  scale: [1, 2 * audioIntensity],
                  opacity: [1, 0]
                }}
                transition={{ duration: 1 }}
              />
            ))}
          </motion.div>
        )}
      </motion.div>
    )
  }, [isClimax, audioIntensity, particleEffects])
  
  // New effect for interlude/vocalizing sections
  const InterludeEffect = useCallback(() => {
    if (!isInterlude && !isVocalizing) return null
    
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8 }}
        className="fixed inset-0 z-[-4] pointer-events-none overflow-hidden"
      >
        {/* Dreamy background atmosphere */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at center, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 50%, transparent 70%)`,
            filter: "blur(40px)",
          }}
        />
        
        {/* Floating musical notes or symbols */}
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={`note-${i}`}
            className="absolute opacity-60 text-blue-300 text-2xl"
            initial={{ 
              x: `${Math.random() * 100}%`, 
              y: `${Math.random() * 100}%`,
              rotate: Math.random() * 180 - 90
            }}
            animate={{ 
              y: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
              rotate: [Math.random() * 180 - 90, Math.random() * 180 - 90],
              opacity: [0.4, 0.7 * audioIntensity, 0.4]
            }}
            transition={{ 
              duration: 8 + Math.random() * 4,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse"
            }}
          >
            {["♪", "♫", "♬", "♩", "♭", "♮"][i % 6]}
          </motion.div>
        ))}
        
        {/* Ethereal waves */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-40"
          animate={{
            y: [0, -10 * audioIntensity, 0],
            opacity: [0.2, 0.5 * audioIntensity, 0.2]
          }}
          transition={{
            duration: 4,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse"
          }}
          style={{
            background: "linear-gradient(to top, rgba(59, 130, 246, 0.1), transparent)"
          }}
        />
        
        {/* Echo rings on audio beats */}
        {particleEffects && (
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border border-blue-300/30"
            initial={{ scale: 0.8, opacity: 0.6 }}
            animate={{ 
              scale: [0.8, 1.5 * audioIntensity],
              opacity: [0.6, 0]
            }}
            transition={{ duration: 1.5 }}
          />
        )}
      </motion.div>
    )
  }, [isInterlude, isVocalizing, audioIntensity, particleEffects])

  return (
    <motion.div
      className="relative min-h-screen overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      style={{ transform: "translateZ(0)" }}
    >
      {/* Background */}
      <div className="fixed inset-0 z-[-1]">
        <ErrorBoundary>
          <Background
            isPlaying={isPlaying}
            audioLevel={optimizedAudioLevels()}
            currentLyric={activeLyric}
            isChorus={isChorus}
            isMobile={isMobile}
            onLoad={handleBackgroundLoad}
            recoveryMode={isMobile} /* Use recovery mode on mobile for better performance */
          />
        </ErrorBoundary>
      </div>

      {/* Special effects for different sections */}
      <AnimatePresence>{isChorus && <ChorusBackground />}</AnimatePresence>
      <AnimatePresence>{isSlowSection && <SlowSectionEffect />}</AnimatePresence>
      <AnimatePresence>{isClimax && <ClimaxEffect />}</AnimatePresence>
      <AnimatePresence>{(isInterlude || isVocalizing) && <InterludeEffect />}</AnimatePresence>

      {/* Chorus transition effect */}
      <AnimatePresence>{chorusTransition && <ChorusTransitionEffect />}</AnimatePresence>

      {/* Header with enhanced text glow effects */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="fixed top-0 left-0 right-0 z-40 pt-8 pb-4 px-6 text-center bg-gradient-to-b from-black/80 to-transparent"
      >
        <motion.h1 
          className="text-4xl md:text-5xl lg:text-6xl font-bold mb-1 tracking-tight bg-gradient-to-r from-white via-primary-300 to-secondary-300 text-transparent bg-clip-text"
          animate={{
            textShadow: isChorus || isClimax 
              ? ["0 0 10px rgba(227, 74, 123, 0.3)", "0 0 20px rgba(227, 74, 123, 0.5)", "0 0 10px rgba(227, 74, 123, 0.3)"]
              : "none"
          }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse"
          }}
        >
          Die With A Smile
        </motion.h1>
        <p className="text-lg md:text-xl italic bg-gradient-to-r from-white/80 to-white/60 text-transparent bg-clip-text">
          Bruno Mars & Lady Gaga
        </p>
      </motion.header>

      {/* Lyrics Visualizer - Center of screen */}
      <ErrorBoundary>
        <LyricsVisualizer 
          currentTime={currentTime} 
          isPlaying={isPlaying} 
          audioLevel={audioLevel} 
          isMobile={isMobile}
        />
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
        animate={{ opacity: 1, y: 0 }}
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

      {/* Enhanced section indicator with audio reactivity */}
      {isPlaying && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: 0.7, 
            y: 0,
            scale: audioIntensity > 1.3 ? [1, 1.05, 1] : 1
          }}
          transition={{ 
            duration: 0.3,
            scale: {
              duration: 0.2,
              repeat: audioIntensity > 1.3 ? Number.POSITIVE_INFINITY : 0,
              repeatType: "reverse"
            }
          }}
          className="fixed bottom-4 left-4 z-30 pointer-events-none"
        >
          <div
            className={`px-3 py-1 rounded-full backdrop-blur-sm text-xs
            ${
              isClimax
                ? "bg-primary-600/40 text-primary-200"
                : isChorus
                  ? "bg-primary-500/30 text-primary-300"
                  : isSlowSection
                    ? "bg-secondary-500/30 text-secondary-300"
                    : isInterlude || isVocalizing
                      ? "bg-blue-500/30 text-blue-300"
                      : "bg-gray-800/30 text-gray-300"
            }`}
          >
            {isClimax ? (
              <span className="flex items-center">
                <span className="inline-block w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse mr-1.5"></span>
                CLIMAX
              </span>
            ) : isChorus ? (
              <span className="flex items-center">
                <span className="inline-block w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse mr-1.5"></span>
                CHORUS
              </span>
            ) : isSlowSection ? (
              <span className="flex items-center">
                <span className="inline-block w-1.5 h-1.5 bg-secondary-400 rounded-full animate-pulse mr-1.5"></span>
                SLOW SECTION
              </span>
            ) : isVocalizing ? (
              <span className="flex items-center">
                <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse mr-1.5"></span>
                VOCALIZING
              </span>
            ) : isInterlude ? (
              <span className="flex items-center">
                <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse mr-1.5"></span>
                INTERLUDE
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

      {/* Audio intensity visualizer (hidden but useful for debugging) */}
      {/* <div className="fixed bottom-16 left-4 z-30 text-xs text-white/60">
        Audio: {audioIntensity.toFixed(2)}
      </div> */}

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