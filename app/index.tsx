import { Redirect } from 'expo-router';
import { useAuth } from '../lib/auth';

export default function Index() {
  const { user, loading } = useAuth();

  // Show loading screen while checking auth state
  if (loading) return null;

  // Redirect based on auth state
  return <Redirect href={user ? "/(app)" : "/(auth)/login"} />;
}