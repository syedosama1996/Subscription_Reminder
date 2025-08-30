import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Bell, Calendar, Clock } from 'lucide-react-native';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'expiry_reminder' | 'payment_due' | 'general';
  subscription_id?: string;
  read: boolean;
  created_at: string;
}

interface NotificationBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationBottomSheet({
  visible,
  onClose,
}: NotificationBottomSheetProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      fetchNotifications();
    }
  }, [visible]);

  async function fetchNotifications() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Show some mock notifications for demo
      setNotifications([
        {
          id: '1',
          title: 'Domain Expiring Soon',
          message: 'Your domain subscription expires in 7 days',
          type: 'expiry_reminder',
          read: false,
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'Payment Reminder',
          message: 'GoDaddy subscription payment is due tomorrow',
          type: 'payment_due',
          read: true,
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Update locally for demo
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'expiry_reminder':
        return <Calendar size={20} color="#e67e22" />;
      case 'payment_due':
        return <Clock size={20} color="#e74c3c" />;
      default:
        return <Bell size={20} color="#4158D0" />;
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, item.read ? styles.read : styles.unread]}
      onPress={() => markAsRead(item.id)}
    >
      <View style={styles.iconContainer}>
        {getNotificationIcon(item.type)}
      </View>
      <View style={styles.notificationContent}>
        <Text style={[styles.title, !item.read && styles.unreadTitle]}>
          {item.title}
        </Text>
        <Text style={styles.message} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.date}>
          {format(new Date(item.created_at), 'MMM d, yyyy h:mm a')}
        </Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const Content = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={24} color="#2c3e50" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4158D0" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Bell size={48} color="#bdc3c7" />
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptySubtitle}>
            You're all caught up! We'll notify you when something important happens.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint="light" style={styles.bottomSheet}>
            <Content />
          </BlurView>
        ) : (
          <View style={styles.bottomSheet}>
            <Content />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.95)' : '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  content: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#2c3e50',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#7f8c8d',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContainer: {
    paddingVertical: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  read: {
    opacity: 0.7,
  },
  unread: {
    backgroundColor: 'rgba(65, 88, 208, 0.02)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#2c3e50',
    marginBottom: 4,
  },
  unreadTitle: {
    fontFamily: 'Inter-SemiBold',
  },
  message: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#7f8c8d',
    marginBottom: 4,
    lineHeight: 18,
  },
  date: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#95a5a6',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4158D0',
    marginLeft: 8,
  },
});
