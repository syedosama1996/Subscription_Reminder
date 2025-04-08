import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { BarChart2, DollarSign, Calendar, TrendingUp, Filter } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ReportScreen() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Mock data for reports
  const stats = {
    totalSpent: 8997,
    activeSubscriptions: 3,
    monthlyAverage: 2999,
    topCategory: 'Entertainment'
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#4158D0', '#C850C0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      />
      
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.periodContainer}>
        <TouchableOpacity 
          style={[styles.periodTab, selectedPeriod === 'week' && styles.activePeriodTab]}
          onPress={() => setSelectedPeriod('week')}
        >
          <Text style={[styles.periodText, selectedPeriod === 'week' && styles.activePeriodText]}>Week</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.periodTab, selectedPeriod === 'month' && styles.activePeriodTab]}
          onPress={() => setSelectedPeriod('month')}
        >
          <Text style={[styles.periodText, selectedPeriod === 'month' && styles.activePeriodText]}>Month</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.periodTab, selectedPeriod === 'year' && styles.activePeriodTab]}
          onPress={() => setSelectedPeriod('year')}
        >
          <Text style={[styles.periodText, selectedPeriod === 'year' && styles.activePeriodText]}>Year</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <DollarSign size={24} color="#4158D0" />
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Total Spent</Text>
              <Text style={styles.statValue}>PKR {stats.totalSpent.toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.statItem}>
            <BarChart2 size={24} color="#4158D0" />
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Active Subscriptions</Text>
              <Text style={styles.statValue}>{stats.activeSubscriptions}</Text>
            </View>
          </View>

          <View style={styles.statItem}>
            <Calendar size={24} color="#4158D0" />
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Monthly Average</Text>
              <Text style={styles.statValue}>PKR {stats.monthlyAverage.toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.statItem}>
            <TrendingUp size={24} color="#4158D0" />
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Top Category</Text>
              <Text style={styles.statValue}>{stats.topCategory}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spending by Category</Text>
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartText}>Chart will be displayed here</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Trends</Text>
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartText}>Chart will be displayed here</Text>
          </View>
        </View>
      </ScrollView>
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
  periodContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  periodTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  activePeriodTab: {
    backgroundColor: '#fff',
  },
  periodText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  activePeriodText: {
    color: '#4158D0',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statInfo: {
    marginLeft: 16,
    flex: 1,
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  statValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#2c3e50',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#2c3e50',
    marginBottom: 16,
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#7f8c8d',
  },
}); 