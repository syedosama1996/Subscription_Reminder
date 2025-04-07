import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Chrome as Home, Plus, Clock, History } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import DrawerToggler from 'expo-router/drawer';

interface TabBarIconProps {
  color: string;
  size: number;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4158D0',
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
          backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.8)' : 'white',
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView tint="light" intensity={80} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'white' }]} />
          )
        ),
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add New',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <View style={styles.addButton}>
              <Plus size={size} color="white" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Active',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Home size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="expiring"
        options={{
          title: 'Expiring',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Clock size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="past"
        options={{
          title: 'Past',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <History size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addButton: {
    backgroundColor: '#4158D0',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
    shadowColor: '#4158D0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  }
});