import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { Home, Package, BarChart2, Settings } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface TabBarIconProps {
  color: string;
  size: number;
  focused: boolean;
}

function TabBarIcon({ color, size, focused }: TabBarIconProps) {
  return (
    <View style={[
      styles.iconContainer,
      focused && styles.activeIconContainer
    ]}>
      <View style={[
        styles.iconWrapper,
        focused && styles.activeIconWrapper
      ]}>
        <View style={[
          styles.iconBackground,
          focused && styles.activeIconBackground
        ]} />
      </View>
    </View>
  );
}

export default function SellerLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 90 : 70,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={100}
            style={StyleSheet.absoluteFill}
          />
        ),
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#4158D0',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={styles.tabIconContainer}>
              <Home size={size} color={color} />
              <Text style={[
                styles.tabLabel,
                focused && styles.activeTabLabel
              ]}>Dashboard</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={styles.tabIconContainer}>
              <Package size={size} color={color} />
              <Text style={[
                styles.tabLabel,
                focused && styles.activeTabLabel
              ]}>Products</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={styles.tabIconContainer}>
              <BarChart2 size={size} color={color} />
              <Text style={[
                styles.tabLabel,
                focused && styles.activeTabLabel
              ]}>Analytics</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={styles.tabIconContainer}>
              <Settings size={size} color={color} />
              <Text style={[
                styles.tabLabel,
                focused && styles.activeTabLabel
              ]}>Settings</Text>
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 12,
    color: '#666',
  },
  activeTabLabel: {
    color: '#4158D0',
    fontWeight: '600',
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIconContainer: {
    backgroundColor: 'rgba(65, 88, 208, 0.1)',
    borderRadius: 12,
  },
  iconWrapper: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIconWrapper: {
    backgroundColor: '#4158D0',
    borderRadius: 12,
  },
  iconBackground: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  activeIconBackground: {
    backgroundColor: '#4158D0',
  },
}); 