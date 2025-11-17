import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Platform,
  TextInput,
  Modal,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../lib/auth';
import { getSubscriptions, toggleSubscriptionStatus, getCategories, deleteMultipleSubscriptions } from '../../../lib/subscriptions';
import SubscriptionCard from '../../../components/SubscriptionCard';
import FilterModal from '../../../components/FilterModal';
import BulkActionBar from '../../../components/BulkActionBar';
import { LinearGradient } from 'expo-linear-gradient';
import { History, Search, Filter, CheckSquare, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react-native';
import CustomLoader from '../../../components/CustomLoader';
import { Subscription } from '../../../lib/subscriptions';
import { Category } from '../../../lib/types';
import { useFocusEffect } from 'expo-router';

export default function PastSubscriptionsScreen() {
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

  const loadData = async () => {
    if (!user) return;

    try {
      setError(null);
      setLoading(true);
      
      // Load categories
      const categoriesData = await getCategories(user.id);
      const data = await getSubscriptions(user.id);
      
      // Filter inactive subscriptions
      const inactiveSubscriptions = data?.filter(sub => sub.is_active === false) || [];

      // Apply category filters if selected
      let filteredByCategory = inactiveSubscriptions;
      if (selectedCategories.length > 0) {
        filteredByCategory = inactiveSubscriptions.filter(sub =>
          selectedCategories.includes(sub.category_id || '')
        );
      }

      // Sort by created_at in descending order (newest first)
      const sortedSubscriptions = filteredByCategory.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });

      setSubscriptions(sortedSubscriptions);
      setCategories(categoriesData || []);
      
      // Apply search filter
      applyFilters(sortedSubscriptions, searchQuery);
    } catch (err) {
      console.error('Error loading past subscriptions:', err);
      setError('Failed to load past subscriptions');
      Alert.alert('Error', 'Failed to load past subscriptions');
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

  // Load data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [user, selectedCategories])
  );

  const onRefresh = useCallback(() => {
    if (!refreshing) {
      setRefreshing(true);
      loadData();
    }
  }, [refreshing]);

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
      loadData();
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
      loadData();
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

      <View style={styles.safeArea}>
        <View style={styles.headerContainer}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Inactive</Text>
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
          />
        )}

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : filteredSubscriptions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <History size={48} color="#95a5a6" style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>
              {subscriptions.length === 0 ? 'No Past Subscriptions' : 'No Matching Subscriptions'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {subscriptions.length === 0
                ? 'Subscriptions that are paused or cancelled will appear here'
                : 'No subscriptions match your search or filters.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredSubscriptions}
            keyExtractor={(item) => item.id!}
            renderItem={({ item }) => (
              <View style={styles.cardWrapper}>
                <SubscriptionCard
                  subscription={item}
                  onToggleStatus={(isActive) => handleToggleSubscriptionStatus(item.id!, isActive)}
                  onRefresh={loadData}
                  selectionMode={selectionMode}
                  selected={selectedSubscriptions.includes(item.id!)}
                  onToggleSelection={() => toggleSubscriptionSelection(item.id!)}
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
        onRefresh={loadData}
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
  cardWrapper: {
    marginBottom: 20,

  },  
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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