import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { X, Trash2, Power, PowerOff } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { TEXT_STYLES, FONT_FAMILY, FONT_SIZES } from '../constants/Typography';

type BulkActionBarProps = {
  selectedCount: number;
  onCancel: () => void;
  onDelete: () => void;
  onToggleStatus: (active: boolean) => void;
  showToggleControls?: boolean;
};

export default function BulkActionBar({ 
  selectedCount, 
  onCancel, 
  onDelete,
  onToggleStatus,
  showToggleControls = true
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.barContent}>
        <View style={styles.leftSection}>
          <TouchableOpacity
            style={styles.closeIcon}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <X size={20} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.selectedText}>{selectedCount} selected</Text>
        </View>

        <View style={styles.actionIcons}>
          {showToggleControls && onToggleStatus && (
            <>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => onToggleStatus(true)}
                activeOpacity={0.7}
              >
                <Power size={18} color="#2ecc71" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => onToggleStatus(false)}
                activeOpacity={0.7}
              >
                <PowerOff size={18} color="#95a5a6" />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onDelete}
            activeOpacity={0.7}
          >
            <Trash2 size={18} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
   
  },
  barContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  closeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f6fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: FONT_SIZES.bodySmall,
    color: '#2c3e50',
  },
  actionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f6fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
});