import React from 'react';
import { View, StyleSheet, Switch } from 'react-native';
import { Subscription } from '../lib/subscriptions';

type StatusToggleProps = {
  subscription: Subscription;
  onToggle: (isActive: boolean) => void;
  disabled?: boolean;
};

export default function StatusToggle({ subscription, onToggle, disabled = false }: StatusToggleProps) {
  const isActive = subscription.is_active !== false; // Default to true if undefined

  return (
    <View style={styles.container}>
      <Switch
        trackColor={{ false: 'rgba(231, 76, 60, 0.3)', true: 'rgba(46, 204, 113, 0.3)' }}
        thumbColor={isActive ? '#2ecc71' : '#e74c3c'}
        ios_backgroundColor="rgba(231, 76, 60, 0.3)"
        onValueChange={(value) => onToggle(value)}
        value={isActive}
        disabled={disabled}
        style={styles.switch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  switch: {
    transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }],
  }
});