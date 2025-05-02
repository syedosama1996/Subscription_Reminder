import React, { createContext, useContext, useEffect, useRef } from 'react';
import { TouchableWithoutFeedback, AppState, AppStateStatus, View } from 'react-native';
import { useAuth } from './auth';
import Toast from 'react-native-toast-message';
import { router, usePathname } from 'expo-router';

const SESSION_TIMEOUT = 600 * 1000; // 30 seconds in milliseconds

// Auth screens that should not trigger session timeout
const AUTH_SCREENS = ['/(auth)/login', '/(auth)/register'];

interface SessionContextType {
  resetTimer: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastActiveTimestampRef = useRef<number>(Date.now());
  const pathname = usePathname();

  const isAuthScreen = AUTH_SCREENS.includes(pathname);

  const handleTimeout = async () => {
    if (user) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      await signOut();
      Toast.show({
        type: 'error',
        text1: 'Your session has expired. Please log in again.',
        position: 'top',
        visibilityTime: 4000,
      });
      router.replace('/(auth)/login');
    }
  };

  const resetTimer = () => {
    if (!user || isAuthScreen) return;

    lastActiveTimestampRef.current = Date.now();

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(handleTimeout, SESSION_TIMEOUT);
  };

  const checkInactivityOnResume = () => {
    if (!user || isAuthScreen) return;

    const now = Date.now();
    const timeSinceLastActive = now - lastActiveTimestampRef.current;

    if (timeSinceLastActive >= SESSION_TIMEOUT) {
      handleTimeout();
    } else {
      // If there's still time left, start a new timer with remaining time
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(handleTimeout, SESSION_TIMEOUT - timeSinceLastActive);
    }
  };

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const currentState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (
        currentState.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to foreground
        checkInactivityOnResume();
      } else if (nextAppState.match(/inactive|background/)) {
        // App has gone to background
        lastActiveTimestampRef.current = Date.now();
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user, isAuthScreen]);

  // Clear timeout when component unmounts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  // Start/clear timer based on user state and current screen
  useEffect(() => {
    if (user && !isAuthScreen) {
      resetTimer();
    } else if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [user, isAuthScreen, pathname]);

  // If we're on an auth screen, don't wrap with touch handlers
  if (isAuthScreen) {
    return <>{children}</>;
  }

  return (
    <SessionContext.Provider value={{ resetTimer }}>
      <View 
        style={{ flex: 1 }} 
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={resetTimer}
        onResponderMove={resetTimer}
        onResponderRelease={resetTimer}
      >
        {children}
      </View>
    </SessionContext.Provider>
  );
} 