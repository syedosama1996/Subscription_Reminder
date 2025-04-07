import React, { useEffect } from 'react';
import { Drawer } from 'expo-router/drawer';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { 
  FileText,
  History,
  Activity,
  BarChart3,
  LogOut,
  Menu,
  Home,
  Plus,
  Clock,
  User
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

function CustomDrawerContent(props: any) {
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = () => {
    signOut();
  };

  return (
    <View style={styles.drawerContainer}>
      <LinearGradient
        colors={['#4158D0', '#C850C0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.drawerHeader}
      >
        <Text style={styles.drawerTitle}>Menu</Text>
      </LinearGradient>

      <View style={styles.drawerContent}>
     
        <TouchableOpacity 
          style={styles.drawerItem}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <User size={24} color="#4158D0" />
          <Text style={styles.drawerItemText}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.drawerItem, styles.signOutButton]}
          onPress={handleSignOut}
        >
          <LogOut size={24} color="#e74c3c" />
          <Text style={[styles.drawerItemText, styles.signOutText]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AppLayout() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/(auth)/login');
      }
    }
  }, [user, loading]);

  if (loading) return null;
  if (!user) return null;

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: '#fff',
          width: 300,
        },
      }}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          drawerLabel: 'Home',
          drawerIcon: ({ color }) => <Menu size={24} color={color} />,
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
  drawerHeader: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
  },
  drawerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 10,
  },
  drawerContent: {
    flex: 1,
    paddingTop: 20,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
  },
  drawerItemText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 12,
  },
  signOutButton: {
    marginTop: 'auto',
    marginBottom: 20,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
  },
  signOutText: {
    color: '#e74c3c',
  },
});