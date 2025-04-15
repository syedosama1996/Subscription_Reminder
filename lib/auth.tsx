import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { Session, User } from '@supabase/supabase-js';
import { Alert, Platform } from 'react-native';
import { ActivityLogger } from './services/activity-logger';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string, shouldTriggerBiometric?: boolean) => Promise<void>;
  signInWithId: (userId: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  isBiometricSupported: boolean;
  enableBiometric: (email: string, password: string) => Promise<void>;
  signInWithBiometric: () => Promise<void>;
  isBiometricEnabled: boolean;
  resetBiometric: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Keys for secure storage
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const CREDENTIALS_KEY = 'auth_credentials';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);

  useEffect(() => {
    // Check if biometric authentication is supported
    const checkBiometricSupport = async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricSupported(compatible && enrolled);
      
      // Check if biometric is enabled for this user
      const biometricEnabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      const hasCredentials = await SecureStore.getItemAsync(CREDENTIALS_KEY);
      
      // Only set biometric as enabled if both flags are true
      const isEnabled = biometricEnabled === 'true' && !!hasCredentials;
      setIsBiometricEnabled(isEnabled);
      
      // If one flag is true but the other isn't, reset both
      if ((biometricEnabled === 'true' && !hasCredentials) || 
          (biometricEnabled !== 'true' && hasCredentials)) {
        await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
        await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
        setIsBiometricEnabled(false);
      }
    };
    
    checkBiometricSupport();
    
    // Initialize auth state
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session) {
          setSession(session);
          setUser(session.user);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setSession(session);
        setUser(session.user);
      } else {
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      
      // First check if the email already exists in profiles
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing user:', checkError);
      } else if (existingUser) {
        console.log('User already exists in profiles table:', existingUser.id);
        // Continue with sign up even if user exists in profiles
        // This will create the auth user if it doesn't exist
      }
      
      // Create the user in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: Platform.OS === 'web' ? window.location.origin : undefined,
        }
      });

      if (error) {
        console.error('Sign up error details:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
        
        // If the error is that the user already exists in auth, try to sign in instead
        if (error.message.includes('already registered')) {
          console.log('User already exists in Auth, attempting to sign in...');
          return signIn(email, password);
        }
        
        throw error;
      }
      
      if (!data.user) {
        console.error('No user data returned after sign up');
        throw new Error('No user data returned');
      }
      
      console.log('User created in Auth:', data.user.id);
      
      // Create a profile record for the user if it doesn't exist
      if (!existingUser) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              email: email,
              username: email.split('@')[0], // Default username from email
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]);
        
        if (profileError) {
          console.error('Error creating profile:', profileError);
          // Don't throw here, as the user is already created in Auth
        } else {
          console.log('Profile created for user:', data.user.id);
        }
      } else {
        console.log('Profile already exists for user:', data.user.id);
      }

      // Log sign up activity
      await ActivityLogger.log({
        user_id: data.user.id,
        action: 'create',
        entity_type: 'account',
        entity_id: data.user.id,
        details: {
          email: email
        }
      });
      
      console.log('Sign up successful for user:', data.user.id);

    } catch (error: any) {
      console.error('Sign up error:', error);
      setError(error.message || 'An error occurred during sign up');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string, shouldTriggerBiometric: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      // Log login attempt with email (but not password for security)
      console.log('Login attempt for email:', email);
      
      // Check if the email exists in the database
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .single();
      
      if (userError) {
        console.log('Error checking if email exists:', userError);
      } else if (!userData) {
        console.log('Email not found in profiles table:', email);
      } else {
        console.log('Email found in profiles table:', userData.id);
      }
      
      // Try to sign in with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error details:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
        
        // If the user exists in profiles but not in auth, we need to recreate the auth user
        if (error.message === 'Invalid login credentials' && userData) {
          throw new Error('Invalid login credentials.');
        }
        
        throw error;
      }
      
      if (!data.user) {
        console.error('No user data returned after successful sign in');
        throw new Error('No user data returned');
      }

      // Only trigger biometric if explicitly requested
      if (shouldTriggerBiometric && isBiometricEnabled) {
        await signInWithBiometric();
      }

      // Log sign in activity
      await ActivityLogger.log({
        user_id: data.user.id,
        action: 'login',
        entity_type: 'account',
        entity_id: data.user.id,
        details: {
          email: email
        }
      });

    } catch (error: any) {
      console.error('Sign in error:', error);
      setError(error.message || 'Invalid email or password');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);

      // Navigate to login screen before signing out to prevent white screen
      router.replace('/(auth)/login');

      // Log sign out activity before signing out
      if (user) {
        await ActivityLogger.log({
          user_id: user.id,
          action: 'logout',
          entity_type: 'account',
          entity_id: user.id,
          details: {
            email: user.email
          }
        });
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Show success toast message only for manual logo

    } catch (error: any) {
      console.error('Sign out error:', error);
      setError(error.message || 'Failed to sign out');
      Alert.alert('Error', 'Failed to sign out. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Add a new function to sign in with a known user ID
  const signInWithId = async (userId: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();
      
      if (userError) {
        console.error('Error getting user email:', userError);
        throw new Error('User not found in profiles table');
      }
      
      if (!userData || !userData.email) {
        console.error('No email found for user ID:', userId);
        throw new Error('No email found for user');
      }
      
      // Try to sign in with the email
      return signIn(userData.email, password);
      
    } catch (error: any) {
      console.error('Sign in with ID error:', error);
      setError(error.message || 'Failed to sign in with user ID');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const enableBiometric = async (email: string, password: string) => {
    try {
      if (!isBiometricSupported) {
        throw new Error('Biometric authentication is not supported on this device');
      }
      
      // Authenticate with biometrics first
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable fingerprint login',
        fallbackLabel: 'Use password instead',
      });
      
      if (!result.success) {
        throw new Error('Biometric authentication failed');
      }
      
      // Store credentials securely
      await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify({ email, password }));
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
      
      // Verify credentials were stored
      const storedCredentials = await SecureStore.getItemAsync(CREDENTIALS_KEY);
      
      setIsBiometricEnabled(true);
      
      Alert.alert('Success', 'Fingerprint login has been enabled');
    } catch (error: any) {
      setError(error.message || 'Failed to enable fingerprint login');
      throw error;
    }
  };
  
  const signInWithBiometric = async () => {
    try {
      if (!isBiometricSupported || !isBiometricEnabled) {
        throw new Error('Biometric authentication is not enabled');
      }
      // Authenticate with biometrics
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to login',
        fallbackLabel: 'Use password instead',
      });
      
      if (!result.success) {
        throw new Error('Biometric authentication failed');
      }
      
      
      // Retrieve stored credentials
      const credentialsStr = await SecureStore.getItemAsync(CREDENTIALS_KEY);
      
      if (!credentialsStr) {
        console.error('No credentials found in secure storage');
        throw new Error('No stored credentials found');
      }
      
      
      const credentials = JSON.parse(credentialsStr);
      
      // Sign in with stored credentials
      await signIn(credentials.email, credentials.password);
    } catch (error: any) {
      console.error('Error signing in with biometric:', error);
      setError(error.message || 'Failed to sign in with fingerprint');
      throw error;
    }
  };

  const resetBiometric = async () => {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
      await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
      setIsBiometricEnabled(false);
    } catch (error) {
      console.error('Error resetting biometric:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signInWithId,
        signOut,
        error,
        isBiometricSupported,
        enableBiometric,
        signInWithBiometric,
        isBiometricEnabled,
        resetBiometric,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}