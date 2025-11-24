import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useNotificationCount } from '../lib/hooks/useNotificationCount';
import { FONT_FAMILY, FONT_SIZES } from '../constants/Typography';

interface NotificationIconProps {
  onPress: () => void;
  userId?: string;
  size?: number;
  color?: string;
  style?: any;
}

export default function NotificationIcon({ 
  onPress, 
  userId, 
  size = 22, 
  color = '#fff',
  style 
}: NotificationIconProps) {
  const { unreadCount } = useNotificationCount(userId);

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
    >
      <Bell size={size} color={color} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount.toString()}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: FONT_SIZES.tiny + 1,
    fontFamily: FONT_FAMILY.bold,
    textAlign: 'center',
  },
});
