import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { 
  getSubscription, 
  updateSubscription, 
  deleteSubscription, 
  renewSubscription,
  Subscription, 
  Reminder,
  SubscriptionHistory
} from '../../lib/subscriptions';
import Button from '../../components/Button';
import ReminderItem from '../../components/ReminderItem';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  DollarSign, 
  CreditCard as Edit, 
  ExternalLink, 
  Globe, 
  Key, 
  Mail, 
  Trash2, 
  User, 
  Link,
  History,
  X,
  Check
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { TouchableOpacity } from 'react-native-gesture-handler';

export default function SubscriptionDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedSubscription, setEditedSubscription] = useState<Partial<Subscription>>({});
  
  // Renewal modal state
  const [renewModalVisible, setRenewModalVisible] = useState(false);
  const [renewalData, setRenewalData] = useState({
    purchase_date: new Date(),
    expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    purchase_amount_pkr: '',
    purchase_amount_usd: '',
    sameVendor: true,
    vendor: '',
    vendor_link: ''
  });
  
  // Date picker state
  const [showRenewPurchaseDatePicker, setShowRenewPurchaseDatePicker] = useState(false);
  const [showRenewExpiryDatePicker, setShowRenewExpiryDatePicker] = useState(false);
  
  // History modal state
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, [id]);

  const loadSubscription = async () => {
    if (!id || typeof id !== 'string') {
      setError('Invalid subscription ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getSubscription(id);
      setSubscription(data);
      
      // Initialize edited subscription with current data
      setEditedSubscription({
        ...data,
        service_name: data.service_name,
        domain_name: data.domain_name,
        purchase_date: data.purchase_date,
        expiry_date: data.expiry_date,
        purchase_amount_pkr: data.purchase_amount_pkr,
        purchase_amount_usd: data.purchase_amount_usd,
        email: data.email,
        username: data.username,
        password: data.password,
        notes: data.notes,
        vendor: data.vendor,
        vendor_link: data.vendor_link
      });
      
      // Initialize renewal data
      setRenewalData({
        ...renewalData,
        purchase_amount_pkr: data.purchase_amount_pkr.toString(),
        purchase_amount_usd: data.purchase_amount_usd ? data.purchase_amount_usd.toString() : '',
        vendor: data.vendor || '',
        vendor_link: data.vendor_link || ''
      });
    } catch (err) {
      console.error('Error loading subscription:', err);
      setError('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Subscription',
      'Are you sure you want to delete this subscription? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              if (!subscription?.id || !user) return;
              await deleteSubscription(subscription.id, user.id);
              router.replace('/');
            } catch (err) {
              console.error('Error deleting subscription:', err);
              Alert.alert('Error', 'Failed to delete subscription');
            }
          }
        }
      ]
    );
  };
  
  const handleEdit = () => {
    setIsEditing(true);
  };
  
  const handleCancelEdit = () => {
    // Reset edited subscription to current data
    if (subscription) {
      setEditedSubscription({
        ...subscription,
        service_name: subscription.service_name,
        domain_name: subscription.domain_name,
        purchase_date: subscription.purchase_date,
        expiry_date: subscription.expiry_date,
        purchase_amount_pkr: subscription.purchase_amount_pkr,
        purchase_amount_usd: subscription.purchase_amount_usd,
        email: subscription.email,
        username: subscription.username,
        password: subscription.password,
        notes: subscription.notes,
        vendor: subscription.vendor,
        vendor_link: subscription.vendor_link
      });
    }
    setIsEditing(false);
  };
  
  const handleSaveEdit = async () => {
    if (!subscription?.id || !user) return;
    
    try {
      setLoading(true);
      await updateSubscription(subscription.id, editedSubscription, user.id);
      await loadSubscription();
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating subscription:', err);
      Alert.alert('Error', 'Failed to update subscription');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRenewSubscription = () => {
    if (!subscription) return;
    
    // Initialize renewal data with current subscription data
    setRenewalData({
      purchase_date: new Date(),
      expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      purchase_amount_pkr: subscription.purchase_amount_pkr.toString(),
      purchase_amount_usd: subscription.purchase_amount_usd ? subscription.purchase_amount_usd.toString() : '',
      sameVendor: true,
      vendor: subscription.vendor || '',
      vendor_link: subscription.vendor_link || ''
    });
    
    setRenewModalVisible(true);
  };
  
  const handleSaveRenewal = async () => {
    if (!subscription?.id || !user) return;
    
    try {
      setLoading(true);
      
      await renewSubscription(subscription.id, {
        purchase_date: renewalData.purchase_date.toISOString(),
        expiry_date: renewalData.expiry_date.toISOString(),
        purchase_amount_pkr: parseFloat(renewalData.purchase_amount_pkr) || 0,
        purchase_amount_usd: renewalData.purchase_amount_usd ? parseFloat(renewalData.purchase_amount_usd) : undefined,
        vendor: renewalData.sameVendor ? subscription.vendor : renewalData.vendor,
        vendor_link: renewalData.sameVendor ? subscription.vendor_link : renewalData.vendor_link
      }, user.id);
      
      setRenewModalVisible(false);
      await loadSubscription();
      
      Alert.alert('Success', 'Subscription renewed successfully');
    } catch (err) {
      console.error('Error renewing subscription:', err);
      Alert.alert('Error', 'Failed to renew subscription');
    } finally {
      setLoading(false);
    }
  };
  
  const handleViewHistory = () => {
    setHistoryModalVisible(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Calculate days until expiry
  const getDaysUntilExpiry = () => {
    if (!subscription) return 0;
    
    const today = new Date();
    const expiryDate = new Date(subscription.expiry_date);
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const days = getDaysUntilExpiry();
  
  // Determine status color based on days until expiry
  const getStatusColor = () => {
    if (days < 0) return '#e74c3c'; // Expired - red
    if (days <= 7) return '#e67e22'; // Expiring soon - orange
    if (days <= 30) return '#f1c40f'; // Expiring in a month - yellow
    return '#2ecc71'; // Good standing - green
  };

  const getStatusText = () => {
    if (days < 0) return 'Expired';
    if (days === 0) return 'Expires today';
    if (days === 1) return 'Expires tomorrow';
    return `${days} days until expiry`;
  };
  
  // Custom date picker for web platform
  const renderWebDatePicker = (
    currentDate: Date, 
    onChange: (date: Date) => void,
    label: string
  ) => {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.webDatePickerContainer}>
          <Text style={styles.dateLabel}>{label}</Text>
          <input
            type="date"
            value={currentDate.toISOString().split('T')[0]}
            onChange={(e) => {
              const newDate = new Date(e.target.value);
              onChange(newDate);
            }}
            style={{
              height: 48,
              borderRadius: 16,
              paddingHorizontal: 16,
              fontSize: 16,
              borderWidth: 1,
              borderColor: '#dfe4ea',
              backgroundColor: '#f5f6fa',
              width: '100%',
              paddingLeft: 16,
              paddingRight: 16,
            }}
          />
        </View>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (error || !subscription) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.title}>Error</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Subscription not found'}</Text>
          <Button 
            title="Go Back" 
            onPress={() => router.back()} 
            style={styles.errorButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={styles.title}>Subscription</Text>
        <View style={styles.headerActions}>
          {isEditing ? (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancelEdit}
              >
                <X size={22} color="#e74c3c" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSaveEdit}
              >
                <Check size={22} color="#2ecc71" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleDelete}
              >
                <Trash2 size={22} color="#e74c3c" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleEdit}
              >
                <Edit size={22} color="#3498db" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.statusBar}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription Details</Text>
          
          <View style={styles.detailRow}>
            <Globe size={20} color="#7f8c8d" style={styles.detailIcon} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Service</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={editedSubscription.service_name}
                  onChangeText={(text) => setEditedSubscription({...editedSubscription, service_name: text})}
                  placeholder="Service name"
                />
              ) : (
                <Text style={styles.detailValue}>{subscription.service_name}</Text>
              )}
            </View>
          </View>

          <View style={styles.detailRow}>
            <ExternalLink size={20} color="#7f8c8d" style={styles.detailIcon} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Domain</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={editedSubscription.domain_name}
                  onChangeText={(text) => setEditedSubscription({...editedSubscription, domain_name: text})}
                  placeholder="example.com"
                />
              ) : (
                <Text style={styles.detailValue}>{subscription.domain_name || 'N/A'}</Text>
              )}
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <User size={20} color="#7f8c8d" style={styles.detailIcon} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Vendor</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={editedSubscription.vendor}
                  onChangeText={(text) => setEditedSubscription({...editedSubscription, vendor: text})}
                  placeholder="Vendor name"
                />
              ) : (
                <Text style={styles.detailValue}>{subscription.vendor || 'N/A'}</Text>
              )}
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Link size={20} color="#7f8c8d" style={styles.detailIcon} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Vendor Link</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={editedSubscription.vendor_link}
                  onChangeText={(text) => setEditedSubscription({...editedSubscription, vendor_link: text})}
                  placeholder="https://vendor-website.com"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              ) : (
                subscription.vendor_link ? (
                  <Text style={styles.detailLink}>{subscription.vendor_link}</Text>
                ) : (
                  <Text style={styles.detailValue}>N/A</Text>
                )
              )}
            </View>
          </View>

          <View style={styles.detailRow}>
            <Calendar size={20} color="#7f8c8d" style={styles.detailIcon} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Purchase Date</Text>
              <Text style={styles.detailValue}>{formatDate(subscription.purchase_date)}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Calendar size={20} color="#7f8c8d" style={styles.detailIcon} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Expiry Date</Text>
              <Text style={styles.detailValue}>{formatDate(subscription.expiry_date)}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <DollarSign size={20} color="#7f8c8d" style={styles.detailIcon} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Amount (PKR)</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={editedSubscription.purchase_amount_pkr?.toString()}
                  onChangeText={(text) => setEditedSubscription({...editedSubscription, purchase_amount_pkr: parseFloat(text) || 0})}
                  placeholder="0"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.detailValue}>{subscription.purchase_amount_pkr.toLocaleString()}</Text>
              )}
            </View>
          </View>

          <View style={styles.detailRow}>
            <DollarSign size={20} color="#7f8c8d" style={styles.detailIcon} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Amount (USD)</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={editedSubscription.purchase_amount_usd?.toString()}
                  onChangeText={(text) => setEditedSubscription({...editedSubscription, purchase_amount_usd: parseFloat(text) || 0})}
                  placeholder="0"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.detailValue}>
                  {subscription.purchase_amount_usd ? `$${subscription.purchase_amount_usd.toLocaleString()}` : 'N/A'}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <View style={styles.detailRow}>
            <Mail size={20} color="#7f8c8d" style={styles.detailIcon} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Email</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={editedSubscription.email}
                  onChangeText={(text) => setEditedSubscription({...editedSubscription, email: text})}
                  placeholder="account@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : (
                <Text style={styles.detailValue}>{subscription.email || 'N/A'}</Text>
              )}
            </View>
          </View>

          <View style={styles.detailRow}>
            <User size={20} color="#7f8c8d" style={styles.detailIcon} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Username</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={editedSubscription.username}
                  onChangeText={(text) => setEditedSubscription({...editedSubscription, username: text})}
                  placeholder="username"
                />
              ) : (
                <Text style={styles.detailValue}>{subscription.username || 'N/A'}</Text>
              )}
            </View>
          </View>

          <View style={styles.detailRow}>
            <Key size={20} color="#7f8c8d" style={styles.detailIcon} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Password</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={editedSubscription.password}
                  onChangeText={(text) => setEditedSubscription({...editedSubscription, password: text})}
                  placeholder="password"
                  secureTextEntry={!isEditing}
                />
              ) : (
                <>
                  <Text style={styles.detailValue}>{subscription.password ? '••••••••' : 'N/A'}</Text>
                  {subscription.password && (
                    <TouchableOpacity 
                      onPress={() => Alert.alert('Password', subscription.password || '')}
                      style={styles.showPasswordButton}
                    >
                      <Text style={styles.showPasswordText}>Show</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          {isEditing ? (
            <TextInput
              style={styles.editNotesInput}
              value={editedSubscription.notes}
              onChangeText={(text) => setEditedSubscription({...editedSubscription, notes: text})}
              placeholder="Add notes here..."
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
            />
          ) : (
            <Text style={styles.notesText}>{subscription.notes || 'No notes added'}</Text>
          )}
        </View>

        {subscription.reminders && subscription.reminders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reminders</Text>
            {subscription.reminders.map((reminder: Reminder) => (
              <ReminderItem 
                key={reminder.id} 
                reminder={reminder} 
                onUpdate={loadSubscription}
              />
            ))}
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.historyButton}
          onPress={handleViewHistory}
        >
          <History size={18} color="#3498db" style={{ marginRight: 8 }} />
          <Text style={styles.historyButtonText}>View Purchase History</Text>
        </TouchableOpacity>

        <View style={styles.buttonContainer}>
          <Button
            title="Renew Subscription"
            onPress={handleRenewSubscription}
            style={styles.renewButton}
          />
        </View>
      </ScrollView>
      
      {/* Renewal Modal */}
      <Modal
        visible={renewModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRenewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Renew Subscription</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setRenewModalVisible(false)}
              >
                <X size={24} color="#7f8c8d" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <View style={styles.vendorToggleContainer}>
                <TouchableOpacity 
                  style={[
                    styles.vendorToggleButton, 
                    renewalData.sameVendor && styles.vendorToggleButtonActive
                  ]}
                  onPress={() => setRenewalData({...renewalData, sameVendor: true})}
                >
                  <Text style={[
                    styles.vendorToggleText,
                    renewalData.sameVendor && styles.vendorToggleTextActive
                  ]}>Same Vendor</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.vendorToggleButton, 
                    !renewalData.sameVendor && styles.vendorToggleButtonActive
                  ]}
                  onPress={() => setRenewalData({...renewalData, sameVendor: false})}
                >
                  <Text style={[
                    styles.vendorToggleText,
                    !renewalData.sameVendor && styles.vendorToggleTextActive
                  ]}>New Vendor</Text>
                </TouchableOpacity>
              </View>
              
              {!renewalData.sameVendor && (
                <>
                  <Text style={styles.modalLabel}>Vendor Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={renewalData.vendor}
                    onChangeText={(text) => setRenewalData({...renewalData, vendor: text})}
                    placeholder="Enter vendor name"
                  />
                  
                  <Text style={styles.modalLabel}>Vendor Website</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={renewalData.vendor_link}
                    onChangeText={(text) => setRenewalData({...renewalData, vendor_link: text})}
                    placeholder="https://vendor-website.com"
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </>
              )}
              
              {Platform.OS === 'web' ? (
                <>
                  {renderWebDatePicker(
                    renewalData.purchase_date, 
                    (date) => setRenewalData({...renewalData, purchase_date: date}),
                    "Purchase Date"
                  )}
                  {renderWebDatePicker(
                    renewalData.expiry_date, 
                    (date) => setRenewalData({...renewalData, expiry_date: date}),
                    "Expiry Date"
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.modalLabel}>Purchase Date</Text>
                  <TouchableOpacity 
                    style={styles.modalDateButton}
                    onPress={() => setShowRenewPurchaseDatePicker(true)}
                  >
                    <Calendar size={20} color="#4158D0" style={styles.modalDateIcon} />
                    <Text style={styles.modalDateText}>
                      {renewalData.purchase_date.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.modalLabel}>Expiry Date</Text>
                  <TouchableOpacity 
                    style={styles.modalDateButton}
                    onPress={() => setShowRenewExpiryDatePicker(true)}
                  >
                    <Calendar size={20} color="#4158D0" style={styles.modalDateIcon} />
                    <Text style={styles.modalDateText}>
                      {renewalData.expiry_date.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              
              {showRenewPurchaseDatePicker && Platform.OS !== 'web' && (
                <RNDateTimePicker
                  value={renewalData.purchase_date}
                  mode="date"
                  onChange={(event, selectedDate) => {
                    setShowRenewPurchaseDatePicker(false);
                    if (selectedDate) {
                      setRenewalData({...renewalData, purchase_date: selectedDate});
                    }
                  }}
                />
              )}
              
              {showRenewExpiryDatePicker && Platform.OS !== 'web' && (
                <RNDateTimePicker
                  value={renewalData.expiry_date}
                  mode="date"
                  onChange={(event, selectedDate) => {
                    setShowRenewExpiryDatePicker(false);
                    if (selectedDate) {
                      setRenewalData({...renewalData, expiry_date: selectedDate});
                    }
                  }}
                />
              )}
              
              <Text style={styles.modalLabel}>Amount (PKR)</Text>
              <TextInput
                style={styles.modalInput}
                value={renewalData.purchase_amount_pkr}
                onChangeText={(text) => setRenewalData({...renewalData, purchase_amount_pkr: text})}
                placeholder="0"
                keyboardType="numeric"
              />
              
              <Text style={styles.modalLabel}>Amount (USD)</Text>
              <TextInput
                style={styles.modalInput}
                value={renewalData.purchase_amount_usd}
                onChangeText={(text) => setRenewalData({...renewalData, purchase_amount_usd: text})}
                placeholder="0"
                keyboardType="numeric"
              />
              
              <Button
                title="Renew Subscription"
                onPress={handleSaveRenewal}
                style={styles.modalButton}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* History Modal */}
      <Modal
        visible={historyModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Purchase History</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setHistoryModalVisible(false)}
              >
                <X size={24} color="#7f8c8d" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {subscription.history && subscription.history.length > 0 ? (
                [...subscription.history]
                  .sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime())
                  .map((historyItem: SubscriptionHistory) => (
                  <View key={historyItem.id} style={styles.historyItem}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyDate}>
                        {formatDate(historyItem.purchase_date)}
                      </Text>
                      <Text style={styles.historyVendor}>
                        {historyItem.vendor || 'Unknown Vendor'}
                      </Text>
                    </View>
                    
                    <View style={styles.historyDetails}>
                      <View style={styles.historyDetail}>
                        <Text style={styles.historyLabel}>Amount (PKR):</Text>
                        <Text style={styles.historyValue}>
                          {historyItem.purchase_amount_pkr.toLocaleString()}
                        </Text>
                      </View>
                      
                      {historyItem.purchase_amount_usd > 0 && (
                        <View style={styles.historyDetail}>
                          <Text style={styles.historyLabel}>Amount (USD):</Text>
                          <Text style={styles.historyValue}>
                            ${historyItem.purchase_amount_usd.toLocaleString()}
                          </Text>
                        </View>
                      )}
                      
                      {historyItem.vendor_link && (
                        <View style={styles.historyDetail}>
                          <Text style={styles.historyLabel}>Vendor Link:</Text>
                          <Text style={styles.historyLink}>
                            {historyItem.vendor_link}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noHistoryText}>No purchase history available</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f6fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#2c3e50',
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
  },
  saveButton: {
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
  },
  scrollView: {
    flex: 1,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#2c3e50',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#2c3e50',
  },
  detailLink: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#3498db',
  },
  editInput: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#dfe4ea',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f6fa',
  },
  editNotesInput: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#dfe4ea',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f6fa',
    height: 120,
    textAlignVertical: 'top',
  },
  showPasswordButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  showPasswordText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#3498db',
  },
  notesText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#2c3e50',
    lineHeight: 24,
  },
  buttonContainer: {
    marginHorizontal: 20,
    marginBottom: 40,
  },
  renewButton: {
    backgroundColor: '#2ecc71',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#e74c3c',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorButton: {
    width: 200,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  modalTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#2c3e50',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f2f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
  },
  modalLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 8,
  },
  modalInput: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#dfe4ea',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f6fa',
    marginBottom: 16,
  },
  modalDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dfe4ea',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f6fa',
    marginBottom: 16,
  },
  modalDateIcon: {
    marginRight: 8,
  },
  modalDateText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#2c3e50',
  },
  modalButton: {
    marginTop: 8,
    marginBottom: 20,
  },
  vendorToggleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dfe4ea',
  },
  vendorToggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f5f6fa',
  },
  vendorToggleButtonActive: {
    backgroundColor: '#4158D0',
  },
  vendorToggleText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#7f8c8d',
  },
  vendorToggleTextActive: {
    color: '#fff',
  },
  historyButton: {
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  historyButtonText: {
    fontFamily: 'Inter-Medium',
    color: '#3498db',
  },
  historyItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyDate: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#2c3e50',
  },
  historyVendor: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#7f8c8d',
  },
  historyDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(189, 195, 199, 0.3)',
    paddingTop: 12,
  },
  historyDetail: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  historyLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#7f8c8d',
    width: 100,
  },
  historyValue: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#2c3e50',
    flex: 1,
  },
  historyLink: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#3498db',
    flex: 1,
  },
  noHistoryText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginVertical: 20,
  },
  webDatePickerContainer: {
    marginBottom: 16,
  },
  dateLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 8,
  },
});