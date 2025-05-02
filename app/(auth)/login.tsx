import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, TextInput, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import Button from '../../components/Button';
import { Lock, Mail, Eye, EyeOff, Fingerprint } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, loading, error, isBiometricSupported, enableBiometric, signInWithBiometric, isBiometricEnabled, resetBiometric } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showBiometricOption, setShowBiometricOption] = useState(false);
  const [showResetOption, setShowResetOption] = useState(false);

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
    if (!email || !password) return;
    try {
      await signIn(email, password, false);
      router.replace('/(app)/(tabs)');
    } catch (error) {
      // Error handled by auth context
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

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
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
              <Text style={styles.formTitle}>Welcome Back</Text>
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.inputContainer}>
                <Mail size={20} color="#7f8c8d" style={styles.inputIcon} />
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={emailInputRef}
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.textInput}
                    placeholderTextColor="#7f8c8d"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                    blurOnSubmit={false}
                    onFocus={() => console.log('Email focused')}
                    autoCorrect={false}
                    selectTextOnFocus
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Lock size={20} color="#7f8c8d" style={styles.inputIcon} />
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={passwordInputRef}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    style={styles.textInput}
                    placeholderTextColor="#7f8c8d"
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    onFocus={() => console.log('Password focused')}
                    autoCorrect={false}
                    selectTextOnFocus
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.5}
                  >
                    {showPassword ? <EyeOff size={20} color="#666" /> : <Eye size={20} color="#666" />}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.loginButton, loading && styles.disabledButton]}
                onPress={handleLogin}
                activeOpacity={0.5}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.loginButtonText}>Login</Text>}
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

              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>Don't have an account? </Text>
                <TouchableOpacity
                  style={styles.registerLinkTouchable}
                  onPress={() => router.push('/register')}
                  activeOpacity={0.5}
                >
                  <Text style={styles.registerLink}>Register</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
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
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    marginTop: 5,
  },
  formContainer: {
    width: '100%',
    marginTop: 30,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4158D0',
    textAlign: 'center',
    marginBottom: 15,
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    padding: 10,
    marginBottom: 20,
    borderRadius: 5,
  },
  errorText: {
    color: '#721c24',
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputWrapper: {
    flex: 1,
  },
  textInput: {
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 5,
    flex: 1,
  },
  eyeIcon: {
    position: 'absolute',
    right: 10,
    top: 10,
  },
  loginButton: {
    backgroundColor: '#4158D0',
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  biometricButton: {
    backgroundColor: '#7f8c8d',
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  biometricButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetBiometricButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  resetBiometricButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  registerLinkTouchable: {},
  registerLink: {
    color: '#4158D0',
    fontWeight: 'bold',
  },
});
