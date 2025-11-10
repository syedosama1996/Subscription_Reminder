import React from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import Button from '../../components/Button';
import { LogOut, Mail, Shield, HelpCircle as HelpCircle, CreditCard, Bell, Moon, Sun } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TouchableOpacity } from 'react-native-gesture-handler';
export default function ProfileScreen() {
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
          <Text style={styles.title}>Profile</Text>
        </View>

        <ScrollView style={styles.scrollView}>
          <View style={styles.profileSection}>
            <LinearGradient
              colors={['#4158D0', '#C850C0']}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </LinearGradient>
            <Text style={styles.emailText}>{user?.email}</Text>
            <View style={styles.membershipBadge}>
              <Text style={styles.membershipText}>Premium Member</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            
            <TouchableOpacity style={styles.menuItem}>
              <Mail size={20} color="#4158D0" style={styles.menuIcon} />
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Email</Text>
                <Text style={styles.menuValue}>{user?.email}</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem}>
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
            <Text style={styles.sectionTitle}>Support</Text>
            
            <TouchableOpacity style={styles.menuItem}>
              <HelpCircle size={20} color="#4158D0" style={styles.menuIcon} />
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Help & Support</Text>
              </View>
              <View style={styles.menuArrow} />
            </TouchableOpacity>
          </View>

          <Button
            title="Sign Out"
            variant="outline"
            onPress={handleSignOut}
            style={styles.signOutButton}
            textStyle={styles.signOutButtonText}
            icon={<LogOut size={18} color="#e74c3c" style={{ marginRight: 8 }} />}
          />

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
  profileSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 24,
  
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontFamily: 'Inter-Bold',
    fontSize: 40,
    color: '#fff',
  },
  emailText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#2c3e50',
    marginBottom: 12,
  },
  membershipBadge: {
    backgroundColor: 'rgba(65, 88, 208, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(65, 88, 208, 0.3)',
  },
  membershipText: {
    fontFamily: 'Inter-Medium',
    color: '#4158D0',
    fontSize: 14,
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 24,
    padding: 20,
  
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
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: '#e74c3c',
    borderWidth: 2,
    borderRadius: 24,
  },
  signOutButtonText: {
    color: '#e74c3c',
    fontFamily: 'Inter-SemiBold',
  },
  versionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginBottom: 40,
  },
});