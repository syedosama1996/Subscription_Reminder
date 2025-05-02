import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  FlatList,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Category } from '../lib/types';
import { getCategories, createCategory } from '../lib/subscriptions';
import { useAuth } from '../lib/auth';
import CategoryBadge from './CategoryBadge';
import { Plus, X, Check } from 'lucide-react-native';

type CategorySelectorProps = {
  selectedCategoryId?: string;
  onSelectCategory: (category: Category | null) => void;
};

export default function CategorySelector({ selectedCategoryId, onSelectCategory }: CategorySelectorProps) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  useEffect(() => {
    loadCategories();
  }, [user]);

  useEffect(() => {
    if (selectedCategoryId && categories.length > 0) {
      const category = categories.find(cat => cat.id === selectedCategoryId);
      setSelectedCategory(category || null);
    }
  }, [selectedCategoryId, categories]);

  const loadCategories = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await getCategories(user.id);
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!user || !newCategoryName.trim()) return;
    
    try {
      setAddingCategory(true);
      const newCategory = await createCategory({
        user_id: user.id,
        name: newCategoryName.trim(),
        color: newCategoryColor || undefined
      });
      
      setCategories([...categories, newCategory]);
      setNewCategoryName('');
      setNewCategoryColor('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding category:', error);
    } finally {
      setAddingCategory(false);
    }
  };

  const handleSelectCategory = (category: Category) => {
    setSelectedCategory(category);
    onSelectCategory(category);
    setModalVisible(false);
  };

  const handleClearCategory = () => {
    setSelectedCategory(null);
    onSelectCategory(null);
  };

  const colorOptions = [
    '#4158D0', // Blue
    '#C850C0', // Purple
    '#2ecc71', // Green
    '#e74c3c', // Red
    '#f39c12', // Orange
    '#3498db', // Light Blue
    '#9b59b6', // Violet
    '#1abc9c', // Turquoise
    '#34495e', // Dark Blue
    '#e67e22', // Dark Orange
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Category</Text>
      
      {selectedCategory ? (
        <View style={styles.selectedContainer}>
          <CategoryBadge category={selectedCategory} selected />
          <TouchableOpacity 
            style={styles.changeButton}
            onPressIn={() => setModalVisible(true)}
          >
            <Text style={styles.changeButtonText}>Change</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.clearButton}
            onPressIn={handleClearCategory}
          >
            <X size={16} color="#7f8c8d" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.selectButton}
          onPressIn={() => setModalVisible(true)}
        >
          <Text style={styles.selectButtonText}>Select Category</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPressIn={() => {
                  setModalVisible(false);
                  setShowAddForm(false);
                }}
              >
                <X size={24} color="#7f8c8d" />
              </TouchableOpacity>
            </View>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4158D0" />
              </View>
            ) : (
              <>
                {showAddForm ? (
                  <View style={styles.addFormContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Category name"
                      value={newCategoryName}
                      onChangeText={setNewCategoryName}
                    />
                    
                    <Text style={styles.colorLabel}>Select Color (Optional)</Text>
                    <View style={styles.colorOptions}>
                      {colorOptions.map(color => (
                        <TouchableOpacity
                          key={color}
                          style={[
                            styles.colorOption,
                            { backgroundColor: color },
                            newCategoryColor === color && styles.selectedColorOption
                          ]}
                          onPressIn={() => setNewCategoryColor(color)}
                        />
                      ))}
                    </View>
                    
                    <View style={styles.addFormButtons}>
                      <TouchableOpacity 
                        style={styles.cancelButton}
                        onPressIn={() => {
                          setShowAddForm(false);
                          setNewCategoryName('');
                          setNewCategoryColor('');
                        }}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[
                          styles.saveButton,
                          (!newCategoryName.trim() || addingCategory) && styles.disabledButton
                        ]}
                        onPressIn={handleAddCategory}
                        disabled={!newCategoryName.trim() || addingCategory}
                      >
                        {addingCategory ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.saveButtonText}>Save</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <TouchableOpacity 
                      style={styles.addCategoryButton}
                      onPressIn={() => setShowAddForm(true)}
                    >
                      <Plus size={18} color="#4158D0" style={styles.addIcon} />
                      <Text style={styles.addCategoryText}>Add New Category</Text>
                    </TouchableOpacity>
                    
                    {categories.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No categories found</Text>
                        <Text style={styles.emptySubtext}>
                          Create your first category to organize your subscriptions
                        </Text>
                      </View>
                    ) : (
                      <FlatList
                        data={categories}
                        keyExtractor={(item) => item.id || item.name}
                        renderItem={({ item }) => (
                          <TouchableOpacity 
                            style={[
                              styles.categoryItem,
                              selectedCategoryId === item.id && styles.selectedCategoryItem
                            ]}
                            onPressIn={() => handleSelectCategory(item)}
                          >
                            <CategoryBadge category={item} />
                            {selectedCategoryId === item.id && (
                              <Check size={20} color="#4158D0" />
                            )}
                          </TouchableOpacity>
                        )}
                        contentContainerStyle={styles.categoriesList}
                      />
                    )}
                  </>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#2c3e50',
  },
  selectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectButton: {
    backgroundColor: '#f5f6fa',
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(223, 228, 234, 0.5)',
  },
  selectButtonText: {
    color: '#7f8c8d',
    fontSize: 16,
  },
  changeButton: {
    marginLeft: 12,
    padding: 8,
  },
  changeButtonText: {
    color: '#4158D0',
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  clearButton: {
    marginLeft: 8,
    padding: 8,
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  addIcon: {
    marginRight: 12,
  },
  addCategoryText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#4158D0',
  },
  categoriesList: {
    padding: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  selectedCategoryItem: {
    backgroundColor: 'rgba(65, 88, 208, 0.1)',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Inter-Medium',
    fontSize: 18,
    color: '#2c3e50',
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  addFormContainer: {
    padding: 20,
  },
  input: {
    backgroundColor: '#f5f6fa',
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: 'rgba(223, 228, 234, 0.5)',
    marginBottom: 16,
  },
  colorLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 12,
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    marginBottom: 12,
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addFormButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginRight: 12,
  },
  cancelButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#7f8c8d',
  },
  saveButton: {
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
  saveButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.5,
  },
});