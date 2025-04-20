import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion, useAnimationControls } from "framer-motion";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import {
  Stars,
  Trail,
  Cloud,
  Sparkles
} from "@react-three/drei";

import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  GodRays,
  Vignette
} from "@react-three/postprocessing";

// Utility functions
const lerp = (start, end, t) => start + (end - start) * t;
const random = (min, max) => Math.random() * (max - min) + min;
const randomInt = (min, max) => Math.floor(random(min, max));

// Configuration object for better organization and tuning
const CONFIG = {
  MOBILE: {
    CAMERA_DISTANCE: 25,
    PARTICLE_COUNT: 2000,
    STAR_COUNT: 3000,
    PLANET_SCALE: 0.7,
    NEBULA_SCALE: 1.2,
    SHOW_SECONDARY_EFFECTS: false
  },
  DESKTOP: {
    CAMERA_DISTANCE: 15,
    PARTICLE_COUNT: 8000,
    STAR_COUNT: 7000,
    PLANET_SCALE: 1.0,
    NEBULA_SCALE: 1.0,
    SHOW_SECONDARY_EFFECTS: true
  },
  TRANSITION_DURATION: 2.0, // seconds
  SOLAR_SYSTEM: {
    PLANET_COUNT: 8,
    SUN_SIZE: 5,
    ORBIT_SPREAD: 10
  },
  COLORS: {
    VERSE: {
      PRIMARY: "#7c3aed",
      SECONDARY: "#3b82f6",
      BG_DARK: "#0a0a18",
      BG_MID: "#0f0a20"
    },
    CHORUS: {
      PRIMARY: "#e34a7b",
      SECONDARY: "#ff6b9d",
      BG_DARK: "#120010",
      BG_MID: "#220022"
    }
  }
};

// Main Background component
const Background = ({ isPlaying, audioLevel = [], currentLyric, isChorus, onLoad }) => {
  // State and refs
  const [audioIntensity, setAudioIntensity] = useState(0.5);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  });
  
  // Animation controls for DOM elements
  const glowControls = useAnimationControls();
  const chorusGlowControls = useAnimationControls();
  const nebulaControls = useAnimationControls();
  const waveControls = useAnimationControls();
  
  // Refs for performance optimization
  const lastAudioProcessTimeRef = useRef(0);
  const choruxTransitionRef = useRef(false);
  const transitionTimeRef = useRef(0);
  const hueRef = useRef(280); // Initial color: purple
  const intensityRef = useRef({ current: 0.5, target: 0.5 });
  const lyricsInfluenceRef = useRef({ x: 0, y: 0, strength: 0 });
  const deviceConfigRef = useRef(isMobile ? CONFIG.MOBILE : CONFIG.DESKTOP);
  
  // Notify parent when background is loaded
  useEffect(() => {
    if (onLoad) {
      const timer = setTimeout(() => {
        onLoad();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [onLoad]);
  
  // Responsive handling - with debounce
  useEffect(() => {
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const newIsMobile = window.innerWidth < 768;
        setIsMobile(newIsMobile);
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
        deviceConfigRef.current = newIsMobile ? CONFIG.MOBILE : CONFIG.DESKTOP;
      }, 200); // Debounce resize events
    };
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Process audio levels for visualization
  useEffect(() => {
    if (!audioLevel || audioLevel.length === 0) return;

    const now = Date.now();
    if (now - lastAudioProcessTimeRef.current < 50) return;
    lastAudioProcessTimeRef.current = now;

    // Enhanced frequency analysis for better reactivity
    const bassRange = Math.min(15, audioLevel.length);
    const subBassRange = Math.min(8, audioLevel.length);
    const midRange = [Math.floor(audioLevel.length * 0.2), Math.floor(audioLevel.length * 0.6)];
    const highRange = [Math.floor(audioLevel.length * 0.6), audioLevel.length];
    const presenceRange = [Math.floor(audioLevel.length * 0.8), audioLevel.length];
    
    let bassSum = 0, subBassSum = 0, midSum = 0, highSum = 0, presenceSum = 0;
    
    // Process different frequency ranges
    for (let i = 0; i < subBassRange; i++) {
      subBassSum += audioLevel[i] || 0;
    }
    
    for (let i = subBassRange; i < bassRange; i++) {
      bassSum += audioLevel[i] || 0;
    }
    
    for (let i = midRange[0]; i < midRange[1]; i++) {
      midSum += audioLevel[i] || 0;
    }
    
    for (let i = highRange[0]; i < highRange[1]; i++) {
      highSum += audioLevel[i] || 0;
    }
    
    for (let i = presenceRange[0]; i < presenceRange[1]; i++) {
      presenceSum += audioLevel[i] || 0;
    }
    
    const subBassAvg = subBassSum / subBassRange / 255;
    const bassAvg = bassSum / (bassRange - subBassRange) / 255;
    const midAvg = midSum / (midRange[1] - midRange[0]) / 255;
    const highAvg = highSum / (highRange[1] - highRange[0]) / 255;
    const presenceAvg = presenceSum / (presenceRange[1] - presenceRange[0]) / 255;
    
    // Calculate weighted intensity
    const newIntensity = 1 + (
      subBassAvg * 2.5 + 
      bassAvg * 2 + 
      midAvg * 1.5 + 
      highAvg * 1 + 
      presenceAvg * 0.8
    ) / 4;

    // Smooth out intensity changes
    setAudioIntensity(prev => lerp(prev, newIntensity, 0.3));

    if (isPlaying) {
      // Update visual controls based on audio
      glowControls.start({
        opacity: isChorus ? 0.8 * newIntensity : 0.4 * newIntensity,
        scale: isChorus ? 1 + 0.3 * bassAvg : 1 + 0.1 * bassAvg,
        transition: { duration: 0.4 },
      });
      
      chorusGlowControls.start({
        opacity: isChorus ? 0.8 * newIntensity : 0,
        scale: 1 + 0.2 * highAvg,
        transition: { duration: 0.3 },
      });
      
      nebulaControls.start({
        opacity: 0.3 + 0.5 * bassAvg,
        scale: 1 + 0.1 * midAvg,
        x: 50 * (midAvg - 0.5),
        transition: { duration: 0.5 },
      });
      
      waveControls.start({
        y: [-5 * newIntensity, 5 * newIntensity, -5 * newIntensity],
        opacity: [0.5, 0.8 * newIntensity, 0.5],
        transition: { duration: 4, repeat: Infinity },
      });
    }
  }, [audioLevel, isPlaying, isChorus, glowControls, chorusGlowControls, nebulaControls, waveControls]);

  // Update colors and effects based on lyrics and chorus state
  useEffect(() => {
    // Track chorus transitions
    if (choruxTransitionRef.current !== isChorus) {
      choruxTransitionRef.current = isChorus;
      transitionTimeRef.current = Date.now();
    }
    
    hueRef.current = isChorus ? 320 : 280;
    intensityRef.current.target = isChorus ? 0.9 : 0.5;

    // Generate visual influences from lyrics
    if (currentLyric && currentLyric !== "...") {
      const lyricLength = currentLyric.length;
      const influenceX = Math.sin(lyricLength * 0.2) * windowSize.width * 0.3;
      const influenceY = Math.cos(lyricLength * 0.3) * windowSize.height * 0.3;
      
      lyricsInfluenceRef.current = {
        x: influenceX,
        y: influenceY,
        strength: Math.min(1, lyricLength / 30) * 0.7,
      };
    } else {
      lyricsInfluenceRef.current = { x: 0, y: 0, strength: 0 };
    }
  }, [isChorus, currentLyric, windowSize]);

  // Space scene component - handles the 3D environment
  const SpaceScene = ({ audioIntensity, isChorus, isPlaying }) => {
    const { camera, scene, gl } = useThree();
    const groupRef = useRef();
    const starsRef = useRef();
    const nebulaRef = useRef();
    const galaxyRef = useRef();
    const timeRef = useRef(0);
    const choruxTransitionProgressRef = useRef(0);
    
    // Setup the 3D scene
    useEffect(() => {
      // Configure renderer
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 1.2;
      
      // Initial camera setup - different for mobile
      if (isMobile) {
        camera.position.set(0, 5, CONFIG.MOBILE.CAMERA_DISTANCE);
        camera.fov = 70; // Wider field of view for mobile
      } else {
        camera.position.set(0, 0, CONFIG.DESKTOP.CAMERA_DISTANCE);
        camera.fov = 60;
      }
      camera.updateProjectionMatrix();
      
      // Add fog for depth
      scene.fog = new THREE.FogExp2(
        isChorus ? CONFIG.COLORS.CHORUS.BG_DARK : CONFIG.COLORS.VERSE.BG_DARK, 
        isMobile ? 0.002 : 0.003
      );
      
      return () => {
        scene.fog = null;
        gl.toneMapping = THREE.NoToneMapping;
      };
    }, [camera, scene, gl, isMobile]);

    // Handle smooth transitions between chorus and verse
    useEffect(() => {
      // Create a timeline for smoother coordinated animations
      const timeline = gsap.timeline({
        defaults: { duration: CONFIG.TRANSITION_DURATION, ease: "power2.inOut" }
      });
      
      // Target values based on section and device
      const targetZ = isChorus 
        ? (isMobile ? CONFIG.MOBILE.CAMERA_DISTANCE - 5 : CONFIG.DESKTOP.CAMERA_DISTANCE - 5)
        : (isMobile ? CONFIG.MOBILE.CAMERA_DISTANCE : CONFIG.DESKTOP.CAMERA_DISTANCE);
      
      const targetY = isChorus ? (isMobile ? 8 : 2) : (isMobile ? 5 : 0);
      const targetRotX = isChorus ? (isMobile ? 0.3 : 0.2) : (isMobile ? 0.15 : 0);
      
      // Camera movement
      timeline.to(camera.position, {
        z: targetZ,
        y: targetY,
        ease: "power2.inOut"
      }, 0);
      
      // Camera rotation
      timeline.to(camera.rotation, {
        x: targetRotX,
        ease: "power2.inOut" 
      }, 0);
      
      // Fog color transition
      const fogColorStart = new THREE.Color(scene.fog.color);
      const fogColorEnd = new THREE.Color(
        isChorus ? CONFIG.COLORS.CHORUS.BG_DARK : CONFIG.COLORS.VERSE.BG_DARK
      );
      
      // Update fog in the animation loop for smoother color transition
      timeline.to(scene.fog, {
        density: isChorus ? (isMobile ? 0.0015 : 0.002) : (isMobile ? 0.002 : 0.003),
        onUpdate: () => {
          // Calculate progress through the timeline for this tween
          const progress = timeline.progress();
          scene.fog.color.copy(fogColorStart).lerp(fogColorEnd, progress);
        }
      }, 0);
      
      return () => timeline.kill();
    }, [isChorus, camera, scene, isMobile]);

    // Main animation loop
    useFrame((_, delta) => {
      timeRef.current += delta * (isPlaying ? 0.5 : 0.1);
      
      // Smooth transitions between chorus and verse
      const targetTransitionProgress = isChorus ? 1 : 0;
      choruxTransitionProgressRef.current = lerp(
        choruxTransitionProgressRef.current,
        targetTransitionProgress,
        delta * 1.5 // Speed of transition
      );
      
      // Apply group rotation
      if (groupRef.current) {
        // Slower rotation when not playing, faster with audio intensity
        groupRef.current.rotation.y += delta * (isPlaying ? 0.05 * audioIntensity : 0.01);
        
        // Subtle wobble effect based on audio
        if (isPlaying && audioIntensity > 1.2) {
          groupRef.current.rotation.x = Math.sin(timeRef.current * 0.2) * 0.03 * (audioIntensity - 1);
        }
      }
      
      // Update stars
      if (starsRef.current && isPlaying) {
        // Make stars pulse with the beat
        const pulseScale = 1 + 0.05 * Math.sin(timeRef.current * 2) * audioIntensity;
        starsRef.current.scale.set(pulseScale, pulseScale, 1);
      }
      
      // Update nebula
      if (nebulaRef.current && isPlaying) {
        // Dynamic opacity based on audio
        nebulaRef.current.material.opacity = 0.3 + 0.2 * Math.sin(timeRef.current) * audioIntensity;
        
        // Subtle expansion and contraction
        const breathScale = deviceConfigRef.current.NEBULA_SCALE * 
          (1 + 0.1 * Math.sin(timeRef.current * 0.5) * audioIntensity);
        nebulaRef.current.scale.set(breathScale, breathScale, breathScale);
      }
      
      // Update galaxy
      if (galaxyRef.current) {
        // Rotate galaxy based on section and audio
        galaxyRef.current.rotation.z += delta * 0.1 * (isChorus ? 1.5 : 1) * (isPlaying ? audioIntensity : 0.5);
        
        // Scale based on chorus/verse transition
        const galaxyScale = lerp(1, 1.5, choruxTransitionProgressRef.current);
        galaxyRef.current.scale.set(galaxyScale, galaxyScale, 1);
      }
    });

    return (
      <group ref={groupRef}>
        {/* Add post-processing effects */}
        <EffectComposer>
          <Bloom 
            intensity={1.2} 
            luminanceThreshold={0.6} 
            luminanceSmoothing={0.9} 
          />
          <ChromaticAberration
            offset={[0.002, 0.002].map(x => x * audioIntensity)}
          />
          <Vignette darkness={0.5} offset={0.5} />
        </EffectComposer>

        {/* Ambient lighting */}
        <ambientLight intensity={0.15} />
        
        {/* Main light source with color based on section */}
        <pointLight 
          position={[0, 0, 5]} 
          intensity={isChorus ? 0.7 : 0.3} 
          color={isChorus ? CONFIG.COLORS.CHORUS.PRIMARY : CONFIG.COLORS.VERSE.PRIMARY}
          distance={40}
        />

        {/* Background stars - optimized count for device */}
        <Stars
          ref={starsRef}
          radius={100}
          depth={50}
          count={deviceConfigRef.current.STAR_COUNT}
          factor={5}
          saturation={isChorus ? 0.7 : 0.5}
          fade
          speed={isPlaying ? 1 * audioIntensity : 0.2}
        />

        {/* Central galaxy with trails */}
        <group
          ref={galaxyRef}
          position={[0, isMobile ? -5 : -2, isMobile ? -15 : -8]}
          rotation={[0.5, 0, 0]}
        >
          {/* Galaxy core */}
          <mesh>
            <torusGeometry args={[5, 1.8, 2, 64]} />
            <meshBasicMaterial 
              color={isChorus ? CONFIG.COLORS.CHORUS.PRIMARY : CONFIG.COLORS.VERSE.PRIMARY} 
              transparent 
              opacity={0.4} 
              side={THREE.DoubleSide}
            />
          </mesh>
          
          {/* Galaxy outer ring */}
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <ringGeometry args={[7, 8, 64]} />
            <meshBasicMaterial 
              color={isChorus ? CONFIG.COLORS.CHORUS.SECONDARY : CONFIG.COLORS.VERSE.SECONDARY} 
              transparent 
              opacity={0.15} 
              side={THREE.DoubleSide}
            />
          </mesh>
          
          {/* Galaxy center glow */}
          <mesh>
            <sphereGeometry args={[1, 32, 32]} />
            <meshBasicMaterial 
              color={isChorus ? CONFIG.COLORS.CHORUS.SECONDARY : CONFIG.COLORS.VERSE.SECONDARY} 
              transparent 
              opacity={0.6}
            />
          </mesh>
          
          {/* Sparkles around galaxy center */}
          <Sparkles
            count={50}
            scale={[10, 10, 10]}
            size={1.5}
            speed={0.3}
            opacity={0.7}
            color={isChorus ? CONFIG.COLORS.CHORUS.SECONDARY : CONFIG.COLORS.VERSE.SECONDARY}
          />
          
          {/* Light source */}
          <pointLight 
            color={isChorus ? CONFIG.COLORS.CHORUS.PRIMARY : CONFIG.COLORS.VERSE.PRIMARY} 
            intensity={isPlaying ? 2 * audioIntensity : 0.5} 
            distance={30} 
          />
        </group>

        {/* Main nebula cloud */}
        <Nebula
          ref={nebulaRef}
          position={[0, 0, -10]}
          color={isChorus ? CONFIG.COLORS.CHORUS.SECONDARY : CONFIG.COLORS.VERSE.PRIMARY}
          intensity={audioIntensity}
          isPlaying={isPlaying}
          isMobile={isMobile}
        />

        {/* Cloud formations */}
        <CloudFormation
          count={isMobile ? 2 : 4}
          intensity={audioIntensity}
          isChorus={isChorus}
          isPlaying={isPlaying}
          scale={isMobile ? 1.5 : 1}
        />

        {/* Planets - show fewer on mobile */}
        <PlanetSystem 
          count={isMobile ? 3 : 6} 
          intensity={audioIntensity}
          isChorus={isChorus}
          isPlaying={isPlaying}
          scale={deviceConfigRef.current.PLANET_SCALE}
          transitionProgress={choruxTransitionProgressRef.current}
        />

        {/* Particles effect */}
        <SpaceParticles
          count={deviceConfigRef.current.PARTICLE_COUNT / 10}
          size={0.08}
          intensity={audioIntensity}
          isChorus={isChorus}
          isPlaying={isPlaying}
        />

        {/* Special effects - conditionally rendered based on playing state */}
        {isPlaying && (
          <>
            <ShootingStars 
              count={isMobile ? 3 : 6} 
              intensity={audioIntensity}
              isChorus={isChorus}
            />
            
            {/* Cosmic dust */}
            <CosmicDust
              count={deviceConfigRef.current.PARTICLE_COUNT}
              size={0.03}
              intensity={audioIntensity}
              isChorus={isChorus}
              isPlaying={isPlaying}
            />
            
            {/* Only show comet on chorus or when lyrics are active */}
            {(isChorus || (currentLyric && currentLyric !== "...")) && (
              <Comet 
                intensity={audioIntensity} 
                isChorus={isChorus} 
                count={isChorus ? 2 : 1}
              />
            )}
          </>
        )}
      </group>
    );
  };

  // Nebula component - large colorful cloud
  const Nebula = React.forwardRef(
    ({ position, color, intensity, isPlaying, isMobile }, ref) => {
      const meshRef = useRef();
      const timeRef = useRef(0);
      
      useFrame((_, delta) => {
        timeRef.current += delta * (isPlaying ? 0.1 : 0.02);
        
        if (meshRef.current) {
          // Slow rotation
          meshRef.current.rotation.z += delta * 0.02;
          meshRef.current.rotation.y += delta * 0.01;
          
          // Soft pulsing effect scaled by device
          const scale = isMobile ? CONFIG.MOBILE.NEBULA_SCALE : CONFIG.DESKTOP.NEBULA_SCALE;
          meshRef.current.scale.x = scale * (1 + 0.05 * Math.sin(timeRef.current) * intensity);
          meshRef.current.scale.y = scale * (1 + 0.05 * Math.cos(timeRef.current * 1.3) * intensity);
          meshRef.current.scale.z = scale;
        }
      });
      
      return (
        <mesh
          ref={(node) => {
            meshRef.current = node;
            if (ref) ref.current = node;
          }}
          position={position}
        >
          <sphereGeometry args={[8, 64, 64]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={isPlaying ? 0.35 * intensity : 0.15}
            emissive={color}
            emissiveIntensity={intensity * 0.2}
            roughness={0.7}
            metalness={0.3}
            depthWrite={false}
          />
        </mesh>
      );
    }
  );

  // Cloud formation component - creates multiple cloud clusters
  const CloudFormation = ({ count, intensity, isChorus, isPlaying, scale = 1 }) => {
    const cloudRefs = useRef([]);
    const timeRef = useRef(0);
    
    // Generate cloud positions
    const cloudData = useMemo(() => {
      return Array.from({ length: count }, (_, i) => ({
        position: [
          random(-25, 25),
          random(-15, 15),
          random(-30, -5)
        ],
        rotation: [
          random(-0.3, 0.3),
          random(-0.3, 0.3),
          random(-0.3, 0.3)
        ],
        scale: random(0.7, 1.3) * scale,
        speed: random(0.6, 1.4),
        color: isChorus ? CONFIG.COLORS.CHORUS.SECONDARY : CONFIG.COLORS.VERSE.SECONDARY
      }));
    }, [count, isChorus, scale]);
    
    useFrame((_, delta) => {
      timeRef.current += delta * (isPlaying ? 0.2 : 0.05);
      
      cloudRefs.current.forEach((cloud, i) => {
        if (cloud) {
          const data = cloudData[i];
          
          // Gentle rotation
          cloud.rotation.y += delta * 0.05 * data.speed;
          
          // Subtle movement
          if (isPlaying) {
            cloud.position.y += Math.sin(timeRef.current * 0.2 * data.speed) * delta * 0.1 * intensity;
            cloud.position.x += Math.cos(timeRef.current * 0.1 * data.speed) * delta * 0.05 * intensity;
          }
        }
      });
    });
    
    return (
      <>
        {cloudData.map((data, i) => (
          <group
            key={i}
            ref={el => (cloudRefs.current[i] = el)}
            position={data.position}
            rotation={data.rotation}
            scale={data.scale}
          >
            <Cloud
              opacity={0.4}
              speed={0.1} // Animation speed
              width={10}
              depth={3}
              segments={15}
              color={data.color}
            />
          </group>
        ))}
      </>
    );
  };

  // Planet system component - creates planetary objects
  const PlanetSystem = ({ count, intensity, isChorus, isPlaying, scale = 1, transitionProgress }) => {
    const planetsRef = useRef([]);
    const timeRef = useRef(0);
    
    // Generate planets with different properties
    const planets = useMemo(() => {
      return Array.from({ length: count }, (_, i) => {
        // Distribute planets in orbital fashion
        const angle = (i / count) * Math.PI * 2;
        const radius = 15 + i * 3;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * 5;
        const z = Math.sin(angle) * radius - 15;
        
        // Alternate between verse and chorus colors
        const isVerseColor = i % 2 === 0;
        
        return {
          position: [x, y, z],
          size: random(0.7, 1.3) * scale * (i % 2 === 0 ? 1.5 : 1),
          color: isVerseColor 
            ? CONFIG.COLORS.VERSE.PRIMARY 
            : CONFIG.COLORS.CHORUS.PRIMARY,
          highlightColor: isVerseColor 
            ? CONFIG.COLORS.VERSE.SECONDARY 
            : CONFIG.COLORS.CHORUS.SECONDARY,
          rotationSpeed: random(0.2, 0.5),
          orbitSpeed: random(0.05, 0.15),
          hasRings: i % 3 === 0,
          hasAtmosphere: i % 2 === 1
        };
      });
    }, [count, scale]);
    
    useFrame((_, delta) => {
      timeRef.current += delta * (isPlaying ? 0.3 : 0.1);
      
      planetsRef.current.forEach((planet, i) => {
        if (planet) {
          const data = planets[i];
          
          // Update planet rotation
          planet.rotation.y += delta * data.rotationSpeed * (isPlaying ? intensity : 0.5);
          
          // Update orbit position - smoother with audio reactivity
          if (isPlaying) {
            // Get orbit center and calculate new position
            const angle = timeRef.current * data.orbitSpeed;
            const x = data.position[0] + Math.sin(angle) * 2 * intensity;
            const y = data.position[1] + Math.sin(angle * 2) * 1 * intensity;
            const z = data.position[2];
            
            // Apply with smoothing
            planet.position.x = lerp(planet.position.x, x, delta * 2);
            planet.position.y = lerp(planet.position.y, y, delta * 2);
            planet.position.z = z;
            
            // Apply scale changes during transition
            const targetScale = data.size * (isChorus ? 1.2 : 1);
            planet.scale.setScalar(lerp(planet.scale.x, targetScale, delta * 2));
          }
          
          // Special effects for planet children
          planet.children.forEach(child => {
            // Find atmosphere and rings by checking geometry
            if (child.geometry instanceof THREE.SphereGeometry && child !== planet.children[0]) {
              // This is an atmosphere
              child.material.opacity = 0.2 + 0.1 * Math.sin(timeRef.current * 2) * intensity;
            } else if (child.geometry instanceof THREE.RingGeometry) {
              // This is a ring
              child.rotation.x = Math.PI / 4 + Math.sin(timeRef.current * 0.5) * 0.1 * intensity;
            }
          });
        }
      });
    });
    
    return (
      <>
        {planets.map((data, i) => {
          // Blend colors based on transition progress
          const colorObj = {
            main: data.color,
            highlight: data.highlightColor
          };
          
          // For chorus transition, interpolate colors
          if (isChorus) {
            colorObj.main = new THREE.Color(data.color).lerp(
              new THREE.Color(CONFIG.COLORS.CHORUS.PRIMARY),
              transitionProgress
            ).getStyle();
            
            colorObj.highlight = new THREE.Color(data.highlightColor).lerp(
              new THREE.Color(CONFIG.COLORS.CHORUS.SECONDARY),
              transitionProgress
            ).getStyle();
          } else {
            colorObj.main = new THREE.Color(data.color).lerp(
              new THREE.Color(CONFIG.COLORS.VERSE.PRIMARY),
              1 - transitionProgress
            ).getStyle();
            
            colorObj.highlight = new THREE.Color(data.highlightColor).lerp(
              new THREE.Color(CONFIG.COLORS.VERSE.SECONDARY),
              1 - transitionProgress
            ).getStyle();
          }
          
          return (
            <Planet
              key={i}
              ref={el => (planetsRef.current[i] = el)}
              position={data.position}
              size={data.size}
              color={colorObj.main}
              highlightColor={colorObj.highlight}
              intensity={intensity}
              isPlaying={isPlaying}
              hasRings={data.hasRings}
              hasAtmosphere={data.hasAtmosphere}
            />
          );
        })}
      </>
    );
  };

  // Individual planet component
  const Planet = React.forwardRef(
    ({ position, size, color, highlightColor, intensity, isPlaying, hasRings, hasAtmosphere }, ref) => {
      const timeRef = useRef(0);
      
      // Setup planet hierarchy
      useEffect(() => {
        if (ref.current) {
          // Apply initial positions and scales
          ref.current.position.set(...position);
          ref.current.scale.set(size, size, size);
        }
      }, [position, size, ref]);
      
      return (
        <group ref={ref} position={position}>
          {/* Planet core */}
          <mesh castShadow>
            <sphereGeometry args={[1, 32, 32]} />
            <meshStandardMaterial 
              color={color} 
              metalness={0.2}
              roughness={0.7}
            />
          </mesh>
          
          {/* Optional atmosphere */}
          {hasAtmosphere && (
            <mesh>
              <sphereGeometry args={[1.2, 32, 32]} />
              <meshBasicMaterial 
                color={highlightColor} 
                transparent 
                opacity={0.2}
                side={THREE.BackSide}
              />
            </mesh>
          )}
          
          {/* Optional rings */}
          {hasRings && (
            <mesh rotation={[Math.PI / 4, 0, 0]}>
              <ringGeometry args={[1.4, 2.2, 64]} />
              <meshBasicMaterial 
                color={highlightColor} 
                transparent 
                opacity={0.3} 
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
          
          {/* Planet light source */}
          <pointLight 
            color={highlightColor} 
            intensity={isPlaying ? 0.5 * intensity : 0.2} 
            distance={10} 
          />
        </group>
      );
    }
  );

  // Space particles component
  const SpaceParticles = ({ count, size, intensity, isChorus, isPlaying }) => {
    const particlesRef = useRef();
    const timeRef = useRef(0);
    
    // Generate particle positions
    const particles = useMemo(() => {
      return new Array(count).fill(0).map(() => {
        const r = 20 + Math.random() * 20;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        // Convert spherical to Cartesian coordinates for better distribution
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        
        return {
          position: new THREE.Vector3(x, y, z),
          originalPosition: new THREE.Vector3(x, y, z),
          speed: Math.random() * 0.5 + 0.5,
          phase: Math.random() * Math.PI * 2
        };
      });
    }, [count]);
    
    // Create positions array for buffer geometry
    const positions = useMemo(() => {
      const positions = new Float32Array(count * 3);
      
      for (let i = 0; i < count; i++) {
        positions[i * 3] = particles[i].position.x;
        positions[i * 3 + 1] = particles[i].position.y;
        positions[i * 3 + 2] = particles[i].position.z;
      }
      
      return positions;
    }, [particles, count]);
    
    useFrame((_, delta) => {
      timeRef.current += delta * (isPlaying ? 0.5 : 0.1);
      
      if (particlesRef.current && particlesRef.current.geometry.attributes.position) {
        const positionArray = particlesRef.current.geometry.attributes.position.array;
        
        // Update particle positions
        for (let i = 0; i < count; i++) {
          const particle = particles[i];
          const i3 = i * 3;
          
          if (isPlaying) {
            // Oscillate particles around their original positions
            positionArray[i3] = particle.originalPosition.x + 
              Math.sin(timeRef.current * 0.1 * particle.speed + particle.phase) * intensity;
            positionArray[i3 + 1] = particle.originalPosition.y + 
              Math.cos(timeRef.current * 0.15 * particle.speed + particle.phase) * intensity;
            positionArray[i3 + 2] = particle.originalPosition.z + 
              Math.sin(timeRef.current * 0.2 * particle.speed + particle.phase * 2) * intensity;
          }
        }
        
        particlesRef.current.geometry.attributes.position.needsUpdate = true;
        
        // Update particle size with audio
        particlesRef.current.material.size = size * (1 + 0.5 * (intensity - 1));
      }
    });
    
    return (
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={size}
          sizeAttenuation={true}
          transparent
          opacity={0.6}
          color={isChorus ? CONFIG.COLORS.CHORUS.SECONDARY : CONFIG.COLORS.VERSE.SECONDARY}
          fog={true}
        />
      </points>
    );
  };

  // Cosmic dust particles
  const CosmicDust = ({ count, size, intensity, isChorus, isPlaying }) => {
    const particlesRef = useRef();
    
    // Generate random positions
    const positions = useMemo(() => {
      const tempPositions = new Float32Array(count * 3);
      const tempSizes = new Float32Array(count);
      
      for (let i = 0; i < count; i++) {
        const r = 40 + Math.random() * 30;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        tempPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        tempPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        tempPositions[i * 3 + 2] = r * Math.cos(phi) - 20; // Push back
        
        tempSizes[i] = Math.random() * 0.5 + 0.5;
      }
      
      return { positions: tempPositions, sizes: tempSizes };
    }, [count]);
    
    useFrame((_, delta) => {
      if (particlesRef.current && isPlaying) {
        // Rotate the dust cloud
        particlesRef.current.rotation.y += delta * 0.01 * intensity;
        
        // Update size based on audio
        particlesRef.current.material.size = size * (1 + 0.5 * (intensity - 1));
      }
    });
    
    return (
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={positions.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={count}
            array={positions.sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={size}
          sizeAttenuation={true}
          transparent
          opacity={0.4}
          color={isChorus ? CONFIG.COLORS.CHORUS.PRIMARY : CONFIG.COLORS.VERSE.PRIMARY}
          fog={true}
        />
      </points>
    );
  };

  // Shooting stars with trails
  const ShootingStars = ({ count, intensity, isChorus }) => {
    const starsRef = useRef([]);
    const timeRef = useRef(0);
    
    // Generate shooting star paths
    const stars = useMemo(() => {
      return new Array(count).fill(0).map(() => {
        const startX = random(-40, 40);
        const startY = random(-10, 30);
        const startZ = random(-50, -10);
        
        const endX = startX + random(-30, 30);
        const endY = startY - random(20, 40);
        const endZ = startZ + random(-20, 20);
        
        return {
          start: new THREE.Vector3(startX, startY, startZ),
          end: new THREE.Vector3(endX, endY, endZ),
          duration: random(2, 6),
          delay: random(0, 15),
          size: random(0.05, 0.15),
          speed: random(0.8, 1.5),
          progress: 0,
          active: false
        };
      });
    }, [count]);
    
    useFrame((_, delta) => {
      timeRef.current += delta;
      
      // Update star positions and progress
      stars.forEach((star, i) => {
        if (timeRef.current > star.delay) {
          if (!star.active) {
            star.active = true;
            star.progress = 0;
          }
          
          // Update progress
          star.progress += delta * star.speed * intensity;
          
          // Reset if complete
          if (star.progress >= star.duration) {
            star.progress = 0;
            star.delay = timeRef.current + random(1, 8);
            
            // Randomize new paths
            const startX = random(-40, 40);
            const startY = random(-10, 30);
            const startZ = random(-50, -10);
            
            const endX = startX + random(-30, 30);
            const endY = startY - random(20, 40);
            const endZ = startZ + random(-20, 20);
            
            star.start = new THREE.Vector3(startX, startY, startZ);
            star.end = new THREE.Vector3(endX, endY, endZ);
          }
          
          // Calculate current position with easing
          const t = star.progress / star.duration;
          const eased = 1 - Math.pow(1 - t, 3); // Cubic ease-out
          
          if (starsRef.current[i]) {
            const pos = new THREE.Vector3().lerpVectors(star.start, star.end, eased);
            starsRef.current[i].position.copy(pos);
          }
        }
      });
    });
    
    return (
      <group>
        {stars.map((star, i) => (
          <Trail
            key={i}
            width={0.6}
            length={16}
            color={new THREE.Color(isChorus ? CONFIG.COLORS.CHORUS.PRIMARY : CONFIG.COLORS.VERSE.PRIMARY)}
            attenuation={(t) => t * t}
            decay={2}
          >
            <mesh
              ref={(el) => (starsRef.current[i] = el)}
              position={star.start}
            >
              <sphereGeometry args={[star.size, 8, 8]} />
              <meshBasicMaterial color={"#ffffff"} />
            </mesh>
          </Trail>
        ))}
      </group>
    );
  };

  // Comet effect with trail
  const Comet = ({ intensity, isChorus, count = 1 }) => {
    const cometsRef = useRef([]);
    const timeRef = useRef(0);
    
    // Generate comet paths
    const comets = useMemo(() => {
      return new Array(count).fill(0).map((_, index) => {
        // Create a curved path for each comet
        const points = [];
        const radius = 12 + index * 4;
        const turns = 2 + index * 0.5;
        const pointCount = 100;
        const heightVariation = index * 2;
        
        for (let i = 0; i < pointCount; i++) {
          const t = i / pointCount;
          const angle = t * Math.PI * 2 * turns;
          const x = radius * Math.cos(angle);
          const y = (radius * Math.sin(angle) * 0.5) + (Math.sin(angle * 3) * heightVariation);
          const z = -20 + t * 40;
          points.push(new THREE.Vector3(x, y, z));
        }
        
        return {
          path: new THREE.CatmullRomCurve3(points),
          progress: Math.random(),
          speed: 0.05 + index * 0.01
        };
      });
    }, [count]);

    useFrame((_, delta) => {
      timeRef.current += delta;
      
      comets.forEach((comet, i) => {
        if (cometsRef.current[i]) {
          // Update comet progress along path
          comet.progress += delta * comet.speed * intensity;
          if (comet.progress > 1) comet.progress = 0;
          
          // Get current position along the path
          const point = comet.path.getPoint(comet.progress);
          cometsRef.current[i].position.copy(point);
          
          // Orient comet along the path for realistic movement
          if (comet.progress < 0.99) {
            const tangent = comet.path.getTangent(comet.progress);
            cometsRef.current[i].lookAt(
              point.x + tangent.x,
              point.y + tangent.y,
              point.z + tangent.z
            );
          }
        }
      });
    });

    return (
      <group>
        {comets.map((comet, i) => (
          <Trail
            key={i}
            width={1.5}
            length={20}
            color={new THREE.Color(isChorus 
              ? CONFIG.COLORS.CHORUS.PRIMARY 
              : CONFIG.COLORS.VERSE.PRIMARY
            )}
            attenuation={(t) => t * t}
            decay={3}
          >
            <mesh ref={(el) => (cometsRef.current[i] = el)}>
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshBasicMaterial color={isChorus 
                ? CONFIG.COLORS.CHORUS.SECONDARY 
                : CONFIG.COLORS.VERSE.SECONDARY
              } />
            </mesh>
          </Trail>
        ))}
      </group>
    );
  };

  // --- Main Component Render ---
  return (
    <>
      {/* Deep space gradient background */}
      <div 
        className="fixed inset-0 z-[-10]" 
        style={{
          background: `linear-gradient(to bottom, 
            ${isChorus ? CONFIG.COLORS.CHORUS.BG_DARK : CONFIG.COLORS.VERSE.BG_DARK},
            ${isChorus ? CONFIG.COLORS.CHORUS.BG_MID : CONFIG.COLORS.VERSE.BG_MID},
            ${isChorus ? CONFIG.COLORS.CHORUS.BG_DARK : CONFIG.COLORS.VERSE.BG_DARK}
          )`
        }}
      />

      {/* 3D Canvas with optimized settings for device */}
      <div className="fixed inset-0 z-[-9]">
        <Canvas 
          dpr={[1, isMobile ? 1.5 : 2]} 
          camera={{ fov: isMobile ? 70 : 60 }}
          gl={{ antialias: !isMobile, powerPreference: "high-performance" }}
          performance={{ min: 0.5 }}
        >
          <SpaceScene 
            audioIntensity={audioIntensity} 
            isChorus={isChorus} 
            isPlaying={isPlaying} 
          />
        </Canvas>
      </div>

      {/* Noise texture for grain effect */}
      <div className="fixed inset-0 z-[-8] opacity-[0.03] pointer-events-none bg-noise" />

      {/* Vignette effect */}
      <div className="fixed inset-0 z-[-7] pointer-events-none shadow-vignette" />

      {/* Reactive center glow */}
      <motion.div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96 z-[-6] pointer-events-none"
        animate={glowControls}
        initial={{ opacity: 0.3, scale: 1 }}
        style={{
          background: `radial-gradient(circle, rgba(${
            isChorus ? "227,74,123" : "123,58,237"
          },0.4) 0%, rgba(${isChorus ? "123,58,237" : "227,74,123"},0.2) 50%, rgba(0,0,0,0) 70%)`,
          filter: "blur(40px)",
        }}
      />

      {/* Nebula overlay with lyrics influence */}
      <motion.div
        className="fixed inset-0 z-[-5] pointer-events-none opacity-30 mix-blend-screen"
        animate={nebulaControls}
        initial={{ opacity: 0.2 }}
      >
        <div 
          className="absolute inset-0 bg-nebula opacity-40" 
          style={{ 
            backgroundPositionX: `${lyricsInfluenceRef.current.x}px`, 
            backgroundPositionY: `${lyricsInfluenceRef.current.y}px` 
          }} 
        />
      </motion.div>

      {/* Horizontal accent lines */}
      {isPlaying && (
        <div className="fixed inset-0 z-[-4] pointer-events-none">
          <motion.div
            className="absolute top-1/3 left-0 right-0 h-px"
            style={{
              background: `linear-gradient(to right, 
                transparent, 
                ${isChorus ? CONFIG.COLORS.CHORUS.PRIMARY : CONFIG.COLORS.VERSE.PRIMARY}40, 
                transparent
              )`
            }}
            animate={waveControls}
          />
          <motion.div
            className="absolute bottom-1/3 left-0 right-0 h-px"
            style={{
              background: `linear-gradient(to right, 
                transparent, 
                ${isChorus ? CONFIG.COLORS.CHORUS.SECONDARY : CONFIG.COLORS.VERSE.SECONDARY}40, 
                transparent
              )`
            }}
            animate={{
              y: [5, -5, 5],
              opacity: [0.5, 0.8 * audioIntensity, 0.5],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              repeatType: "loop",
              delay: 2,
            }}
          />
        </div>
      )}

      {/* Chorus-specific glow */}
      <motion.div
        className="fixed inset-0 z-[-3] pointer-events-none"
        animate={chorusGlowControls}
        initial={{ opacity: 0, scale: 0.9 }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle, 
              ${CONFIG.COLORS.CHORUS.PRIMARY}10 0%, 
              ${CONFIG.COLORS.CHORUS.SECONDARY}05 50%, 
              transparent 70%
            )`
          }}
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.5, 0.7 * audioIntensity, 0.5],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            repeatType: "mirror",
          }}
        />
      </motion.div>

      {/* Bottom gradient */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[-2] pointer-events-none"
        animate={{
          opacity: isPlaying ? (isChorus ? 0.3 : 0.2) : 0.1,
          height: isPlaying ? 100 : 60,
        }}
        transition={{ duration: 0.5 }}
        style={{
          background: `linear-gradient(to top, rgba(${
            isChorus ? "227,74,123" : "123,58,237"
          },0.15) 0%, transparent 100%)`,
        }}
      />
    </>
  );
};

export default Background;