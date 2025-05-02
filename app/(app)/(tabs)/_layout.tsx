import React, { useEffect, useRef } from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, Text, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Home, Plus, Clock, History } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const { width } = Dimensions.get('window');

interface TabBarIconProps {
  color: string;
  size: number;
  focused: boolean;
}

const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const animatedValues = useRef(state.routes.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    state.routes.forEach((route, index) => {
      Animated.spring(animatedValues[index], {
        toValue: state.index === index ? 1 : 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    });
  }, [state.index]);

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom }]}>
      {Platform.OS === 'ios' ? (
        <BlurView tint="light" intensity={90} style={StyleSheet.absoluteFill} />
      ) : (
        <LinearGradient
          colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.95)']}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const isAddButton = route.name === 'add';

          const scale = animatedValues[index].interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.1],
          });

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPressIn={onPress}
              style={[
                styles.tabItem,
                isAddButton && styles.addButtonContainer,
              ]}
            >
              <Animated.View
                style={[
                  styles.tabItemInner,
                  isAddButton ? styles.addButton : styles.iconContainer,
                  isFocused && !isAddButton && styles.iconContainerFocused,
                  {
                    transform: [{ scale }],
                  },
                ]}
              >
                {options.tabBarIcon?.({
                  color: isFocused ? '#FF6B6B' : '#95a5a6',
                  size:  20,
                  focused: isFocused,
                })}
                {/* {isAddButton && (
                  <Text
                    style={[
                      styles.tabLabel,
                      { 
                        color: '#FF6B6B', 
                        marginTop: 8,
                        paddingTop: 14
                      }
                    ]}
                  >
                    Add
                  </Text>
                )} */}
                {!isAddButton && (
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: isFocused ? '#FF6B6B' : '#95a5a6' },
                    ]}
                  >
                    {options.title}
                  </Text>
                )}
                {!isAddButton && isFocused && (
                  <View style={styles.activeIndicator} />
                )}
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props: BottomTabBarProps) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add New',
          tabBarIcon: ({ color, size, focused }: TabBarIconProps) => (
            <Plus size={size} color="white" />
          ),
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: 'Active',
          tabBarIcon: ({ color, size, focused }: TabBarIconProps) => (
            <Home size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="expiring"
        options={{
          title: 'Expiring',
          tabBarIcon: ({ color, size, focused }: TabBarIconProps) => (
            <Clock size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="past"
        options={{
          title: 'Past',
          tabBarIcon: ({ color, size, focused }: TabBarIconProps) => (
            <History size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 85 : 65,
  },
  tabBar: {
    flexDirection: 'row',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabItemInner: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  tabLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    marginTop: 4,
  },
  addButtonContainer: {
    marginBottom: Platform.OS === 'ios' ? 25 : 0,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: Platform.OS === 'ios' ? 15 : 10,
    padding: 0,
  },
  iconContainer: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconContainerFocused: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF6B6B',
  },
});