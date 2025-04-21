import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { Lock, Mail, Eye, EyeOff, Fingerprint, Store, ShoppingCart } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, loading, error, isBiometricSupported, enableBiometric, signInWithBiometric, isBiometricEnabled, resetBiometric } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showBiometricOption, setShowBiometricOption] = useState(false);
  const [showResetOption, setShowResetOption] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'seller'>('buyer');
  const [slideAnim] = useState(new Animated.Value(0));
  useEffect(() => {
    // Reset states first
    setShowBiometricOption(false);
    setShowResetOption(false);

    // Then set based on conditions
    if (isBiometricSupported) {
      if (isBiometricEnabled) {
        setShowBiometricOption(true);
        setShowResetOption(true);
      }
    }
  }, [isBiometricSupported, isBiometricEnabled]);
  const handleRoleSelect = (role: 'buyer' | 'seller') => {
    setSelectedRole(role);
    // Add slide animation
    Animated.spring(slideAnim, {
      toValue: role === 'buyer' ? 0 : 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };
  const handleLogin = async () => {
    if (!email || !password) return;
    try {
      // Sign in without triggering biometric
      await signIn(email, password, false); // Pass false to prevent biometric prompt
      router.replace('/(app)/(tabs)');
    } catch (error) {
      // Error is already handled by the auth context
    }
  };

  const handleBiometricLogin = async () => {
    try {
      // Only trigger biometric when explicitly requested
      await signInWithBiometric();
      router.replace('/(app)/(tabs)');
    } catch (error) {
      // Error is already handled by the auth context
    }
  };

  const handleEnableBiometric = async () => {
    if (!email || !password) {
      // Show error that email and password are required
      Alert.alert('Error', 'Please enter your email and password first');
      return;
    }

    try {
      // First try to sign in to verify credentials
      await signIn(email, password, false); // Pass false to prevent biometric prompt

      // If sign in is successful, enable biometric
      await enableBiometric(email, password);

      // Navigate to the app
      router.replace('/(app)/(tabs)');
    } catch (error) {
      // Error is already handled by the auth context
    }
  };

  const handleResetBiometric = async () => {
    try {
      await resetBiometric();
      setShowBiometricOption(false);
      setShowResetOption(false);
      Alert.alert('Success', 'Fingerprint login has been reset');
    } catch (error) {
      // Error is already handled by the auth context
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
        <ScrollView contentContainerStyle={styles.scrollContainer}>
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
            <View style={styles.roleSelectionContainer}>
              <View style={styles.roleTabs}>
                <TouchableOpacity
                  style={[
                    styles.roleTab,
                    selectedRole === 'buyer' && styles.activeRoleTab,
                  ]}
                  onPress={() => handleRoleSelect('buyer')}
                >
                  <LinearGradient
                    colors={selectedRole === 'buyer' ? ['#4158D0', '#C850C0'] : ['transparent', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.roleTabGradient}
                  >
                    <ShoppingCart size={24} color={selectedRole === 'buyer' ? '#fff' : '#7f8c8d'} />
                    <Text style={[
                      styles.roleTabText,
                      selectedRole === 'buyer' && styles.activeRoleTabText
                    ]}>Buyer</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleTab,
                    selectedRole === 'seller' && styles.activeRoleTab,
                  ]}
                  onPress={() => handleRoleSelect('seller')}
                >
                  <LinearGradient
                    colors={selectedRole === 'seller' ? ['#C850C0', '#FFCC70'] : ['transparent', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.roleTabGradient}
                  >
                    <Store size={24} color={selectedRole === 'seller' ? '#fff' : '#7f8c8d'} />
                    <Text style={[
                      styles.roleTabText,
                      selectedRole === 'seller' && styles.activeRoleTabText
                    ]}>Seller</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.inputContainer}>
              <Mail size={20} color="#7f8c8d" style={styles.inputIcon} />
              <View style={styles.inputWrapper}>
                <Input
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  containerStyle={styles.input}
                />
              </View>
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
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#7f8c8d" />
                  ) : (
                    <Eye size={20} color="#7f8c8d" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <Button
              title={loading ? "" : "Login"}
              onPress={handleLogin}
              loading={loading}
              disabled={!email || !password || loading}
              style={styles.button}
            >
              {loading && <ActivityIndicator color="#fff" />}
            </Button>

            {!loading && isBiometricSupported && (
              <>
                {!isBiometricEnabled ? (
                  <TouchableOpacity
                    style={styles.biometricButton}
                    onPress={handleEnableBiometric}
                    disabled={!email || !password}
                  >
                    <Fingerprint size={20} color="#4158D0" style={styles.biometricIcon} />
                    <Text style={styles.biometricText}>Enable Fingerprint Login</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.biometricButton}
                      onPress={handleBiometricLogin}
                    >
                      <Fingerprint size={20} color="#4158D0" style={styles.biometricIcon} />
                      <Text style={styles.biometricText}>Login with Fingerprint</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.resetButton}
                      onPress={handleResetBiometric}
                    >
                      <Text style={styles.resetText}>Reset Fingerprint Login</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account?</Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={styles.footerLink}>Register</Text>
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
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    marginBottom: 0,
    flex: 1,
  },
  button: {
    marginTop: 8,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#4158D0',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(65, 88, 208, 0.1)',
  },
  biometricIcon: {
    marginRight: 8,
  },
  biometricText: {
    fontFamily: 'Inter-Medium',
    color: '#4158D0',
    fontSize: 16,
  },
  resetButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    padding: 8,
  },
  resetText: {
    fontFamily: 'Inter-Regular',
    color: '#7f8c8d',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontFamily: 'Inter-Regular',
    color: '#7f8c8d',
    marginRight: 4,
  },
  footerLink: {
    fontFamily: 'Inter-Medium',
    color: '#4158D0',
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 14,
    padding: 4,
  },
  roleSelectionContainer: {
    marginBottom: 24,
  },
  roleTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  roleTab: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  roleTabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  activeRoleTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  roleTabText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#7f8c8d',
    marginLeft: 8,
  },
  activeRoleTabText: {
    color: '#fff',
  },
  roleContent: {
    flexDirection: 'row',
    width: '200%',
  },
  roleCard: {
    width: '50%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  roleIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(65, 88, 208, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  roleCardTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#333',
    marginBottom: 8,
  },
  roleCardDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 16,
    lineHeight: 20,
  },
  roleFeatures: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
});