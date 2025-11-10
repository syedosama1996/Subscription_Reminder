import { Platform, Dimensions } from 'react-native';

export const isAndroid = Platform.OS === 'android';
export const isIOS = Platform.OS === 'ios';

// Get device dimensions
const { width, height } = Dimensions.get('window');

// Check if device is a tablet
export const isTablet = () => {
  const pixelDensity = Dimensions.get('screen').scale;
  const adjustedWidth = width * pixelDensity;
  const adjustedHeight = height * pixelDensity;
  
  if (pixelDensity < 2 && (adjustedWidth >= 1000 || adjustedHeight >= 1000)) {
    return true;
  } else {
    return pixelDensity === 2 && (adjustedWidth >= 1920 || adjustedHeight >= 1920);
  }
};

// Device-specific configurations
export const deviceConfig = {
  isAndroid,
  isIOS,
  isTablet: isTablet(),
  screenWidth: width,
  screenHeight: height,
};

// Keyboard configuration for different devices
export const keyboardConfig = {
  android: {
    behavior: 'height' as const,
    keyboardVerticalOffset: 0,
  },
  ios: {
    behavior: 'padding' as const,
    keyboardVerticalOffset: 0,
  },
};

// Touch configuration for better responsiveness
export const touchConfig = {
  android: {
    activeOpacity: 0.7,
    delayPressIn: 0,
    delayPressOut: 0,
    
  },
  ios: {
    activeOpacity: 0.6,
    delayPressIn: 0,
    delayPressOut: 0,
  },
};

// Get platform-specific configuration
export const getPlatformConfig = () => {
  return isAndroid ? {
    keyboard: keyboardConfig.android,
    touch: touchConfig.android,
  } : {
    keyboard: keyboardConfig.ios,
    touch: touchConfig.ios,
  };
}; 