import React, { forwardRef } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  TextInputProps,
  ViewStyle,
  TextStyle
} from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  inputStyle?: TextStyle;
  errorStyle?: TextStyle;
  multiline?: boolean;
  numberOfLines?: number;
}

const Input = forwardRef<TextInput, InputProps>(({
  label,
  error,
  containerStyle,
  labelStyle,
  inputStyle,
  errorStyle,
  multiline,
  numberOfLines,
  ...props
}, ref) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, labelStyle]}>{label}</Text>}
      <View style={styles.inputWrapper}>
        <TextInput
          ref={ref}
          style={[
            styles.input,
            error && styles.inputError,
            multiline && styles.multilineInput,
            inputStyle
          ]}
          placeholderTextColor="#95a5a6"
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...props}
        />
      </View>
      {error && <Text style={[styles.error, errorStyle]}>{error}</Text>}
    </View>
  );
});

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
  inputWrapper: {
    position: 'relative',
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
  },
  multilineInput: {
    height: 120,
    paddingTop: 16,
    paddingBottom: 16,
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  error: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 4,
  },
});

export default Input;