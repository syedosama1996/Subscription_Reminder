import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  RefreshControl,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../lib/auth';
import { getSubscriptions, toggleSubscriptionStatus } from '../../../lib/subscriptions';
import SubscriptionCard from '../../../components/SubscriptionCard';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock } from 'lucide-react-native';
import CustomLoader from '../../../components/CustomLoader';
import { Subscription } from '../../../lib/subscriptions';
import { useFocusEffect } from 'expo-router';

export default function ExpiringSubscriptionsScreen() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExpiringSubscriptions = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      const allSubscriptions = await getSubscriptions(user.id);

      if (!allSubscriptions) {
        setSubscriptions([]);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const relevantSubscriptions = allSubscriptions.filter(sub => {
        if (!sub.expiry_date) return false;
        const expiryDate = new Date(sub.expiry_date);
        expiryDate.setHours(0, 0, 0, 0);
        
        return expiryDate < today || (expiryDate >= today && expiryDate <= thirtyDaysFromNow);
      });

      const sortedSubscriptions = relevantSubscriptions.sort((a, b) => {
        const dateA_created = a.created_at ? new Date(a.created_at) : new Date(0);
        const dateB_created = b.created_at ? new Date(b.created_at) : new Date(0);
        
        if (dateA_created.getTime() !== dateB_created.getTime()) {
          return dateB_created.getTime() - dateA_created.getTime();
        }

        const dateA_expiry = new Date(a.expiry_date);
        dateA_expiry.setHours(0, 0, 0, 0);
        const dateB_expiry = new Date(b.expiry_date);
        dateB_expiry.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const isAExpired = dateA_expiry < today;
        const isBExpired = dateB_expiry < today;

        if (isAExpired && !isBExpired) return -1;
        if (!isAExpired && isBExpired) return 1;

        return dateA_expiry.getTime() - dateB_expiry.getTime();
      });

      setSubscriptions(sortedSubscriptions);
    } catch (err) {
      console.error("Error loading expiring/expired subscriptions:", err);
      setError('Failed to load subscriptions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadExpiringSubscriptions();
    }, [user])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadExpiringSubscriptions();
  }, [user]);

  if (loading && !refreshing) {
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
          <Text style={styles.title}>Expired & Expiring</Text>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : subscriptions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Clock size={48} color="#95a5a6" style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No Expired or Soon Expiring</Text>
            <Text style={styles.emptySubtitle}>
              You have no subscriptions that have expired or are expiring within the next 30 days.
            </Text>
          </View>
        ) : (
          <FlatList
            data={subscriptions}
            keyExtractor={(item, index) => item.id || `subscription-${index}`}
            renderItem={({ item }) => (
              <SubscriptionCard
                subscription={item}
                onToggleStatus={null}
                simpleExpiryDisplay={true}
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
    paddingBottom: Platform.OS === 'android' ? 0 : 0,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'android' ? 90 : 100,
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