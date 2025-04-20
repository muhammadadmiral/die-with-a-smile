import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

const AudioPlayer = ({
  onTimeUpdate,
  onPlayStateChange,
  onAudioLevelUpdate,
  onDurationUpdate,
  onError,
  isPlaying,
  currentTime,
}) => {
  // Minimal state
  const [loadingState, setLoadingState] = useState("loading");

  // Refs
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(null);
  const waveformCanvasRef = useRef(null);
  const canvasContextRef = useRef(null);
  const isMountedRef = useRef(true);

  // Setup cleanup function
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch (e) {}
    }

    if (analyserRef.current) {
      try { analyserRef.current.disconnect(); } catch (e) {}
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try { audioContextRef.current.close().catch(e => {}); } catch (e) {}
    }

    if (audioRef.current) {
      try { 
        audioRef.current.pause();
        audioRef.current.src = "";
      } catch (e) {}
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
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const updateVisualization = () => {
        if (!isMountedRef.current || !analyserRef.current) return;
        
        try {
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Send to parent component
          onAudioLevelUpdate(dataArray);
          
          // Update visualization
          drawWaveform(dataArray);
        } catch (e) {}
        
        animationFrameRef.current = requestAnimationFrame(updateVisualization);
      };
      
      animationFrameRef.current = requestAnimationFrame(updateVisualization);
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
      sourceRef.current = source;
      
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      
      startVisualization();
    } catch (e) {
      console.warn("Audio visualization unavailable");
    }
  }, [startVisualization]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    
    try {
      if (isPlaying) {
        audioRef.current.pause();
        if (onPlayStateChange) onPlayStateChange(false);
      } else {
        // Reset if at end of track
        if (audioRef.current.currentTime >= audioRef.current.duration - 0.5) {
          audioRef.current.currentTime = 0;
        }
        
        // Resume audio context if suspended
        if (audioContextRef.current && audioContextRef.current.state === "suspended") {
          audioContextRef.current.resume();
        }
        
        // Play
        audioRef.current.play()
          .then(() => {
            if (onPlayStateChange) onPlayStateChange(true);
          })
          .catch(err => {
            console.warn("Play error:", err);
            if (onPlayStateChange) onPlayStateChange(false);
            if (onError) onError(err);
          });
      }
    } catch (e) {
      if (onError) onError(e);
    }
  }, [isPlaying, onError, onPlayStateChange]);

  // Set up audio element
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    
    // Configure audio
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    audio.volume = 0.7; // Fixed volume
    
    // Audio paths to try
    const audioPaths = [
      "/die-with-a-smile.mp3",
      "./die-with-a-smile.mp3",
      "die-with-a-smile.mp3",
      "./assets/die-with-a-smile.mp3"
    ];
    
    // Setup event handlers
    const handlers = {
      loadedmetadata: () => {
        setLoadingState("loaded");
        if (onDurationUpdate) onDurationUpdate(audio.duration);
        
        // Initialize canvas and audio context
        initCanvas();
        setTimeout(initAudioContext, 100);
      },
      
      timeupdate: () => {
        if (onTimeUpdate) onTimeUpdate(audio.currentTime);
      },
      
      play: () => {
        if (onPlayStateChange) onPlayStateChange(true);
      },
      
      pause: () => {
        if (onPlayStateChange) onPlayStateChange(false);
      },
      
      ended: () => {
        if (onPlayStateChange) onPlayStateChange(false);
      },
      
      canplaythrough: () => {
        setLoadingState("loaded");
      },
      
      error: (e) => {
        // Try next path
        const currentSrc = audio.src;
        const currentIndex = audioPaths.findIndex(path => currentSrc.includes(path));
        
        if (currentIndex >= 0 && currentIndex < audioPaths.length - 1) {
          audio.src = audioPaths[currentIndex + 1];
          audio.load();
        } else {
          setLoadingState("error");
          if (onError) onError(new Error("Could not load audio"));
        }
      }
    };
    
    // Add event listeners
    Object.entries(handlers).forEach(([event, handler]) => {
      audio.addEventListener(event, handler);
    });
    
    // Set initial source
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
        audio.removeEventListener(event, handler);
      });
      
      window.removeEventListener("resize", handleResize);
    };
  }, [initAudioContext, initCanvas, onDurationUpdate, onError, onPlayStateChange, onTimeUpdate]);

  // Sync play state
  useEffect(() => {
    if (!audioRef.current) return;
    
    if (isPlaying && audioRef.current.paused) {
      // Should be playing but isn't
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch(() => {});
      }
      
      audioRef.current.play().catch(() => {
        if (onPlayStateChange) onPlayStateChange(false);
      });
    } else if (!isPlaying && !audioRef.current.paused) {
      // Should be paused but isn't
      audioRef.current.pause();
    }
  }, [isPlaying, onPlayStateChange]);

  // Sync current time
  useEffect(() => {
    if (!audioRef.current) return;
    
    // Only update if difference is significant
    if (Math.abs(audioRef.current.currentTime - currentTime) > 1) {
      audioRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Simplified AudioPlayer - Only play button and waveform */}
      <div className="glass-dark rounded-xl overflow-hidden shadow-glow transition-all hover:shadow-glow-strong p-4">
        <div className="flex items-center space-x-4 mb-4">
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
            
            {/* Loading indicator */}
            {loadingState === "loading" && !isPlaying && (
              <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {/* Button ripple effect */}
            <motion.div
              initial={{ scale: 0, opacity: 0.7 }}
              animate={isPlaying ? { scale: [0, 1.5], opacity: [0.7, 0] } : { scale: 0, opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 rounded-full bg-primary-500"
            />
          </motion.button>

          <div className="album-info">
            <h3 className="album-title text-gradient animate-text-glow">Die With A Smile</h3>
            <p className="album-artist">Bruno Mars & Lady Gaga</p>
          </div>
        </div>

        {/* Waveform visualization - only component needed */}
        <motion.div
          className="waveform h-24 md:h-28 bg-gray-900/30 rounded-lg overflow-hidden relative"
          animate={{
            scale: isPlaying ? [1, 1.005, 1] : 1,
            transition: {
              duration: 2,
              repeat: isPlaying ? Number.POSITIVE_INFINITY : 0,
              repeatType: "mirror",
            },
          }}
        >
          <canvas
            ref={waveformCanvasRef}
            className="w-full h-full waveform-canvas"
            style={{ transform: "translateZ(0)" }}
          />

          {/* Loading overlay */}
          {loadingState === "loading" && (
            <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce" 
                     style={{ animationDelay: "0ms" }}></div>
                <div className="w-3 h-3 bg-secondary-500 rounded-full animate-bounce" 
                     style={{ animationDelay: "150ms" }}></div>
                <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce" 
                     style={{ animationDelay: "300ms" }}></div>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {loadingState === "error" && (
            <div className="absolute inset-0 bg-gray-900/70 flex flex-col items-center justify-center p-4 text-center">
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
                className="text-red-500 mb-2"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p className="text-sm text-red-200">Audio tidak tersedia</p>
              <button 
                className="mt-2 px-3 py-1 bg-primary-500/40 hover:bg-primary-500/60 rounded-md text-xs"
                onClick={() => {
                  setLoadingState("loading");
                  if (audioRef.current) {
                    audioRef.current.src = "/die-with-a-smile.mp3";
                    audioRef.current.load();
                  }
                }}
              >
                Coba Lagi
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AudioPlayer;