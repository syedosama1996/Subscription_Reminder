import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ActivityLog } from '../lib/types';
import { 
  Plus, 
  Trash2, 
  Edit, 
  RefreshCw, 
  Power, 
  Tag, 
  Clock 
} from 'lucide-react-native';

type ActivityLogItemProps = {
  log: ActivityLog;
};

export default function ActivityLogItem({ log }: ActivityLogItemProps) {
  const getActionIcon = () => {
    switch (log.action) {
      case 'create':
        return <Plus size={18} color="#2ecc71" />;
      case 'delete':
        return <Trash2 size={18} color="#e74c3c" />;
      case 'update':
        return <Edit size={18} color="#3498db" />;
      case 'renew':
        return <RefreshCw size={18} color="#9b59b6" />;
      case 'activate':
        return <Power size={18} color="#2ecc71" />;
      case 'deactivate':
        return <Power size={18} color="#7f8c8d" />;
      default:
        return <Clock size={18} color="#7f8c8d" />;
    }
  };

  const getActionText = () => {
    const entityName = log.details?.service_name || log.details?.name || '';
    const entityType = log.entity_type.charAt(0).toUpperCase() + log.entity_type.slice(1);
    
    switch (log.action) {
      case 'create':
        return `Created ${entityType} "${entityName}"`;
      case 'delete':
        return `Deleted ${entityType} "${entityName}"`;
      case 'update':
        return `Updated ${entityType} "${entityName}"`;
      case 'renew':
        return `Renewed ${entityType} "${entityName}"`;
      case 'activate':
        return `Activated ${entityType} "${entityName}"`;
      case 'deactivate':
        return `Deactivated ${entityType} "${entityName}"`;
      default:
        return `${log.action} ${entityType}`;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        {getActionIcon()}
      </View>
      <View style={styles.content}>
        <Text style={styles.actionText}>{getActionText()}</Text>
        <Text style={styles.timestamp}>{formatDate(log.created_at || '')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  actionText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 4,
  },
  timestamp: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#7f8c8d',
  },
});