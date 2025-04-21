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
  const spaceObjectsRef = useRef([]);

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
      antialias: true,
      powerPreference: "high-performance",
      precision: "highp"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // Transparent background
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    threeRendererRef.current = renderer;
    
    // Create particle system for 3D space
    const particleCount = mobileMode ? 500 : 1500;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);
    const particleColors = new Float32Array(particleCount * 3);
    
    // Populate particles with random positions
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      // Distribute particles in a sphere
      const radius = Math.random() * 60 + 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      particlePositions[i3] = radius * Math.sin(phi) * Math.cos(theta);  // x
      particlePositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);  // y
      particlePositions[i3 + 2] = radius * Math.cos(phi);  // z
      
      // Random size for each particle
      particleSizes[i] = Math.random() * 3 + 0.8;
      
      // Initialize with purple colors (will be updated in animation)
      particleColors[i3] = 0.5;      // r
      particleColors[i3 + 1] = 0.2;  // g
      particleColors[i3 + 2] = 0.8;  // b
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    
    // Advanced shader for particles
    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        audioIntensity: { value: 1.0 },
        isChorus: { value: 0.0 },
        mousePosition: { value: new THREE.Vector2(0.5, 0.5) },
        isMoving: { value: 0.0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        uniform float audioIntensity;
        uniform float isChorus;
        uniform vec2 mousePosition;
        uniform float isMoving;
        
        void main() {
          vColor = color;
          
          // Calculate position with complex movement
          vec3 pos = position;
          
          // Varied movement factors for more natural motion
          float xFactor = sin(time * 0.5 + pos.x * 0.1) * cos(time * 0.3 + pos.y * 0.05);
          float yFactor = cos(time * 0.4 + pos.z * 0.1) * sin(time * 0.6 + pos.x * 0.07);
          float zFactor = sin(time * 0.7 + pos.y * 0.15) * cos(time * 0.2 + pos.z * 0.03);
          
          // Mouse influence
          float mouseInfluence = isMoving * 0.2;
          vec2 mouseOffset = (mousePosition - vec2(0.5)) * 2.0; // Convert to -1 to 1 range
          
          // Apply varied movements
          pos.x += xFactor * (0.8 + isChorus * 0.7) + mouseOffset.x * mouseInfluence;
          pos.y += yFactor * (0.8 + isChorus * 0.7) + mouseOffset.y * mouseInfluence;
          pos.z += zFactor * (0.5 + isChorus * 0.5);
          
          // Apply audio reactivity
          float audioFactor = 1.0 + (audioIntensity - 1.0) * 0.2;
          pos *= audioFactor;
          
          // Calculate distance from camera
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          
          // Size based on distance from camera, audio intensity and choreography
          float sizeFactor = 1.0;
          // Pulsating effect synchronized with audio
          sizeFactor *= 1.0 + sin(time * 2.0 + pos.x * 0.1) * 0.2 * (audioIntensity - 1.0);
          // Chorus effect - particles grow slightly larger
          sizeFactor *= 1.0 + isChorus * 0.3;
          
          gl_PointSize = size * sizeFactor * (40.0 / -mvPosition.z) * (1.0 + (audioIntensity - 1.0) * 0.5);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          // Create a circular particle with soft edge
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          // Gradient from center
          float alpha = 1.0 - smoothstep(0.2, 0.5, dist);
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
    
    // Add ambient lighting for better depth perception
    const ambientLight = new THREE.AmbientLight(0x333333);
    scene.add(ambientLight);
    
    // Add directional lights for better 3D feeling
    const directionalLight1 = new THREE.DirectionalLight(0x7c3aed, 0.8);
    directionalLight1.position.set(5, 5, 5);
    scene.add(directionalLight1);
    
    const directionalLight2 = new THREE.DirectionalLight(0xe34a7b, 0.6);
    directionalLight2.position.set(-5, -5, 5);
    scene.add(directionalLight2);
    
    // Create 3D space objects
    const createSpaceObjects = () => {
      if (spaceObjectsRef.current.length > 0) {
        spaceObjectsRef.current.forEach(obj => {
          scene.remove(obj);
        });
        spaceObjectsRef.current = [];
      }
      
      // Create floating geometric shapes in 3D space
      const geometries = [
        new THREE.TorusGeometry(3, 1, 16, 50),
        new THREE.IcosahedronGeometry(2, 0),
        new THREE.OctahedronGeometry(2.5, 0)
      ];
      
      const positions = [
        { x: -20, y: 15, z: -10, rx: 0.2, ry: 0.1, rz: 0.05 },
        { x: 20, y: -10, z: -20, rx: 0.1, ry: 0.2, rz: 0.1 },
        { x: 0, y: 25, z: -30, rx: 0.05, ry: 0.1, rz: 0.15 }
      ];
      
      for (let i = 0; i < geometries.length; i++) {
        // Use custom shader material for the geometric shapes
        const material = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
            audioIntensity: { value: 1.0 },
            isChorus: { value: 0.0 },
            baseColor: { value: new THREE.Color(0x7c3aed) },
            accentColor: { value: new THREE.Color(0xe34a7b) }
          },
          vertexShader: `
            varying vec3 vNormal;
            varying vec3 vPosition;
            uniform float time;
            
            void main() {
              vNormal = normalize(normalMatrix * normal);
              vPosition = position;
              
              // Add subtle vertex displacement for organic look
              vec3 pos = position;
              pos += normal * sin(time * 0.5 + position.x * 0.2 + position.y * 0.1 + position.z * 0.3) * 0.1;
              
              gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
          `,
          fragmentShader: `
            varying vec3 vNormal;
            varying vec3 vPosition;
            uniform float time;
            uniform float audioIntensity;
            uniform float isChorus;
            uniform vec3 baseColor;
            uniform vec3 accentColor;
            
            void main() {
              // Calculate lighting effect
              vec3 light = normalize(vec3(1.0, 1.0, 1.0));
              float intensity = 0.5 + 0.5 * dot(vNormal, light);
              
              // Mix colors based on section
              vec3 color = mix(baseColor, accentColor, isChorus);
              
              // Add time-based color pulsing
              float pulse = sin(time * 0.5 + vPosition.x * 0.1 + vPosition.y * 0.1) * 0.5 + 0.5;
              pulse *= audioIntensity * 0.2;
              color = mix(color, accentColor, pulse * isChorus);
              
              // Add edge highlighting
              float edge = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
              edge = pow(edge, 2.0) * 0.5;
              color = mix(color, vec3(1.0), edge * (0.2 + isChorus * 0.3));
              
              // Final color calculation
              vec3 finalColor = color * intensity;
              float alpha = 0.4 + isChorus * 0.2 + edge * 0.4;
              
              gl_FragColor = vec4(finalColor, alpha);
            }
          `,
          transparent: true,
          side: THREE.DoubleSide
        });
        
        const mesh = new THREE.Mesh(geometries[i], material);
        
        // Set position and initial rotation
        const pos = positions[i];
        mesh.position.set(pos.x, pos.y, pos.z);
        mesh.userData = {
          rotationSpeed: { x: pos.rx, y: pos.ry, z: pos.rz }
        };
        
        scene.add(mesh);
        spaceObjectsRef.current.push(mesh);
      }
    };
    
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
      const ringCount = mobileMode ? 8 : 16;
      const radius = 15;
      
      for (let i = 0; i < ringCount; i++) {
        const angle = (i / ringCount) * Math.PI * 2;
        
        // Create a custom shape for each element
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 5, 3, 1);
        
        // Use pink/red material for chorus objects with glow effect
        const material = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
            audioIntensity: { value: 1.0 },
            baseColor: { value: new THREE.Color(0xe34a7b) },
            emissiveColor: { value: new THREE.Color(0x6d1d33) }
          },
          vertexShader: `
            varying vec3 vNormal;
            varying vec3 vPosition;
            uniform float time;
            
            void main() {
              vNormal = normalize(normalMatrix * normal);
              vPosition = position;
              
              // Add subtle animation to vertices
              vec3 pos = position;
              float displacement = sin(time * 2.0 + position.y * 0.5) * 0.1;
              pos += normal * displacement;
              
              gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
          `,
          fragmentShader: `
            varying vec3 vNormal;
            varying vec3 vPosition;
            uniform float time;
            uniform float audioIntensity;
            uniform vec3 baseColor;
            uniform vec3 emissiveColor;
            
            void main() {
              // Calculate lighting
              vec3 light = normalize(vec3(1.0, 1.0, 1.0));
              float diffuse = max(0.0, dot(vNormal, light));
              
              // Add rim lighting for glow effect
              float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
              rim = pow(rim, 3.0) * audioIntensity;
              
              // Pulse effect
              float pulse = sin(time * 3.0 + vPosition.y) * 0.5 + 0.5;
              pulse *= audioIntensity - 1.0;
              
              // Combine colors
              vec3 color = mix(baseColor, emissiveColor, diffuse);
              color = mix(color, vec3(1.0, 0.5, 0.7), rim * 0.5);
              color = mix(color, vec3(1.0, 0.8, 0.9), pulse * 0.3);
              
              gl_FragColor = vec4(color, 0.8 + rim * 0.2);
            }
          `,
          transparent: true,
          blending: THREE.AdditiveBlending
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
        
        // Store additional animation data
        mesh.userData = {
          originalAngle: angle,
          radiusOffset: Math.random() * 5
        };
        
        mesh.material.opacity = 0; // Start hidden
        scene.add(mesh);
        chorus3DElementsRef.current.push(mesh);
      }
      
      // Add a central torus that will pulse with the music
      const ringGeometry = new THREE.TorusGeometry(10, 0.8, 32, 100);
      const ringMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          audioIntensity: { value: 1.0 },
          baseColor: { value: new THREE.Color(0xe34a7b) },
          glowColor: { value: new THREE.Color(0xff9dbb) }
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vPosition;
          uniform float time;
          uniform float audioIntensity;
          
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            
            // Subtle vertex displacement for flowing effect
            vec3 pos = position;
            float wave = sin(time * 2.0 + position.x * 0.2 + position.y * 0.2) * 0.1;
            pos += normal * wave * audioIntensity;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          varying vec3 vPosition;
          uniform float time;
          uniform float audioIntensity;
          uniform vec3 baseColor;
          uniform vec3 glowColor;
          
          void main() {
            // Base lighting
            vec3 light = normalize(vec3(0.0, 0.0, 1.0));
            float diffuse = max(0.0, dot(vNormal, light)) * 0.5 + 0.5;
            
            // Add flowing color effect
            float colorFlow = sin(time * 3.0 + vPosition.x * 0.1 + vPosition.y * 0.1) * 0.5 + 0.5;
            colorFlow *= audioIntensity;
            
            // Edge glow
            float edge = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
            edge = pow(edge, 2.0) * audioIntensity;
            
            // Combine effects
            vec3 color = mix(baseColor, glowColor, colorFlow * 0.5);
            color = mix(color, glowColor, edge * 0.7);
            color *= diffuse;
            
            gl_FragColor = vec4(color, 0.8 + edge * 0.2);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.material.opacity = 0; // Start hidden
      scene.add(ring);
      chorus3DElementsRef.current.push(ring);
    };
    
    createSpaceObjects();
    createChorus3DElements();
    
    // Three.js animation loop
    const animate = () => {
      if (!isMountedRef.current || !threeSceneRef.current) {
        cancelAnimationFrame(threeAnimationRef.current);
        return;
      }
      
      threeTimeRef.current += 0.01;
      
      // Update uniforms in all shaders
      const updateUniforms = (material, additionalValues = {}) => {
        if (!material || !material.uniforms) return;
        
        material.uniforms.time.value = threeTimeRef.current;
        
        if (material.uniforms.audioIntensity) {
          material.uniforms.audioIntensity.value = currentAudioIntensityRef.current;
        }
        
        if (material.uniforms.isChorus) {
          material.uniforms.isChorus.value = isChorus ? 1.0 : 0.0;
        }
        
        if (material.uniforms.mousePosition) {
          material.uniforms.mousePosition.value.x = mousePosition.x / window.innerWidth;
          material.uniforms.mousePosition.value.y = 1.0 - (mousePosition.y / window.innerHeight);
        }
        
        if (material.uniforms.isMoving) {
          material.uniforms.isMoving.value = isMoving ? 1.0 : 0.0;
        }
        
        // Apply any additional values
        for (const [key, value] of Object.entries(additionalValues)) {
          if (material.uniforms[key]) {
            material.uniforms[key].value = value;
          }
        }
      };
      
      // Update particle system uniforms
      if (particleSystemRef.current) {
        updateUniforms(particleSystemRef.current.material);
      }
      
      // Update space objects
      spaceObjectsRef.current.forEach((obj, index) => {
        // Rotate each object uniquely
        const rotSpeed = obj.userData.rotationSpeed;
        obj.rotation.x += rotSpeed.x * (isChorus ? 1.5 : 1.0);
        obj.rotation.y += rotSpeed.y * (isChorus ? 1.5 : 1.0);
        obj.rotation.z += rotSpeed.z * (isChorus ? 1.5 : 1.0);
        
        // Update shader uniforms
        updateUniforms(obj.material);
      });
      
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
          
          // Update shader uniforms
          updateUniforms(obj.material);
          
          // For visible chorus elements, add some animation
          if (obj.material.opacity > 0.1) {
            // If it's the last element (the ring)
            if (index === chorus3DElementsRef.current.length - 1) {
              // Pulse the ring with audio intensity
              const scaleFactor = 1 + (currentAudioIntensityRef.current - 1) * 0.3;
              obj.scale.set(scaleFactor, scaleFactor, scaleFactor);
              
              // Rotate the ring
              obj.rotation.z += 0.005;
            } else {
              // Advanced animation for the prisms
              const angle = obj.userData.originalAngle;
              const radiusOffset = obj.userData.radiusOffset;
              
              // Base radius with audio reactivity
              const originalRadius = 15;
              const audioFactor = 1 + (currentAudioIntensityRef.current - 1) * 0.2;
              const pulseFactor = 1 + Math.sin(threeTimeRef.current * 3 + angle * 4) * 0.1 * audioFactor;
              const currentRadius = (originalRadius + radiusOffset) * pulseFactor;
              
              // Time-varying angle offset for circular movement
              const angleOffset = Math.sin(threeTimeRef.current * 0.5 + angle * 2) * 0.1;
              const currentAngle = angle + angleOffset;
              
              // Update position
              obj.position.x = Math.cos(currentAngle) * currentRadius;
              obj.position.y = Math.sin(currentAngle) * currentRadius;
              
              // Add slight up/down movement
              obj.position.z = -5 + Math.sin(threeTimeRef.current * 2 + angle * 8) * 2;
              
              // Complex rotation
              obj.rotation.y += 0.02;
              obj.rotation.x += Math.sin(threeTimeRef.current + angle) * 0.01;
              
              // Audio-reactive scale
              const beatPulse = 1 + Math.sin(threeTimeRef.current * 5 + angle * 2) * 0.15 * (audioFactor - 1);
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
          
          // Create different colors based on position, time, and isChorus
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
          
          // Add variety based on distance from center
          const dist = Math.sqrt(x*x + y*y + z*z);
          const distFactor = Math.sin(dist * 0.05 + threeTimeRef.current * 0.5) * 0.1;
          
          r += distFactor;
          g += distFactor;
          b += distFactor;
          
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
      
      // Advanced camera movement based on mouse and audio
      if (threeCameraRef.current) {
        // Base target position from mouse
        const targetX = (mousePosition.x / window.innerWidth - 0.5) * 15;
        const targetY = (mousePosition.y / window.innerHeight - 0.5) * -15;
        
        // Add audio-reactive movement
        const audioFactor = currentAudioIntensityRef.current - 1;
        const audioX = Math.sin(threeTimeRef.current * 0.5) * audioFactor * 3;
        const audioY = Math.cos(threeTimeRef.current * 0.7) * audioFactor * 2;
        
        // Calculate final camera position with smooth interpolation
        const finalX = targetX + audioX;
        const finalY = targetY + audioY;
        
        // Smooth camera movement
        threeCameraRef.current.position.x += (finalX - threeCameraRef.current.position.x) * 0.05;
        threeCameraRef.current.position.y += (finalY - threeCameraRef.current.position.y) * 0.05;
        
        // Subtle camera rotation based on audio
        if (isPlaying && audioFactor > 0.2) {
          threeCameraRef.current.rotation.z = Math.sin(threeTimeRef.current) * 0.05 * audioFactor;
        } else {
          threeCameraRef.current.rotation.z *= 0.95; // Smooth reset
        }
        
        // Look at the scene center with slight offset during chorus
        if (isChorus) {
          const chorusOffset = Math.sin(threeTimeRef.current * 2) * 3;
          threeCameraRef.current.lookAt(
            chorusOffset * Math.sin(threeTimeRef.current * 0.5),
            chorusOffset * Math.cos(threeTimeRef.current * 0.7),
            -5
          );
        } else {
          threeCameraRef.current.lookAt(0, 0, 0);
        }
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
  }, [isPlaying, mobileMode, isMoving, mousePosition, isChorus]);

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
      const starDensity = mobileMode ? 0.00015 : 0.00022; // Increased density
      const starCount = Math.floor(canvas.width * canvas.height * starDensity);

      const stars = [];
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          z: Math.random() * 1000,
          size: Math.random() * 2.5 + 0.5, // Slightly larger stars
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
      const particleDensity = mobileMode ? 0.00004 : 0.00007; // Increased density
      const particleCount = Math.floor(canvas.width * canvas.height * particleDensity);

      const particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          z: Math.random() * 1000,
          size: Math.random() * 5 + 1, // Larger particles
          speed: Math.random() * 0.3 + 0.1, // Faster movement
          directionX: Math.random() * 2 - 1,
          directionY: Math.random() * 2 - 1,
          hue: Math.random() * 60 + backgroundHueRef.current,
          opacity: Math.random() * 0.3 + 0.1, // More visible
          decay: Math.random() * 0.01 + 0.005,
          tail: Math.random() > 0.7, // Some particles have tails
          tailLength: Math.floor(Math.random() * 5) + 3,
          positions: [],
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
      glowIntensityRef.current.target = 0.9;
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
    const reactiveIntensity = 1 + avgLevel * 3; // Scale for more dramatic effect
    
    // Enhanced motion system - smoother transitions with more reactivity
    const targetIntensity = reactiveIntensity;
    const currentIntensity = currentAudioIntensityRef.current;
    
    // Fast rise, slower fall - makes the visuals more responsive to beats
    const riseSpeed = 0.5; // Quick response to beat
    const fallSpeed = 0.1; // Slower decay
    
    if (targetIntensity > currentIntensity) {
      // Rising - quick response
      currentAudioIntensityRef.current = currentIntensity * (1 - riseSpeed) + targetIntensity * riseSpeed;
    } else {
      // Falling - smoother decay
      currentAudioIntensityRef.current = currentIntensity * (1 - fallSpeed) + targetIntensity * fallSpeed;
    }
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
      if (timestamp - lastRenderTimeRef.current < 16) {
        // ~60fps
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

      lastRenderTimeRef.current = timestamp;

      // Clear canvas with slight transparency for trailing effect
      ctx.fillStyle = "rgba(10, 10, 20, 0.15)"; // Changed for better trails
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
      const maxStarsToRender = mobileMode ? 400 : 1000; // Increased star count
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
          audioInfluence = (audioReactivity - 1) * 0.5;
        }

        // Mouse influence (enhanced)
        let mouseInfluence = 0;
        if (isMoving) {
          const dx = mousePosition.x - star.x;
          const dy = mousePosition.y - star.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const mouseRange = 200;

          if (distance < mouseRange) {
            // Enhanced effect
            mouseInfluence = (1 - distance / mouseRange) * 0.15;
          }
        }

        // Combine all factors
        const finalBrightness = star.brightness * twinkleFactor + audioInfluence + mouseInfluence;
        const finalSize = star.size * (1 + audioInfluence * 2.5); // Enhanced size change

        // Apply star field opacity
        const starOpacity = finalBrightness * star.opacity * starFieldOpacityRef.current;

        // Draw star with 3D perspective effect
        // Calculate size based on z (depth)
        const perspective = 350;
        const scale = perspective / (perspective + star.z);
        const size = finalSize * scale;
        const x = (star.x - canvasRef.current.width / 2) * scale + canvasRef.current.width / 2;
        const y = (star.y - canvasRef.current.height / 2) * scale + canvasRef.current.height / 2;

        // Color based on isChorus with smooth transition
        const hue = isChorus ? 
          (star.hue - 40 + pulseValue * 30) : // More red during chorus
          (star.hue + pulseValue * 15); // More purple during verses

        // Add glow effect for brighter stars
        if (finalBrightness > 0.6) {
          ctx.shadowBlur = size * 4;
          ctx.shadowColor = `hsla(${hue}, 80%, 75%, 0.7)`;
        } else {
          ctx.shadowBlur = 0;
        }

        // Draw star with subtle color gradient
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, `hsla(${hue}, 100%, 95%, ${starOpacity})`);
        gradient.addColorStop(0.7, `hsla(${hue}, 80%, 75%, ${starOpacity * 0.8})`);
        gradient.addColorStop(1, `hsla(${hue}, 80%, 75%, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();

        // Update z position for 3D movement with audio reactivity
        star.z -= star.speed * 15 * (isPlaying ? audioReactivity : 0.5);

        // If the star goes behind the camera, reset it to the back
        if (star.z <= 0) {
          star.z = 1000;
          star.x = Math.random() * canvasRef.current.width;
          star.y = Math.random() * canvasRef.current.height;
          star.hue = Math.random() * 60 + backgroundHueRef.current;
        }
      }

      // Draw particles - enhanced with tails and effects
      const maxParticlesToRender = mobileMode ? 40 : 80;
      const particlesToRender = Math.min(particlesRef.current.length, maxParticlesToRender);

      for (let i = 0; i < particlesToRender; i++) {
        const particle = particlesRef.current[i];

        // Save previous position for tail effect
        if (particle.tail) {
          particle.positions.unshift({ x: particle.x, y: particle.y, z: particle.z });
          
          // Limit the tail length
          if (particle.positions.length > particle.tailLength) {
            particle.positions.pop();
          }
        }

        // Audio reactivity for particles
        let audioReactivityFactor = 1;
        if (isPlaying) {
          audioReactivityFactor = audioReactivity;
        }

        // Update z-position
        particle.z -= particle.speed * 5 * audioReactivityFactor;
        
        // Also update x/y position with more complex motion
        const motionWaveX = Math.sin(timestamp * 0.001 + particle.x * 0.01) * 0.2;
        const motionWaveY = Math.cos(timestamp * 0.001 + particle.y * 0.01) * 0.2;
        
        particle.x += (particle.directionX + motionWaveX) * particle.speed * audioReactivityFactor;
        particle.y += (particle.directionY + motionWaveY) * particle.speed * audioReactivityFactor;

        // Bounce off edges with slight randomness for more organic feel
        if (particle.x < 0 || particle.x > canvasRef.current.width) {
          particle.directionX *= -1;
          particle.directionX += (Math.random() - 0.5) * 0.1; // Add slight randomness
        }

        if (particle.y < 0 || particle.y > canvasRef.current.height) {
          particle.directionY *= -1;
          particle.directionY += (Math.random() - 0.5) * 0.1; // Add slight randomness
        }

        // Update position with perspective
        const perspective = 350;
        const scale = perspective / (perspective + particle.z);
        const x = (particle.x - canvasRef.current.width / 2) * scale + canvasRef.current.width / 2;
        const y = (particle.y - canvasRef.current.height / 2) * scale + canvasRef.current.height / 2;
        const size = particle.size * scale * (isPlaying ? (1 + (audioReactivityFactor - 1) * 0.3) : 1);

        // Draw particle with enhanced effects
        ctx.beginPath();
        const hue = isChorus ? 340 : 280; // Pink for chorus, purple for verses
        const saturation = 80 + (audioReactivityFactor - 1) * 20; // Increase saturation with audio
        const lightness = 60 + (audioReactivityFactor - 1) * 15; // Brighter with audio
        
        // Create glow effect
        ctx.shadowBlur = size * 2;
        ctx.shadowColor = `hsla(${hue}, ${saturation}%, ${lightness}%, ${particle.opacity * 0.8})`;
        
        // Use gradient for smoother look
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
        gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, ${particle.opacity * 1.2})`);
        gradient.addColorStop(0.7, `hsla(${hue}, ${saturation}%, ${lightness - 10}%, ${particle.opacity * 0.7})`);
        gradient.addColorStop(1, `hsla(${hue}, ${saturation}%, ${lightness - 20}%, 0)`);

        ctx.fillStyle = gradient;
        ctx.arc(x, y, size * 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw tail if enabled
        if (particle.tail && particle.positions.length > 1) {
          ctx.beginPath();
          
          // Start from current position
          ctx.moveTo(x, y);
          
          // Draw through each position in the tail with decreasing opacity
          for (let j = 0; j < particle.positions.length; j++) {
            const pos = particle.positions[j];
            const posScale = perspective / (perspective + pos.z);
            const posX = (pos.x - canvasRef.current.width / 2) * posScale + canvasRef.current.width / 2;
            const posY = (pos.y - canvasRef.current.height / 2) * posScale + canvasRef.current.height / 2;
            
            // Calculate segment opacity
            const segmentOpacity = particle.opacity * (1 - j / particle.positions.length);
            
            ctx.lineTo(posX, posY);
            
            // Create gradient between points for smoother tail
            if (j < particle.positions.length - 1) {
              const nextPos = particle.positions[j + 1];
              const nextPosScale = perspective / (perspective + nextPos.z);
              const nextPosX = (nextPos.x - canvasRef.current.width / 2) * nextPosScale + canvasRef.current.width / 2;
              const nextPosY = (nextPos.y - canvasRef.current.height / 2) * nextPosScale + canvasRef.current.height / 2;
              
              const gradientTail = ctx.createLinearGradient(posX, posY, nextPosX, nextPosY);
              gradientTail.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, ${segmentOpacity})`);
              gradientTail.addColorStop(1, `hsla(${hue}, ${saturation}%, ${lightness}%, ${segmentOpacity * 0.7})`);
              
              ctx.strokeStyle = gradientTail;
              ctx.lineWidth = size * (1 - j / particle.positions.length);
              ctx.stroke();
              
              // Reset path for next segment
              ctx.beginPath();
              ctx.moveTo(posX, posY);
            }
          }
        }

        // Slowly fade out particles with audio-reactive decay
        particle.opacity -= particle.decay * (isChorus ? 0.5 : 1) * (isPlaying ? Math.max(0.8, audioReactivityFactor * 0.5) : 1);

        // Reset particles that have faded out or gone behind camera
        if (particle.opacity <= 0 || particle.z <= 0) {
          particle.x = Math.random() * canvasRef.current.width;
          particle.y = Math.random() * canvasRef.current.height;
          particle.z = 1000;
          particle.opacity = Math.random() * 0.3 + 0.1;
          particle.hue = Math.random() * 60 + backgroundHueRef.current;
          particle.positions = []; // Reset tail positions
        }
      }

      // Special effect for chorus transition
      if (isChorus !== chorusTransitionRef.current) {
        // Create a flash effect when transitioning to chorus
        ctx.fillStyle = isChorus ? 
          "rgba(227, 74, 123, 0.4)" : // Pink flash for chorus start
          "rgba(123, 58, 237, 0.4)";  // Purple flash for chorus end
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
      const waveCount = 4; // Increased for more layers
      const baseY = height * 0.65; // Positioned lower

      for (let w = 0; w < waveCount; w++) {
        // Different hues for each wave
        const hue = backgroundHueRef.current - 60 + w * 30;

        ctx.beginPath();

        // Start from left edge
        ctx.moveTo(0, baseY + Math.sin(timestamp * 0.001 + w) * 70);

        // Create wave points with more complex movement
        const pointCount = 12; // More points for smoother curves
        for (let i = 0; i <= pointCount; i++) {
          const x = (width / pointCount) * i;

          // Calculate wave height with multiple sine waves for more organic look
          const timeOffset = timestamp * 0.001;
          const wave1 = Math.sin(timeOffset + i * 0.2 + w) * 70;
          const wave2 = Math.sin(timeOffset * 1.5 + i * 0.3) * 40;
          const wave3 = Math.sin(timeOffset * 0.7 - i * 0.4 + w * 0.5) * 30;
          const wave4 = Math.cos(timeOffset * 2.0 + i * 0.15 - w * 0.3) * 20;

          // Combine waves and apply audio reactivity
          const y = baseY + (wave1 + wave2 + wave3 + wave4) * audioReactivity * (1.3 + w * 0.1); // Enhanced effect

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

        // Create gradient fill with enhanced opacity and color variety
        const gradient = ctx.createLinearGradient(0, baseY - 150, 0, baseY + 150);
        gradient.addColorStop(0, `hsla(${hue}, 80%, 70%, 0)`);
        gradient.addColorStop(
          0.5,
          `hsla(${hue}, 90%, 70%, ${0.2 * audioReactivity * glowIntensityRef.current.current})`,
        );
        gradient.addColorStop(1, `hsla(${hue - 20}, 80%, 50%, 0)`);

        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Add subtle glow effect along the top edge of the waves
        ctx.beginPath();
        ctx.moveTo(0, baseY + Math.sin(timestamp * 0.001 + w) * 70);
        
        for (let i = 0; i <= pointCount; i++) {
          const x = (width / pointCount) * i;
          const timeOffset = timestamp * 0.001;
          const wave1 = Math.sin(timeOffset + i * 0.2 + w) * 70;
          const wave2 = Math.sin(timeOffset * 1.5 + i * 0.3) * 40;
          const wave3 = Math.sin(timeOffset * 0.7 - i * 0.4 + w * 0.5) * 30;
          const wave4 = Math.cos(timeOffset * 2.0 + i * 0.15 - w * 0.3) * 20;
          
          const y = baseY + (wave1 + wave2 + wave3 + wave4) * audioReactivity * (1.3 + w * 0.1);
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            const prevX = (width / pointCount) * (i - 1);
            const cpX = (x + prevX) / 2;
            ctx.quadraticCurveTo(cpX, y, x, y);
          }
        }
        
        // Set line style for the glow effect
        ctx.strokeStyle = `hsla(${hue - 10}, 100%, 85%, ${0.15 * audioReactivity})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Add sparkle points along the wave
        if (audioReactivity > 1.3 && w === 0) { // Only on the top wave and when audio is intense
          for (let i = 0; i <= pointCount; i += 2) { // Skip some points for performance
            const x = (width / pointCount) * i;
            const timeOffset = timestamp * 0.001;
            const wave1 = Math.sin(timeOffset + i * 0.2 + w) * 70;
            const wave2 = Math.sin(timeOffset * 1.5 + i * 0.3) * 40;
            const wave3 = Math.sin(timeOffset * 0.7 - i * 0.4 + w * 0.5) * 30;
            
            const y = baseY + (wave1 + wave2 + wave3) * audioReactivity * (1.3 + w * 0.1);
            
            // Draw sparkle
            const sparkleSize = (Math.random() * 2 + 1) * audioReactivity;
            ctx.fillStyle = `hsla(${hue - 30}, 100%, 95%, ${Math.random() * 0.5 * audioReactivity})`;
            ctx.beginPath();
            ctx.arc(x, y, sparkleSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
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
    const orbCount = mobileMode ? 10 : 18; // Increased orb count
    return Array.from({ length: orbCount }).map((_, i) => ({
      id: i,
      size: 15 + Math.random() * 100, // Increased size variance
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: 10 + Math.random() * 40, // Longer animation duration
      delay: Math.random() * 10,
      opacity: 0.2 + Math.random() * 0.3, // Increased base opacity
      hue: Math.random() > 0.5 ? "227, 74, 123" : "123, 58, 237", // Randomly pick colors
      speed: 0.5 + Math.random() * 0.5 // Animation speed factor
    }));
  }, [mobileMode]);

  // Add deep space dust (tiny particles scattered across the background)
  const spaceDust = useMemo(() => {
    const dustCount = mobileMode ? 30 : 60;
    return Array.from({ length: dustCount }).map((_, i) => ({
      id: i,
      size: 1 + Math.random() * 3, // Tiny particles
      x: Math.random() * 100,
      y: Math.random() * 100,
      opacity: 0.3 + Math.random() * 0.5,
      hue: Math.random() > 0.7 ? "227, 74, 123" : "123, 58, 237"
    }));
  }, [mobileMode]);

  return (
    <>
      {/* Base gradient background - enhanced colors with darker base */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#0a051a] via-[#0b061c] to-[#060610] z-[-20]"></div>

      {/* ThreeJS Canvas for 3D particles */}
      <canvas 
        ref={threeCanvasRef} 
        className="fixed inset-0 z-[-15]" 
        style={{ 
          opacity: isPlaying ? 1 : 0.7, 
          transition: "opacity 1s ease",
        }} 
      />

      {/* 2D Canvas for stars with 3D perspective */}
      <canvas ref={canvasRef} className="fixed inset-0 z-[-10]" style={{ filter: "none" }} />

      {/* Subtle noise texture overlay */}
      <div className="fixed inset-0 z-[-8] opacity-[0.03] pointer-events-none bg-noise"></div>

      {/* Deep space dust (tiny particles) */}
      {spaceDust.map((dust) => (
        <div
          key={`dust-${dust.id}`}
          className="fixed pointer-events-none z-[-7]"
          style={{
            width: `${dust.size}px`,
            height: `${dust.size}px`,
            left: `${dust.x}%`,
            top: `${dust.y}%`,
            borderRadius: "50%",
            background: `rgba(${dust.hue}, ${dust.opacity})`,
            boxShadow: `0 0 ${dust.size * 2}px rgba(${dust.hue}, 0.8)`,
          }}
        />
      ))}

      {/* Floating orbs with enhanced parallax effect */}
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
              ? `radial-gradient(circle, rgba(${orb.hue}, ${orb.opacity * 2.5}) 0%, rgba(${orb.hue}, 0) 70%)`
              : `radial-gradient(circle, rgba(${orb.hue}, ${orb.opacity * 2.5}) 0%, rgba(${orb.hue}, 0) 70%)`,
            transform: isMoving 
              ? `translate(${(mousePosition.x / window.innerWidth - 0.5) * -10 * orb.speed}px, ${(mousePosition.y / window.innerHeight - 0.5) * -10 * orb.speed}px)` 
              : "translate(0, 0)",
            transition: "transform 0.5s ease",
            animation: `float ${orb.duration}s ease-in-out ${orb.delay}s infinite alternate`,
            boxShadow: isChorus 
              ? `0 0 ${orb.size/3}px rgba(${orb.hue}, 0.4)`
              : `0 0 ${orb.size/4}px rgba(${orb.hue}, 0.3)`,
          }}
        />
      ))}

      {/* Subtle vignette effect - enhanced */}
      <div className="fixed inset-0 z-[-5] pointer-events-none bg-gradient-radial from-transparent to-black opacity-70"></div>

      {/* Audio reactive glow - central - enhanced */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-96 z-[-4] pointer-events-none"
        style={{
          opacity: isPlaying ? (isChorus ? 0.7 : 0.5) : 0.08,
          background: `radial-gradient(circle, rgba(${isChorus ? "227,74,123" : "123,58,237"},0.35) 0%, rgba(${isChorus ? "123,58,237" : "227,74,123"},0.15) 50%, rgba(0,0,0,0) 70%)`,
          transform: `scale(${isPlaying ? (1 + (currentAudioIntensityRef.current - 1) * 0.2) : 1})`,
          transition: "transform 0.2s ease-out, opacity 0.5s ease",
          boxShadow: isChorus 
            ? `0 0 100px rgba(227,74,123,0.4), 0 0 50px rgba(123,58,237,0.3)` 
            : `0 0 100px rgba(123,58,237,0.4), 0 0 50px rgba(227,74,123,0.3)`,
        }}
      />

      {/* Horizontal accent lines - enhanced */}
      <div className="fixed inset-0 z-[-3] pointer-events-none" style={{ opacity: isPlaying ? 1 : 0 }}>
        <div
          className="absolute top-1/3 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary-500/40 to-transparent"
          style={{
            transform: isPlaying ? `translateY(${Math.sin(Date.now() * 0.001) * 5}px)` : "none",
            opacity: isPlaying ? 0.8 + Math.sin(Date.now() * 0.0005) * 0.2 : 0.8,
            boxShadow: "0 0 15px rgba(227,74,123,0.6)"
          }}
        />

        <div
          className="absolute bottom-1/3 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-secondary-500/40 to-transparent"
          style={{
            transform: isPlaying ? `translateY(${Math.sin(Date.now() * 0.0008 + 1) * -5}px)` : "none",
            opacity: isPlaying ? 0.8 + Math.sin(Date.now() * 0.0004 + 2) * 0.2 : 0.8,
            boxShadow: "0 0 15px rgba(123,58,237,0.6)"
          }}
        />
      </div>

      {/* Dynamic chorus-specific effect - enhanced */}
      {isChorus && (
        <div className="fixed inset-0 z-[-2] pointer-events-none" style={{ opacity: 1 }}>
          <div
            className="absolute inset-0 bg-gradient-radial from-primary-500/20 via-secondary-500/15 to-transparent"
            style={{
              transform: `scale(${1 + Math.sin(Date.now() * 0.0005) * 0.05})`,
              opacity: 0.8 + Math.sin(Date.now() * 0.0003) * 0.15,
              animation: "pulse 4s ease-in-out infinite"
            }}
          />
          
          {/* Additional chorus-specific light beams */}
          <div className="absolute inset-0 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={`beam-${i}`}
                className="absolute opacity-20"
                style={{
                  top: '50%',
                  left: '50%',
                  width: '10px',
                  height: '300vh',
                  background: 'linear-gradient(to top, rgba(227,74,123,0), rgba(227,74,123,1) 30%, rgba(227,74,123,0) 100%)',
                  transform: `translateX(-50%) translateY(-50%) rotate(${90 * i + Math.sin(Date.now() * 0.0003 * i) * 5}deg)`,
                  transformOrigin: 'center center',
                  boxShadow: '0 0 20px rgba(227,74,123,0.8)'
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Audio reactive bottom gradient - enhanced */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[-1] pointer-events-none"
        style={{
          opacity: isPlaying ? 0.5 : 0.2,
          height: isPlaying ? 150 + Math.sin(Date.now() * 0.0004) * 20 : 100,
          background: `linear-gradient(to top, rgba(${isChorus ? "227,74,123" : "123,58,237"},0.25) 0%, transparent 100%)`,
          boxShadow: isChorus
            ? "0 -5px 30px rgba(227,74,123,0.4)"
            : "0 -5px 30px rgba(123,58,237,0.4)"
        }}
      />
      
      {/* Audio reactive top gradient - new */}
      <div
        className="fixed top-0 left-0 right-0 z-[-1] pointer-events-none"
        style={{
          opacity: isPlaying ? 0.3 : 0.15,
          height: isPlaying ? 100 + Math.sin(Date.now() * 0.0003) * 15 : 80,
          background: `linear-gradient(to bottom, rgba(${!isChorus ? "227,74,123" : "123,58,237"},0.2) 0%, transparent 100%)`,
          transform: `scaleY(${isPlaying ? (1 + (currentAudioIntensityRef.current - 1) * 0.1) : 1})`,
          transformOrigin: "top"
        }}
      />
    </>
  );
};

export default Background;