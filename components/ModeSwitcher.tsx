import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Store, ShoppingCart } from 'lucide-react-native';
import { useAuth } from '../lib/auth';

export default function ModeSwitcher() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.modeButton,
          user.role === 'buyer' && styles.activeMode
        ]}
        onPress={() => {
          // TODO: Implement mode switching
        }}
      >
        <ShoppingCart size={20} color={user.role === 'buyer' ? '#fff' : '#666'} />
        <Text style={[
          styles.modeText,
          user.role === 'buyer' && styles.activeModeText
        ]}>Buyer</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.modeButton,
          user.role === 'seller' && styles.activeMode
        ]}
        onPress={() => {
          // TODO: Implement mode switching
        }}
      >
        <Store size={20} color={user.role === 'seller' ? '#fff' : '#666'} />
        <Text style={[
          styles.modeText,
          user.role === 'seller' && styles.activeModeText
        ]}>Seller</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 5,
    marginHorizontal: 10,
    marginVertical: 5,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  activeMode: {
    backgroundColor: '#4158D0',
  },
  modeText: {
    fontSize: 14,
    color: '#666',
  },
  activeModeText: {
    color: '#fff',
  },
}); 