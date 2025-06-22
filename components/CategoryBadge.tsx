import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Category } from '../lib/types';
import { TouchableOpacity } from 'react-native-gesture-handler';
interface CategoryBadgeProps {
  category: Category;
  onPress?: () => void;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_COLORS = [
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

export default function CategoryBadge({ category, onPress, selected = false, style }: CategoryBadgeProps) {
  // Use the category's color or a default color based on the name
  const getColor = () => {
    if (category.color) return category.color;
    
    // Generate a consistent color based on the category name
    const nameHash = category.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return DEFAULT_COLORS[nameHash % DEFAULT_COLORS.length];
  };

  const color = getColor();
  
  const Component = onPress ? TouchableOpacity : View;
  
  return (
    <Component 
      style={[
        styles.container,
        { backgroundColor: category.color },
        selected && styles.selected,
        style
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.text}>{category.name}</Text>
    </Component>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  text: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  selected: {
    backgroundColor: '#fff',
  },
});