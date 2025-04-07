import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface CustomLoaderProps {
  visible: boolean;
}

const CustomLoader: React.FC<CustomLoaderProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4158D0', '#C850C0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ActivityIndicator 
          size="large" 
          color="rgba(255, 255, 255, 0.8)"
        />
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(65, 88, 208, 0.3)',
    zIndex: 999,
  },
  gradient: {
    padding: 20,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});

export default CustomLoader; 