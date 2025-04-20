"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute, FaHeart } from "react-icons/fa"
import { IoRepeat } from "react-icons/io5"
import { HiOutlineSwitchHorizontal } from "react-icons/hi"
import { formatTime } from "../lib/utils"

// Simplified AudioPlayer without WaveSurfer dependency
const AudioPlayer = ({ onTimeUpdate, onPlayStateChange, onAudioLevelUpdate, onError }) => {
  // Main states
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoop, setIsLoop] = useState(false)
  const [loadingState, setLoadingState] = useState("loading") // loading, loaded, error
  
  // UI states
  const [liked, setLiked] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [visualizerType, setVisualizerType] = useState("bars") 
  const [frequencyData, setFrequencyData] = useState(new Uint8Array(128).fill(0))
  
  // Refs
  const audioRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceRef = useRef(null)
  const animationFrameRef = useRef(null)
  const containerRef = useRef(null)
  const playAttemptTimeoutRef = useRef(null)
  const loadRetriesRef = useRef(0)
  const waveformCanvasRef = useRef(null)
  const canvasContextRef = useRef(null)
  const initializedRef = useRef(false)
  
  // Initialize audio
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    console.log("🎵 Initializing audio player...");
    
    // Create audio element
    const audio = new Audio();
    audioRef.current = audio;
    audio.preload = "auto";
    audio.crossOrigin = "anonymous"; // For frequency analysis
    audio.volume = volume;
    
    // Setup event listeners
    const setupAudio = () => {
      audio.addEventListener('loadedmetadata', () => {
        console.log("Audio metadata loaded, duration:", audio.duration);
        setDuration(audio.duration);
        setIsLoaded(true);
        setLoadingState("loaded");
      });
      
      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
        if (onTimeUpdate) onTimeUpdate(audio.currentTime);
      });
      
      audio.addEventListener('play', () => {
        console.log("Audio play event");
        setIsPlaying(true);
        if (onPlayStateChange) onPlayStateChange(true);
      });
      
      audio.addEventListener('pause', () => {
        console.log("Audio pause event");
        setIsPlaying(false);
        if (onPlayStateChange) onPlayStateChange(false);
      });
      
      audio.addEventListener('ended', () => {
        console.log("Audio ended event");
        if (isLoop) {
          audio.currentTime = 0;
          audio.play().catch(e => console.error("Error playing after end:", e));
        } else {
          setIsPlaying(false);
          if (onPlayStateChange) onPlayStateChange(false);
        }
      });
      
      audio.addEventListener('error', (e) => {
        console.error("Audio error:", e);
        const errorCode = audio.error ? audio.error.code : "unknown";
        console.error(`Audio error code: ${errorCode}`);
        
        // Try to reload if we haven't exceeded retry limit
        if (loadRetriesRef.current < 3) {
          loadRetriesRef.current++;
          console.log(`Retry loading audio: attempt ${loadRetriesRef.current}/3`);
          
          // Wait a moment before retrying
          setTimeout(() => {
            audio.src = `/die-with-a-smile.mp3?nocache=${Date.now()}`;
            audio.load();
          }, 1000);
        } else {
          setLoadingState("error");
          if (onError) onError(new Error(`Audio loading failed after 3 attempts: ${errorCode}`));
        }
      });
      
      // Set source with cache busting
      audio.src = `/die-with-a-smile.mp3?nocache=${Date.now()}`;
      audio.load();
    };
    
    // Initialize Web Audio API for visualization
    const setupAudioContext = () => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
          console.warn("Web Audio API not supported in this browser");
          return false;
        }
        
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        
        // Connect analyzer when audio is ready
        audio.addEventListener('canplaythrough', () => {
          // Only set up once
          if (sourceRef.current) return;
          
          try {
            const source = audioContext.createMediaElementSource(audio);
            sourceRef.current = source;
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            
            // Start visualization loop
            startVisualization();
          } catch (e) {
            console.warn("Error connecting audio source:", e);
          }
        }, { once: true });
        
        return true;
      } catch (e) {
        console.warn("Error setting up Web Audio API:", e);
        return false;
      }
    };
    
    setupAudio();
    setupAudioContext();
    
    // Initialize canvas for waveform
    initializeCanvas();
    
    return () => {
      // Clean up
      if (audioRef.current) {
        const audio = audioRef.current;
        audio.pause();
        
        // Remove all event listeners
        audio.onloadedmetadata = null;
        audio.ontimeupdate = null;
        audio.onplay = null;
        audio.onpause = null;
        audio.onended = null;
        audio.onerror = null;
        audio.oncanplaythrough = null;
        
        audio.src = "";
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (e) {
          console.warn("Error closing AudioContext:", e);
        }
      }
      
      if (playAttemptTimeoutRef.current) {
        clearTimeout(playAttemptTimeoutRef.current);
      }
    };
  }, [onTimeUpdate, onPlayStateChange, onAudioLevelUpdate, onError, volume, isLoop]);
  
  // Initialize canvas for waveform visualization
  const initializeCanvas = () => {
    if (!waveformCanvasRef.current) return;
    
    const canvas = waveformCanvasRef.current;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    canvasContextRef.current = canvas.getContext('2d');
    
    // Handle resize
    const handleResize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      drawWaveform();
    };
    
    window.addEventListener('resize', handleResize);
    
    // Initial draw
    drawWaveform();
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  };
  
  // Start visualization loop
  const startVisualization = useCallback(() => {
    if (!analyserRef.current || !onAudioLevelUpdate) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateVisualization = () => {
      if (!analyserRef.current) return;
      
      try {
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Update state for component use
        setFrequencyData(dataArray);
        
        // Pass to parent for other visualizers
        onAudioLevelUpdate(dataArray);
        
        // Draw waveform
        drawWaveform(dataArray);
      } catch (e) {
        console.warn("Error updating visualization:", e);
      }
      
      animationFrameRef.current = requestAnimationFrame(updateVisualization);
    };
    
    updateVisualization();
  }, [onAudioLevelUpdate]);
  
  // Draw waveform on canvas
  const drawWaveform = useCallback((dataArray) => {
    if (!canvasContextRef.current || !waveformCanvasRef.current) return;
    
    const canvas = waveformCanvasRef.current;
    const ctx = canvasContextRef.current;
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // If we have frequency data, draw based on that
    if (dataArray && dataArray.length > 0) {
      // Draw bars
      if (visualizerType === "bars") {
        const barWidth = width / Math.min(64, dataArray.length);
        const barGap = Math.max(1, barWidth * 0.2);
        const effectiveBarWidth = barWidth - barGap;
        
        for (let i = 0; i < Math.min(64, dataArray.length); i++) {
          const value = dataArray[i];
          const percent = value / 255;
          const barHeight = percent * height;
          
          // Create gradient for each bar
          const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
          gradient.addColorStop(0, 'rgba(227, 74, 123, 0.8)');
          gradient.addColorStop(1, 'rgba(123, 58, 237, 0.8)');
          
          ctx.fillStyle = gradient;
          ctx.fillRect(i * barWidth, height - barHeight, effectiveBarWidth, barHeight);
        }
      } 
      // Draw wave
      else if (visualizerType === "wave") {
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        
        const sliceWidth = width / dataArray.length;
        
        for (let i = 0; i < dataArray.length; i++) {
          const value = dataArray[i];
          const percent = value / 255;
          const y = height / 2 + (percent * height / 2 - height / 4);
          
          ctx.lineTo(i * sliceWidth, y);
        }
        
        // Complete the path
        ctx.lineTo(width, height / 2);
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(227, 74, 123, 0.8)';
        ctx.stroke();
        
        // Fill area under the wave
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(227, 74, 123, 0.2)');
        gradient.addColorStop(1, 'rgba(123, 58, 237, 0.2)');
        
        ctx.fillStyle = gradient;
        ctx.fill();
      }
      // Draw circle
      else if (visualizerType === "circle") {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2.5;
        
        // Draw circle wave
        ctx.beginPath();
        
        for (let i = 0; i < dataArray.length; i++) {
          const value = dataArray[i];
          const percent = value / 255;
          
          const angle = (i / dataArray.length) * Math.PI * 2;
          const pointRadius = radius * (1 + percent * 0.5);
          
          const x = centerX + Math.cos(angle) * pointRadius;
          const y = centerY + Math.sin(angle) * pointRadius;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        // Close the path
        ctx.closePath();
        
        const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.5, centerX, centerY, radius * 1.5);
        gradient.addColorStop(0, 'rgba(227, 74, 123, 0.5)');
        gradient.addColorStop(1, 'rgba(123, 58, 237, 0.0)');
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(227, 74, 123, 0.8)';
        ctx.stroke();
      }
    } 
    // Otherwise draw placeholder waveform
    else {
      // Generate placeholder waveform
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      
      const steps = 50;
      const stepSize = width / steps;
      
      for (let i = 0; i <= steps; i++) {
        const x = i * stepSize;
        const yOffset = Math.sin(i * 0.2) * (height / 4) * Math.min(1, isPlaying ? 0.5 : 0.2);
        const y = height / 2 + yOffset;
        
        ctx.lineTo(x, y);
      }
      
      ctx.lineWidth = 2;
      ctx.strokeStyle = isPlaying ? 'rgba(227, 74, 123, 0.6)' : 'rgba(255, 255, 255, 0.3)';
      ctx.stroke();
    }
  }, [visualizerType, isPlaying]);
  
  // Handle audio context resumption for autoplay policies
  const resumeAudioContext = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(e => {
        console.warn("Error resuming audio context:", e);
      });
    }
  }, []);
  
  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    
    // Resume audio context (needed for autoplay policies)
    resumeAudioContext();
    
    // Clear any pending play attempts
    if (playAttemptTimeoutRef.current) {
      clearTimeout(playAttemptTimeoutRef.current);
    }
    
    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        // Reset if at end
        if (currentTime >= duration - 0.1) {
          audioRef.current.currentTime = 0;
        }
        
        const playPromise = audioRef.current.play();
        
        // Handle play promise (modern browsers)
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(e => {
            console.error("Error playing audio:", e);
            
            // Retry after a short delay (autoplay policy)
            playAttemptTimeoutRef.current = setTimeout(() => {
              console.log("Retry play after delay");
              
              // Try again with user interaction context
              audioRef.current.play().catch(e => {
                console.error("Retry play failed:", e);
                if (onError) onError(e);
              });
            }, 300);
          });
        }
      }
    } catch (e) {
      console.error("Toggle play/pause error:", e);
      if (onError) onError(e);
    }
  }, [isPlaying, currentTime, duration, onError, resumeAudioContext]);
  
  // Handle volume change
  const handleVolumeChange = useCallback((e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    
    if (newVolume === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  }, []);
  
  // Toggle mute
  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    if (audioRef.current) {
      audioRef.current.volume = newMutedState ? 0 : volume;
    }
  }, [isMuted, volume]);
  
  // Handle seek
  const handleSeek = useCallback((e) => {
    const seekTime = parseFloat(e.target.value);
    
    if (isNaN(seekTime) || !audioRef.current) return;
    
    try {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    } catch (e) {
      console.warn("Error seeking:", e);
    }
  }, []);
  
  // Toggle loop
  const toggleLoop = useCallback(() => {
    setIsLoop(prev => !prev);
    
    if (audioRef.current) {
      audioRef.current.loop = !isLoop;
    }
  }, [isLoop]);
  
  // Change visualizer type
  const cycleVisualizerType = useCallback(() => {
    setVisualizerType(prev => {
      const types = ["bars", "wave", "circle"];
      const currentIndex = types.indexOf(prev);
      return types[(currentIndex + 1) % types.length];
    });
  }, []);
  
  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only if this component is focused
      if (!containerRef.current?.contains(document.activeElement)) return;
      
      if (e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === "ArrowRight") {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.min(duration, currentTime + 5);
        }
      } else if (e.code === "ArrowLeft") {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(0, currentTime - 5);
        }
      } else if (e.code === "KeyM") {
        toggleMute();
      } else if (e.code === "KeyL") {
        toggleLoop();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlayPause, toggleMute, toggleLoop, currentTime, duration]);
  
  // Handle window visibility changes (pause when tab inactive)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying && audioRef.current) {
        // Save current time before pausing
        const currentPosition = audioRef.current.currentTime;
        
        // Pause audio
        audioRef.current.pause();
        
        // When visible again, resume from where we left off
        const handleVisible = () => {
          if (!document.hidden && audioRef.current) {
            // Restore position
            audioRef.current.currentTime = currentPosition;
            
            // Try to play again
            if (isPlaying) {
              audioRef.current.play().catch(e => {
                console.warn("Error resuming after visibility change:", e);
              });
            }
            
            // Remove this one-time handler
            document.removeEventListener("visibilitychange", handleVisible);
          }
        };
        
        // Add one-time handler for when visibility returns
        document.addEventListener("visibilitychange", handleVisible);
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isPlaying]);

  return (
    <div className="w-full max-w-3xl mx-auto glass-dark rounded-xl overflow-hidden shadow-glow transition-all hover:shadow-glow-strong" 
      ref={containerRef} 
      tabIndex="0" // Make container focusable for keyboard events
    >
      <div className="p-6 space-y-6">
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
              {isPlaying ? <FaPause /> : <FaPlay className="ml-1" />}
              <AnimatePresence>
                {loadingState === "loading" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-gray-900/80 flex items-center justify-center"
                  >
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Button ripple effect */}
              <motion.div 
                initial={{ scale: 0, opacity: 0.7 }}
                animate={isPlaying ? {
                  scale: [0, 1.5],
                  opacity: [0.7, 0]
                } : { scale: 0, opacity: 0 }}
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
              onClick={cycleVisualizerType} 
              className="control-button"
              aria-label="Visualizer Type"
            >
              <HiOutlineSwitchHorizontal className={isPlaying ? 'text-primary-400' : 'text-gray-400'} />
            </motion.button>
            
            <motion.button 
              whileTap={{ scale: 0.95 }} 
              whileHover={{ scale: 1.05 }}
              onClick={toggleLoop} 
              className={`control-button ${isLoop ? 'bg-primary-500/30' : ''}`}
              aria-label="Loop"
            >
              <IoRepeat className={isLoop ? 'text-primary-400' : 'text-gray-400'} />
            </motion.button>
            
            <motion.button 
              whileTap={{ scale: 0.95 }} 
              whileHover={{ scale: 1.05 }}
              onClick={() => setLiked(!liked)}
              className="control-button"
              aria-label="Like"
            >
              <FaHeart className={`transition-colors ${liked ? "text-primary-500" : "text-gray-400"}`} />
              <AnimatePresence>
                {liked && (
                  <motion.span
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 text-primary-500 flex items-center justify-center"
                  >
                    <FaHeart />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
            
            <div className="relative">
              <motion.button 
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
                onClick={toggleMute}
                onMouseEnter={() => setShowVolumeSlider(true)}
                className="control-button"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
              </motion.button>
              
              <AnimatePresence>
                {showVolumeSlider && (
                  <motion.div 
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 100 }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-full top-1/2 -translate-y-1/2 mr-2 glass-dark rounded-full px-3 py-1 z-10"
                    onMouseLeave={() => setShowVolumeSlider(false)}
                  >
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="volume-slider"
                      aria-label="Volume"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        
        {/* Waveform visualization */}
        <motion.div 
          className="waveform h-28 bg-gray-900/30 rounded-lg overflow-hidden cursor-pointer"
          animate={{
            scale: isPlaying ? [1, 1.005, 1] : 1,
            transition: {
              duration: 2,
              repeat: isPlaying ? Infinity : 0,
              repeatType: "mirror"
            }
          }}
          onClick={(e) => {
            if (!audioRef.current || !duration) return;
            
            // Calculate click position
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = x / rect.width;
            
            // Set new position
            audioRef.current.currentTime = percentage * duration;
          }}
        >
          <canvas
            ref={waveformCanvasRef}
            className="w-full h-full waveform-canvas"
          />
          
          {/* Loading overlay */}
          <AnimatePresence>
            {loadingState === "loading" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-gray-900/50 flex items-center justify-center"
              >
                <motion.div 
                  className="flex space-x-2"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-3 h-3 bg-secondary-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Visualizer type indicator */}
          <div className="absolute top-2 right-2 text-xs bg-black/40 px-2 py-1 rounded-full flex items-center">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-400 animate-pulse mr-1.5"></span>
            <span>
              {visualizerType === "bars" && "Bars"}
              {visualizerType === "wave" && "Wave"}
              {visualizerType === "circle" && "Circle"}
            </span>
          </div>
          
          {/* Hint for interaction */}
          <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-white/40 pointer-events-none">
            Click to seek
          </div>
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
                    backgroundSize: '200% 100%'
                  }}
                />
                <div 
                  className="progress-handle"
                  style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
                />
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
        
        {/* Keyboard controls hint */}
        <div className="text-xs text-center text-white/40 pointer-events-none">
          Keyboard: Space (play/pause), ← → (seek), M (mute), L (loop)
        </div>
      </div>
    </div>
  )
}

export default AudioPlayer