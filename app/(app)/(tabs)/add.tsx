import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Platform,
  KeyboardAvoidingView,
  BackHandler,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../lib/auth';
import { createSubscription, createReminder } from '../../../lib/subscriptions';
import Input from '../../../components/Input';
import Button from '../../../components/Button';
import CategorySelector from '../../../components/CategorySelector';
import { Calendar, DollarSign, Globe, Key, Mail, User, X, Link, Eye, EyeOff } from 'lucide-react-native';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Category } from '../../../lib/types';
import Toast from 'react-native-toast-message';

export default function AddSubscriptionScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [serviceName, setServiceName] = useState('');
  const [domainName, setDomainName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [expiryDate, setExpiryDate] = useState(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)); // Default to 1 year from now
  const [amountPKR, setAmountPKR] = useState('');
  const [amountUSD, setAmountUSD] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [vendor, setVendor] = useState('');
  const [vendorLink, setVendorLink] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Date picker state
  const [showPurchaseDatePicker, setShowPurchaseDatePicker] = useState(false);
  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);

  // Reminders
  const [reminders, setReminders] = useState([
    { days: 30, enabled: true }, // 1 month before
    { days: 14, enabled: true }, // 2 weeks before
    { days: 7, enabled: true }   // 1 week before
  ]);


  const handleAddReminder = () => {
    setReminders([...reminders, { days: 1, enabled: true }]);
  };

  const handleRemoveReminder = (index: number) => {
    setReminders(reminders.filter((_, i) => i !== index));
  };

  const handleReminderDaysChange = (text: string, index: number) => {
    const newReminders = [...reminders];
    newReminders[index].days = parseInt(text) || 0;
    setReminders(newReminders);
  };

  const handleReminderToggle = (index: number) => {
    const newReminders = [...reminders];
    newReminders[index].enabled = !newReminders[index].enabled;
    setReminders(newReminders);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const clearError = () => {
    setError(null);
  };

  const resetForm = () => {
    setServiceName('');
    setDomainName('');
    setPurchaseDate(new Date());
    setExpiryDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
    setAmountPKR('');
    setAmountUSD('');
    setEmail('');
    setUsername('');
    setPassword('');
    setNotes('');
    setVendor('');
    setVendorLink('');
    setSelectedCategory(null);
    setError(null);
    setShowPassword(false);
    setReminders([
      { days: 30, enabled: true },
      { days: 14, enabled: true },
      { days: 7, enabled: true }
    ]);
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    // Clear any existing errors first
    setError(null);
    
    // Validate required fields
    if (!serviceName.trim()) {
      setError('Service name is required');
      return;
    }

    // Validate dates
    if (!purchaseDate || isNaN(purchaseDate.getTime())) {
      setError('Purchase date is required');
      return;
    }

    if (!expiryDate || isNaN(expiryDate.getTime())) {
      setError('Expiry date is required');
      return;
    }

    // Validate that expiry date is after purchase date
    if (expiryDate <= purchaseDate) {
      setError('Expiry date must be after purchase date');
      return;
    }

    // Validate at least one amount is provided
    const amountPKRNum = amountPKR ? parseFloat(amountPKR) : 0;
    const amountUSDNum = amountUSD ? parseFloat(amountUSD) : 0;
    
    if (amountPKRNum <= 0 && amountUSDNum <= 0) {
      setError('Please provide at least one amount (PKR or USD)');
      return;
    }

    // Validate numeric amounts
    if (amountPKR && (isNaN(amountPKRNum) || amountPKRNum < 0)) {
      setError('Amount (PKR) must be a valid positive number');
      return;
    }

    if (amountUSD && (isNaN(amountUSDNum) || amountUSDNum < 0)) {
      setError('Amount (USD) must be a valid positive number');
      return;
    }

    // Validate reminders if any are enabled
    for (const reminder of reminders) {
      if (reminder.enabled && (!reminder.days || reminder.days <= 0)) {
        setError('Reminder days must be a positive number');
        return;
      }
    }

    try {
      setLoading(true);

      // Create subscription
      const subscription = await createSubscription({
        user_id: user.id,
        service_name: serviceName,
        domain_name: domainName,
        purchase_date: purchaseDate.toISOString(),
        purchase_amount_pkr: amountPKRNum,
        purchase_amount_usd: amountUSDNum,
        expiry_date: expiryDate.toISOString(),
        email: email,
        username: username,
        password: password,
        notes: notes,
        vendor: vendor,
        vendor_link: vendorLink,
        category_id: selectedCategory?.id,
        is_active: true
      }, user.id);

      // Create reminders
      for (const reminder of reminders) {
        if (reminder.enabled) {
          await createReminder({
            subscription_id: subscription.id!,
            days_before: reminder.days,
            enabled: reminder.enabled,
          });
        }
      }

      // Reset form immediately after successful submission
      resetForm();

      // Show success toast and navigate back
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Subscription added successfully!',
        position: 'top',
        visibilityTime: 3000,
      });
      
      router.back();
    } catch (err: any) {
      console.error('Error adding subscription:', err);
      setError(err.message || 'Failed to add subscription');
    } finally {
      setLoading(false);
    }
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
              paddingLeft: 16,
              paddingRight: 16,
              fontSize: 12,
              borderWidth: 1,
              borderColor: '#dfe4ea',
              backgroundColor: '#f5f6fa',
              width: '100%',
            }}
          />
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4158D0', '#C850C0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      />
      
      <View style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
            <View style={styles.header}>
              <Text style={styles.title}>Add Subscription</Text>
            </View>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              
              <View style={styles.inputRow}>
                <Globe size={20} color="#8e8e93" style={styles.inputIcon} />
                <Input
                  label="Service Name"
                  placeholder="Netflix, Spotify, Domain, etc."
                  value={serviceName}
                  onChangeText={(text) => {
                    setServiceName(text);
                    clearError();
                  }}
                  containerStyle={styles.input}
                />
              </View>

              <View style={styles.inputRow}>
                <Globe size={20} color="#8e8e93" style={styles.inputIcon} />
                <Input
                  label="Domain Name (if applicable)"
                  placeholder="example.com"
                  value={domainName}
                  onChangeText={(text) => {
                    setDomainName(text);
                    clearError();
                  }}
                  containerStyle={styles.input}
                />
              </View>

              <CategorySelector
                selectedCategoryId={selectedCategory?.id}
                onSelectCategory={setSelectedCategory}
              />

              <View style={styles.inputRow}>
                <User size={20} color="#8e8e93" style={styles.inputIcon} />
                <Input
                  label="Vendor"
                  placeholder="Company providing the service"
                  value={vendor}
                  onChangeText={(text) => {
                    setVendor(text);
                    clearError();
                  }}
                  containerStyle={styles.input}
                />
              </View>

              <View style={styles.inputRow}>
                <Link size={20} color="#8e8e93" style={styles.inputIcon} />
                <Input
                  label="Vendor Link"
                  placeholder="https://vendor-website.com"
                  value={vendorLink}
                  onChangeText={(text) => {
                    setVendorLink(text);
                    clearError();
                  }}
                  keyboardType="url"
                  autoCapitalize="none"
                  containerStyle={styles.input}
                />
              </View>

              {Platform.OS === 'web' ? (
                <>
                  {renderWebDatePicker(purchaseDate, (date) => {
                    setPurchaseDate(date);
                    clearError();
                  }, "Purchase Date")}
                  {renderWebDatePicker(expiryDate, (date) => {
                    setExpiryDate(date);
                    clearError();
                  }, "Expiry Date")}
                </>
              ) : (
                <View style={styles.dateRow}>
                  <View style={styles.dateContainer}>
                    <Text style={styles.dateLabel}>Purchase Date</Text>
                    <TouchableOpacity 
                      style={styles.dateButton}
                      onPress={() => setShowPurchaseDatePicker(true)}
                    >
                      <Calendar size={20} color="#8e8e93" style={styles.dateIcon} />
                      <Text style={styles.dateText}>{formatDate(purchaseDate)}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dateContainer}>
                    <Text style={styles.dateLabel}>Expiry Date</Text>
                    <TouchableOpacity 
                      style={styles.dateButton}
                      onPress={() => setShowExpiryDatePicker(true)}
                    >
                      <Calendar size={20} color="#8e8e93" style={styles.dateIcon} />
                      <Text style={styles.dateText}>{formatDate(expiryDate)}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {showPurchaseDatePicker && Platform.OS !== 'web' && (
                <RNDateTimePicker
                  value={purchaseDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowPurchaseDatePicker(false);
                    if (selectedDate) {
                      setPurchaseDate(selectedDate);
                      clearError();
                    }
                  }}
                />
              )}

              {showExpiryDatePicker && Platform.OS !== 'web' && (
                <RNDateTimePicker
                  value={expiryDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowExpiryDatePicker(false);
                    if (selectedDate) {
                      setExpiryDate(selectedDate);
                      clearError();
                    }
                  }}
                />
              )}

              <View style={styles.inputRow}>
                <DollarSign size={20} color="#8e8e93" style={styles.inputIcon} />
                <Input
                  label="Amount (PKR)"
                  placeholder="5000"
                  value={amountPKR}
                  onChangeText={(text) => {
                    setAmountPKR(text);
                    clearError();
                  }}
                  keyboardType="numeric"
                  containerStyle={styles.input}
                />
              </View>

              <View style={styles.inputRow}>
                <DollarSign size={20} color="#8e8e93" style={styles.inputIcon} />
                <Input
                  label="Amount (USD)"
                  placeholder="30"
                  value={amountUSD}
                  onChangeText={(text) => {
                    setAmountUSD(text);
                    clearError();
                  }}
                  keyboardType="numeric"
                  containerStyle={styles.input}
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Account Details (Optional)</Text>
              
              <View style={styles.inputRow}>
                <Mail size={20} color="#8e8e93" style={styles.inputIcon} />
                <Input
                  label="Email"
                  placeholder="account@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  containerStyle={styles.input}
                />
              </View>

              <View style={styles.inputRow}>
                <User size={20} color="#8e8e93" style={styles.inputIcon} />
                <Input
                  label="Username"
                  placeholder="username"
                  value={username}
                  onChangeText={setUsername}
                  containerStyle={styles.input}
                />
              </View>

              <View style={styles.inputRow}>
                <Key size={20} color="#8e8e93" style={styles.inputIcon} />
                <View style={styles.passwordContainer}>
                  <Input
                    label="Password"
                    placeholder="password"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      clearError();
                    }}
                    secureTextEntry={!showPassword}
                    containerStyle={styles.input}
                    inputStyle={{ paddingRight: 50 }}
                  >
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                      activeOpacity={0.7}
                    >
                      {showPassword ? (
                        <EyeOff size={20} color="#7f8c8d" />
                      ) : (
                        <Eye size={20} color="#7f8c8d" />
                      )}
                    </TouchableOpacity>
                  </Input>
                </View>
              </View>

              <Input
                label="Notes"
                placeholder="Any additional information..."
                value={notes}
                onChangeText={setNotes}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
                style={styles.notesInput}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Reminders</Text>
              <Text style={styles.reminderDescription}>
                Set when you want to be reminded before the subscription expires
              </Text>

              {reminders.map((reminder, index) => (
                <View key={index} style={styles.reminderRow}>
                  <Input
                    placeholder="Days"
                    value={reminder.days.toString()}
                    onChangeText={(text) => handleReminderDaysChange(text, index)}
                    keyboardType="numeric"
                    containerStyle={styles.reminderInput}
                  />
                  <Text style={styles.reminderText}>days before</Text>
                  <TouchableOpacity
                    style={styles.reminderDeleteButton}
                    onPress={() => handleRemoveReminder(index)}
                  >
                    <X size={18} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              ))}

              <Button
                title="Add Another Reminder"
                variant="outline"
                onPress={handleAddReminder}
                style={styles.addReminderButton}
              />
            </View>

            <Button
              title="Save Subscription"
              onPress={handleSubmit}
              loading={loading}
              style={styles.submitButton}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
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
      marginTop: 42,
    zIndex: 1001,
    position: 'relative',
    },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
 
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 10,
  },
  errorContainer: {
    marginHorizontal: 20,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    fontFamily: 'Inter-Medium',
    color: '#d32f2f',
    fontSize: 12,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },
  formSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    color: '#1a1a1a',
    marginBottom: 16,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    marginRight: 12,
    marginTop: 8,
  },
  input: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateContainer: {
    width: '48%',
  },
  webDatePickerContainer: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
    color: '#2c3e50',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  dateIcon: {
    marginRight: 8,
  },
  dateText: {
    fontSize: 13,
    color: '#1a1a1a',
    fontFamily: 'Inter-Regular',
  },
  notesInput: {
    height: 120,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  reminderDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 16,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reminderInput: {
    width: 80,
    marginBottom: 0,
  },
  reminderText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#2c3e50',
    marginLeft: 8,
    flex: 1,
  },
  reminderDeleteButton: {
    padding: 8,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 20,
  },
  addReminderButton: {
    marginTop: 8,
  },
  submitButton: {
    marginBottom: 40,
    backgroundColor: '#007AFF',
    height: 56,
    borderRadius: 16,
  },
  passwordContainer: {
    flex: 1,
    position: 'relative',
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
});