import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Modal, ActivityIndicator,TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { User, Mail, Phone, Calendar, MapPin, Edit2, X, ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { ActivityLogger } from '../../lib/services/activity-logger';
import CustomModal from '../../components/CustomModal';
import { FONT_FAMILY } from '../../constants/Typography';
export default function ProfileScreen() {
  const { user } = useAuth();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('Not set');
  const [location, setLocation] = useState('Not set');
  const [isLoading, setIsLoading] = useState(false);
  const [previousUsername, setPreviousUsername] = useState('');
  const [previousPhone, setPreviousPhone] = useState('Not set');
  const [previousLocation, setPreviousLocation] = useState('Not set');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    // Initialize profile data from profiles table
    const initializeProfile = async () => {
      if (user?.email) {
        try {
          // Try to fetch existing profile data from profiles table
          const { data, error } = await supabase
            .from('profiles')
            .select('username, phone, location')
            .eq('id', user.id)
            .single();

          if (error) {
            // If profile doesn't exist, create one
            if (error.code === 'PGRST116') {
              const initialUsername = user.email.split('@')[0];
              const { error: insertError } = await supabase
                .from('profiles')
                .insert({
                  id: user.id,
                  username: initialUsername,
                  phone: null,
                  location: null
                });

              if (insertError) {
                console.error('Error creating profile:', insertError);
              }

              setUsername(initialUsername);
              setPhone('Not set');
              setLocation('Not set');
              setPreviousUsername(initialUsername);
              setPreviousPhone('Not set');
              setPreviousLocation('Not set');
            } else {
              throw error;
            }
          } else {
            // If profile data exists, use it
            const initialUsername = data?.username || user.email.split('@')[0];
            const initialPhone = data?.phone || 'Not set';
            const initialLocation = data?.location || 'Not set';
            
            setUsername(initialUsername);
            setPhone(initialPhone);
            setLocation(initialLocation);
            setPreviousUsername(initialUsername);
            setPreviousPhone(initialPhone);
            setPreviousLocation(initialLocation);
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
          // Check if it's a schema error (table doesn't exist)
          if (error && typeof error === 'object' && 'message' in error && 
              typeof error.message === 'string' && error.message.includes('does not exist')) {
            console.log('Profiles table does not exist yet. Please run the migration first.');
            // Still set default values for UI
            const initialUsername = user.email.split('@')[0];
            setUsername(initialUsername);
            setPhone('Not set');
            setLocation('Not set');
            setPreviousUsername(initialUsername);
            setPreviousPhone('Not set');
            setPreviousLocation('Not set');
          } else {
            // Fallback to defaults for other errors
            const initialUsername = user.email.split('@')[0];
            setUsername(initialUsername);
            setPhone('Not set');
            setLocation('Not set');
            setPreviousUsername(initialUsername);
            setPreviousPhone('Not set');
            setPreviousLocation('Not set');
          }
        }
      }
    };

    initializeProfile();
  }, [user]);

  const handleSave = async () => {
    if (!username.trim()) {
      setModalTitle('Error');
      setModalMessage('Username cannot be empty');
      setModalType('error');
      setShowErrorModal(true);
      return;
    }

    // Only validate phone if user has entered something (not empty and not 'Not set')
    const phoneValue = phone.trim();
    if (phoneValue && phoneValue !== 'Not set' && phoneValue.length < 10) {
      setModalTitle('Error');
      setModalMessage('Please enter a valid phone number');
      setModalType('error');
      setShowErrorModal(true);
      return;
    }

    try {
      setIsLoading(true);
      
      // Update profile data in the profiles table
      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user?.id,
          username: username.trim(),
          phone: phone.trim() || null,
          location: location.trim() || null
        });

      if (error) throw error;

      // Log the profile update activity
      await ActivityLogger.log({
        user_id: user?.id || '',
        action: 'update',
        entity_type: 'profile',
        entity_id: user?.id,
        details: {
          previous_username: previousUsername,
          new_username: username.trim(),
          previous_phone: previousPhone,
          new_phone: phone.trim(),
          previous_location: previousLocation,
          new_location: location.trim()
        }
      });

      setPreviousUsername(username.trim());
      setPreviousPhone(phone.trim() || 'Not set');
      setPreviousLocation(location.trim() || 'Not set');
      setIsModalVisible(false);
      setModalTitle('Success');
      setModalMessage('Profile updated successfully');
      setModalType('success');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error updating profile:', error);
      // Check if it's a schema error (table doesn't exist)
      if (error && typeof error === 'object' && 'message' in error && 
          typeof error.message === 'string' && error.message.includes('does not exist')) {
        setModalTitle('Error');
        setModalMessage('Database schema not ready. Please contact support or try again later.');
        setModalType('error');
        setShowErrorModal(true);
      } else {
        setModalTitle('Error');
        setModalMessage('Failed to update profile. Please try again.');
        setModalType('error');
        setShowErrorModal(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getInitialLetter = () => {
    return username ? username[0].toUpperCase() : '?';
  };

  const formatPhoneNumber = (phoneNumber: string) => {
    if (phoneNumber === 'Not set') return phoneNumber;
    // Remove all non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    // Format as (XXX) XXX-XXXX
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phoneNumber;
  };

  const handlePhoneChange = (text: string) => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    // Limit to 11 digits (for international numbers)
    if (cleaned.length <= 11) {
      setPhone(cleaned);
    }
  };

  // Check if any field has changed from previous values
  const hasChanges = () => {
    const currentPhone = phone.trim() === '' ? 'Not set' : phone.trim();
    const currentLocation = location.trim() === '' ? 'Not set' : location.trim();
    
    return (
      username.trim() !== previousUsername ||
      currentPhone !== previousPhone ||
      currentLocation !== previousLocation
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#4158D0', '#C850C0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      />
      <View style={styles.headerContent}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{getInitialLetter()}</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
        
        <Text style={styles.name}>{username || 'Loading...'}</Text>
        <Text style={styles.email}>{user?.email || ''}</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => setIsModalVisible(true)}
        >
          <Edit2 size={20} color="#4158D0" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.infoRow}>
            <Phone size={20} color="#7f8c8d" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{phone && phone !== 'Not set' ? formatPhoneNumber(phone) : 'Not set'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Calendar size={20} color="#7f8c8d" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>January 2024</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MapPin size={20} color="#7f8c8d" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{location && location !== 'Not set' ? location : 'Not set'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity 
                onPress={() => {
                  // Reset to previous values when closing without saving
                  setUsername(previousUsername);
                  setPhone(previousPhone === 'Not set' ? 'Not set' : previousPhone);
                  setLocation(previousLocation === 'Not set' ? 'Not set' : previousLocation);
                  setIsModalVisible(false);
                }}
                style={styles.closeButton}
              >
                <X size={24} color="#2c3e50" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Username</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Enter username"
                    placeholderTextColor="#95a5a6"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={styles.readOnlyInputWrapper}>
                  <TextInput
                    style={styles.readOnlyInput}
                    value={user?.email || ''}
                    editable={false}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={phone === 'Not set' ? '' : phone}
                    onChangeText={handlePhoneChange}
                    placeholder="Enter phone number"
                    placeholderTextColor="#95a5a6"
                    keyboardType="phone-pad"



                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Location</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={location === 'Not set' ? '' : location}
                    onChangeText={setLocation}
                    placeholder="Enter location"
                    placeholderTextColor="#95a5a6"
                  />
                </View>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  // Reset to previous values when canceling
                  setUsername(previousUsername);
                  setPhone(previousPhone === 'Not set' ? 'Not set' : previousPhone);
                  setLocation(previousLocation === 'Not set' ? 'Not set' : previousLocation);
                  setIsModalVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.saveButton, 
                  (!hasChanges() || isLoading) && styles.saveButtonDisabled
                ]}
                onPress={handleSave}
                disabled={!hasChanges() || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <CustomModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={modalTitle}
        message={modalMessage}
        type="success"
        confirmText="OK"
      />

      {/* Error Modal */}
      <CustomModal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title={modalTitle}
        message={modalMessage}
        type="error"
        confirmText="OK"
      />
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
    height: 330,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.bold,
    color: '#fff',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    marginTop: 40,
  },
  name: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.bold,
    color: '#fff',
    marginBottom: 4,
  },
  email: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  editButtonText: {
    fontFamily: FONT_FAMILY.medium,
    color: '#4158D0',
    marginLeft: 8,
  },
  section: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#2c3e50',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#2c3e50',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    padding: 20,
  
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    color: '#2c3e50',
  },
  closeButton: {
    padding: 8,
  },
  modalBody: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingLeft: 20,
    paddingRight: 16,
    height: 48,
  },
  inputLabel: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: '#2c3e50',
    backgroundColor: 'transparent',
    paddingVertical: 14,
    margin: 0,
    padding: 0,
  },
  readOnlyInput: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: '#95a5a6',
    backgroundColor: 'transparent',
    paddingVertical: 14,
    margin: 0,
    padding: 0,
  },
  readOnlyInputWrapper: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    paddingLeft: 20,
    paddingRight: 16,
    height: 48,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  cancelButtonText: {
        fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#7f8c8d',
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#4158D0',
  },
  saveButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#95a5a6',
  },
  saveButtonText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#fff',
  },
}); 