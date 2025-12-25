import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { getCardsWithSubscriptions, CardInfo, Subscription } from '../../lib/subscriptions';
import { CreditCard, Building2, User, ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { FONT_FAMILY } from '../../constants/Typography';
import CustomLoader from '../../components/CustomLoader';

export default function CardManagementScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [cards, setCards] = useState<CardInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadCards();
    }
  }, [user]);

  const loadCards = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await getCardsWithSubscriptions(user.id);
      setCards(data);
    } catch (error) {
      console.error('Error loading cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCard = (cardKey: string) => {
    setExpandedCard(expandedCard === cardKey ? null : cardKey);
  };

  const getCardKey = (card: CardInfo) => {
    return `${card.bank_name}_${card.card_last_four}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderSubscriptionItem = (subscription: Subscription) => {
    const isExpired = new Date(subscription.expiry_date) < new Date();
    const isActive = subscription.is_active && !isExpired;

    return (
      <TouchableOpacity
        style={styles.subscriptionItem}
        onPress={() => router.push(`/subscription/${subscription.id}`)}
      >
        <View style={styles.subscriptionHeader}>
          <View style={styles.subscriptionInfo}>
            <Text style={styles.subscriptionName}>{subscription.service_name}</Text>
            <View style={styles.subscriptionMeta}>
              <Text style={styles.subscriptionDate}>
                Expires: {formatDate(subscription.expiry_date)}
              </Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: isActive ? '#d4edda' : '#f8d7da' }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: isActive ? '#155724' : '#721c24' }
                ]}>
                  {isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.subscriptionAmount}>
            <Text style={styles.amountText}>
              PKR {subscription.purchase_amount_pkr.toLocaleString()}
            </Text>
            {subscription.payment_type && (
              <Text style={styles.paymentTypeText}>
                {subscription.payment_type === 'recurring' ? '🔄 Recurring' : '💳 One-time'}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCard = ({ item: card }: { item: CardInfo }) => {
    const cardKey = getCardKey(card);
    const isExpanded = expandedCard === cardKey;

    return (
      <View style={styles.cardContainer}>
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => toggleCard(cardKey)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeaderLeft}>
            <View style={styles.cardIconContainer}>
              <CreditCard size={24} color="#4158D0" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardBankName}>{card.bank_name}</Text>
              <Text style={styles.cardDetails}>
                {card.card_holder_name} • ****{card.card_last_four}
              </Text>
            </View>
          </View>
          <View style={styles.cardHeaderRight}>
            <View style={styles.subscriptionCountBadge}>
              <Text style={styles.subscriptionCountText}>
                {card.total_subscriptions}
              </Text>
            </View>
            <RefreshCw 
              size={20} 
              color="#7f8c8d" 
              style={[
                styles.expandIcon,
                isExpanded && styles.expandIconRotated
              ]} 
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.subscriptionsList}>
            {card.subscriptions.length > 0 ? (
              <>
                <Text style={styles.subscriptionsTitle}>
                  Subscriptions ({card.subscriptions.length})
                </Text>
                {card.subscriptions.map((subscription) => (
                  <View key={subscription.id}>
                    {renderSubscriptionItem(subscription)}
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.emptySubscriptions}>
                <Text style={styles.emptyText}>No subscriptions found</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
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
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={22} color="#2c3e50" />
            </TouchableOpacity>
            <View style={styles.headerLeft}>
              <MaskedView
                maskElement={<Text style={styles.title}>Card Management</Text>}
              >
                <LinearGradient
                  colors={['#4158D0', '#C850C0']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={[styles.title, { opacity: 0 }]}>Card Management</Text>
                </LinearGradient>
              </MaskedView>
            </View>
            <View style={styles.placeholder} />
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.safeArea}>
        {cards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CreditCard size={60} color="#C850C0" />
            <Text style={styles.emptyTitle}>No Cards Found</Text>
            <Text style={styles.emptyDescription}>
              Add card information when creating a subscription to see it here
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/(app)/(tabs)/add')}
            >
              <Text style={styles.addButtonText}>Add Subscription</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={cards}
            renderItem={renderCard}
            keyExtractor={(item) => getCardKey(item)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshing={loading}
            onRefresh={loadCards}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  safeAreaTop: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  placeholder: {
    width: 34,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  cardContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardBankName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 4,
  },
  cardDetails: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    color: '#7f8c8d',
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subscriptionCountBadge: {
    backgroundColor: '#4158D0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 32,
    alignItems: 'center',
  },
  subscriptionCountText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#fff',
  },
  expandIcon: {
    transform: [{ rotate: '0deg' }],
  },
  expandIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  subscriptionsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  subscriptionsTitle: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 14,
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 12,
  },
  subscriptionItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4158D0',
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    color: '#2c3e50',
    marginBottom: 8,
  },
  subscriptionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subscriptionDate: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#7f8c8d',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
  },
  subscriptionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 4,
  },
  paymentTypeText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#7f8c8d',
  },
  emptySubscriptions: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: '#7f8c8d',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    color: '#2c3e50',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyDescription: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#4158D0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addButtonText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: '#fff',
  },
});

