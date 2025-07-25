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
          style={[styles.card, selected && styles.selectedCard]}
        >
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
              {typeof onToggleStatus === 'function' && (
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

            {subscription.category && (
              <View style={styles.categoryContainer}>
                <CategoryBadge category={subscription.category} />
              </View>
            )}

            {subscription.domain_name && (
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
        </BlurView>
      ) : (
        <View style={[styles.card, selected && styles.selectedCard]}>
          <LinearGradient
            colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)']}
            style={styles.cardGradient}
          />
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
              {typeof onToggleStatus === 'function' && (
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

            {subscription.category && (
              <View style={styles.categoryContainer}>
                <CategoryBadge category={subscription.category} />
              </View>
            )}

            {subscription.domain_name && (
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
      )}

      <View style={[styles.statusBar, { backgroundColor: getStatusColor() }]}>
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.statusGradient}
        />
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
    borderRadius: 20,
    backgroundColor:
      Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.7)' : 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#4158D0',
  },
  cardContent: {
    padding: 16,
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
  },
  statusGradient: {
    height: '100%',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  serviceName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#2c3e50',
    flex: 1,
  },
  categoryContainer: {
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#7f8c8d',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(241, 242, 246, 0.5)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expiryText: {
    marginLeft: 4,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  toggleContainer: {
    marginRight: 12,
  },
});

export default SubscriptionCard;
