import React from 'react';
import { View, StyleSheet, Switch } from 'react-native';
import { Subscription } from '../lib/subscriptions';

type StatusToggleProps = {
  subscription: Subscription;
  onToggle: (isActive: boolean) => void;
  disabled?: boolean;
};

export default function StatusToggle({ subscription, onToggle, disabled = false }: StatusToggleProps) {
  const isActive = subscription.is_active === true; // Explicitly check for true

  const handleToggle = (value: boolean) => {
    if (!disabled) {
      onToggle(value);
    }
  };

  return (
    <View style={styles.container}>
      <Switch
        trackColor={{ false: 'rgba(231, 76, 60, 0.3)', true: 'rgba(46, 204, 113, 0.3)' }}
        thumbColor={isActive ? '#2ecc71' : '#e74c3c'}
        ios_backgroundColor="rgba(231, 76, 60, 0.3)"
        onValueChange={handleToggle}
        value={isActive}
        disabled={disabled}
        style={styles.switch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginLeft: 8,
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
});