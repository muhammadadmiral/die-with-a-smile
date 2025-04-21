import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatTime } from "../lib/utils";

const AudioPlayer = ({
  onTimeUpdate,
  onPlayStateChange,
  onAudioLevelUpdate,
  onDurationUpdate,
  onError,
  isPlaying = false,
  currentTime = 0,
  duration = 0,
}) => {
  // State
  const [loadingState, setLoadingState] = useState("loading");
  const [volume, setVolume] = useState(0.8);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [showVolumeControl, setShowVolumeControl] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [vinylRotation, setVinylRotation] = useState(0);
  const [retry, setRetry] = useState(0);

  // Refs
  const audioRef = useRef(null);
  const progressRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationRef = useRef(null);
  const isMountedRef = useRef(true);
  const buttonRef = useRef(null);
  const waveformCanvasRef = useRef(null);
  const canvasContextRef = useRef(null);
  const vinylRotationRef = useRef(null);

  // Audio file paths to try
  const audioPaths = [
    "/die-with-a-smile.mp3",
    "./die-with-a-smile.mp3",
    "die-with-a-smile.mp3",
    "/audio/die-with-a-smile.mp3",
    "./audio/die-with-a-smile.mp3",
    "https://assets.codepen.io/5645017/die-with-a-smile.mp3" // Fallback to external source if available
  ];

  // Setup cleanup function
  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (vinylRotationRef.current) {
      cancelAnimationFrame(vinylRotationRef.current);
      vinylRotationRef.current = null;
    }

    if (analyserRef.current) {
      try { analyserRef.current.disconnect(); } catch (e) {}
      analyserRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try { audioContextRef.current.close().catch(e => {}); } catch (e) {}
      audioContextRef.current = null;
    }

    if (audioRef.current) {
      try { 
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current.load();
      } catch (e) {}
      audioRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // Initialize canvas for waveform
  const initCanvas = useCallback(() => {
    if (!waveformCanvasRef.current) return;
    
    try {
      const canvas = waveformCanvasRef.current;
      const ctx = canvas.getContext("2d");
      
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      
      canvasContextRef.current = ctx;
      
      // Draw initial flat line
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } catch (e) {}
  }, []);

  // Draw waveform with audio data
  const drawWaveform = useCallback((dataArray) => {
    if (!canvasContextRef.current || !waveformCanvasRef.current) return;
    
    try {
      const canvas = waveformCanvasRef.current;
      const ctx = canvasContextRef.current;
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);
      
      if (dataArray && dataArray.length > 0) {
        // Draw bars
        const barCount = 64; // Fixed number of bars for consistent look
        const barWidth = width / barCount;
        const barGap = Math.max(1, barWidth * 0.2);
        const effectiveBarWidth = barWidth - barGap;
        
        for (let i = 0; i < barCount; i++) {
          // Get value from array, using proper indexing to sample across the entire data
          const dataIndex = Math.floor((i / barCount) * dataArray.length);
          const value = dataArray[dataIndex] || 0;
          
          const percent = value / 255;
          const barHeight = Math.max(2, percent * height);
          
          // Gradient for each bar
          const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
          gradient.addColorStop(0, "rgba(227, 74, 123, 0.8)");
          gradient.addColorStop(1, "rgba(123, 58, 237, 0.8)");
          
          ctx.fillStyle = gradient;
          ctx.fillRect(i * barWidth, height - barHeight, effectiveBarWidth, barHeight);
        }
      } else {
        // Draw flat line when no data
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } catch (e) {}
  }, []);

  // Start visualization loop
  const startVisualization = useCallback(() => {
    if (!analyserRef.current || !onAudioLevelUpdate) return;
    
    try {
      if (!dataArrayRef.current && analyserRef.current.frequencyBinCount) {
        dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      }
      
      const updateVisualization = () => {
        if (!isMountedRef.current || !analyserRef.current || !dataArrayRef.current) return;
        
        try {
          analyserRef.current.getByteFrequencyData(dataArrayRef.current);
          
          // Send to parent component
          onAudioLevelUpdate(dataArrayRef.current);
          
          // Update visualization
          drawWaveform(dataArrayRef.current);
        } catch (e) {}
        
        animationRef.current = requestAnimationFrame(updateVisualization);
      };
      
      animationRef.current = requestAnimationFrame(updateVisualization);
    } catch (e) {}
  }, [drawWaveform, onAudioLevelUpdate]);

  // Initialize audio context
  const initAudioContext = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return;
    
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaElementSource(audioRef.current);
      
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      
      startVisualization();
    } catch (e) {
      console.warn("Audio visualization unavailable");
    }
  }, [startVisualization]);

  // Animated vinyl record rotation
  const animateVinyl = useCallback(() => {
    if (!isMountedRef.current) return;
    
    if (isPlaying) {
      setVinylRotation(prev => (prev + 0.5) % 360);
    }
    
    vinylRotationRef.current = requestAnimationFrame(animateVinyl);
  }, [isPlaying]);

  // Start vinyl animation
  useEffect(() => {
    vinylRotationRef.current = requestAnimationFrame(animateVinyl);
    
    return () => {
      if (vinylRotationRef.current) {
        cancelAnimationFrame(vinylRotationRef.current);
        vinylRotationRef.current = null;
      }
    };
  }, [animateVinyl]);

  // Initialize audio element and load audio
  useEffect(() => {
    // Create new audio element
    const audio = new Audio();
    audioRef.current = audio;
    
    // Reset error count
    setErrorCount(0);
    setLoadingState("loading");
    setAudioError(false);
    
    // Configure audio
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    audio.volume = volume;
    
    // Setup event handlers
    const handlers = {
      loadedmetadata: () => {
        if (!isMountedRef.current) return;
        setAudioLoaded(true);
        setLoadingState("loaded");
        onDurationUpdate && onDurationUpdate(audio.duration);
        initCanvas();
        setTimeout(initAudioContext, 100);
      },
      
      timeupdate: () => {
        if (!isMountedRef.current || isSeeking) return;
        onTimeUpdate && onTimeUpdate(audio.currentTime);
      },
      
      canplaythrough: () => {
        if (!isMountedRef.current) return;
        setLoadingState("loaded");
        setAudioError(false);
      },
      
      progress: () => {
        if (!isMountedRef.current || !audio.duration) return;
        
        try {
          // Calculate loading progress
          if (audio.buffered.length > 0) {
            const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
            const duration = audio.duration;
            const progress = (bufferedEnd / duration) * 100;
            setLoadingProgress(progress);
          }
        } catch (e) {}
      },
      
      play: () => {
        if (!isMountedRef.current) return;
        onPlayStateChange && onPlayStateChange(true);
      },
      
      pause: () => {
        if (!isMountedRef.current) return;
        onPlayStateChange && onPlayStateChange(false);
      },
      
      ended: () => {
        if (!isMountedRef.current) return;
        onPlayStateChange && onPlayStateChange(false);
      },
      
      error: (e) => {
        if (!isMountedRef.current) return;
        console.error("Audio error:", e);
        
        // Get current source index
        const currentSrc = audio.src;
        const currentIndex = audioPaths.findIndex(path => 
          currentSrc.includes(path.replace(/^\.\//, "").replace(/^\//, ""))
        );
        
        // If there are more paths to try
        if (currentIndex >= 0 && currentIndex < audioPaths.length - 1) {
          console.log(`Trying next audio path: ${audioPaths[currentIndex + 1]}`);
          audio.src = audioPaths[currentIndex + 1];
          audio.load();
        } else {
          // All paths failed
          setAudioError(true);
          setLoadingState("error");
          onError && onError(new Error("Could not load audio file"));
        }
      }
    };
    
    // Add event listeners
    Object.entries(handlers).forEach(([event, handler]) => {
      audio.addEventListener(event, handler);
    });
    
    // Start loading first source
    audio.src = audioPaths[0];
    audio.load();
    
    // Handle window resize for canvas
    const handleResize = () => {
      if (waveformCanvasRef.current) initCanvas();
    };
    
    window.addEventListener("resize", handleResize);
    
    // Cleanup
    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        if (audio) audio.removeEventListener(event, handler);
      });
      
      window.removeEventListener("resize", handleResize);
    };
  }, [volume, initCanvas, initAudioContext, onDurationUpdate, onError, onPlayStateChange, onTimeUpdate, retry]);

  // Sync play state with audio element
  useEffect(() => {
    if (!audioRef.current || audioError) return;
    
    if (isPlaying && audioRef.current.paused) {
      // Should be playing but isn't
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch(e => {
          console.error("Failed to resume audio context:", e);
        });
      }
      
      audioRef.current.play().catch(error => {
        console.error("Play error:", error);
        onPlayStateChange && onPlayStateChange(false);
        
        // Auto-interaction error fix for some browsers
        if (error.name === "NotAllowedError") {
          const playOnInteraction = () => {
            audioRef.current.play().catch(e => console.error("Still cannot play:", e));
            document.removeEventListener("click", playOnInteraction);
          };
          document.addEventListener("click", playOnInteraction);
        }
      });
    } else if (!isPlaying && !audioRef.current.paused) {
      // Should be paused but isn't
      audioRef.current.pause();
    }
  }, [isPlaying, audioError, onPlayStateChange]);

  // Sync current time with audio element
  useEffect(() => {
    if (!audioRef.current || isSeeking) return;
    
    // Only update if difference is significant
    if (Math.abs(audioRef.current.currentTime - currentTime) > 0.5) {
      audioRef.current.currentTime = currentTime;
    }
  }, [currentTime, isSeeking]);
  
  // Progress click handler
  const handleProgressClick = (e) => {
    if (!progressRef.current || !audioRef.current || !audioRef.current.duration) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const newTime = position * audioRef.current.duration;
    
    if (!isNaN(newTime) && isFinite(newTime)) {
      audioRef.current.currentTime = newTime;
      onTimeUpdate && onTimeUpdate(newTime);
    }
  };

  // Seek handlers
  const handleSeekStart = () => {
    setIsSeeking(true);
  };

  const handleSeekEnd = () => {
    setIsSeeking(false);
  };

  // Play/pause toggle with ripple effect
  const togglePlay = () => {
    if (audioError) {
      // Try to recover from error
      setRetry(prev => prev + 1);
      return;
    }
    
    onPlayStateChange && onPlayStateChange(!isPlaying);
    
    // Add ripple effect to button
    if (buttonRef.current) {
      const button = buttonRef.current;
      const ripple = document.createElement("span");
      ripple.classList.add("ripple");
      
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${rect.width / 2 - size / 2}px`;
      ripple.style.top = `${rect.height / 2 - size / 2}px`;
      
      button.appendChild(ripple);
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
    }
  };

  // Volume change handler
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  // Calculate progress percentage
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="px-4 py-3 rounded-xl glass-dark shadow-lg relative max-w-screen-lg mx-auto backdrop-blur-md border border-gray-800/50">
      {/* Error message */}
      <AnimatePresence>
        {audioError && (
          <motion.div 
            className="mb-4 p-3 text-sm text-center rounded-lg bg-red-500/20 border border-red-500/30 text-white shadow-lg"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <p className="mb-2">Audio tidak dapat diputar. File mungkin tidak tersedia atau format tidak didukung.</p>
            <button 
              className="px-3 py-1 bg-primary-600 hover:bg-primary-500 transition-colors rounded-md text-sm font-medium"
              onClick={() => setRetry(prev => prev + 1)}
            >
              Coba Lagi
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Album info with enhanced vinyl record */}
        <div className="flex items-center gap-4 min-w-[200px]">
          <div className="relative">
            <motion.div 
              className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden shadow-lg transform-gpu"
              animate={{ 
                rotate: isPlaying ? vinylRotation : 0,
              }}
              transition={{ duration: 0.01, ease: "linear" }}
              style={{ transformOrigin: "center" }}
            >
              {/* Enhanced 3D vinyl with image */}
              <div className="absolute inset-0 overflow-hidden rounded-full">
                {/* Album cover image */}
                <div className="absolute inset-[15%] rounded-full overflow-hidden z-10 flex items-center justify-center">
                  <img 
                    src="album-cover.png" 
                    alt="Album Cover"
                    className="w-full h-full object-cover transform-gpu"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = "https://i.pinimg.com/564x/23/08/37/230837dee0795185c1e7533a494b39e7.jpg"; // Fallback image
                    }}
                  />
                </div>
                
                {/* Vinyl record outer ring */}
                <div className="absolute inset-0 rounded-full bg-black">
                  {/* Vinyl grooves */}
                  <div className="absolute inset-2 rounded-full border border-gray-800"></div>
                  <div className="absolute inset-3 rounded-full border border-gray-800"></div>
                  <div className="absolute inset-4 rounded-full border border-gray-800"></div>
                  <div className="absolute inset-5 rounded-full border border-gray-800"></div>
                  <div className="absolute inset-6 rounded-full border border-gray-800"></div>
                </div>
                
                {/* Vinyl center hole */}
                <div className="absolute inset-[48%] bg-gray-800 rounded-full z-20"></div>
                
                {/* Vinyl sheen effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent rounded-full opacity-60 z-30"></div>
              </div>
              
              {/* Spinning animation for active vinyl */}
              {isPlaying && (
                <div className="absolute inset-[-5px] rounded-full border-2 border-primary-500/20 animate-ping"></div>
              )}
            </motion.div>
            
            {/* Vinyl arm */}
            <motion.div 
              className="absolute top-[20%] -right-1 w-8 h-1 bg-gray-300/20 rounded"
              style={{ transformOrigin: "right center" }}
              animate={{
                rotate: isPlaying ? 0 : -30
              }}
              transition={{ duration: 0.5, type: "spring" }}
            >
              <div className="absolute -left-1 -top-1 w-2 h-3 bg-primary-500/80 rounded-sm"></div>
            </motion.div>
          </div>
          
          <div className="album-info">
            <h3 className="text-base md:text-lg font-semibold text-gradient">
              Die With A Smile
            </h3>
            <p className="text-xs md:text-sm opacity-80 font-medium">Bruno Mars & Lady Gaga</p>
            
            {/* Album details */}
            <p className="text-xs opacity-60 mt-1">Album: "Die With A Smile" · 2024</p>
          </div>
        </div>
        
        {/* Main player controls */}
        <div className="flex flex-col w-full max-w-2xl gap-2">
          {/* Progress bar */}
          <div 
            ref={progressRef}
            className="group relative h-4 w-full rounded-full overflow-hidden cursor-pointer bg-gray-800/60 backdrop-blur-sm"
            onClick={handleProgressClick}
            onMouseDown={handleSeekStart}
            onMouseUp={handleSeekEnd}
            onMouseLeave={handleSeekEnd}
          >
            {/* Loading progress bar */}
            {loadingState === "loading" && loadingProgress > 0 && (
              <div 
                className="absolute top-0 left-0 h-full bg-gray-600/50"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            )}
            
            {/* Playback progress bar */}
            <motion.div 
              className="progress-fill absolute top-0 left-0 h-full bg-gradient-to-r from-secondary-600 to-primary-600"
              style={{ width: `${progressPercentage}%` }}
              initial={{ width: "0%" }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.1 }}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></span>
            </motion.div>
            
            {/* Progress handle */}
            <motion.div 
              className="progress-handle absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-glow-strong border-2 border-primary-500 transition-transform group-hover:scale-110"
              style={{ left: `calc(${progressPercentage}% - 8px)` }}
              initial={{ left: "0%" }}
              animate={{ left: `calc(${progressPercentage}% - 8px)` }}
              transition={{ duration: 0.1 }}
            />
          </div>
          
          {/* Time display and controls */}
          <div className="flex items-center justify-between">
            <div className="time-display text-xs md:text-sm opacity-80 font-mono">
              {loadingState === "loading" ? (
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-primary-500 mr-1 animate-pulse rounded-full"></div>
                  Loading...
                </span>
              ) : (
                <>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </>
              )}
            </div>
            
            <div className="flex items-center gap-2 md:gap-3">
              {/* Backward button */}
              <motion.button
                type="button"
                className="control-button secondary w-8 h-8 flex items-center justify-center rounded-full bg-gray-800/60 text-gray-300"
                whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.1)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
                    onTimeUpdate && onTimeUpdate(audioRef.current.currentTime);
                  }
                }}
                disabled={loadingState === "loading"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="19 20 9 12 19 4 19 20"></polygon>
                  <line x1="5" y1="19" x2="5" y2="5"></line>
                </svg>
              </motion.button>
              
              {/* Play/Pause button */}
              <motion.button
                ref={buttonRef}
                type="button"
                className="control-button primary relative w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-secondary-600 text-white overflow-hidden"
                whileHover={{ scale: 1.08, boxShadow: "0 0 15px rgba(227,74,123,0.6)" }}
                whileTap={{ scale: 0.95 }}
                onClick={togglePlay}
                disabled={loadingState === "loading" && !audioError}
              >
                {loadingState === "loading" && !audioError ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : isPlaying ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-50"></div>
                
                {/* Ripple animation */}
                {isPlaying && (
                  <div className="absolute inset-0 rounded-full">
                    <div className="absolute inset-0 animate-ping rounded-full bg-primary-500/20 backdrop-blur-sm"></div>
                  </div>
                )}
              </motion.button>
              
              {/* Forward button */}
              <motion.button
                type="button"
                className="control-button secondary w-8 h-8 flex items-center justify-center rounded-full bg-gray-800/60 text-gray-300"
                whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.1)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
                    onTimeUpdate && onTimeUpdate(audioRef.current.currentTime);
                  }
                }}
                disabled={loadingState === "loading"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 4 15 12 5 20 5 4"></polygon>
                  <line x1="19" y1="5" x2="19" y2="19"></line>
                </svg>
              </motion.button>
              
              {/* Volume control */}
              <div className="relative ml-2" onMouseEnter={() => setShowVolumeControl(true)} onMouseLeave={() => setShowVolumeControl(false)}>
                <motion.button
                  type="button"
                  className="control-button secondary w-8 h-8 flex items-center justify-center rounded-full bg-gray-800/60 text-gray-300"
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.1)" }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    {volume > 0.01 && (
                      <>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        {volume > 0.3 && (
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                        )}
                      </>
                    )}
                  </svg>
                </motion.button>
                
                <AnimatePresence>
                  {showVolumeControl && (
                    <motion.div 
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 rounded-lg glass-dark w-32 shadow-lg"
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                    >
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="volume-slider w-full"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            <div className="text-xs opacity-50">
              <span className="hidden md:inline">©</span> 2024
            </div>
          </div>
        </div>
      </div>
      
      {/* Audio visualization */}
      <div className="mt-4 h-12 md:h-16 rounded-lg overflow-hidden glass-dark bg-gray-900/30 backdrop-blur-md">
        {/* Audio spectrum visualization */}
        {isPlaying && dataArrayRef.current ? (
          <div className="h-full flex items-end justify-center gap-px">
            {Array.from({ length: Math.min(84, dataArrayRef.current ? dataArrayRef.current.length : 40) }).map((_, i) => {
              // Get frequency data
              const value = dataArrayRef.current ? dataArrayRef.current[i] || 0 : 0;
              const height = (value / 255) * 100;
              const adjustedHeight = Math.max(5, height);
              
              // Calculate color gradient based on frequency
              const hue = i < 20 ? 330 : (i < 40 ? 280 : 240); // Lower frequencies are redder
              
              return (
                <motion.div
                  key={`bar-${i}`}
                  className="w-1 rounded-t-sm"
                  initial={{ height: "5%" }}
                  animate={{ height: `${adjustedHeight}%` }}
                  transition={{ duration: 0.1 }}
                  style={{
                    background: `linear-gradient(to top, hsla(${hue}, 80%, 70%, 0.9), hsla(${hue}, 80%, 50%, 0.3))`,
                    boxShadow: `0 0 4px hsla(${hue}, 80%, 60%, 0.6)`
                  }}
                />
              );
            })}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            {loadingState === "loading" ? (
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-primary-500 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-secondary-500 animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                <div className="w-2 h-2 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: "0.4s" }}></div>
              </div>
            ) : (
              <div className="text-sm text-center text-gray-400 italic">
                Play music to see visualization
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Add CSS for vinyl animation and other effects */}
      <style jsx>{`
        .vinyl-record {
          animation: ${isPlaying ? 'rotateRecord 2s linear infinite' : 'none'};
        }
        
        @keyframes rotateRecord {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .volume-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.2);
          outline: none;
        }
        
        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: rgb(227, 74, 123);
          cursor: pointer;
        }
        
        .volume-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: rgb(227, 74, 123);
          cursor: pointer;
          border: none;
        }
        
        .ripple {
          position: absolute;
          border-radius: 50%;
          background-color: rgba(255, 255, 255, 0.4);
          transform: scale(0);
          animation: ripple 0.6s linear;
        }
        
        @keyframes ripple {
          to {
            transform: scale(2.5);
            opacity: 0;
          }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default AudioPlayer;