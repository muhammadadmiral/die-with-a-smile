import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import ErrorBoundary from "./ErrorBoundary";
import Background from "./Background";
import AudioPlayer from "./AudioPlayer";
import CodeVisualizer from "./CodeVisualizer";
import LyricsVisualizer from "./LyricsVisualizer";

// Component to show during lazy loading
const LoadingFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-dark-950/90 z-50">
    <div className="text-center">
      <div className="flex items-center justify-center mb-4">
        <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce mr-1" style={{ animationDelay: "0ms" }}></div>
        <div className="w-3 h-3 bg-secondary-500 rounded-full animate-bounce mx-1" style={{ animationDelay: "150ms" }}></div>
        <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce ml-1" style={{ animationDelay: "300ms" }}></div>
      </div>
      <p className="text-gray-300">Loading visualization...</p>
    </div>
  </div>
);

const DieWithASmile = () => {
  // Core state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState([]);
  const [currentLyric, setCurrentLyric] = useState("");
  const [isChorus, setIsChorus] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Refs
  const isMountedRef = useRef(true);
  const errorTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  
  // Check if current section is chorus
  const checkChorusSection = useCallback((lyric) => {
    if (!lyric) return false;
    
    const chorusLines = [
      "IF THE WORLD WAS ENDING",
      "I'D WANNA BE NEXT TO YOU",
      "IF THE PARTY WAS OVER",
      "AND OUR TIME ON EARTH",
      "WAS THROUGH",
      "I'D WANNA HOLD YOU",
      "JUST FOR A WHILE",
      "AND DIE WITH A SMILE",
      "RIGHT NEXT TO YOU",
      "NEXT TO YOU"
    ];
    
    return chorusLines.some(line => 
      lyric.includes(line) || line.includes(lyric)
    );
  }, []);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!isMountedRef.current) return;
      setIsMobile(window.innerWidth < 768);
    };
    
    // Set initial value
    handleResize();
    
    // Set up listener
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Set mounted flag on initialization
  useEffect(() => {
    isMountedRef.current = true;
    
    if (!isInitialized) {
      // Wait a bit to ensure components have time to mount
      const initTimer = setTimeout(() => {
        if (isMountedRef.current) {
          setIsInitialized(true);
        }
      }, 500);
      
      return () => {
        clearTimeout(initTimer);
      };
    }
    
    return () => {
      isMountedRef.current = false;
      
      // Clear any pending timeouts
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [isInitialized]);
  
  // Find current lyric based on time
  useEffect(() => {
    if (!currentTime) return;
    
    // Import utils dynamically to avoid circular dependencies
    const findCurrentLyric = () => {
      try {
        // Use dynamic import to avoid bundler issues
        import("../lib/utils").then(({ lyrics }) => {
          if (!isMountedRef.current) return;
          
          // Binary search to find the current lyric
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
            // Check if next lyric is closer
            const nextIndex = result + 1;
            if (nextIndex < lyrics.length && 
                lyrics[nextIndex].time - currentTime < 0.1) { // Tolerance of 100ms
              setCurrentLyric(lyrics[nextIndex].text);
              setIsChorus(checkChorusSection(lyrics[nextIndex].text));
            } else {
              setCurrentLyric(lyrics[result].text);
              setIsChorus(checkChorusSection(lyrics[result].text));
            }
          }
        }).catch(error => {
          console.error("Error loading lyrics:", error);
        });
      } catch (error) {
        console.error("Error finding current lyric:", error);
      }
    };
    
    findCurrentLyric();
  }, [currentTime, checkChorusSection]);

  // Handle play state change
  const handlePlayStateChange = useCallback((playing) => {
    if (!isMountedRef.current) return;
    setIsPlaying(playing);
  }, []);
  
  // Handle time update
  const handleTimeUpdate = useCallback((time) => {
    if (!isMountedRef.current) return;
    setCurrentTime(time);
  }, []);
  
  // Handle duration update
  const handleDurationUpdate = useCallback((newDuration) => {
    if (!isMountedRef.current) return;
    setDuration(newDuration);
  }, []);
  
  // Handle audio level update
  const handleAudioLevelUpdate = useCallback((audioData) => {
    if (!isMountedRef.current) return;
    setAudioLevel(audioData);
  }, []);
  
  // Handle errors
  const handleError = useCallback((error) => {
    if (!isMountedRef.current) return;
    console.error("Audio error:", error);
    
    // Increment retry count
    retryCountRef.current += 1;
    
    // Set error state
    setHasError(true);
    setErrorMessage(error.message || "Terjadi kesalahan saat memuat audio.");
    
    // Clear previous error timeout
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    
    // Auto-retry after delay if not too many retries
    if (retryCountRef.current < 3) {
      errorTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setHasError(false);
          // Force refresh AudioPlayer by changing a key
          setIsInitialized(false);
          setTimeout(() => {
            if (isMountedRef.current) {
              setIsInitialized(true);
            }
          }, 500);
        }
      }, 3000);
    }
  }, []);
  
  // Catch any unhandled errors and show error UI
  const handleComponentError = useCallback((error, errorInfo) => {
    console.error("Component error:", error, errorInfo);
    setHasError(true);
    setErrorMessage("Terjadi kesalahan pada aplikasi. Mohon refresh halaman.");
  }, []);
  
  // Hard refresh function
  const handleHardRefresh = useCallback(() => {
    // Force page reload
    window.location.reload();
  }, []);
  
  return (
    <ErrorBoundary onError={handleComponentError}>
      <div className="relative min-h-screen overflow-hidden">
        {/* Background visualization */}
        <Background 
          isPlaying={isPlaying} 
          audioLevel={audioLevel} 
          currentLyric={currentLyric}
          isChorus={isChorus}
        />
        
        {/* Main content */}
        <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-4xl mx-auto">
            {/* Header */}
            <motion.header 
              className="mb-8 text-center"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-display mb-2 text-gradient animate-text-glow">
                Die With A Smile
              </h1>
              <p className="text-lg text-gray-300 opacity-80">
                Bruno Mars & Lady Gaga
              </p>
            </motion.header>
            
            {/* Error message */}
            {hasError && (
              <div className="mb-8 p-4 bg-red-900/30 border border-red-500 rounded-lg text-center">
                <p className="text-red-200 mb-3">{errorMessage}</p>
                <button
                  onClick={handleHardRefresh}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 transition-colors rounded-md text-white"
                >
                  Refresh Halaman
                </button>
              </div>
            )}
            
            {/* Audio player component */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mb-8"
            >
              <AudioPlayer
                onTimeUpdate={handleTimeUpdate}
                onPlayStateChange={handlePlayStateChange}
                onAudioLevelUpdate={handleAudioLevelUpdate}
                onDurationUpdate={handleDurationUpdate}
                onError={handleError}
                isPlaying={isPlaying}
                currentTime={currentTime}
              />
            </motion.div>
            
            {/* Visualizer components */}
            <Suspense fallback={<LoadingFallback />}>
              {isInitialized && (
                <>
                  {/* Code visualizer overlay */}
                  <CodeVisualizer
                    currentTime={currentTime}
                    isPlaying={isPlaying}
                    currentLyric={currentLyric}
                    isMobile={isMobile}
                    audioLevel={audioLevel}
                  />
                  
                  {/* Lyrics visualizer overlay */}
                  <LyricsVisualizer
                    currentTime={currentTime}
                    isPlaying={isPlaying}
                    audioLevel={audioLevel}
                  />
                </>
              )}
            </Suspense>
          </div>
        </main>
        
        {/* Footer */}
        <footer className="absolute bottom-0 left-0 right-0 py-2 px-4 text-center text-xs text-gray-500 z-20">
          <p>Created with ❤️ using React + Framer Motion</p>
        </footer>
      </div>
    </ErrorBoundary>
  );
};

export default DieWithASmile;