import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { History, Filter, Calendar, CreditCard, ArrowLeft, IndianRupee } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getSubscriptions, Subscription } from '../../lib/subscriptions';
import { router } from 'expo-router';
import CustomLoader from '@/components/CustomLoader';
import { TouchableOpacity } from 'react-native';

export default function PurchaseHistoryScreen() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await getSubscriptions(user.id, {
        status: ['active', 'expired', 'expiring_soon', 'past']
      });
      
      // Sort subscriptions by purchase date in descending order (newest first)
      const sortedData = [...(data || [])].sort((a, b) => {
        const dateA = a.purchase_date ? new Date(a.purchase_date).getTime() : 0;
        const dateB = b.purchase_date ? new Date(b.purchase_date).getTime() : 0;
        return dateB - dateA; // Descending order (newest first)
      });
      
      setSubscriptions(sortedData);
    } catch (err) {
      setError('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadSubscriptions();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const renderSubscriptionItem = ({ item }: { item: Subscription }) => (
    <View style={styles.purchaseCard}>
      <View style={styles.purchaseHeader}>
        <View style={styles.purchaseInfo}>
          <Text style={styles.subscriptionName}>{item.service_name}</Text>
          <View style={styles.paymentInfo}>
            <CreditCard size={16} color="#7f8c8d" />
            <Text style={styles.paymentMethod}>{item.vendor || 'Unknown Vendor'}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#2ecc71' : '#e74c3c' }]}>
          <Text style={styles.statusText}>{item.is_active ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>
      
      <View style={styles.purchaseDetails}>
        <View style={styles.amountContainer}>
          <Text style={styles.amountText}>Rs. {item.purchase_amount_pkr.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.dateContainer}>
        <View style={styles.dateBox}>
          <Calendar size={18} color="#4158D0" />
          <View style={styles.dateTextContainer}>
            <Text style={styles.dateLabel}>Purchase Date</Text>
            <Text style={styles.dateText}>{new Date(item.purchase_date).toLocaleDateString()}</Text>
          </View>
        </View>
        <View style={styles.dateBox}>
          <Calendar size={18} color="#C850C0" />
          <View style={styles.dateTextContainer}>
            <Text style={styles.dateLabel}>Expiry Date</Text>
            <Text style={[styles.dateText, new Date(item.expiry_date) < new Date() ? styles.expiredDate : null]}>
              {new Date(item.expiry_date).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.container}>
          <LinearGradient
            colors={['#4158D0', '#C850C0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          />
          <CustomLoader visible={true} />
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#4158D0', '#C850C0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      />
 
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Purchase History</Text>
        <View style={styles.placeholder} />
      </View>
      
      { error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadSubscriptions}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : subscriptions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <History size={48} color="#7f8c8d" />
          <Text style={styles.emptyText}>No subscriptions available</Text>
        </View>
      ) : (
        <FlatList
          data={subscriptions}
          renderItem={renderSubscriptionItem}
          keyExtractor={item => item.id || ''}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4158D0']}
              tintColor="#4158D0"
              title="Pull to refresh"
              titleColor="#4158D0"
              progressViewOffset={20}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 160,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  placeholder: {
    width: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#fff',
  },
  listContent: {
    padding: 20,
  },
  purchaseCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  purchaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  purchaseInfo: {
    flex: 1,
  },
  subscriptionName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    color: '#2c3e50',
    marginBottom: 4,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethod: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    color: '#7f8c8d',
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: '#fff',
  },
  purchaseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(65, 88, 208, 0.1)',
    padding: 12,
    borderRadius: 12,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 22,
    color: '#2c3e50',
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  dateTextContainer: {
    marginLeft: 8,
  },
  dateLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  dateText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    color: '#2c3e50',
  },
  expiredDate: {
    color: '#e74c3c',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(65, 88, 208, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  downloadText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: '#4158D0',
    marginLeft: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4158D0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 16,
  },
}); 