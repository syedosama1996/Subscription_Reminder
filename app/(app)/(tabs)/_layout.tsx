import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, Text, TouchableOpacity } from 'react-native';
import { Zap, PlusCircle, CalendarClock, Archive } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FONT_FAMILY } from '../../../constants/Typography';

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
    <View style={[styles.tabBarContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
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
                <View style={styles.regularTabContainer}>
                  {isFocused && (
                    <LinearGradient
                      colors={['#4158D0', '#C850C0']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.activeBackground}
                    />
                  )}
                  <View style={styles.iconContainer}>
                    {options.tabBarIcon?.({
                      color: isFocused ? '#FFFFFF' : '#9CA3AF',
                      size: 24,
                      focused: isFocused,
                    })}
                  </View>
                  <Text style={[styles.tabLabel, { color: isFocused ? '#FFFFFF' : '#9CA3AF' }]}>
                    {options.title}
                  </Text>
                </View>
              ) : (
                <View style={styles.regularTabContainer}>
                  {isFocused && (
                    <LinearGradient
                      colors={['#4158D0', '#C850C0']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.activeBackground}
                    />
                  )}
                  <View style={styles.iconContainer}>
                    {options.tabBarIcon?.({
                      color: isFocused ? '#FFFFFF' : '#9CA3AF',
                      size: 24,
                      focused: isFocused,
                    })}
                  </View>
                  <Text style={[styles.tabLabel, { color: isFocused ? '#FFFFFF' : '#9CA3AF' }]}>
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
      initialRouteName="index"
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Active',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Zap size={size} color={color} strokeWidth={2.5} />
          ),
        }}
      />

      <Tabs.Screen
        name="expiring"
        options={{
          title: 'Expired',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <CalendarClock size={size} color={color} strokeWidth={2.5} />
          ),
        }}
      />

      <Tabs.Screen
        name="past"
        options={{
          title: 'In-Active',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Archive size={size} color={color} strokeWidth={2.5} />
          ),
        }}
      />

      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <PlusCircle size={size} color={color} strokeWidth={2} />
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
    height: Platform.OS === 'ios' ? 85 : 70,
  },
  tabBarBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  tabBar: {
    flexDirection: 'row',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  regularTabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    position: 'relative',
    minHeight: 56,
  },
  activeBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.semiBold,
  },
  addButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  addButton: {
    marginTop: 12,
    width: 55,
    height: 55,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4158D0',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
});