import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, TextInput, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../lib/auth';
import { Mail, ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Input from '../../components/Input';
import { TouchableOpacity } from 'react-native-gesture-handler';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { forgotPassword, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const emailInputRef = useRef<TextInput>(null);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
    emailInputRef.current?.blur();
  };

  const handleForgotPassword = async () => {
    dismissKeyboard();
    // Reset validation error
    setValidationError(null);

    // Validate inputs
    if (!email) {
      setValidationError('Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidationError('Please enter a valid email address');
      return;
    }

    try {
      await forgotPassword(email);
      setEmailSent(true);
      Toast.show({ type: 'success', text1: 'Email sent', text2: 'Enter the code we sent to your email.' });
      router.replace({ pathname: '/reset-password', params: email ? { email } : undefined });
    } catch (error) {
      // Error is already handled by the auth context
    }
  };

  const handleBackToLogin = () => {
    router.back();
  };

  const handleResendEmail = () => {
    setEmailSent(false);
    setValidationError(null);
  };

  const handleEnterCode = () => {
    if (email) {
      router.push({ pathname: '/reset-password', params: { email } });
    } else {
      router.push('/reset-password');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4158D0', '#C850C0', '#FFCC70']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1633409361618-c73427e4e206?q=80&w=200&auto=format&fit=crop' }}
              style={styles.logo}
            />
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Enter your email to receive reset instructions</Text>
          </View>

          <View style={styles.formContainer}>
            {!emailSent ? (
              <>
                <Text style={styles.formTitle}>Forgot Password?</Text>

                {(error || validationError) && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error || validationError}</Text>
                  </View>
                )}

                <View style={styles.inputContainer}>
                  <Mail size={20} color="#7f8c8d" style={styles.inputIcon} />
                  <Input
                    placeholder="Enter your email address"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    containerStyle={styles.input}
                    ref={emailInputRef}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.resetButton, loading && styles.disabledButton]}
                  onPress={() => {
                    setTimeout(() => {
                      handleForgotPassword();
                    }, 50);
                  }}
                  activeOpacity={0.5}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.resetButtonText}>Send Reset Email</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBackToLogin}
                  activeOpacity={0.5}
                >
                  <ArrowLeft size={20} color="#4158D0" style={styles.backIcon} />
                  <Text style={styles.backButtonText}>Back to Login</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.successContainer}>
                  <Text style={styles.successTitle}>Check Your Email</Text>
                  <Text style={styles.successMessage}>
                    We've sent password reset instructions to {email}
                  </Text>
                  <Text style={styles.successSubtext}>
                    Please check your email and follow the instructions to reset your password. 
                    If you don't see the email, check your spam folder.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleResendEmail}
                  activeOpacity={0.5}
                >
                  <Text style={styles.resendButtonText}>Resend Email</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleEnterCode}
                  activeOpacity={0.5}
                >
                  <Text style={styles.backButtonText}>Enter Code</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBackToLogin}
                  activeOpacity={0.5}
                >
                  <ArrowLeft size={20} color="#4158D0" style={styles.backIcon} />
                  <Text style={styles.backButtonText}>Back to Login</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 30,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    padding: 30,
  },
  formTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    color: '#e74c3c',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    marginBottom: 0,
    flex: 1,
  },
  resetButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#4158D0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4158D0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 16,
  },
  resetButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(65, 88, 208, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(65, 88, 208, 0.2)',
  },
  backIcon: {
    marginRight: 8,
  },
  backButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#4158D0',
  },
  disabledButton: {
    opacity: 0.5,
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#27ae60',
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
  },
  resendButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(65, 88, 208, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(65, 88, 208, 0.2)',
  },
  resendButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#4158D0',
    textAlign: 'center',
  },
});
