import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import Button from '../../components/Button';
import { ArrowLeft } from 'lucide-react-native';
import { ActivityLogger } from '../../lib/services/activity-logger';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { TouchableOpacity } from 'react-native-gesture-handler';
import PasswordInput from '@/components/PasswordInput';
import Toast from 'react-native-toast-message';
import { FONT_FAMILY } from '../../constants/Typography'; 
type FieldErrors = {
  current?: string | null;
  new?: string | null;
  confirm?: string | null;
  general?: string | null;
};

export default function ChangePasswordScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Refs for focusing inputs if PasswordInput supports forwardRef
  const currentRef = useRef<any>(null);
  const newRef = useRef<any>(null);
  const confirmRef = useRef<any>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

    if (password.length < minLength) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!hasUpperCase) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!hasLowerCase) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!hasNumbers) {
      errors.push('Password must contain at least one number');
    }
    if (!hasSpecialChar) {
      errors.push('Password must contain at least one special character');
    }
    return errors;
  };

  const handleChangePassword = async () => {
    setLoading(true);
    setFieldErrors({}); // clear previous
    
    // Validate all fields at once and collect all errors
    const errors: FieldErrors = {};
    
    // Validate current password
    if (!currentPassword.trim()) {
      errors.current = 'Please enter your current password';
    }
    
    // Validate new password
    if (!newPassword.trim()) {
      errors.new = 'Please enter a new password';
    } else {
      // Validate password strength (length and character requirements)
      const validationErrors = validatePassword(newPassword);
      if (validationErrors.length > 0) {
        // Join all validation errors with newlines and bullets
        errors.new = validationErrors.map(err => `• ${err}`).join('\n');
      }
    }
    
    // Validate confirm password
    if (!confirmPassword.trim()) {
      errors.confirm = 'Please confirm your new password';
    } else if (newPassword && newPassword !== confirmPassword) {
      errors.confirm = 'New password and confirmation do not match';
    }
    
    // If there are any validation errors, show them all and return
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }
    
    try {

      // Optional: if you want to reauthenticate with currentPassword before updating,
      // you'd implement that here (Supabase doesn't require it when user is logged in).
      // Proceed to update password
      const response = await supabase.auth.updateUser({
        password: newPassword,
      });

      // supabase returns { data, error } or similar depending on SDK version
      // handle both shapes safely:
      const error = (response as any).error ?? null;
      if (error) {
        throw error;
      }

      // Log activity if user present
      const userResp = await supabase.auth.getUser();
      const currentUser = (userResp as any).data?.user || (userResp as any).user;
      if (currentUser) {
        await ActivityLogger.log({
          user_id: currentUser.id,
          action: 'update',
          entity_type: 'password',
          entity_id: currentUser.id,
          details: { changed_at: new Date().toISOString() },
        });
      }
      Toast.show({
        type: 'success',
        text1: 'Password updated successfully'
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFieldErrors({});

      router.back();
    } catch (err: any) {
      // Provide helpful field-specific messages if possible
      const message = err?.message || 'Failed to update password';
      setFieldErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  // helpers to clear field errors on input change
  const onChangeCurrent = (text: string) => {
    setCurrentPassword(text);
    setFieldErrors(prev => ({ ...prev, current: undefined, general: undefined }));
  };
  const onChangeNew = (text: string) => {
    setNewPassword(text);
    setFieldErrors(prev => ({ ...prev, new: undefined, general: undefined }));
  };
  const onChangeConfirm = (text: string) => {
    setConfirmPassword(text);
    setFieldErrors(prev => ({ ...prev, confirm: undefined, general: undefined }));
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.headerContainer}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={22} color="#2c3e50" />
            </TouchableOpacity>
            <View style={styles.headerLeft}>
              <MaskedView
                maskElement={<Text style={styles.title}>Change Password</Text>}
              >
                <LinearGradient
                  colors={['#4158D0', '#C850C0']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={[styles.title, { opacity: 0 }]}>Change Password</Text>
                </LinearGradient>
              </MaskedView>
            </View>
            <View style={styles.placeholder} />
          </View>
        </View>
      </SafeAreaView>

      {/* KeyboardAvoidingView ensures inputs move above keyboard on small devices */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 70}
      >
        {/* TouchableWithoutFeedback to dismiss keyboard when tapping outside */}
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <ScrollView
            ref={scrollRef}
            style={styles.content}
            contentContainerStyle={styles.form}
            keyboardShouldPersistTaps="handled"
          >
            {fieldErrors.general && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{fieldErrors.general}</Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Current Password</Text>
              <PasswordInput
                ref={currentRef}
                placeholder="Enter current password"
                value={currentPassword}
                onChangeText={onChangeCurrent}
                returnKeyType="next"
                onSubmitEditing={() => newRef.current?.focus && newRef.current.focus()}
              />
              {fieldErrors.current ? (
                <Text style={styles.fieldErrorText}>{fieldErrors.current}</Text>
              ) : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>New Password</Text>
              <PasswordInput
                ref={newRef}
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={onChangeNew}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus && confirmRef.current.focus()}
              />
              {fieldErrors.new ? (
                <Text style={styles.fieldErrorText}>{fieldErrors.new}</Text>
              ) : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm New Password</Text>
              <PasswordInput
                ref={confirmRef}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={onChangeConfirm}
                returnKeyType="done"
                onSubmitEditing={handleChangePassword}
              />
              {fieldErrors.confirm ? (
                <Text style={styles.fieldErrorText}>{fieldErrors.confirm}</Text>
              ) : null}
            </View>

            <Button
              title="Change Password"
              onPress={handleChangePassword}
              loading={loading}
              disabled={loading}
              style={styles.button}
            />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  safeAreaTop: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  headerContainer: {
    backgroundColor: '#fff',
    paddingTop: 8,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeft: {
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  placeholder: {
    width: 40,
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 22,
    letterSpacing: -0.5,
    textAlign:'center'
  },
  content: {
    flex: 1,
    marginTop: 0,
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
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#e74c3c',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 12,
    marginTop: 12,
  },
  label: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: '#2c3e50',
    marginBottom: 8,
    marginLeft: 4,
  },
  fieldErrorText: {
    color: '#e74c3c',
    marginTop: 6,
    marginLeft: 4,
    fontSize: 13,
    fontFamily: FONT_FAMILY.medium,
  },
  button: {
    marginTop: 30,
    marginBottom: 20,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#4158D0',
  },
});
