import React from 'react';
import { TouchableOpacity as GHTouchableOpacity, TouchableOpacityProps } from 'react-native-gesture-handler';

// Global TouchableOpacity wrapper to ensure consistent behavior
const TouchableOpacity: React.FC<TouchableOpacityProps> = (props) => {
  return (
    <GHTouchableOpacity
      activeOpacity={0.7}
      {...props}
    />
  );
};

export default TouchableOpacity; 