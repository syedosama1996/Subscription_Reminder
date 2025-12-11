import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
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
import { useRouter } from 'expo-router';
import { useNotificationCount } from '../lib/hooks/useNotificationCount';

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
  userId?: string;
}

function NotificationBottomSheet({
  visible,
  onClose,
  userId,
}: NotificationBottomSheetProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { markAsRead: markNotificationAsRead, markAllAsRead } = useNotificationCount(userId);
  const flatListRef = useRef<FlatList>(null);
  const scrollPositionRef = useRef(0);
  const isScrollingRef = useRef(false);
  const shouldPreserveScrollRef = useRef(true);
  const isUserScrollingRef = useRef(false);
  const lastScrollYRef = useRef(0);
  const scrollRestoreTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const renderCountRef = useRef(0);

  // Track component renders
  renderCountRef.current += 1;


  useEffect(() => {
    if (visible) {
      fetchNotifications();
    } else {
      // Reset scroll position when modal closes
      scrollPositionRef.current = 0;
      lastScrollYRef.current = 0;
      isScrollingRef.current = false;
      isUserScrollingRef.current = false;
      // Clear any pending scroll restore
      if (scrollRestoreTimeoutRef.current) {
        clearTimeout(scrollRestoreTimeoutRef.current);
        scrollRestoreTimeoutRef.current = null;
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (scrollRestoreTimeoutRef.current) {
        clearTimeout(scrollRestoreTimeoutRef.current);
      }
    };
  }, [visible, userId]);

  // Set up real-time subscription only for new notifications (INSERT events)
  // We handle UPDATE events locally to prevent scroll resets
  useEffect(() => {
    if (!visible || !userId) return;

    const channel = supabase
      .channel(`notifications-realtime-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
     
          
          // Completely block updates while user is scrolling
          if (isUserScrollingRef.current || isScrollingRef.current) {
            return;
          }

          // Only add new notifications if user is at the top (scroll position < 100)
          if (scrollPositionRef.current < 100 && shouldPreserveScrollRef.current) {
            const newNotif = payload.new as Notification;
            setNotifications(prev => {
              // Check if already exists to avoid duplicates
              if (prev.some(n => n.id === newNotif.id)) {
                return prev;
              }
              return [newNotif, ...prev];
            });
          } 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [visible, userId]);

  async function fetchNotifications() {
    try {
      setLoading(true);
      shouldPreserveScrollRef.current = false; // Don't preserve scroll on initial load

      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      // Filter by userId if provided
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      const newNotifications = data || [];
    
      setNotifications(newNotifications);
      shouldPreserveScrollRef.current = true;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Show some mock notifications for demo
      const mockNotifications = [
        {
          id: '1',
          title: 'Domain Expiring Soon',
          message: 'Your domain subscription expires in 7 days',
          type: 'expiry_reminder',
          subscription_id: 'mock-subscription-1',
          read: false,
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'Payment Reminder',
          message: 'GoDaddy subscription payment is due tomorrow',
          type: 'payment_due',
          subscription_id: 'mock-subscription-2',
          read: true,
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ];
      setNotifications(mockNotifications as Notification[]);
      shouldPreserveScrollRef.current = true;
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId: string) {
    if (isUserScrollingRef.current) {
      return;
    }

    const savedScrollY = scrollPositionRef.current;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(prev => {
        return prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        );
      });

      // Restore scroll position after state update
      if (savedScrollY > 0 && flatListRef.current) {
        // Clear any pending restore
        if (scrollRestoreTimeoutRef.current) {
          clearTimeout(scrollRestoreTimeoutRef.current);
        }
        
        // Restore scroll after render completes
        scrollRestoreTimeoutRef.current = setTimeout(() => {
          if (flatListRef.current && savedScrollY > 0) {
            flatListRef.current.scrollToOffset({
              offset: savedScrollY,
              animated: false,
            });
            scrollPositionRef.current = savedScrollY;
          }
        }, 50);
      }
    } catch (error) {
      // Optimistically update UI only if not scrolling
      if (!isUserScrollingRef.current) {
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === notificationId
              ? { ...notification, read: true }
              : notification
          )
        );
        
        // Restore scroll position
        if (savedScrollY > 0 && flatListRef.current) {
          setTimeout(() => {
            if (flatListRef.current && savedScrollY > 0) {
              flatListRef.current.scrollToOffset({
                offset: savedScrollY,
                animated: false,
              });
            }
          }, 50);
        }
      }
    }
  }

  async function handleMarkAllAsRead() {

    const savedScrollY = scrollPositionRef.current;

    try {
      await markAllAsRead();

      // Update local state
      setNotifications(prev => {
        return prev.map(notification => ({ ...notification, read: true }));
      });

      // Restore scroll position after state update
      if (savedScrollY > 0 && flatListRef.current) {
        // Clear any pending restore
        if (scrollRestoreTimeoutRef.current) {
          clearTimeout(scrollRestoreTimeoutRef.current);
        }
        
        // Restore scroll after render completes
        scrollRestoreTimeoutRef.current = setTimeout(() => {
          if (flatListRef.current && savedScrollY > 0) {
            flatListRef.current.scrollToOffset({
              offset: savedScrollY,
              animated: false,
            });
            scrollPositionRef.current = savedScrollY;
          }
        }, 50);
      }
    } catch (error) {
      // Still update UI optimistically if not scrolling
      if (!isUserScrollingRef.current) {
        setNotifications(prev =>
          prev.map(notification => ({ ...notification, read: true }))
        );
        
        // Restore scroll position
        if (savedScrollY > 0 && flatListRef.current) {
          setTimeout(() => {
            if (flatListRef.current && savedScrollY > 0) {
              flatListRef.current.scrollToOffset({
                offset: savedScrollY,
                animated: false,
              });
            }
          }, 50);
        }
      }
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


  const handleNotificationPress = useCallback((notification: Notification) => {
    // Mark as read first using the hook
    markNotificationAsRead(notification.id);
    markAsRead(notification.id);
    
    // If notification has subscription_id, navigate to subscription detail
    if (notification.subscription_id) {
      router.push(`/subscription/${notification.subscription_id}`);
      onClose(); // Close the notification sheet
    }
  }, [markNotificationAsRead, router, onClose, markAsRead]);

  const renderNotification = useCallback(({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, item.read ? styles.read : styles.unread]}
      onPress={() => handleNotificationPress(item)}
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
        {item.subscription_id && (
          <Text style={styles.clickableHint}>Tap to view subscription</Text>
        )}
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  ), [handleNotificationPress]);

  // Content component - inline to avoid recreation issues
  const Content = (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerButtons}>
          {notifications.length > 0 && notifications.some(n => !n.read) && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={handleMarkAllAsRead}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.markAllText}>Mark all as read</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#2c3e50" />
          </TouchableOpacity>
        </View>
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
          ref={flatListRef}
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
          }}
          onScrollBeginDrag={() => {
            console.log('[NotificationBottomSheet] onScrollBeginDrag');
            isScrollingRef.current = true;
            isUserScrollingRef.current = true;
            lastScrollYRef.current = scrollPositionRef.current;
            // Clear any pending scroll restore
            if (scrollRestoreTimeoutRef.current) {
              clearTimeout(scrollRestoreTimeoutRef.current);
              scrollRestoreTimeoutRef.current = null;
            }
          }}
          onScrollEndDrag={(event) => {
            const offsetY = event.nativeEvent.contentOffset.y;
            console.log('[NotificationBottomSheet] onScrollEndDrag', { offsetY });
            scrollPositionRef.current = offsetY;
            lastScrollYRef.current = offsetY;
          }}
          onMomentumScrollBegin={() => {
            console.log('[NotificationBottomSheet] onMomentumScrollBegin');
            isScrollingRef.current = true;
            isUserScrollingRef.current = true;
          }}
          onMomentumScrollEnd={(event) => {
            const offsetY = event.nativeEvent.contentOffset.y;
            console.log('[NotificationBottomSheet] onMomentumScrollEnd', { offsetY });
            scrollPositionRef.current = offsetY;
            lastScrollYRef.current = offsetY;
            // Only allow updates after scroll completely stops
            setTimeout(() => {
              console.log('[NotificationBottomSheet] Scroll timeout expired, allowing updates');
              isScrollingRef.current = false;
              isUserScrollingRef.current = false;
            }, 1000);
          }}
          onScroll={(event) => {
            const offsetY = event.nativeEvent.contentOffset.y;
            scrollPositionRef.current = offsetY;
            lastScrollYRef.current = offsetY;
            // Keep flags true while actively scrolling
            if (offsetY > 0) {
              isUserScrollingRef.current = true;
              isScrollingRef.current = true;
            }
          }}
          scrollEventThrottle={16}
          removeClippedSubviews={false}
          onContentSizeChange={(width, height) => {
            console.log('[NotificationBottomSheet] onContentSizeChange', {
              width,
              height,
              isScrolling: isScrollingRef.current,
              isUserScrolling: isUserScrollingRef.current,
              lastScrollY: lastScrollYRef.current,
            });
            // Restore scroll position when content size changes (after updates)
            if (!isUserScrollingRef.current && !isScrollingRef.current && lastScrollYRef.current > 0 && flatListRef.current) {
              const savedY = lastScrollYRef.current;
              console.log('[NotificationBottomSheet] onContentSizeChange: Scheduling scroll restore', savedY);
              setTimeout(() => {
                if (flatListRef.current && !isUserScrollingRef.current && savedY > 0) {
                  console.log('[NotificationBottomSheet] onContentSizeChange: Restoring scroll', savedY);
                  flatListRef.current.scrollToOffset({
                    offset: savedY,
                    animated: false,
                  });
                }
              }, 10);
            }
          }}
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
            {Content}
          </BlurView>
        ) : (
          <View style={styles.bottomSheet}>
            {Content}
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
    paddingBottom: Platform.OS === 'ios' ? 40 : 90,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    zIndex: 10,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.95)' : '#fff',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(65, 88, 208, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#2c3e50',
  },
  markAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(65, 88, 208, 0.1)',
    borderRadius: 16,
    marginRight: 8,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  markAllText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#4158D0',
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
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#7f8c8d',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 10,
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
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#2c3e50',
    marginBottom: 4,
  },
  unreadTitle: {
    fontFamily: 'Inter-SemiBold',
  },
  message: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#7f8c8d',
    marginBottom: 4,
    lineHeight: 18,
  },
  date: {
    fontSize: 10,
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
  clickableHint: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#3498db',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

// Memoize the component to prevent unnecessary re-renders
// Only re-render if visible, onClose, or userId changes
export default memo(NotificationBottomSheet, (prevProps, nextProps) => {
  // Only re-render if these props change
  return (
    prevProps.visible === nextProps.visible &&
    prevProps.userId === nextProps.userId &&
    prevProps.onClose === nextProps.onClose
  );
});
