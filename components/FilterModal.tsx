import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { X, Check } from 'lucide-react-native';
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
  onRefresh?: () => void;
};

const STATUS_OPTIONS = [
  { id: 'active', label: 'Active', color: '#10b981', },
  { id: 'inactive', label: 'Inactive', color: '#6b7280',  },
  { id: 'expiring_soon', label: 'Expiring Soon',  icon: '⏰' },
];

export default function FilterModal({ 
  visible, 
  onClose, 
  categories,
  selectedCategories,
  onSelectCategories,
  selectedStatuses,
  onSelectStatuses,
  onRefresh
}: FilterModalProps) {
  const [localSelectedCategories, setLocalSelectedCategories] = useState<string[]>([]);
  const [localSelectedStatuses, setLocalSelectedStatuses] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      setLocalSelectedCategories([...selectedCategories]);
      setLocalSelectedStatuses([...selectedStatuses]);
    }
  }, [visible, selectedCategories, selectedStatuses]);

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

  const handleApplyFilters = () => {
    onSelectCategories(localSelectedCategories);
    onSelectStatuses(localSelectedStatuses);
    onClose();
    
    if (onRefresh) {
      setTimeout(() => {
        onRefresh();
      }, 100);
    }
  };

  const handleClearFilters = () => {
    setLocalSelectedCategories([]);
    setLocalSelectedStatuses([]);
    onSelectCategories([]);
    onSelectStatuses([]);
    onClose();
    
    if (onRefresh) {
      setTimeout(() => {
        onRefresh();
      }, 100);
    }
  };

  const hasActiveFilters = localSelectedCategories.length > 0 || localSelectedStatuses.length > 0;

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
            <Text style={styles.modalTitle}>Filter Subscriptions</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={24} color="#7f8c8d" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
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
                    {status.color && <View style={[styles.statusDot, { backgroundColor: status.color }]} />}
                    {status.icon && <Text style={styles.statusIcon}>{status.icon}</Text>}
                    <Text style={[
                      styles.optionText,
                      localSelectedStatuses.includes(status.id) && styles.selectedOptionText
                    ]}>
                      {status.label}
                    </Text>
                    {localSelectedStatuses.includes(status.id) && (
                      <Check size={16} color={status.color} style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  optionText: {
    ...TEXT_STYLES.bodySmallMedium,
    color: '#374151',
    flex: 1,
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
});