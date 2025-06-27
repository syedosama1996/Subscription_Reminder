import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../lib/auth';
import { useRouter, useFocusEffect, useNavigation } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import {
  getSubscriptions,
  getCategories,
  Subscription,
  toggleSubscriptionStatus,
  deleteMultipleSubscriptions,
  exportSubscriptionsToCSV
} from '../../../lib/subscriptions';
import SubscriptionCard from '../../../components/SubscriptionCard';
import CategoryBadge from '../../../components/CategoryBadge';
import FilterModal from '../../../components/FilterModal';
import BulkActionBar from '../../../components/BulkActionBar';
import { Search, Bell, Plus, Filter, Download, CheckSquare, Menu, CheckCircle2, XCircle, TrendingUp, Calendar, DollarSign, AlertTriangle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Category, SubscriptionFilter } from '../../../lib/types';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import CustomLoader from '../../../components/CustomLoader';
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import { setScrolling } from '../../../components/SubscriptionCard';
import { TouchableOpacity } from 'react-native-gesture-handler';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<Subscription[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSubscriptions, setSelectedSubscriptions] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const categoriesScrollViewRef = useRef<ScrollView>(null);

  // Add focus effect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Refresh data when screen comes into focus
      loadData();
    }, [])
  );

  const loadData = async () => {
    if (!user) return;

    try {
      setError(null);
      // Only set loading if we're not in a toggle operation
      if (!toggleLoading) {
        setLoading(true);
      }

      // Load categories
      const categoriesData = await getCategories(user.id);
      
      // Load subscriptions with filters
      const data = await getSubscriptions(user.id);
      
      // Filter only active subscriptions (is_active === true and not expired)
      const activeSubscriptions = data?.filter(sub => {
        if (!sub.expiry_date) return sub.is_active === true; // If no expiry date, just check is_active
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today's date
        const expiryDate = new Date(sub.expiry_date);
        expiryDate.setHours(0, 0, 0, 0); // Normalize expiry date
        return sub.is_active === true && expiryDate >= today;
      }) || [];

      // Apply status filters if selected
      let filteredByStatus = activeSubscriptions;
      if (selectedStatuses.includes('expiring_soon')) {
        filteredByStatus = activeSubscriptions.filter(sub => {
          if (!sub.expiry_date) return false;
          const today = new Date();
          const expiryDate = new Date(sub.expiry_date);
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
        });
      }

      // Apply category filters if selected
      let filteredByCategory = filteredByStatus;
      if (selectedCategories.length > 0) {
        filteredByCategory = filteredByStatus.filter(sub => 
          selectedCategories.includes(sub.category_id || '')
        );
      }

      // Count subscriptions per category (based on the truly active ones)
      const categoryCounts = filteredByCategory.reduce((acc, sub) => {
        if (sub.category_id) {
          acc[sub.category_id] = (acc[sub.category_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Sort categories by subscription count (descending)
      const sortedCategories = categoriesData?.sort((a, b) => {
        const countA = categoryCounts[a.id!] || 0;
        const countB = categoryCounts[b.id!] || 0;
        return countB - countA;
      }) || [];

      setCategories(sortedCategories);
      setSubscriptions(filteredByCategory);
      setFilteredSubscriptions(filteredByCategory);

    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      // Only set loading false if we're not in a toggle operation
      if (!toggleLoading) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    if (!refreshing) {
      setRefreshing(true);
      loadData();
    }
  }, [refreshing]);

  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user, selectedCategories, selectedStatuses]);

  // Add logging for Expiring Soon filter
  useEffect(() => {
    if (selectedStatuses.includes('expiring_soon')) {
      // Log details of expiring soon subscriptions
      const expiringSoonSubs = filteredSubscriptions.filter(sub => {
        if (!sub.expiry_date) return false;
        const today = new Date();
        const expiryDate = new Date(sub.expiry_date);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= 30 && daysUntilExpiry > 0; // Subscriptions expiring in next 30 days
      });
      
    }
  }, [selectedStatuses, subscriptions, filteredSubscriptions]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSubscriptions(subscriptions);
    } else {
      const filtered = subscriptions.filter(sub =>
        sub.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub.domain_name && sub.domain_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (sub.vendor && sub.vendor.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredSubscriptions(filtered);
    }
  }, [searchQuery, subscriptions]);

  const handleToggleSubscriptionStatus = async (id: string, isActive: boolean) => {
    if (!user) return;

    try {
      setToggleLoading(true);
      
      // Update the local state immediately for better UX
      const updateSubscriptionState = (prevSubscriptions: Subscription[]) => 
        prevSubscriptions.map(sub => 
          sub.id === id ? { ...sub, is_active: isActive } : sub
        );
      
      setSubscriptions(updateSubscriptionState);
      setFilteredSubscriptions(updateSubscriptionState);
      
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

    Alert.alert(
      'Delete Subscriptions',
      `Are you sure you want to delete ${selectedSubscriptions.length} subscription(s)? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
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
            }
          }
        }
      ]
    );
  };

  const handleExportData = async () => {
    if (!user || Platform.OS === 'web') {
      Alert.alert('Export not available', 'Exporting is not available on web platform');
      return;
    }

    try {
      setExporting(true);

      // Generate CSV content
      const csvContent = exportSubscriptionsToCSV(subscriptions);

      // Create a temporary file
      const fileUri = `${FileSystem.documentDirectory}subscriptions_${new Date().toISOString().split('T')[0]}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent);

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Export Error', 'Failed to export subscription data');
    } finally {
      setExporting(false);
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

    // Debug log to check subscription structure

    // Filter existing subscriptions instead of reloading
    if (categoryId === null) {
      setFilteredSubscriptions(subscriptions);
    } else {
      const filtered = subscriptions.filter(sub => {

        return sub.category_id === categoryId;
      });
      setFilteredSubscriptions(filtered);
    }
  };

  // Add effect to update filtered subscriptions when activeCategory changes
  useEffect(() => {
    if (activeCategory === null) {
      setFilteredSubscriptions(subscriptions);
    } else {
      const filtered = subscriptions.filter(sub => {

        return sub.category_id === activeCategory;
      });
      setFilteredSubscriptions(filtered);
    }
  }, [activeCategory, subscriptions]);

  // Update the renderEmptyState function
  const renderEmptyState = () => {
    const hasNoSubscriptions = subscriptions.length === 0;
    const hasNoFilteredResults = filteredSubscriptions.length === 0 && subscriptions.length > 0;


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
    const allIds = filteredSubscriptions.map(sub => sub.id!);
    setSelectedSubscriptions(allIds);
  };

  const handleRemoveAll = () => {
    setSelectedSubscriptions([]);
    setSelectionMode(false);
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      onScrollBeginDrag={() => setScrolling(true)}
      onScrollEndDrag={() => setScrolling(false)}
      onMomentumScrollBegin={() => setScrolling(true)}
      onMomentumScrollEnd={() => setScrolling(false)}
      scrollEventThrottle={16}
    >
      <View style={styles.container}>
        <LinearGradient
          colors={['#4158D0', '#C850C0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        />

        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Header Section */}
          <View style={styles.headerContainer}>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => navigation.toggleDrawer()}
              >
                <Menu size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.headerActions}>
                {!selectionMode ? (
                  <>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => setSelectionMode(true)}
                    >
                      <CheckSquare size={22} color="#fff" />
                    </TouchableOpacity>


                    {/* <TouchableOpacity 
                    style={styles.iconButton}
                    onPress={handleExportData}
                    disabled={exporting}
                  >
                    {exporting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Download size={22} color="#fff" />
                    )}
                  </TouchableOpacity> */}
                    <TouchableOpacity style={styles.iconButton}>
                      <Bell size={22} color="#fff" />
                    </TouchableOpacity>
                  </>
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
            <View>
              <Text style={styles.title}>Active Subscriptions</Text>
          </View>
          {/* <Text style={styles.title}>Active Subscriptions</Text> */}
      </View>

          {/* Main Content Section */ }
          <View style={styles.mainContent}>
            {/* Touch Test Component */}
            {/* <TouchTest /> */}
            
            {/* Categories Tabs */}
            {categories.length > 0 && (
              <View style={styles.categoriesWrapper}>
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
            {filteredSubscriptions.length === 0 ? (
              renderEmptyState()
            ) : (
              <FlatList
                data={filteredSubscriptions}
                keyExtractor={(item, index) => 
                  `subscription-${item.id}-${index}`
                }
                renderItem={({ item }) => (
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
              />
            )}
          </View>

          <CustomLoader visible={toggleLoading} />
          
          <BulkActionBar
            selectedCount={selectedSubscriptions.length}
            onCancel={handleCancelSelection}
            onDelete={handleBulkDelete}
            onToggleStatus={handleBulkToggleStatus}
          />
        </SafeAreaView >
        
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
      </View >
    </ScrollView>
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
    height: 240,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  safeArea: {
    flex: 1,
    paddingBottom: Platform.OS === 'android' ? 60 : 80,
  },
  headerContainer: {
    paddingBottom: 25,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderRadius: 14,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    fontFamily: 'Inter-Regular',
  },
  searchIcon: {
    marginRight: 12,
  },
  filterButton: {
    padding: 8,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 26,
    color: '#fff',
    paddingHorizontal: 20,
    marginTop: Platform.OS === 'ios' ? -4 : 4,
    // paddingTop: 12,
  },
  mainContent: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 5 : 15,

  },
  categoriesWrapper: {
    borderBottomColor: '#e6e6f0',
  },
  categoriesContainer: {
    height: 40,
    marginTop: 12,
    marginBottom: 12,
  },
  categoriesScrollContent: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 10,
  },
  categoryTab: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#e6e6f0',
    minWidth: 80,
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
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#4158D0',
  },
  activeBadgeText: {
    color: '#fff',
  },
  categoryTabText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#4158D0',
    textAlign: 'center',
  },
  activeCategoryTabText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
  },
  listContent: {
    paddingHorizontal: 20,
    marginTop: 18,
    paddingBottom: Platform.OS === 'android' ? 30 : 20,
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
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#2c3e50',
  },
  countBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  countText: {
    fontFamily: 'Inter-Medium',
    color: '#fff',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
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
    shadowColor: '#4158D0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addFirstIcon: {
    marginRight: 8,
  },
  addFirstText: {
    fontFamily: 'Inter-Medium',
    color: '#fff',
    fontSize: 14,
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
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  activeCategoryTab: {
    // Add definition for the missing style
    // Minimal style, as gradient is applied internally
  },
  contentContainer: {
    // Add any necessary styles for the content container
  },
});