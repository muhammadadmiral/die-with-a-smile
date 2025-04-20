import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { lyrics, chorusLines } from "../lib/utils";

// Import components with React.lazy for better performance
import ErrorBoundary from "./ErrorBoundary";
import Background from "./Background";
import AudioPlayer from "./AudioPlayer";
import LyricsVisualizer from "./LyricsVisualizer";
import CodeVisualizer from "./CodeVisualizer";

const DieWithASmile = () => {
  // Core state
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLevel, setAudioLevel] = useState([]);
  const [duration, setDuration] = useState(0);
  const [activeLyric, setActiveLyric] = useState("");
  const [isChorus, setIsChorus] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Refs for performance
  const lastActiveIndexRef = useRef(-1);
  const animationFrameRef = useRef(null);
  const isMountedRef = useRef(true);

  // Detect mobile for responsive layout
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Find active lyric based on current time
  const findActiveLyric = useCallback((time) => {
    // Binary search for better performance with sorted data
    let start = 0;
    let end = lyrics.length - 1;
    let result = -1;

    while (start <= end) {
      const mid = Math.floor((start + end) / 2);
      if (lyrics[mid].time <= time) {
        result = mid;
        start = mid + 1;
      } else {
        end = mid - 1;
      }
    }

    if (result !== -1) {
      // Check next lyric timing to ensure we're in the right segment
      const nextIndex = result + 1;
      if (nextIndex < lyrics.length && time >= lyrics[nextIndex].time) {
        return { index: nextIndex, text: lyrics[nextIndex].text };
      }
      return { index: result, text: lyrics[result].text };
    }

    return null;
  }, []);

  // Handle time update from audio player
  const handleTimeUpdate = useCallback((time) => {
    if (!isMountedRef.current) return;
    
    setCurrentTime(time);

    // Find current lyric
    const activeLyricData = findActiveLyric(time);
    
    if (activeLyricData) {
      const lyricIndex = activeLyricData.index;
      const lyricText = activeLyricData.text;

      // Only update if index changed (prevents unnecessary re-renders)
      if (lyricIndex !== lastActiveIndexRef.current) {
        lastActiveIndexRef.current = lyricIndex;
        setActiveLyric(lyricText);

        // Check if this is a chorus line
        const isChorusLine = chorusLines.some(
          (line) => lyricText.includes(line) || line.includes(lyricText)
        );
        setIsChorus(isChorusLine);
      }
    }
  }, [findActiveLyric]);

  // Handle play state change
  const handlePlayStateChange = useCallback((playing) => {
    if (!isMountedRef.current) return;
    setIsPlaying(playing);
  }, []);

  // Handle audio level update with throttling for better performance
  const handleAudioLevelUpdate = useCallback((levels) => {
    if (!isMountedRef.current) return;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      setAudioLevel(levels);
    });
  }, []);

  // Handle duration update
  const handleDurationUpdate = useCallback((newDuration) => {
    if (!isMountedRef.current) return;
    setDuration(newDuration);
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    // Space key toggles play/pause
    if (e.key === " " && 
        document.activeElement.tagName !== "BUTTON" && 
        document.activeElement.tagName !== "INPUT") {
      e.preventDefault();
      setIsPlaying((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Handle errors
  const handleError = useCallback((error) => {
    console.error("Application error:", error);
  }, []);

  return (
    <motion.div
      className="relative min-h-screen overflow-hidden font-body bg-dark-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      style={{ transform: "translateZ(0)" }}
    >
      {/* Background */}
      <ErrorBoundary>
        <Background 
          isPlaying={isPlaying} 
          audioLevel={audioLevel} 
          currentLyric={activeLyric} 
          isChorus={isChorus} 
        />
      </ErrorBoundary>

      {/* Header - enhanced with gradient animation */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed top-0 left-0 right-0 z-40 pt-8 pb-4 px-6 text-center"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)",
          backdropFilter: "blur(10px)",
        }}
      >
        <motion.h1 
          className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-1 tracking-tight text-shadow-gold"
          animate={{ 
            backgroundPosition: ["0% center", "200% center"],
          }}
          transition={{ 
            duration: 20, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          style={{
            background: "linear-gradient(90deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #BF953F)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 2px 10px rgba(191, 149, 63, 0.3)",
          }}
        >
          Die With A Smile
        </motion.h1>
        <motion.p 
          className="text-lg md:text-xl font-elegant italic"
          animate={{ 
            backgroundPosition: ["0% center", "200% center"] 
          }}
          transition={{ 
            duration: 15, 
            repeat: Infinity, 
            ease: "linear",
            delay: 1
          }}
          style={{
            background: "linear-gradient(90deg, #e34a7b, #7c3aed, #e34a7b)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Bruno Mars & Lady Gaga
        </motion.p>
      </motion.header>

      {/* Lyrics Visualizer - Center of screen */}
      <ErrorBoundary>
        <LyricsVisualizer 
          currentTime={currentTime} 
          isPlaying={isPlaying} 
          audioLevel={audioLevel} 
        />
      </ErrorBoundary>

      {/* Code Visualizer - Below header */}
      <ErrorBoundary>
        <CodeVisualizer 
          currentTime={currentTime} 
          isPlaying={isPlaying} 
          currentLyric={activeLyric}
          isMobile={isMobile}
        />
      </ErrorBoundary>

      {/* Audio player - Always visible at bottom */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-0 left-0 right-0 z-40 p-4"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)",
          backdropFilter: "blur(10px)",
        }}
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

      {/* Section indicator with improved animation */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.9, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-4 left-4 z-30 pointer-events-none"
          >
            <motion.div
              className={`px-3 py-1 rounded-full backdrop-blur-sm text-xs
              ${isChorus ? "bg-primary-500/30 text-primary-200" : "bg-gray-800/30 text-gray-300"}`}
              animate={isChorus ? {
                boxShadow: ["0 0 0px rgba(227, 74, 123, 0.3)", "0 0 10px rgba(227, 74, 123, 0.6)", "0 0 0px rgba(227, 74, 123, 0.3)"]
              } : {}}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatType: "mirror" 
              }}
            >
              {isChorus ? (
                <span className="flex items-center">
                  <span className="inline-block w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse mr-1.5"></span>
                  CHORUS
                </span>
              ) : (
                <span className="flex items-center">
                  <span className="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full mr-1.5"></span>
                  VERSE
                </span>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard shortcut hint with better animation */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="fixed top-4 right-4 z-30 pointer-events-none"
          >
            <motion.div
              className="px-3 py-2 rounded-lg backdrop-blur-md bg-gray-900/40 text-xs"
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: -10 }}
              transition={{ delay: 5, duration: 2 }}
            >
              Tekan <kbd className="px-1 py-0.5 bg-gray-800 rounded text-primary-300">Spasi</kbd> untuk play/pause
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* App credits - bottom right */}
      <div className="fixed bottom-4 right-4 z-30 pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ duration: 1, delay: 2 }}
          className="text-xs text-gray-400 font-minimal text-right"
        >
          <p className="text-gradient">Frontend Masterpiece</p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DieWithASmile;