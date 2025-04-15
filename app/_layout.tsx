import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SplashScreen } from 'expo-router';
import { AuthProvider } from '../lib/auth';
import { SecurityProvider } from '../lib/security';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { registerForPushNotificationsAsync, setupSubscriptionNotifications, setupNotificationListener } from '../lib/notifications';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const RootLayout = () => {
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Initialize notifications
  useEffect(() => {
    async function setupNotifications() {
      try {
        // Register for push notifications
        await registerForPushNotificationsAsync();
        
        // Set up subscription notifications
        const subscriptionSub = setupSubscriptionNotifications();
        
        // Set up notification listener
        const notificationSub = setupNotificationListener();

        // Cleanup subscriptions on unmount
        return () => {
          subscriptionSub.unsubscribe();
          notificationSub.unsubscribe();
        };
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    }

    setupNotifications();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <SecurityProvider>
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
      </SecurityProvider>
    </AuthProvider>
  );
};

export default RootLayout;