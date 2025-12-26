import React, { forwardRef } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  TextInputProps,
  ViewStyle,
  TextStyle,
  Platform
} from 'react-native';
import { TEXT_STYLES, FONT_FAMILY, FONT_SIZES } from '../constants/Typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  inputStyle?: TextStyle;
  errorStyle?: TextStyle;
  multiline?: boolean;
  numberOfLines?: number;
  children?: React.ReactNode;
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
  children,
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
            Platform.OS === 'ios' ? styles.inputIOS : styles.inputAndroid,
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
        {children}
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
    ...TEXT_STYLES.label,
    fontSize: FONT_SIZES.caption,
    marginBottom: 6,
    color: '#2c3e50',
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#f8f9fa',
    height: 50,
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 12,
    fontFamily: FONT_FAMILY.regular,
    fontSize: FONT_SIZES.input,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  inputIOS: {
    // iOS-specific adjustments - no paddingTop/paddingBottom to let iOS handle centering naturally
  },
  inputAndroid: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  multilineInput: {
    height: 100,
    paddingTop: 12,
    paddingBottom: 12,
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  error: {
    ...TEXT_STYLES.error,
    color: '#e74c3c',
    fontSize: FONT_SIZES.tiny,
    marginTop: 4,
  },
});

export default Input;