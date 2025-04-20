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

// Updated SRT timestamp conversion that is more precise
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
  { time: 0.00, text: "..." },
  { time: 3.295, text: "UHH UHH" },
  { time: 6.381, text: "..." },
  { time: 8.634, text: "I, I JUST WOKE UP FROM A DREAM" },
  { time: 15.557, text: "WHERE YOU AND I HAD TO SAY GOODBYE" },
  { time: 20.270, text: "AND I DON'T KNOW WHAT IT ALL MEANS" },
  { time: 24.775, text: "BUT SINCE I SURVIVED I REALIZED" },
  { time: 29.071, text: "WHEREVER YOU GO THAT'S WHERE I'LL FOLLOW" },
  { time: 33.867, text: "NOBODY'S PROMISED TOMORROW" },
  { time: 38.497, text: "SO IMMA LOVE YOU EVERY NIGHT LIKE IT'S THE LAST NIGHT" },
  { time: 42.542, text: "LIKE IT'S THE LAST NIGHT" },
  { time: 44.711, text: "IF THE WORLD WAS ENDING I'D WANNA BE NEXT TO YOU" },
  { time: 53.679, text: "IF THE PARTY WAS OVER AND OUR TIME ON EARTH WAS THROUGH" },
  { time: 62.771, text: "I'D WANNA HOLD YOU JUST FOR A WHILE" },
  { time: 67.442, text: "AND DIE WITH A SMILE" },
  { time: 71.989, text: "IF THE WORLD WAS ENDING I'D WANNA BE NEXT TO YOU" },
  { time: 81.039, text: "WOO OOH" },
  { time: 85.085, text: "OOH LOST" },
  { time: 88.588, text: "LOST IN THE WORDS THAT WE SCREAM" },
  { time: 92.843, text: "I DON'T EVEN WANNA DO THIS ANYMORE" },
  { time: 97.639, text: "CUZ YOU ALREADY KNOW WHAT YOU MEAN TO ME" },
  { time: 101.226, text: "AND OUR LOVE IS THE ONLY WAR WORTH FIGHTING FOR" },
  { time: 106.815, text: "WHEREVER YOU GO THAT'S WHERE I'LL FOLLOW" },
  { time: 111.445, text: "NOBODY'S PROMISED TOMORROW" },
  { time: 115.907, text: "SO IMMA LOVE YOU EVERY NIGHT LIKE IT'S THE LAST NIGHT" },
  { time: 119.828, text: "LIKE IT'S THE LAST NIGHT" },
  { time: 122.289, text: "IF THE WORLD WAS ENDING I'D WANNA BE NEXT TO YOU" },
  { time: 131.173, text: "IF THE PARTY WAS OVER" },
  { time: 133.925, text: "AND OUR TIME ON EARTH WAS THROUGH" },
  { time: 140.223, text: "I'D WANNA HOLD YOU" },
  { time: 142.601, text: "JUST FOR A WHILE" },
  { time: 144.811, text: "AND DIE WITH A SMILE" },
  { time: 149.566, text: "IF THE WORLD WAS ENDING I'D WANNA BE NEXT TO YOU" },
  { time: 158.116, text: "RIGHT NEXT TO YOU" },
  { time: 162.954, text: "NEXT TO YOU" },
  { time: 167.459, text: "RIGHT NEXT TO YOU" },
  { time: 171.171, text: "[BOTH VOCALIZING]" },
  { time: 175.967, text: "..." },
  { time: 190.482, text: "IF THE WORLD WAS ENDING I'D WANNA BE NEXT TO YOU" },
  { time: 199.574, text: "IF THE PARTY WAS OVER AND OUR TIME ON EARTH WAS THROUGH" },
  { time: 208.667, text: "I'D WANNA HOLD YOU JUST FOR A WHILE" },
  { time: 213.338, text: "AND DIE WITH A SMILE" },
  { time: 217.968, text: "IF THE WORLD WAS ENDING I'D WANNA BE NEXT TO YOU" },
  { time: 226.685, text: "IF THE WORLD WAS ENDING I'D WANNA BE NEXT TO YOU" },
  { time: 233.442, text: "..." },
  { time: 235.944, text: "[VOCALIZING]" },
  { time: 239.239, text: "I'D WANNA BE NEXT TO YOU" },
  { time: 242.909, text: "..." }
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

// Updated SRT data based on exact timing
export const srtData = `1
00:00:00,626 --> 00:00:03,212
♪♪♪
2
00:00:03,295 --> 00:00:06,298
♪ UHH UHH ♪
3
00:00:06,381 --> 00:00:08,550
♪♪♪
4
00:00:08,634 --> 00:00:14,932
♪ I, I JUST WOKE UP
FROM A DREAM ♪
5
00:00:15,557 --> 00:00:18,977
♪ WHERE YOU AND I HAD
TO SAY GOODBYE ♪
6
00:00:20,270 --> 00:00:23,941
♪ AND I DON'T KNOW
WHAT IT ALL MEANS ♪
7
00:00:24,775 --> 00:00:28,528
♪ BUT SINCE I SURVIVED
I REALIZED ♪
8
00:00:29,071 --> 00:00:33,700
♪ WHEREVER YOU GO
THAT'S WHERE I'LL FOLLOW ♪
9
00:00:33,867 --> 00:00:37,996
♪ NOBODY'S PROMISED TOMORROW ♪
10
00:00:38,497 --> 00:00:42,042
♪ SO IMMA LOVE YOU EVERY NIGHT
LIKE IT'S THE LAST NIGHT ♪
11
00:00:42,542 --> 00:00:44,336
♪ LIKE IT'S THE LAST NIGHT ♪
12
00:00:44,711 --> 00:00:53,345
♪ IF THE WORLD WAS ENDING
I'D WANNA BE NEXT (TO YOU) ♪
13
00:00:53,679 --> 00:01:02,521
♪ IF THE PARTY WAS OVER AND OUR
TIME ON EARTH (WAS THROUGH) ♪
14
00:01:02,771 --> 00:01:07,359
♪ I'D WANNA HOLD YOU
JUST FOR A WHILE ♪
15
00:01:07,442 --> 00:01:11,446
♪ AND DIE WITH A SMILE ♪
16
00:01:11,989 --> 00:01:19,037
♪ IF THE WORLD WAS ENDING
I'D WANNA BE NEXT TO YOU ♪
17
00:01:21,039 --> 00:01:23,583
♪ (WOO OOH) ♪
18
00:01:25,085 --> 00:01:27,546
♪ OOH LOST ♪
19
00:01:28,588 --> 00:01:31,842
♪ LOST IN THE WORDS
THAT WE SCREAM ♪
20
00:01:32,843 --> 00:01:37,306
♪ I DON'T EVEN WANNA
DO THIS ANYMORE ♪
21
00:01:37,639 --> 00:01:40,892
[DUO] ♪ CUZ YOU ALREADY
KNOW WHAT YOU MEAN TO ME ♪
22
00:01:41,226 --> 00:01:45,564
♪ AND OUR LOVE IS THE ONLY
WAR WORTH FIGHTING FOR ♪
23
00:01:46,815 --> 00:01:50,944
♪ WHEREVER YOU GO
THAT'S WHERE I'LL FOLLOW ♪
24
00:01:51,445 --> 00:01:55,198
♪ NOBODY'S PROMISED TOMORROW ♪
25
00:01:55,907 --> 00:01:59,453
♪ SO IMMA LOVE YOU EVERY NIGHT
LIKE IT'S THE LAST NIGHT ♪
26
00:01:59,828 --> 00:02:01,496
♪ LIKE IT'S THE LAST NIGHT ♪
27
00:02:02,289 --> 00:02:10,797
♪ IF THE WORLD WAS ENDING
I'D WANNA BE NEXT TO YOU ♪
28
00:02:11,173 --> 00:02:13,842
♪ IF THE PARTY WAS OVER ♪
29
00:02:13,925 --> 00:02:20,140
♪ AND OUR TIME ON EARTH
WAS THROUGH ♪
30
00:02:20,223 --> 00:02:22,184
♪ I'D WANNA HOLD YOU ♪
31
00:02:22,601 --> 00:02:24,227
♪ JUST FOR A WHILE ♪
32
00:02:24,811 --> 00:02:28,857
♪ AND DIE WITH A SMILE ♪
33
00:02:29,566 --> 00:02:35,697
♪ IF THE WORLD WAS ENDING
I'D WANNA BE NEXT TO YOU ♪
34
00:02:38,116 --> 00:02:40,786
♪ RIGHT NEXT TO YOU ♪
35
00:02:42,954 --> 00:02:45,832
♪ NEXT TO YOU ♪
36
00:02:47,459 --> 00:02:50,420
♪ RIGHT NEXT TO YOU ♪
37
00:02:51,171 --> 00:02:54,216
♪ [BOTH VOCALIZING] ♪
38
00:02:55,967 --> 00:02:59,638
♪♪♪
39
00:03:10,482 --> 00:03:17,280
♪ IF THE WORLD WAS ENDING
I'D WANNA BE NEXT (TO YOU) ♪
40
00:03:19,574 --> 00:03:26,957
♪ IF THE PARTY WAS OVER
AND OUR TIME ON EARTH
(WAS THROUGH) ♪
41
00:03:28,667 --> 00:03:32,712
♪ I'D WANNA HOLD YOU
JUST FOR A WHILE ♪
42
00:03:33,338 --> 00:03:37,259
♪ AND DIE WITH A SMILE ♪
43
00:03:37,968 --> 00:03:45,058
♪ IF THE WORLD WAS ENDING
I'D WANNA BE NEXT TO YOU ♪
44
00:03:46,685 --> 00:03:53,358
♪ IF THE WORLD WAS ENDING
I'D WANNA BE NEXT TO YOU ♪
45
00:03:53,442 --> 00:03:55,235
♪♪♪
46
00:03:55,944 --> 00:03:59,156
♪ [VOCALIZING] ♪
47
00:03:59,239 --> 00:04:02,909
♪ I'D WANNA BE NEXT TO YOU ♪`;

// Get current active lyric - more accurate
export function getCurrentLyric(currentTime) {
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

// Find active lyric word at specific time point for word-by-word animation
export function getActiveWord(currentTime, lineStartTime, lineDuration, wordCount) {
  if (!currentTime || !lineStartTime || !lineDuration || !wordCount) return -1;
  
  const elapsedTime = currentTime - lineStartTime;
  if (elapsedTime < 0) return -1;
  
  const timePerWord = lineDuration / wordCount;
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
  
  const words = currentLyric.text.split(' ').filter(w => w.trim().length > 0);
  
  return {
    startTime: currentLyric.time,
    duration: duration,
    wordCount: words.length,
    words: words,
    isChorus: isChorusLine(currentLyric.text)
  };
}