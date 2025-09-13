import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, Modal, ActivityIndicator,TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { User, Mail, Phone, Calendar, MapPin, Edit2, X, ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { ActivityLogger } from '../../lib/services/activity-logger';

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
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }

    if (phone.trim() !== 'Not set' && phone.trim().length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
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
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      // Check if it's a schema error (table doesn't exist)
      if (error && typeof error === 'object' && 'message' in error && 
          typeof error.message === 'string' && error.message.includes('does not exist')) {
        Alert.alert('Error', 'Database schema not ready. Please contact support or try again later.');
      } else {
        Alert.alert('Error', 'Failed to update profile. Please try again.');
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
    // Limit to 10 digits
    if (cleaned.length <= 10) {
      setPhone(cleaned);
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
                onPress={() => setIsModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#2c3e50" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter username"
                  placeholderTextColor="#95a5a6"
                  textAlignVertical="center"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.readOnlyInput}
                  value={user?.email || ''}
                  editable={false}
                  textAlignVertical="center"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={phone === 'Not set' ? '' : phone}
                  onChangeText={handlePhoneChange}
                  placeholder="Enter phone number"
                  placeholderTextColor="#95a5a6"
                  keyboardType="phone-pad"
                  textAlignVertical="center"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Location</Text>
                <TextInput
                  style={styles.input}
                  value={location === 'Not set' ? '' : location}
                  onChangeText={setLocation}
                  placeholder="Enter location"
                  placeholderTextColor="#95a5a6"
                  textAlignVertical="center"
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isLoading}
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
    fontSize: 24,
    fontFamily: 'Inter-Bold',
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
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#fff',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-Medium',
    color: '#4158D0',
    marginLeft: 8,
  },
  section: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
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
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'Inter-Bold',
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
  inputLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#2c3e50',
    backgroundColor: '#fff',
    minHeight: 48,
  },
  readOnlyInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#95a5a6',
    backgroundColor: '#f8f9fa',
    minHeight: 48,
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
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#7f8c8d',
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#4158D0',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#fff',
  },
}); 