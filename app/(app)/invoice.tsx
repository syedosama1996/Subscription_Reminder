import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { FileText, Download, Calendar, DollarSign, Filter } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function InvoiceScreen() {
  const { user } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Mock data for invoices
  const invoices = [
    {
      id: '1',
      date: '2024-03-15',
      amount: 2999,
      status: 'paid',
      subscription: 'Netflix Premium'
    },
    {
      id: '2',
      date: '2024-02-15',
      amount: 2999,
      status: 'paid',
      subscription: 'Netflix Premium'
    },
    {
      id: '3',
      date: '2024-01-15',
      amount: 2999,
      status: 'paid',
      subscription: 'Netflix Premium'
    }
  ];

  const renderInvoiceItem = ({ item }) => (
    <View style={styles.invoiceCard}>
      <View style={styles.invoiceHeader}>
        <View style={styles.invoiceInfo}>
          <Text style={styles.subscriptionName}>{item.subscription}</Text>
          <Text style={styles.invoiceDate}>{item.date}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'paid' ? '#2ecc71' : '#e74c3c' }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.invoiceDetails}>
        <View style={styles.amountContainer}>
          <DollarSign size={20} color="#7f8c8d" />
          <Text style={styles.amountText}>PKR {item.amount.toLocaleString()}</Text>
        </View>
        <TouchableOpacity style={styles.downloadButton}>
          <Download size={20} color="#4158D0" />
          <Text style={styles.downloadText}>Download</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#4158D0', '#C850C0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      />
      
      <View style={styles.header}>
        <Text style={styles.title}>Invoices</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterTab, selectedFilter === 'all' && styles.activeFilterTab]}
          onPress={() => setSelectedFilter('all')}
        >
          <Text style={[styles.filterText, selectedFilter === 'all' && styles.activeFilterText]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, selectedFilter === 'paid' && styles.activeFilterTab]}
          onPress={() => setSelectedFilter('paid')}
        >
          <Text style={[styles.filterText, selectedFilter === 'paid' && styles.activeFilterText]}>Paid</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, selectedFilter === 'pending' && styles.activeFilterTab]}
          onPress={() => setSelectedFilter('pending')}
        >
          <Text style={[styles.filterText, selectedFilter === 'pending' && styles.activeFilterText]}>Pending</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={invoices}
        renderItem={renderInvoiceItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#fff',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  activeFilterTab: {
    backgroundColor: '#fff',
  },
  filterText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  activeFilterText: {
    color: '#4158D0',
  },
  listContent: {
    padding: 20,
  },
  invoiceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  invoiceInfo: {
    flex: 1,
  },
  subscriptionName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 4,
  },
  invoiceDate: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#7f8c8d',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#fff',
  },
  invoiceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#2c3e50',
    marginLeft: 8,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(65, 88, 208, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  downloadText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#4158D0',
    marginLeft: 8,
  },
}); 