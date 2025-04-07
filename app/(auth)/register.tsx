import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { Lock, Mail } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleRegister = async () => {
    // Reset validation error
    setValidationError(null);
    
    // Validate inputs
    if (!email || !password || !confirmPassword) {
      setValidationError('All fields are required');
      return;
    }
    
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return;
    }
    
    // Proceed with registration
    await signUp(email, password);
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
            <Text style={styles.subtitle}>Create your account to get started</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Create Account</Text>
            
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
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} color="#7f8c8d" style={styles.inputIcon} />
              <Input
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                containerStyle={styles.input}
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} color="#7f8c8d" style={styles.inputIcon} />
              <Input
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                containerStyle={styles.input}
              />
            </View>

            <Button
              title={loading ? "" : "Register"}
              onPress={handleRegister}
              loading={loading}
              disabled={!email || !password || !confirmPassword || loading}
              style={styles.button}
            >
              {loading && <ActivityIndicator color="#fff" />}
            </Button>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.footerLink}>Login</Text>
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
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    marginBottom: 0,
  },
  button: {
    marginTop: 8,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#4158D0',
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
});