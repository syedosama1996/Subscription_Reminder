import React, { useEffect, useState } from 'react';
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
  History,
  Store,
  ShoppingCart
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerContentComponentProps as DrawerContentComponentPropsType } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import ModeSwitcher from '../../components/ModeSwitcher';

function CustomDrawerContent(props: DrawerContentComponentPropsType) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = () => {
    signOut();
    props.navigation.navigate('index');
  };

  const buyerMenuItems = [
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

  const sellerMenuItems = [
    {
      icon: <User size={24} color="#4158D0" />,
      label: 'Profile',
      onPress: () => router.push('/(app)/seller/profile')
    },
    {
      icon: <Store size={24} color="#4158D0" />,
      label: 'Products',
      onPress: () => router.push('/(app)/seller/products')
    },
    {
      icon: <BarChart2 size={24} color="#4158D0" />,
      label: 'Sales Analytics',
      onPress: () => router.push('/(app)/seller/analytics')
    },
    {
      icon: <FileText size={24} color="#4158D0" />,
      label: 'Orders',
      onPress: () => router.push('/(app)/seller/orders')
    },
    {
      icon: <Settings size={24} color="#4158D0" />,
      label: 'Settings',
      onPress: () => router.push('/(app)/seller/settings')
    }
  ];

  const menuItems = user?.role === 'seller' ? sellerMenuItems : buyerMenuItems;

  return (
    <SafeAreaView style={styles.drawerContainer}>
      <View style={styles.drawerHeader}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1633409361618-c73427e4e206?q=80&w=200&auto=format&fit=crop' }}
          style={styles.profileImage}
        />
        <Text style={styles.userName}>{user?.email}</Text>
        <Text style={styles.userRole}>{user?.role === 'seller' ? 'Seller' : 'Buyer'}</Text>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            {item.icon}
            <Text style={styles.menuText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleSignOut}
        >
          <LogOut size={24} color="#ff4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function AppLayout() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [initialRoute, setInitialRoute] = useState<string>('/(tabs)');

  useEffect(() => {
    if (user) {
      setInitialRoute(user.role === 'seller' ? '/(seller)' : '/(tabs)');
    } else {
      setInitialRoute('/login');
    }
  }, [user]);

  if (loading || !user) return null;

  return (
    <Drawer
      drawerContent={(props: DrawerContentComponentPropsType) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        header: () => (
          <SafeAreaView style={styles.header}>
            <ModeSwitcher />
          </SafeAreaView>
        ),
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
      <Drawer.Screen
        name="(seller)"
        options={{
          drawerLabel: 'Seller Dashboard',
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
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  menuContainer: {
    flex: 1,
    padding: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
  },
  logoutText: {
    fontSize: 16,
    color: '#ff4444',
    marginLeft: 15,
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
  },
});