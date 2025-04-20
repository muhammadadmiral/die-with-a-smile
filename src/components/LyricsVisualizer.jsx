import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { lyrics, chorusLines, getLyricTimingInfo, getActiveWord } from "../lib/utils";

const LyricsVisualizer = ({ currentTime, isPlaying, audioLevel = [] }) => {
  // Core state
  const [activeIndex, setActiveIndex] = useState(-1);
  const [activeLine, setActiveLine] = useState("");
  const [activeWords, setActiveWords] = useState([]);
  const [isChorus, setIsChorus] = useState(false);
  const [lyricsVisible, setLyricsVisible] = useState(true);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);
  const [timingInfo, setTimingInfo] = useState(null);
  
  // Refs for performance
  const containerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const isMountedRef = useRef(true);
  const lastUpdateTimeRef = useRef(0);
  
  // Audio intensity calculation
  const audioIntensity = useRef(1);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Calculate current audio intensity value for animations
  useEffect(() => {
    if (!audioLevel || audioLevel.length === 0) return;
    
    // Calculate average of bass frequencies (first 15 values)
    const bassRange = Math.min(15, audioLevel.length);
    let bassSum = 0;
    
    for (let i = 0; i < bassRange; i++) {
      bassSum += audioLevel[i];
    }
    
    const bassAvg = bassSum / bassRange / 255;
    // Scale up for more dramatic effect
    audioIntensity.current = 1 + bassAvg * 1.8;
  }, [audioLevel]);

  // Find active lyric based on current time with binary search
  const findActiveLyric = useCallback(() => {
    let start = 0;
    let end = lyrics.length - 1;
    let result = -1;

    while (start <= end) {
      const mid = Math.floor((start + end) / 2);
      if (lyrics[mid].time <= currentTime) {
        result = mid;
        start = mid + 1;
      } else {
        end = mid - 1;
      }
    }

    if (result !== -1) {
      // Check if we should be at the next lyric
      const nextIndex = result + 1;
      if (nextIndex < lyrics.length && 
          currentTime >= lyrics[nextIndex].time) {
        return nextIndex;
      }
      return result;
    }

    return -1;
  }, [currentTime]);

  // Update active lyric based on current time
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    // Throttle updates to optimize performance
    const now = Date.now();
    if (now - lastUpdateTimeRef.current < 50) { // 20fps is enough for lyrics
      return;
    }
    lastUpdateTimeRef.current = now;
    
    const foundIndex = findActiveLyric();

    if (foundIndex !== -1 && foundIndex !== activeIndex) {
      setActiveIndex(foundIndex);
      const currentLyricText = lyrics[foundIndex].text;
      setActiveLine(currentLyricText);

      // Check if current line is chorus
      const isChorusLine = chorusLines.some(line => 
        currentLyricText.includes(line) || line.includes(currentLyricText)
      );
      setIsChorus(isChorusLine);

      // Get detailed timing info for this lyric
      const timing = getLyricTimingInfo(foundIndex);
      setTimingInfo(timing);

      // Split line into words for animation
      if (currentLyricText !== "..." && 
          !currentLyricText.includes("[") && 
          currentLyricText.trim().length > 0) {
        setActiveWords(timing.words);
        setLyricsVisible(true);
        setHighlightedWordIndex(-1); // Reset highlighted word
      } else {
        // If current lyric is empty or a special tag
        setLyricsVisible(false);
      }
    } else if (foundIndex === -1 && activeIndex !== -1) {
      // No active lyric found but we had one before
      setLyricsVisible(false);
    }
  }, [currentTime, activeIndex, findActiveLyric]);

  // Animate word-by-word highlighting with precise timing
  useEffect(() => {
    if (!isPlaying || !lyricsVisible || !timingInfo || activeWords.length === 0 || !isMountedRef.current) return;
    
    // Clean up any existing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    const updateHighlight = () => {
      if (!isMountedRef.current || !isPlaying) return;
      
      // Calculate which word should be highlighted based on timing
      const wordIndex = getActiveWord(
        currentTime,
        timingInfo.startTime,
        timingInfo.duration,
        timingInfo.wordCount
      );
      
      // Only update state if necessary
      if (wordIndex >= 0 && wordIndex !== highlightedWordIndex) {
        setHighlightedWordIndex(wordIndex);
      }
      
      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(updateHighlight);
    };
    
    animationFrameRef.current = requestAnimationFrame(updateHighlight);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentTime, isPlaying, lyricsVisible, activeWords, timingInfo, highlightedWordIndex]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 flex items-center justify-center z-20 pointer-events-none overflow-hidden"
      style={{
        transform: "translateZ(0)", // Force GPU acceleration
        backfaceVisibility: "hidden", // Prevent blurry text
      }}
    >
      {/* Background tint when lyrics are active */}
      <motion.div
        className="absolute inset-0 bg-black/50"
        animate={{
          opacity: lyricsVisible ? (isChorus ? 0.6 : 0.4) : 0,
        }}
        transition={{ duration: 0.5 }}
      />

      {/* Ambient glow effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-radial from-primary-500/20 via-transparent to-transparent"
        animate={{
          opacity: lyricsVisible ? (isChorus ? 0.7 : 0.3) : 0,
          scale: isChorus ? 1.2 : 1,
        }}
        transition={{ duration: 0.8 }}
        style={{
          backgroundPosition: "center",
          backgroundSize: "150% 150%",
        }}
      />

      {/* Main centered lyrics display */}
      <AnimatePresence mode="wait">
        {lyricsVisible && activeLine && activeLine !== "..." && (
          <motion.div
            key={`line-${activeIndex}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="relative max-w-5xl w-full text-center px-6 py-4 z-30"
          >
            <div className="flex flex-col items-center justify-center w-full">
              {/* Main text with word-by-word highlight - CapCut style */}
              <div className="relative flex flex-wrap justify-center items-center gap-x-2 gap-y-3">
                {activeWords.map((word, idx) => {
                  const isActive = idx === highlightedWordIndex;
                  const isPast = idx < highlightedWordIndex;
                  
                  return (
                    <motion.span
                      key={`word-${activeIndex}-${idx}`}
                      initial={{ 
                        opacity: 0.5, 
                        y: 10, 
                        scale: 0.9 
                      }}
                      animate={{ 
                        opacity: isPast ? 0.9 : (isActive ? 1 : 0.5),
                        y: 0,
                        scale: isActive 
                          ? (1.1 * Math.min(1.5, audioIntensity.current)) 
                          : (isPast ? 1 : 0.9),
                        color: isActive 
                          ? (isChorus ? "#ff6b9d" : "#ffffff")
                          : (isPast 
                              ? (isChorus ? "#ff6b9d" : "#ffffff") 
                              : "#a0a0a0")
                      }}
                      transition={{ 
                        duration: 0.2, 
                        type: "spring",
                        stiffness: 300,
                        damping: 20
                      }}
                      className="text-4xl md:text-5xl lg:text-6xl font-bold relative inline-block"
                    >
                      {word}
                      
                      {/* Active word highlight effect */}
                      {isActive && (
                        <motion.div
                          layoutId="activeWordUnderline"
                          className="absolute left-0 right-0 h-1 -bottom-2 rounded-full"
                          initial={{ width: "0%" }}
                          animate={{ 
                            width: "100%",
                            background: isChorus
                              ? "linear-gradient(90deg, #e34a7b, #7c3aed)"
                              : "linear-gradient(90deg, #ffffff, rgba(255,255,255,0.7))"
                          }}
                        />
                      )}
                      
                      {/* Glow effect for active word */}
                      {isActive && (
                        <motion.div
                          className="absolute inset-0 -z-10 rounded-xl"
                          animate={{
                            opacity: [0.3, 0.6 * audioIntensity.current, 0.3],
                            scale: [0.9, 1.1, 0.9],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            repeatType: "reverse",
                          }}
                          style={{
                            background: isChorus
                              ? `radial-gradient(circle, rgba(227, 74, 123, 0.3) 0%, transparent 70%)`
                              : `radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)`,
                            filter: "blur(8px)",
                          }}
                        />
                      )}
                    </motion.span>
                  );
                })}
              </div>

              {/* Enhanced line animation */}
              <motion.div
                className="absolute -bottom-10 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary-400 to-transparent"
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{
                  scaleX: isPlaying ? 1 : 0,
                  opacity: isPlaying ? 0.8 : 0,
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  repeatType: "reverse" 
                }}
              />
            </div>

            {/* Extra effects for chorus */}
            {isChorus && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute -inset-10 -z-10"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-primary-500/20 via-secondary-500/20 to-primary-500/20 rounded-full blur-3xl"
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.3, 0.5 * audioIntensity.current, 0.3],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatType: "mirror",
                  }}
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Particles effect during playback */}
      {isPlaying && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Dynamic audio-reactive glow */}
          <motion.div
            className="absolute inset-0"
            animate={{
              opacity: isPlaying ? (isChorus ? 0.4 : 0.2) * audioIntensity.current : 0,
              scale: isPlaying ? [1, 1.05, 1] : 1,
            }}
            transition={{
              opacity: { duration: 0.5 },
              scale: { duration: 2, repeat: Infinity, repeatType: "reverse" },
            }}
            style={{
              background: isChorus
                ? `radial-gradient(circle at center, rgba(227, 74, 123, 0.3) 0%, rgba(123, 58, 237, 0.2) 50%, transparent 70%)`
                : `radial-gradient(circle at center, rgba(123, 58, 237, 0.3) 0%, rgba(227, 74, 123, 0.2) 50%, transparent 70%)`,
              filter: "blur(30px)",
            }}
          />

          {/* Enhanced floating particles */}
          {Array.from({ length: isChorus ? 15 : 8 }).map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              className="absolute rounded-full"
              initial={{
                x: `${Math.random() * 100 - 50}%`,
                y: "100%",
                opacity: 0,
                backgroundColor: isChorus
                  ? `rgba(227, 74, 123, ${0.7 + Math.random() * 0.3})`
                  : `rgba(123, 58, 237, ${0.7 + Math.random() * 0.3})`,
              }}
              animate={{
                y: "-100%",
                opacity: [0, 0.8, 0],
                scale: [0.5, 1.2, 0],
              }}
              transition={{
                duration: Math.random() * 3 + 3,
                repeat: Infinity,
                delay: Math.random() * 5,
                ease: "linear",
              }}
              style={{
                width: `${Math.max(2, (isChorus ? 8 : 6) * Math.min(1.5, audioIntensity.current))}px`,
                height: `${Math.max(2, (isChorus ? 8 : 6) * Math.min(1.5, audioIntensity.current))}px`,
                filter: `blur(${isChorus ? 3 : 2}px)`,
              }}
            />
          ))}

          {/* Enhanced light beams during chorus */}
          {isChorus && (
            <>
              <motion.div
                className="absolute h-[1px] left-0 right-0"
                style={{
                  top: "40%",
                  background: "linear-gradient(90deg, transparent 0%, rgba(227, 74, 123, 0.6) 50%, transparent 100%)",
                }}
                animate={{
                  opacity: [0.2, 0.6 * audioIntensity.current, 0.2],
                  scaleY: [1, 4, 1],
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
              />
              <motion.div
                className="absolute h-[1px] left-0 right-0"
                style={{
                  top: "60%",
                  background: "linear-gradient(90deg, transparent 0%, rgba(123, 58, 237, 0.6) 50%, transparent 100%)",
                }}
                animate={{
                  opacity: [0.2, 0.6 * audioIntensity.current, 0.2],
                  scaleY: [1, 4, 1],
                  y: [0, 10, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  repeatType: "reverse",
                  delay: 2,
                }}
              />
            </>
          )}
        </div>
      )}

      {/* Blur vignette around lyrics */}
      <div 
        className="fixed inset-0 pointer-events-none z-10"
        style={{
          opacity: lyricsVisible ? 0.7 : 0,
          transition: "opacity 0.5s ease",
          background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.8) 100%)`,
        }}
      />

      {/* Enhanced "beat" effect on audio peak */}
      {lyricsVisible && isPlaying && audioIntensity.current > 1.3 && (
        <motion.div
          className="absolute inset-0 bg-white/5 z-5 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, audioIntensity.current * 0.05, 0] }}
          transition={{ duration: 0.3 }}
        />
      )}
    </div>
  );
};

export default LyricsVisualizer;