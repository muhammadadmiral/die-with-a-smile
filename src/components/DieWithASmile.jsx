"use client"

import React, { useState, useRef, useEffect, useCallback, Suspense, memo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { lyrics, chorusLines } from "../lib/utils"

// Import komponen-komponen terpisah
import ErrorBoundary from "./ErrorBoundary"
import Background from "./Background"
import AudioPlayer from "./AudioPlayer"
import LyricsVisualizer from "./LyricsVisualizer"
import CodeVisualizer from "./CodeVisualizer"

// Bungkus Background dengan memo agar tidak re-render bila props tidak berubah
const MemoizedBackground = memo(Background)

const DieWithASmile = () => {
  // State utama: audio, lirik, status play, dan flag UI
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioLevel, setAudioLevel] = useState([])
  const [duration, setDuration] = useState(0)
  const [activeLyric, setActiveLyric] = useState("")
  const [isChorus, setIsChorus] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  // Refs untuk mencegah re-render berlebih
  const lastActiveIndexRef = useRef(-1)
  const animationFrameRef = useRef(null)
  const isMountedRef = useRef(true)
  const inactivityTimerRef = useRef(null)

  // Deteksi perangkat mobile secara responsif
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Cleanup saat unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    }
  }, [])

  // Auto-hide controls tidak lagi dibutuhkan karena header sudah dihapus
  // (Jika di kemudian hari ingin menambahkan UI kontrol tambahan, mekanisme ini dapat diaktifkan kembali)
  // Contoh: hapus listener inactivity jika tidak digunakan

  // Fungsi utilitas: cari lirik aktif menggunakan binary search
  const findActiveLyric = useCallback((time) => {
    let start = 0,
        end = lyrics.length - 1,
        result = -1
    while (start <= end) {
      const mid = Math.floor((start + end) / 2)
      if (lyrics[mid].time <= time) {
        result = mid
        start = mid + 1
      } else {
        end = mid - 1
      }
    }
    if (result !== -1) {
      const nextIndex = result + 1
      if (nextIndex < lyrics.length && time >= lyrics[nextIndex].time) {
        return { index: nextIndex, text: lyrics[nextIndex].text }
      }
      return { index: result, text: lyrics[result].text }
    }
    return null
  }, [])

  // Update waktu dan lirik
  const handleTimeUpdate = useCallback((time) => {
    if (!isMountedRef.current) return
    setCurrentTime(time)
    const activeData = findActiveLyric(time)
    if (activeData) {
      const { index, text } = activeData
      if (index !== lastActiveIndexRef.current) {
        lastActiveIndexRef.current = index
        setActiveLyric(text)
        setIsChorus(chorusLines.some(line => text.includes(line) || line.includes(text)))
      }
    }
  }, [findActiveLyric])

  // Update status play (tetap sederhana)
  const handlePlayStateChange = useCallback((playing) => {
    if (!isMountedRef.current) return
    setIsPlaying(playing)
  }, [])

  // Update audio level dengan throttling
  const handleAudioLevelUpdate = useCallback((levels) => {
    if (!isMountedRef.current) return
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    animationFrameRef.current = requestAnimationFrame(() => {
      setAudioLevel(levels)
    })
  }, [])

  // Update durasi audio
  const handleDurationUpdate = useCallback((newDuration) => {
    if (!isMountedRef.current) return
    setDuration(newDuration)
  }, [])

  // Hapus keyboard shortcut untuk spacebar, hanya biarkan shortcut untuk info jika dibutuhkan
  // Untuk saat ini, shortcut keyboard dinonaktifkan agar tidak mengganggu user
  // Jika diperlukan, handler untuk 'i' bisa diaktifkan dengan kode berikut:
  /*
  const handleKeyDown = useCallback((e) => {
    if (e.key === "i") setShowInfo(prev => !prev)
  }, [])
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])
  */

  // Global error handler
  const handleError = useCallback((error) => {
    console.error("Application error:", error)
  }, [])

  return (
    <motion.div
      className="relative min-h-screen overflow-hidden font-body bg-dark-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      style={{ transform: "translateZ(0)" }}
    >
      {/* BACKGROUND */}
      <ErrorBoundary>
        <Suspense fallback={<div className="fixed inset-0 bg-black" />}>
          <MemoizedBackground
            isPlaying={isPlaying}
            audioLevel={audioLevel}
            currentLyric={activeLyric}
            isChorus={isChorus}
          />
        </Suspense>
      </ErrorBoundary>

      {/* TAMPILAN UTAMA: LYRICS VISUALIZER & CODE VISUALIZER */}
      <ErrorBoundary>
        <LyricsVisualizer currentTime={currentTime} isPlaying={isPlaying} audioLevel={audioLevel} />
      </ErrorBoundary>
      <ErrorBoundary>
        <CodeVisualizer
          currentTime={currentTime}
          isPlaying={isPlaying}
          currentLyric={activeLyric}
          isMobile={isMobile}
          isChorus={isChorus}
        />
      </ErrorBoundary>

      {/* AUDIO PLAYER - TETAP DITAMPILKAN */}
      <ErrorBoundary>
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <AudioPlayer
            onTimeUpdate={handleTimeUpdate}
            onPlayStateChange={handlePlayStateChange}
            onAudioLevelUpdate={handleAudioLevelUpdate}
            onDurationUpdate={handleDurationUpdate}
            onError={handleError}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
          />
        </div>
      </ErrorBoundary>

      {/* INFO PANEL (opsional) */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ backdropFilter: "blur(12px)" }}
          >
            <div className="bg-gray-900/90 rounded-2xl p-8 max-w-2xl w-full border border-gray-700 shadow-2xl">
              <h2 className="text-3xl font-bold mb-4 text-white">About This Experience</h2>
              <p className="text-gray-300 mb-4">
                This immersive audio-visual experience combines space-themed visuals with synchronized lyrics and code visualization.
              </p>
              <p className="text-gray-300 mb-6">
                The dynamic background reacts to music with stunning starfields, galaxies, and nebula effects that intensify during chorus segments.
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowInfo(false)}
                  className="px-6 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default DieWithASmile
