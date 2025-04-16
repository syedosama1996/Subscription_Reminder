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

  // If the trigger date is in the past, don't schedule the notification
  if (triggerDate < new Date()) {
    return; // Don't schedule notifications for past dates
  }

  // Ensure daysBefore is non-negative for the message
  const displayDays = Math.max(0, daysBefore);
  const title = displayDays === 0 ? 'Subscription Expiring Today' : 'Subscription Expiring Soon';
  const body = displayDays === 0 
    ? `Your subscription "${subscriptionName}" expires today. Please renew it.`
    : `Your subscription "${subscriptionName}" will expire in ${displayDays} ${displayDays === 1 ? 'day' : 'days'}. Please renew it.`;

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { 
          subscriptionId,
          subscriptionName, 
          expiryDate: expiryDate.toISOString(),
          type: 'expiry_reminder',
          daysBefore 
        },
        sound: 'default', // Ensure sound plays
      },
      trigger: {
        channelId: 'default', // Ensure it uses the created channel on Android
        date: triggerDate,
      } as Notifications.DateTriggerInput, // Use DateTriggerInput type
    });
    
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
    // Cancel any existing notifications for this subscription first
    await cancelExistingReminders(subscription.id);

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

    // Fetch user-defined reminders for this subscription
    const { data: reminders, error: reminderError } = await getRemindersForSubscription(subscription.id);

    if (reminderError) {
      console.error(`Error fetching reminders for subscription "${subscription.service_name}":`, reminderError);
      // Decide if you want to throw the error or just log and continue
      return; // Exiting for this subscription if reminders can't be fetched
    }

    if (!reminders || reminders.length === 0) {
      // Optionally schedule a default reminder here if desired
      // e.g., await scheduleExpiryNotification(subscription.service_name, expiryDate, 1); // 1 day before default
      return;
    }


    // Schedule notifications based on fetched reminders
    for (const reminder of reminders) {
      if (reminder.enabled) {
        try {
          // Pass subscription ID to data payload for easier cancellation
          await scheduleExpiryNotification(
            subscription.service_name, 
            expiryDate, 
            reminder.days_before,
            subscription.id // Pass subscription ID here
          );
        } catch (scheduleError) {
          console.error(`Failed to schedule reminder (${reminder.days_before} days) for subscription "${subscription.service_name}":`, scheduleError);
          // Continue trying to schedule other reminders
        }
      } else {
         console.log(`Reminder ${reminder.days_before} days before expiry is disabled for "${subscription.service_name}"`);
      }
    }
    
  } catch (error) {
    console.error(`Error in setupExpiryReminders for subscription "${subscription.service_name}":`, error);
    // Potentially re-throw or handle more gracefully
     throw error; // Re-throwing for now, setupAllExpiryReminders should handle it
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

  // Clean up old notifications first
  await cleanupOldNotifications();

  // Sort subscriptions by expiry date (soonest first)
  const sortedSubscriptions = [...subscriptions].sort((a, b) => {
    const dateA = new Date(a.expiry_date);
    const dateB = new Date(b.expiry_date);
    // Handle invalid dates if necessary
     if (isNaN(dateA.getTime())) return 1;
     if (isNaN(dateB.getTime())) return -1;
    return dateA.getTime() - dateB.getTime();
  });

  // Process subscriptions in batches to avoid overwhelming the system
  const batchSize = 5; // Increased batch size slightly, monitor performance
  let successCount = 0;
  let failureCount = 0;
  
  for (let i = 0; i < sortedSubscriptions.length; i += batchSize) {
    const batch = sortedSubscriptions.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (subscription) => {
       // Basic check for essential properties
       if (!subscription || !subscription.id || !subscription.service_name || !subscription.expiry_date) {
         console.warn("Skipping subscription due to missing essential data:", subscription);
         failureCount++;
         return; // Skip this subscription
       }
      try {
        await setupExpiryReminders(subscription);
        successCount++;
      } catch (error) {
        // Error is already logged in setupExpiryReminders
        console.error(`----> Failed setup for subscription ${subscription.service_name} (ID: ${subscription.id}) in batch.`);
        failureCount++;
        // Continue with next subscription even if one fails
      }
    });

    // Wait for the current batch to complete
    await Promise.all(batchPromises);

    // Add a small delay between batches if needed, e.g., to avoid rate limits
     if (i + batchSize < sortedSubscriptions.length) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
     }
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