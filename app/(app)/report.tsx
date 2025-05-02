import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Dimensions, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { BarChart2, DollarSign, Calendar, TrendingUp, ArrowLeft, Download, Filter, ChevronDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getSubscriptions, getSubscriptionHistory, exportSubscriptionsToCSV } from '../../lib/subscriptions';
import { getUserInvoices } from '../../lib/invoices';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { BarChart, LineChart } from 'react-native-chart-kit';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { router } from 'expo-router';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import CustomLoader from '@/components/CustomLoader';

interface CategoryData {
  name: string;
  count: number;
}

interface MonthlyData {
  month: string;
  amount: number;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

export default function ReportScreen() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [isDateRangeModalVisible, setIsDateRangeModalVisible] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();
  const [stats, setStats] = useState({
    totalSpent: 0,
    activeSubscriptions: 0,
    monthlyAverage: 0,
    topCategory: 'N/A'
  });
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
    label: 'Last Month'
  });

  // Predefined date ranges
  const dateRanges: DateRange[] = [
    {
      startDate: new Date(new Date().setDate(new Date().getDate() - 7)),
      endDate: new Date(),
      label: 'Last 7 Days'
    },
    {
      startDate: new Date(new Date().setDate(new Date().getDate() - 15)),
      endDate: new Date(),
      label: 'Last 15 Days'
    },
    {
      startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
      endDate: new Date(),
      label: 'Last 30 Days'
    },
    {
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
      label: 'Last Month'
    },
    {
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 3)),
      endDate: new Date(),
      label: 'Last 3 Months'
    },
    {
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 6)),
      endDate: new Date(),
      label: 'Last 6 Months'
    },
    {
      startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
      endDate: new Date(),
      label: 'Last Year'
    }
  ];

  useEffect(() => {
    if (Platform.OS !== 'web') {
      requestMediaLibraryPermission();
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadReportData();
    }
  }, [user, dateRange]);

  const loadReportData = async () => {
    try {
      setLoading(true);

      // Get subscriptions
      const subscriptions = await getSubscriptions(user?.id || '');
      const activeSubscriptions = subscriptions?.filter(sub => sub.is_active) || [];

      // Get invoices
      const invoices = await getUserInvoices(user?.id || '');

      // Filter invoices by date range
      const filteredInvoices = invoices.filter(inv => {
        if (!inv.created_at) return false;
        const invoiceDate = new Date(inv.created_at);
        return invoiceDate >= dateRange.startDate && invoiceDate <= dateRange.endDate;
      });

      // Calculate stats
      const totalSpent = filteredInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
      
      // Calculate days between start and end date for average calculation
      const daysDiff = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
      const dailyAverage = daysDiff > 0 ? totalSpent / daysDiff : 0;
      const monthlyAverage = dailyAverage * 30; // Approximate monthly average

      // Get top category
      const categoryCounts: Record<string, number> = {};
      activeSubscriptions.forEach(sub => {
        if (sub.category?.name) {
          categoryCounts[sub.category.name] = (categoryCounts[sub.category.name] || 0) + 1;
        }
      });

      const topCategory = Object.entries(categoryCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0] || 'N/A';

      setStats({
        totalSpent,
        activeSubscriptions: activeSubscriptions.length,
        monthlyAverage,
        topCategory
      });

      // Prepare chart data
      const categoryChartData: CategoryData[] = Object.entries(categoryCounts).map(([name, count]) => ({
        name,
        count
      }));
      setCategoryData(categoryChartData);

      // Prepare monthly trend data - Use a Map to preserve order and handle missing months if needed
      const monthlyTrendsMap = new Map<string, number>();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      // Initialize map with zero amounts for the months in the date range
      const startMonth = dateRange.startDate.getMonth();
      const endMonth = dateRange.endDate.getMonth();
      const startYear = dateRange.startDate.getFullYear();
      const endYear = dateRange.endDate.getFullYear();
      
      // Calculate months between start and end date
      const monthsDiff = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
      
      for (let i = 0; i < monthsDiff; i++) {
        const d = new Date(startYear, startMonth + i, 1);
        const month = monthNames[d.getMonth()];
        monthlyTrendsMap.set(month, 0);
      }

      filteredInvoices.forEach(inv => {
        if (inv.created_at) {
          const date = new Date(inv.created_at);
          const month = monthNames[date.getMonth()];
          if (monthlyTrendsMap.has(month)) {
             monthlyTrendsMap.set(month, (monthlyTrendsMap.get(month) || 0) + inv.total_amount);
          }
        }
      });

      const monthlyChartData: MonthlyData[] = Array.from(monthlyTrendsMap.entries()).map(([month, amount]) => ({
        month,
        amount
      }));
      setMonthlyData(monthlyChartData);

    } catch (error) {
      console.error('Error loading report data:', error);
      Alert.alert('Error', 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeSelect = (range: DateRange) => {
    setDateRange(range);
    setIsDateRangeModalVisible(false);
  };

  const handleCustomDateChange = (event: any, selectedDate?: Date, isStartDate: boolean = true) => {
    if (isStartDate) {
      setShowStartDatePicker(false);
      if (selectedDate) {
        setDateRange(prev => ({
          ...prev,
          startDate: selectedDate,
          label: 'Custom Range'
        }));
      }
    } else {
      setShowEndDatePicker(false);
      if (selectedDate) {
        setDateRange(prev => ({
          ...prev,
          endDate: selectedDate,
          label: 'Custom Range'
        }));
      }
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const generateReportHtml = () => {
    const date = new Date().toLocaleDateString();
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Subscription Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; }
            h1 { color: #4158D0; }
            .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px; }
            .stat-card { background: #f0f0f0; padding: 15px; border-radius: 8px; border: 1px solid #e0e0e0; }
            .stat-label { color: #555; font-size: 14px; margin-bottom: 5px; }
            .stat-value { color: #2c3e50; font-size: 18px; font-weight: bold; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 20px; color: #C850C0; margin-bottom: 15px; border-bottom: 2px solid #C850C0; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background: #e8e8e8; font-weight: bold; }
            tbody tr:nth-child(even) { background-color: #f9f9f9; }
            .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #888; }
            .date-range { text-align: center; margin-bottom: 20px; font-style: italic; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Subscription Report</h1>
            <p>Generated on ${date} for ${user?.email || 'User'}</p>
            <p class="date-range">Period: ${dateRange.label} (${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)})</p>
          </div>

          <div class="stats">
            <div class="stat-card">
              <div class="stat-label">Total Spent (PKR)</div>
              <div class="stat-value">${stats.totalSpent.toLocaleString()}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Active Subscriptions</div>
              <div class="stat-value">${stats.activeSubscriptions}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Monthly Average (PKR)</div>
              <div class="stat-value">${stats.monthlyAverage.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Top Category</div>
              <div class="stat-value">${stats.topCategory}</div>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">Spending by Category</h2>
            ${categoryData.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Active Subscriptions</th>
                </tr>
              </thead>
              <tbody>
                ${categoryData.map(item => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.count}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ` : '<p>No category data available.</p>'}
          </div>

          <div class="section">
            <h2 class="section-title">Monthly Spending Trend (Last 12 Months)</h2>
             ${monthlyData.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Amount (PKR)</th>
                </tr>
              </thead>
              <tbody>
                ${monthlyData.map(item => `
                  <tr>
                    <td>${item.month}</td>
                    <td>${item.amount.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
             ` : '<p>No monthly spending data available.</p>'}
          </div>

          <div class="footer">
             Report generated by Subbi App
          </div>
        </body>
      </html>
    `;
  };

  const handleExport = async (format: 'pdf' | 'csv' | 'png') => {
    setIsExportModalVisible(false);
    if (exporting) return;

    // Declare fileUri here to be accessible in finally block
    let fileUri: string | undefined = undefined;

    if (Platform.OS !== 'web') {
      if (!mediaLibraryPermission?.granted) {
        const { status } = await requestMediaLibraryPermission();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Storage permission is needed to save the report.');
          return;
        }
      }
    } else {
         Alert.alert('Not Supported', 'Direct saving is not supported on the web.');
         return;
    }

    try {
      setExporting(true);
      const timestamp = Date.now();
      const baseFileName = `subscription_report_${timestamp}`;
      let finalFileName = `${baseFileName}.${format}`;
      let tempFilePath: string | undefined = undefined;

      const cacheDir = FileSystem.cacheDirectory + 'reports/';
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });

      if (format === 'csv') {
        const subscriptions = await getSubscriptions(user?.id || '');
        const csvContent = exportSubscriptionsToCSV(subscriptions || []);
        tempFilePath = `${cacheDir}${finalFileName}`;
        await FileSystem.writeAsStringAsync(tempFilePath, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
        fileUri = tempFilePath;
      } else if (format === 'pdf') {
        // Check if RNHTMLtoPDF module is loaded
        if (!RNHTMLtoPDF) {
          throw new Error('PDF generation module is not available. Please ensure the app is rebuilt after installing react-native-html-to-pdf.');
        }

        const html = generateReportHtml();
        tempFilePath = `${cacheDir}${finalFileName}`;
        const options = {
          html,
          fileName: baseFileName,
          // Request base64 output instead of relying on filePath
          base64: true,
          // Add directory back to satisfy type definition, even if not strictly needed for base64
          directory: 'docs' // Or another valid directory name
        };

        const pdfResult = await RNHTMLtoPDF.convert(options);

        if (!pdfResult.base64) {
            throw new Error('Failed to generate PDF base64 content.');
        }

        // Write the base64 content to the temporary file
        await FileSystem.writeAsStringAsync(tempFilePath, pdfResult.base64, { encoding: FileSystem.EncodingType.Base64 });
        fileUri = tempFilePath; // Use the URI of the file we just wrote

      } else if (format === 'png') {
        if (viewShotRef.current?.capture) {
          const uri = await viewShotRef.current.capture();
          if (!uri) throw new Error('Failed to capture screenshot URI.');
          tempFilePath = `${cacheDir}${finalFileName}`;
          // Move the captured image from its original (likely cache) location to our cache dir
          await FileSystem.moveAsync({
            from: uri,
            to: tempFilePath,
          });
          fileUri = tempFilePath;
        } else {
          throw new Error('Failed to capture screenshot reference.');
        }
      }

      // Share the generated file using the native share sheet
      if (fileUri) {
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (!fileInfo.exists) {
            console.error(`Temporary file not found at URI: ${fileUri}`);
            throw new Error(`Temporary ${format.toUpperCase()} file could not be found before sharing.`);
        }

        // Determine MIME type for sharing
        let mimeType:
         string | undefined;
        if (format === 'pdf') mimeType = 'application/pdf';
        else if (format === 'csv') mimeType = 'text/csv';
        else if (format === 'png') mimeType = 'image/png';

        if (!(await Sharing.isAvailableAsync())) {
            Alert.alert('Sharing Not Available', 'Sharing functionality is not available on this device.');
            setExporting(false);
            return; // Exit if sharing isn't possible
        }

        await Sharing.shareAsync(fileUri, {
             mimeType,
             dialogTitle: `Share Report as ${format.toUpperCase()}`
        });

        // Note: No confirmation alert here, as the user handles saving via the share sheet.

      } else {
        throw new Error(`Failed to generate file URI for ${format.toUpperCase()}.`);
      }

    } catch (error: any) {
      console.error('Error exporting/sharing report:', error);
      Alert.alert('Export Error', `Failed to prepare report for sharing: ${error.message || 'Unknown error'}`);
    } finally {
      setExporting(false);
       // Optional: Clean up the temporary file in cache after sharing attempt
      if (fileUri) {
          await FileSystem.deleteAsync(fileUri, { idempotent: true });
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#4158D0', '#C850C0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        />
        <CustomLoader visible={true} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#4158D0', '#C850C0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPressIn={() => router.back()}
        >
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Reports</Text>
        <View style={styles.headerButtons}>
      
          <TouchableOpacity
            style={[styles.exportButton, exporting && styles.disabledButton]}
            onPressIn={() => setIsExportModalVisible(true)}
            disabled={exporting}
          >
             {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Download size={24} color="#fff" />}
          </TouchableOpacity>
        </View>
      </View>

      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }} style={{ flex: 1 }}>
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 20 }}>
          <View style={styles.dateRangeSelector}>
            <TouchableOpacity 
              style={styles.dateRangeButton}
              onPressIn={() => setIsDateRangeModalVisible(true)}
            >
              <Calendar size={20} color="#4158D0" />
              <Text style={styles.dateRangeText}>{dateRange.label}</Text>
              <ChevronDown size={20} color="#4158D0" />
            </TouchableOpacity>
            <Text style={styles.dateRangeDetail}>
              {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
            </Text>
          </View>

          <View style={styles.statsCard}>
             <View style={styles.statRow}>
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
                    <Text style={styles.statLabel}>Active Subs</Text>
                    <Text style={styles.statValue}>{stats.activeSubscriptions}</Text>
                  </View>
                </View>
              </View>
               <View style={styles.statRow}>
                 <View style={styles.statItem}>
                   <Calendar size={24} color="#4158D0" />
                   <View style={styles.statInfo}>
                     <Text style={styles.statLabel}>Monthly Avg</Text>
                     <Text style={styles.statValue}>PKR {stats.monthlyAverage.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
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
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Spending by Category</Text>
            {categoryData.length > 0 ? (
              <BarChart
                data={{
                  labels: categoryData.map(item => item.name.length > 10 ? item.name.substring(0, 8) + '...' : item.name),
                  datasets: [{
                    data: categoryData.map(item => item.count)
                  }]
                }}
                width={Dimensions.get('window').width - (styles.content.paddingHorizontal * 2) - (styles.section.padding * 2)}
                height={220}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(65, 88, 208, ${opacity})`,
                   labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16
                  },
                   propsForDots: {
                      r: "4",
                      strokeWidth: "1",
                      stroke: "#4158D0"
                  }
                }}
                style={styles.chart}
                verticalLabelRotation={30}
              />
            ) : (
              <View style={styles.chartPlaceholder}>
                <Text style={styles.chartText}>No category data available</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Monthly Trends</Text>
            {monthlyData.length > 0 && monthlyData.some(d => d.amount > 0) ? (
              <LineChart
                data={{
                  labels: monthlyData.map(item => item.month),
                  datasets: [{
                    data: monthlyData.map(item => item.amount)
                  }]
                }}
                width={Dimensions.get('window').width - (styles.content.paddingHorizontal * 2) - (styles.section.padding * 2)}
                height={220}
                yAxisLabel="PKR "
                yAxisSuffix=""
                yAxisInterval={1}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(200, 80, 192, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16
                  },
                  propsForDots: {
                     r: "4",
                     strokeWidth: "1",
                     stroke: "#C850C0"
                   }
                }}
                bezier
                style={styles.chart}
              />
            ) : (
              <View style={styles.chartPlaceholder}>
                <Text style={styles.chartText}>No monthly trend data available</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </ViewShot>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isDateRangeModalVisible}
        onRequestClose={() => setIsDateRangeModalVisible(false)}
      >
        <View style={styles.modalCenteredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Select Date Range</Text>
            
            {dateRanges.map((range, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dateRangeOption,
                  dateRange.label === range.label && styles.selectedDateRangeOption
                ]}
                onPressIn={() => handleDateRangeSelect(range)}
              >
                <Text style={[
                  styles.dateRangeOptionText,
                  dateRange.label === range.label && styles.selectedDateRangeOptionText
                ]}>
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
            
            <View style={styles.customDateRangeContainer}>
              <Text style={styles.customDateRangeTitle}>Custom Range</Text>
              
              <TouchableOpacity
                style={styles.customDateButton}
                onPressIn={() => setShowStartDatePicker(true)}
              >
                <Text style={styles.customDateButtonText}>
                  Start: {formatDate(dateRange.startDate)}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.customDateButton}
                onPressIn={() => setShowEndDatePicker(true)}
              >
                <Text style={styles.customDateButtonText}>
                  End: {formatDate(dateRange.endDate)}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.applyCustomDateButton}
                onPressIn={() => {
                  setDateRange(prev => ({...prev, label: 'Custom Range'}));
                  setIsDateRangeModalVisible(false);
                }}
              >
                <Text style={styles.applyCustomDateButtonText}>Apply Custom Range</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.modalButtonClose}
              onPressIn={() => setIsDateRangeModalVisible(false)}
            >
              <Text style={styles.modalButtonCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Pickers */}
      {showStartDatePicker && Platform.OS !== 'web' && (
        <RNDateTimePicker
          value={dateRange.startDate}
          mode="date"
          onChange={(event, date) => handleCustomDateChange(event, date, true)}
          maximumDate={dateRange.endDate}
        />
      )}
      
      {showEndDatePicker && Platform.OS !== 'web' && (
        <RNDateTimePicker
          value={dateRange.endDate}
          mode="date"
          onChange={(event, date) => handleCustomDateChange(event, date, false)}
          minimumDate={dateRange.startDate}
        />
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={isExportModalVisible}
        onRequestClose={() => {
          setIsExportModalVisible(!isExportModalVisible);
        }}
      >
        <View style={styles.modalCenteredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Save Report As:</Text>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPDF]}
              onPressIn={() => handleExport('pdf')}
              disabled={exporting}
            >
                <Text style={styles.modalButtonText}>PDF Document</Text>
            </TouchableOpacity>
             <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPNG]}
              onPressIn={() => handleExport('png')}
              disabled={exporting}
            >
                <Text style={styles.modalButtonText}>PNG Image</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCSV]}
              onPressIn={() => handleExport('csv')}
              disabled={exporting}
            >
               <Text style={styles.modalButtonText}>CSV Spreadsheet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonClose]}
              onPressIn={() => setIsExportModalVisible(false)}
            >
              <Text style={styles.modalButtonCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 160,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 15 : 10,
    paddingBottom: 10,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    color: '#fff',
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    minHeight: 70,
  },
  statInfo: {
    marginLeft: 10,
    flex: 1,
    justifyContent: 'center',
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#555',
    marginBottom: 2,
  },
  statValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#2c3e50',
    flexShrink: 1,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#333',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chartText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#7f8c8d',
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalCenteredView: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalView: {
    width: '100%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
   modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 20,
    color: '#333',
  },
  modalButton: {
    width: '90%',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 10,
    elevation: 2,
    alignItems: 'center',
  },
  modalButtonPDF: {
      backgroundColor: '#D32F2F',
  },
  modalButtonPNG: {
      backgroundColor: '#388E3C',
  },
  modalButtonCSV: {
      backgroundColor: '#1976D2',
  },
   modalButtonClose: {
    marginTop: 10,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ccc',
   },
  modalButtonText: {
    color: 'white',
    fontFamily: 'Inter-Medium',
    fontSize: 16,
  },
  modalButtonCloseText: {
    color: '#555',
    fontFamily: 'Inter-Medium',
    fontSize: 16,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  dateRangeSelector: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  dateRangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f2f5',
    borderRadius: 8,
    marginBottom: 5,
  },
  dateRangeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#4158D0',
    marginHorizontal: 8,
  },
  dateRangeDetail: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  dateRangeOption: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f0f2f5',
  },
  selectedDateRangeOption: {
    backgroundColor: '#4158D0',
  },
  dateRangeOptionText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  selectedDateRangeOptionText: {
    color: '#fff',
  },
  customDateRangeContainer: {
    width: '100%',
    marginTop: 15,
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  customDateRangeTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  customDateButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  customDateButtonText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#333',
  },
  applyCustomDateButton: {
    backgroundColor: '#4158D0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  applyCustomDateButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
}); 