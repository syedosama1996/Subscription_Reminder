import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { LinearGradient } from 'expo-linear-gradient';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { Shield, Eye, EyeOff } from 'lucide-react-native';
import { ActivityLogger } from '../../lib/services/activity-logger';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function ChangePasswordScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validatePassword = (password: string): string | null => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return 'Password must be at least 8 characters long';
    }
    if (!hasUpperCase) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!hasLowerCase) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!hasNumbers) {
      return 'Password must contain at least one number';
    }
    if (!hasSpecialChar) {
      return 'Password must contain at least one special character';
    }
    return null;
  };

  const handleChangePassword = async () => {
    try {
      setLoading(true);
      setError(null);

      if (newPassword !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Log password change activity
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await ActivityLogger.log({
          user_id: user.id,
          action: 'update',
          entity_type: 'password',
          entity_id: user.id,
          details: {
            changed_at: new Date().toISOString()
          }
        });
      }

      Alert.alert('Success', 'Password updated successfully');
      router.back();
    } catch (error: any) {
      console.error('Password change error:', error);
      setError(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#4158D0', '#C850C0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      />
      
      <View style={styles.header}>
        <Text style={styles.title}>Change Password</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Current Password</Text>
            <View style={styles.inputWrapper}>
              <Shield size={20} color="#4158D0" style={styles.inputIcon} />
              <Input
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
                style={styles.input}
              />
              <TouchableOpacity 
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                style={styles.eyeIcon}
              >
                {showCurrentPassword ? (
                  <EyeOff size={20} color="#4158D0" />
                ) : (
                  <Eye size={20} color="#4158D0" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputWrapper}>
              <Shield size={20} color="#4158D0" style={styles.inputIcon} />
              <Input
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                style={styles.input}
              />
              <TouchableOpacity 
                onPress={() => setShowNewPassword(!showNewPassword)}
                style={styles.eyeIcon}
              >
                {showNewPassword ? (
                  <EyeOff size={20} color="#4158D0" />
                ) : (
                  <Eye size={20} color="#4158D0" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm New Password</Text>
            <View style={styles.inputWrapper}>
              <Shield size={20} color="#4158D0" style={styles.inputIcon} />
              <Input
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                style={styles.input}
              />
              <TouchableOpacity 
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color="#4158D0" />
                ) : (
                  <Eye size={20} color="#4158D0" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <Button
            title="Change Password"
            onPress={handleChangePassword}
            loading={loading}
            style={styles.button}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 180,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 10,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#2c3e50',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f6fa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(223, 228, 234, 0.5)',
  },
  inputIcon: {
    marginLeft: 16,
  },
  input: {
    flex: 1,
    height: 56,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#2c3e50',
  },
  eyeIcon: {
    padding: 16,
  },
  button: {
    marginTop: 20,
  },
}); 