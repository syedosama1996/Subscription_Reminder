import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { Home, Plus, Clock, History } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import DrawerToggler from 'expo-router/drawer';

interface TabBarIconProps {
  color: string;
  size: number;
  focused: boolean;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF6B6B',
        tabBarInactiveTintColor: '#95a5a6',
        tabBarLabelStyle: {
          fontFamily: 'Inter-Medium',
          fontSize: 12,
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
        tabBarStyle: {
          borderTopWidth: 0,
          height: 70,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          backgroundColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView tint="light" intensity={90} style={StyleSheet.absoluteFill} />
          ) : (
            <LinearGradient
              colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.95)']}
              style={StyleSheet.absoluteFill}
            />
          )
        ),
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add New',
          tabBarIcon: ({ color, size, focused }: TabBarIconProps) => (
            <View style={[styles.addButton, focused && styles.addButtonFocused]}>
              <Plus size={size} color="white" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Active',
          tabBarIcon: ({ color, size, focused }: TabBarIconProps) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
              <Home size={size} color={focused ? '#FF6B6B' : color} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="expiring"
        options={{
          title: 'Expiring',
          tabBarIcon: ({ color, size, focused }: TabBarIconProps) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
              <Clock size={size} color={focused ? '#FF6B6B' : color} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="past"
        options={{
          title: 'Past',
          tabBarIcon: ({ color, size, focused }: TabBarIconProps) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
              <History size={size} color={focused ? '#FF6B6B' : color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addButton: {
    backgroundColor: '#FF6B6B',
    width: 38,
    height: 38,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 15 : 15,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    transform: [{ scale: 1 }],
  },
  addButtonFocused: {
    transform: [{ scale: 1.1 }],
    backgroundColor: '#FF5252',
  },
  iconContainer: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  iconContainerFocused: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  }
});