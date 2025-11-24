import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { Bell, Moon, Sun, Lock, CreditCard, HelpCircle, Shield, Mail, LogOut,ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { FONT_FAMILY } from '../../constants/Typography'; 
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
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.placeholder} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  backButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center', 
  },
  headerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 110,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    zIndex: 1000,
  },
  header: {
    marginTop: 42,
    zIndex: 1001,
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 22,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 10,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    marginTop: 25,
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 24,
    padding: 20,
  
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
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
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 12,
    color: '#2c3e50',
  },
  menuValue: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
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
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 12,
  },
  versionText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
    marginBottom: 40,
  },
}); 