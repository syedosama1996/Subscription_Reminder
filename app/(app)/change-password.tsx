import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { LinearGradient } from 'expo-linear-gradient';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { Shield, Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
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

      // Validate new password
      const validationError = validatePassword(newPassword);
      if (validationError) {
        setError(validationError);
        return;
      }

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
        <TouchableOpacity 
          style={styles.backButton}
          onPressIn={() => router.back()}
        >
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Change Password</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Current Password</Text>
            <View style={styles.inputRow}>
              {/* <Shield size={20} color="#7f8c8d" style={styles.inputIcon} /> */}
              <View style={styles.inputWrapper}>
                <Input
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  placeholder="Enter your current password"
                  containerStyle={styles.input}
                />
                <TouchableOpacity 
                  onPressIn={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={styles.eyeIcon}
                >
                  {showCurrentPassword ? (
                    <EyeOff size={20} color="#7f8c8d" />
                  ) : (
                    <Eye size={20} color="#7f8c8d" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputRow}>
              {/* <Shield size={20} color="#7f8c8d" style={styles.inputIcon} /> */}
              <View style={styles.inputWrapper}>
                <Input
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  placeholder="Enter your new password"
                  containerStyle={styles.input}
                />
                <TouchableOpacity 
                  onPressIn={() => setShowNewPassword(!showNewPassword)}
                  style={styles.eyeIcon}
                >
                  {showNewPassword ? (
                    <EyeOff size={20} color="#7f8c8d" />
                  ) : (
                    <Eye size={20} color="#7f8c8d" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm New Password</Text>
            <View style={styles.inputRow}>
              {/* <Shield size={20} color="#7f8c8d" style={styles.inputIcon} /> */}
              <View style={styles.inputWrapper}>
                <Input
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  placeholder="Confirm your new password"
                  containerStyle={styles.input}
                />
                <TouchableOpacity 
                  onPressIn={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="#7f8c8d" />
                  ) : (
                    <Eye size={20} color="#7f8c8d" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Button
            title="Change Password"
            onPressIn={handleChangePassword}
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
    height: 160,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#fff',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    marginTop: 10,
  },
  form: {
    padding: 20,
    paddingTop: 30,
  },
  errorContainer: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.3)',
  },
  errorText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#e74c3c',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 12,
    marginTop: 12,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#2c3e50',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(223, 228, 234, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    height: 56,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 0,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    padding: 12,
  },
  button: {
    marginTop: 30,
    marginBottom: 20,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#4158D0',
  },
}); 