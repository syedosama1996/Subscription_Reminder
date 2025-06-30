import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, TextInput, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import Button from '../../components/Button';
import { Lock, Mail, Eye, EyeOff, Fingerprint } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Input from '../../components/Input';
import { TouchableOpacity } from 'react-native-gesture-handler';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, loading, error, isBiometricSupported, enableBiometric, signInWithBiometric, isBiometricEnabled, resetBiometric } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showBiometricOption, setShowBiometricOption] = useState(false);
  const [showResetOption, setShowResetOption] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  useEffect(() => {
    setShowBiometricOption(isBiometricSupported && isBiometricEnabled);
    setShowResetOption(isBiometricEnabled);
  }, [isBiometricSupported, isBiometricEnabled]);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
    emailInputRef.current?.blur();
    passwordInputRef.current?.blur();
  };

  const handleLogin = async () => {
    dismissKeyboard();
    // Reset validation error
    setValidationError(null);
    
    // Validate inputs
    if (!email || !password) {
      setValidationError('All fields are required');
      return;
    }
    
    try {
      await signIn(email, password);
      await router.replace('/(app)/(tabs)');
    } catch (error) {
      // Error is already handled by the auth context
    }
  };

  const handleBiometricLogin = async () => {
    dismissKeyboard();
    try {
      await signInWithBiometric();
      router.replace('/(app)/(tabs)');
    } catch (error) {
      // Error handled by auth context
    }
  };

  const handleEnableBiometric = async () => {
    dismissKeyboard();
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password first');
      return;
    }
    try {
      await signIn(email, password, false);
      await enableBiometric(email, password);
      router.replace('/(app)/(tabs)');
    } catch (error) {
      // Error handled by auth context
    }
  };

  const handleResetBiometric = async () => {
    dismissKeyboard();
    try {
      await resetBiometric();
      setShowBiometricOption(false);
      setShowResetOption(false);
      Alert.alert('Success', 'Fingerprint login has been reset');
    } catch (error) {
      // Error handled by auth context
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
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
            <Text style={styles.title}>Subscription Reminder</Text>
            <Text style={styles.subtitle}>Track and manage all your subscriptions</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Login</Text>
            
            {(error || validationError) && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error || validationError}</Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Mail size={20} color="#7f8c8d" style={styles.inputIcon} />
              <Input
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                containerStyle={styles.input}
                ref={emailInputRef}
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} color="#7f8c8d" style={styles.inputIcon} />
              <View style={styles.inputWrapper}>
                <Input
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  containerStyle={styles.input}
                  ref={passwordInputRef}
                />
                {/* <TouchableOpacity 
                  style={styles.eyeIcon}
                  onPress={() => {
                    setTimeout(() => {
                      togglePasswordVisibility();
                    }, 50);
                  }}
                  activeOpacity={0.5}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#666" />
                  ) : (
                    <Eye size={20} color="#666" />
                  )}
                </TouchableOpacity> */}
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.registerButton, loading && styles.disabledButton]}
              onPress={() => {
                setTimeout(() => {
                  handleLogin();
                }, 50);
              }}
              activeOpacity={0.5}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.registerButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            {!loading && isBiometricSupported && (
              <>
                {!isBiometricEnabled ? (
                  <TouchableOpacity
                    style={[styles.biometricButton, loading && styles.disabledButton]}
                    onPress={handleEnableBiometric}
                    activeOpacity={0.5}
                    disabled={loading}
                  >
                    {loading ? <ActivityIndicator color="#4158D0" size="small" /> : <Text style={styles.biometricButtonText}>Enable Biometric Login</Text>}
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.biometricButton, loading && styles.disabledButton]}
                      onPress={handleBiometricLogin}
                      activeOpacity={0.5}
                      disabled={loading}
                    >
                      {loading ? <ActivityIndicator color="#4158D0" size="small" /> : <Text style={styles.biometricButtonText}>Login with Biometric</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.resetBiometricButton, loading && styles.disabledButton]}
                      onPress={handleResetBiometric}
                      activeOpacity={0.5}
                      disabled={loading}
                    >
                      {loading ? <ActivityIndicator color="#7f8c8d" size="small" /> : <Text style={styles.resetBiometricButtonText}>Reset Biometric</Text>}
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Don't have an account? </Text>
              <TouchableOpacity 
                style={styles.loginLinkTouchable}
                onPress={() => {
                  setTimeout(() => {
                    router.push('/register');
                  }, 50);
                }}
                activeOpacity={0.5}
              >
                <Text style={styles.loginLink}>Register</Text>
              </TouchableOpacity>
            </View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    backdropFilter: 'blur(10px)',
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
    marginBottom: 16,
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    marginBottom: 0,
    flex: 1,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: -12,
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  registerButton: {
    marginTop: 8,
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
  },
  registerButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginLeft: 25,
  },
  loginText: {
    fontFamily: 'Inter-Regular',
    color: '#7f8c8d',
    marginRight: 4,
  },
  loginLink: {
    fontFamily: 'Inter-Medium',
    color: '#4158D0',
  },
  loginLinkTouchable: {
    flex: 1,
    borderRadius: 5,
    marginRight: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
  biometricButton: {
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 0,
  },
  biometricButtonText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetBiometricButton: {
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 0,
  },
  resetBiometricButtonText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
