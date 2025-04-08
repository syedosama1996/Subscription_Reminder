import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  ScrollView,
  Platform
} from 'react-native';
import { X, Check, Filter } from 'lucide-react-native';
import { Category } from '../lib/types';
import CategoryBadge from './CategoryBadge';
import Button from './Button';

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
  { id: 'expired', label: 'Expired', color: '#e74c3c' },
  { id: 'past', label: 'Past/Inactive', color: '#7f8c8d' },
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
    
    setTimeout(() => {
      onRefresh?.();
    }, 300);
  };

  const handleClearFilters = () => {
    setLocalSelectedCategories([]);
    setLocalSelectedStatuses([]);
    onSelectCategories([]);
    onSelectStatuses([]);
    onClose();
    
    setTimeout(() => {
      onRefresh?.();
    }, 300);
  };

  const hasActiveFilters = localSelectedCategories.length > 0 || localSelectedStatuses.length > 0;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Subscriptions</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={onClose}
            >
              <X size={24} color="#7f8c8d" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Status</Text>
              <View style={styles.statusOptions}>
                {STATUS_OPTIONS.map(status => (
                  <TouchableOpacity
                    key={status.id}
                    style={[
                      styles.statusOption,
                      localSelectedStatuses.includes(status.id) && { 
                        backgroundColor: `${status.color}20`,
                        borderColor: status.color
                      }
                    ]}
                    onPress={() => toggleStatus(status.id)}
                  >
                    <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                    <Text style={styles.statusLabel}>{status.label}</Text>
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
                  {categories.map(category => (
                    <TouchableOpacity
                      key={category.id}
                      onPress={() => toggleCategory(category.id!)}
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
          
          <View style={styles.footer}>
            {hasActiveFilters && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={handleClearFilters}
              >
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
            )}
            
            <Button
              title="Apply Filters"
              onPress={handleApplyFilters}
              style={styles.applyButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#2c3e50',
    marginBottom: 16,
  },
  statusOptions: {
    flexDirection: 'column',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#dfe4ea',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
  },
  checkIcon: {
    marginLeft: 8,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  footer: {
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
    flex: 1,
    maxWidth: 200,
  },
});