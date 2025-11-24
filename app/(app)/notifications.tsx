import { View, StyleSheet } from 'react-native';
import { NotificationsList } from '../../components/NotificationsList';
import { Stack } from 'expo-router';
import { FONT_FAMILY } from '../../constants/Typography'; 
export default function NotificationsScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerTitleStyle: styles.title,
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
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 24,
    color: '#fff',
  },
}); 