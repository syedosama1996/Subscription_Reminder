import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { X, Trash2, Power } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { TouchableOpacity } from 'react-native-gesture-handler';
type BulkActionBarProps = {
  selectedCount: number;
  onCancel: () => void;
  onDelete: () => void;
  onToggleStatus: (active: boolean) => void;
};

export default function BulkActionBar({ 
  selectedCount, 
  onCancel, 
  onDelete,
  onToggleStatus
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  const Content = () => (
    <View style={styles.content}>
      <View style={styles.infoContainer}>
        <Text style={styles.selectedText}>{selectedCount} selected</Text>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={onCancel}
        >
          <X size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onToggleStatus(true)}
        >
          <Power size={20} color="#fff" />
          <Text style={styles.actionText}>Activate</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onToggleStatus(false)}
        >
          <Power size={20} color="#fff" />
          <Text style={styles.actionText}>Deactivate</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={onDelete}
        >
          <Trash2 size={20} color="#fff" />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
          <Content />
        </BlurView>
      ) : (
        <View style={styles.androidContainer}>
          <Content />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  blurContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  androidContainer: {
    backgroundColor: 'rgba(44, 62, 80, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  content: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 90 : 100,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectedText: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#fff',
  },
  cancelButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    // justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  deleteButton: {
    backgroundColor: 'rgba(231, 76, 60, 0.5)',
  },
  actionText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#fff',
    marginLeft: 8,
  },
});