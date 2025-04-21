"use client"

import React, { useEffect, useRef, useState, useMemo } from "react"
import { motion } from "framer-motion"
import * as THREE from "three"
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber"
import {
  Stars,
  Trail,
  Cloud,
  Sparkles,
  CameraShake,
  PerformanceMonitor,
  MeshDistortMaterial,
  GradientTexture,
  Sphere,
  Float,
  shaderMaterial,
} from "@react-three/drei"
import { EffectComposer, Bloom, ChromaticAberration, DepthOfField, Vignette } from "@react-three/postprocessing"

// Utility functions
const lerp = (start, end, t) => start + (end - start) * t
const random = (min, max) => Math.random() * (max - min) + min
const randomInt = (min, max) => Math.floor(random(min, max))

// Configuration object
const CONFIG = {
  MOBILE: {
    CAMERA_DISTANCE: 25,
    PARTICLE_COUNT: 1500,
    STAR_COUNT: 2000,
    PLANET_SCALE: 0.7,
    NEBULA_SCALE: 1.2,
    SHOW_SECONDARY_EFFECTS: false,
    PLANET_COUNT: 4,
  },
  DESKTOP: {
    CAMERA_DISTANCE: 15,
    PARTICLE_COUNT: 5000,
    STAR_COUNT: 6000,
    PLANET_SCALE: 1.0,
    NEBULA_SCALE: 1.0,
    SHOW_SECONDARY_EFFECTS: true,
    PLANET_COUNT: 8,
  },
  TRANSITION_DURATION: 2.0, // seconds
  COLORS: {
    VERSE: {
      PRIMARY: "#7c3aed",
      SECONDARY: "#3b82f6",
      BG_DARK: "#0a0a18",
      BG_MID: "#0f0a20",
    },
    CHORUS: {
      PRIMARY: "#e34a7b",
      SECONDARY: "#ff6b9d",
      BG_DARK: "#120010",
      BG_MID: "#220022",
    },
  },
  // Camera paths for smooth animation
  CAMERA_PATHS: {
    VERSE: {
      positions: [
        [0, 0, 15],
        [2, 1, 14],
        [-2, -1, 16],
        [0, 0, 15],
      ],
      rotations: [
        [0, 0, 0],
        [0.05, 0.05, 0],
        [-0.05, -0.05, 0],
        [0, 0, 0],
      ],
      durations: [15, 10, 12, 8],
    },
    CHORUS: {
      positions: [
        [0, 2, 10],
        [3, 4, 8],
        [-3, 2, 7],
        [0, 2, 10],
      ],
      rotations: [
        [0.2, 0, 0],
        [0.2, 0.15, 0.05],
        [0.2, -0.15, -0.05],
        [0.2, 0, 0],
      ],
      durations: [8, 6, 6, 5],
    },
  },
}

// Main Background component
const Background = ({ isPlaying, audioLevel = [], currentLyric, isChorus, onLoad, recoveryMode = false }) => {
  // State
  const [audioIntensity, setAudioIntensity] = useState(0.5)
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false)
  const [isLowPerformance, setIsLowPerformance] = useState(false)

  // Refs for performance optimization
  const lastAudioProcessTimeRef = useRef(0)
  const choruxTransitionRef = useRef(false)
  const transitionTimeRef = useRef(0)
  const deviceConfigRef = useRef(isMobile ? CONFIG.MOBILE : CONFIG.DESKTOP)
  const isMountedRef = useRef(true)

  // Notify parent when background is loaded
  useEffect(() => {
    if (onLoad) {
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          onLoad()
        }
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [onLoad])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Responsive handling with debounce
  useEffect(() => {
    let resizeTimeout
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        if (isMountedRef.current) {
          const newIsMobile = window.innerWidth < 768
          setIsMobile(newIsMobile)
          deviceConfigRef.current = newIsMobile ? CONFIG.MOBILE : CONFIG.DESKTOP
        }
      }, 200)
    }

    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
      clearTimeout(resizeTimeout)
    }
  }, [])

  // Process audio levels for visualization (throttled)
  useEffect(() => {
    if (!audioLevel || audioLevel.length === 0 || !isMountedRef.current) return

    const now = Date.now()
    if (now - lastAudioProcessTimeRef.current < 50) return
    lastAudioProcessTimeRef.current = now

    // Simplified frequency analysis for better performance
    const bassRange = Math.min(15, audioLevel.length)
    const subBassRange = Math.min(8, audioLevel.length)
    const midRange = [Math.floor(audioLevel.length * 0.2), Math.floor(audioLevel.length * 0.6)]

    let bassSum = 0,
      subBassSum = 0,
      midSum = 0

    // Process frequency ranges
    for (let i = 0; i < subBassRange; i++) {
      subBassSum += audioLevel[i] || 0
    }

    for (let i = subBassRange; i < bassRange; i++) {
      bassSum += audioLevel[i] || 0
    }

    for (let i = midRange[0]; i < midRange[1]; i++) {
      midSum += audioLevel[i] || 0
    }

    const subBassAvg = subBassSum / subBassRange / 255
    const bassAvg = bassSum / (bassRange - subBassRange) / 255
    const midAvg = midSum / (midRange[1] - midRange[0]) / 255

    // Calculate weighted intensity
    const newIntensity = 1 + (subBassAvg * 2.5 + bassAvg * 2 + midAvg * 1.5) / 3

    // Smooth out intensity changes
    setAudioIntensity((prev) => lerp(prev, newIntensity, 0.3))
  }, [audioLevel])

  // Track chorus transitions
  useEffect(() => {
    if (choruxTransitionRef.current !== isChorus) {
      choruxTransitionRef.current = isChorus
      transitionTimeRef.current = Date.now()
    }
  }, [isChorus])

  return (
    <>
      {/* Deep space gradient background */}
      <div
        className="fixed inset-0 z-[-10] transition-colors duration-1000"
        style={{
          background: `linear-gradient(to bottom, 
            ${isChorus ? CONFIG.COLORS.CHORUS.BG_DARK : CONFIG.COLORS.VERSE.BG_DARK},
            ${isChorus ? CONFIG.COLORS.CHORUS.BG_MID : CONFIG.COLORS.VERSE.BG_MID},
            ${isChorus ? CONFIG.COLORS.CHORUS.BG_DARK : CONFIG.COLORS.VERSE.BG_DARK}
          )`,
        }}
      />

      {/* 3D Canvas with performance monitoring */}
      <div className="fixed inset-0 z-[-9]">
        <Canvas
          dpr={[1, isMobile ? 1.5 : 2]}
          gl={{
            antialias: !isMobile,
            powerPreference: "high-performance",
            alpha: false, // Improve performance
            stencil: false, // Improve performance
            depth: true,
            failIfMajorPerformanceCaveat: false, // Be more tolerant of performance issues
          }}
          camera={{ fov: isMobile ? 70 : 60, near: 0.1, far: 1000 }}
          performance={{ min: 0.5 }}
          shadows={false} // Disable shadows for performance
          // Important: Use a consistent key to prevent complete remounts
          key="space-canvas"
        >
          <PerformanceMonitor
            onDecline={() => {
              setIsLowPerformance(true)
            }}
          >
            <SpaceScene
              audioIntensity={audioIntensity}
              isChorus={isChorus}
              isPlaying={isPlaying}
              isMobile={isMobile}
              isLowPerformance={isLowPerformance || recoveryMode}
              deviceConfig={deviceConfigRef.current}
              currentLyric={currentLyric}
            />
          </PerformanceMonitor>
        </Canvas>
      </div>

      {/* Noise texture for grain effect */}
      <div className="fixed inset-0 z-[-8] opacity-[0.03] pointer-events-none bg-noise" />

      {/* Vignette effect */}
      <div className="fixed inset-0 z-[-7] pointer-events-none shadow-vignette" />

      {/* Reactive center glow */}
      <motion.div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96 z-[-6] pointer-events-none"
        animate={{
          opacity: isPlaying ? (isChorus ? 0.4 * audioIntensity : 0.3 * audioIntensity) : 0.3,
          scale: isPlaying ? [1, 1.05, 1] : 1,
        }}
        transition={{
          opacity: { duration: 0.5 },
          scale: { duration: 2, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" },
        }}
        style={{
          background: `radial-gradient(circle, rgba(${
            isChorus ? "227,74,123" : "123,58,237"
          },0.4) 0%, rgba(${isChorus ? "123,58,237" : "227,74,123"},0.2) 50%, rgba(0,0,0,0) 70%)`,
          filter: "blur(40px)",
        }}
      />

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
  )
}

// Space scene component - handles the 3D environment
const SpaceScene = ({
  audioIntensity,
  isChorus,
  isPlaying,
  isMobile,
  isLowPerformance,
  deviceConfig,
  currentLyric,
}) => {
  const { camera, scene, gl } = useThree()
  const groupRef = useRef()
  const starsRef = useRef()
  const nebulaRef = useRef()
  const galaxyRef = useRef()
  const timeRef = useRef(0)
  const choruxTransitionProgressRef = useRef(0)
  const cameraPathIndexRef = useRef(0)
  const cameraPathTimeRef = useRef(0)
  const activeCameraPathRef = useRef(isChorus ? CONFIG.CAMERA_PATHS.CHORUS : CONFIG.CAMERA_PATHS.VERSE)
  const isMountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Setup the 3D scene once
  useEffect(() => {
    if (!isMountedRef.current) return

    // Configure renderer for better performance
    gl.outputEncoding = THREE.sRGBEncoding
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = 1.2

    // Set initial camera position
    camera.position.set(0, 0, deviceConfig.CAMERA_DISTANCE)
    camera.fov = isMobile ? 70 : 60
    camera.updateProjectionMatrix()

    // Add subtle fog for depth
    scene.fog = new THREE.FogExp2(
      isChorus ? CONFIG.COLORS.CHORUS.BG_DARK : CONFIG.COLORS.VERSE.BG_DARK,
      isMobile ? 0.002 : 0.003,
    )

    return () => {
      if (scene.fog) {
        scene.fog = null
      }
    }
  }, [camera, scene, gl, isMobile, isChorus, deviceConfig])

  // Update fog color on chorus change
  useEffect(() => {
    if (!isMountedRef.current) return

    if (scene.fog) {
      scene.fog.color.set(isChorus ? CONFIG.COLORS.CHORUS.BG_DARK : CONFIG.COLORS.VERSE.BG_DARK)
    }
  }, [isChorus, scene])

  // Handle camera path based on song section
  useEffect(() => {
    if (!isMountedRef.current) return

    // Reset camera path progress on section change
    activeCameraPathRef.current = isChorus ? CONFIG.CAMERA_PATHS.CHORUS : CONFIG.CAMERA_PATHS.VERSE
    cameraPathIndexRef.current = 0
    cameraPathTimeRef.current = 0
  }, [isChorus])

  // Apply smooth camera animation along predefined paths
  useFrame((_, delta) => {
    if (!isMountedRef.current) return

    // Increment global time
    timeRef.current += delta * (isPlaying ? 0.5 : 0.1)

    // Handle smooth section transitions
    const targetTransitionProgress = isChorus ? 1 : 0
    choruxTransitionProgressRef.current = lerp(
      choruxTransitionProgressRef.current,
      targetTransitionProgress,
      delta * 1.5,
    )

    // Camera path animation
    if (isPlaying) {
      // Get current camera path segment
      const path = activeCameraPathRef.current
      const segmentIndex = cameraPathIndexRef.current
      const segmentDuration = path.durations[segmentIndex]

      // Increment path time
      cameraPathTimeRef.current += delta
      const pathProgress = Math.min(1, cameraPathTimeRef.current / segmentDuration)

      // Get current and next position/rotation
      const currPosIndex = segmentIndex % path.positions.length
      const nextPosIndex = (segmentIndex + 1) % path.positions.length

      const currPos = path.positions[currPosIndex]
      const nextPos = path.positions[nextPosIndex]

      const currRot = path.rotations[currPosIndex]
      const nextRot = path.rotations[nextPosIndex]

      // Interpolate camera position and rotation
      camera.position.x = lerp(currPos[0], nextPos[0], pathProgress)
      camera.position.y = lerp(currPos[1], nextPos[1], pathProgress)
      camera.position.z = lerp(currPos[2], nextPos[2], pathProgress)

      // Apply rotation - convert to radians
      camera.rotation.x = lerp(currRot[0], nextRot[0], pathProgress)
      camera.rotation.y = lerp(currRot[1], nextRot[1], pathProgress)
      camera.rotation.z = lerp(currRot[2], nextRot[2], pathProgress)

      // Move to next segment if needed
      if (pathProgress >= 1) {
        cameraPathIndexRef.current = (cameraPathIndexRef.current + 1) % path.positions.length
        cameraPathTimeRef.current = 0
      }

      // Apply audio reactivity to camera
      if (audioIntensity > 1.3) {
        camera.position.y += Math.sin(timeRef.current * 2) * 0.02 * (audioIntensity - 1)
        camera.position.x += Math.cos(timeRef.current * 3) * 0.01 * (audioIntensity - 1)
      }
    }

    // Apply group rotation for the whole scene
    if (groupRef.current) {
      // Slower rotation when not playing, faster with audio intensity
      groupRef.current.rotation.y += delta * (isPlaying ? 0.05 * audioIntensity : 0.01)

      // Subtle wobble based on audio
      if (isPlaying && audioIntensity > 1.2) {
        groupRef.current.rotation.x = Math.sin(timeRef.current * 0.2) * 0.03 * (audioIntensity - 1)
      }
    }

    // Update stars
    if (starsRef.current && isPlaying) {
      // Make stars pulse with the beat
      const pulseScale = 1 + 0.05 * Math.sin(timeRef.current * 2) * audioIntensity
      starsRef.current.scale.set(pulseScale, pulseScale, 1)
    }

    // Update nebula
    if (nebulaRef.current && isPlaying) {
      // Dynamic opacity based on audio
      nebulaRef.current.material.opacity = 0.3 + 0.2 * Math.sin(timeRef.current) * audioIntensity

      // Subtle breathing animation
      const breathScale = deviceConfig.NEBULA_SCALE * (1 + 0.1 * Math.sin(timeRef.current * 0.5) * audioIntensity)
      nebulaRef.current.scale.set(breathScale, breathScale, breathScale)
    }

    // Update galaxy
    if (galaxyRef.current) {
      // Rotate galaxy based on section and audio
      galaxyRef.current.rotation.z += delta * 0.1 * (isChorus ? 1.5 : 1) * (isPlaying ? audioIntensity : 0.5)

      // Scale based on chorus/verse transition
      const galaxyScale = lerp(1, 1.5, choruxTransitionProgressRef.current)
      galaxyRef.current.scale.set(galaxyScale, galaxyScale, 1)
    }
  })

  // Determine which effects to render based on performance
  const effectsToRender = useMemo(() => {
    if (isLowPerformance) {
      return (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.8} luminanceThreshold={0.6} />
          <Vignette darkness={0.5} offset={0.5} />
        </EffectComposer>
      )
    }

    return (
      <EffectComposer multisampling={0}>
        <DepthOfField focusDistance={0.025} focalLength={0.025} bokehScale={3} height={480} />
        <Bloom intensity={1.2} luminanceThreshold={0.6} luminanceSmoothing={0.9} />
        <ChromaticAberration offset={[0.002, 0.002].map((x) => x * audioIntensity)} />
        <Vignette darkness={0.5} offset={0.5} />
      </EffectComposer>
    )
  }, [isLowPerformance, audioIntensity])

  return (
    <group ref={groupRef}>
      {/* Post-processing effects */}
      {effectsToRender}

      {/* Chorus-specific effects */}
      <ChorusEffects
        isChorus={isChorus}
        audioIntensity={audioIntensity}
        isPlaying={isPlaying}
        currentLyric={currentLyric}
        isLowPerformance={isLowPerformance}
      />

      {/* Subtle camera shake effect during high intensity */}
      {isPlaying && audioIntensity > 1.3 && !isLowPerformance && (
        <CameraShake
          maxYaw={0.01}
          maxPitch={0.01}
          maxRoll={0.01}
          yawFrequency={0.5}
          pitchFrequency={0.4}
          rollFrequency={0.3}
          intensity={0.2 * (audioIntensity - 1)}
        />
      )}

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
        count={deviceConfig.STAR_COUNT}
        factor={5}
        saturation={isChorus ? 0.7 : 0.5}
        fade
        speed={isPlaying ? 1 * audioIntensity : 0.2}
      />

      {/* Solar System */}
      <SolarSystem
        audioIntensity={audioIntensity}
        isChorus={isChorus}
        isPlaying={isPlaying}
        isMobile={isMobile}
        isLowPerformance={isLowPerformance}
        planetCount={deviceConfig.PLANET_COUNT}
        scale={deviceConfig.PLANET_SCALE}
        choruxTransitionProgress={choruxTransitionProgressRef.current}
      />

      {/* Central galaxy with trails */}
      <group ref={galaxyRef} position={[0, isMobile ? -5 : -2, isMobile ? -15 : -8]} rotation={[0.5, 0, 0]}>
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

      {/* Effects for higher performance devices */}
      {!isLowPerformance && (
        <>
          {/* Cloud formations */}
          <CloudFormation
            count={isMobile ? 2 : 4}
            intensity={audioIntensity}
            isChorus={isChorus}
            isPlaying={isPlaying}
            scale={isMobile ? 1.5 : 1}
          />

          {/* Particles effect */}
          <SpaceParticles
            count={deviceConfig.PARTICLE_COUNT / 4}
            size={0.08}
            intensity={audioIntensity}
            isChorus={isChorus}
            isPlaying={isPlaying}
          />

          {/* Special effects - conditionally rendered based on playing state */}
          {isPlaying && (
            <>
              <ShootingStars count={isMobile ? 2 : 4} intensity={audioIntensity} isChorus={isChorus} />

              {/* Only show comet on chorus or when lyrics are active */}
              {(isChorus || (currentLyric && currentLyric !== "...")) && (
                <Comet intensity={audioIntensity} isChorus={isChorus} count={isChorus ? 2 : 1} />
              )}
            </>
          )}
        </>
      )}
    </group>
  )
}

// Add this new component for chorus-specific effects
const ChorusEffects = ({ isChorus, audioIntensity, isPlaying, currentLyric, isLowPerformance }) => {
  const [chorusTransition, setChorusTransition] = useState(false)
  const prevChorusRef = useRef(false)
  const timeRef = useRef(0)
  const ringsRef = useRef([])
  const glowRef = useRef()
  const lightRaysRef = useRef()
  const chordsRef = useRef()
  const transitionTimeoutRef = useRef(null)
  const isMountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [])

  // Set up rings for chorus
  useEffect(() => {
    if (!isMountedRef.current) return

    ringsRef.current = Array(5)
      .fill()
      .map((_, i) => ({
        radius: (i + 1) * 2,
        width: 0.1 + Math.random() * 0.2,
        speed: 0.5 + Math.random() * 0.5,
        offset: Math.random() * Math.PI * 2,
        scale: 1,
      }))
  }, [])

  // Handle chorus transitions
  useEffect(() => {
    if (!isMountedRef.current) return

    // Check if this is a transition TO chorus
    if (isChorus && !prevChorusRef.current) {
      setChorusTransition(true)

      // Clear any existing timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
      }

      // Reset transition after a short period
      transitionTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setChorusTransition(false)
        }
      }, 1000)
    }

    prevChorusRef.current = isChorus
  }, [isChorus])

  // Main animation loop
  useFrame((_, delta) => {
    if (!isMountedRef.current) return

    timeRef.current += delta * (isPlaying ? 1 : 0.2)

    // Update glow material
    if (glowRef.current?.material) {
      glowRef.current.material.uniforms.time.value = timeRef.current
      glowRef.current.material.uniforms.intensity.value = isChorus ? 0.8 * audioIntensity : 0

      // Grow when in chorus
      const targetScale = isChorus ? 1 : 0
      glowRef.current.scale.x = THREE.MathUtils.lerp(glowRef.current.scale.x, targetScale, delta * 3)
      glowRef.current.scale.y = THREE.MathUtils.lerp(glowRef.current.scale.y, targetScale, delta * 3)
      glowRef.current.scale.z = THREE.MathUtils.lerp(glowRef.current.scale.z, targetScale, delta * 3)
    }

    // Update light rays
    if (lightRaysRef.current?.material) {
      lightRaysRef.current.material.uniforms.time.value = timeRef.current
      lightRaysRef.current.material.uniforms.intensity.value = isChorus ? 0.6 * audioIntensity : 0

      // Rotate light rays
      lightRaysRef.current.rotation.z += delta * 0.1
    }

    // Update floating chord progression visualization
    if (chordsRef.current && isChorus) {
      chordsRef.current.position.y = Math.sin(timeRef.current) * 0.5
      chordsRef.current.rotation.y += delta * 0.2
    }
  })

  return (
    <group visible={isChorus || chorusTransition}>
      {/* Transition effect when chorus starts */}
      {chorusTransition && <ChorusTransitionEffect />}

      {/* Glowing background for chorus */}
      <mesh ref={glowRef} position={[0, 0, -15]} scale={isChorus ? 1 : 0}>
        <planeGeometry args={[50, 50]} />
        <chorusGlowMaterial transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Volumetric light rays */}
      <mesh ref={lightRaysRef} position={[0, 0, -12]} scale={15}>
        <planeGeometry args={[2, 2]} />
        <lightRayMaterial transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Expanding rings */}
      {isChorus &&
        !isLowPerformance &&
        ringsRef.current.map((ring, i) => (
          <ExpandingRing
            key={`chorus-ring-${i}`}
            radius={ring.radius}
            width={ring.width}
            speed={ring.speed}
            offset={ring.offset}
            audioIntensity={audioIntensity}
            timeRef={timeRef}
            isChorus={isChorus}
          />
        ))}

      {/* Floating chord progression visualization */}
      {isChorus && !isLowPerformance && (
        <Float ref={chordsRef} speed={2} rotationIntensity={1} floatIntensity={1} position={[0, 0, -8]}>
          <Sphere args={[1.5, 32, 32]} position={[0, 0, 0]}>
            <MeshDistortMaterial
              color={CONFIG.COLORS.CHORUS.PRIMARY}
              distort={0.4 * audioIntensity}
              speed={4}
              transparent
              opacity={0.7}
            >
              <GradientTexture stops={[0, 1]} colors={[CONFIG.COLORS.CHORUS.PRIMARY, CONFIG.COLORS.CHORUS.SECONDARY]} />
            </MeshDistortMaterial>
          </Sphere>

          {/* Audio-reactive particles */}
          <Sparkles
            count={50}
            scale={[5, 5, 5]}
            size={audioIntensity}
            speed={0.3}
            opacity={0.7}
            color={CONFIG.COLORS.CHORUS.SECONDARY}
          />
        </Float>
      )}

      {/* Lyric accent particles - only on emphasized lyrics */}
      {isChorus && currentLyric && currentLyric.toLowerCase().includes("smile") && !isLowPerformance && (
        <LyricAccentBurst intensity={audioIntensity} />
      )}
    </group>
  )
}

// Fixed ChorusTransitionEffect component - resolving the error
const ChorusTransitionEffect = ({ position = [0, 0, -10] }) => {
  const meshRef = useRef()
  const animationRef = useRef(null)
  const isMountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [])

  // Create explosion animation when component mounts
  useEffect(() => {
    if (!meshRef.current) return

    // Initialize scale and opacity
    meshRef.current.scale.set(0.001, 0.001, 0.001)
    if (meshRef.current.material) {
      meshRef.current.material.opacity = 1
    }

    // Animation variables
    const startTime = Date.now()
    const duration = 1000 // 1 second animation

    // Fixed animateExplosion function - this was causing the error
    const animateExplosion = () => {
      if (!isMountedRef.current || !meshRef.current) {
        return
      }

      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function for smooth animation
      const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))
      const eased = easeOutExpo(progress)

      // Scale up quickly
      meshRef.current.scale.set(eased * 30, eased * 30, eased * 30)

      // Fade out gradually
      if (meshRef.current.material) {
        meshRef.current.material.opacity = 1 - eased
      }

      if (progress < 1 && isMountedRef.current) {
        animationRef.current = requestAnimationFrame(animateExplosion)
      }
    }

    // Start animation
    animationRef.current = requestAnimationFrame(animateExplosion)

    // Cleanup animation on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [])

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial
        color={CONFIG.COLORS.CHORUS.PRIMARY}
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

// Component for expanding rings
const ExpandingRing = ({ radius, width, speed, offset, audioIntensity, timeRef, isChorus }) => {
  const ringRef = useRef()
  const materialRef = useRef()
  const initialRadius = useRef(radius)
  const pulseRef = useRef(0)
  const isMountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useFrame((_, delta) => {
    if (!isMountedRef.current || !ringRef.current || !materialRef.current) return

    // Update shader uniforms
    materialRef.current.uniforms.time.value = timeRef.current
    materialRef.current.uniforms.intensity.value = audioIntensity

    // Calculate expanding radius effect
    const currentTime = timeRef.current + offset
    const expansion = Math.sin(currentTime * speed) * 0.3 * audioIntensity
    const currentRadius = initialRadius.current * (1 + expansion)

    // Update ring properties
    materialRef.current.uniforms.ringRadius.value = 0.5 * (1 - 1 / currentRadius)
    materialRef.current.uniforms.ringWidth.value = width / currentRadius

    // Pulse scale on audio beats
    if (audioIntensity > 1.3 && pulseRef.current <= 0) {
      pulseRef.current = 0.3
    }

    if (pulseRef.current > 0) {
      pulseRef.current -= delta
      const pulse = THREE.MathUtils.smoothstep(pulseRef.current, 0, 0.3) * 0.2
      ringRef.current.scale.set(currentRadius * (1 + pulse), currentRadius * (1 + pulse), 1)
    } else {
      ringRef.current.scale.set(currentRadius, currentRadius, 1)
    }

    // Rotate ring
    ringRef.current.rotation.z += delta * 0.1 * speed
  })

  return (
    <mesh ref={ringRef} position={[0, 0, -10 - radius * 0.5]}>
      <planeGeometry args={[2, 2]} />
      <expandingRingMaterial ref={materialRef} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  )
}

// Component for lyric accent bursts
const LyricAccentBurst = ({ intensity }) => {
  const burstRef = useRef()
  const particlesRef = useRef()
  const startTimeRef = useRef(Date.now())
  const isMountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useFrame(() => {
    if (!isMountedRef.current || !burstRef.current || !particlesRef.current) return

    const elapsed = (Date.now() - startTimeRef.current) / 1000

    // Expand and fade out
    burstRef.current.scale.set(1 + elapsed * 2, 1 + elapsed * 2, 1 + elapsed * 2)

    if (burstRef.current.material) {
      burstRef.current.material.opacity = Math.max(0, 1 - elapsed)
    }

    // Animate particles
    particlesRef.current.rotation.y += 0.01
    particlesRef.current.rotation.z += 0.005
  })

  return (
    <group position={[0, 0, -5]}>
      {/* Central burst */}
      <mesh ref={burstRef}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial
          color={CONFIG.COLORS.CHORUS.PRIMARY}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Particles */}
      <group ref={particlesRef}>
        <Sparkles
          count={100}
          scale={[10, 10, 10]}
          size={intensity}
          speed={0.5}
          opacity={0.7}
          color={CONFIG.COLORS.CHORUS.SECONDARY}
        />
      </group>
    </group>
  )
}

// Solar System Component - optimized for performance
const SolarSystem = ({
  audioIntensity,
  isChorus,
  isPlaying,
  isMobile,
  isLowPerformance,
  planetCount,
  scale,
  choruxTransitionProgress,
}) => {
  const sunRef = useRef()
  const planetsRef = useRef([])
  const orbitPathsRef = useRef([])
  const timeRef = useRef(0)
  const isMountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Create solar system configuration
  const solarSystemData = useMemo(() => {
    const sunRadius = 1.5 * scale
    const orbitMinRadius = 6
    const orbitMaxRadius = 30

    // Create sun
    const sun = {
      position: [0, 0, -20],
      radius: sunRadius,
      color: isChorus ? CONFIG.COLORS.CHORUS.PRIMARY : CONFIG.COLORS.VERSE.PRIMARY,
      emissiveColor: isChorus ? CONFIG.COLORS.CHORUS.SECONDARY : CONFIG.COLORS.VERSE.SECONDARY,
      rotationSpeed: 0.05,
    }

    // Create planets
    const planets = []
    for (let i = 0; i < planetCount; i++) {
      // Calculate orbit properties
      const orbitRadius = orbitMinRadius + (orbitMaxRadius - orbitMinRadius) * (i / planetCount)
      const orbitSpeed = 0.1 * (1 - (i / planetCount) * 0.8) // Outer planets move slower
      const orbitAngle = Math.random() * Math.PI * 2
      const orbitTilt = (Math.random() - 0.5) * 0.3

      // Calculate planet properties
      const planetRadius = (0.3 + Math.random() * 0.7) * scale
      const hasRings = Math.random() < 0.3
      const hasMoons = Math.random() < 0.6
      const moonCount = hasMoons ? Math.floor(Math.random() * 2) + 1 : 0

      // Assign colors based on position in system
      const isVerseColor = i % 2 === 0
      const planetColor = isVerseColor ? CONFIG.COLORS.VERSE.PRIMARY : CONFIG.COLORS.CHORUS.PRIMARY
      const planetHighlightColor = isVerseColor ? CONFIG.COLORS.VERSE.SECONDARY : CONFIG.COLORS.CHORUS.SECONDARY

      // Create moons
      const moons = []
      for (let j = 0; j < moonCount; j++) {
        moons.push({
          radius: planetRadius * 0.3,
          orbitRadius: planetRadius * 2 + j,
          orbitSpeed: 0.5 + Math.random() * 0.5,
          orbitAngle: Math.random() * Math.PI * 2,
          color: planetHighlightColor,
        })
      }

      planets.push({
        orbitRadius,
        orbitSpeed,
        orbitAngle,
        orbitTilt,
        radius: planetRadius,
        color: planetColor,
        highlightColor: planetHighlightColor,
        rotationSpeed: 0.1 + Math.random() * 0.2,
        hasRings,
        hasMoons,
        moons,
      })
    }

    return { sun, planets }
  }, [planetCount, scale, isChorus])

  // Create orbit path geometries
  useEffect(() => {
    if (!isMountedRef.current) return

    // Initialize orbit path references
    orbitPathsRef.current = new Array(planetCount)
    planetsRef.current = new Array(planetCount)
  }, [planetCount])

  // Animation loop
  useFrame((_, delta) => {
    if (!isMountedRef.current) return

    timeRef.current += delta * (isPlaying ? 1 : 0.2)

    // Animate sun
    if (sunRef.current) {
      sunRef.current.rotation.y += delta * solarSystemData.sun.rotationSpeed

      // Pulse sun based on audio
      if (isPlaying) {
        const pulseScale = 1 + 0.05 * Math.sin(timeRef.current * 2) * audioIntensity
        sunRef.current.scale.set(pulseScale, pulseScale, pulseScale)
      }
    }

    // Animate planets
    solarSystemData.planets.forEach((planet, i) => {
      if (planetsRef.current[i]) {
        const planetObj = planetsRef.current[i]

        // Update planet rotation
        planetObj.rotation.y += delta * planet.rotationSpeed * (isPlaying ? audioIntensity : 0.5)

        // Update planet position - orbit animation
        const angle = planet.orbitAngle + timeRef.current * planet.orbitSpeed

        // Create elliptical orbit
        const x = Math.cos(angle) * planet.orbitRadius
        const z = Math.sin(angle) * planet.orbitRadius - 20 // Center around -20 on z-axis
        const y = Math.sin(angle) * planet.orbitTilt * 5

        planetObj.position.set(x, y, z)

        // Scale effect during chorus transition
        if (choruxTransitionProgress > 0) {
          const scaleEffect = 1 + choruxTransitionProgress * 0.2
          planetObj.scale.set(scaleEffect, scaleEffect, scaleEffect)
        } else {
          planetObj.scale.set(1, 1, 1)
        }

        // Animate moons
        if (planet.hasMoons) {
          // Find moon objects (they are children of the planet)
          for (let j = 1; j < planetObj.children.length; j++) {
            const moon = planetObj.children[j]
            const moonData = planet.moons[j - 1]

            if (moon && moonData) {
              // Calculate moon orbit position
              const moonAngle = moonData.orbitAngle + timeRef.current * moonData.orbitSpeed
              const moonX = Math.cos(moonAngle) * moonData.orbitRadius
              const moonY = Math.sin(moonAngle) * moonData.orbitRadius * 0.3
              const moonZ = Math.sin(moonAngle) * moonData.orbitRadius

              moon.position.set(moonX, moonY, moonZ)
            }
          }
        }
      }
    })
  })

  return (
    <group position={[0, 0, 0]}>
      {/* Sun */}
      <mesh ref={sunRef} position={solarSystemData.sun.position}>
        <sphereGeometry args={[solarSystemData.sun.radius, 32, 32]} />
        <meshStandardMaterial
          color={solarSystemData.sun.color}
          emissive={solarSystemData.sun.emissiveColor}
          emissiveIntensity={1.5}
          roughness={0.7}
          metalness={0.3}
        />

        {/* Sun glow */}
        <Sparkles
          count={20}
          scale={[3, 3, 3]}
          size={0.5}
          speed={0.3}
          opacity={0.7}
          color={solarSystemData.sun.emissiveColor}
        />

        {/* Sun light */}
        <pointLight color={solarSystemData.sun.color} intensity={2} distance={40} />
      </mesh>

      {/* Planets */}
      {solarSystemData.planets.map((planet, i) => (
        <group key={`planet-${i}`} ref={(el) => (planetsRef.current[i] = el)}>
          {/* Planet body */}
          <mesh castShadow>
            <sphereGeometry args={[planet.radius, 32, 16]} />
            <meshStandardMaterial color={planet.color} roughness={0.7} metalness={0.2} />
          </mesh>

          {/* Planet atmosphere */}
          <mesh>
            <sphereGeometry args={[planet.radius * 1.2, 32, 16]} />
            <meshBasicMaterial color={planet.highlightColor} transparent opacity={0.1} side={THREE.BackSide} />
          </mesh>

          {/* Rings (if applicable) */}
          {planet.hasRings && (
            <mesh rotation={[Math.PI / 4, 0, 0]}>
              <ringGeometry args={[planet.radius * 1.5, planet.radius * 2.5, 64]} />
              <meshBasicMaterial color={planet.highlightColor} transparent opacity={0.3} side={THREE.DoubleSide} />
            </mesh>
          )}

          {/* Moons */}
          {planet.moons.map((moon, j) => (
            <mesh key={`moon-${i}-${j}`}>
              <sphereGeometry args={[moon.radius, 16, 16]} />
              <meshStandardMaterial color={moon.color} roughness={0.7} metalness={0.3} />
            </mesh>
          ))}

          {/* Planet light */}
          <pointLight color={planet.highlightColor} intensity={0.5} distance={planet.radius * 10} />
        </group>
      ))}

      {/* Orbit paths - only render if not in low performance mode */}
      {!isLowPerformance &&
        !isMobile &&
        solarSystemData.planets.map((planet, i) => (
          <mesh
            key={`orbit-${i}`}
            ref={(el) => (orbitPathsRef.current[i] = el)}
            rotation={[planet.orbitTilt, 0, 0]}
            position={[0, 0, -20]}
          >
            <ringGeometry args={[planet.orbitRadius, planet.orbitRadius + 0.05, 128]} />
            <meshBasicMaterial color={planet.highlightColor} transparent opacity={0.1} side={THREE.DoubleSide} />
          </mesh>
        ))}
    </group>
  )
}

// Nebula component - large colorful cloud
const Nebula = React.forwardRef(({ position, color, intensity, isPlaying, isMobile }, ref) => {
  const meshRef = useRef()
  const timeRef = useRef(0)
  const isMountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useFrame((_, delta) => {
    if (!isMountedRef.current || !meshRef.current) return

    timeRef.current += delta * (isPlaying ? 0.1 : 0.02)

    // Slow rotation
    meshRef.current.rotation.z += delta * 0.02
    meshRef.current.rotation.y += delta * 0.01

    // Soft pulsing effect scaled by device
    const scale = isMobile ? CONFIG.MOBILE.NEBULA_SCALE : CONFIG.DESKTOP.NEBULA_SCALE
    meshRef.current.scale.x = scale * (1 + 0.05 * Math.sin(timeRef.current) * intensity)
    meshRef.current.scale.y = scale * (1 + 0.05 * Math.cos(timeRef.current * 1.3) * intensity)
    meshRef.current.scale.z = scale
  })

  return (
    <mesh
      ref={(node) => {
        meshRef.current = node
        if (ref) ref.current = node
      }}
      position={position}
    >
      <sphereGeometry args={[8, 32, 32]} />
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
  )
})

// Cloud formation component - creates multiple cloud clusters
const CloudFormation = ({ count, intensity, isChorus, isPlaying, scale = 1 }) => {
  const cloudRefs = useRef([])
  const timeRef = useRef(0)
  const isMountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Generate cloud positions - memoized to avoid recreating each render
  const cloudData = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      position: [random(-25, 25), random(-15, 15), random(-30, -5)],
      rotation: [random(-0.3, 0.3), random(-0.3, 0.3), random(-0.3, 0.3)],
      scale: random(0.7, 1.3) * scale,
      speed: random(0.6, 1.4),
      color: isChorus ? CONFIG.COLORS.CHORUS.SECONDARY : CONFIG.COLORS.VERSE.SECONDARY,
    }))
  }, [count, isChorus, scale])

  // Initialize cloud refs
  useEffect(() => {
    if (!isMountedRef.current) return
    cloudRefs.current = new Array(count)
  }, [count])

  useFrame((_, delta) => {
    if (!isMountedRef.current) return

    timeRef.current += delta * (isPlaying ? 0.2 : 0.05)

    cloudRefs.current.forEach((cloud, i) => {
      if (cloud) {
        const data = cloudData[i]

        // Gentle rotation
        cloud.rotation.y += delta * 0.05 * data.speed

        // Subtle movement
        if (isPlaying) {
          cloud.position.y += Math.sin(timeRef.current * 0.2 * data.speed) * delta * 0.1 * intensity
          cloud.position.x += Math.cos(timeRef.current * 0.1 * data.speed) * delta * 0.05 * intensity
        }
      }
    })
  })

  return (
    <>
      {cloudData.map((data, i) => (
        <group
          key={i}
          ref={(el) => (cloudRefs.current[i] = el)}
          position={data.position}
          rotation={data.rotation}
          scale={data.scale}
        >
          <Cloud
            opacity={0.4}
            speed={0.1} // Animation speed
            width={10}
            depth={3}
            segments={8} // Reduced for better performance
            color={data.color}
          />
        </group>
      ))}
    </>
  )
}

// Space particles component - simplified for better performance
const SpaceParticles = ({ count, size, intensity, isChorus, isPlaying }) => {
  const particlesRef = useRef()
  const timeRef = useRef(0)
  const isMountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Generate particle positions
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const colors = new Float32Array(count * 3)

    const color1 = new THREE.Color(isChorus ? CONFIG.COLORS.CHORUS.PRIMARY : CONFIG.COLORS.VERSE.PRIMARY)
    const color2 = new THREE.Color(isChorus ? CONFIG.COLORS.CHORUS.SECONDARY : CONFIG.COLORS.VERSE.SECONDARY)

    for (let i = 0; i < count; i++) {
      const r = 20 + Math.random() * 20
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      // Convert spherical to Cartesian coordinates
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      // Vary sizes
      sizes[i] = Math.random() * size * 2 + size * 0.5

      // Interpolate colors
      const mixFactor = Math.random()
      const mixedColor = color1.clone().lerp(color2, mixFactor)
      colors[i * 3] = mixedColor.r
      colors[i * 3 + 1] = mixedColor.g
      colors[i * 3 + 2] = mixedColor.b
    }

    return { positions, sizes, colors }
  }, [count, size, isChorus])

  useFrame((_, delta) => {
    if (!isMountedRef.current || !particlesRef.current) return

    timeRef.current += delta * (isPlaying ? 0.2 : 0.05)

    // Simple rotation animation
    particlesRef.current.rotation.y += delta * 0.02 * (isPlaying ? intensity : 0.5)
    particlesRef.current.rotation.x += delta * 0.01 * (isPlaying ? intensity : 0.2)
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={particles.positions} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={count} array={particles.sizes} itemSize={1} />
        <bufferAttribute attach="attributes-color" count={count} array={particles.colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={size} sizeAttenuation={true} vertexColors transparent opacity={0.6} fog={true} />
    </points>
  )
}

// Shooting stars with trails
const ShootingStars = ({ count, intensity, isChorus }) => {
  const starsRef = useRef([])
  const timeRef = useRef(0)
  const isMountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Generate shooting star paths
  const stars = useMemo(() => {
    return new Array(count).fill(0).map(() => {
      const startX = random(-40, 40)
      const startY = random(-10, 30)
      const startZ = random(-50, -10)

      const endX = startX + random(-30, 30)
      const endY = startY - random(20, 40)
      const endZ = startZ + random(-20, 20)

      return {
        start: new THREE.Vector3(startX, startY, startZ),
        end: new THREE.Vector3(endX, endY, endZ),
        duration: random(2, 6),
        delay: random(0, 15),
        size: random(0.05, 0.15),
        speed: random(0.8, 1.5),
        progress: 0,
        active: false,
      }
    })
  }, [count])

  useEffect(() => {
    if (!isMountedRef.current) return
    starsRef.current = new Array(count)
  }, [count])

  useFrame((_, delta) => {
    if (!isMountedRef.current) return

    timeRef.current += delta

    // Update star positions and progress
    stars.forEach((star, i) => {
      if (timeRef.current > star.delay) {
        if (!star.active) {
          star.active = true
          star.progress = 0
        }

        // Update progress
        star.progress += delta * star.speed * intensity

        // Reset if complete
        if (star.progress >= star.duration) {
          star.progress = 0
          star.delay = timeRef.current + random(1, 8)

          // Randomize new paths
          const startX = random(-40, 40)
          const startY = random(-10, 30)
          const startZ = random(-50, -10)

          const endX = startX + random(-30, 30)
          const endY = startY - random(20, 40)
          const endZ = startZ + random(-20, 20)

          star.start = new THREE.Vector3(startX, startY, startZ)
          star.end = new THREE.Vector3(endX, endY, endZ)
        }

        // Calculate current position with easing
        const t = star.progress / star.duration
        const eased = 1 - Math.pow(1 - t, 3) // Cubic ease-out

        if (starsRef.current[i]) {
          const pos = new THREE.Vector3().lerpVectors(star.start, star.end, eased)
          starsRef.current[i].position.copy(pos)
        }
      }
    })
  })

  return (
    <group>
      {stars.map((star, i) => (
        <Trail
          key={i}
          width={0.6}
          length={16}
          color={isChorus ? CONFIG.COLORS.CHORUS.PRIMARY : CONFIG.COLORS.VERSE.PRIMARY}
          attenuation={(t) => t * t}
          decay={2}
        >
          <mesh ref={(el) => (starsRef.current[i] = el)} position={star.start}>
            <sphereGeometry args={[star.size, 8, 8]} />
            <meshBasicMaterial color={"#ffffff"} />
          </mesh>
        </Trail>
      ))}
    </group>
  )
}

// Comet effect with trail
const Comet = ({ intensity, isChorus, count = 1 }) => {
  const cometsRef = useRef([])
  const timeRef = useRef(0)
  const isMountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Generate comet paths
  const comets = useMemo(() => {
    return new Array(count).fill(0).map((_, index) => {
      // Create a curved path for each comet
      const points = []
      const radius = 12 + index * 4
      const turns = 2 + index * 0.5
      const pointCount = 100
      const heightVariation = index * 2

      for (let i = 0; i < pointCount; i++) {
        const t = i / pointCount
        const angle = t * Math.PI * 2 * turns
        const x = radius * Math.cos(angle)
        const y = radius * Math.sin(angle) * 0.5 + Math.sin(angle * 3) * heightVariation
        const z = -20 + t * 40
        points.push(new THREE.Vector3(x, y, z))
      }

      return {
        path: new THREE.CatmullRomCurve3(points),
        progress: Math.random(),
        speed: 0.05 + index * 0.01,
      }
    })
  }, [count])

  useEffect(() => {
    if (!isMountedRef.current) return
    cometsRef.current = new Array(count)
  }, [count])

  useFrame((_, delta) => {
    if (!isMountedRef.current) return

    timeRef.current += delta

    comets.forEach((comet, i) => {
      if (cometsRef.current[i]) {
        // Update comet progress along path
        comet.progress += delta * comet.speed * intensity
        if (comet.progress > 1) comet.progress = 0

        // Get current position along the path
        const point = comet.path.getPoint(comet.progress)
        cometsRef.current[i].position.copy(point)

        // Orient comet along the path for realistic movement
        if (comet.progress < 0.99) {
          const tangent = comet.path.getTangent(comet.progress)
          cometsRef.current[i].lookAt(point.x + tangent.x, point.y + tangent.y, point.z + tangent.z)
        }
      }
    })
  })

  return (
    <group>
      {comets.map((comet, i) => (
        <Trail
          key={i}
          width={1.5}
          length={20}
          color={isChorus ? CONFIG.COLORS.CHORUS.PRIMARY : CONFIG.COLORS.VERSE.PRIMARY}
          attenuation={(t) => t * t}
          decay={3}
        >
          <mesh ref={(el) => (cometsRef.current[i] = el)}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial color={isChorus ? CONFIG.COLORS.CHORUS.SECONDARY : CONFIG.COLORS.VERSE.SECONDARY} />
          </mesh>
        </Trail>
      ))}
    </group>
  )
}

// Define shader materials
const ChorusGlowMaterial = shaderMaterial(
  {
    time: 0,
    color: new THREE.Color(CONFIG.COLORS.CHORUS.PRIMARY),
    intensity: 1.0,
    resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
  },
  // Vertex shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  `
    varying vec2 vUv;
    uniform float time;
    uniform vec3 color;
    uniform float intensity;
    
    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    void main() {
      vec2 center = vec2(0.5, 0.5);
      float dist = distance(vUv, center);
      
      // Create pulsing effect
      float pulse = sin(time * 2.0) * 0.5 + 0.5;
      
      // Create radial gradient
      float alpha = smoothstep(1.0, 0.0, dist * 2.0);
      alpha *= intensity * (1.0 + pulse * 0.3);
      
      // Add noise for sparkle effect
      float noise_val = noise(vUv * 100.0 + time);
      alpha += noise_val * 0.05 * (1.0 - dist * 2.0) * intensity;
      
      gl_FragColor = vec4(color, alpha);
    }
  `,
)

// Shader for expanding chorus rings
const ExpandingRingMaterial = shaderMaterial(
  {
    time: 0,
    color: new THREE.Color(CONFIG.COLORS.CHORUS.SECONDARY),
    intensity: 1.0,
    ringRadius: 1.0,
    ringWidth: 0.1,
  },
  // Vertex shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  `
    varying vec2 vUv;
    uniform float time;
    uniform vec3 color;
    uniform float intensity;
    uniform float ringRadius;
    uniform float ringWidth;
    
    void main() {
      vec2 center = vec2(0.5, 0.5);
      float dist = distance(vUv, center);
      
      // Calculate ring
      float ring = smoothstep(ringRadius - ringWidth * 0.5, ringRadius, dist) - 
                  smoothstep(ringRadius, ringRadius + ringWidth * 0.5, dist);
      
      // Add time-based modulation
      ring *= 0.8 + 0.2 * sin(time * 3.0 + dist * 20.0);
      
      // Apply color and intensity
      vec3 finalColor = color * intensity;
      
      // Add color variation to make it more interesting
      finalColor += vec3(0.2, 0.1, 0.3) * sin(dist * 30.0 + time);
      
      gl_FragColor = vec4(finalColor, ring);
    }
  `,
)

// Volumetric light ray shader
const LightRayMaterial = shaderMaterial(
  {
    time: 0,
    color: new THREE.Color(CONFIG.COLORS.CHORUS.PRIMARY),
    intensity: 1.0,
  },
  // Vertex shader
  `
    varying vec2 vUv;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float time;
    uniform vec3 color;
    uniform float intensity;
    
    float ray(vec2 uv, vec2 dir, float width) {
      uv = vec2(uv.x * dir.x + uv.y * dir.y, uv.y * dir.x - uv.x * dir.y);
      return smoothstep(0.0, width, abs(uv.y));
    }
    
    void main() {
      vec2 uv = vUv * 2.0 - 1.0;
      
      float r = length(uv);
      float a = atan(uv.y, uv.x);
      
      // Create rays
      float rayVal = 0.0;
      
      for(float i = 0.0; i < 12.0; i++) {
        float angle = i / 12.0 * 3.14159 * 2.0 + time * 0.2;
        vec2 dir = vec2(cos(angle), sin(angle));
        float width = 0.02 + 0.01 * sin(time * 3.0 + i);
        rayVal += 1.0 - ray(uv, dir, width);
      }
      
      rayVal *= smoothstep(1.5, 0.5, r); // Fade out from center
      rayVal *= intensity;
      
      gl_FragColor = vec4(color, rayVal);
    }
  `,
)

// Register the materials with drei
extend({ ChorusGlowMaterial, ExpandingRingMaterial, LightRayMaterial })

export default Background
