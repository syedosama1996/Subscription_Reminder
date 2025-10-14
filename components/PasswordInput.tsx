import React, { useState, forwardRef } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Eye, EyeOff, Lock } from 'lucide-react-native';

type PasswordInputProps = {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
};

const PasswordInput = forwardRef<TextInput, PasswordInputProps>(
  ({ placeholder = 'Password', value, onChangeText }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <View style={styles.container}>
        {/* Left lock icon */}
        <Lock size={20} color="#7f8c8d" style={styles.iconLeft} />

        {/* Text input */}
        <TextInput
          ref={ref}
          style={styles.input}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          placeholderTextColor="#95a5a6"
            
        />

        {/* Eye toggle */}
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowPassword(!showPassword)}
          activeOpacity={0.7}
        >
          {showPassword ? (
            <EyeOff size={20} color="#64748b" />
          ) : (
            <Eye size={20} color="#64748b" />
          )}
        </TouchableOpacity>
      </View>
    );
  }
);

export default PasswordInput;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  iconLeft: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    backgroundColor: '#f5f6fa',
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: 'rgba(223, 228, 234, 0.5)',
    paddingRight: 50, // space for eye icon
  },
  eyeIcon: {
    position: 'absolute',
    right: 10,
    // top: '46%',
    transform: [{ translateY: 0 }], // center vertically
    padding: 4,
  },
});
