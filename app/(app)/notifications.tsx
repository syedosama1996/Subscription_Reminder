import { View, StyleSheet } from 'react-native';
import { NotificationsList } from '../../components/NotificationsList';
import { Stack } from 'expo-router';

export default function NotificationsScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerShown: true,
        }}
      />
      <NotificationsList />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
}); 