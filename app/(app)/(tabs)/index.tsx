import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../lib/auth';
import { useRouter, useFocusEffect, useNavigation } from 'expo-router';
import {
  getSubscriptions,
  getCategories,
  Subscription,
  toggleSubscriptionStatus,
  deleteMultipleSubscriptions,
  exportSubscriptionsToCSV
} from '../../../lib/subscriptions';
import SubscriptionCard from '../../../components/SubscriptionCard';
import FilterModal from '../../../components/FilterModal';
import BulkActionBar from '../../../components/BulkActionBar';
import NotificationBottomSheet from '../../../components/NotificationBottomSheet';
import NotificationIcon from '../../../components/NotificationIcon';
import { Search, Bell, Plus, Filter, Download, CheckSquare, Menu, CheckCircle2, XCircle, TrendingUp, Calendar, DollarSign, AlertTriangle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { Category, SubscriptionFilter } from '../../../lib/types';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import CustomLoader from '../../../components/CustomLoader';
import { setScrolling } from '../../../components/SubscriptionCard';
import { TouchableOpacity } from 'react-native';
import { TEXT_STYLES, FONT_FAMILY, FONT_SIZES } from '../../../constants/Typography';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const [allSubscriptions, setAllSubscriptions] = useState<Subscription[]>([]); // Store all subscriptions from API
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSubscriptions, setSelectedSubscriptions] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [notificationBottomSheetVisible, setNotificationBottomSheetVisible] = useState(false);
  const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false);
  const categoriesScrollViewRef = useRef<ScrollView>(null);
  const lastFilterChangeRef = useRef<number>(0);

  // Helper function to get days until expiry
  const getDaysUntilExpiry = useCallback((sub: Subscription, today: Date): number => {
    if (!sub.expiry_date) return Infinity;
    const expiryDate = new Date(sub.expiry_date);
    expiryDate.setHours(0, 0, 0, 0);
    const diffTime = expiryDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, []);

  // Memoized filtered and sorted subscriptions - single source of truth
  const subscriptions = useMemo(() => {
    if (allSubscriptions.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Apply status filters if selected
    let filteredByStatus = allSubscriptions;
    if (selectedStatuses.length > 0) {
      filteredByStatus = allSubscriptions.filter(sub => {
        let matches = false;

        if (selectedStatuses.includes('active')) {
          if (!sub.expiry_date) {
            matches = matches || sub.is_active === true;
          } else {
            const expiryDate = new Date(sub.expiry_date);
            expiryDate.setHours(0, 0, 0, 0);
            matches = matches || (sub.is_active === true && expiryDate >= today);
          }
        }

        if (selectedStatuses.includes('inactive')) {
          const isExplicitlyInactive = sub.is_active === false;
          const isExpired = sub.expiry_date ? (() => {
            const expiryDate = new Date(sub.expiry_date);
            expiryDate.setHours(0, 0, 0, 0);
            return expiryDate < today;
          })() : false;
          matches = matches || isExplicitlyInactive || isExpired;
        }

        if (selectedStatuses.includes('expiring_soon')) {
          if (sub.expiry_date && sub.is_active) {
            const daysUntilExpiry = getDaysUntilExpiry(sub, today);
            matches = matches || (daysUntilExpiry >= 0 && daysUntilExpiry <= 30);
          }
        }

        return matches;
      });
    } else {
      // Default: show only active subscriptions (is_active === true and not expired)
      filteredByStatus = allSubscriptions.filter(sub => {
        if (!sub.expiry_date) return sub.is_active === true;
        const expiryDate = new Date(sub.expiry_date);
        expiryDate.setHours(0, 0, 0, 0);
        return sub.is_active === true && expiryDate >= today;
      });
    }

    // Apply category filters if selected
    let filteredByCategory = filteredByStatus;
    if (selectedCategories.length > 0) {
      filteredByCategory = filteredByStatus.filter(sub =>
        selectedCategories.includes(sub.category_id || '')
      );
    }

    // Apply bank name filters if selected
    let filteredByBank = filteredByCategory;
    if (selectedBanks.length > 0) {
      filteredByBank = filteredByCategory.filter(sub =>
        sub.bank_name && selectedBanks.includes(sub.bank_name)
      );
    }

    // Sort subscriptions by days until expiry (ascending)
    const sorted = [...filteredByBank].sort((a, b) => {
      const daysA = getDaysUntilExpiry(a, today);
      const daysB = getDaysUntilExpiry(b, today);
      return daysA - daysB;
    });

    return sorted;
  }, [allSubscriptions, selectedStatuses, selectedCategories, selectedBanks, getDaysUntilExpiry]);

  // Get unique bank names from subscriptions
  const bankNames = useMemo(() => {
    const banks = new Set<string>();
    allSubscriptions.forEach(sub => {
      if (sub.bank_name && sub.bank_name.trim() !== '') {
        banks.add(sub.bank_name);
      }
    });
    return Array.from(banks).sort();
  }, [allSubscriptions]);

  // Memoized filtered subscriptions by search query
  const filteredSubscriptions = useMemo(() => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery === '') {
      return subscriptions;
    }
    const query = trimmedQuery.toLowerCase();
    return subscriptions.filter(sub => {
      const serviceName = sub.service_name?.toLowerCase() || '';
      return serviceName.includes(query);
    });
  }, [subscriptions, searchQuery]);

  // Memoized filtered subscriptions by active category
  const finalFilteredSubscriptions = useMemo(() => {
    if (activeCategory === null) {
      return filteredSubscriptions;
    }
    return filteredSubscriptions.filter(sub => sub.category_id === activeCategory);
  }, [filteredSubscriptions, activeCategory]);

  // Update categories order based on subscription counts (only when subscriptions change)
  useEffect(() => {
    if (subscriptions.length === 0) return;

    const categoryCounts = subscriptions.reduce((acc, sub) => {
      if (sub.category_id) {
        acc[sub.category_id] = (acc[sub.category_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    setCategories(prevCategories => {
      const sortedCategories = [...prevCategories].sort((a, b) => {
        const countA = categoryCounts[a.id!] || 0;
        const countB = categoryCounts[b.id!] || 0;
        return countB - countA;
      });
      // Only update if order actually changed
      const orderChanged = sortedCategories.some((cat, index) => 
        prevCategories[index]?.id !== cat.id
      );
      return orderChanged ? sortedCategories : prevCategories;
    });
  }, [subscriptions]);

  // Load data from API (only called on initial load or manual refresh)
  const loadData = useCallback(async (showLoading: boolean = true) => {
    if (!user) return;

    try {
      setError(null);
      // Only set loading if requested and we're not in a toggle operation
      if (showLoading && !toggleLoading) {
        setLoading(true);
      }

      // Load categories
      const categoriesData = await getCategories(user.id);

      // Load all subscriptions from API
      const data = await getSubscriptions(user.id);
      const subscriptionsData = data || [];

      // Store all subscriptions - filters will be applied automatically via useMemo
      setAllSubscriptions(subscriptionsData);
      setCategories(categoriesData || []);

    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      // Always set loading to false if we're not in a toggle operation
      // This ensures the loader doesn't get stuck
      if (!toggleLoading) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, [user, toggleLoading]);

  // Add focus effect to refresh data when screen comes into focus
  // This ensures new subscriptions appear immediately after creation
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      
      // Don't refresh if filters were just changed (within last 2 seconds)
      // This prevents race conditions when applying filters
      const timeSinceFilterChange = Date.now() - lastFilterChangeRef.current;
      if (timeSinceFilterChange < 2000) {
        return;
      }
      
      // Always refresh data when screen comes into focus
      // This ensures data is up-to-date when returning from other screens
      // Add a small delay to ensure navigation is complete
      // Don't show loading indicator on focus refresh to avoid flickering
      const timeoutId = setTimeout(() => {
        loadData(false); // Pass false to skip loading indicator
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }, [user, loadData])
  );

  const onRefresh = useCallback(() => {
    if (!refreshing) {
      setRefreshing(true);
      loadData();
    }
  }, [refreshing]);

  // Load data only on initial mount or when user changes
  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Track when filters change to prevent unnecessary refreshes
  useEffect(() => {
    if (allSubscriptions.length > 0) {
      lastFilterChangeRef.current = Date.now();
    }
  }, [selectedCategories, selectedStatuses, allSubscriptions.length]);

  const handleToggleSubscriptionStatus = async (id: string, isActive: boolean) => {
    if (!user) return;

    try {
      setToggleLoading(true);

      // Update the local state immediately for better UX
      // Filters will be reapplied automatically via useMemo
      setAllSubscriptions(prev =>
        prev.map(sub =>
          sub.id === id ? { ...sub, is_active: isActive } : sub
        )
      );

      // Make the API call
      await toggleSubscriptionStatus(id, isActive, user.id);

      // Only reload data if there was an error or if we need to refresh other data
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error toggling subscription status:', error);
      // Revert the local state on error
      await loadData();
      Alert.alert('Error', 'Failed to update subscription status');
    } finally {
      setToggleLoading(false);
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

  const handleCategoryPress = (categoryId: string | null) => {
    setActiveCategory(activeCategory === categoryId ? null : categoryId);
    // Filtering is handled automatically via useMemo (finalFilteredSubscriptions)
  };

  // Update the renderEmptyState function
  const renderEmptyState = () => {
    const hasNoSubscriptions = allSubscriptions.length === 0;
    const hasNoFilteredResults = finalFilteredSubscriptions.length === 0 && allSubscriptions.length > 0;


    return (
      <View style={[styles.emptyContainer, { flex: 1, justifyContent: 'center' }]}>
        <Text style={styles.emptyTitle}>
          {hasNoSubscriptions ? 'No subscriptions found' : 'No matching subscriptions'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {hasNoSubscriptions
            ? "You haven't added any subscriptions yet."
            : "No subscriptions match your search or filters."}
        </Text>
        <TouchableOpacity
          style={styles.addFirstButton}
          onPress={() => router.push('/add')}
        >
          <Plus size={20} color="#fff" style={styles.addFirstIcon} />
          <Text style={styles.addFirstText}>Add Your First Subscription</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Add effect to scroll to active category
  useEffect(() => {
    if (activeCategory && categoriesScrollViewRef.current) {
      // Find the index of the active category
      const categoryIndex = categories.findIndex(cat => cat.id === activeCategory);
      if (categoryIndex !== -1) {
        // Calculate the scroll position
        const scrollPosition = categoryIndex * 88; // 80px width + 8px margin

        // Use setTimeout to ensure the scroll happens after the render
        setTimeout(() => {
          categoriesScrollViewRef.current?.scrollTo({
            x: scrollPosition,
            animated: true
          });
        }, 100);
      }
    }
  }, [activeCategory, categories]);

  const handleMarkAll = () => {
    const allIds = finalFilteredSubscriptions.map(sub => sub.id!);
    setSelectedSubscriptions(allIds);
  };

  const handleRemoveAll = () => {
    setSelectedSubscriptions([]);
    setSelectionMode(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <CustomLoader visible={true} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.headerContainer}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => navigation.toggleDrawer()}
              >
                <Menu size={22} color="#2c3e50" />
              </TouchableOpacity>
              <MaskedView
                maskElement={<Text style={styles.title}>Active Subscriptions</Text>}
              >
                <LinearGradient
                  colors={['#4158D0', '#C850C0']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={[styles.title , { opacity: 0 }]}>Active Subscriptions</Text>
                </LinearGradient>
              </MaskedView>
            </View>
            <View style={styles.headerActions}>
              {!selectionMode ? (
                <>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => setSelectionMode(true)}
                  >
                    <CheckSquare size={16} color="#2c3e50" />
                  </TouchableOpacity>
                  <NotificationIcon
                    style={styles.iconButton}
                    onPress={() => setNotificationBottomSheetVisible(true)}
                    userId={user?.id}
                    size={16}
                    color="#2c3e50"
                  />
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={handleMarkAll}
                  >
                    <CheckCircle2 size={16} color="#2c3e50" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={handleRemoveAll}
                  >
                    <XCircle size={16} color="#2c3e50" />
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
              <TouchableOpacity 
                style={styles.filterButton} 
                onPress={() => setFilterModalVisible(true)}
              >
                <View style={styles.filterButtonContainer}>
                  <Filter 
                    size={18} 
                    color={selectedCategories.length > 0 || selectedStatuses.length > 0 || selectedBanks.length > 0 ? "#4158D0" : "#7f8c8d"} 
                  />
                  {(selectedCategories.length > 0 || selectedStatuses.length > 0 || selectedBanks.length > 0) && (
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>
                        {selectedCategories.length + selectedStatuses.length + selectedBanks.length}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
      <View style={styles.safeArea} >
        {/* BulkActionBar - Fixed above content, outside ScrollView */}
        {selectedSubscriptions.length > 0 && (
          <BulkActionBar
            selectedCount={selectedSubscriptions.length}
            onCancel={handleCancelSelection}
            onDelete={handleBulkDelete}
            onToggleStatus={handleBulkToggleStatus}
          />
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          onScrollBeginDrag={() => setScrolling(true)}
          onScrollEndDrag={() => setScrolling(false)}
          onMomentumScrollBegin={() => setScrolling(true)}
          onMomentumScrollEnd={() => setScrolling(false)}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          <View style={styles.mainContent}>
            {categories.length > 0 && (
              <View style={[
                styles.categoriesWrapper,
                selectedSubscriptions.length > 0 && styles.categoriesWrapperWithBulkSelection
              ]}>
                <ScrollView
                  ref={categoriesScrollViewRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoriesContainer}
                  contentContainerStyle={styles.categoriesScrollContent}
                  alwaysBounceHorizontal={false}
                >
                  <TouchableOpacity
                    onPress={() => handleCategoryPress(null)}
                    style={[
                      styles.categoryTab,
                      !activeCategory && styles.activeCategoryTab
                    ]}
                  >
                    {!activeCategory ? (
                      <LinearGradient
                        colors={['#4158D0', '#C850C0']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.categoryTabContent]}
                      >
                        <View style={styles.categoryContent}>
                          <Text style={[styles.categoryTabText, styles.activeCategoryTabText]}>All</Text>
                          <View style={[styles.badge, styles.activeBadge]}>
                            <Text style={[styles.badgeText, styles.activeBadgeText]}>{subscriptions.length}</Text>
                          </View>
                        </View>
                      </LinearGradient>
                    ) : (
                      <View style={styles.categoryTabContent}>
                        <View style={styles.categoryContent}>
                          <Text style={styles.categoryTabText}>All</Text>
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>{subscriptions.length}</Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>

                  {categories.map(category => {
                    const subscriptionCount = subscriptions.filter(sub => sub.category_id === category.id).length;
                    return (
                      <TouchableOpacity
                        key={category.id}
                        onPress={() => handleCategoryPress(category.id!)}
                        style={[
                          styles.categoryTab,
                          activeCategory === category.id && styles.activeCategoryTab
                        ]}
                      >
                        {activeCategory === category.id ? (
                          <LinearGradient
                            colors={['#4158D0', '#C850C0']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[styles.categoryTabContent]}
                          >
                            <View style={styles.categoryContent}>
                              <Text style={[styles.categoryTabText, styles.activeCategoryTabText]}>
                                {category.name}
                              </Text>
                              <View style={[styles.badge, styles.activeBadge]}>
                                <Text style={[styles.badgeText, styles.activeBadgeText]}>{subscriptionCount}</Text>
                              </View>
                            </View>
                          </LinearGradient>
                        ) : (
                          <View style={styles.categoryTabContent}>
                            <View style={styles.categoryContent}>
                              <Text style={styles.categoryTabText}>{category.name}</Text>
                              <View style={styles.badge}>
                                <Text style={styles.badgeText}>{subscriptionCount}</Text>
                              </View>
                            </View>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Subscriptions List */}
            {finalFilteredSubscriptions.length === 0 ? (
              renderEmptyState()
            ) : (
              <FlatList
                data={finalFilteredSubscriptions}
                keyExtractor={(item, index) =>
                  `subscription-${item.id}-${index}`
                }
                renderItem={({ item }) => (
                  <View style={styles.cardWrapper}>
                    <SubscriptionCard
                      subscription={item}
                      onToggleStatus={(isActive) => handleToggleSubscriptionStatus(item.id!, isActive)}
                      selectionMode={selectionMode}
                      selected={selectedSubscriptions.includes(item.id!)}
                      onToggleSelection={() => toggleSubscriptionSelection(item.id!)}
                      disabled={toggleLoading}
                      onPress={() => router.push(`/subscription/${item.id}`)}
                      onRefresh={loadData}
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
                    progressViewOffset={Platform.OS === 'android' ? 50 : 0}
                  />
                }
                showsVerticalScrollIndicator={true}
                scrollEnabled={true}
                bounces={true}
                ListEmptyComponent={renderEmptyState}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                initialNumToRender={10}
                windowSize={10}
              />
            )}
          </View>

          {/* <CustomLoader visible={toggleLoading} /> */}
        </ScrollView>
      </View>

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        categories={categories}
        selectedCategories={selectedCategories}
        onSelectCategories={setSelectedCategories}
        selectedStatuses={selectedStatuses}
        onSelectStatuses={setSelectedStatuses}
        bankNames={bankNames}
        selectedBanks={selectedBanks}
        onSelectBanks={setSelectedBanks}
      />

      <NotificationBottomSheet
        visible={notificationBottomSheetVisible}
        onClose={() => setNotificationBottomSheetVisible(false)}
        userId={user?.id}
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
  scrollView: {
    flex: 1,
  },
  safeAreaTop: {
    backgroundColor: '#fff',
  },
  safeArea: {
    flex: 1,
    marginTop: 10
  },
  headerContainer: {
    backgroundColor: '#fff',
    paddingTop: 4,
    paddingBottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
    marginTop: 10
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f6fa',
    paddingHorizontal: 16,
    borderRadius: 14,
    height: 45,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
    fontFamily: FONT_FAMILY.regular,
  },
  searchIcon: {
    marginRight: 12,
  },
  filterButton: {
    padding: 8,
    position: 'relative',
  },
  filterButtonContainer: {
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#4158D0',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: FONT_FAMILY.semiBold,
    lineHeight: 12,
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 21,
    letterSpacing: -0.8,
  },
  mainContent: {
    flex: 1,
    marginTop: 0,
    zIndex: 1,
  },
  categoriesWrapper: {
    borderBottomColor: '#e6e6f0',
    marginTop: 0,
    marginHorizontal: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  categoriesWrapperWithBulkSelection: {
    marginTop: 20,
    paddingBottom: 0,
  },
  categoriesContainer: {
    height: 40,
  },
  categoriesScrollContent: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
  },
  categoryTab: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#e6e6f0',
    minWidth: 40,
    height: 36,
    marginHorizontal: 3,
  },
  categoryTabContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  badge: {
    backgroundColor: 'rgba(65, 88, 208, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  badgeText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 10,
    color: '#4158D0',
  },
  activeBadgeText: {
    color: '#fff',
  },
  categoryTabText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 10,
    color: '#4158D0',
    textAlign: 'center',
  },
  activeCategoryTabText: {
    color: '#fff',
    fontFamily: FONT_FAMILY.semiBold,
  },
  listContent: {
    paddingHorizontal: 20,
    marginTop: 20,
    paddingBottom: Platform.OS === 'android' ? 180 : 200,
  },
  cardWrapper: {
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: '#2c3e50',
  },
  countBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  countText: {
    fontFamily: FONT_FAMILY.medium,
    color: '#fff',
    fontSize: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 100,
  },
  emptyTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 24,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4158D0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,

  },
  addFirstIcon: {
    marginRight: 8,
  },
  addFirstText: {
    fontFamily: FONT_FAMILY.medium,
    color: '#fff',
    fontSize: 10,
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
    fontFamily: FONT_FAMILY.regular,
    color: '#e74c3c',
    fontSize: 10,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: FONT_FAMILY.medium,
  },
  activeCategoryTab: {
    // Add definition for the missing style
    // Minimal style, as gradient is applied internally
  },
  contentContainer: {
    // paddingBottom: Platform.OS === 'android' ? 180 : 200,
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
    fontFamily: FONT_FAMILY.bold,
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.regular,
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
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 10,
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
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 10,
  },
});