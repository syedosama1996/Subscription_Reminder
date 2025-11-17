import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  RefreshControl,
  Alert,
  Platform,
  TextInput,
  Modal,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../lib/auth';
import { getSubscriptions, toggleSubscriptionStatus, getCategories, deleteMultipleSubscriptions } from '../../../lib/subscriptions';
import SubscriptionCard from '../../../components/SubscriptionCard';
import FilterModal from '../../../components/FilterModal';
import BulkActionBar from '../../../components/BulkActionBar';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Search, Filter, CheckSquare, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react-native';
import CustomLoader from '../../../components/CustomLoader';
import { Subscription } from '../../../lib/subscriptions';
import { Category } from '../../../lib/types';
import { useFocusEffect } from 'expo-router';

export default function ExpiringSubscriptionsScreen() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<Subscription[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSubscriptions, setSelectedSubscriptions] = useState<string[]>([]);
  const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false);

  const loadExpiringSubscriptions = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Load categories
      const categoriesData = await getCategories(user.id);
      const allSubscriptions = await getSubscriptions(user.id);

      if (!allSubscriptions) {
        setSubscriptions([]);
        setFilteredSubscriptions([]);
        setCategories(categoriesData || []);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Only show expired subscriptions (expiry_date < today)
      // Show subscriptions that have expired, regardless of active status
      // But exclude subscriptions that are only inactive (not expired) - those go to Inactive page
      const expiredSubscriptions = allSubscriptions.filter(sub => {
        // Must have an expiry date
        if (!sub.expiry_date) return false;
        
        const expiryDate = new Date(sub.expiry_date);
        expiryDate.setHours(0, 0, 0, 0);
        
        // Only include subscriptions that have expired (expiry_date < today)
        // This includes both active and inactive subscriptions that have expired
        const isExpired = expiryDate < today;
        
        // If not expired, exclude it (even if inactive - inactive non-expired go to Inactive page)
        if (!isExpired) return false;
        
        return true;
      });

      // Apply category filters if selected
      let filteredByCategory = expiredSubscriptions;
      if (selectedCategories.length > 0) {
        filteredByCategory = expiredSubscriptions.filter(sub =>
          selectedCategories.includes(sub.category_id || '')
        );
      }

      // Sort expired subscriptions: most recently expired first, then by created_at
      const sortedSubscriptions = filteredByCategory.sort((a, b) => {
        const dateA_expiry = new Date(a.expiry_date!);
        dateA_expiry.setHours(0, 0, 0, 0);
        const dateB_expiry = new Date(b.expiry_date!);
        dateB_expiry.setHours(0, 0, 0, 0);

        // Sort by expiry date (most recently expired first - descending)
        const expiryDiff = dateB_expiry.getTime() - dateA_expiry.getTime();
        if (expiryDiff !== 0) {
          return expiryDiff;
        }

        // If same expiry date, sort by created_at (newest first)
        const dateA_created = a.created_at ? new Date(a.created_at) : new Date(0);
        const dateB_created = b.created_at ? new Date(b.created_at) : new Date(0);
        return dateB_created.getTime() - dateA_created.getTime();
      });

      setSubscriptions(sortedSubscriptions);
      setCategories(categoriesData || []);
      
      // Apply search filter
      applyFilters(sortedSubscriptions, searchQuery);
    } catch (err) {
      console.error("Error loading expiring/expired subscriptions:", err);
      setError('Failed to load subscriptions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = (subs: Subscription[], query: string) => {
    let filtered = subs;

    // Apply search query
    if (query.trim() !== '') {
      filtered = filtered.filter(sub =>
        sub.service_name.toLowerCase().includes(query.toLowerCase()) ||
        (sub.domain_name && sub.domain_name.toLowerCase().includes(query.toLowerCase())) ||
        (sub.vendor && sub.vendor.toLowerCase().includes(query.toLowerCase()))
      );
    }

    setFilteredSubscriptions(filtered);
  };

  useEffect(() => {
    applyFilters(subscriptions, searchQuery);
  }, [searchQuery, subscriptions]);

  useFocusEffect(
    useCallback(() => {
      loadExpiringSubscriptions();
    }, [user, selectedCategories])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadExpiringSubscriptions();
  }, [user]);

  const toggleSubscriptionSelection = (id: string) => {
    if (selectedSubscriptions.includes(id)) {
      setSelectedSubscriptions(selectedSubscriptions.filter(subId => subId !== id));
    } else {
      setSelectedSubscriptions([...selectedSubscriptions, id]);
    }
  };

  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedSubscriptions([]);
  };

  const handleBulkDelete = async () => {
    if (!user || selectedSubscriptions.length === 0) return;
    setDeleteConfirmModalVisible(true);
  };

  const confirmBulkDelete = async () => {
    if (!user || selectedSubscriptions.length === 0) return;

    try {
      setLoading(true);
      await deleteMultipleSubscriptions(selectedSubscriptions, user.id);

      // Reset selection mode and reload data
      setSelectionMode(false);
      setSelectedSubscriptions([]);
      loadExpiringSubscriptions();
    } catch (error) {
      console.error('Error deleting subscriptions:', error);
      Alert.alert('Error', 'Failed to delete subscriptions');
    } finally {
      setLoading(false);
      setDeleteConfirmModalVisible(false);
    }
  };

  const handleBulkToggleStatus = async (isActive: boolean) => {
    if (!user || selectedSubscriptions.length === 0) return;

    try {
      setLoading(true);

      // Update each selected subscription
      for (const id of selectedSubscriptions) {
        await toggleSubscriptionStatus(id, isActive, user.id);
      }

      // Reset selection mode and reload data
      setSelectionMode(false);
      setSelectedSubscriptions([]);
      loadExpiringSubscriptions();
    } catch (error) {
      console.error('Error bulk toggling subscription status:', error);
      Alert.alert('Error', 'Failed to update subscription statuses');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAll = () => {
    const allIds = filteredSubscriptions.map(sub => sub.id!);
    setSelectedSubscriptions(allIds);
  };

  const handleRemoveAll = () => {
    setSelectedSubscriptions([]);
    setSelectionMode(false);
  };

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
      
      <View style={styles.safeArea}>
        <View style={styles.headerContainer}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Expired</Text>
            </View>
            <View style={styles.headerActions}>
              {!selectionMode ? (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => setSelectionMode(true)}
                >
                  <CheckSquare size={22} color="#fff" />
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={handleMarkAll}
                  >
                    <CheckCircle2 size={22} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={handleRemoveAll}
                  >
                    <XCircle size={22} color="#fff" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Search size={20} color="#7f8c8d" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search subscriptions..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#95a5a6"
              />
              <TouchableOpacity style={styles.filterButton} onPress={() => setFilterModalVisible(true)}>
                <Filter size={20} color="#7f8c8d" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* BulkActionBar */}
        {selectedSubscriptions.length > 0 && (
          <BulkActionBar
            selectedCount={selectedSubscriptions.length}
            onCancel={handleCancelSelection}
            onDelete={handleBulkDelete}
            onToggleStatus={handleBulkToggleStatus}
            showToggleControls={false}
          />
        )}

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : filteredSubscriptions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Clock size={48} color="#95a5a6" style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>
              {subscriptions.length === 0 ? 'No Expired Subscriptions' : 'No Matching Subscriptions'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {subscriptions.length === 0
                ? 'You have no subscriptions that have expired.'
                : 'No subscriptions match your search or filters.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredSubscriptions}
            keyExtractor={(item, index) => item.id || `subscription-${index}`}
            renderItem={({ item }) => (
              <View style={styles.cardWrapper}>
                <SubscriptionCard
                  subscription={item}
                  onToggleStatus={() => {}}
                  simpleExpiryDisplay={true}
                  selectionMode={selectionMode}
                  selected={selectedSubscriptions.includes(item.id!)}
                  onToggleSelection={() => toggleSubscriptionSelection(item.id!)}
                  hideToggle={true}
                />
              </View>
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
      </View>

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        categories={categories}
        selectedCategories={selectedCategories}
        onSelectCategories={setSelectedCategories}
        selectedStatuses={selectedStatuses}
        onSelectStatuses={setSelectedStatuses}
        onRefresh={loadExpiringSubscriptions}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={deleteConfirmModalVisible}
        onRequestClose={() => setDeleteConfirmModalVisible(false)}
      >
        <View style={styles.modalCenteredView}>
          <View style={styles.modalView}>
            <View style={styles.modalIconContainer}>
              <AlertTriangle size={48} color="#e74c3c" />
            </View>
            <Text style={styles.modalTitle}>Delete Subscriptions</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete {selectedSubscriptions.length} subscription(s)? This action cannot be undone.
            </Text>
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setDeleteConfirmModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={confirmBulkDelete}
                activeOpacity={0.7}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalDeleteButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    height: 110,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    zIndex: 1000,
  },
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    marginTop: 0,
    zIndex: 1001,
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  header: {
    marginTop: 42,
    zIndex: 1001,
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerLeft: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 10,
    letterSpacing: 0.5,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderRadius: 14,
    height: 45,

  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
    fontFamily: 'Inter-Regular',
  },
  searchIcon: {
    marginRight: 12,
  },
  filterButton: {
    padding: 8,
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
  cardWrapper: {
    marginBottom: 20,
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
    fontSize: 12,
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
    fontSize: 20,
    color: '#2c3e50',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  // Delete Confirmation Modal Styles
  modalCenteredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
   
  },
  modalIconContainer: {
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 15,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e74c3c',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#e74c3c',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  modalDeleteButton: {
    flex: 1,
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  modalDeleteButtonText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
});