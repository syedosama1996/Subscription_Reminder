import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react-native';

interface CustomModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
  confirmButtonColor?: string;
  cancelButtonColor?: string;
}

export default function CustomModal({
  visible,
  onClose,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  showCancel = false,
  confirmButtonColor,
  cancelButtonColor,
}: CustomModalProps) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={32} color="#10b981" />;
      case 'error':
        return <AlertCircle size={32} color="#ef4444" />;
      case 'warning':
        return <AlertTriangle size={32} color="#f59e0b" />;
      case 'confirm':
        return <AlertTriangle size={32} color="#6366f1" />;
      default:
        return <Info size={32} color="#6366f1" />;
    }
  };

  const getConfirmButtonColor = () => {
    if (confirmButtonColor) return confirmButtonColor;
    
    switch (type) {
      case 'success':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'confirm':
        return '#ef4444';
      default:
        return '#6366f1';
    }
  };

  const getCancelButtonColor = () => {
    if (cancelButtonColor) return cancelButtonColor;
    return '#6b7280';
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#ffffff', '#f8fafc']}
            style={styles.modalContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                {getIcon()}
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <X size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              {showCancel && (
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.cancelButton,
                    { borderColor: getCancelButtonColor() }
                  ]}
                  onPress={handleCancel}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.buttonText,
                    styles.cancelButtonText,
                    { color: getCancelButtonColor() }
                  ]}>
                    {cancelText}
                  </Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.confirmButton,
                  { backgroundColor: getConfirmButtonColor() },
                  showCancel && styles.confirmButtonWithCancel
                ]}
                onPress={handleConfirm}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.buttonText,
                  styles.confirmButtonText
                ]}>
                  {confirmText}
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: width - 40,
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalContent: {
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    position: 'relative',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 24,
    top: 24,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  confirmButton: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmButtonWithCancel: {
    flex: 1,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  cancelButtonText: {
    // Color is set dynamically
  },
  confirmButtonText: {
    color: '#ffffff',
  },
});
