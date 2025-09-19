import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, Text, TouchableOpacity } from 'react-native';
import { Home, Plus, Clock, History } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TabBarIconProps {
  color: string;
  size: number;
  focused: boolean;
}

interface Route {
  key: string;
  name: string;
}

interface BottomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}


const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {/* Background */}
      <View style={styles.tabBarBackground} />
      
      <View style={styles.tabBar}>
        {state.routes.map((route: Route, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const isAddButton = route.name === 'add';

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
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              {isAddButton ? (
                <View style={styles.addButtonContainer}>
                  <View style={styles.addButton}>
                    <Plus size={20} color="white" strokeWidth={2} />
                  </View>
                </View>
              ) : (
                <View style={styles.regularTabContainer}>
                  <View style={styles.iconContainer}>
                    {options.tabBarIcon?.({
                      color: isFocused ? '#007AFF' : '#8E8E93',
                      size: 24,
                      focused: isFocused,
                    })}
                  </View>
                  <Text style={[styles.tabLabel, { color: isFocused ? '#007AFF' : '#8E8E93' }]}>
                    {options.title}
                  </Text>
                </View>
              )}
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
          title: 'Add',
          tabBarIcon: ({ size }: TabBarIconProps) => (
            <Plus size={size} color="white" strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Active',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Home size={size} color={color} strokeWidth={2} />
          ),
        }}
      />

    

      <Tabs.Screen
        name="expiring"
        options={{
          title: 'Expiring',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Clock size={size} color={color} strokeWidth={2} />
          ),
        }}
      />

      <Tabs.Screen
        name="past"
        options={{
          title: 'Past',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <History size={size} color={color} strokeWidth={2} />
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
    height: Platform.OS === 'ios' ? 90 : 75,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  tabBarBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
  },
  tabBar: {
    flexDirection: 'row',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingVertical: 8,
  },
  regularTabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  addButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 45,
    height: 45,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});