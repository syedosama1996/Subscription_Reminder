import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { Session, User } from '@supabase/supabase-js';
import { Alert, Platform } from 'react-native';
import { ActivityLogger } from './services/activity-logger';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';
import Constants from 'expo-constants';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string, shouldTriggerBiometric?: boolean) => Promise<void>;
  signInWithId: (userId: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPasswordWithCode: (email: string, code: string, newPassword: string) => Promise<void>;
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

// Get Supabase configuration
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

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
    
      const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          if (error.message.includes('Supabase not configured')) {
            console.warn('Supabase not configured, skipping auth initialization');
            setLoading(false);
            return;
          }
          throw error;
        }
        
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      try {
        if (session) {
          setSession(session);
          setUser(session.user);
        } else {
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase is not configured. Please set up your Supabase credentials.');
      }
      
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing user:', checkError);
      } else if (existingUser) {
        console.log('User already exists in profiles table:', existingUser.id);
      }
      
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
      
      
      if (!existingUser) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              email: email,
              username: email.split('@')[0],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]);
        
        if (profileError) {
          console.error('Error creating profile:', profileError);   
        } else {
          console.log('Profile created for user:', data.user.id);
        }
      } else {
        console.log('Profile already exists for user:', data.user.id);
      }

      await ActivityLogger.log({
        user_id: data.user.id,
        action: 'create',
        entity_type: 'account',
        entity_id: data.user.id,
        details: {
          email: email
        }
      });
      

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

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase is not configured. Please set up your Supabase credentials.');
      }

      console.log('Login attempt for email:', email);
      
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
        
        if (error.message === 'Invalid login credentials' && userData) {
          throw new Error('Invalid login credentials.');
        }
        
        throw error;
      }
      
      if (!data.user) {
        console.error('No user data returned after successful sign in');
        throw new Error('No user data returned');
      }

      if (shouldTriggerBiometric && isBiometricEnabled) {
        await signInWithBiometric();
      }

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

      router.replace('/(auth)/login');

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


    } catch (error: any) {
      console.error('Sign out error:', error);
      setError(error.message || 'Failed to sign out');
      Alert.alert('Error', 'Failed to sign out. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

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
      
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable fingerprint login',
        fallbackLabel: 'Use password instead',
      });
      
      if (!result.success) {
        throw new Error('Biometric authentication failed');
      }
      
      await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify({ email, password }));
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
      
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
      
      
      const credentialsStr = await SecureStore.getItemAsync(CREDENTIALS_KEY);
      
      if (!credentialsStr) {
        console.error('No credentials found in secure storage');
        throw new Error('No stored credentials found');
      }
      
      
      const credentials = JSON.parse(credentialsStr);
      
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

  const forgotPassword = async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase is not configured. Please set up your Supabase credentials.');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .single();
      
      if (userError && userError.code !== 'PGRST116') {
        console.error('Error checking if email exists:', userError);
        throw new Error('Unable to verify email address. Please try again.');
      }
      
      if (!userData) {
        Toast.show({
          type: 'success',
          text1: 'Password reset email sent',
          text2: 'If an account exists, you will receive a code shortly.',
        });
        return;
      }

      // Try to send password reset email via Supabase Auth
      let authError = null;
      let resetToken = null;
      
      try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: Platform.OS === 'web' 
            ? `${window.location.origin}/reset-password` 
            : 'myapp://reset-password',
        });

        if (error) {
          authError = error;
          console.warn('Supabase Auth SMTP failed, trying custom email function...');
        } else {
          // Success! Supabase Auth SMTP worked
          resetToken = data;
        }
      } catch (err: any) {
        authError = err;
        console.warn('Supabase Auth SMTP error, trying custom email function...');
      }

      // If Supabase Auth SMTP failed, try custom email function as fallback
      if (authError) {
        const errorMsgLower = authError.message?.toLowerCase() || '';
        const isEmailSendingError = 
          errorMsgLower.includes('recovery email') || 
          errorMsgLower.includes('sending') ||
          errorMsgLower.includes('smtp') ||
          errorMsgLower.includes('mail') ||
          (authError.status === 500 && (
            errorMsgLower.includes('email') ||
            errorMsgLower.includes('mail') ||
            errorMsgLower.includes('smtp') ||
            authError.name === 'AuthApiError'
          ));

        if (isEmailSendingError || authError.status === 500) {
          // Try custom email function as fallback (OTP method)
          console.log('⚠️ Supabase Auth SMTP failed. Using custom email function with OTP...');
          
          try {
            // Generate OTP code (6 digits)
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            
            // Store OTP in database for verification (expires in 10 minutes)
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + 10);
            
            // Try to store OTP in database (optional - for verification)
            try {
              const { error: otpError } = await supabase
                .from('password_reset_otps')
                .upsert({
                  email: email,
                  otp: otp,
                  expires_at: expiresAt.toISOString(),
                  used: false,
                }, {
                  onConflict: 'email'
                });

              if (otpError) {
                console.warn('Could not store OTP in database (RLS or table missing), but will still try to send email:', otpError.message);
                // Continue anyway - OTP will still be sent via email
              } else {
                console.log('OTP stored in database successfully');
              }
            } catch (otpStorageError: any) {
              console.warn('OTP storage failed (non-critical):', otpStorageError.message);
              // Continue anyway - email will still be sent
            }
            
            // Send OTP via custom email function
            const otpEmailSent = await sendPasswordResetOtpEmail(email, otp);
            
            if (otpEmailSent) {
              console.log('✅ OTP email sent successfully via custom email function');
              Toast.show({
                type: 'success',
                text1: 'Password reset code sent',
                text2: 'Check your email for the 6-digit code.',
              });
              
              // Log password reset request (optional - don't fail if this errors)
              try {
                await ActivityLogger.log({
                  user_id: userData.id,
                  action: 'password_reset_request',
                  entity_type: 'account',
                  entity_id: userData.id,
                  details: {
                    email: email,
                    method: 'otp_custom_email'
                  }
                });
              } catch (logError: any) {
                // Non-critical - log but don't fail
                console.warn('Could not log activity (non-critical):', logError.message);
              }
              
              return; // Exit early, OTP sent successfully
            } else {
              throw new Error('Failed to send password reset email. Please check your email configuration (Resend API or SMTP).');
            }
          } catch (fallbackError: any) {
            console.error('❌ Custom email fallback also failed:', fallbackError);
            
            // Show comprehensive error message
          throw new Error(
            'Unable to send password reset email.\n\n' +
            'SMTP Configuration Checklist:\n' +
            '1. Go to Supabase Dashboard → Settings → Auth → SMTP Settings\n' +
            '2. Make sure "Enable Custom SMTP" toggle is ON ✅\n' +
            '3. For Gmail: Use 16-character App Password (NOT regular password)\n' +
            '4. Wait 2 minutes after saving SMTP settings\n' +
            '5. Verify SMTP settings are correct\n\n' +
            'OR set up Resend API:\n' +
            'supabase secrets set RESEND_API_KEY=re_your_key'
          );
          }
        } else if (authError.status === 400) {
          throw new Error('Invalid email address or request. Please check your email and try again.');
        } else if (authError.status === 429) {
          throw new Error('Too many password reset requests. Please wait a few minutes before trying again.');
        } else if (authError.status === 404) {
          throw new Error('User not found. Please check your email address.');
        } else {
          throw new Error(authError.message || 'Failed to send password reset email.');
        }
      }

      // Log password reset request
      await ActivityLogger.log({
        user_id: userData.id,
        action: 'password_reset_request',
        entity_type: 'account',
        entity_id: userData.id,
        details: {
          email: email
        }
      });

      Toast.show({
        type: 'success',
        text1: 'Password reset email sent',
        text2: 'Check your email for the code to reset your password.',
      });

    } catch (error: any) {
      console.error('Forgot password error:', error);
      setError(error.message || 'Failed to send password reset email');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Helper function to generate and send OTP email (optional - for custom OTP flow)
  const sendPasswordResetOtpEmail = async (email: string, otp: string): Promise<boolean> => {
    try {
      const { sendEmail } = require('./email');
      
      const otpEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
    .container { background: #f5f5f5; padding: 40px 20px; }
    .card { background: white; padding: 40px; border-radius: 10px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #333; margin: 0; }
    .otp-box { 
      background: #f0f7ff; 
      border: 2px solid #667eea; 
      border-radius: 8px; 
      padding: 30px; 
      text-align: center; 
      margin: 30px 0;
    }
    .otp-code { 
      font-size: 48px; 
      font-weight: bold; 
      color: #667eea; 
      letter-spacing: 10px; 
      font-family: monospace;
    }
    .otp-expiry { 
      color: #999; 
      font-size: 14px; 
      margin-top: 10px; 
    }
    .warning { 
      background: #fff3cd; 
      border: 1px solid #ffc107; 
      border-radius: 6px; 
      padding: 15px; 
      margin: 20px 0;
      color: #856404;
    }
    .footer { 
      text-align: center; 
      color: #999; 
      font-size: 12px; 
      margin-top: 30px; 
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>🔐 Password Reset Code</h1>
      </div>
      
      <p>Hello,</p>
      <p>We received a request to reset your password. Use the code below to reset your password:</p>
      
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
        <div class="otp-expiry">This code expires in 10 minutes</div>
      </div>
      
      <div class="warning">
        <strong>⚠️ Security Notice:</strong> If you didn't request this, please ignore this email. Your password will remain unchanged.
      </div>
      
      <p><strong>Next Steps:</strong></p>
      <ol>
        <li>Copy the code above</li>
        <li>Go back to the app</li>
        <li>Paste the code and enter your new password</li>
      </ol>
      
      <div class="footer">
        <p>This is an automated email. Please do not reply.</p>
        <p>&copy; 2025 Subscription Reminder. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
      `;

      const subject = '🔐 Your Password Reset Code';
      return await sendEmail(email, subject, otpEmailHtml);
    } catch (error) {
      console.error('Error sending OTP email:', error);
      return false;
    }
  };

  const resetPasswordWithCode = async (email: string, code: string, newPassword: string) => {
    try {
      setLoading(true);
      setError(null);

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }
      if (!code || code.trim().length < 4) {
        throw new Error('Please enter the verification code');
      }
      const minLength = 8;
      const hasUpperCase = /[A-Z]/.test(newPassword);
      const hasLowerCase = /[a-z]/.test(newPassword);
      const hasNumbers = /\d/.test(newPassword);
      const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);

      if (!newPassword || newPassword.length < minLength) {
        throw new Error('Password must be at least 8 characters long');
      }
      if (!hasUpperCase) {
        throw new Error('Password must contain at least one uppercase letter');
      }
      if (!hasLowerCase) {
        throw new Error('Password must contain at least one lowercase letter');
      }
      if (!hasNumbers) {
        throw new Error('Password must contain at least one number');
      }
      if (!hasSpecialChar) {
        throw new Error('Password must contain at least one special character');
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'recovery',
      });

      if (verifyError) {
        console.error('Verify recovery code error:', verifyError);
        throw new Error('Invalid or expired code');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error('Update password error:', updateError);
        const friendly = updateError.message?.includes('New password should be different')
          ? 'New password must be different from the old password.'
          : 'Failed to set new password';
        setError(friendly);
        Toast.show({ type: 'error', text1: 'Password not changed', text2: friendly });
        throw new Error(friendly);
      }

      Toast.show({ type: 'success', text1: 'Password updated', text2: 'You can now log in with the new password.' });
      router.replace('/(auth)/login');
    } catch (error: any) {
      console.error('Reset password with code error:', error);
      setError(error.message || 'Failed to reset password');
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
        forgotPassword,
        resetPasswordWithCode,
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