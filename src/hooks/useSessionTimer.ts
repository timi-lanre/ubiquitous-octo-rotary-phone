
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const SHOW_TIMER_AFTER = 5 * 60 * 1000; // Show timer after 5 minutes of inactivity
const SESSION_KEY = 'session-activity';

export function useSessionTimer() {
  const { signOut } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState(INACTIVITY_TIMEOUT);
  const [lastActivity, setLastActivity] = useState(() => {
    // Try to get last activity from localStorage on initialization
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? parseInt(stored, 10) : Date.now();
  });
  const [showTimer, setShowTimer] = useState(false);

  // Reset the timer when user activity is detected
  const resetTimer = () => {
    const now = Date.now();
    setLastActivity(now);
    setTimeRemaining(INACTIVITY_TIMEOUT);
    setShowTimer(false);
    // Persist to localStorage
    localStorage.setItem(SESSION_KEY, now.toString());
  };

  useEffect(() => {
    // Events that indicate user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      resetTimer();
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Update timer every second
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivity;
      const remaining = Math.max(0, INACTIVITY_TIMEOUT - elapsed);
      setTimeRemaining(remaining);
      
      // Show timer only after 5 minutes of inactivity
      setShowTimer(elapsed >= SHOW_TIMER_AFTER);

      // If session has expired, sign out the user
      if (remaining === 0) {
        localStorage.removeItem(SESSION_KEY);
        console.log('Session expired due to inactivity, signing out user');
        signOut();
      }
    }, 1000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      clearInterval(interval);
    };
  }, [lastActivity, signOut]);

  // Format time as MM:SS
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    timeRemaining,
    formattedTime: formatTime(timeRemaining),
    showTimer,
    resetTimer
  };
}
