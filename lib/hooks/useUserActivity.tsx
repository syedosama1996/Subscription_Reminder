import React from 'react';
import { useSecurity } from '../security';
import { TouchableWithoutFeedback, View } from 'react-native';

export function useUserActivity() {
  const { resetInactivityTimer } = useSecurity();

  // Create a wrapper component that resets the timer on any touch
  const ActivityWrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <TouchableWithoutFeedback onPress={() => resetInactivityTimer()}>
        <View style={{ flex: 1 }}>
          {children}
        </View>
      </TouchableWithoutFeedback>
    );
  };

  return { ActivityWrapper };
} 