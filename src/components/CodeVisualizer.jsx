import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { chorusLines, getLyricTimingInfo, getActiveWord } from "../lib/utils";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const CodeVisualizer = ({ currentTime, isPlaying, currentLyric, isMobile }) => {
  // State
  const [isChorus, setIsChorus] = useState(false);
  const [previousLyric, setPreviousLyric] = useState("");
  const [codeVisible, setCodeVisible] = useState(true);
  const [isGlitching, setIsGlitching] = useState(false);
  const [highlightedLine, setHighlightedLine] = useState(-1);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [interludeActive, setInterludeActive] = useState(false);
  
  // Refs
  const containerRef = useRef(null);
  const codeRef = useRef(null);
  const isMountedRef = useRef(true);
  const animationFrameRef = useRef(null);
  const lastTimeRef = useRef(0);
  
  // Main function code snippet for chorus sections
  const mainCodeSnippet = useMemo(() => `const dieWithASmile = () => {
  if (worldIsEnding()) {
    return 'i wanna be next to you'
  } else if (partyIsOver() && timeOnEarthIsThrough()) {
    return 'i wanna hold you just for a while and die with a smile'
  } else {
    return "i'd still choose you, even in the bugs of life"
  }
}`, []);

  // Complex code for interlude sections
  const interludeCodeSnippet = useMemo(() => `/**
 * Die With A Smile - Custom Logic Engine
 * Created by: Your Code Maestro 🎵
 * 
 * A beautiful front-end masterpiece
 */

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Emotion definitions for lyrical analysis
const emotions = {
  LOVE: { intensity: 0.95, color: '#e34a7b' },
  DEVOTION: { intensity: 0.87, color: '#7c3aed' },
  ETERNITY: { intensity: 1.0, color: '#f59e0b' }
};

// Custom hook for calculating lyrical intensity
function useLyricalIntensity(lyrics, currentTime) {
  return useMemo(() => {
    if (!lyrics || currentTime <= 0) return 0;
    
    // Calculate emotional resonance based on lyrical context
    const wordCount = lyrics.split(' ').length;
    const emotionalWeight = lyrics.includes('die with a smile') ? 
      emotions.LOVE.intensity * 1.5 : 
      emotions.DEVOTION.intensity;
      
    return Math.sin(currentTime * 0.1) * emotionalWeight * (wordCount / 10);
  }, [lyrics, currentTime]);
}

// Time-space continuum simulation
function simulateTimeFlow(worldIsEnding, callback) {
  if (worldIsEnding) {
    return setTimeout(() => {
      callback('together in eternity');
    }, 0); // Time is irrelevant when the world ends
  }
  
  return setInterval(() => {
    callback('moments passing by');
  }, 1000); // Each second is precious
}

// Main component logic
export function DieWithASmileLogic() {
  const [timeRemaining, setTimeRemaining] = useState(Infinity);
  const [emotion, setEmotion] = useState(emotions.LOVE);
  
  useEffect(() => {
    // When worlds collide
    const cleanupFn = simulateTimeFlow(timeRemaining < 100, (state) => {
      setEmotion(prev => ({
        ...prev,
        intensity: Math.min(1, prev.intensity + 0.01)
      }));
    });
    
    return () => {
      typeof cleanupFn === 'number' && clearInterval(cleanupFn);
    };
  }, [timeRemaining]);
  
  // Final return value - what matters in the end
  return {
    message: 'If the world was ending, I wanna be next.js',
    emotion,
    timeRemaining
  };
}`, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
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

  // Check for interlude sections (vocalizing or instrumental)
  const checkInterludeSection = useCallback((lyric) => {
    if (!lyric) return false;
    return lyric.includes("[BOTH VOCALIZING]") || 
           lyric.includes("[VOCALIZING]") || 
           (lyric === "..." && currentTime > 170 && currentTime < 190);
  }, [currentTime]);

  // Handle lyric changes and detect section type
  useEffect(() => {
    if (!isMountedRef.current || !currentLyric) return;

    // Skip if same lyric (prevents duplicate processing)
    if (currentLyric === previousLyric) return;
    
    setPreviousLyric(currentLyric);

    // Check if current lyric is part of chorus or interlude
    const newIsChorus = checkChorusSection(currentLyric);
    const newIsInterlude = checkInterludeSection(currentLyric);
    
    // Handle state changes based on section type
    if (newIsInterlude && !interludeActive) {
      // Entering interlude - trigger glitch animation
      setIsGlitching(true);
      setCodeVisible(false);
      
      setTimeout(() => {
        if (isMountedRef.current) {
          setInterludeActive(true);
          setIsChorus(false);
          setCodeVisible(true);
          setIsGlitching(false);
        }
      }, 300);
    } else if (newIsChorus && !isChorus && !interludeActive) {
      // Entering chorus - trigger glitch animation
      setIsGlitching(true);
      setCodeVisible(false);
      
      setTimeout(() => {
        if (isMountedRef.current) {
          setIsChorus(true);
          setInterludeActive(false);
          setCodeVisible(true);
          setIsGlitching(false);
        }
      }, 300);
    } else if (!newIsChorus && !newIsInterlude && (isChorus || interludeActive)) {
      // Exiting special section - trigger glitch animation
      setIsGlitching(true);
      setCodeVisible(false);
      
      setTimeout(() => {
        if (isMountedRef.current) {
          setIsChorus(false);
          setInterludeActive(false);
          setCodeVisible(true);
          setIsGlitching(false);
        }
      }, 300);
    }
  }, [currentLyric, previousLyric, isChorus, interludeActive, checkChorusSection, checkInterludeSection]);

  // Determine highlighted code line based on lyrics
  useEffect(() => {
    if (!isMountedRef.current || (!isChorus && !interludeActive)) return;
    
    // Process animation frame to avoid React state updates too frequently
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      // Only update every 100ms for performance
      const now = Date.now();
      if (now - lastTimeRef.current < 100) return;
      lastTimeRef.current = now;
      
      if (interludeActive) {
        // For interlude, cycle through lines
        const totalLines = interludeCodeSnippet.split('\n').length;
        setHighlightedLine(prev => (prev + 1) % totalLines);
        return;
      }
      
      // For chorus, match line with lyric content
      let lineToHighlight = 0;
      
      if (currentLyric.includes("I'D WANNA BE NEXT TO YOU")) {
        lineToHighlight = 2; // return 'i wanna be next to you'
      } else if (currentLyric.includes("HOLD YOU") || 
                 currentLyric.includes("DIE WITH A SMILE")) {
        lineToHighlight = 4; // return 'i wanna hold you...'
      } else if (currentLyric.includes("IF THE WORLD WAS ENDING")) {
        lineToHighlight = 1; // if (worldIsEnding()) line
      } else if (currentLyric.includes("IF THE PARTY WAS OVER") || 
                 currentLyric.includes("TIME ON EARTH")) {
        lineToHighlight = 3; // else if (partyIsOver...)
      } else {
        lineToHighlight = 6; // else block or closing
      }
      
      setHighlightedLine(lineToHighlight);
    });
  }, [currentLyric, isChorus, interludeActive, interludeCodeSnippet]);

  // Position the component based on device type
  const getCodePosition = useCallback(() => {
    if (isMobile) {
      // Avoid overlap with header on mobile
      return "fixed top-32 left-1/2 -translate-x-1/2 max-w-[90%] w-full z-20 pointer-events-none";
    } else {
      return "fixed top-28 left-1/2 -translate-x-1/2 max-w-lg w-full z-20 pointer-events-none";
    }
  }, [isMobile]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isPlaying ? 1 : 0.7 }}
      transition={{ duration: 0.5 }}
      className={getCodePosition()}
      style={{
        maxHeight: isMobile ? "35vh" : "45vh",
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
            {isChorus || interludeActive ? (
              // Show code snippet during chorus or interlude sections
              <div className="code-content p-4 h-full">
                <div className="code-header flex justify-between items-center mb-3">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <span className="code-filename text-xs text-gray-400">
                    {interludeActive ? "DieWithASmileLogic.tsx" : "dieWithASmile.js"}
                  </span>
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

                <div 
                  ref={codeRef}
                  className="overflow-auto rounded-md"
                  style={{ 
                    maxHeight: "calc(100% - 2rem)",
                    backgroundColor: "transparent" 
                  }}
                >
                  {/* Use SyntaxHighlighter for better code display */}
                  <SyntaxHighlighter
                    language="javascript"
                    style={vscDarkPlus}
                    customStyle={{
                      backgroundColor: "transparent",
                      margin: 0,
                      padding: 0,
                      fontSize: isMobile ? "11px" : "13px",
                    }}
                    wrapLines={true}
                    showLineNumbers={!isMobile}
                    lineProps={(lineNumber) => {
                      // +1 because SyntaxHighlighter line numbers start at 1
                      const isHighlighted = lineNumber === highlightedLine + 1;
                      return {
                        style: {
                          backgroundColor: isHighlighted ? 'rgba(227, 74, 123, 0.2)' : '',
                          display: 'block',
                          padding: '0 1rem',
                          borderRadius: isHighlighted ? '4px' : '0',
                          transition: 'all 0.2s ease',
                          borderLeft: isHighlighted ? '2px solid #e34a7b' : ''
                        }
                      };
                    }}
                  >
                    {interludeActive ? interludeCodeSnippet : mainCodeSnippet}
                  </SyntaxHighlighter>
                </div>

                {interludeActive && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-secondary-500/30 rounded-full text-[10px] flex items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-secondary-400 animate-pulse mr-1.5"></span>
                    <span className="text-secondary-200">INTERLUDE</span>
                  </div>
                )}
              </div>
            ) : (
              // Show current lyric outside of special sections
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
                      animate={{ 
                        opacity: 1, 
                        y: 0,
                        background: "linear-gradient(90deg, #ffffff, #e0e0e0)",
                        backgroundClip: "text",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent"
                      }}
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