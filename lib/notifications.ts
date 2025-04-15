import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import Toast from 'react-native-toast-message';

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
      console.log('Failed to get push token for push notification!');
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
  daysBefore: number
) {
  const triggerDate = new Date(expiryDate);
  triggerDate.setDate(triggerDate.getDate() - daysBefore);

  const title = 'Subscription Expiring Soon';
  const body = `${subscriptionName} will expire in ${daysBefore} days`;

  // Show toast notification
  Toast.show({
    type: 'warning',
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
      data: { subscriptionName, expiryDate: expiryDate.toISOString() },
    },
    trigger: {
      type: 'date',
      date: triggerDate,
    } as Notifications.NotificationTriggerInput,
  });
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