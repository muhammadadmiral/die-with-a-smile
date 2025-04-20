import { useEffect, useRef, useState } from "react"
import { debounce } from "../lib/utils"

const Background = ({ isPlaying, audioLevel = [], currentLyric, isChorus }) => {
  const canvasRef = useRef(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isMoving, setIsMoving] = useState(false)
  const starsRef = useRef([])
  const particlesRef = useRef([])
  const lastRenderTimeRef = useRef(0)
  const requestRef = useRef(null)
  const canvasContextRef = useRef(null)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  const pulseEffectRef = useRef(0)
  const starFieldOpacityRef = useRef(1)
  const glowIntensityRef = useRef({ current: 0.5, target: 0.5 })
  const backgroundHueRef = useRef(280) // Initial purple-ish hue
  const [mobileMode, setMobileMode] = useState(false)
  const isMountedRef = useRef(true)

  // Track mouse movement for interactive effects
  useEffect(() => {
    const handleMouseMove = debounce((e) => {
      if (!isMountedRef.current) return
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      })
      setIsMoving(true)

      // Reset moving state after a short delay
      setTimeout(() => {
        if (isMountedRef.current) {
          setIsMoving(false)
        }
      }, 100)
    }, 50)

    window.addEventListener("mousemove", handleMouseMove)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!isMountedRef.current) return
      const width = window.innerWidth
      const height = window.innerHeight

      setWindowSize({
        width,
        height,
      })

      // Set mobile mode for responsive handling
      setMobileMode(width < 768)
    }

    handleResize() // Initialize on mount

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  // Initialize canvas and stars
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d", { alpha: true })
    canvasContextRef.current = ctx

    // Set canvas size to window size
    const resizeCanvas = () => {
      if (!canvas || !isMountedRef.current) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()

    // Initialize stars - density based on viewport size
    const initStars = () => {
      if (!canvas || !isMountedRef.current) return
      const starDensity = mobileMode ? 0.00012 : 0.00018 // Increased density
      const starCount = Math.floor(canvas.width * canvas.height * starDensity)

      const stars = []
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5, // Slightly larger stars
          speed: Math.random() * 0.05 + 0.01, // Faster movement
          brightness: Math.random() * 0.7 + 0.3,
          pulse: Math.random() * 0.02 + 0.01,
          pulseDelta: Math.random() * 0.005 + 0.002,
          hue: Math.random() * 60 + backgroundHueRef.current, // Based on current background hue
          opacity: Math.random() * 0.5 + 0.5,
          twinkle: Math.random() > 0.5, // More stars twinkle
          twinkleSpeed: Math.random() * 0.1 + 0.05,
        })
      }

      starsRef.current = stars
    }

    // Initialize particles - more for visual impact
    const initParticles = () => {
      if (!canvas || !isMountedRef.current) return
      const particleDensity = mobileMode ? 0.00003 : 0.00005 // Increased density
      const particleCount = Math.floor(canvas.width * canvas.height * particleDensity)

      const particles = []
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 4 + 1, // Larger particles
          speed: Math.random() * 0.3 + 0.1, // Faster movement
          directionX: Math.random() * 2 - 1,
          directionY: Math.random() * 2 - 1,
          hue: Math.random() * 60 + backgroundHueRef.current,
          opacity: Math.random() * 0.3 + 0.1, // More visible
          decay: Math.random() * 0.01 + 0.005,
        })
      }

      particlesRef.current = particles
    }

    // Set up canvas and initialize elements
    const resizeHandler = () => {
      resizeCanvas()
      initStars()
      initParticles()
    }

    window.addEventListener("resize", resizeHandler)

    initStars()
    initParticles()

    return () => {
      isMountedRef.current = false
      window.removeEventListener("resize", resizeHandler)

      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
        requestRef.current = null
      }
    }
  }, [mobileMode])

  // Update background hue and glow based on chorus
  useEffect(() => {
    if (isChorus) {
      // Shift towards pink/red for chorus
      backgroundHueRef.current = 320
      glowIntensityRef.current.target = 0.8
    } else {
      // Shift back towards purple for verses
      backgroundHueRef.current = 280
      glowIntensityRef.current.target = 0.5
    }
  }, [isChorus])

  // Update star field opacity based on playing state
  useEffect(() => {
    // Brighter stars when playing
    starFieldOpacityRef.current = isPlaying ? 1 : 0.7
  }, [isPlaying])

  // Main animation loop
  useEffect(() => {
    if (!canvasRef.current || !canvasContextRef.current) return

    const ctx = canvasContextRef.current

    // Animate function
    const animate = (timestamp) => {
      if (!isMountedRef.current || !canvasRef.current) {
        if (requestRef.current) {
          cancelAnimationFrame(requestRef.current)
          requestRef.current = null
        }
        return
      }

      // Limit frame rate for performance
      if (timestamp - lastRenderTimeRef.current < 33) {
        // ~30fps
        requestRef.current = requestAnimationFrame(animate)
        return
      }

      lastRenderTimeRef.current = timestamp

      // Clear canvas with slight transparency for trailing effect
      ctx.fillStyle = "rgba(10, 10, 20, 0.2)"
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)

      // Update pulse effect
      pulseEffectRef.current = isPlaying
        ? (pulseEffectRef.current + 0.01) % (Math.PI * 2)
        : (pulseEffectRef.current + 0.005) % (Math.PI * 2)

      const pulseValue = Math.sin(pulseEffectRef.current) * 0.5 + 0.5 // 0 to 1

      // Smooth glow intensity transition
      glowIntensityRef.current.current += (glowIntensityRef.current.target - glowIntensityRef.current.current) * 0.05

      // Get audio reactivity value
      const getAudioReactivity = () => {
        if (!audioLevel || audioLevel.length === 0) return 1

        // Calculate average level, prioritize lower frequencies (bass)
        let bassSum = 0
        let bassCount = 0
        let midSum = 0
        let midCount = 0

        const bassRange = Math.min(audioLevel.length, 20)
        const midRange = Math.min(audioLevel.length, 50)

        for (let i = 0; i < bassRange; i++) {
          bassSum += audioLevel[i]
          bassCount++
        }

        for (let i = bassRange; i < midRange; i++) {
          midSum += audioLevel[i]
          midCount++
        }

        const bassAvg = bassSum / (bassCount || 1) / 255
        const midAvg = midSum / (midCount || 1) / 255

        // Weight bass more heavily
        return 1 + (bassAvg * 1.5 + midAvg * 0.5) // Scale up for more dramatic effect
      }

      const audioReactivity = getAudioReactivity()

      // Draw stars with better performance handling
      const maxStarsToRender = mobileMode ? 300 : 800 // Increased star count
      const starsToRender = Math.min(starsRef.current.length, maxStarsToRender)

      for (let i = 0; i < starsToRender; i++) {
        const star = starsRef.current[i]

        // Update brightness for twinkling effect
        star.brightness += star.pulseDelta

        // Reverse direction at boundaries
        if (star.brightness > 1 || star.brightness < 0.3) {
          star.pulseDelta = -star.pulseDelta
        }

        // Bonus twinkle effect for some stars
        let twinkleFactor = 1
        if (star.twinkle) {
          twinkleFactor = 0.7 + Math.sin(timestamp * star.twinkleSpeed) * 0.3
        }

        // Audio influence
        let audioInfluence = 0
        if (isPlaying && audioLevel.length > 0) {
          // Get audio data sample based on star's x position
          const audioIndex = Math.floor((star.x / canvasRef.current.width) * audioLevel.length)
          const audioValue = audioLevel[audioIndex] || 0

          // Normalize from 0-255 to 0-0.3 (increased effect)
          audioInfluence = (audioValue / 255) * 0.4
        }

        // Mouse influence (subtle)
        let mouseInfluence = 0
        if (isMoving) {
          const dx = mousePosition.x - star.x
          const dy = mousePosition.y - star.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          const mouseRange = 150

          if (distance < mouseRange) {
            // Enhanced effect
            mouseInfluence = (1 - distance / mouseRange) * 0.1
          }
        }

        // Combine all factors
        const finalBrightness = star.brightness * twinkleFactor + audioInfluence + mouseInfluence
        const finalSize = star.size * (1 + audioInfluence * 1.5) // Enhanced size change

        // Apply star field opacity
        const starOpacity = finalBrightness * star.opacity * starFieldOpacityRef.current

        // Draw star
        ctx.fillStyle = `hsla(${star.hue}, 80%, 75%, ${starOpacity})` // Increased saturation
        ctx.beginPath()
        ctx.arc(star.x, star.y, finalSize, 0, Math.PI * 2)
        ctx.fill()

        // Add glow effect for brighter stars
        if (finalBrightness > 0.7) {
          ctx.shadowBlur = finalSize * 3 // Enhanced glow
          ctx.shadowColor = `hsla(${star.hue}, 80%, 75%, 0.6)` // Brighter glow
        } else {
          ctx.shadowBlur = 0
        }

        // Update position - stars move down slowly
        star.y += star.speed * (isPlaying ? 2 : 0.5) * audioReactivity // Faster movement when playing

        // Wrap around if out of screen
        if (star.y > canvasRef.current.height) {
          star.y = 0
          star.x = Math.random() * canvasRef.current.width

          // Update the hue to match current background
          star.hue = Math.random() * 60 + backgroundHueRef.current
        }
      }

      // Draw particles - increased for visual impact
      const maxParticlesToRender = mobileMode ? 30 : 60 // More particles
      const particlesToRender = Math.min(particlesRef.current.length, maxParticlesToRender)

      for (let i = 0; i < particlesToRender; i++) {
        const particle = particlesRef.current[i]

        // Audio reactivity for particles
        let audioReactivityFactor = 1
        if (isPlaying && audioLevel.length > 0) {
          const audioIndex = Math.floor((i / particlesToRender) * audioLevel.length)
          const audioValue = audioLevel[audioIndex] || 0
          audioReactivityFactor = 1 + audioValue / 128 // Enhanced reactivity
        }

        // Update position
        particle.x += particle.directionX * particle.speed * audioReactivityFactor
        particle.y += particle.directionY * particle.speed * audioReactivityFactor

        // Bounce off edges
        if (particle.x < 0 || particle.x > canvasRef.current.width) {
          particle.directionX *= -1
        }

        if (particle.y < 0 || particle.y > canvasRef.current.height) {
          particle.directionY *= -1
        }

        // Draw particle
        ctx.beginPath()
        const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.size * 2)
        gradient.addColorStop(0, `hsla(${particle.hue}, 80%, 75%, ${particle.opacity}`) // Brighter center
        gradient.addColorStop(1, `hsla(${particle.hue}, 80%, 50%, 0)`)

        ctx.fillStyle = gradient
        ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2)
        ctx.fill()

        // Slowly fade out particles
        particle.opacity -= particle.decay

        // Reset particles that have faded out
        if (particle.opacity <= 0) {
          particle.x = Math.random() * canvasRef.current.width
          particle.y = Math.random() * canvasRef.current.height
          particle.opacity = Math.random() * 0.3 + 0.1 // Brighter when reset

          // Update the hue to match current background
          particle.hue = Math.random() * 60 + backgroundHueRef.current
        }
      }

      // Draw aurora borealis effect during chorus
      if (isChorus) {
        drawAuroraBorealis(ctx, timestamp, audioReactivity)
      }

      requestRef.current = requestAnimationFrame(animate)
    }

    // Draw aurora borealis effect
    const drawAuroraBorealis = (ctx, timestamp, audioReactivity) => {
      if (!canvasRef.current || !isMountedRef.current) return

      const width = canvasRef.current.width
      const height = canvasRef.current.height

      // Create multiple wave-like shapes
      const waveCount = 3
      const baseY = height * 0.6

      for (let w = 0; w < waveCount; w++) {
        // Different hues for each wave
        const hue = backgroundHueRef.current - 50 + w * 30

        ctx.beginPath()

        // Start from left edge
        ctx.moveTo(0, baseY + Math.sin(timestamp * 0.001 + w) * 50)

        // Create wave points
        const pointCount = 10
        for (let i = 0; i <= pointCount; i++) {
          const x = (width / pointCount) * i

          // Calculate wave height with multiple sine waves
          const timeOffset = timestamp * 0.001
          const wave1 = Math.sin(timeOffset + i * 0.2 + w) * 50
          const wave2 = Math.sin(timeOffset * 1.5 + i * 0.3) * 30
          const wave3 = Math.sin(timeOffset * 0.7 - i * 0.4 + w * 0.5) * 20

          // Combine waves and apply audio reactivity
          const y = baseY + (wave1 + wave2 + wave3) * audioReactivity * 1.5 // Enhanced effect

          // Use quadratic curves for smoother lines
          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            const prevX = (width / pointCount) * (i - 1)
            const cpX = (x + prevX) / 2
            ctx.quadraticCurveTo(cpX, y, x, y)
          }
        }

        // Complete the shape by going to bottom and back to start
        ctx.lineTo(width, height)
        ctx.lineTo(0, height)
        ctx.closePath()

        // Create gradient fill with enhanced opacity
        const gradient = ctx.createLinearGradient(0, baseY - 100, 0, baseY + 100)
        gradient.addColorStop(0, `hsla(${hue}, 80%, 70%, 0)`)
        gradient.addColorStop(
          0.5,
          `hsla(${hue}, 80%, 70%, ${0.15 * audioReactivity * glowIntensityRef.current.current})`,
        )
        gradient.addColorStop(1, `hsla(${hue}, 80%, 50%, 0)`)

        ctx.fillStyle = gradient
        ctx.fill()
      }
    }

    // Start animation
    requestRef.current = requestAnimationFrame(animate)

    return () => {
      isMountedRef.current = false
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
        requestRef.current = null
      }
    }
  }, [isPlaying, mousePosition, isMoving, isChorus, audioLevel, mobileMode])

  return (
    <>
      {/* Base gradient background - enhanced colors */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#0f0a20] via-[#120824] to-[#0a0a18] z-[-10]"></div>

      {/* Canvas for star field and particles */}
      <canvas ref={canvasRef} className="fixed inset-0 z-[-9]" style={{ filter: "blur(0.5px)" }} />

      {/* Subtle noise texture overlay */}
      <div className="fixed inset-0 z-[-8] opacity-[0.03] pointer-events-none bg-noise"></div>

      {/* Subtle vignette effect */}
      <div className="fixed inset-0 z-[-7] pointer-events-none shadow-vignette"></div>

      {/* Audio reactive glow - central - enhanced */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96 z-[-6] pointer-events-none"
        style={{
          opacity: isPlaying ? (isChorus ? 0.5 : 0.3) : 0.05,
          background: `radial-gradient(circle, rgba(${isChorus ? "227,74,123" : "123,58,237"},0.3) 0%, rgba(${isChorus ? "123,58,237" : "227,74,123"},0.15) 50%, rgba(0,0,0,0) 70%)`,
          filter: "blur(30px)",
        }}
      />

      {/* Horizontal accent lines - enhanced */}
      <div className="fixed inset-0 z-[-5] pointer-events-none" style={{ opacity: isPlaying ? 1 : 0 }}>
        <div
          className="absolute top-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/20 to-transparent"
          style={{
            transform: isPlaying ? `translateY(${Math.sin(Date.now() * 0.001) * 5}px)` : "none",
            opacity: isPlaying ? 0.7 + Math.sin(Date.now() * 0.0005) * 0.3 : 0.7,
          }}
        />

        <div
          className="absolute bottom-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-secondary-500/20 to-transparent"
          style={{
            transform: isPlaying ? `translateY(${Math.sin(Date.now() * 0.0008 + 1) * -5}px)` : "none",
            opacity: isPlaying ? 0.7 + Math.sin(Date.now() * 0.0004 + 2) * 0.3 : 0.7,
          }}
        />
      </div>

      {/* Dynamic chorus-specific effect - enhanced */}
      {isChorus && (
        <div className="fixed inset-0 z-[-4] pointer-events-none" style={{ opacity: 1 }}>
          <div
            className="absolute inset-0 bg-gradient-radial from-primary-500/10 via-secondary-500/5 to-transparent"
            style={{
              transform: `scale(${1 + Math.sin(Date.now() * 0.0005) * 0.05})`,
              opacity: 0.7 + Math.sin(Date.now() * 0.0003) * 0.15,
            }}
          />
        </div>
      )}

      {/* Audio reactive bottom gradient - enhanced */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[-3] pointer-events-none"
        style={{
          opacity: isPlaying ? 0.3 : 0.1,
          height: isPlaying ? 100 + Math.sin(Date.now() * 0.0004) * 10 : 80,
          background: `linear-gradient(to top, rgba(${isChorus ? "227,74,123" : "123,58,237"},0.15) 0%, transparent 100%)`,
        }}
      />
    </>
  )
}

export default Background
