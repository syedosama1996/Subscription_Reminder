import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../lib/auth';
import {
  User,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  CreditCard,
  Store,
  Mail,
  Lock,
  Globe,
} from 'lucide-react-native';

interface SettingItem {
  icon: React.ReactNode;
  title: string;
  type: 'toggle' | 'link' | 'action';
  value?: boolean;
  onPress?: () => void;
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: signOut,
        },
      ],
      { cancelable: true }
    );
  };

  const settings: SettingItem[] = [
    {
      icon: <User size={24} color="#4158D0" />,
      title: 'Profile Settings',
      type: 'link',
      onPress: () => {},
    },
    {
      icon: <Store size={24} color="#4158D0" />,
      title: 'Store Settings',
      type: 'link',
      onPress: () => {},
    },
    {
      icon: <Bell size={24} color="#4158D0" />,
      title: 'Notifications',
      type: 'toggle',
      value: notifications,
      onPress: () => setNotifications(!notifications),
    },
    {
      icon: <CreditCard size={24} color="#4158D0" />,
      title: 'Payment Methods',
      type: 'link',
      onPress: () => {},
    },
    {
      icon: <Mail size={24} color="#4158D0" />,
      title: 'Email Preferences',
      type: 'link',
      onPress: () => {},
    },
    {
      icon: <Lock size={24} color="#4158D0" />,
      title: 'Privacy Settings',
      type: 'link',
      onPress: () => {},
    },
    {
      icon: <Globe size={24} color="#4158D0" />,
      title: 'Language',
      type: 'link',
      onPress: () => {},
    },
    {
      icon: <HelpCircle size={24} color="#4158D0" />,
      title: 'Help & Support',
      type: 'link',
      onPress: () => {},
    },
    {
      icon: <LogOut size={24} color="#F44336" />,
      title: 'Logout',
      type: 'action',
      onPress: handleLogout,
    },
  ];

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

        <ScrollView style={styles.content}>
          <View style={styles.profileSection}>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.email?.split('@')[0]}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.settingsList}>
            {settings.map((setting, index) => (
              <TouchableOpacity
                key={index}
                style={styles.settingItem}
                onPress={setting.onPress}
              >
                <View style={styles.settingLeft}>
                  <View style={styles.settingIcon}>
                    {setting.icon}
                  </View>
                  <Text style={[
                    styles.settingTitle,
                    setting.type === 'action' && styles.actionText,
                  ]}>
                    {setting.title}
                  </Text>
                </View>
                {setting.type === 'toggle' && (
                  <Switch
                    value={setting.value}
                    onValueChange={setting.onPress}
                    trackColor={{ false: '#ddd', true: 'rgba(65, 88, 208, 0.3)' }}
                    thumbColor={setting.value ? '#4158D0' : '#f4f3f4'}
                  />
                )}
                {setting.type === 'link' && (
                  <Text style={styles.arrow}>›</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 200,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  settingsList: {
    padding: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(65, 88, 208, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
  },
  actionText: {
    color: '#F44336',
  },
  arrow: {
    fontSize: 24,
    color: '#666',
  },
}); 