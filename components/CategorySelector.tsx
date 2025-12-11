import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  FlatList,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Platform,
  TouchableOpacity
} from 'react-native';
import { Category } from '../lib/types';
import { getCategories, createCategory } from '../lib/subscriptions';
import { useAuth } from '../lib/auth';
import CategoryBadge from './CategoryBadge';
import { Plus, X, Check } from 'lucide-react-native';
import { getPlatformConfig } from '../utils/deviceUtils';
import Toast from 'react-native-toast-message';
import { FONT_FAMILY } from '../constants/Typography';

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
  const [inputKey, setInputKey] = useState(0);
  const isSelectingColorRef = useRef(false);
  const categoryInputRef = useRef<TextInput>(null);

  const platformConfig = getPlatformConfig();

  useEffect(() => {
    loadCategories();
  }, [user]);

  useEffect(() => {
    if (selectedCategoryId && categories.length > 0) {
      const category = categories.find(cat => cat.id === selectedCategoryId);
      setSelectedCategory(category || null);
    } else if (!selectedCategoryId) {
      // Clear selection if selectedCategoryId is null/undefined
      setSelectedCategory(null);
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
    
    // Check if category name already exists (case-insensitive)
    const trimmedName = newCategoryName.trim();
    const existingCategory = categories.find(
      cat => cat.name.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (existingCategory) {
      Toast.show({
        type: 'error',
        text1: 'Category Already Exists',
        text2: `A category with the name "${trimmedName}" already exists. Please choose a different name.`,
        position: 'top',
        visibilityTime: 4000,
      });
      return;
    }
    
    try {
      setAddingCategory(true);
      const newCategory = await createCategory({
        user_id: user.id,
        name: trimmedName,
        color: newCategoryColor || undefined
      });
      
      setCategories([...categories, newCategory]);
      setNewCategoryName('');
      setNewCategoryColor('');
      setShowAddForm(false);
      setInputKey(prev => prev + 1);
      Keyboard.dismiss();
      
      Toast.show({
        type: 'success',
        text1: 'Category Created',
        text2: `"${trimmedName}" has been added successfully.`,
        position: 'top',
        visibilityTime: 3000,
      });
    } catch (error) {
      console.error('Error adding category:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to create category. Please try again.',
        position: 'top',
        visibilityTime: 4000,
      });
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
          <CategoryBadge category={selectedCategory} />
          <TouchableOpacity 
            style={styles.changeButton}
            onPress={() => {
              console.log('Change button pressed');
              setModalVisible(true);
            }}
            activeOpacity={platformConfig.touch.activeOpacity}
            delayPressIn={platformConfig.touch.delayPressIn}
            delayPressOut={platformConfig.touch.delayPressOut}
          >
            <Text style={styles.changeButtonText}>Change</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={handleClearCategory}
            activeOpacity={platformConfig.touch.activeOpacity}
            delayPressIn={platformConfig.touch.delayPressIn}
            delayPressOut={platformConfig.touch.delayPressOut}
          >
            <X size={16} color="#7f8c8d" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.selectButton}
          onPress={() => {
            console.log('Select button pressed');
            setModalVisible(true);
          }}
          activeOpacity={platformConfig.touch.activeOpacity}
          delayPressIn={platformConfig.touch.delayPressIn}
          delayPressOut={platformConfig.touch.delayPressOut}
        >
          <Text style={styles.selectButtonText}>Select Category</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent={true}
        hardwareAccelerated={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              {showAddForm ? (
                <Text style={styles.modalTitle}>Create Category</Text>
              ) : (
                <Text style={styles.modalTitle}>Select Category</Text>
              )}
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => {
                  setModalVisible(false);
                  setShowAddForm(false);
                }}
                activeOpacity={platformConfig.touch.activeOpacity}
                delayPressIn={platformConfig.touch.delayPressIn}
                delayPressOut={platformConfig.touch.delayPressOut}
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
                    <View style={styles.inputWrapper}>
                      <View style={styles.inputContainer}>
                        <TextInput
                          ref={categoryInputRef}
                          key={inputKey}
                          style={styles.input}
                          placeholder="Enter category name"
                          placeholderTextColor="#95a5a6"
                          value={newCategoryName}
                          onChangeText={setNewCategoryName}
                          autoFocus={true}
                          returnKeyType="done"
                          onSubmitEditing={handleAddCategory}
                          blurOnSubmit={false}
                          keyboardType="default"
                          autoCapitalize="words"
                          autoCorrect={false}
                          editable={true}
                          selectTextOnFocus={true}
                          underlineColorAndroid="transparent"
                          textContentType="none"
                          onFocus={() => console.log('TextInput focused')}
                          onPress={() => console.log('TextInput pressed')}
                        />
                      </View>
                    </View>
                    
                    <View
                      onStartShouldSetResponder={() => true}
                      onMoveShouldSetResponder={() => false}
                      onResponderGrant={() => {
                        // This prevents TextInput blur when touching color area
                      }}
                    >
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
                            onPressIn={() => {
                              // Select color immediately - this fires before TextInput blur
                              setNewCategoryColor(color);
                            }}
                            onPress={() => {
                              // Dismiss keyboard after selection
                              Keyboard.dismiss();
                            }}
                            activeOpacity={platformConfig.touch.activeOpacity}
                            delayPressIn={0}
                            delayPressOut={platformConfig.touch.delayPressOut}
                          />
                        ))}
                      </View>
                    </View>
                    
                    <View style={styles.addFormButtons}>
                      <TouchableOpacity 
                        style={styles.cancelButton}
                        onPress={() => {
                          setShowAddForm(false);
                          setNewCategoryName('');
                          setNewCategoryColor('');
                          setInputKey(prev => prev + 1);
                        }}
                        activeOpacity={platformConfig.touch.activeOpacity}
                        delayPressIn={platformConfig.touch.delayPressIn}
                        delayPressOut={platformConfig.touch.delayPressOut}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[
                          styles.saveButton,
                          (!newCategoryName.trim() || addingCategory) && styles.disabledButton
                        ]}
                        onPress={handleAddCategory}
                        disabled={!newCategoryName.trim() || addingCategory}
                        activeOpacity={platformConfig.touch.activeOpacity}
                        delayPressIn={platformConfig.touch.delayPressIn}
                        delayPressOut={platformConfig.touch.delayPressOut}
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
                      onPress={() => setShowAddForm(true)}
                      activeOpacity={platformConfig.touch.activeOpacity}
                      delayPressIn={platformConfig.touch.delayPressIn}
                      delayPressOut={platformConfig.touch.delayPressOut}
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
                            onPress={() => handleSelectCategory(item)}
                            activeOpacity={platformConfig.touch.activeOpacity}
                            delayPressIn={platformConfig.touch.delayPressIn}
                            delayPressOut={platformConfig.touch.delayPressOut}
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
    fontSize: 12,
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
    fontSize: 12,
  },
  changeButton: {
    marginLeft: 12,
    padding: 8,
  },
  changeButtonText: {
    color: '#4158D0',
    fontFamily: 'Inter-Medium',
    fontSize: 12,
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
    fontSize: 18,
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
    fontSize: 12,
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
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  addFormContainer: {
    padding: 20,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  inputContainer: {
    backgroundColor: '#f5f6fa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(223, 228, 234, 0.5)',
    paddingLeft: 16,
    paddingRight: 16,
    ...(Platform.OS === 'android' && {
      paddingStart: 16,
      paddingEnd: 16,
    }),
  },
  input: {
    backgroundColor: 'transparent',
    height: 56,
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: '#2c3e50',
    textAlign: 'left',
    paddingLeft: 0,
    paddingRight: 0,
    ...(Platform.OS === 'android' && {
      textAlignVertical: 'center',
      includeFontPadding: false,
      paddingStart: 0,
      paddingEnd: 0,
      paddingTop: 0,
      paddingBottom: 0,
    }),
  },
  colorLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
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
    fontSize: 12,
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
    fontSize: 12,
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.5,
  },
});