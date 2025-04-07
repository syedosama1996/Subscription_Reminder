import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { Reminder, updateReminder, deleteReminder } from '../lib/subscriptions';

type ReminderItemProps = {
  reminder: Reminder;
  onUpdate: () => void;
};

export default function ReminderItem({ reminder, onUpdate }: ReminderItemProps) {
  const [isEnabled, setIsEnabled] = useState(reminder.enabled);
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleSwitch = async () => {
    try {
      setIsEnabled(!isEnabled);
      if (reminder.id) {
        await updateReminder(reminder.id, { enabled: !isEnabled });
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating reminder:', error);
      setIsEnabled(isEnabled); // Revert on error
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      if (reminder.id) {
        await deleteReminder(reminder.id);
        onUpdate();
      }
    } catch (error) {
      console.error('Error deleting reminder:', error);
      setIsDeleting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.reminderInfo}>
        <Text style={styles.daysText}>
          {reminder.days_before === 1 
            ? '1 day before' 
            : `${reminder.days_before} days before`}
        </Text>
        <Switch
          trackColor={{ false: '#bdc3c7', true: '#3498db' }}
          thumbColor={isEnabled ? '#fff' : '#f4f3f4'}
          ios_backgroundColor="#bdc3c7"
          onValueChange={toggleSwitch}
          value={isEnabled}
        />
      </View>
      
      <TouchableOpacity 
        style={styles.deleteButton} 
        onPress={handleDelete}
        disabled={isDeleting}
      >
        <Trash2 size={18} color="#e74c3c" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  reminderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  daysText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  deleteButton: {
    marginLeft: 16,
    padding: 4,
  },
});