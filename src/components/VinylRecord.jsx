"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

const VinylRecord = ({ isPlaying, audioLevel = [] }) => {
  const recordRef = useRef(null)
  const armRef = useRef(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [interactionEnabled, setInteractionEnabled] = useState(false)
  const [vinylRaised, setVinylRaised] = useState(false)
  const [vinylInfo, setVinylInfo] = useState({
    title: "Die With A Smile",
    artists: "Bruno Mars & Lady Gaga",
    year: "2024",
    duration: "3:23"
  })
  
  const requestRef = useRef(null)
  const previousTimeRef = useRef(0)
  const animationSpeed = useRef(0.2)

  // Create vinyl grooves
  const grooves = Array.from({ length: 20 }, (_, i) => {
    const size = 90 - i * 4
    return (
      <div
        key={i}
        className="vinyl-groove"
        style={{
          width: `${size}%`,
          height: `${size}%`,
          top: `${(100 - size) / 2}%`,
          left: `${(100 - size) / 2}%`,
        }}
      />
    )
  })

  // Handle record arm animation
  useEffect(() => {
    if (armRef.current) {
      if (isPlaying) {
        armRef.current.classList.add("playing")
      } else {
        armRef.current.classList.remove("playing")
      }
    }
    
    // Add class to record element for animation
    if (recordRef.current) {
      if (isPlaying) {
        recordRef.current.classList.add("playing")
      } else {
        recordRef.current.classList.remove("playing")
      }
    }
    
    // Initialize with animation
    if (!isInitialized && isPlaying) {
      setIsInitialized(true)
    }
    
    // Update animation speed based on audio levels
    if (isPlaying && audioLevel && audioLevel.length > 0) {
      const avgLevel = audioLevel.reduce((sum, val) => sum + val, 0) / audioLevel.length / 255
      animationSpeed.current = 0.2 + avgLevel * 0.1 // Base speed + audio-reactive boost
    } else {
      animationSpeed.current = 0.2 // Base speed when paused
    }
    
    // Enable interaction after a short delay
    const interactionTimer = setTimeout(() => {
      setInteractionEnabled(true)
    }, 1000)
    
    return () => {
      clearTimeout(interactionTimer)
    }
  }, [isPlaying, isInitialized, audioLevel])

  // Animate record rotation
  useEffect(() => {
    // Continuous rotation animation loop
    const animate = (time) => {
      if (previousTimeRef.current === 0) {
        previousTimeRef.current = time
      }
      
      const deltaTime = time - previousTimeRef.current
      previousTimeRef.current = time
      
      if (isPlaying) {
        setRotation(prev => (prev + deltaTime * animationSpeed.current) % 360)
      }
      
      requestRef.current = requestAnimationFrame(animate)
    }
    
    requestRef.current = requestAnimationFrame(animate)
    
    return () => {
      cancelAnimationFrame(requestRef.current)
      previousTimeRef.current = 0
    }
  }, [isPlaying])

  // Handle needle drop effect with sound
  const dropNeedle = () => {
    if (!isPlaying && interactionEnabled) {
      // Create quick needle drop sound effect
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.type = "triangle"
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(220, audioContext.currentTime + 0.2)
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.start()
        oscillator.stop(audioContext.currentTime + 0.3)
      } catch (error) {
        console.error("Cannot create audio effect:", error)
      }
    }
  }
  
  // Handle vinyl raise effect
  const handleRaiseVinyl = () => {
    if (!interactionEnabled) return
    setVinylRaised(prev => !prev)
  }
  
  // Create particles based on audio level
  const renderAudioParticles = () => {
    if (!isPlaying || !audioLevel || audioLevel.length === 0) return null
    
    // Sample a few data points from the audio level data
    const particleCount = 5
    const step = Math.floor(audioLevel.length / particleCount)
    
    return Array.from({ length: particleCount }).map((_, i) => {
      const dataIndex = i * step
      const level = audioLevel[dataIndex] || 0
      const normalizedLevel = level / 255
      
      // Only show particles for significant audio levels
      if (normalizedLevel < 0.4) return null
      
      const size = normalizedLevel * 15 + 5
      const opacity = normalizedLevel * 0.7
      const angle = (rotation + (i * 360 / particleCount)) % 360
      const distance = 160 * (0.8 + normalizedLevel * 0.4)
      const x = Math.cos(angle * Math.PI / 180) * distance
      const y = Math.sin(angle * Math.PI / 180) * distance
      
      return (
        <motion.div
          key={`particle-${i}`}
          className="absolute rounded-full bg-gradient-to-r from-primary-400 to-secondary-500"
          style={{
            width: size,
            height: size,
            left: "50%",
            top: "50%",
            opacity,
            filter: `blur(${normalizedLevel * 4}px)`,
            boxShadow: `0 0 ${normalizedLevel * 10}px 0 rgba(227, 74, 123, 0.8)`,
          }}
          animate={{
            x,
            y,
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            repeatType: "mirror",
          }}
        />
      )
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="record-player perspective-800"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div 
        className="record-base"
        animate={vinylRaised ? { rotateX: 10 } : { rotateX: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <motion.div 
          className="record-platter"
          animate={vinylRaised ? { y: -20, rotateX: 15 } : { y: 0, rotateX: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <motion.div
            ref={recordRef}
            className="vinyl-record"
            style={{ transform: `rotate(${rotation}deg)` }}
            whileHover={{ scale: vinylRaised ? 1.05 : 1.02 }}
            onClick={handleRaiseVinyl}
          >
            <div className="vinyl-grooves">{grooves}</div>
            <motion.div 
              className="record-label"
              animate={isHovered ? { scale: 1.05 } : { scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col items-center justify-center h-full">
                <span className="text-xs font-display text-gradient">{vinylInfo.title}</span>
                <span className="text-[8px] opacity-80 mt-1">{vinylInfo.artists}</span>
                <span className="text-[7px] opacity-60 mt-0.5">{vinylInfo.year}</span>
              </div>
            </motion.div>
            
            {/* Vinyl sheen effect */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div className="vinyl-sheen"></div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div 
          ref={armRef} 
          className="record-arm"
          animate={isPlaying ? { rotate: 0 } : { rotate: -30 }}
          whileHover={interactionEnabled ? { scale: 1.05 } : {}}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          onClick={dropNeedle}
        ></motion.div>
        
        {/* Reflection effects */}
        <div className="absolute top-[10%] left-[20%] w-[30%] h-[5%] bg-white/10 rounded-full blur-sm transform -rotate-45"></div>
        <div className="absolute bottom-[20%] right-[10%] w-[40%] h-[3%] bg-white/5 rounded-full blur-md transform rotate-45"></div>
        
        {/* Audio reactive particles */}
        {renderAudioParticles()}
      </motion.div>
      
      {/* Play/Pause indicator */}
      <AnimatePresence>
        {!isPlaying && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.3 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 rounded-full p-3 z-10"
          >
            <motion.div 
              className="w-8 h-8 text-white flex items-center justify-center"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Status text */}
      <motion.div 
        className="absolute -bottom-8 left-0 right-0 text-center text-sm"
        animate={{
          opacity: isPlaying ? [0.7, 1, 0.7] : 0.8
        }}
        transition={{
          duration: 2,
          repeat: isPlaying ? Infinity : 0,
          repeatType: "mirror"
        }}
      >
        {isPlaying ? (
          <>
            <span className="text-gradient-gold">Now spinning</span>
            <span className="inline-block w-1 h-1 bg-primary-500 rounded-full ml-1 animate-pulse"></span>
            <span className="inline-block w-1 h-1 bg-primary-500 rounded-full ml-1 animate-pulse" style={{ animationDelay: "0.2s" }}></span>
            <span className="inline-block w-1 h-1 bg-primary-500 rounded-full ml-1 animate-pulse" style={{ animationDelay: "0.4s" }}></span>
          </>
        ) : vinylRaised ? (
          "Click vinyl to lower it"
        ) : (
          "Click play to spin"
        )}
      </motion.div>
      
      {/* Vinyl info tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute -bottom-24 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-md p-3 rounded-md text-xs z-20 w-48 text-center"
          >
            <div className="flex items-center justify-center">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-600 rounded-md flex items-center justify-center mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </div>
              <div className="text-left">
                <div className="font-bold text-white">{vinylInfo.title}</div>
                <div className="text-gray-300 text-[10px]">{vinylInfo.artists} · {vinylInfo.duration}</div>
              </div>
            </div>
            
            <div className="mt-2 text-gray-300 text-[10px]">
              Click to {vinylRaised ? "lower" : "raise"} the vinyl
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Designer plate engraving */}
      <div className="absolute bottom-1 right-2 text-[6px] text-white/20 italic font-elegant tracking-widest transform rotate-[-5deg]">
        Die with a smile
      </div>
    </motion.div>
  )
}

export default VinylRecord