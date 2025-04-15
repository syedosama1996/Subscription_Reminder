import React, { createContext, useContext, useState, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from './auth';

interface SecurityContextType {
  isAuthenticated: boolean;
  authenticate: () => Promise<boolean>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { session } = useAuth();

  const checkBiometrics = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (hasHardware && isEnrolled) {
      return await authenticate();
    } else {
      setIsAuthenticated(true);
      return true;
    }
  };

  const authenticate = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access your subscriptions',
        fallbackLabel: 'Enter password',
        disableDeviceFallback: true,
      });

      setIsAuthenticated(result.success);
      return result.success;
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  };

  return (
    <SecurityContext.Provider value={{ isAuthenticated, authenticate }}>
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