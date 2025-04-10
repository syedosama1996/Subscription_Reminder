import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from './auth';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';

const INACTIVITY_TIMEOUT = 60000; // 10 seconds in milliseconds for testing

type SecurityContextType = {
  resetInactivityTimer: () => void;
};

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth();
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastActiveTime, setLastActiveTime] = useState<number>(Date.now());
  const [isActive, setIsActive] = useState(true);

  const resetInactivityTimer = () => {
    // Only reset timer if user is authenticated and app is active
    if (!user || !isActive) return;
    
    setLastActiveTime(Date.now());
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    const timer = setTimeout(() => {
      handleInactivityTimeout();
    }, INACTIVITY_TIMEOUT);
    setInactivityTimer(timer);
  };

  const handleInactivityTimeout = async () => {
    // Only handle timeout if user is authenticated and app is active
    if (!user || !isActive) return;
    Toast.show({
      type: 'error',
      text1: 'Session Timeout',
      text2: 'You have been inactive for 10 seconds. Please log in again.',
    });
    await signOut();
    router.replace('/(auth)/login');
  };

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    // Only handle app state changes if user is authenticated
    if (!user) return;

    if (nextAppState === 'background') {
      setIsActive(false);
      // Store the time when app went to background
      setLastActiveTime(Date.now());
    } else if (nextAppState === 'active') {
      setIsActive(true);
      // Check if app was in background for more than 10 seconds
      const timeInBackground = Date.now() - lastActiveTime;
      if (timeInBackground >= INACTIVITY_TIMEOUT) {
        await handleInactivityTimeout();
      } else {
        resetInactivityTimer();
      }
    }
  };

  useEffect(() => {
    // Only initialize timer if user is authenticated
    if (user) {
      setIsActive(true);
      resetInactivityTimer();
    } else {
      setIsActive(false);
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
    }

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      subscription.remove();
    };
  }, [user]); // Add user as dependency

  return (
    <SecurityContext.Provider value={{ resetInactivityTimer }}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
} 