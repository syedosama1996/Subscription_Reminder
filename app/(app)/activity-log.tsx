import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, ActivityIndicator, RefreshControl, Alert, Modal, TouchableOpacity   } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { Activity, Filter, Clock, CheckCircle, AlertCircle, Info, Plus, Trash2, Edit, Power, RefreshCw, ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityLogger } from '../../lib/services/activity-logger';
import { useRouter } from 'expo-router';
import CustomLoader from '@/components/CustomLoader';
import { supabase } from '../../lib/supabase';

interface ActivityItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
  subscription_name?: string; // Will be populated for subscription activities
}

export default function ActivityLogScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [timeUpdateInterval, setTimeUpdateInterval] = useState<NodeJS.Timeout | null>(null);
  const [error, setError] = useState<string | null>(null);

  const PAGE_SIZE = 50;

  const filterOptions = [
    { id: 'all', label: 'All Activities' },
    { id: 'create', label: 'Created' },
    { id: 'update', label: 'Updated' },
    { id: 'delete', label: 'Deleted' },
  ];

  const handleFilterSelect = (filterId: string) => {
    setSelectedFilter(filterId);
    setShowFilterMenu(false);
  };

  useEffect(() => {
    loadActivities();

    // Set up an interval to update relative times every minute
    const interval = setInterval(() => {
      // Force a re-render to update relative times
      setActivities(prevActivities => [...prevActivities]);
    }, 60000); // Update every minute

    setTimeUpdateInterval(interval);

    return () => {
      if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
      }
    };
  }, []);

  const loadActivities = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const data = await ActivityLogger.getUserActivities(user.id, {
        limit: PAGE_SIZE,
        offset: 0
      });
      if (data.activities.length === 0) {
        setActivities([]);
      } else {
        // Enrich activities with subscription names if needed
        const enrichedActivities = await enrichActivitiesWithSubscriptionNames(data.activities);
        setActivities(enrichedActivities);
      }
      setHasMore(data.hasMore);
      setTotalCount(data.totalCount);
    } catch (err) {
      setError('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to enrich activities with subscription names
  const enrichActivitiesWithSubscriptionNames = async (activities: ActivityItem[]) => {
    const enriched = await Promise.all(activities.map(async (activity) => {
      // If it's a subscription activity and doesn't have service_name in details
      if (activity.entity_type === 'subscription' && activity.entity_id) {
        // Check if service_name is already in details
        if (!activity.details?.service_name && !activity.details?.name) {
          try {
            // Try to fetch subscription name
            const { data: subscription } = await supabase
              .from('subscriptions')
              .select('service_name')
              .eq('id', activity.entity_id)
              .single();
            
            if (subscription?.service_name) {
              return {
                ...activity,
                details: {
                  ...activity.details,
                  service_name: subscription.service_name
                }
              };
            }
          } catch (err) {
            console.error('Error fetching subscription name:', err);
          }
        }
      }
      return activity;
    }));
    return enriched;
  };

  const loadMoreActivities = async () => {
    if (!user || loading || !hasMore) return;

    try {
      setLoadingMore(true);
      const lastActivity = activities[activities.length - 1];
      const data = await ActivityLogger.getUserActivities(user.id, {
        limit: PAGE_SIZE,
        offset: offset + PAGE_SIZE
      });

      if (data.activities.length > 0) {
        const enrichedActivities = await enrichActivitiesWithSubscriptionNames(data.activities);
        setActivities(prev => [...prev, ...enrichedActivities]);
        setOffset(offset + PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      setError('Failed to load more activities');
    } finally {
      setLoadingMore(false);
    }
  };

  const onRefresh = () => {
    loadActivities();
  };

  const onEndReached = () => {
    if (hasMore && !loadingMore) {
      loadMoreActivities();
    }
  };

  const getIconColor = (action: string) => {
    switch (action) {
      case 'create':
        return '#10B981'; // Emerald green
      case 'update':
        return '#3B82F6'; // Blue
      case 'delete':
        return '#EF4444'; // Red
      case 'activate':
        return '#10B981'; // Emerald green
      case 'deactivate':
        return '#EF4444'; // Red
      case 'renew':
        return '#8B5CF6'; // Purple
      default:
        return '#6B7280'; // Gray
    }
  };

  const getTextColor = (action: string) => {
    switch (action) {
      case 'create':
        return '#059669'; // Darker green
      case 'update':
        return '#2563EB'; // Darker blue
      case 'delete':
        return '#DC2626'; // Darker red
      case 'activate':
        return '#059669'; // Darker green
      case 'deactivate':
        return '#DC2626'; // Darker red
      case 'renew':
        return '#7C3AED'; // Darker purple
      default:
        return '#4B5563'; // Darker gray
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return Plus;
      case 'update':
        return Edit;
      case 'delete':
        return Trash2;
      case 'activate':
        return Power;
      case 'deactivate':
        return Power;
      case 'renew':
        return RefreshCw;
      default:
        return Info;
    }
  };

  const getActivityDescription = (activity: ActivityItem) => {
    const entityName = activity.details?.service_name || activity.details?.name || 'subscription';
    const entityType = activity.entity_type.charAt(0).toUpperCase() + activity.entity_type.slice(1);
    const textColor = getTextColor(activity.action);

    switch (activity.action) {
      case 'create':
        return { text: `Created ${entityType} "${entityName}"`, color: textColor };
      case 'update':
        return { text: `Updated ${entityType} "${entityName}"`, color: textColor };
      case 'delete':
        return { text: `Deleted ${entityType} "${entityName}"`, color: textColor };
      case 'activate':
        return { text: `Activated Subscription "${entityName}"`, color: textColor };
      case 'deactivate':
        return { text: `Deactivated Subscription "${entityName}"`, color: textColor };
      case 'renew':
        return { text: `Renewed ${entityType} "${entityName}"`, color: textColor };
      default:
        return { text: `${activity.action} ${entityType}`, color: textColor };
    }
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} ${diffInMinutes === 1 ? 'min' : 'mins'} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
    }

    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
  };

  const filteredActivities = activities.filter(activity =>
    selectedFilter === 'all' || activity.action === selectedFilter
  );

  const renderActivityItem = ({ item }: { item: ActivityItem }) => {
    const ActionIcon = getActionIcon(item.action);
    const iconColor = getIconColor(item.action);
    const description = getActivityDescription(item);
    const relativeTime = getRelativeTime(item.created_at);

    return (
      <View style={styles.activityCard}>
        <View style={styles.activityContent}>
          <View style={[
            styles.iconContainer, 
            { 
              backgroundColor: iconColor
            }
          ]}>
            <ActionIcon size={22} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <View style={styles.activityInfo}>
            <Text style={[styles.activityTitle, { color: description.color }]}>
              {description.text}
            </Text>
            <View style={styles.activityFooter}>
              <Clock size={14} color="#9CA3AF" />
              <Text style={styles.timestamp}>{relativeTime}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#4158D0" />
        <Text style={styles.footerText}>Loading more activities...</Text>
      </View>
    );
  };

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
        <Text style={styles.title}>Activity Log</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterMenu(true)}
        >
          <Filter size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showFilterMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterMenu(false)}
        >
          <View style={styles.filterMenu}>
            {filterOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.filterMenuItem,
                  selectedFilter === option.id && styles.filterMenuItemActive
                ]}
                onPress={() => handleFilterSelect(option.id)}
              >
                <Text style={[
                  styles.filterMenuText,
                  selectedFilter === option.id && styles.filterMenuTextActive
                ]}>
                  {option.label}
                </Text>
                {selectedFilter === option.id && (
                  <CheckCircle size={20} color="#4158D0" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {filteredActivities.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Activity size={48} color="#7f8c8d" />
          <Text style={styles.emptyText}>No activities found</Text>
          <Text style={styles.emptySubtext}>Pull down to refresh</Text>
        </View>
      ) : (
        <FlatList
          data={filteredActivities}
          renderItem={renderActivityItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4158D0']}
              tintColor="#4158D0"
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7f8c8d',
    fontFamily: 'Inter-Regular',
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

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 10,
    textAlign: 'center',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  activeFilterTab: {
    backgroundColor: '#fff',
  },
  filterText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  activeFilterText: {
    color: '#4158D0',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  activityInfo: {
    flex: 1,
    paddingTop: 2,
  },
  activityTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  activityDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginTop: 4,
  },
  activityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 6,
    letterSpacing: 0.2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginTop: 20,
    letterSpacing: -0.3,
  },
  emptySubtext: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#7f8c8d',
    fontFamily: 'Inter-Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: 100,
  },
  filterMenu: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  filterMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginBottom: 4,
  },
  filterMenuItemActive: {
    backgroundColor: 'rgba(65, 88, 208, 0.1)',
  },
  filterMenuText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    letterSpacing: -0.2,
  },
  filterMenuTextActive: {
    color: '#4158D0',
    fontFamily: 'Inter-SemiBold',
  },
}); 