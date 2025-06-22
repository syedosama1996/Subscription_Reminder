import React from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native-gesture-handler';
import { getPlatformConfig } from '../utils/deviceUtils';

interface TouchableWrapperProps extends TouchableOpacityProps {
  children: React.ReactNode;
}

const TouchableWrapper: React.FC<TouchableWrapperProps> = ({ 
  children, 
  activeOpacity,
  delayPressIn,
  delayPressOut,
  ...props 
}) => {
  const platformConfig = getPlatformConfig();

  return (
    <TouchableOpacity
      activeOpacity={activeOpacity ?? platformConfig.touch.activeOpacity}
      delayPressIn={delayPressIn ?? platformConfig.touch.delayPressIn}
      delayPressOut={delayPressOut ?? platformConfig.touch.delayPressOut}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
};

export default TouchableWrapper; 