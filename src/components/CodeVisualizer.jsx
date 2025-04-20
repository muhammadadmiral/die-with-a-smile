import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { chorusLines } from "../lib/utils";

const CodeVisualizer = ({ currentTime, isPlaying, currentLyric, isMobile }) => {
  // State
  const [isChorus, setIsChorus] = useState(false);
  const [previousLyric, setPreviousLyric] = useState("");
  const [codeVisible, setCodeVisible] = useState(true);
  const [isGlitching, setIsGlitching] = useState(false);
  const [highlightedLine, setHighlightedLine] = useState(0);
  
  // Refs
  const containerRef = useRef(null);
  const codeRef = useRef(null);
  const isMountedRef = useRef(true);
  const highlightIntervalRef = useRef(null);
  
  // Enhanced code snippet based on user requirements
  const codeSnippet = useMemo(() => `const dieWithASmile = () => {
  if (worldIsEnding()) {
    return 'i wanna be next to you'
  } else if (partyIsOver() && timeOnEarthIsThrough()) {
    return 'i wanna hold you just for a while and die with a smile'
  } else {
    return 'i\'d still choose you, even in the chaos of life'
  }
}`, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      if (highlightIntervalRef.current) {
        clearInterval(highlightIntervalRef.current);
        highlightIntervalRef.current = null;
      }
    };
  }, []);

  // Check for chorus sections in lyrics
  const checkChorusSection = useCallback((lyric) => {
    if (!lyric) return false;
    return chorusLines.some(line => 
      lyric.includes(line) || line.includes(lyric)
    );
  }, []);

  // Handle lyric changes and detect chorus
  useEffect(() => {
    if (!isMountedRef.current || !currentLyric) return;

    // Skip if same lyric (prevents duplicate processing)
    if (currentLyric === previousLyric) return;
    
    setPreviousLyric(currentLyric);

    // Check if current lyric is part of chorus
    const newIsChorus = checkChorusSection(currentLyric);
    
    // Only transition if state actually changes
    if (newIsChorus !== isChorus) {
      if (newIsChorus) {
        // Entering chorus - trigger glitch animation
        setIsGlitching(true);
        setCodeVisible(false);
        
        setTimeout(() => {
          if (isMountedRef.current) {
            setIsChorus(true);
            setCodeVisible(true);
            setIsGlitching(false);
          }
        }, 300);
      } else {
        // Exiting chorus
        setIsGlitching(true);
        setCodeVisible(false);
        
        setTimeout(() => {
          if (isMountedRef.current) {
            setIsChorus(false);
            setCodeVisible(true);
            setIsGlitching(false);
          }
        }, 300);
      }
    }
  }, [currentLyric, previousLyric, isChorus, checkChorusSection]);

  // Animate code line highlighting when in chorus
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    // Clear existing interval
    if (highlightIntervalRef.current) {
      clearInterval(highlightIntervalRef.current);
      highlightIntervalRef.current = null;
    }
    
    // Only animate highlight when in chorus and playing
    if (isChorus && isPlaying) {
      const lines = codeSnippet.split('\n').length;
      
      highlightIntervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          setHighlightedLine(prev => (prev + 1) % lines);
        }
      }, 1000);
    } else {
      setHighlightedLine(0);
    }
    
    return () => {
      if (highlightIntervalRef.current) {
        clearInterval(highlightIntervalRef.current);
        highlightIntervalRef.current = null;
      }
    };
  }, [isChorus, isPlaying, codeSnippet]);

  // Position the component based on device type
  const getCodePosition = useCallback(() => {
    if (isMobile) {
      return "fixed top-24 left-1/2 -translate-x-1/2 max-w-[90%] z-20 pointer-events-none";
    } else {
      return "fixed top-28 left-1/2 -translate-x-1/2 max-w-lg z-20 pointer-events-none";
    }
  }, [isMobile]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isPlaying ? 1 : 0.7 }}
      transition={{ duration: 0.5 }}
      className={getCodePosition()}
      style={{
        maxHeight: isMobile ? "30vh" : "40vh",
        transform: "translateX(-50%)",
        willChange: "transform, opacity",
      }}
    >
      <AnimatePresence mode="wait">
        {codeVisible && (
          <motion.div
            ref={containerRef}
            className={`code-visualizer glass-dark rounded-xl overflow-hidden ${isGlitching ? "glitch" : ""}`}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
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
                repeat: isPlaying ? Infinity : 0,
                duration: 2,
                repeatType: "reverse",
              },
            }}
          >
            {isChorus ? (
              // Show code snippet during chorus sections
              <div className="code-content p-4 h-full">
                <div className="code-header flex justify-between items-center mb-3">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <span className="code-filename text-xs text-gray-400">dieWithASmile.js</span>
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

                <pre
                  ref={codeRef}
                  className="language-javascript text-sm text-left overflow-auto"
                  style={{ maxHeight: "calc(100% - 2rem)" }}
                >
                  <code>
                    {codeSnippet.split('\n').map((line, index) => (
                      <motion.div 
                        key={`line-${index}`}
                        className={`line py-1 ${highlightedLine === index ? 'bg-primary-500/30 -mx-4 px-4 rounded' : ''}`}
                        initial={{ opacity: 0.5 }}
                        animate={{ 
                          opacity: highlightedLine === index ? 1 : 0.8,
                          x: highlightedLine === index ? [0, 2, 0] : 0
                        }}
                        transition={{
                          opacity: { duration: 0.3 },
                          x: { duration: 0.2 }
                        }}
                      >
                        {line}
                      </motion.div>
                    ))}
                  </code>
                </pre>
              </div>
            ) : (
              // Show current lyric outside of chorus sections
              <div className="lyric-container h-full flex items-center justify-center p-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  {currentLyric && currentLyric !== "..." ? (
                    <motion.h3 
                      className="text-xl md:text-2xl font-semibold text-gray-100"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {currentLyric}
                    </motion.h3>
                  ) : (
                    <div className="text-gray-400 italic">Listen to the music...</div>
                  )}
                </motion.div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CodeVisualizer;