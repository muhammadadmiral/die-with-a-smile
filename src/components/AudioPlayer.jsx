import { useState, useRef, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { formatTime } from "../lib/utils"

const AudioPlayer = ({ 
  onTimeUpdate, 
  onPlayStateChange, 
  onAudioLevelUpdate, 
  onDurationUpdate,
  isPlaying,
  currentTime,
  duration
}) => {
  // Main states
  const [volume, setVolume] = useState(0.7)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadingState, setLoadingState] = useState("loading")
  const [frequencyData, setFrequencyData] = useState(new Uint8Array(128).fill(0))

  // Refs
  const audioRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceRef = useRef(null)
  const animationFrameRef = useRef(null)
  const waveformCanvasRef = useRef(null)
  const canvasContextRef = useRef(null)
  const isMountedRef = useRef(true)
  const playPromiseRef = useRef(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        try {
          audioContextRef.current.close()
        } catch (e) {
          console.warn("Error closing AudioContext:", e)
        }
      }
    }
  }, [])

  // Initialize audio
  useEffect(() => {
    // Create audio element
    const audio = new Audio()
    audioRef.current = audio
    audio.preload = "auto"
    audio.crossOrigin = "anonymous"
    audio.volume = volume

    // Setup event listeners
    audio.addEventListener("loadedmetadata", () => {
      if (!isMountedRef.current) return
      console.log("Audio metadata loaded, duration:", audio.duration)
      setIsLoaded(true)
      setLoadingState("loaded")
      if (onDurationUpdate) onDurationUpdate(audio.duration)
    })

    audio.addEventListener("timeupdate", () => {
      if (!isMountedRef.current) return
      if (onTimeUpdate) onTimeUpdate(audio.currentTime)
    })

    audio.addEventListener("play", () => {
      if (!isMountedRef.current) return
      console.log("Audio play event")
      if (onPlayStateChange) onPlayStateChange(true)
    })

    audio.addEventListener("pause", () => {
      if (!isMountedRef.current) return
      console.log("Audio pause event")
      if (onPlayStateChange) onPlayStateChange(false)
    })

    audio.addEventListener("ended", () => {
      if (!isMountedRef.current) return
      console.log("Audio ended event")
      if (onPlayStateChange) onPlayStateChange(false)
    })

    audio.addEventListener("error", (e) => {
      if (!isMountedRef.current) return
      console.error("Audio error:", e)
      setLoadingState("error")
    })

    // Set source - try multiple paths
    const tryPaths = [
      "/die-with-a-smile.mp3",
      "./die-with-a-smile.mp3",
      "../die-with-a-smile.mp3",
      "/audio/die-with-a-smile.mp3",
    ]

    let pathIndex = 0

    const tryNextPath = () => {
      if (pathIndex >= tryPaths.length) {
        console.error("All audio paths failed")
        setLoadingState("error")
        return
      }

      const path = tryPaths[pathIndex]
      console.log(`Trying audio path: ${path}`)
      audio.src = path

      // Handle error for this path
      const handlePathError = () => {
        console.warn(`Path failed: ${path}`)
        pathIndex++
        audio.removeEventListener("error", handlePathError)
        tryNextPath()
      }

      audio.addEventListener("error", handlePathError, { once: true })
      audio.load()
    }

    tryNextPath()

    // Initialize Web Audio API for visualization
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (AudioContext) {
        const audioContext = new AudioContext()
        audioContextRef.current = audioContext

        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        analyserRef.current = analyser

        // Connect analyzer when audio is ready
        audio.addEventListener("canplaythrough", () => {
          if (!isMountedRef.current) return
          if (!sourceRef.current && audioContext.state !== "closed") {
            try {
              const source = audioContext.createMediaElementSource(audio)
              sourceRef.current = source
              source.connect(analyser)
              analyser.connect(audioContext.destination)

              // Start visualization loop
              startVisualization()
            } catch (e) {
              console.warn("Error connecting audio source:", e)
            }
          }
        })
      }
    } catch (e) {
      console.warn("Web Audio API not supported:", e)
    }

    // Initialize canvas for waveform
    initializeCanvas()

    return () => {
      // Clean up
      if (audioRef.current) {
        const audio = audioRef.current
        audio.pause()

        // Remove all event listeners
        audio.onloadedmetadata = null
        audio.ontimeupdate = null
        audio.onplay = null
        audio.onpause = null
        audio.onended = null
        audio.onerror = null
        audio.oncanplaythrough = null
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        try {
          audioContextRef.current.close()
        } catch (e) {
          console.warn("Error closing AudioContext:", e)
        }
      }
    }
  }, [])

  // Initialize canvas for waveform visualization
  const initializeCanvas = useCallback(() => {
    if (!waveformCanvasRef.current) return

    const canvas = waveformCanvasRef.current
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    canvasContextRef.current = canvas.getContext("2d")

    // Handle resize
    const handleResize = () => {
      if (!waveformCanvasRef.current || !isMountedRef.current) return
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      drawWaveform()
    }

    window.addEventListener("resize", handleResize)

    // Initial draw
    drawWaveform()

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  // Start visualization loop
  const startVisualization = useCallback(() => {
    if (!analyserRef.current || !onAudioLevelUpdate) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)

    const updateVisualization = () => {
      if (!analyserRef.current || !isMountedRef.current) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
        }
        return
      }

      try {
        analyserRef.current.getByteFrequencyData(dataArray)

        // Update state for component use
        if (isMountedRef.current) {
          setFrequencyData([...dataArray])

          // Pass to parent for other visualizers
          onAudioLevelUpdate(dataArray)

          // Draw waveform
          drawWaveform(dataArray)
        }
      } catch (e) {
        console.warn("Error updating visualization:", e)
      }

      animationFrameRef.current = requestAnimationFrame(updateVisualization)
    }

    updateVisualization()
  }, [onAudioLevelUpdate])

  // Draw waveform on canvas
  const drawWaveform = useCallback(
    (dataArray) => {
      if (!canvasContextRef.current || !waveformCanvasRef.current || !isMountedRef.current) return

      const canvas = waveformCanvasRef.current
      const ctx = canvasContextRef.current
      const width = canvas.width
      const height = canvas.height

      // Clear canvas
      ctx.clearRect(0, 0, width, height)

      // If we have frequency data, draw the waveform
      if (dataArray && dataArray.length > 0) {
        const barWidth = width / Math.min(64, dataArray.length)
        const barGap = Math.max(1, barWidth * 0.2)
        const effectiveBarWidth = barWidth - barGap

        for (let i = 0; i < Math.min(64, dataArray.length); i++) {
          const value = dataArray[i]
          const percent = value / 255
          const barHeight = percent * height

          // Create gradient for each bar
          const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height)
          gradient.addColorStop(0, "rgba(227, 74, 123, 0.8)")
          gradient.addColorStop(1, "rgba(123, 58, 237, 0.8)")

          ctx.fillStyle = gradient
          ctx.fillRect(i * barWidth, height - barHeight, effectiveBarWidth, barHeight)
        }
      } else {
        // Draw placeholder waveform when no data
        ctx.beginPath()
        ctx.moveTo(0, height / 2)

        const steps = 50
        const stepSize = width / steps

        for (let i = 0; i <= steps; i++) {
          const x = i * stepSize
          const yOffset = Math.sin(i * 0.2) * (height / 4) * Math.min(1, isPlaying ? 0.5 : 0.2)
          const y = height / 2 + yOffset

          ctx.lineTo(x, y)
        }

        ctx.lineWidth = 2
        ctx.strokeStyle = isPlaying ? "rgba(227, 74, 123, 0.6)" : "rgba(255, 255, 255, 0.3)"
        ctx.stroke()
      }
    },
    [isPlaying],
  )

  // Handle audio context resumption for autoplay policies
  const resumeAudioContext = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume().catch((e) => {
        console.warn("Error resuming audio context:", e)
      })
    }
  }, [])

  // Toggle play/pause with promise handling to prevent race conditions
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return

    // Resume audio context (needed for autoplay policies)
    resumeAudioContext()

    try {
      // If a play promise is pending, don't do anything
      if (playPromiseRef.current) {
        console.log("Play operation already in progress, ignoring toggle request")
        return
      }

      if (isPlaying) {
        audioRef.current.pause()
      } else {
        // Reset if at end
        if (currentTime >= duration - 0.1) {
          audioRef.current.currentTime = 0
        }

        const playPromise = audioRef.current.play()

        // Store the promise to track its state
        playPromiseRef.current = playPromise

        // Handle play promise (modern browsers)
        if (playPromise && typeof playPromise.then === "function") {
          playPromise
            .then(() => {
              // Play started successfully
              playPromiseRef.current = null
            })
            .catch((e) => {
              console.error("Error playing audio:", e)
              playPromiseRef.current = null
            })
        } else {
          // For browsers that don't return a promise
          playPromiseRef.current = null
        }
      }
    } catch (e) {
      console.error("Toggle play/pause error:", e)
      playPromiseRef.current = null
    }
  }, [isPlaying, currentTime, duration, resumeAudioContext])

  // Handle volume change
  const handleVolumeChange = useCallback((e) => {
    const newVolume = Number.parseFloat(e.target.value)
    setVolume(newVolume)

    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }

    if (newVolume === 0) {
      setIsMuted(true)
    } else {
      setIsMuted(false)
    }
  }, [])

  // Toggle mute
  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted
    setIsMuted(newMutedState)

    if (audioRef.current) {
      audioRef.current.volume = newMutedState ? 0 : volume
    }
  }, [isMuted, volume])

  // Handle seek
  const handleSeek = useCallback((e) => {
    const seekTime = Number.parseFloat(e.target.value)

    if (isNaN(seekTime) || !audioRef.current) return

    try {
      audioRef.current.currentTime = seekTime
      if (onTimeUpdate) onTimeUpdate(seekTime)
    } catch (e) {
      console.warn("Error seeking:", e)
    }
  }, [onTimeUpdate])

  // Update audio element when volume or loop changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  // Sync play state with audio element
  useEffect(() => {
    if (!audioRef.current) return

    if (isPlaying && audioRef.current.paused) {
      const playPromise = audioRef.current.play()
      if (playPromise && typeof playPromise.then === "function") {
        playPromise.catch(e => console.warn("Error playing audio:", e))
      }
    } else if (!isPlaying && !audioRef.current.paused) {
      audioRef.current.pause()
    }
  }, [isPlaying])

  // Sync current time with audio element
  useEffect(() => {
    if (!audioRef.current || Math.abs(audioRef.current.currentTime - currentTime) < 0.5) return
    
    try {
      audioRef.current.currentTime = currentTime
    } catch (e) {
      console.warn("Error setting current time:", e)
    }
  }, [currentTime])

  return (
    <div className="w-full max-w-3xl mx-auto glass-dark rounded-xl overflow-hidden shadow-glow transition-all hover:shadow-glow-strong">
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Album info and controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              onClick={togglePlayPause}
              className="control-button primary relative overflow-hidden"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="6" y="4" width="4" height="16"></rect>
                  <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              )}
              {loadingState === "loading" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-gray-900/80 flex items-center justify-center"
                >
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </motion.div>
              )}

              {/* Button ripple effect */}
              <motion.div
                initial={{ scale: 0, opacity: 0.7 }}
                animate={
                  isPlaying
                    ? {
                        scale: [0, 1.5],
                        opacity: [0.7, 0],
                      }
                    : { scale: 0, opacity: 0 }
                }
                transition={{ duration: 0.8 }}
                className="absolute inset-0 rounded-full bg-primary-500"
              />
            </motion.button>

            <div className="album-info">
              <h3 className="album-title text-gradient animate-text-glow">Die With A Smile</h3>
              <p className="album-artist">Bruno Mars & Lady Gaga</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              onClick={toggleMute}
              className="control-button"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
                </svg>
              )}
            </motion.button>

            <div className="relative w-20">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="volume-slider w-full"
                aria-label="Volume"
              />
            </div>
          </div>
        </div>

        {/* Waveform visualization */}
        <motion.div
          className="waveform h-20 md:h-28 bg-gray-900/30 rounded-lg overflow-hidden cursor-pointer relative"
          animate={{
            scale: isPlaying ? [1, 1.005, 1] : 1,
            transition: {
              duration: 2,
              repeat: isPlaying ? Number.POSITIVE_INFINITY : 0,
              repeatType: "mirror",
            },
          }}
          onClick={(e) => {
            if (!audioRef.current || !duration) return

            // Calculate click position
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            const percentage = x / rect.width

            // Set new position
            const newTime = percentage * duration
            if (audioRef.current) {
              audioRef.current.currentTime = newTime
              if (onTimeUpdate) onTimeUpdate(newTime)
            }
          }}
        >
          <canvas ref={waveformCanvasRef} className="w-full h-full waveform-canvas" />

          {/* Loading overlay */}
          {loadingState === "loading" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-gray-900/50 flex items-center justify-center"
            >
              <motion.div
                className="flex space-x-2"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
              >
                <div
                  className="w-3 h-3 bg-primary-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-3 h-3 bg-secondary-500 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-3 h-3 bg-primary-500 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </motion.div>
            </motion.div>
          )}
        </motion.div>

        {/* Progress bar and time */}
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <span className="time-display">{formatTime(currentTime)}</span>

            <div className="relative flex-grow h-4">
              <div className="progress-bar">
                <div
                  className="progress-fill animate-shimmer"
                  style={{
                    width: `${(currentTime / (duration || 1)) * 100}%`,
                    backgroundSize: "200% 100%",
                  }}
                />
                <div className="progress-handle" style={{ left: `${(currentTime / (duration || 1)) * 100}%` }} />
              </div>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Seek"
              />
            </div>

            <span className="time-display">{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AudioPlayer
