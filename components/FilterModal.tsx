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
  { id: 'active', label: 'Active', color: '#2ecc71' },
  { id: 'expiring_soon', label: 'Expiring Soon', color: '#f39c12' },
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
                    <View style={[styles.statusDot, { backgroundColor: status.color }]} />
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
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f2f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#2c3e50',
    marginBottom: 16,
  },
  optionsContainer: {
    flexDirection: 'column',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#dfe4ea',
  },
  optionText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
  },
  selectedOption: {
    backgroundColor: 'rgba(65, 88, 208, 0.1)',
    borderColor: '#4158D0',
  },
  selectedOptionText: {
    fontFamily: 'Inter-SemiBold',
    color: '#4158D0',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
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
    borderTopColor: '#f1f2f6',
  },
  clearButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  clearButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#e74c3c',
  },
  applyButton: {
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
  applyButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#fff',
  },
});