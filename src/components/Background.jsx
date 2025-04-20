import { useEffect, useRef, useState, useMemo } from "react";
import { debounce } from "../lib/utils";
import * as THREE from 'three';

const Background = ({ isPlaying, audioLevel = [], currentLyric, isChorus }) => {
  // Canvas and Three.js refs
  const canvasRef = useRef(null);
  const threeCanvasRef = useRef(null);
  const threeSceneRef = useRef(null);
  const threeRendererRef = useRef(null);
  const threeCameraRef = useRef(null);
  const threeTimeRef = useRef(0);
  const particleSystemRef = useRef(null);
  
  // Animation and state refs
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMoving, setIsMoving] = useState(false);
  const starsRef = useRef([]);
  const particlesRef = useRef([]);
  const lastRenderTimeRef = useRef(0);
  const requestRef = useRef(null);
  const threeAnimationRef = useRef(null);
  const canvasContextRef = useRef(null);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const pulseEffectRef = useRef(0);
  const starFieldOpacityRef = useRef(1);
  const glowIntensityRef = useRef({ current: 0.5, target: 0.5 });
  const backgroundHueRef = useRef(280); // Initial purple-ish hue
  const [mobileMode, setMobileMode] = useState(false);
  const isMountedRef = useRef(true);
  const chorus3DElementsRef = useRef([]);
  const currentAudioIntensityRef = useRef(1);
  const chorusTransitionRef = useRef(false);

  // Track mouse movement for interactive effects
  useEffect(() => {
    const handleMouseMove = debounce((e) => {
      if (!isMountedRef.current) return;
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      });
      setIsMoving(true);

      // Reset moving state after a short delay
      setTimeout(() => {
        if (isMountedRef.current) {
          setIsMoving(false);
        }
      }, 100);
    }, 50);

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!isMountedRef.current) return;
      const width = window.innerWidth;
      const height = window.innerHeight;

      setWindowSize({
        width,
        height,
      });

      // Set mobile mode for responsive handling
      setMobileMode(width < 768);
      
      // Update Three.js camera and renderer if they exist
      if (threeCameraRef.current && threeRendererRef.current) {
        threeCameraRef.current.aspect = width / height;
        threeCameraRef.current.updateProjectionMatrix();
        threeRendererRef.current.setSize(width, height);
      }
    };

    handleResize(); // Initialize on mount

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Setup 3D environment with Three.js
  useEffect(() => {
    if (!threeCanvasRef.current || threeSceneRef.current) return;
    
    // Create scene
    const scene = new THREE.Scene();
    threeSceneRef.current = scene;
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 30;
    threeCameraRef.current = camera;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: threeCanvasRef.current,
      alpha: true,
      antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    threeRendererRef.current = renderer;
    
    // Create particle system for 3D space
    const particleCount = mobileMode ? 500 : 1000;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);
    const particleColors = new Float32Array(particleCount * 3);
    
    // Populate particles with random positions
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      // Distribute particles in a sphere
      const radius = Math.random() * 50 + 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      particlePositions[i3] = radius * Math.sin(phi) * Math.cos(theta);  // x
      particlePositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);  // y
      particlePositions[i3 + 2] = radius * Math.cos(phi);  // z
      
      // Random size for each particle
      particleSizes[i] = Math.random() * 2 + 0.5;
      
      // Initialize with purple colors (will be updated in animation)
      particleColors[i3] = 0.5;      // r
      particleColors[i3 + 1] = 0.2;  // g
      particleColors[i3 + 2] = 0.8;  // b
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    
    // Create material for particles
    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        audioIntensity: { value: 1.0 },
        isChorus: { value: 0.0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        uniform float audioIntensity;
        uniform float isChorus;
        
        void main() {
          vColor = color;
          
          // Calculate position with some movement
          vec3 pos = position;
          
          // Add some movement based on time
          float moveFactor = sin(time * 0.5 + pos.x * 0.1) * cos(time * 0.3 + pos.y * 0.05);
          pos.x += moveFactor * (0.5 + isChorus * 0.5);
          pos.y += sin(time * 0.4 + pos.z * 0.1) * (0.5 + isChorus * 0.5);
          
          // Apply audio reactivity
          pos *= 1.0 + (audioIntensity - 1.0) * 0.1;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (40.0 / -mvPosition.z) * (1.0 + (audioIntensity - 1.0) * 0.3);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          // Create a circular particle
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          // Smooth edges
          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false
    });
    
    // Create the particle system
    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);
    particleSystemRef.current = particleSystem;
    
    // Add some ambient lighting
    const ambientLight = new THREE.AmbientLight(0x333333);
    scene.add(ambientLight);
    
    // Add a directional light for some shadow/highlight
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    
    // Create chorus-specific 3D elements (shapes that appear during chorus)
    const createChorus3DElements = () => {
      // Clear existing chorus elements
      if (chorus3DElementsRef.current.length > 0) {
        chorus3DElementsRef.current.forEach(obj => {
          scene.remove(obj);
        });
        chorus3DElementsRef.current = [];
      }
      
      // Create a ring of triangular prisms that will appear during chorus
      const ringCount = mobileMode ? 8 : 12;
      const radius = 15;
      
      for (let i = 0; i < ringCount; i++) {
        const angle = (i / ringCount) * Math.PI * 2;
        
        // Create a custom shape for each element
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 5, 3, 1);
        
        // Use pink/red material for chorus objects
        const material = new THREE.MeshPhongMaterial({
          color: 0xe34a7b,
          emissive: 0x6d1d33,
          specular: 0xffffff,
          shininess: 100,
          transparent: true,
          opacity: 0
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Position around a circle
        mesh.position.x = Math.cos(angle) * radius;
        mesh.position.y = Math.sin(angle) * radius;
        mesh.position.z = -5;
        
        // Rotate to point outward
        mesh.rotation.z = angle + Math.PI / 2;
        mesh.rotation.y = Math.PI / 2;
        
        // Add some random rotation to make it less uniform
        mesh.rotation.x = Math.random() * Math.PI;
        
        scene.add(mesh);
        chorus3DElementsRef.current.push(mesh);
      }
      
      // Add a central ring that will pulse with the music
      const ringGeometry = new THREE.TorusGeometry(10, 0.5, 16, 50);
      const ringMaterial = new THREE.MeshPhongMaterial({
        color: 0xe34a7b,
        emissive: 0x6d1d33,
        specular: 0xffffff,
        shininess: 100,
        transparent: true,
        opacity: 0
      });
      
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      scene.add(ring);
      chorus3DElementsRef.current.push(ring);
    };
    
    createChorus3DElements();
    
    // Three.js animation loop
    const animate = () => {
      if (!isMountedRef.current || !threeSceneRef.current) {
        cancelAnimationFrame(threeAnimationRef.current);
        return;
      }
      
      threeTimeRef.current += 0.01;
      
      // Update audio intensity in the shader
      if (particleSystemRef.current) {
        particleSystemRef.current.material.uniforms.time.value = threeTimeRef.current;
        particleSystemRef.current.material.uniforms.audioIntensity.value = currentAudioIntensityRef.current;
        particleSystemRef.current.material.uniforms.isChorus.value = isChorus ? 1.0 : 0.0;
      }
      
      // Update chorus 3D elements
      if (chorus3DElementsRef.current.length > 0) {
        const targetOpacity = isChorus ? 0.8 : 0;
        const opacityStep = 0.03; // Controls transition speed
        
        chorus3DElementsRef.current.forEach((obj, index) => {
          // Get current opacity
          const currentOpacity = obj.material.opacity;
          
          // Smoothly transition opacity
          if (currentOpacity < targetOpacity) {
            obj.material.opacity = Math.min(currentOpacity + opacityStep, targetOpacity);
          } else if (currentOpacity > targetOpacity) {
            obj.material.opacity = Math.max(currentOpacity - opacityStep, targetOpacity);
          }
          
          // For visible chorus elements, add some animation
          if (obj.material.opacity > 0.1) {
            // If it's the last element (the ring)
            if (index === chorus3DElementsRef.current.length - 1) {
              // Pulse the ring with audio intensity
              const scaleFactor = 1 + (currentAudioIntensityRef.current - 1) * 0.2;
              obj.scale.set(scaleFactor, scaleFactor, scaleFactor);
              
              // Rotate the ring
              obj.rotation.z += 0.005;
            } else {
              // Rotate the prisms
              obj.rotation.y += 0.01;
              
              // Make them move slightly with audio
              const originalDist = 15; // Original radius
              const angle = (index / (chorus3DElementsRef.current.length - 1)) * Math.PI * 2;
              
              // Audio-reactive distance
              const distFactor = 1 + (currentAudioIntensityRef.current - 1) * 0.15;
              const currentDist = originalDist * distFactor;
              
              obj.position.x = Math.cos(angle) * currentDist;
              obj.position.y = Math.sin(angle) * currentDist;
              
              // Pulse with beat
              const beatPulse = 1 + Math.sin(threeTimeRef.current * 5) * 0.1 * (currentAudioIntensityRef.current - 1);
              obj.scale.set(beatPulse, beatPulse, beatPulse);
            }
          }
        });
      }
      
      // Update particle colors based on isChorus (transition from purple to pink)
      if (particleSystemRef.current && particleSystemRef.current.geometry.attributes.color) {
        const colorAttribute = particleSystemRef.current.geometry.attributes.color;
        const positionAttribute = particleSystemRef.current.geometry.attributes.position;
        const particleCount = positionAttribute.count;
        
        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          const x = positionAttribute.array[i3];
          const y = positionAttribute.array[i3 + 1];
          const z = positionAttribute.array[i3 + 2];
          
          // Create different colors based on position and isChorus
          let r, g, b;
          
          if (isChorus) {
            // During chorus, transition to pinks and reds
            r = 0.85 + Math.sin(x * 0.1 + threeTimeRef.current) * 0.15;
            g = 0.3 + Math.sin(y * 0.1 + threeTimeRef.current) * 0.1;
            b = 0.4 + Math.cos(z * 0.1 + threeTimeRef.current) * 0.1;
          } else {
            // During verses, use purples and blues
            r = 0.4 + Math.sin(x * 0.1 + threeTimeRef.current) * 0.1;
            g = 0.3 + Math.sin(y * 0.1 + threeTimeRef.current) * 0.1;
            b = 0.8 + Math.cos(z * 0.1 + threeTimeRef.current) * 0.2;
          }
          
          // Smoothly transition between verse and chorus colors
          colorAttribute.array[i3] = colorAttribute.array[i3] * 0.95 + r * 0.05;
          colorAttribute.array[i3 + 1] = colorAttribute.array[i3 + 1] * 0.95 + g * 0.05;
          colorAttribute.array[i3 + 2] = colorAttribute.array[i3 + 2] * 0.95 + b * 0.05;
          
          // Boost brightness based on audio intensity for a reactive effect
          if (isPlaying && currentAudioIntensityRef.current > 1.2) {
            const boost = (currentAudioIntensityRef.current - 1) * 0.2;
            colorAttribute.array[i3] = Math.min(1, colorAttribute.array[i3] + boost);
            colorAttribute.array[i3 + 1] = Math.min(1, colorAttribute.array[i3 + 1] + boost * 0.5);
            colorAttribute.array[i3 + 2] = Math.min(1, colorAttribute.array[i3 + 2] + boost * 0.7);
          }
        }
        
        colorAttribute.needsUpdate = true;
      }
      
      // Rotate the camera slightly based on mouse position for parallax effect
      if (isMoving && threeCameraRef.current) {
        const targetX = (mousePosition.x / window.innerWidth - 0.5) * 10;
        const targetY = (mousePosition.y / window.innerHeight - 0.5) * -10;
        
        // Smooth camera movement
        threeCameraRef.current.position.x += (targetX - threeCameraRef.current.position.x) * 0.05;
        threeCameraRef.current.position.y += (targetY - threeCameraRef.current.position.y) * 0.05;
        threeCameraRef.current.lookAt(0, 0, 0);
      }
      
      // Render the scene
      threeRendererRef.current.render(threeSceneRef.current, threeCameraRef.current);
      
      threeAnimationRef.current = requestAnimationFrame(animate);
    };
    
    threeAnimationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (threeAnimationRef.current) {
        cancelAnimationFrame(threeAnimationRef.current);
      }
    };
  }, [isPlaying, mobileMode]);

  // Initialize 2D canvas and stars
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: true });
    canvasContextRef.current = ctx;

    // Set canvas size to window size
    const resizeCanvas = () => {
      if (!canvas || !isMountedRef.current) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();

    // Initialize stars - density based on viewport size
    const initStars = () => {
      if (!canvas || !isMountedRef.current) return;
      const starDensity = mobileMode ? 0.00012 : 0.00018; // Increased density
      const starCount = Math.floor(canvas.width * canvas.height * starDensity);

      const stars = [];
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          z: Math.random() * 1000,
          size: Math.random() * 2 + 0.5, // Slightly larger stars
          speed: Math.random() * 0.05 + 0.01, // Faster movement
          brightness: Math.random() * 0.7 + 0.3,
          pulse: Math.random() * 0.02 + 0.01,
          pulseDelta: Math.random() * 0.005 + 0.002,
          hue: Math.random() * 60 + backgroundHueRef.current, // Based on current background hue
          opacity: Math.random() * 0.5 + 0.5,
          twinkle: Math.random() > 0.5, // More stars twinkle
          twinkleSpeed: Math.random() * 0.1 + 0.05,
        });
      }

      starsRef.current = stars;
    };

    // Initialize particles - more for visual impact
    const initParticles = () => {
      if (!canvas || !isMountedRef.current) return;
      const particleDensity = mobileMode ? 0.00003 : 0.00005; // Increased density
      const particleCount = Math.floor(canvas.width * canvas.height * particleDensity);

      const particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          z: Math.random() * 1000,
          size: Math.random() * 4 + 1, // Larger particles
          speed: Math.random() * 0.3 + 0.1, // Faster movement
          directionX: Math.random() * 2 - 1,
          directionY: Math.random() * 2 - 1,
          hue: Math.random() * 60 + backgroundHueRef.current,
          opacity: Math.random() * 0.3 + 0.1, // More visible
          decay: Math.random() * 0.01 + 0.005,
        });
      }

      particlesRef.current = particles;
    };

    // Set up canvas and initialize elements
    const resizeHandler = () => {
      resizeCanvas();
      initStars();
      initParticles();
    };

    window.addEventListener("resize", resizeHandler);

    initStars();
    initParticles();

    return () => {
      isMountedRef.current = false;
      window.removeEventListener("resize", resizeHandler);

      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [mobileMode]);

  // Update background hue and glow based on chorus
  useEffect(() => {
    // Detect transition to/from chorus
    if (isChorus !== chorusTransitionRef.current) {
      chorusTransitionRef.current = isChorus;
    }
    
    if (isChorus) {
      // Shift towards pink/red for chorus
      backgroundHueRef.current = 320;
      glowIntensityRef.current.target = 0.8;
    } else {
      // Shift back towards purple for verses
      backgroundHueRef.current = 280;
      glowIntensityRef.current.target = 0.5;
    }
  }, [isChorus]);

  // Update star field opacity based on playing state
  useEffect(() => {
    // Brighter stars when playing
    starFieldOpacityRef.current = isPlaying ? 1 : 0.7;
  }, [isPlaying]);

  // Process audio levels to get current intensity
  useEffect(() => {
    if (!isPlaying || !audioLevel || audioLevel.length === 0) {
      currentAudioIntensityRef.current = 1;
      return;
    }

    // Calculate average audio intensity focusing on bass frequencies
    const sampleSize = Math.min(20, audioLevel.length);
    let sum = 0;
    
    for (let i = 0; i < sampleSize; i++) {
      sum += audioLevel[i] || 0;
    }
    
    const avgLevel = sum / (sampleSize * 255); // Normalize to 0-1
    const reactiveIntensity = 1 + avgLevel * 2; // Scale for more dramatic effect
    
    // Smooth transitions for audio intensity
    currentAudioIntensityRef.current = currentAudioIntensityRef.current * 0.8 + reactiveIntensity * 0.2;
  }, [isPlaying, audioLevel]);

  // Main 2D animation loop
  useEffect(() => {
    if (!canvasRef.current || !canvasContextRef.current) return;

    const ctx = canvasContextRef.current;

    // Animate function
    const animate = (timestamp) => {
      if (!isMountedRef.current || !canvasRef.current) {
        if (requestRef.current) {
          cancelAnimationFrame(requestRef.current);
          requestRef.current = null;
        }
        return;
      }

      // Limit frame rate for performance
      if (timestamp - lastRenderTimeRef.current < 33) {
        // ~30fps
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

      lastRenderTimeRef.current = timestamp;

      // Clear canvas with slight transparency for trailing effect
      ctx.fillStyle = "rgba(10, 10, 20, 0.2)";
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      // Update pulse effect
      pulseEffectRef.current = isPlaying
        ? (pulseEffectRef.current + 0.01) % (Math.PI * 2)
        : (pulseEffectRef.current + 0.005) % (Math.PI * 2);

      const pulseValue = Math.sin(pulseEffectRef.current) * 0.5 + 0.5; // 0 to 1

      // Smooth glow intensity transition
      glowIntensityRef.current.current += (glowIntensityRef.current.target - glowIntensityRef.current.current) * 0.05;

      // Get the current audio reactivity
      const audioReactivity = currentAudioIntensityRef.current;

      // Draw stars with 3D perspective effect
      const maxStarsToRender = mobileMode ? 300 : 800; // Increased star count
      const starsToRender = Math.min(starsRef.current.length, maxStarsToRender);

      for (let i = 0; i < starsToRender; i++) {
        const star = starsRef.current[i];

        // Update brightness for twinkling effect
        star.brightness += star.pulseDelta;

        // Reverse direction at boundaries
        if (star.brightness > 1 || star.brightness < 0.3) {
          star.pulseDelta = -star.pulseDelta;
        }

        // Bonus twinkle effect for some stars
        let twinkleFactor = 1;
        if (star.twinkle) {
          twinkleFactor = 0.7 + Math.sin(timestamp * star.twinkleSpeed) * 0.3;
        }

        // Audio influence
        let audioInfluence = 0;
        if (isPlaying) {
          audioInfluence = (audioReactivity - 1) * 0.4;
        }

        // Mouse influence (subtle)
        let mouseInfluence = 0;
        if (isMoving) {
          const dx = mousePosition.x - star.x;
          const dy = mousePosition.y - star.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const mouseRange = 150;

          if (distance < mouseRange) {
            // Enhanced effect
            mouseInfluence = (1 - distance / mouseRange) * 0.1;
          }
        }

        // Combine all factors
        const finalBrightness = star.brightness * twinkleFactor + audioInfluence + mouseInfluence;
        const finalSize = star.size * (1 + audioInfluence * 1.5); // Enhanced size change

        // Apply star field opacity
        const starOpacity = finalBrightness * star.opacity * starFieldOpacityRef.current;

        // Draw star with 3D perspective effect
        // Calculate size based on z (depth)
        const perspective = 300;
        const scale = perspective / (perspective + star.z);
        const size = finalSize * scale;
        const x = (star.x - canvasRef.current.width / 2) * scale + canvasRef.current.width / 2;
        const y = (star.y - canvasRef.current.height / 2) * scale + canvasRef.current.height / 2;

        // Color based on isChorus
        const hue = isChorus ? 
          (star.hue - 40 + pulseValue * 20) : // More red during chorus
          (star.hue + pulseValue * 10); // More purple during verses

        ctx.fillStyle = `hsla(${hue}, 80%, 75%, ${starOpacity})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();

        // Add glow effect for brighter stars
        if (finalBrightness > 0.7) {
          ctx.shadowBlur = size * 3;
          ctx.shadowColor = `hsla(${hue}, 80%, 75%, 0.6)`;
        } else {
          ctx.shadowBlur = 0;
        }

        // Update z position for 3D movement
        star.z -= star.speed * 10 * (isPlaying ? audioReactivity : 0.5);

        // If the star goes behind the camera, reset it to the back
        if (star.z <= 0) {
          star.z = 1000;
          star.x = Math.random() * canvasRef.current.width;
          star.y = Math.random() * canvasRef.current.height;
          star.hue = Math.random() * 60 + backgroundHueRef.current;
        }
      }

      // Draw particles - increased for visual impact
      const maxParticlesToRender = mobileMode ? 30 : 60;
      const particlesToRender = Math.min(particlesRef.current.length, maxParticlesToRender);

      for (let i = 0; i < particlesToRender; i++) {
        const particle = particlesRef.current[i];

        // Audio reactivity for particles
        let audioReactivityFactor = 1;
        if (isPlaying) {
          audioReactivityFactor = audioReactivity;
        }

        // Update position with perspective
        const perspective = 300;
        const scale = perspective / (perspective + particle.z);
        const x = (particle.x - canvasRef.current.width / 2) * scale + canvasRef.current.width / 2;
        const y = (particle.y - canvasRef.current.height / 2) * scale + canvasRef.current.height / 2;
        const size = particle.size * scale;

        // Update z-position
        particle.z -= particle.speed * 5 * audioReactivityFactor;
        
        // Also update x/y position
        particle.x += particle.directionX * particle.speed * audioReactivityFactor;
        particle.y += particle.directionY * particle.speed * audioReactivityFactor;

        // Bounce off edges
        if (particle.x < 0 || particle.x > canvasRef.current.width) {
          particle.directionX *= -1;
        }

        if (particle.y < 0 || particle.y > canvasRef.current.height) {
          particle.directionY *= -1;
        }

        // Draw particle
        ctx.beginPath();
        const hue = isChorus ? 340 : 280; // Pink for chorus, purple for verses
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
        gradient.addColorStop(0, `hsla(${hue}, 80%, 75%, ${particle.opacity})`);
        gradient.addColorStop(1, `hsla(${hue}, 80%, 50%, 0)`);

        ctx.fillStyle = gradient;
        ctx.arc(x, y, size * 2, 0, Math.PI * 2);
        ctx.fill();

        // Slowly fade out particles
        particle.opacity -= particle.decay * (isChorus ? 0.5 : 1); // Slower decay during chorus

        // Reset particles that have faded out or gone behind camera
        if (particle.opacity <= 0 || particle.z <= 0) {
          particle.x = Math.random() * canvasRef.current.width;
          particle.y = Math.random() * canvasRef.current.height;
          particle.z = 1000;
          particle.opacity = Math.random() * 0.3 + 0.1;
          particle.hue = Math.random() * 60 + backgroundHueRef.current;
        }
      }

      // Special effect for chorus transition
      if (isChorus !== chorusTransitionRef.current) {
        // Create a flash effect when transitioning to chorus
        ctx.fillStyle = isChorus ? 
          "rgba(227, 74, 123, 0.3)" : // Pink flash for chorus start
          "rgba(123, 58, 237, 0.3)";  // Purple flash for chorus end
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }

      // Draw aurora borealis effect during chorus
      if (isChorus) {
        drawAuroraBorealis(ctx, timestamp, audioReactivity);
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    // Draw aurora borealis effect
    const drawAuroraBorealis = (ctx, timestamp, audioReactivity) => {
      if (!canvasRef.current || !isMountedRef.current) return;

      const width = canvasRef.current.width;
      const height = canvasRef.current.height;

      // Create multiple wave-like shapes
      const waveCount = 3;
      const baseY = height * 0.6;

      for (let w = 0; w < waveCount; w++) {
        // Different hues for each wave
        const hue = backgroundHueRef.current - 50 + w * 30;

        ctx.beginPath();

        // Start from left edge
        ctx.moveTo(0, baseY + Math.sin(timestamp * 0.001 + w) * 50);

        // Create wave points
        const pointCount = 10;
        for (let i = 0; i <= pointCount; i++) {
          const x = (width / pointCount) * i;

          // Calculate wave height with multiple sine waves
          const timeOffset = timestamp * 0.001;
          const wave1 = Math.sin(timeOffset + i * 0.2 + w) * 50;
          const wave2 = Math.sin(timeOffset * 1.5 + i * 0.3) * 30;
          const wave3 = Math.sin(timeOffset * 0.7 - i * 0.4 + w * 0.5) * 20;

          // Combine waves and apply audio reactivity
          const y = baseY + (wave1 + wave2 + wave3) * audioReactivity * 1.5; // Enhanced effect

          // Use quadratic curves for smoother lines
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            const prevX = (width / pointCount) * (i - 1);
            const cpX = (x + prevX) / 2;
            ctx.quadraticCurveTo(cpX, y, x, y);
          }
        }

        // Complete the shape by going to bottom and back to start
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        // Create gradient fill with enhanced opacity
        const gradient = ctx.createLinearGradient(0, baseY - 100, 0, baseY + 100);
        gradient.addColorStop(0, `hsla(${hue}, 80%, 70%, 0)`);
        gradient.addColorStop(
          0.5,
          `hsla(${hue}, 80%, 70%, ${0.15 * audioReactivity * glowIntensityRef.current.current})`,
        );
        gradient.addColorStop(1, `hsla(${hue}, 80%, 50%, 0)`);

        ctx.fillStyle = gradient;
        ctx.fill();
      }
    };

    // Start animation
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      isMountedRef.current = false;
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [isPlaying, mousePosition, isMoving, isChorus, audioLevel, mobileMode]);

  // Creating an array of floating orbs as a useMemo to prevent unnecessary re-renders
  const floatingOrbs = useMemo(() => {
    const orbCount = mobileMode ? 5 : 8;
    return Array.from({ length: orbCount }).map((_, i) => ({
      id: i,
      size: 10 + Math.random() * 40,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: 10 + Math.random() * 20,
      delay: Math.random() * 5,
      opacity: 0.1 + Math.random() * 0.2,
    }));
  }, [mobileMode]);

  return (
    <>
      {/* Base gradient background - enhanced colors */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#0f0a20] via-[#120824] to-[#0a0a18] z-[-10]"></div>

      {/* ThreeJS Canvas for 3D particles */}
      <canvas 
        ref={threeCanvasRef} 
        className="fixed inset-0 z-[-9]" 
        style={{ 
          opacity: isPlaying ? 1 : 0.7, 
          transition: "opacity 1s ease"
        }} 
      />

      {/* 2D Canvas for stars with 3D perspective */}
      <canvas ref={canvasRef} className="fixed inset-0 z-[-8]" style={{ filter: "blur(0.5px)" }} />

      {/* Subtle noise texture overlay */}
      <div className="fixed inset-0 z-[-7] opacity-[0.03] pointer-events-none bg-noise"></div>

      {/* Floating orbs with parallax effect */}
      {floatingOrbs.map((orb) => (
        <div
          key={`orb-${orb.id}`}
          className="fixed pointer-events-none z-[-6]"
          style={{
            width: `${orb.size}px`,
            height: `${orb.size}px`,
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            borderRadius: "50%",
            background: isChorus 
              ? `radial-gradient(circle, rgba(227, 74, 123, ${orb.opacity * 2}) 0%, rgba(227, 74, 123, 0) 70%)`
              : `radial-gradient(circle, rgba(123, 58, 237, ${orb.opacity * 2}) 0%, rgba(123, 58, 237, 0) 70%)`,
            filter: "blur(15px)",
            transform: isMoving ? "translate(0, 0)" : "translate(0, 0)",
            transition: "transform 0.5s ease",
            animation: `float ${orb.duration}s ease-in-out ${orb.delay}s infinite alternate`
          }}
        />
      ))}

      {/* Subtle vignette effect */}
      <div className="fixed inset-0 z-[-5] pointer-events-none shadow-vignette"></div>

      {/* Audio reactive glow - central - enhanced */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96 z-[-4] pointer-events-none"
        style={{
          opacity: isPlaying ? (isChorus ? 0.5 : 0.3) : 0.05,
          background: `radial-gradient(circle, rgba(${isChorus ? "227,74,123" : "123,58,237"},0.3) 0%, rgba(${isChorus ? "123,58,237" : "227,74,123"},0.15) 50%, rgba(0,0,0,0) 70%)`,
          filter: "blur(30px)",
          transform: `scale(${isPlaying ? (1 + (currentAudioIntensityRef.current - 1) * 0.1) : 1})`,
          transition: "transform 0.2s ease-out"
        }}
      />

      {/* Horizontal accent lines - enhanced */}
      <div className="fixed inset-0 z-[-3] pointer-events-none" style={{ opacity: isPlaying ? 1 : 0 }}>
        <div
          className="absolute top-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/20 to-transparent"
          style={{
            transform: isPlaying ? `translateY(${Math.sin(Date.now() * 0.001) * 5}px)` : "none",
            opacity: isPlaying ? 0.7 + Math.sin(Date.now() * 0.0005) * 0.3 : 0.7,
          }}
        />

        <div
          className="absolute bottom-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-secondary-500/20 to-transparent"
          style={{
            transform: isPlaying ? `translateY(${Math.sin(Date.now() * 0.0008 + 1) * -5}px)` : "none",
            opacity: isPlaying ? 0.7 + Math.sin(Date.now() * 0.0004 + 2) * 0.3 : 0.7,
          }}
        />
      </div>

      {/* Dynamic chorus-specific effect - enhanced */}
      {isChorus && (
        <div className="fixed inset-0 z-[-2] pointer-events-none" style={{ opacity: 1 }}>
          <div
            className="absolute inset-0 bg-gradient-radial from-primary-500/10 via-secondary-500/5 to-transparent"
            style={{
              transform: `scale(${1 + Math.sin(Date.now() * 0.0005) * 0.05})`,
              opacity: 0.7 + Math.sin(Date.now() * 0.0003) * 0.15,
            }}
          />
        </div>
      )}

      {/* Audio reactive bottom gradient - enhanced */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[-1] pointer-events-none"
        style={{
          opacity: isPlaying ? 0.3 : 0.1,
          height: isPlaying ? 100 + Math.sin(Date.now() * 0.0004) * 10 : 80,
          background: `linear-gradient(to top, rgba(${isChorus ? "227,74,123" : "123,58,237"},0.15) 0%, transparent 100%)`,
        }}
      />
    </>
  );
};

export default Background;