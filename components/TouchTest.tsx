import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

export default function TouchTest() {
  const [text, setText] = useState('');
  const [touchCount, setTouchCount] = useState(0);

  const handleTouch = () => {
    console.log('Touch test button pressed');
    setTouchCount(prev => prev + 1);
  };

  const handleTextInputFocus = () => {
    console.log('TextInput focused');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Touch Test</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Test TextInput"
        value={text}
        onChangeText={setText}
        onFocus={handleTextInputFocus}
        editable={true}
        selectTextOnFocus={true}
      />
      
      <TouchableOpacity
        style={styles.button}
        onPress={handleTouch}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>
          Touch Count: {touchCount}
        </Text>
      </TouchableOpacity>
      
      <Text style={styles.status}>
        TextInput value: {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    margin: 10,
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  status: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
}); 