import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format time for audio player
export function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

// Generate random number between min and max
export function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Create ripple effect for buttons
export function createRipple(event) {
  const button = event.currentTarget;
  const rect = button.getBoundingClientRect();

  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const ripple = document.createElement("span");
  ripple.classList.add("ripple");
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;

  button.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, 1000);
}

// Debounce function - throttle function calls
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function - limits execution rate
export function throttle(func, limit) {
  let lastFunc;
  let lastRan;
  return function() {
    const context = this;
    const args = arguments;
    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(function() {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

// Detects low-performance devices
export function isLowPerfDevice() {
  // Check for mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Check for older browsers
  const isOldBrowser = /MSIE|Trident|Edge\/1[0-5]/i.test(navigator.userAgent);
  
  // Check for reasonable CPU cores (if available)
  const hasWeakCPU = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
  
  return isMobile || isOldBrowser || hasWeakCPU;
}

// SRT timestamp conversion - more precise
export function srtTimestampToSeconds(timestamp) {
  // Format: 00:00:00,000 or 00:00:00.000
  const normalizedTimestamp = timestamp.replace(',', '.');
  const [hours, minutes, seconds] = normalizedTimestamp.split(':');
  const [secondsInt, milliseconds] = seconds.split('.');
  
  return (
    parseInt(hours, 10) * 3600 +
    parseInt(minutes, 10) * 60 +
    parseInt(secondsInt, 10) +
    parseInt(milliseconds, 10) / 1000
  );
}

// Optimized SRT parser based on provided SRT file
export function parseSRT(srtContent) {
  const subtitles = [];
  const blocks = srtContent.trim().split(/\r?\n\r?\n/);
  
  blocks.forEach(block => {
    const lines = block.split(/\r?\n/);
    if (lines.length < 3) return; // Skip invalid blocks
    
    // First line is subtitle number (ignore)
    // Second line contains timestamps
    const timestampLine = lines[1];
    const timestampMatch = timestampLine.match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
    
    if (!timestampMatch) return; // Skip if timestamp format is invalid
    
    const startTime = srtTimestampToSeconds(timestampMatch[1]);
    const endTime = srtTimestampToSeconds(timestampMatch[2]);
    
    // Remaining lines contain the subtitle text
    const text = lines.slice(2).join(' ').replace(/♪/g, '').trim();
    
    subtitles.push({
      start: startTime,
      end: endTime,
      text: text
    });
  });
  
  return subtitles;
}

// Optimized lyrics data based on the provided SRT file
export const lyrics = [
  { time: 0.00, text: "" }, // Start with empty for visual buffer
  { time: 2.50, text: "Uhh" },
  { time: 3.10, text: "Uhh" },
  { time: 5.50, text: "" }, // Silence
  { time: 7.70, text: "I" },
  { time: 8.90, text: "I just woke up" },
  { time: 9.10, text: "from a dream" },
  { time: 13.90, text: "Where you and I" },
  { time: 15.00, text: "had to say goodbye" },
  { time: 19.50, text: "And I don't know" },
  { time: 20.80, text: "what it all means" },
  { time: 23.90, text: "But since I survived" },
  { time: 24.80, text: "I realized" },
  { time: 27.50, text: "Wherever you go" },
  { time: 28.80, text: "that's where I'll follow" },
  { time: 33.367, text: "Nobody's" },
  { time: 33.90, text: "promised tomorrow" },
  { time: 37.997, text: "So I'mma love you every night" },
  { time: 40.20, text: "like it's the last night" },
  { time: 42.042, text: "Like it's the last night" },
  { time: 44.211, text: "If the world was ending" },
  { time: 46.500, text: "I'd wanna be next to you" },
  { time: 53.179, text: "If the party was over" },
  { time: 55.500, text: "and our time on Earth was through" },
  { time: 62.271, text: "I'd wanna hold you" },
  { time: 64.500, text: "just for a while" },
  { time: 66.942, text: "And die with a smile" },
  { time: 71.489, text: "If the world was ending" },
  { time: 73.800, text: "I'd wanna be next to you" },
  { time: 80.539, text: "Woo" },
  { time: 81.500, text: "ooh" },
  { time: 84.585, text: "Ooh" },
  { time: 85.500, text: "lost" },
  { time: 88.088, text: "Lost in the words" },
  { time: 89.20, text: "that we scream" },
  { time: 92.343, text: "I don't even wanna" },
  { time: 93.50, text: "do this anymore" },
  { time: 97.139, text: "'Cause you already know" },
  { time: 98.50, text: "what you mean to me" },
  { time: 100.726, text: "And our love is the only war" },
  { time: 102.80, text: "worth fighting for" },
  { time: 106.315, text: "Wherever you go" },
  { time: 107.50, text: "that's where I'll follow" },
  { time: 110.945, text: "Nobody's" },
  { time: 111.50, text: "promised tomorrow" },
  { time: 115.407, text: "So I'mma love you every night" },
  { time: 117.80, text: "like it's the last night" },
  { time: 119.328, text: "Like it's the last night" },
  { time: 121.789, text: "If the world was ending" },
  { time: 124.100, text: "I'd wanna be next to you" },
  { time: 130.673, text: "If the party was over" },
  { time: 133.425, text: "And our time on Earth was through" },
  { time: 139.723, text: "I'd wanna hold you" },
  { time: 142.101, text: "Just for a while" },
  { time: 144.311, text: "And die with a smile" },
  { time: 149.066, text: "If the world was ending" },
  { time: 151.300, text: "I'd wanna be next to you" },
  { time: 157.616, text: "Right next to you" },
  { time: 162.454, text: "Next to you" },
  { time: 166.959, text: "Right next to you" },
  { time: 170.671, text: "(Vocalizing)" }, // Simplified
  { time: 175.467, text: "" }, // Silence
  { time: 189.982, text: "If the world was ending" },
  { time: 192.200, text: "I'd wanna be next to you" },
  { time: 199.074, text: "If the party was over" },
  { time: 201.300, text: "and our time on Earth was through" },
  { time: 208.167, text: "I'd wanna hold you" },
  { time: 210.400, text: "just for a while" },
  { time: 212.838, text: "And die with a smile" },
  { time: 217.468, text: "If the world was ending" },
  { time: 219.700, text: "I'd wanna be next to you" },
  { time: 226.185, text: "If the world was ending" },
  { time: 228.400, text: "I'd wanna be next to you" },
  { time: 232.942, text: "" }, // Silence
  { time: 235.444, text: "(Vocalizing)" },
  { time: 238.739, text: "I'd wanna be next to you" },
  { time: 242.409, text: "" } // End silence
];

// Chorus lines for special highlighting
export const chorusLines = [
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

// Beat drop timestamp ranges - for enhanced visual effects
export const beatDropRanges = [
  [44.5, 48],    // First chorus start
  [149, 152],    // Later chorus start
  [190, 194],    // Final chorus start
  [217, 221],    // Outro chorus
];

// Check if current time is during a beat drop
export function isInBeatDrop(currentTime) {
  return beatDropRanges.some(([start, end]) => 
    currentTime >= start && currentTime <= end
  );
}

// Get current active lyric - more accurate
export function getCurrentLyric(currentTime) {
  if (!currentTime) return null;
  
  // Binary search for better performance with sorted data
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
      return { index: nextIndex, text: lyrics[nextIndex].text };
    }
    return { index: result, text: lyrics[result].text };
  }

  return null;
}

// Check if lyric is a chorus line - optimized
export function isChorusLine(text) {
  if (!text) return false;
  
  return chorusLines.some(line => 
    text.includes(line) || line.includes(text)
  );
}

// Calculate the duration of a lyric line
export function getLyricDuration(index) {
  if (index < 0 || index >= lyrics.length - 1) return 3; // Default duration
  
  return lyrics[index + 1].time - lyrics[index].time;
}

// Find active lyric word at specific time point for word-by-word animation
export function getActiveWord(currentTime, lineStartTime, lineDuration, wordCount) {
  if (!currentTime || !lineStartTime || !lineDuration || !wordCount) return -1;
  
  // Calculate elapsed time since line started
  const elapsedTime = currentTime - lineStartTime;
  if (elapsedTime < 0) return -1;
  
  // Calculate time per word for highlights
  const timePerWord = lineDuration / wordCount;
  
  // Get the current word index based on elapsed time
  const currentWordIndex = Math.min(Math.floor(elapsedTime / timePerWord), wordCount - 1);
  
  return Math.max(0, currentWordIndex);
}

// Get lyrics with precise timing info for word-by-word highlighting
export function getLyricTimingInfo(currentIndex) {
  if (currentIndex < 0 || currentIndex >= lyrics.length) return null;
  
  const currentLyric = lyrics[currentIndex];
  const nextLyric = lyrics[currentIndex + 1];
  
  // Calculate duration between this lyric and the next
  let duration = 2; // default if no next lyric
  if (nextLyric) {
    duration = nextLyric.time - currentLyric.time;
  }
  
  // Split into words and filter empty strings
  const words = currentLyric.text.split(' ').filter(w => w.trim().length > 0);
  
  return {
    startTime: currentLyric.time,
    duration: duration,
    wordCount: words.length,
    words: words,
    isChorus: isChorusLine(currentLyric.text)
  };
}

// Calculate audio intensity from frequency data
export function calculateAudioIntensity(audioData) {
  if (!audioData || audioData.length === 0) return 1;
  
  // Calculate the average of low frequencies (bass)
  const bassRange = Math.min(10, audioData.length);
  let bassSum = 0;
  
  for (let i = 0; i < bassRange; i++) {
    bassSum += audioData[i] || 0;
  }
  
  const bassAvg = bassSum / (bassRange * 255); // Normalize to 0-1
  
  // Scale for more dramatic effect (1.0 - 2.0 range)
  return 1 + bassAvg;
}

// Detect beat from audio data
export function detectBeat(audioData, threshold = 0.5, lastBeatTime = 0) {
  if (!audioData || audioData.length === 0) return false;
  
  // Calculate intensity
  const intensity = calculateAudioIntensity(audioData);
  
  // Cooldown to prevent too frequent beat detection
  const now = Date.now();
  const beatCooldown = 300; // ms
  
  // Return beat detection result
  return intensity > threshold && (now - lastBeatTime) > beatCooldown ? now : false;
}

// Generate artistic curve points for visual effects
export function generateCurvePoints(count, amplitude, frequency) {
  const points = [];
  for (let i = 0; i < count; i++) {
    const x = i / (count - 1);
    const y = Math.sin(x * frequency * Math.PI) * amplitude;
    points.push({ x, y });
  }
  return points;
}

// Create a smooth wave path for SVG
export function createWavePath(points, width, height, centerY) {
  if (!points || points.length < 2) return '';
  
  let path = `M 0 ${centerY}`;
  
  for (let i = 0; i < points.length - 1; i++) {
    const currentPoint = points[i];
    const nextPoint = points[i + 1];
    
    // Calculate control points for smooth curve
    const controlX = (currentPoint.x + nextPoint.x) / 2 * width;
    
    path += ` S ${controlX} ${centerY + currentPoint.y * height}, ${nextPoint.x * width} ${centerY + nextPoint.y * height}`;
  }
  
  return path;
}