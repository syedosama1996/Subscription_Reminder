import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { useUserActivity } from '../../lib/hooks/useUserActivity';

export default function AuthLayout() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { ActivityWrapper } = useUserActivity();

  // Track user activity
  useUserActivity();

  useEffect(() => {
    if (!loading) {
      const inAuthGroup = segments[0] === '(auth)';

      if (!user && !inAuthGroup) {
        // Redirect to the login page if not authenticated
        router.replace('/(auth)/login');
      } else if (user && inAuthGroup) {
        // Redirect to the app if authenticated
        router.replace('/(app)');
      }
    }
  }, [user, loading, segments]);

  return (
    <ActivityWrapper>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack>
    </ActivityWrapper>
  );
}