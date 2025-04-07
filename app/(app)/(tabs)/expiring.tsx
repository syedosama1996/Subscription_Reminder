import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../lib/auth';
import { getSubscriptions, toggleSubscriptionStatus } from '../../../lib/subscriptions';
import SubscriptionCard from '../../../components/SubscriptionCard';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock } from 'lucide-react-native';
import CustomLoader from '../../../components/CustomLoader';

export default function ExpiringSubscriptionsScreen() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setError(null);
      const data = await getSubscriptions(user.id);
      console.log('All subscriptions:', data); // Debug log
      
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      console.log('Today:', today); // Debug log
      console.log('30 days from now:', thirtyDaysFromNow); // Debug log
      
      // Get expired and soon-to-expire subscriptions
      const expiringSubscriptions = data?.filter(sub => {
        if (!sub.is_active) return false;
        const expiryDate = new Date(sub.expiry_date);
        return expiryDate <= thirtyDaysFromNow;
      }) || [];
      
      // Sort by created_at in descending order (newest first)
      const sortedSubscriptions = expiringSubscriptions.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });
      
      setSubscriptions(sortedSubscriptions);
    } catch (err) {
      console.error('Error loading expiring subscriptions:', err);
      setError('Failed to load expiring subscriptions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4158D0" />
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
          <Text style={styles.title}>Expiring & Expired</Text>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : subscriptions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Clock size={48} color="#95a5a6" style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No Expiring Subscriptions</Text>
            <Text style={styles.emptySubtitle}>
              None of your active subscriptions are expiring soon
            </Text>
          </View>
        ) : (
          <FlatList
            data={subscriptions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <SubscriptionCard 
                subscription={item}
                onToggleStatus={null}
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
    height: 180,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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