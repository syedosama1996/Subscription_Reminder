import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { Home, Plus, Clock, History } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TouchableOpacity } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';

interface TabBarIconProps {
  color: string;
  size: number;
  focused: boolean;
}

interface Route {
  key: string;
  name: string;
}

const GradientText = ({ style, children }: { style?: any, children: React.ReactNode }) => {
  return (
    <MaskedView maskElement={<Text style={style}>{children}</Text>}>
      <LinearGradient
        colors={['#4158D0', '#C850C0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={[style, { opacity: 0 }]}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
};

const GradientIcon = ({ icon: Icon, size }: { icon: any, size: number }) => {
  return (
    <MaskedView
      maskElement={
        <Icon size={size} color="black" strokeWidth={2} />
      }
    >
      <LinearGradient
        colors={['#4158D0', '#C850C0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: size, width: size }}
      />
    </MaskedView>
  );
};

const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {Platform.OS === 'ios' ? (
        <BlurView tint="light" intensity={95} style={StyleSheet.absoluteFill} />
      ) : (
        <LinearGradient
          colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.98)']}
          style={StyleSheet.absoluteFill}
        />
      )}
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
              style={[
                styles.tabItem,
                isAddButton && styles.addButtonContainer,
              ]}
            >
              <View style={styles.tabItemInner}>
                {isAddButton ? (
                  <>
                    <LinearGradient
                      colors={['#4158D0', '#C850C0']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.addButton}
                    >
                      <Plus size={20} color="white" strokeWidth={2} />
                    </LinearGradient>
                    {isFocused ? (
                      <GradientText style={styles.tabLabel}>
                        Add
                      </GradientText>
                    ) : (
                      <Text style={[styles.tabLabel, { color: '#95a5a6' }]}>
                        Add
                      </Text>
                    )}
                  </>
                ) : (
                  <>
                    {isFocused ? (
                      <GradientIcon 
                        icon={
                          route.name === 'index' ? Home :
                          route.name === 'expiring' ? Clock :
                          History
                        }
                        size={20}
                      />
                    ) : (
                      options.tabBarIcon?.({
                        color: '#95a5a6',
                        size: 20,
                        focused: false,
                      })
                    )}
                    {isFocused ? (
                      <GradientText style={styles.tabLabel}>
                        {options.title}
                      </GradientText>
                    ) : (
                      <Text style={[styles.tabLabel, { color: '#95a5a6' }]}>
                        {options.title}
                      </Text>
                    )}
                  </>
                )}
              </View>
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
    height: Platform.OS === 'ios' ? 85 : 70,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  tabBar: {
    flexDirection: 'row',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
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
    marginTop: 5,
    letterSpacing: 0.8,
  },
  addButtonContainer: {
    marginBottom: Platform.OS === 'ios' ? 25 : 0,
  },
  addButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',

  },
  iconContainer: {
    padding: 12,
    borderRadius: 22,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
});