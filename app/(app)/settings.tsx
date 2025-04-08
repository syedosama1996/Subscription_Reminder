import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { Bell, Moon, Sun, Lock, CreditCard, HelpCircle, Shield, Mail, LogOut } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4158D0', '#C850C0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        <ScrollView style={styles.scrollView}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            
            <TouchableOpacity style={styles.menuItem}>
              <Mail size={20} color="#4158D0" style={styles.menuIcon} />
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Email</Text>
                <Text style={styles.menuValue}>{user?.email}</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/(app)/change-password')}
            >
              <Shield size={20} color="#4158D0" style={styles.menuIcon} />
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Change Password</Text>
              </View>
              <View style={styles.menuArrow} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem}>
              <CreditCard size={20} color="#4158D0" style={styles.menuIcon} />
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Subscription Plan</Text>
                <Text style={styles.menuValue}>Premium</Text>
              </View>
              <View style={styles.menuArrow} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            
            <TouchableOpacity style={styles.menuItem}>
              <Bell size={20} color="#4158D0" style={styles.menuIcon} />
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Notification Settings</Text>
              </View>
              <View style={styles.menuArrow} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem}>
              {Platform.OS === 'ios' ? (
                <Moon size={20} color="#4158D0" style={styles.menuIcon} />
              ) : (
                <Sun size={20} color="#4158D0" style={styles.menuIcon} />
              )}
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Appearance</Text>
                <Text style={styles.menuValue}>{Platform.OS === 'ios' ? 'Dark' : 'Light'}</Text>
              </View>
              <View style={styles.menuArrow} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security</Text>
            
            <TouchableOpacity style={styles.menuItem}>
              <Lock size={20} color="#4158D0" style={styles.menuIcon} />
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Two-Factor Authentication</Text>
                <Text style={styles.menuValue}>Disabled</Text>
              </View>
              <View style={styles.menuArrow} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem}>
              <Shield size={20} color="#4158D0" style={styles.menuIcon} />
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Privacy Settings</Text>
              </View>
              <View style={styles.menuArrow} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>
            
            <TouchableOpacity style={styles.menuItem}>
              <HelpCircle size={20} color="#4158D0" style={styles.menuIcon} />
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Help & Support</Text>
              </View>
              <View style={styles.menuArrow} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <LogOut size={18} color="#e74c3c" style={{ marginRight: 8 }} />
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>Version 2.0.0</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
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
  safeArea: {
    flex: 1,
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
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#2c3e50',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(241, 242, 246, 0.5)',
  },
  menuIcon: {
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#2c3e50',
  },
  menuValue: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  menuArrow: {
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: '#bdc3c7',
    transform: [{ rotate: '45deg' }],
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: '#e74c3c',
    borderWidth: 2,
    borderRadius: 24,
    paddingVertical: 16,
  },
  signOutButtonText: {
    color: '#e74c3c',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  versionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginBottom: 40,
  },
}); 