import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SplashScreen } from 'expo-router';
import { AuthProvider, useAuth } from '../lib/auth';
import { SecurityProvider } from '../lib/security';
import { SessionProvider } from '../lib/session';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { 
  registerForPushNotificationsAsync, 
  setupSubscriptionNotifications, 
  setupNotificationListener,
  setupAllExpiryReminders,
  setupAllRecurringPaymentReminders
} from '../lib/notifications';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { getSubscriptions } from '../lib/subscriptions';
import { LogBox, View } from 'react-native';

// Ignore specific warnings that might be related to gesture handling
LogBox.ignoreLogs([
  'Gesture handler is not attached to a native view',
  'Non-serializable values were found in the navigation state',
  'ViewPropTypes will be removed from React Native',
]);

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// New component containing the actual layout logic
const InnerLayout = () => {
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Add slight delay to ensure UI is properly initialized
      setTimeout(() => {
        SplashScreen.hideAsync();
      }, 100);
    }
  }, [fontsLoaded, fontError]);

  // Initialize notifications - only when user is logged in
  useEffect(() => {
    if (!user) return; // Don't set up notifications if user is not logged in
    
    let subscriptionSub: any, notificationSub: any, responseListener: any;
    
    async function setupNotifications() {
      try {
        await registerForPushNotificationsAsync();
        subscriptionSub = setupSubscriptionNotifications(user?.id); // Pass user ID
        notificationSub = setupNotificationListener();
        
        // Set up notification response listener
        responseListener = Notifications.addNotificationResponseReceivedListener(response => {
          const data = response.notification.request.content.data;
          
          // If notification has subscription_id, navigate to subscription detail
          if (data?.subscriptionId) {
            router.push(`/subscription/${data.subscriptionId}`);
          }
        });
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    }
    
    setupNotifications();
    
    return () => {
      if (subscriptionSub?.unsubscribe) subscriptionSub.unsubscribe();
      if (notificationSub?.unsubscribe) notificationSub.unsubscribe();
      if (responseListener) Notifications.removeNotificationSubscription(responseListener);
    };
  }, [user, router]); // Add user as dependency

  // Set up expiry reminders and recurring payment reminders when user is logged in
  useEffect(() => {
    async function setupReminders() {
      if (!user) return;
      try {
        const subscriptions = await getSubscriptions(user.id);
        if (subscriptions && subscriptions.length > 0) {
          // Setup expiry reminders
          await setupAllExpiryReminders(subscriptions);
          // Setup recurring payment reminders
          await setupAllRecurringPaymentReminders(subscriptions);
        }
      } catch (error) {
        console.error('Error setting up reminders:', error);
      }
    }
    setupReminders();
  }, [user]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={{ flexGrow: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
      <Toast topOffset={50} />
    </View>
  );
};

// RootLayout now only sets up providers
const RootLayout = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <SecurityProvider>
            <SessionProvider>
              <InnerLayout />
            </SessionProvider>
          </SecurityProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default RootLayout;