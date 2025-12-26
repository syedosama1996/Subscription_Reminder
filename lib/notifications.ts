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
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    
    // For subscription reminders, check if notification was already shown today
    if (data?.subscriptionId && (data?.type === 'expiry_reminder' || data?.type === 'payment_due')) {
      try {
        const now = new Date();
        const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const startOfTodayISO = startOfToday.toISOString();

        // Check if a notification for this subscription was already created today
        const { data: todayNotifications } = await supabase
          .from('notifications')
          .select('id')
          .eq('subscription_id', data.subscriptionId)
          .eq('type', data.type)
          .gte('created_at', startOfTodayISO)
          .limit(1);

        // If notification was already shown today, don't show it again
        if (todayNotifications && todayNotifications.length > 0) {
          console.log(`Notification already shown today for subscription ${data.subscriptionId}. Suppressing duplicate.`);
          return {
            shouldShowAlert: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
          };
        }

        // If not shown today, create notification record in database
        // Get userId from subscription if available, otherwise skip user_id
        let userId: string | undefined;
        if (data.subscriptionId) {
          try {
            const { data: subData } = await supabase
              .from('subscriptions')
              .select('user_id')
              .eq('id', data.subscriptionId)
              .single();
            userId = subData?.user_id;
          } catch (error) {
            console.error('Error fetching user_id for notification:', error);
          }
        }

        // Create notification record (this will also check for duplicates)
        try {
          await createNotificationRecord(
            notification.request.content.title || 'Subscription Reminder',
            notification.request.content.body || '',
            data.type,
            data.subscriptionId,
            userId,
            true // Skip today check since we already checked above
          );
        } catch (error) {
          console.error('Error creating notification record in handler:', error);
          // Continue to show notification even if record creation fails
        }
      } catch (error) {
        console.error('Error checking today notifications in handler:', error);
        // If error, allow notification to show
      }
    }

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
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

// Helper function to check if notification was already shown today for a subscription
async function wasNotificationShownToday(
  subscriptionId: string | undefined,
  userId: string | undefined,
  type: 'expiry_reminder' | 'payment_due' | 'general'
): Promise<boolean> {
  if (!subscriptionId || !userId) {
    return false; // For general notifications without subscription, allow
  }

  try {
    // Get start of today in UTC
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfTodayISO = startOfToday.toISOString();

    // Check if a notification for this subscription was already created today
    const { data: todayNotifications, error } = await supabase
      .from('notifications')
      .select('id')
      .eq('subscription_id', subscriptionId)
      .eq('user_id', userId)
      .eq('type', type)
      .gte('created_at', startOfTodayISO)
      .limit(1);

    if (error) {
      console.error('Error checking today notifications:', error);
      return false; // If error, allow notification to be created
    }

    return todayNotifications && todayNotifications.length > 0;
  } catch (error) {
    console.error('Error in wasNotificationShownToday:', error);
    return false; // If error, allow notification to be created
  }
}

// Create notification record in database
export async function createNotificationRecord(
  title: string, 
  message: string, 
  type: 'expiry_reminder' | 'payment_due' | 'general' = 'general',
  subscriptionId?: string,
  userId?: string,
  skipTodayCheck: boolean = false // Allow bypassing today check for special cases
) {
  try {
    // For subscription reminders (expiry_reminder and payment_due), check if already shown today
    if (!skipTodayCheck && (type === 'expiry_reminder' || type === 'payment_due')) {
      const alreadyShownToday = await wasNotificationShownToday(subscriptionId, userId, type);
      if (alreadyShownToday) {
        console.log(`Notification already shown today for subscription ${subscriptionId} (${type}). Skipping.`);
        return null;
      }
    }

    // Also check for duplicate notifications within the last 5 seconds (quick duplicate prevention)
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    const { data: recentNotifications } = await supabase
      .from('notifications')
      .select('id')
      .eq('title', title)
      .eq('message', message)
      .eq('subscription_id', subscriptionId || null)
      .eq('user_id', userId || null)
      .gte('created_at', fiveSecondsAgo)
      .limit(1);

    // If duplicate found, don't create another notification
    if (recentNotifications && recentNotifications.length > 0) {
      console.log('Duplicate notification prevented (within 5 seconds):', title);
      return null;
    }

    // Create notification record
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

    // Schedule the notification to show
    await scheduleNotification(title, message, { 
      subscriptionId,
      notificationId: data.id 
    });

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
    let relevantReminders = reminders
      .filter(r => r.enabled && r.days_before >= 0 && r.days_before <= daysUntilExpiry)
      .sort((a, b) => b.days_before - a.days_before);

    // If no reminders match, use closest future reminder or create default
    if (relevantReminders.length === 0) {
      // Find the closest reminder that's greater than daysUntilExpiry
      const futureReminders = reminders
        .filter(r => r.enabled && r.days_before > daysUntilExpiry)
        .sort((a, b) => a.days_before - b.days_before);
      
      if (futureReminders.length > 0) {
        // Use the closest future reminder, but schedule it for the actual days until expiry
        console.log(`${subscription.service_name}: No reminders match timeframe (${daysUntilExpiry} days), using closest reminder (${futureReminders[0].days_before} days) but scheduling for ${daysUntilExpiry} days`);
        try {
          const notificationId = await scheduleExpiryNotification(
            subscription.service_name,
            expiryDate,
            daysUntilExpiry,
            subscription.id
          );
          if (notificationId) {
            console.log(`- Scheduled reminder for ${daysUntilExpiry} days`);
          }
        } catch (error) {
          console.error(`- Failed to schedule reminder:`, error);
        }
      } else {
        // No reminders at all, create a default reminder
        console.log(`${subscription.service_name}: No reminders found, creating default reminder for ${daysUntilExpiry} days`);
        try {
          const defaultDaysBefore = Math.max(daysUntilExpiry, 1);
          const notificationId = await scheduleExpiryNotification(
            subscription.service_name,
            expiryDate,
            defaultDaysBefore,
            subscription.id
          );
          if (notificationId) {
            console.log(`- Scheduled default reminder for ${defaultDaysBefore} days`);
          }
        } catch (error) {
          console.error(`- Failed to schedule default reminder:`, error);
        }
      }
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
          
          // Also send email reminder if it matches today's days until expiry
          const now = new Date();
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilExpiry === reminder.days_before) {
            try {
              // Get user email
              const { data: userProfile } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', subscription.user_id)
                .single();

              if (userProfile?.email) {
                const { sendSubscriptionExpiryReminderEmail } = await import('./email');
                await sendSubscriptionExpiryReminderEmail(
                  userProfile.email,
                  subscription,
                  reminder.days_before
                );
              }
            } catch (emailError) {
              // Don't fail notification scheduling if email fails
              console.error('Error sending expiry reminder email:', emailError);
            }
          }
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
      let validReminders = reminders
        .filter(r => r.enabled && r.days_before > 0 && r.days_before <= daysUntilExpiry)
        .sort((a, b) => b.days_before - a.days_before);

      // If no reminders match the timeframe, use the closest reminder or create a default
      if (validReminders.length === 0) {
        // Find the closest reminder that's greater than daysUntilExpiry
        const futureReminders = reminders
          .filter(r => r.enabled && r.days_before > daysUntilExpiry)
          .sort((a, b) => a.days_before - b.days_before);
        
        if (futureReminders.length > 0) {
          // Use the closest future reminder, but schedule it for the actual days until expiry
          console.log(`- No reminders match timeframe (${daysUntilExpiry} days), using closest reminder (${futureReminders[0].days_before} days) but scheduling for ${daysUntilExpiry} days`);
          try {
            const notificationId = await scheduleExpiryNotification(
              subscription.service_name,
              expiryDate,
              daysUntilExpiry,
              subscription.id
            );
            if (notificationId) {
              console.log(`  - Scheduled reminder for ${daysUntilExpiry} days`);
            }
          } catch (error) {
            console.error(`  - Failed to schedule reminder:`, error);
          }
        } else {
          // No reminders at all, create a default reminder
          console.log(`- No reminders found, creating default reminder for ${daysUntilExpiry} days`);
          try {
            const defaultDaysBefore = Math.max(daysUntilExpiry, 1);
            const notificationId = await scheduleExpiryNotification(
              subscription.service_name,
              expiryDate,
              defaultDaysBefore,
              subscription.id
            );
            if (notificationId) {
              console.log(`  - Scheduled default reminder for ${defaultDaysBefore} days`);
            }
          } catch (error) {
            console.error(`  - Failed to schedule default reminder:`, error);
          }
        }
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
export function setupSubscriptionNotifications(userId?: string) {
  if (!userId) {
    console.warn('setupSubscriptionNotifications called without userId - notifications disabled');
    return null;
  }

  const subscription = supabase
    .channel(`subscription-changes-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'subscriptions',
        filter: `user_id=eq.${userId}`,
      },
      async (payload) => {
        const { new: newRecord, old: oldRecord, eventType } = payload;
        const newSubscription = newRecord as Subscription;
        const oldSubscription = oldRecord as Subscription;

        if (eventType === 'DELETE' && oldSubscription) {
          if ((oldSubscription as any).user_id !== userId) {
            console.warn('Notification blocked: user_id mismatch', {
              oldUserId: (oldSubscription as any).user_id,
              currentUserId: userId
            });
            return;
          }

          const serviceName = (oldSubscription as any).service_name || 'A subscription';
          const title = 'Subscription Removed';
          const message = `${serviceName} has been removed from your subscriptions`;
          
          await createNotificationRecord(
            title,
            message,
            'general',
            oldSubscription.id,
            userId
          ).catch(err => {
            console.error('Error creating delete notification:', err);
          });
        }
      }
    )
    .subscribe();

  return subscription;
}

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
        console.log('Notification change detected:', payload);
      }
    )
    .subscribe();

  return subscription;
}

// Schedule recurring payment notification
export async function scheduleRecurringPaymentNotification(
  subscriptionName: string,
  paymentDate: Date,
  daysBefore: number,
  subscriptionId: string,
  bankName: string | null,
  cardHolderName: string | null
) {
  const now = new Date();
  const daysUntilPayment = Math.ceil((paymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Skip if payment date is in the past
  if (daysUntilPayment <= 0) return null;
  if (daysBefore < 0) return null;

  // For very soon payments, use actual days until payment
  const effectiveDaysBefore = Math.min(daysBefore, daysUntilPayment);

  // Calculate trigger date
  const triggerDate = new Date(paymentDate);
  triggerDate.setDate(triggerDate.getDate() - effectiveDaysBefore);

  // If trigger would be in the past, set to 1 minute from now
  if (triggerDate < now) {
    triggerDate.setTime(now.getTime() + 60000);
  }

  const notificationId = `${subscriptionId}_recurring_${effectiveDaysBefore}days`;

  // Build notification message with card details
  let message = `Payment for "${subscriptionName}" will be automatically charged`;
  if (bankName && cardHolderName) {
    message += ` from ${bankName} (${cardHolderName})`;
  } else if (bankName) {
    message += ` from ${bankName}`;
  } else if (cardHolderName) {
    message += ` (${cardHolderName})`;
  }
  message += ` on ${paymentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: {
        title: 'Recurring Payment Reminder',
        body: message,
        data: { 
          subscriptionId,
          subscriptionName, 
          paymentDate: paymentDate.toISOString(),
          type: 'payment_due',
          daysBefore: effectiveDaysBefore,
          notificationId,
          bankName,
          cardHolderName
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
    console.error(`Error scheduling recurring payment notification for "${subscriptionName}":`, error);
    throw error;
  }
}

// Setup recurring payment reminders for a subscription
export async function setupRecurringPaymentReminders(subscription: any) {
  try {
    // Only process if auto_renewal is true and payment_type is recurring
    if (!subscription.auto_renewal || subscription.payment_type !== 'recurring') {
      return;
    }

    // Need bank name and card info for the notification
    if (!subscription.bank_name || !subscription.card_holder_name) {
      console.log(`Skipping ${subscription.service_name}: Missing card information for recurring payment`);
      return;
    }

    const now = new Date();
    const expiryDate = new Date(subscription.expiry_date);
    const daysUntilPayment = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Skip if payment date is in the past
    if (daysUntilPayment <= 0) {
      console.log(`Skipping ${subscription.service_name}: Payment date has passed`);
      return;
    }

    // Skip if payment is more than 30 days away
    if (daysUntilPayment > 30) {
      console.log(`Skipping ${subscription.service_name}: Payment too far in future (${daysUntilPayment} days)`);
      return;
    }

    console.log(`Setting up recurring payment reminders for ${subscription.service_name}:`);
    console.log(`- Days until payment: ${daysUntilPayment}`);
    console.log(`- Bank: ${subscription.bank_name}`);
    console.log(`- Card Holder: ${subscription.card_holder_name}`);

    // Schedule notifications for 2 days and 1 day before payment
    const reminderDays = [2, 1];
    const scheduledDays = new Set();

    for (const daysBefore of reminderDays) {
      // Only schedule if payment is at least that many days away
      if (daysBefore > daysUntilPayment) {
        console.log(`- Skipping ${daysBefore} day reminder: Payment is too soon`);
        continue;
      }

      // Skip if we've already scheduled this interval
      if (scheduledDays.has(daysBefore)) {
        continue;
      }

      try {
        const notificationId = await scheduleRecurringPaymentNotification(
          subscription.service_name,
          expiryDate,
          daysBefore,
          subscription.id,
          subscription.bank_name,
          subscription.card_holder_name
        );
        
        if (notificationId) {
          scheduledDays.add(daysBefore);
          console.log(`- Scheduled ${daysBefore} day reminder`);
          
          // Also create notification record in database if it's due today
          if (daysUntilPayment === daysBefore) {
            try {
              await createNotificationRecord(
                'Recurring Payment Reminder',
                `Payment for "${subscription.service_name}" will be automatically charged from ${subscription.bank_name} (${subscription.card_holder_name}) on ${expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`,
                'payment_due',
                subscription.id,
                subscription.user_id
              );
            } catch (error) {
              console.error('Error creating payment reminder notification record:', error);
            }
          }
        }
      } catch (error) {
        console.error(`- Failed to schedule ${daysBefore} day reminder:`, error);
      }
    }

    if (scheduledDays.size > 0) {
      console.log(`Completed ${subscription.service_name}: Scheduled ${scheduledDays.size} payment reminders`);
    }
  } catch (error) {
    console.error(`Error in setupRecurringPaymentReminders for "${subscription.service_name}"`, error);
    throw error;
  }
}

// Setup recurring payment reminders for all subscriptions
export async function setupAllRecurringPaymentReminders(subscriptions: any[]) {
  if (!subscriptions || subscriptions.length === 0) {
    return;
  }

  try {
    const now = new Date();
    
    // Filter subscriptions with auto_renewal=true, payment_type=recurring, and have card info
    const recurringSubscriptions = subscriptions.filter(sub => {
      if (!sub || !sub.is_active) return false;
      if (!sub.auto_renewal || sub.payment_type !== 'recurring') return false;
      if (!sub.bank_name || !sub.card_holder_name) return false;
      
      const expiryDate = new Date(sub.expiry_date);
      const daysUntilPayment = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return daysUntilPayment > 0 && daysUntilPayment <= 30;
    });

    console.log(`\nSetting up recurring payment reminders for ${recurringSubscriptions.length} subscriptions...`);

    // Process each recurring subscription
    for (const subscription of recurringSubscriptions) {
      await setupRecurringPaymentReminders(subscription);
    }

    console.log(`\nCompleted setting up recurring payment reminders`);
  } catch (error) {
    console.error('Fatal error in setupAllRecurringPaymentReminders:', error);
    throw error;
  }
} 