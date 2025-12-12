import React, { useRef, useEffect } from 'react';
import {  StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Subscription } from '../lib/subscriptions';
import { Check, X } from 'lucide-react-native';

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
    outputRange: [0, 16],
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
        {isActive ? (
          <Check size={10} color="#ffffff" style={styles.icon} />
        ) : (
          <X size={10} color="#ffffff" style={styles.icon} />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 36,
    height: 20,
    borderRadius: 10,
    padding: 2,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  containerActive: {
    backgroundColor: '#10b981',
    borderWidth: 0,
  },
  containerInactive: {
    backgroundColor: '#6b7280',
    borderWidth: 0,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  toggle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 1.5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  icon: {
    opacity: 1,
  },
});