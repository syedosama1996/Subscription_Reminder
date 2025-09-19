import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import Toast from 'react-native-toast-message';
import { getRemindersForSubscription } from './subscriptions';
import { Reminder } from './types';

interface Subscription {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
}

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  // In development, return a mock token
  if (__DEV__) {
    return 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';
  }

  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      // console.log('Failed to get push token for push notification!');
      return;
    }
    try {
      const expoPushToken = await Notifications.getExpoPushTokenAsync({
        projectId: 'a6b04bbf-baa0-4b2e-9abd-1beb06b3609e',
      });
      token = expoPushToken.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return;
    }
  } else {
    console.log('Must use physical device for Push Notifications');
    return;
  }

  return token;
}

export async function scheduleNotification(title: string, body: string, data: any = {}) {
  // Show toast notification
  Toast.show({
    type: 'info',
    text1: title,
    text2: body,
    position: 'top',
    visibilityTime: 4000,
    autoHide: true,
    topOffset: 50,
  });

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
    },
    trigger: null, // Send immediately
  });
}

// Create notification record in database
export async function createNotificationRecord(
  title: string, 
  message: string, 
  type: 'expiry_reminder' | 'payment_due' | 'general' = 'general',
  subscriptionId?: string,
  userId?: string
) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        title,
        message,
        type,
        subscription_id: subscriptionId,
        user_id: userId,
        read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating notification record:', error);
    throw error;
  }
}

export async function scheduleExpiryNotification(
  subscriptionName: string,
  expiryDate: Date,
  daysBefore: number,
  subscriptionId: string
) {
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Modified validation to handle immediate notifications
  if (daysUntilExpiry <= 0) return null; // Only skip if already expired
  if (daysBefore < 0) return null; // Only skip if days before is negative

  // For very soon expiring subscriptions, use actual days until expiry
  const effectiveDaysBefore = Math.min(daysBefore, daysUntilExpiry);

  // Calculate trigger date
  const triggerDate = new Date(expiryDate);
  triggerDate.setDate(triggerDate.getDate() - effectiveDaysBefore);

  // If trigger would be in the past, set to 1 minute from now
  if (triggerDate < now) {
    triggerDate.setTime(now.getTime() + 60000);
  }

  const notificationId = `${subscriptionId}_${effectiveDaysBefore}days`;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: {
        title: 'Subscription Expiring Soon',
        body: `Your subscription "${subscriptionName}" will expire in ${effectiveDaysBefore} ${effectiveDaysBefore === 1 ? 'day' : 'days'}. Please renew it.`,
        data: { 
          subscriptionId,
          subscriptionName, 
          expiryDate: expiryDate.toISOString(),
          type: 'expiry_reminder',
          daysBefore: effectiveDaysBefore,
          notificationId
        },
        sound: 'default',
      },
      trigger: {
        channelId: 'default',
        date: triggerDate,
      } as Notifications.DateTriggerInput,
    });
    
    return notificationId;
  } catch (error) {
    console.error(`Error scheduling notification for "${subscriptionName}":`, error);
    throw error;
  }
}

// Get count of currently scheduled notifications
async function getScheduledNotificationCount(): Promise<number> {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    return scheduledNotifications.length;
  } catch (error) {
    console.error('Error getting scheduled notification count:', error);
    return 0;
  }
}

// Clean up old notifications
async function cleanupOldNotifications() {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const now = new Date();
    
    for (const notification of scheduledNotifications) {
      const trigger = notification.trigger as any;
      if (trigger && trigger.date) {
        const triggerDate = new Date(trigger.date);
        if (triggerDate < now) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old notifications:', error);
  }
}

// Schedule notifications for subscription based on reminders
export async function setupExpiryReminders(subscription: any) {
  try {
    const now = new Date();
    const expiryDate = new Date(subscription.expiry_date);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Skip if subscription is inactive or expired
    if (!subscription.is_active || daysUntilExpiry <= 0) {
      console.log(`Skipping ${subscription.service_name}: ${!subscription.is_active ? 'Inactive' : 'Expired'}`);
      return;
    }

    // Skip if expiry date is invalid
    if (isNaN(expiryDate.getTime())) {
      console.error(`Invalid expiry date for subscription "${subscription.service_name}"`);
      return;
    }

    // Skip if expiry is more than 30 days away
    if (daysUntilExpiry > 30) {
      console.log(`Skipping ${subscription.service_name}: Too far in future (${daysUntilExpiry} days)`);
      return;
    }

    const { data: reminders, error: reminderError } = await getRemindersForSubscription(subscription.id);
    if (reminderError || !reminders || reminders.length === 0) {
      console.log(`Skipping ${subscription.service_name}: No valid reminders`);
      return;
    }

    // Only process enabled reminders that are relevant for the current expiry timeframe
    const relevantReminders = reminders
      .filter(r => r.enabled && r.days_before >= 0 && r.days_before <= daysUntilExpiry)
      .sort((a, b) => b.days_before - a.days_before);

    if (relevantReminders.length === 0) {
      console.log(`Skipping ${subscription.service_name}: No relevant reminders for timeframe`);
      return;
    }

    console.log(`Processing ${subscription.service_name}:`);
    console.log(`- Days until expiry: ${daysUntilExpiry}`);
    console.log(`- Relevant reminders: ${relevantReminders.map(r => r.days_before).join(', ')} days`);

    const scheduledDays = new Set();

    for (const reminder of relevantReminders) {
      // Skip if reminder is for more days than we have until expiry
      if (reminder.days_before > daysUntilExpiry) {
        console.log(`- Skipping ${reminder.days_before} day reminder: Too far for current expiry`);
        continue;
      }

      // Skip if we've already scheduled this interval
      if (scheduledDays.has(reminder.days_before)) {
        console.log(`- Skipping ${reminder.days_before} day reminder: Already scheduled`);
        continue;
      }

      try {
        const notificationId = await scheduleExpiryNotification(
          subscription.service_name,
          expiryDate,
          reminder.days_before,
          subscription.id
        );
        if (notificationId) {
          scheduledDays.add(reminder.days_before);
          console.log(`- Scheduled ${reminder.days_before} day reminder`);
        }
      } catch (error) {
        console.error(`- Failed to schedule ${reminder.days_before} day reminder:`, error);
      }
    }

    if (scheduledDays.size > 0) {
      console.log(`Completed ${subscription.service_name}: Scheduled ${scheduledDays.size} reminders`);
    } else {
      console.log(`Completed ${subscription.service_name}: No reminders scheduled`);
    }
  } catch (error) {
    console.error(`Error in setupExpiryReminders for "${subscription.service_name}"`, error);
    throw error;
  }
}

// Update cancelExistingReminders to reliably use subscriptionId from data
async function cancelExistingReminders(subscriptionId: string) {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    let cancelCount = 0;
    
    for (const notification of scheduledNotifications) {
      // Check if the data payload exists and contains the matching subscriptionId
      if (notification.content?.data?.subscriptionId === subscriptionId) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        cancelCount++;
      }
      // Optional: Keep the old check as a fallback, but data.subscriptionId should be primary
      // else if (
      //   notification.content?.data?.type === 'expiry_reminder' && 
      //   notification.content?.data?.subscriptionName === subscriptionId // This check seems wrong - subscriptionName vs subscriptionId
      // ) {
      //    console.log(`Cancelling existing notification ${notification.identifier} based on name match for subscription ${subscriptionId}`);
      //   await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      //    cancelCount++;
      // }
    }
  } catch (error) {
    console.error(`Error canceling existing reminders for subscription ${subscriptionId}:`, error);
     // Decide if this error should halt the process or just be logged
  }
}

// Check all subscriptions and set up reminders
export async function setupAllExpiryReminders(subscriptions: any[]) {
  if (!subscriptions || subscriptions.length === 0) {
    return;
  }

  try {
    const now = new Date();
    
    // First, cancel ALL existing notifications
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduledNotifications) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      } catch (error) {
        console.error('Failed to cancel notification:', error);
      }
    }

    // Filter subscriptions that are active and expiring within 30 days
    const relevantSubscriptions = subscriptions.filter(sub => {
      if (!sub || !sub.is_active) return false;
      
      const expiryDate = new Date(sub.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
    });

    
    // Process each relevant subscription
    for (const subscription of relevantSubscriptions) {
      const expiryDate = new Date(subscription.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`\nProcessing ${subscription.service_name}:`);
      console.log(`- Days until expiry: ${daysUntilExpiry}`);

      // Get reminders for this subscription
      const { data: reminders, error: reminderError } = await getRemindersForSubscription(subscription.id);
      
      // Create default reminder if no valid reminders exist
      if (reminderError || !reminders || reminders.length === 0) {
        console.log(`- No custom reminders found, using default reminder`);
        try {
          // For subscriptions expiring very soon, use the actual days until expiry
          const defaultDaysBefore = Math.max(daysUntilExpiry, 1); // Ensure at least 1 day
          const notificationId = await scheduleExpiryNotification(
            subscription.service_name,
            expiryDate,
            defaultDaysBefore,
            subscription.id
          );
          if (notificationId) {
          }
        } catch (error) {
          console.error(`  - Failed to schedule default reminder:`, error);
        }
        continue;
      }

      // Filter for enabled reminders that make sense for the remaining time
      const validReminders = reminders
        .filter(r => r.enabled && r.days_before > 0 && r.days_before <= daysUntilExpiry)
        .sort((a, b) => b.days_before - a.days_before);

      if (validReminders.length === 0) {
        console.log(`- Skipping: No valid reminders for current timeframe`);
        continue;
      }

      console.log(`- Valid reminders: ${validReminders.map(r => r.days_before).join(', ')} days`);
      
      // Schedule notifications for valid reminders
      for (const reminder of validReminders) {
        try {
          const notificationId = await scheduleExpiryNotification(
            subscription.service_name,
            expiryDate,
            reminder.days_before,
            subscription.id
          );
          if (notificationId) {
            console.log(`  - Scheduled ${reminder.days_before} day reminder`);
          }
        } catch (error) {
          console.error(`  - Failed to schedule ${reminder.days_before} day reminder:`, error);
        }
      }
    }

    // Verify final notifications
    const finalNotifications = await Notifications.getAllScheduledNotificationsAsync();
    finalNotifications.forEach(notification => {
      const data = notification.content?.data;
      if (data?.type === 'expiry_reminder') {
      }
    });

  } catch (error) {
    console.error('Fatal error in setupAllExpiryReminders:', error);
    throw error;
  }
}

// Listen for subscription changes from Supabase
export function setupSubscriptionNotifications() {
  const subscription = supabase
    .channel('subscription-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'subscriptions',
      },
      async (payload) => {
        const { new: newRecord, old: oldRecord, eventType } = payload;
        const newSubscription = newRecord as Subscription;
        const oldSubscription = oldRecord as Subscription;
        
        let title = '';
        let message = '';

        switch (eventType) {
          case 'INSERT':
            title = 'New Subscription Added';
            message = `${newSubscription.name} has been added to your subscriptions`;
            break;
          case 'UPDATE':
            if (newSubscription.status !== oldSubscription.status) {
              title = `Subscription ${newSubscription.status === 'active' ? 'Activated' : 'Deactivated'}`;
              message = `${newSubscription.name} has been ${newSubscription.status === 'active' ? 'activated' : 'deactivated'}`;
            }
            break;
          case 'DELETE':
            title = 'Subscription Removed';
            message = `${oldSubscription.name} has been removed from your subscriptions`;
            break;
        }

        if (title && message) {
          await scheduleNotification(title, message, { subscriptionId: newSubscription?.id || oldSubscription?.id });
        }
      }
    )
    .subscribe();

  return subscription;
}

// Listen for notification changes from Supabase
export function setupNotificationListener() {
  const subscription = supabase
    .channel('notification-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
      },
      async (payload) => {
        const { new: notification } = payload;
        const newNotification = notification as Notification;
        if (newNotification && !newNotification.read) {
          await scheduleNotification(newNotification.title, newNotification.message, {
            notificationId: newNotification.id,
          });
        }
      }
    )
    .subscribe();

  return subscription;
} 