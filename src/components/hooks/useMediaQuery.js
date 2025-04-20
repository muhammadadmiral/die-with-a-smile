import { useState, useEffect } from 'react';

/**
 * Custom hook for responsive design using media queries
 * @param {string} query - CSS media query string
 * @returns {boolean} - Whether the media query matches
 */
export function useMediaQuery(query) {
  // SSR safe approach (default to false if window is not defined)
  const getMatches = (query) => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  };

  const [matches, setMatches] = useState(getMatches(query));

  // Handle screen resize with throttling
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia(query);
    
    // Function to handle updates
    const handleQueryChange = (e) => {
      setMatches(e.matches);
    };

    // Throttle resize events for better performance
    let resizeTimer;
    const handleResizeThrottled = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        handleQueryChange(mediaQuery);
      }, 100);
    };

    // Add listeners
    if (mediaQuery.addEventListener) {
      // Modern browsers
      mediaQuery.addEventListener('change', handleQueryChange);
      window.addEventListener('resize', handleResizeThrottled);
    } else {
      // Older browsers
      mediaQuery.addListener(handleQueryChange);
      window.addEventListener('resize', handleResizeThrottled);
    }

    // Initial check
    setMatches(mediaQuery.matches);

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleQueryChange);
      } else {
        mediaQuery.removeListener(handleQueryChange);
      }
      window.removeEventListener('resize', handleResizeThrottled);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, [query]);

  return matches;
}

export default useMediaQuery;