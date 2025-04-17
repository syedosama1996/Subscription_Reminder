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

export async function scheduleExpiryNotification(
  subscriptionName: string,
  expiryDate: Date,
  daysBefore: number,
  subscriptionId: string
) {
  const triggerDate = new Date(expiryDate);
  triggerDate.setDate(triggerDate.getDate() - daysBefore);

  // Add logging here
  console.log(`[scheduleExpiryNotification] Scheduling for: ${subscriptionName} (ID: ${subscriptionId})`);
  console.log(`  - Expiry Date: ${expiryDate.toISOString()}`);
  console.log(`  - Days Before: ${daysBefore}`);
  console.log(`  - Calculated Trigger Date: ${triggerDate.toISOString()}`);

  // If the trigger date is in the past, don't schedule the notification
  if (triggerDate < new Date()) {
    console.log(`  - Trigger date is in the past. Skipping.`);
    return; // Don't schedule notifications for past dates
  }

  // Create a unique identifier for this notification
  const notificationId = `${subscriptionId}_${daysBefore}days`;

  // Check if this exact notification is already scheduled
  const existingNotifications = await Notifications.getAllScheduledNotificationsAsync();
  const alreadyScheduled = existingNotifications.some(notification => 
    notification.identifier === notificationId ||
    (notification.content?.data?.subscriptionId === subscriptionId &&
     notification.content?.data?.daysBefore === daysBefore)
  );

  if (alreadyScheduled) {
    console.log(`  - Notification already scheduled for ${subscriptionName} (${daysBefore} days). Skipping.`);
    return;
  }

  // Ensure daysBefore is non-negative for the message
  const displayDays = Math.max(0, daysBefore);
  const title = displayDays === 0 ? 'Subscription Expiring Today' : 'Subscription Expiring Soon';
  const body = displayDays === 0 
    ? `Your subscription "${subscriptionName}" expires today. Please renew it.`
    : `Your subscription "${subscriptionName}" will expire in ${displayDays} ${displayDays === 1 ? 'day' : 'days'}. Please renew it.`;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: {
        title,
        body,
        data: { 
          subscriptionId,
          subscriptionName, 
          expiryDate: expiryDate.toISOString(),
          type: 'expiry_reminder',
          daysBefore,
          notificationId // Include the ID in the data for reference
        },
        sound: 'default', // Ensure sound plays
      },
      trigger: {
        channelId: 'default', // Ensure it uses the created channel on Android
        date: triggerDate,
      } as Notifications.DateTriggerInput, // Use DateTriggerInput type
    });
    
    console.log(`  - Successfully scheduled notification with ID: ${notificationId}`);
    return notificationId;
  } catch (error) {
    console.error(`Error scheduling expiry notification for "${subscriptionName}":`, error);
    // Log more details about the error if possible
    if (error instanceof Error) {
        console.error("Error details:", error.message, error.stack);
    }
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
        // Remove notifications that are more than 30 days old
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
    if (!subscription.is_active) {
      return;
    }
    
    const expiryDate = new Date(subscription.expiry_date);
    const now = new Date();

    // Optional: Check if expiry date is valid
    if (isNaN(expiryDate.getTime())) {
      console.error(`Invalid expiry date for subscription "${subscription.service_name}". Skipping reminder setup.`);
      return;
    }

    // Only setup reminders if the expiry date is within a reasonable future window (e.g., 60 days)
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(now.getDate() + 60);

    if (expiryDate > sixtyDaysFromNow) {
      console.log(`[setupExpiryReminders] Skipping "${subscription.service_name}" - expiry date (${expiryDate.toISOString()}) is too far in the future.`);
      return;
    }

    // Fetch user-defined reminders for this subscription
    const { data: reminders, error: reminderError } = await getRemindersForSubscription(subscription.id);

    if (reminderError) {
      console.error(`Error fetching reminders for subscription "${subscription.service_name}":`, reminderError);
      return;
    }

    if (!reminders || reminders.length === 0) {
      return;
    }

    // Sort reminders by days_before in descending order (furthest reminder first)
    const sortedReminders = [...reminders].sort((a, b) => b.days_before - a.days_before);

    // Get all currently scheduled notifications for this subscription
    const existingNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const subscriptionNotifications = existingNotifications.filter(
      notification => notification.content?.data?.subscriptionId === subscription.id
    );

    console.log(`[setupExpiryReminders] Found ${subscriptionNotifications.length} existing notifications for "${subscription.service_name}"`);

    // Track which days we've already scheduled
    const scheduledDays = new Set();

    // Schedule notifications based on sorted reminders
    for (const reminder of sortedReminders) {
      if (!reminder.enabled) {
        console.log(`Reminder ${reminder.days_before} days before expiry is disabled for "${subscription.service_name}"`);
        continue;
      }

      // Calculate trigger date for this reminder
      const triggerDate = new Date(expiryDate);
      triggerDate.setDate(triggerDate.getDate() - reminder.days_before);

      // Skip if trigger date is in the past
      if (triggerDate < now) {
        console.log(`Skipping ${reminder.days_before} day reminder for "${subscription.service_name}" - trigger date is in the past`);
        continue;
      }

      // Skip if we've already scheduled a notification for this number of days
      if (scheduledDays.has(reminder.days_before)) {
        console.log(`Skipping duplicate ${reminder.days_before} day reminder for "${subscription.service_name}"`);
        continue;
      }

      try {
        await scheduleExpiryNotification(
          subscription.service_name,
          expiryDate,
          reminder.days_before,
          subscription.id
        );
        scheduledDays.add(reminder.days_before);
      } catch (scheduleError) {
        console.error(`Failed to schedule reminder (${reminder.days_before} days) for "${subscription.service_name}":`, scheduleError);
      }
    }

    console.log(`[setupExpiryReminders] Completed setup for "${subscription.service_name}" - Scheduled ${scheduledDays.size} reminders`);
  } catch (error) {
    console.error(`Error in setupExpiryReminders for "${subscription.service_name}":`, error);
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
    console.log("[setupAllExpiryReminders] Starting cleanup of existing notifications...");
    
    // Get all currently scheduled notifications
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`[setupAllExpiryReminders] Found ${scheduledNotifications.length} total notifications`);
    
    // Cancel all existing expiry reminders
    let cancelCount = 0;
    for (const notification of scheduledNotifications) {
      try {
        if (notification.content?.data?.type === 'expiry_reminder') {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
          cancelCount++;
          console.log(`  - Cancelled notification: ${notification.content?.data?.subscriptionName} (${notification.content?.data?.daysBefore} days)`);
        }
      } catch (cancelError) {
        console.error(`  - Failed to cancel notification ${notification.identifier}:`, cancelError);
      }
    }
    console.log(`[setupAllExpiryReminders] Cancelled ${cancelCount} existing reminders`);

    // Sort subscriptions by expiry date (soonest first)
    const sortedSubscriptions = [...subscriptions].sort((a, b) => {
      const dateA = new Date(a.expiry_date);
      const dateB = new Date(b.expiry_date);
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      return dateA.getTime() - dateB.getTime();
    });

    console.log(`[setupAllExpiryReminders] Processing ${sortedSubscriptions.length} subscriptions...`);
    
    // Process subscriptions in batches to avoid overwhelming the system
    const batchSize = 3; // Reduced batch size for better control
    let successCount = 0;
    let failureCount = 0;
    
    for (let i = 0; i < sortedSubscriptions.length; i += batchSize) {
      const batch = sortedSubscriptions.slice(i, i + batchSize);
      console.log(`[setupAllExpiryReminders] Processing batch ${Math.floor(i/batchSize) + 1}...`);
      
      const batchPromises = batch.map(async (subscription) => {
        if (!subscription || !subscription.id || !subscription.service_name || !subscription.expiry_date) {
          console.warn("Skipping subscription due to missing essential data:", subscription);
          failureCount++;
          return;
        }
        try {
          await setupExpiryReminders(subscription);
          successCount++;
        } catch (error) {
          console.error(`Failed setup for subscription ${subscription.service_name} (ID: ${subscription.id}) in batch:`, error);
          failureCount++;
        }
      });

      // Wait for the current batch to complete
      await Promise.all(batchPromises);

      // Add a delay between batches
      if (i + batchSize < sortedSubscriptions.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Increased delay to 1 second
      }
    }

    console.log(`[setupAllExpiryReminders] Complete. Success: ${successCount}, Failures: ${failureCount}`);
  } catch (error) {
    console.error('[setupAllExpiryReminders] Fatal error:', error);
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