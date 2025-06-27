import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Subscription } from '../lib/subscriptions';
import { Power } from 'lucide-react-native';

type StatusToggleProps = {
  subscription: Subscription;
  onToggle: (isActive: boolean) => void;
  disabled?: boolean;
};

export default function StatusToggle({ subscription, onToggle, disabled = false }: StatusToggleProps) {
  const isActive = subscription.is_active === true;
  const slideAnimation = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(slideAnimation, {
      toValue: isActive ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 50,
    }).start();
  }, [isActive]);

  const handleToggle = () => {
    if (!disabled) {
      onToggle(!isActive);
    }
  };

  const translateX = slideAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 22],
  });

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isActive ? styles.containerActive : styles.containerInactive,
        disabled && styles.containerDisabled
      ]}
      onPress={handleToggle}
      activeOpacity={0.8}
      disabled={disabled}
    >
      <Animated.View style={[
        styles.toggle,
        { transform: [{ translateX }] }
      ]}>
        <Power
          size={16}
          color={isActive ? '#2ecc71' : '#e74c3c'}
          style={styles.icon}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 56,
    height: 32,
    borderRadius: 16,
    padding: 2,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  containerActive: {
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
    borderWidth: 1,
    borderColor: '#2ecc71',
  },
  containerInactive: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  containerDisabled: {
    opacity: 0.5,
  },
  toggle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  icon: {
    opacity: 0.9,
  },
});