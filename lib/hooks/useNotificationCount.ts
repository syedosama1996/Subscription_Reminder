import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase';

export function useNotificationCount(userId?: string) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<any>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!userId) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread notification count:', error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    fetchUnreadCount();

    // Set up real-time subscription for notification changes
    // Use a unique channel name per user to avoid conflicts
    const channelName = `notification-count-${userId}-${Date.now()}`;
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[NotificationCount] INSERT event received:', payload);
          // Refetch count when new notification is inserted
          fetchUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[NotificationCount] UPDATE event received:', payload);
          // Refetch count when notification is updated (e.g., marked as read)
          fetchUnreadCount();
        }
      )
      .subscribe((status) => {
        console.log('[NotificationCount] Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[NotificationCount] Successfully subscribed to notification changes');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error('[NotificationCount] Channel subscription error:', status);
        }
      });

    subscriptionRef.current = subscription;

    return () => {
      console.log('[NotificationCount] Unsubscribing from notification changes');
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [userId, fetchUnreadCount]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      
      // Update local count immediately
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Also refetch to ensure count is accurate (handles race conditions)
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Still try to refresh count even if update fails
      await fetchUnreadCount();
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      
      // Immediately update local count to 0
      setUnreadCount(0);
      
      // Also refetch to ensure count is accurate (in case of race conditions)
      await fetchUnreadCount();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      // Still try to refresh count even if update fails
      await fetchUnreadCount();
    }
  };

  return {
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refreshCount: fetchUnreadCount,
  };
}
