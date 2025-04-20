"use client"

import { useEffect, useState } from "react"
import DieWithASmile from "./components/DieWithASmile"
import "./index.css"

function App() {
  const [isLoading, setIsLoading] = useState(true)
  
  // Preload assets
  useEffect(() => {
    console.log("App mounting - preloading assets...")
    
    // Pastikan folder public berisi file audio ini
    const audioPath = "/die-with-a-smile.mp3"
    
    // Preload audio
    const preloadAudio = () => {
      return new Promise((resolve) => {
        try {
          const audio = new Audio()
          audio.preload = "auto"
          
          audio.oncanplaythrough = () => {
            console.log("Audio preloaded successfully")
            resolve(true)
          }
          
          audio.onerror = (err) => {
            console.error("Error preloading audio:", err)
            // Resolve anyway to continue loading
            resolve(false)
          }
          
          // Set timeout to resolve if taking too long
          const timeoutId = setTimeout(() => {
            console.log("Audio preload timeout")
            resolve(false)
          }, 3000)
          
          // Clean up timeout when loaded
          audio.oncanplaythrough = () => {
            clearTimeout(timeoutId)
            console.log("Audio preloaded successfully")
            resolve(true)
          }
          
          audio.src = audioPath
        } catch (error) {
          console.error("Audio preload error:", error)
          resolve(false)
        }
      })
    }
    
    // Simulate loading delay for nicer UX transition
    const simulateMinimumLoading = () => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve()
        }, 1000) // Minimum 1 second loading screen
      })
    }
    
    // Run all loading tasks
    Promise.all([
      preloadAudio(),
      simulateMinimumLoading()
    ])
    .then(() => {
      setIsLoading(false)
      console.log("All assets loaded, starting app")
    })
    .catch(error => {
      console.error("Error during preloading:", error)
      setIsLoading(false) // Continue anyway to allow fallback methods
    })
    
    // Add keypress listener for debugging
    const handleKeyPress = (e) => {
      // Press 'D' key to show debug info
      if (e.key === 'd' && e.ctrlKey) {
        console.log("Debug info:");
        console.log("- Audio path:", audioPath);
        console.log("- Current URL:", window.location.href);
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [])
  
  // Fix Internet Download Manager (IDM) interference
  useEffect(() => {
    // Add custom meta tag to prevent IDM capturing
    const metaTag = document.createElement('meta')
    metaTag.name = 'download-options'
    metaTag.content = 'noopen'
    document.head.appendChild(metaTag)
    
    return () => {
      document.head.removeChild(metaTag)
    }
  }, [])

  return (
    <>
      {isLoading ? (
        <div className="fixed inset-0 flex items-center justify-center bg-dark-950 z-50">
          <div className="text-center">
            <h1 className="text-5xl font-display text-gradient-gold mb-4">
              Die With A Smile
            </h1>
            <p className="text-xl mb-6 text-gray-300">Bruno Mars & Lady Gaga</p>
            
            <div className="flex space-x-3 justify-center">
              <div className="w-3 h-3 rounded-full bg-primary-500 animate-pulse"></div>
              <div className="w-3 h-3 rounded-full bg-secondary-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-3 h-3 rounded-full bg-primary-500 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      ) : (
        <DieWithASmile />
      )}
    </>
  )
}

export default App