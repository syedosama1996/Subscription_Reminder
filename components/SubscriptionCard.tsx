import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Switch,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Calendar,
  Clock,
  ExternalLink,
  CheckSquare,
  Square,
} from 'lucide-react-native';
import { Subscription } from '../lib/subscriptions';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import StatusToggle from './StatusToggle';
import CategoryBadge from './CategoryBadge';
import { TouchableOpacity } from 'react-native-gesture-handler';

interface SubscriptionCardProps {
  subscription: Subscription;
  onToggleStatus: (isActive: boolean) => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelection?: () => void;
  disabled?: boolean;
  onPress?: () => void;
  onRefresh?: () => void;
  simpleExpiryDisplay?: boolean;
  hideToggle?: boolean;
}

// Global scroll state
let isScrolling = false;
let scrollTimeout: NodeJS.Timeout;

export const setScrolling = (scrolling: boolean) => {
  isScrolling = scrolling;
  if (scrolling) {
    clearTimeout(scrollTimeout);
  } else {
    scrollTimeout = setTimeout(() => {
      isScrolling = false;
    }, 150);
  }
};

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  onToggleStatus,
  selectionMode = false,
  selected = false,
  onToggleSelection,
  disabled = false,
  onPress,
  onRefresh,
  simpleExpiryDisplay,
  hideToggle = false,
}) => {
  const router = useRouter();
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const [touchStartY, setTouchStartY] = useState<number>(0);
  const [lastTouchTime, setLastTouchTime] = useState(0);

  // Calculate days until expiry
  const daysUntilExpiry = () => {
    const today = new Date();
    const expiryDate = new Date(subscription.expiry_date);
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const days = daysUntilExpiry();

  // Determine status color based on days until expiry
  const getStatusColor = () => {
    if (subscription.is_active === false) return '#7f8c8d'; // Inactive - gray
    if (days < 0) return '#e74c3c'; // Expired - red
    if (days <= 7) return '#e67e22'; // Expiring soon - orange
    if (days <= 30) return '#f1c40f'; // Expiring in a month - yellow
    return '#2ecc71'; // Good standing - green
  };

  // Determine gradient colors based on status
  const getGradientColors = () => {
    if (subscription.is_active === false)
      return ['#7f8c8d', '#95a5a6'] as const; // Inactive
    if (days < 0) return ['#e74c3c', '#c0392b'] as const; // Expired
    if (days <= 7) return ['#e67e22', '#d35400'] as const; // Expiring soon
    if (days <= 30) return ['#f1c40f', '#f39c12'] as const; // Expiring in a month
    return ['#2ecc71', '#27ae60'] as const; // Good standing
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handlePress = () => {
    if (disabled || isScrolling) return;

    const now = Date.now();
    if (now - touchStartTime < 200) return; // Ignore quick touches

    if (selectionMode) {
      onToggleSelection?.();
    } else {
      onPress ? onPress() : router.push(`/subscription/${subscription.id}`);
    }
  };

  const handlePressIn = () => {
    setTouchStartTime(Date.now());
    setTouchStartY(0);
  };

  const handlePressOut = (event?: any) => {
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - touchStartTime;

    // Add null check for event and nativeEvent
    if (!event || !event.nativeEvent) {
      return;
    }

    const touchEndY = event.nativeEvent.pageY;
    const touchDistance = Math.abs(touchEndY - touchStartY);

    // Only trigger if not scrolling and touch duration is less than 200ms
    if (!isScrolling && touchDuration < 200) {
      if (selectionMode) {
        onToggleSelection?.();
      } else {
        onPress ? onPress() : router.push(`/subscription/${subscription.id}`);
      }
    }
  };

  // Removed long press functionality - selection mode only through top button

  // Add a wrapper for onToggleStatus to refresh the screen after toggling
  const handleToggleStatus = async (isActive: boolean) => {
    if (onToggleStatus && !disabled) {
      try {
        await onToggleStatus(isActive);
        // Call the refresh callback without delay
        if (onRefresh) {
          onRefresh();
        }
      } catch (error) {
        console.error('Error toggling subscription status:', error);
      }
    }
  };

  // Handler to prevent toggle area from triggering card press
  const handleTogglePress = () => {
    // Do nothing - this prevents the card press event
  };

  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.selectedCard]}
      onPress={handlePress}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={0.7}
      delayPressIn={100}
    >
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={80}
          tint="light"
          style={[styles.card, days < 0 && styles.expiredCard]}
        >
          {selected && <View style={styles.selectionOverlay} />}
          <View style={styles.cardContent}>
            <View style={styles.header}>
              {selectionMode ? (
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={onToggleSelection}
                >
                  {selected ? (
                    <CheckSquare size={22} color="#4158D0" />
                  ) : (
                    <Square size={22} color="#7f8c8d" />
                  )}
                </TouchableOpacity>
              ) : null}

              <Text style={styles.serviceName}>
                {subscription.service_name}
              </Text>
              {!hideToggle && typeof onToggleStatus === 'function' && (
                <TouchableOpacity
                  style={styles.toggleContainer}
                  onPress={handleTogglePress}
                  activeOpacity={1}
                >
                  <StatusToggle
                    subscription={subscription}
                    onToggle={handleToggleStatus}
                    disabled={disabled}
                  />
                </TouchableOpacity>
              )}
            </View>

            {subscription.category && subscription.domain_name && (
              <View style={styles.infoRow}>
                <View style={styles.leftContent}>
                  <ExternalLink size={16} color="#7f8c8d" />
                  <Text style={styles.infoText}>{subscription.domain_name}</Text>
                </View>
                <CategoryBadge category={subscription.category} />
              </View>
            )}

            {subscription.category && !subscription.domain_name && (
              <View style={styles.infoRow}>
                <View style={styles.leftContent} />
                <CategoryBadge category={subscription.category} />
              </View>
            )}

            {!subscription.category && subscription.domain_name && (
              <View style={styles.infoRow}>
                <ExternalLink size={16} color="#7f8c8d" />
                <Text style={styles.infoText}>{subscription.domain_name}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Calendar size={16} color="#7f8c8d" />
              <Text style={styles.infoText}>
                Expires: {formatDate(subscription.expiry_date)}
              </Text>
            </View>

            <View style={styles.footer}>
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>PKR</Text>
                <Text style={styles.price}>
                  {subscription.purchase_amount_pkr.toLocaleString()}
                </Text>
              </View>

              <View style={styles.expiryContainer}>
                <View style={styles.expiryContent}>
                  <Clock size={14} color={getStatusColor()} />
                  <Text style={[styles.expiryText, { color: getStatusColor() }]}>
                    {subscription.is_active === false
                      ? 'Inactive'
                      : days < 0
                      ? 'Expired'
                      : simpleExpiryDisplay
                      ? `${days} days left`
                      : days === 0
                      ? 'Expired'
                      : `${days} days left`}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </BlurView>
      ) : (
        <View style={[styles.card, days < 0 && styles.expiredCard]}>
          <LinearGradient
            colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)']}
            style={styles.cardGradient}
          />
          {selected && <View style={styles.selectionOverlay} />}
          <View style={styles.cardContent}>
            <View style={styles.header}>
              {selectionMode ? (
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={onToggleSelection}
                >
                  {selected ? (
                    <CheckSquare size={22} color="#4158D0" />
                  ) : (
                    <Square size={22} color="#7f8c8d" />
                  )}
                </TouchableOpacity>
              ) : null}

              <Text style={styles.serviceName}>
                {subscription.service_name}
                
              </Text>
              {!hideToggle && typeof onToggleStatus === 'function' && (
                <TouchableOpacity
                  style={styles.toggleContainer}
                  onPress={handleTogglePress}
                  activeOpacity={1}
                >
                  <StatusToggle
                    subscription={subscription}
                    onToggle={handleToggleStatus}
                    disabled={disabled}
                  />
                </TouchableOpacity>
              )}
            </View>

            {subscription.category && subscription.domain_name && (
              <View style={styles.infoRow}>
                <View style={styles.leftContent}>
                  <ExternalLink size={16} color="#7f8c8d" />
                  <Text style={styles.infoText}>{subscription.domain_name}</Text>
                </View>
                <CategoryBadge category={subscription.category} />
              </View>
            )}

            {subscription.category && !subscription.domain_name && (
              <View style={styles.infoRow}>
                <View style={styles.leftContent} />
                <CategoryBadge category={subscription.category} />
              </View>
            )}

            {!subscription.category && subscription.domain_name && (
              <View style={styles.infoRow}>
                <ExternalLink size={16} color="#7f8c8d" />
                <Text style={styles.infoText}>{subscription.domain_name}</Text>
              </View>
            )}

            <View style={styles.infoRow2}>
              <Calendar size={16} color="#7f8c8d" />
              <Text style={styles.infoText}>
                Expires: {formatDate(subscription.expiry_date)}
              </Text>
            </View>

            <View style={styles.footer}>
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>PKR</Text>
                <Text style={styles.price}>
                  {subscription.purchase_amount_pkr.toLocaleString()}
                </Text>
              </View>

              <View style={styles.expiryContainer}>
                <View style={styles.expiryContent}>
                  <Clock size={14} color={getStatusColor()} />
                  <Text style={[styles.expiryText, { color: getStatusColor() }]}>
                    {subscription.is_active === false
                      ? 'Inactive'
                      : days < 0
                      ? 'Expired'
                      : simpleExpiryDisplay
                      ? `${days} days left`
                      : days === 0
                      ? 'Expires today'
                      : `${days} days left`}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      <View style={[styles.statusBar, { backgroundColor: getStatusColor() }]}>
     
      
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  card: {
    borderRadius: 14,
    backgroundColor: '#ffffff',
    position: 'relative',
    overflow: 'hidden',
  },
  selectedCard: {
    borderWidth: 2.5,
    borderColor: '#4158D0',
    shadowColor: '#4158D0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    transform: [{ scale: 1.02 }],
  },
  expiredCard: {
  },
  cardContent: {
    padding: 14,
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  statusBar: {
    height: 6,
    width: '100%',
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  statusGradient: {
    height: '100%',
    width: '100%',
  },
  statusIconContainer: {
    position: 'absolute',
    right: 8,
    top: -3,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  serviceName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1f2937',
    flex: 1,
  },

  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoRow2: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#7f8c8d',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#7f8c8d',
    marginRight: 4,
  },
  price: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#2c3e50',
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  expiryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expiryText: {
    marginLeft: 4,
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  toggleContainer: {
    marginRight: 12,
  },
  selectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(65, 88, 208, 0.03)',
    zIndex: 1,
    borderRadius: 20,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
});

export default SubscriptionCard;
