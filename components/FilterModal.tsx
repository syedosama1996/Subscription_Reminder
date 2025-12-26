import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { X, Check, Building2, RefreshCw, CreditCard } from 'lucide-react-native';
import { Category } from '../lib/types';
import CategoryBadge from './CategoryBadge';
import { TEXT_STYLES, FONT_FAMILY, FONT_SIZES } from '../constants/Typography';

type FilterModalProps = {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  selectedCategories: string[];
  onSelectCategories: (categoryIds: string[]) => void;
  selectedStatuses: string[];
  onSelectStatuses: (statuses: string[]) => void;
  bankNames?: string[];
  selectedBanks?: string[];
  onSelectBanks?: (banks: string[]) => void;
  selectedPaymentTypes?: string[];
  onSelectPaymentTypes?: (paymentTypes: string[]) => void;
  selectedAutoRenewal?: boolean | null;
  onSelectAutoRenewal?: (autoRenewal: boolean | null) => void;
  showStatusFilter?: boolean; // Optional prop to show/hide status filter section
};

const STATUS_OPTIONS = [
  { id: 'active', label: 'Active', color: '#10b981' },
  { id: 'expiring_soon', label: 'Expiring Soon', icon: '⏰', color: '#f59e0b', description: 'Expires within 30 days' },
];

export default function FilterModal({ 
  visible, 
  onClose, 
  categories,
  selectedCategories,
  onSelectCategories,
  selectedStatuses,
  onSelectStatuses,
  bankNames = [],
  selectedBanks = [],
  onSelectBanks,
  selectedPaymentTypes = [],
  onSelectPaymentTypes,
  selectedAutoRenewal = null,
  onSelectAutoRenewal,
  showStatusFilter = true // Default to true for backward compatibility
}: FilterModalProps) {
  const [localSelectedCategories, setLocalSelectedCategories] = useState<string[]>([]);
  const [localSelectedStatuses, setLocalSelectedStatuses] = useState<string[]>([]);
  const [localSelectedBanks, setLocalSelectedBanks] = useState<string[]>([]);
  const [localSelectedPaymentTypes, setLocalSelectedPaymentTypes] = useState<string[]>([]);
  const [localSelectedAutoRenewal, setLocalSelectedAutoRenewal] = useState<boolean | null>(null);

  useEffect(() => {
    if (visible) {
      setLocalSelectedCategories([...selectedCategories]);
      setLocalSelectedStatuses([...selectedStatuses]);
      setLocalSelectedBanks([...selectedBanks]);
      setLocalSelectedPaymentTypes([...selectedPaymentTypes]);
      setLocalSelectedAutoRenewal(selectedAutoRenewal);
    }
  }, [visible, selectedCategories, selectedStatuses, selectedBanks, selectedPaymentTypes, selectedAutoRenewal]);

  const toggleCategory = (categoryId: string) => {
    if (localSelectedCategories.includes(categoryId)) {
      setLocalSelectedCategories(localSelectedCategories.filter(id => id !== categoryId));
    } else {
      setLocalSelectedCategories([...localSelectedCategories, categoryId]);
    }
  };

  const toggleStatus = (statusId: string) => {
    if (localSelectedStatuses.includes(statusId)) {
      setLocalSelectedStatuses(localSelectedStatuses.filter(id => id !== statusId));
    } else {
      setLocalSelectedStatuses([...localSelectedStatuses, statusId]);
    }
  };

  const toggleBank = (bankName: string) => {
    if (localSelectedBanks.includes(bankName)) {
      setLocalSelectedBanks(localSelectedBanks.filter(name => name !== bankName));
    } else {
      setLocalSelectedBanks([...localSelectedBanks, bankName]);
    }
  };

  const togglePaymentType = (paymentType: string) => {
    if (localSelectedPaymentTypes.includes(paymentType)) {
      setLocalSelectedPaymentTypes(localSelectedPaymentTypes.filter(type => type !== paymentType));
    } else {
      setLocalSelectedPaymentTypes([...localSelectedPaymentTypes, paymentType]);
    }
  };

  const toggleAutoRenewal = (value: boolean | null) => {
    setLocalSelectedAutoRenewal(localSelectedAutoRenewal === value ? null : value);
  };

  const handleApplyFilters = () => {
    // Update parent state - this will trigger useEffect in parent component to reload data
    onSelectCategories(localSelectedCategories);
    onSelectStatuses(localSelectedStatuses);
    if (onSelectBanks) {
      onSelectBanks(localSelectedBanks);
    }
    if (onSelectPaymentTypes) {
      onSelectPaymentTypes(localSelectedPaymentTypes);
    }
    if (onSelectAutoRenewal) {
      onSelectAutoRenewal(localSelectedAutoRenewal);
    }
    onClose();
  };

  const handleClearFilters = () => {
    // Clear local and parent state - this will trigger useEffect in parent component to reload data
    setLocalSelectedCategories([]);
    setLocalSelectedStatuses([]);
    setLocalSelectedBanks([]);
    setLocalSelectedPaymentTypes([]);
    setLocalSelectedAutoRenewal(null);
    onSelectCategories([]);
    onSelectStatuses([]);
    if (onSelectBanks) {
      onSelectBanks([]);
    }
    if (onSelectPaymentTypes) {
      onSelectPaymentTypes([]);
    }
    if (onSelectAutoRenewal) {
      onSelectAutoRenewal(null);
    }
    onClose();
  };

  const hasActiveFilters = localSelectedCategories.length > 0 || 
    (showStatusFilter && localSelectedStatuses.length > 0) || 
    localSelectedBanks.length > 0 ||
    localSelectedPaymentTypes.length > 0 ||
    localSelectedAutoRenewal !== null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Apply Filters</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={24} color="#7f8c8d" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {showStatusFilter && (
              <>
                <View style={styles.expiringSoonCard}>
                  <View style={styles.expiringSoonContent}>
                    <Text style={styles.expiringSoonIcon}>⏰</Text>
                    <View style={styles.expiringSoonTextContainer}>
                      <Text style={styles.expiringSoonTitle}>Expiring Soon</Text>
                      <Text style={styles.expiringSoonDescription}>Expires within 30 days</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Status</Text>
                  <View style={styles.optionsContainer}>
                    {STATUS_OPTIONS.map((status) => (
                      <TouchableOpacity
                        key={status.id}
                        style={[
                          styles.option,
                          localSelectedStatuses.includes(status.id) && styles.selectedOption
                        ]}
                        onPress={() => toggleStatus(status.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.optionContent}>
                          <View style={styles.optionHeader}>
                            {status.color && !status.icon && <View style={[styles.statusDot, { backgroundColor: status.color }]} />}
                            {status.icon && <Text style={styles.statusIcon}>{status.icon}</Text>}
                            <Text style={[
                              styles.optionText,
                              localSelectedStatuses.includes(status.id) && styles.selectedOptionText
                            ]}>
                              {status.label}
                            </Text>
                            {localSelectedStatuses.includes(status.id) && (
                              <Check size={16} color={status.color || '#3b82f6'} style={styles.checkIcon} />
                            )}
                          </View>
                          {status.description && (
                            <Text style={[
                              styles.optionDescription,
                              localSelectedStatuses.includes(status.id) && styles.selectedOptionDescription
                            ]}>
                              {status.description}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}

            {categories.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Categories</Text>
                <View style={styles.categoriesContainer}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      onPress={() => toggleCategory(category.id!)}
                      activeOpacity={0.7}
                    >
                      <CategoryBadge 
                        category={category} 
                        selected={localSelectedCategories.includes(category.id!)}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {bankNames.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Bank</Text>
                <View style={styles.categoriesContainer}>
                  {bankNames.map((bankName) => (
                    <TouchableOpacity
                      key={bankName}
                      onPress={() => toggleBank(bankName)}
                      activeOpacity={0.7}
                      style={[
                        styles.bankButton,
                        localSelectedBanks.includes(bankName) && styles.selectedBankButton
                      ]}
                    >
                      <Building2 
                        size={16} 
                        color={localSelectedBanks.includes(bankName) ? '#3b82f6' : '#6b7280'} 
                        style={styles.bankIcon}
                      />
                      <Text style={[
                        styles.bankButtonText,
                        localSelectedBanks.includes(bankName) && styles.selectedBankButtonText
                      ]}>
                        {bankName}
                      </Text>
                      {localSelectedBanks.includes(bankName) && (
                        <Check size={14} color="#3b82f6" style={styles.bankCheckIcon} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Type</Text>
              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.option,
                    localSelectedPaymentTypes.includes('one-time') && styles.selectedOption
                  ]}
                  onPress={() => togglePaymentType('one-time')}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionContent}>
                    <View style={styles.optionHeader}>
                      <CreditCard size={16} color={localSelectedPaymentTypes.includes('one-time') ? '#3b82f6' : '#6b7280'} style={styles.statusIcon} />
                      <Text style={[
                        styles.optionText,
                        localSelectedPaymentTypes.includes('one-time') && styles.selectedOptionText
                      ]}>
                        One-Time Payment
                      </Text>
                      {localSelectedPaymentTypes.includes('one-time') && (
                        <Check size={16} color="#3b82f6" style={styles.checkIcon} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.option,
                    localSelectedPaymentTypes.includes('recurring') && styles.selectedOption
                  ]}
                  onPress={() => togglePaymentType('recurring')}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionContent}>
                    <View style={styles.optionHeader}>
                      <RefreshCw size={16} color={localSelectedPaymentTypes.includes('recurring') ? '#3b82f6' : '#6b7280'} style={styles.statusIcon} />
                      <Text style={[
                        styles.optionText,
                        localSelectedPaymentTypes.includes('recurring') && styles.selectedOptionText
                      ]}>
                        Recurring Payment
                      </Text>
                      {localSelectedPaymentTypes.includes('recurring') && (
                        <Check size={16} color="#3b82f6" style={styles.checkIcon} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Auto Renewal</Text>
              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.option,
                    localSelectedAutoRenewal === true && styles.selectedOption
                  ]}
                  onPress={() => toggleAutoRenewal(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionContent}>
                    <View style={styles.optionHeader}>
                      <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
                      <Text style={[
                        styles.optionText,
                        localSelectedAutoRenewal === true && styles.selectedOptionText
                      ]}>
                        Enabled
                      </Text>
                      {localSelectedAutoRenewal === true && (
                        <Check size={16} color="#10b981" style={styles.checkIcon} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.option,
                    localSelectedAutoRenewal === false && styles.selectedOption
                  ]}
                  onPress={() => toggleAutoRenewal(false)}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionContent}>
                    <View style={styles.optionHeader}>
                      <View style={[styles.statusDot, { backgroundColor: '#ef4444' }]} />
                      <Text style={[
                        styles.optionText,
                        localSelectedAutoRenewal === false && styles.selectedOptionText
                      ]}>
                        Disabled
                      </Text>
                      {localSelectedAutoRenewal === false && (
                        <Check size={16} color="#ef4444" style={styles.checkIcon} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.buttonsContainer}>
            {hasActiveFilters && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={handleClearFilters}
                activeOpacity={0.7}
              >
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={handleApplyFilters}
              activeOpacity={0.7}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '50%',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  modalTitle: {
    ...TEXT_STYLES.h5,
    color: '#1f2937',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    ...TEXT_STYLES.h5,
    fontFamily: FONT_FAMILY.semiBold,
    color: '#1f2937',
    marginBottom: 16,
  },
  optionsContainer: {
    flexDirection: 'column',
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  optionContent: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    ...TEXT_STYLES.bodySmallMedium,
    color: '#374151',
    flex: 1,
  },
  optionDescription: {
    ...TEXT_STYLES.bodySmall,
    color: '#9ca3af',
    marginTop: 6,
    marginLeft: 20,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
  },
  selectedOptionDescription: {
    color: '#60a5fa',
  },
  selectedOption: {
    backgroundColor: '#f0f9ff',
    borderColor: '#3b82f6',
  },
  selectedOptionText: {
    fontFamily: FONT_FAMILY.semiBold,
    color: '#1d4ed8',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusIcon: {
    fontSize: FONT_SIZES.bodySmall,
    marginRight: 8,
    color: '#6b7280',
  },
  checkIcon: {
    marginLeft: 8,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fafafa',
  },
  clearButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  clearButtonText: {
    ...TEXT_STYLES.bodySmallMedium,
    color: '#dc2626',
  },
  applyButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  applyButtonText: {
    ...TEXT_STYLES.bodySmallMedium,
    color: '#ffffff',
  },
  bankButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
    marginBottom: 8,
  },
  selectedBankButton: {
    backgroundColor: '#f0f9ff',
    borderColor: '#3b82f6',
  },
  bankIcon: {
    marginRight: 8,
  },
  bankButtonText: {
    ...TEXT_STYLES.bodySmallMedium,
    color: '#374151',
    fontFamily: FONT_FAMILY.regular,
  },
  selectedBankButtonText: {
    color: '#1d4ed8',
    fontFamily: FONT_FAMILY.semiBold,
  },
  bankCheckIcon: {
    marginLeft: 6,
  },
  expiringSoonCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    marginTop: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  expiringSoonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expiringSoonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  expiringSoonTextContainer: {
    flex: 1,
  },
  expiringSoonTitle: {
    ...TEXT_STYLES.bodyMedium,
    fontFamily: FONT_FAMILY.semiBold,
    color: '#dc2626',
    marginBottom: 4,
  },
  expiringSoonDescription: {
    ...TEXT_STYLES.bodySmall,
    color: '#991b1b',
    fontFamily: FONT_FAMILY.regular,
  },
});