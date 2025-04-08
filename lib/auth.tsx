import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { Session, User } from '@supabase/supabase-js';
import { Alert, Platform } from 'react-native';
import { ActivityLogger } from './services/activity-logger';
import { router } from 'expo-router';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithId: (userId: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
      
      console.log('Sign up attempt for email:', email);
      
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

  const signIn = async (email: string, password: string) => {
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
          console.log('User exists in profiles but auth login failed. Attempting to reset password...');
          
          // Try to reset the password
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: Platform.OS === 'web' ? window.location.origin : undefined,
          });
          
          if (resetError) {
            console.error('Password reset error:', resetError);
            throw new Error('Failed to reset password. Please try again later.');
          } else {
            console.log('Password reset email sent to:', email);
            throw new Error('Password reset email sent. Please check your inbox to reset your password.');
          }
        }
        
        throw error;
      }
      
      if (!data.user) {
        console.error('No user data returned after successful sign in');
        throw new Error('No user data returned');
      }

      // Log successful sign in
      console.log('Sign in successful for user:', data.user.id);

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

      // Navigate to login screen after successful sign out
      router.replace('/(auth)/login');

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
      
      console.log('Sign in attempt with user ID:', userId);
      
      // Get the user's email from the profiles table
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
      
      console.log('Found email for user ID:', userData.email);
      
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