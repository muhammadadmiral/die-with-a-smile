import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

// Simplified yet enhanced Background component without mouse influence
const Background = ({ isPlaying, audioLevel = [], currentLyric, isChorus }) => {
  // State
  const [windowSize, setWindowSize] = useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800 
  });
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  // Refs
  const canvasRef = useRef(null);
  const starsRef = useRef([]);
  const particlesRef = useRef([]);
  const requestRef = useRef(null);
  const contextRef = useRef(null);
  const isMountedRef = useRef(true);
  const lastRenderTimeRef = useRef(0);
  const hueRef = useRef(280); // Initial color: purple
  const intensityRef = useRef({ current: 0.5, target: 0.5 });
  const lyricsInfluenceRef = useRef({ x: 0, y: 0, strength: 0 });

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!isMountedRef.current) return;
      
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Update colors and intensity based on chorus and lyrics
  useEffect(() => {
    // Update color hue based on chorus status
    hueRef.current = isChorus ? 320 : 280; // Pink for chorus, purple for verse
    
    // Update intensity based on chorus status
    intensityRef.current.target = isChorus ? 0.8 : 0.5;
    
    // Update lyrics influence
    if (currentLyric && currentLyric !== "...") {
      // Create a gentle flow effect based on lyrics content
      const lyricLength = currentLyric.length;
      const influenceX = Math.sin(lyricLength * 0.2) * windowSize.width * 0.3;
      const influenceY = Math.cos(lyricLength * 0.3) * windowSize.height * 0.3;
      
      lyricsInfluenceRef.current = {
        x: influenceX,
        y: influenceY,
        strength: Math.min(1, lyricLength / 30) * 0.6
      };
    } else {
      lyricsInfluenceRef.current = { x: 0, y: 0, strength: 0 };
    }
  }, [isChorus, currentLyric, windowSize]);

  // Initialize canvas and start animation
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: true });
    contextRef.current = ctx;

    // Set canvas size
    const setupCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = windowSize.width * dpr;
      canvas.height = windowSize.height * dpr;
      canvas.style.width = `${windowSize.width}px`;
      canvas.style.height = `${windowSize.height}px`;
      
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    // Initialize stars
    const setupStars = () => {
      const starDensity = isMobile ? 0.00008 : 0.00012;
      const maxStars = isMobile ? 80 : 150;
      
      const calculatedCount = Math.floor(windowSize.width * windowSize.height * starDensity);
      const starCount = Math.min(calculatedCount, maxStars);

      starsRef.current = Array.from({ length: starCount }, () => ({
        x: Math.random() * windowSize.width,
        y: Math.random() * windowSize.height,
        size: Math.random() * 1.5 + 0.5,
        speed: Math.random() * 0.03 + 0.01,
        brightness: Math.random() * 0.7 + 0.3,
        pulseDelta: Math.random() * 0.005 + 0.002,
        hue: Math.random() * 60 + hueRef.current,
        opacity: Math.random() * 0.5 + 0.5,
        twinkle: Math.random() > 0.6
      }));
    };

    // Initialize floating particles
    const setupParticles = () => {
      const particleDensity = isMobile ? 0.000015 : 0.00003;
      const maxParticles = isMobile ? 12 : 25;
      
      const calculatedCount = Math.floor(windowSize.width * windowSize.height * particleDensity);
      const particleCount = Math.min(calculatedCount, maxParticles);

      particlesRef.current = Array.from({ length: particleCount }, () => ({
        x: Math.random() * windowSize.width,
        y: Math.random() * windowSize.height,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 0.2 + 0.1,
        dirX: Math.random() * 2 - 1,
        dirY: Math.random() * 2 - 1,
        hue: Math.random() * 60 + hueRef.current,
        opacity: Math.random() * 0.3 + 0.1,
        decay: Math.random() * 0.008 + 0.003
      }));
    };

    // Setup all elements
    const setupAll = () => {
      setupCanvas();
      setupStars();
      setupParticles();
    };
    
    setupAll();
    window.addEventListener("resize", setupAll);

    // Animation loop
    const animate = (timestamp) => {
      if (!isMountedRef.current || !canvas || !ctx) {
        if (requestRef.current) {
          cancelAnimationFrame(requestRef.current);
        }
        return;
      }

      // Limit framerate for performance
      if (timestamp - lastRenderTimeRef.current < 33) { // ~30fps
        requestRef.current = requestAnimationFrame(animate);
        return;
      }
      lastRenderTimeRef.current = timestamp;

      // Clear with trail effect
      ctx.fillStyle = "rgba(10, 10, 20, 0.2)";
      ctx.fillRect(0, 0, windowSize.width, windowSize.height);

      // Get audio reactivity
      const getAudioReactivity = () => {
        if (!audioLevel || audioLevel.length === 0) return 1;

        // Focus on bass frequencies
        const bassRange = Math.min(audioLevel.length, 20);
        let bassSum = 0;

        for (let i = 0; i < bassRange; i++) {
          bassSum += audioLevel[i];
        }

        const bassAvg = bassSum / bassRange / 255;
        return 1 + (bassAvg * 1.5); // Scale effect
      };

      const audioReactivity = getAudioReactivity();
      
      // Smooth intensity transition
      intensityRef.current.current += 
        (intensityRef.current.target - intensityRef.current.current) * 0.05;

      // Render stars
      const maxStarsToRender = isMobile ? 70 : 120;
      const starsToRender = Math.min(starsRef.current.length, maxStarsToRender);

      ctx.save();
      
      for (let i = 0; i < starsToRender; i++) {
        const star = starsRef.current[i];

        // Twinkle effect
        star.brightness += star.pulseDelta;
        if (star.brightness > 1 || star.brightness < 0.3) {
          star.pulseDelta = -star.pulseDelta;
        }

        let twinkleFactor = star.twinkle ? 
          0.7 + Math.sin(timestamp * 0.001 * (Math.random() * 0.5 + 0.5)) * 0.3 : 1;

        // Audio influence
        let audioEffect = 0;
        if (isPlaying && audioLevel.length > 0 && i % 5 === 0) { // Process just some stars
          const index = Math.floor((i / starsToRender) * audioLevel.length);
          audioEffect = (audioLevel[index] || 0) / 255 * 0.3;
        }

        // Lyrics/Chorus influence (replacing mouse influence)
        let lyricsEffect = 0;
        if (lyricsInfluenceRef.current.strength > 0) {
          // Distance from influence center
          const dx = (windowSize.width/2 + lyricsInfluenceRef.current.x) - star.x;
          const dy = (windowSize.height/2 + lyricsInfluenceRef.current.y) - star.y;
          const distSq = dx*dx + dy*dy;
          const maxDistSq = (windowSize.width * 0.6) ** 2;
          
          if (distSq < maxDistSq) {
            lyricsEffect = lyricsInfluenceRef.current.strength * (1 - distSq / maxDistSq);
          }
        }

        // Combined effects
        const finalBrightness = star.brightness * twinkleFactor + audioEffect + lyricsEffect;
        const finalSize = star.size * (1 + audioEffect * 0.7 + lyricsEffect * 0.3);
        const opacity = finalBrightness * (isPlaying ? 1 : 0.7);

        // Draw star
        ctx.fillStyle = `hsla(${star.hue}, 90%, 80%, ${opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, finalSize, 0, Math.PI * 2);
        ctx.fill();

        // Glow effect for bright stars
        if (finalBrightness > 0.7) {
          ctx.shadowBlur = finalSize * 3;
          ctx.shadowColor = `hsla(${star.hue}, 90%, 80%, 0.7)`;
        } else {
          ctx.shadowBlur = 0;
        }

        // Move star with added chorus & lyrics influence 
        const baseSpeed = star.speed * (isPlaying ? audioReactivity : 0.5);
        
        // Add some direction influence based on chorus/lyrics
        let xInfluence = 0;
        let yInfluence = baseSpeed;
        
        if (isChorus) {
          // During chorus, add some horizontal sway
          xInfluence = Math.sin(timestamp * 0.001 + star.y * 0.01) * 0.3;
        }
        
        if (lyricsInfluenceRef.current.strength > 0) {
          // Add subtle pull toward lyrics influence point
          const centerX = windowSize.width/2 + lyricsInfluenceRef.current.x;
          const centerY = windowSize.height/2 + lyricsInfluenceRef.current.y;
          
          const dx = centerX - star.x;
          const dy = centerY - star.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist > 0) {
            xInfluence += (dx / dist) * 0.1 * lyricsInfluenceRef.current.strength;
            yInfluence += (dy / dist) * 0.1 * lyricsInfluenceRef.current.strength;
          }
        }
        
        star.x += xInfluence;
        star.y += yInfluence;
        
        // Wrap around screen
        if (star.y > windowSize.height) {
          star.y = 0;
          star.x = Math.random() * windowSize.width;
          star.hue = Math.random() * 60 + hueRef.current;
        }
        
        // Keep stars within horizontal bounds
        if (star.x < 0) star.x = windowSize.width;
        if (star.x > windowSize.width) star.x = 0;
      }
      
      ctx.restore();

      // Render particles with chorus influence
      const maxParticlesToRender = isMobile ? 10 : 20;
      const particlesToRender = Math.min(particlesRef.current.length, maxParticlesToRender);

      ctx.save();
      
      for (let i = 0; i < particlesToRender; i++) {
        const p = particlesRef.current[i];

        // Audio reactivity
        let audioFactor = 1;
        if (isPlaying && audioLevel.length > 0 && i % 2 === 0) {
          const index = Math.floor((i / particlesToRender) * audioLevel.length);
          audioFactor = 1 + (audioLevel[index] || 0) / 255;
        }

        // Chorus influence on particles
        if (isChorus) {
          // More dynamic movement during chorus
          p.dirX += (Math.random() - 0.5) * 0.05;
          p.dirY += (Math.random() - 0.5) * 0.05;
          
          // Normalize direction vector to prevent extreme speeds
          const mag = Math.sqrt(p.dirX * p.dirX + p.dirY * p.dirY);
          if (mag > 0) {
            p.dirX = p.dirX / mag;
            p.dirY = p.dirY / mag;
          }
        }

        // Lyrics influence on particles
        if (lyricsInfluenceRef.current.strength > 0) {
          const centerX = windowSize.width/2 + lyricsInfluenceRef.current.x;
          const centerY = windowSize.height/2 + lyricsInfluenceRef.current.y;
          
          const dx = centerX - p.x;
          const dy = centerY - p.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist > 0) {
            p.dirX += (dx / dist) * 0.01 * lyricsInfluenceRef.current.strength;
            p.dirY += (dy / dist) * 0.01 * lyricsInfluenceRef.current.strength;
          }
        }

        // Update position
        p.x += p.dirX * p.speed * audioFactor;
        p.y += p.dirY * p.speed * audioFactor;

        // Bounce off edges
        if (p.x < 0 || p.x > windowSize.width) p.dirX *= -1;
        if (p.y < 0 || p.y > windowSize.height) p.dirY *= -1;

        // Draw particle
        if (isMobile) {
          // Simple circle for mobile
          ctx.fillStyle = `hsla(${p.hue}, 80%, 75%, ${p.opacity})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Gradient for desktop
          const grad = ctx.createRadialGradient(
            p.x, p.y, 0, p.x, p.y, p.size * 1.5
          );
          grad.addColorStop(0, `hsla(${p.hue}, 80%, 75%, ${p.opacity})`);
          grad.addColorStop(1, `hsla(${p.hue}, 80%, 50%, 0)`);
          
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Fade out and reset
        p.opacity -= p.decay;
        if (p.opacity <= 0) {
          p.x = Math.random() * windowSize.width;
          p.y = Math.random() * windowSize.height;
          p.opacity = Math.random() * 0.3 + 0.1;
          p.hue = Math.random() * 60 + hueRef.current;
        }
      }
      
      ctx.restore();

      // Draw aurora effect during chorus
      if (isChorus && isPlaying && !isMobile) {
        // Bottom wave effect
        const waveCount = 3;
        const baseY = windowSize.height * 0.65;

        for (let w = 0; w < waveCount; w++) {
          const hue = hueRef.current - 40 + w * 20;
          
          ctx.beginPath();
          ctx.moveTo(0, baseY + Math.sin(timestamp * 0.0005 + w) * 50);

          const pointCount = 10;
          for (let i = 0; i <= pointCount; i++) {
            const x = (windowSize.width / pointCount) * i;
            const wave1 = Math.sin(timestamp * 0.0005 + i * 0.2 + w) * 50;
            const wave2 = Math.sin(timestamp * 0.0008 + i * 0.3) * 30;

            const y = baseY + (wave1 + wave2) * audioReactivity * 0.7;
            
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }

          ctx.lineTo(windowSize.width, windowSize.height);
          ctx.lineTo(0, windowSize.height);
          ctx.closePath();

          const gradient = ctx.createLinearGradient(0, baseY - 100, 0, baseY + 100);
          gradient.addColorStop(0, `hsla(${hue}, 90%, 75%, 0)`);
          gradient.addColorStop(0.5, `hsla(${hue}, 90%, 75%, ${0.15 * audioReactivity * intensityRef.current.current})`);
          gradient.addColorStop(1, `hsla(${hue}, 90%, 60%, 0)`);

          ctx.fillStyle = gradient;
          ctx.fill();
        }
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      window.removeEventListener("resize", setupAll);
    };
  }, [isPlaying, isChorus, audioLevel, isMobile, windowSize, currentLyric]);

  return (
    <>
      {/* Base gradient background */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#0f0a20] via-[#120824] to-[#0a0a18] z-[-10]" />

      {/* Canvas for stars and particles */}
      <canvas 
        ref={canvasRef} 
        className="fixed inset-0 z-[-9]" 
        style={{ 
          filter: "blur(0.5px)",
          willChange: "transform",
          transform: "translateZ(0)"
        }} 
      />

      {/* Subtle noise texture */}
      <div className="fixed inset-0 z-[-8] opacity-[0.03] pointer-events-none bg-noise" />

      {/* Vignette effect */}
      <div className="fixed inset-0 z-[-7] pointer-events-none shadow-vignette" />

      {/* Reactive center glow */}
      <motion.div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96 z-[-6] pointer-events-none"
        animate={{
          opacity: isPlaying ? (isChorus ? 0.6 : 0.3) : 0.05,
        }}
        transition={{ duration: 0.5 }}
        style={{
          background: `radial-gradient(circle, rgba(${isChorus ? "227,74,123" : "123,58,237"},0.4) 0%, rgba(${isChorus ? "123,58,237" : "227,74,123"},0.2) 50%, rgba(0,0,0,0) 70%)`,
          filter: "blur(30px)"
        }}
      />

      {/* Horizontal accent lines */}
      {isPlaying && (
        <div className="fixed inset-0 z-[-5] pointer-events-none">
          <motion.div
            className="absolute top-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/20 to-transparent"
            animate={{
              y: [-5, 5, -5],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              repeatType: "loop"
            }}
          />

          <motion.div
            className="absolute bottom-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-secondary-500/20 to-transparent"
            animate={{
              y: [5, -5, 5],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              repeatType: "loop",
              delay: 2
            }}
          />
        </div>
      )}

      {/* Chorus-specific effect */}
      {isChorus && (
        <motion.div
          className="fixed inset-0 z-[-4] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-radial from-primary-500/10 via-secondary-500/5 to-transparent"
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.5, 0.7, 0.5]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              repeatType: "mirror"
            }}
          />
        </motion.div>
      )}

      {/* Bottom gradient */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[-3] pointer-events-none"
        animate={{
          opacity: isPlaying ? (isChorus ? 0.3 : 0.2) : 0.1,
          height: isPlaying ? [80, 100, 80] : 60
        }}
        transition={{
          opacity: { duration: 0.5 },
          height: { duration: 5, repeat: Infinity, repeatType: "mirror" }
        }}
        style={{
          background: `linear-gradient(to top, rgba(${isChorus ? "227,74,123" : "123,58,237"},0.15) 0%, transparent 100%)`
        }}
      />
    </>
  );
};

export default Background;