import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import { 
  Settings,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  User,
  FileText,
  BarChart2,
  Activity,
  History
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = () => {
    signOut();
  };

  const menuItems = [
    {
      icon: <User size={24} color="#4158D0" />,
      label: 'Profile',
      onPress: () => router.push('/(app)/profile')
    },
    {
      icon: <FileText size={24} color="#4158D0" />,
      label: 'Invoice',
      onPress: () => router.push('/(app)/invoice')
    },
    {
      icon: <BarChart2 size={24} color="#4158D0" />,
      label: 'Report',
      onPress: () => router.push('/(app)/report')
    },
    {
      icon: <Activity size={24} color="#4158D0" />,
      label: 'Activity Log',
      onPress: () => router.push('/(app)/activity-log')
    },
    {
      icon: <History size={24} color="#4158D0" />,
      label: 'Purchase History',
      onPress: () => router.push('/(app)/purchase-history')
    },
    {
      icon: <Settings size={24} color="#4158D0" />,
      label: 'Settings',
      onPress: () => router.push('/(app)/settings')
    }
  ];

  return (
    <View style={styles.drawerContainer}>
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={['#4158D0', '#C850C0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.drawerHeader}
        >
          <View style={styles.profileSection}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>{user?.email?.[0].toUpperCase()}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text numberOfLines={1} style={styles.emailText}>
                  <Text>{user?.email?.split('@')[0]}</Text>
                  <Text style={styles.emailDomain}>@{user?.email?.split('@')[1]}</Text>
                </Text>
                <TouchableOpacity onPress={() => router.push('/profile')}>
                  <Text style={styles.viewProfileText}>View Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.menuItem, { backgroundColor: '#F8F9FA' }]}
            onPress={item.onPress}
          >
            <View style={styles.menuIconContainer}>
              {item.icon}
            </View>
            <Text style={styles.menuItemText}>{item.label}</Text>
            <View style={styles.menuArrow} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.menuItem, styles.signOutButton]}
          onPress={handleSignOut}
        >
          <View style={styles.menuIconContainer}>
            <LogOut size={24} color="#e74c3c" />
          </View>
          <Text style={[styles.menuItemText, styles.signOutText]}>Sign Out</Text>
          <View style={[styles.menuArrow, styles.signOutArrow]} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AppLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading || !user) return null;

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: '#fff',
          width: 320,
        },
        swipeEnabled: true,
        swipeEdgeWidth: 100,
      }}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          drawerLabel: 'Home',
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    overflow: 'hidden',
    paddingBottom: 20,
  },
  drawerHeader: {
    paddingTop: Platform.OS === 'ios' ? 40 : 35,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  profileSection: {
    padding: 25,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#fff',
  },
  emailText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#fff',
    marginBottom: 4,
  },
  emailDomain: {
    opacity: 0.8,
    color: '#fff',
  },
  viewProfileText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  menuContainer: {
    flex: 1,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginVertical: 4,
    borderRadius: 12,
  },
  menuIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 12,
  },
  menuArrow: {
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: '#95a5a6',
    transform: [{ rotate: '45deg' }],
  },
  signOutButton: {
    marginTop: 'auto',
    marginBottom: 20,
    backgroundColor: '#FFF5F5',
  },
  signOutText: {
    color: '#e74c3c',
  },
  signOutArrow: {
    borderColor: '#e74c3c',
  },
});