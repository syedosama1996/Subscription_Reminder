import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../lib/auth';
import { getSubscriptions, toggleSubscriptionStatus } from '../../../lib/subscriptions';
import SubscriptionCard from '../../../components/SubscriptionCard';
import { LinearGradient } from 'expo-linear-gradient';
import { History } from 'lucide-react-native';
import CustomLoader from '../../../components/CustomLoader';
import { useFocusEffect } from 'expo-router';

export default function PastSubscriptionsScreen() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;

    try {
      setError(null);
      setLoading(true);
      const data = await getSubscriptions(user.id);
      // Filter inactive subscriptions
      const inactiveSubscriptions = data?.filter(sub => sub.is_active === false) || [];

      // Sort by created_at in descending order (newest first)
      const sortedSubscriptions = inactiveSubscriptions.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });

      setSubscriptions(sortedSubscriptions);
    } catch (err) {
      console.error('Error loading past subscriptions:', err);
      setError('Failed to load past subscriptions');
      Alert.alert('Error', 'Failed to load past subscriptions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [user])
  );

  const onRefresh = useCallback(() => {
    if (!refreshing) {
      setRefreshing(true);
      loadData();
    }
  }, [refreshing]);

  const handleToggleSubscriptionStatus = async (id: string, isActive: boolean) => {
    if (!user) return;

    try {
      // Update the local state immediately for better UX
      setSubscriptions(prevSubscriptions => 
        prevSubscriptions.map(sub => 
          sub.id === id ? { ...sub, is_active: isActive } : sub
        )
      );
      
      // Then make the API call
      await toggleSubscriptionStatus(id, isActive, user.id);
      
      // Reload data to ensure consistency without showing loader
      await loadData();
    } catch (error) {
      console.error('Error toggling subscription status:', error);
      // Revert the local state on error
      await loadData();
      Alert.alert('Error', 'Failed to update subscription status');
    }
  };
  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#4158D0', '#C850C0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        />
        <CustomLoader visible={true} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4158D0', '#C850C0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Past Subscriptions</Text>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : subscriptions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <History size={48} color="#95a5a6" style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No Past Subscriptions</Text>
            <Text style={styles.emptySubtitle}>
              Subscriptions that are paused or cancelled will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={subscriptions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <SubscriptionCard
                subscription={item}
                onToggleStatus={(isActive) => handleToggleSubscriptionStatus(item.id, isActive)}
              />
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#4158D0']}
                tintColor="#4158D0"
              />
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 150,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  safeArea: {
    flex: 1,
    paddingBottom: Platform.OS === 'android' ? 60 : 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    position: 'relative',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 10,
    letterSpacing: 0.5,
  },
  listContent: {
    padding: 20,
  },
  errorContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    color: '#e74c3c',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    color: '#2c3e50',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
});