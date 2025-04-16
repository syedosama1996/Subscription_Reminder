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
  setupAllExpiryReminders
} from '../lib/notifications';
import { getSubscriptions } from '../lib/subscriptions';

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

  const { user } = useAuth(); // Now this is called within AuthProvider context

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Initialize notifications
  useEffect(() => {
    async function setupNotifications() {
      try {
        await registerForPushNotificationsAsync();
        const subscriptionSub = setupSubscriptionNotifications();
        const notificationSub = setupNotificationListener();
        return () => {
          subscriptionSub?.unsubscribe();
          notificationSub?.unsubscribe();
        };
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    }
    setupNotifications();
  }, []);

  // Set up expiry reminders when user is logged in
  useEffect(() => {
    async function setupExpirySubs() {
      if (!user) return;
      try {
        const subscriptions = await getSubscriptions(user.id);
        if (subscriptions && subscriptions.length > 0) {
          await setupAllExpiryReminders(subscriptions);
        }
      } catch (error) {
        console.error('Error setting up expiry reminders:', error);
      }
    }
    setupExpirySubs();
  }, [user]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
        <Toast />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
};

// RootLayout now only sets up providers
const RootLayout = () => {
  return (
    <AuthProvider>
      <SecurityProvider>
        <SessionProvider>
          <InnerLayout />
        </SessionProvider>
      </SecurityProvider>
    </AuthProvider>
  );
};

export default RootLayout;