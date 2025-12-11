import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, Dimensions, Modal, Platform, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { BarChart2, DollarSign, Calendar, TrendingUp, ArrowLeft, Download, Filter, ChevronDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { getSubscriptions, getSubscriptionHistory, exportSubscriptionsToCSV } from '../../lib/subscriptions';
import { getUserInvoices } from '../../lib/invoices';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { BarChart, LineChart } from 'react-native-chart-kit';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { router } from 'expo-router';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import CustomLoader from '@/components/CustomLoader';
import { TEXT_STYLES, FONT_FAMILY, FONT_SIZES } from '../../constants/Typography';
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
  const insets = useSafeAreaInsets();
  const windowDimensions = useWindowDimensions();
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
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastMonthStart = new Date(today);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    lastMonthStart.setDate(1); // First day of last month
    const lastMonthEnd = new Date(today);
    lastMonthEnd.setDate(0); // Last day of previous month
    
    return {
      startDate: lastMonthStart,
      endDate: lastMonthEnd,
      label: 'Last Month'
    };
  });

  // Predefined date ranges
  const getDateRanges = (): DateRange[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return [
      {
        startDate: (() => {
          const date = new Date(today);
          date.setDate(date.getDate() - 6); // 7 days inclusive (today + 6 days back)
          return date;
        })(),
        endDate: new Date(today),
        label: 'Last 7 Days'
      },
      {
        startDate: (() => {
          const date = new Date(today);
          date.setDate(date.getDate() - 14); // 15 days inclusive
          return date;
        })(),
        endDate: new Date(today),
        label: 'Last 15 Days'
      },
      {
        startDate: (() => {
          const date = new Date(today);
          date.setDate(date.getDate() - 29); // 30 days inclusive
          return date;
        })(),
        endDate: new Date(today),
        label: 'Last 30 Days'
      },
      {
        startDate: (() => {
          const date = new Date(today);
          date.setMonth(date.getMonth() - 1);
          date.setDate(1); // First day of last month
          return date;
        })(),
        endDate: (() => {
          const date = new Date(today);
          date.setDate(0); // Last day of previous month
          return date;
        })(),
        label: 'Last Month'
      },
      {
        startDate: (() => {
          const date = new Date(today);
          date.setMonth(date.getMonth() - 3);
          return date;
        })(),
        endDate: new Date(today),
        label: 'Last 3 Months'
      },
      {
        startDate: (() => {
          const date = new Date(today);
          date.setMonth(date.getMonth() - 6);
          return date;
        })(),
        endDate: new Date(today),
        label: 'Last 6 Months'
      },
      {
        startDate: (() => {
          const date = new Date(today);
          date.setFullYear(date.getFullYear() - 1);
          return date;
        })(),
        endDate: new Date(today),
        label: 'Last Year'
      }
    ];
  };
  
  const dateRanges = getDateRanges();

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
      
      // Get invoices
      const invoices = await getUserInvoices(user?.id || '');

      // Filter by date range - normalize dates to start/end of day for accurate comparison
      const startOfStartDate = new Date(dateRange.startDate);
      startOfStartDate.setHours(0, 0, 0, 0);
      const endOfEndDate = new Date(dateRange.endDate);
      endOfEndDate.setHours(23, 59, 59, 999);
      
      // Filter subscriptions by purchase_date within the date range
      const filteredSubscriptions = subscriptions.filter(sub => {
        if (!sub.purchase_date) return false;
        const purchaseDate = new Date(sub.purchase_date);
        purchaseDate.setHours(0, 0, 0, 0);
        return purchaseDate >= startOfStartDate && purchaseDate <= endOfEndDate;
      });
      
      // Filter active subscriptions within the date range
      const activeSubscriptions = filteredSubscriptions.filter(sub => sub.is_active) || [];
      
      // Filter invoices by date range
      const filteredInvoices = invoices.filter(inv => {
        if (!inv.created_at) return false;
        const invoiceDate = new Date(inv.created_at);
        return invoiceDate >= startOfStartDate && invoiceDate <= endOfEndDate;
      });

      // Calculate stats
      const totalSpent = filteredInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      
      // Calculate days between start and end date for average calculation (inclusive of both dates)
      // Convert both dates to start of day for accurate day counting
      const startDateOnly = new Date(startOfStartDate.getFullYear(), startOfStartDate.getMonth(), startOfStartDate.getDate());
      const endDateOnly = new Date(endOfEndDate.getFullYear(), endOfEndDate.getMonth(), endOfEndDate.getDate());
      const timeDiff = endDateOnly.getTime() - startDateOnly.getTime();
      const daysDiff = Math.max(1, Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1); // +1 for inclusive counting
      
      // Calculate monthly average: projects daily spending to monthly equivalent
      // Formula: (Total Spent / Days in Range) × 30.44 days per month
      // This works for all scenarios:
      // - Short periods (7 days): projects what monthly spending would be
      // - Long periods (1 year): naturally converges to actual monthly average (Total/365 × 30.44 ≈ Total/12)
      const dailyAverage = daysDiff > 0 ? totalSpent / daysDiff : 0;
      const monthlyAverage = dailyAverage * 30.44; // Average days per month (365.25/12 = 30.4375, rounded to 30.44)

      // Get top category - use filtered subscriptions within date range
      const categoryCounts: Record<string, number> = {};
      activeSubscriptions.forEach(sub => {
        const categoryName = sub.category?.name || 'Uncategorized';
        categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
      });

      const topCategory = Object.entries(categoryCounts)
        .filter(([name]) => name !== 'Uncategorized') // Exclude uncategorized from top category
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

      // Prepare monthly trend data - Use a Map with year-month keys to handle year boundaries correctly
      const monthlyTrendsMap = new Map<string, { month: string; year: number; amount: number }>();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      // Initialize map with zero amounts for the months in the date range
      const startMonth = startOfStartDate.getMonth();
      const endMonth = endOfEndDate.getMonth();
      const startYear = startOfStartDate.getFullYear();
      const endYear = endOfEndDate.getFullYear();
      
      // Calculate months between start and end date
      const monthsDiff = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
      
      for (let i = 0; i < monthsDiff; i++) {
        const d = new Date(startYear, startMonth + i, 1);
        const month = d.getMonth();
        const year = d.getFullYear();
        const monthKey = `${year}-${month}`;
        monthlyTrendsMap.set(monthKey, {
          month: monthNames[month],
          year: year,
          amount: 0
        });
      }

      // Aggregate invoice amounts by year-month
      filteredInvoices.forEach(inv => {
        if (inv.created_at) {
          const date = new Date(inv.created_at);
          const month = date.getMonth();
          const year = date.getFullYear();
          const monthKey = `${year}-${month}`;
          
          if (monthlyTrendsMap.has(monthKey)) {
            const existing = monthlyTrendsMap.get(monthKey)!;
            existing.amount += (inv.total_amount || 0);
            monthlyTrendsMap.set(monthKey, existing);
          }
        }
      });

      // Convert to array and format labels (include year if range spans multiple years)
      const needsYearLabel = (endYear - startYear) > 0;
      const monthlyChartData: MonthlyData[] = Array.from(monthlyTrendsMap.values())
        .map(({ month, year, amount }) => ({
          month: needsYearLabel ? `${month} ${year}` : month,
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
      if (Platform.OS === 'android') {
        setShowStartDatePicker(false);
      }
      if (event.type === 'set' && selectedDate) {
        setDateRange(prev => ({
          ...prev,
          startDate: selectedDate,
          label: 'Custom Range'
        }));
      }
    } else {
      if (Platform.OS === 'android') {
        setShowEndDatePicker(false);
      }
      if (event.type === 'set' && selectedDate) {
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

  // Smart label truncation based on available space
  const truncateLabel = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) {
      return text;
    }
    // Truncate to show first part with ellipsis
    const truncatedLength = Math.max(1, maxLength - 2); // Reserve 2 chars for ".."
    return text.substring(0, truncatedLength) + '..';
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
             Report generated by Subscription-Reminder App
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
        const html = generateReportHtml();
        
        // Try using expo-print first (more reliable)
        try {
          const { uri } = await Print.printToFileAsync({
            html,
            base64: false,
          });
          
          if (uri) {
            tempFilePath = uri;
            fileUri = uri;
          } else {
            throw new Error('Print to file failed');
          }
        } catch (printError) {
          console.log('expo-print failed, trying RNHTMLtoPDF:', printError);
          
          // Fallback to RNHTMLtoPDF if available
          if (RNHTMLtoPDF && RNHTMLtoPDF.convert) {
            try {
              tempFilePath = `${cacheDir}${finalFileName}`;
              const options = {
                html,
                fileName: baseFileName,
                base64: true,
                directory: 'docs'
              };

              const pdfResult = await RNHTMLtoPDF.convert(options);

              if (pdfResult?.base64) {
                await FileSystem.writeAsStringAsync(tempFilePath, pdfResult.base64, { encoding: FileSystem.EncodingType.Base64 });
                fileUri = tempFilePath;
              } else {
                throw new Error('PDF generation returned no data');
              }
            } catch (pdfError) {
              console.error('RNHTMLtoPDF error:', pdfError);
              throw new Error('PDF generation failed. Please try again or use a different format.');
            }
          } else {
            throw new Error('PDF generation is not available. Please use PNG or CSV format.');
          }
        }
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
        <CustomLoader visible={true} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.headerContainer}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={22} color="#2c3e50" />
            </TouchableOpacity>
            <View style={styles.headerLeft}>
              <MaskedView
                maskElement={<Text style={styles.title}>Reports</Text>}
              >
                <LinearGradient
                  colors={['#4158D0', '#C850C0']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={[styles.title, { opacity: 0 }]}>Reports</Text>
                </LinearGradient>
              </MaskedView>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={[styles.exportButton, exporting && styles.disabledButton]}
                onPress={() => setIsExportModalVisible(true)}
                disabled={exporting}
              >
                {exporting ? <ActivityIndicator size="small" color="#2c3e50" /> : <Download size={18} color="#2c3e50" />}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }} style={{ flex: 1 }}>
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 20 }}>
          <View style={styles.dateRangeSelector}>
            <TouchableOpacity 
              style={styles.dateRangeButton}
              onPress={() => setIsDateRangeModalVisible(true)}
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
              <View style={styles.chartContainer}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 10 }}
                >
                  {(() => {
                    // Calculate optimal width and label length
                    const chartWidth = Math.max(
                      windowDimensions.width - 60,
                      categoryData.length * Math.max(70, Math.min(90, (windowDimensions.width - 60) / categoryData.length))
                    );
                    const widthPerLabel = chartWidth / categoryData.length;
                    // Estimate max characters per label (roughly 6-7 pixels per character at 10px font)
                    const maxCharsPerLabel = Math.floor((widthPerLabel * 0.8) / 7);
                    
                    return (
                      <BarChart
                        data={{
                          labels: categoryData.map(item => {
                            // Smart truncation: show full text if fits, otherwise truncate with ellipsis
                            return truncateLabel(item.name, maxCharsPerLabel);
                          }),
                          datasets: [{
                            data: categoryData.map(item => item.count)
                          }]
                        }}
                        width={chartWidth}
                        height={260}
                        yAxisLabel=""
                        yAxisSuffix=""
                        yAxisInterval={5}
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
                          },
                          propsForLabels: {
                            fontSize: 8,
                            fontWeight: '500'
                          },
                          propsForVerticalLabels: {
                            fontSize: 8,
                            fontWeight: '500'
                          }
                        }}
                        style={styles.chart}
                        verticalLabelRotation={categoryData.length > 5 ? -30 : 0}
                        showValuesOnTopOfBars={true}
                        fromZero={true}
                        withInnerLines={false}
                        withVerticalLabels={true}
                        withHorizontalLabels={true}
                        segments={5}
                      />
                    );
                  })()}
                </ScrollView>
              </View>
            ) : (
              <View style={styles.chartPlaceholder}>
                <Text style={styles.chartText}>No category data available</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Monthly Trends</Text>
            {monthlyData.length > 0 && monthlyData.some(d => d.amount > 0) ? (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 10 }}
              >
                {(() => {
                  // Calculate optimal width and label length for monthly trends
                  const chartWidth = Math.max(
                    windowDimensions.width - 60,
                    monthlyData.length * Math.max(60, Math.min(80, (windowDimensions.width - 60) / monthlyData.length))
                  );
                  const widthPerLabel = chartWidth / monthlyData.length;
                  const maxCharsPerLabel = Math.floor((widthPerLabel * 0.8) / 7);
                  
                  return (
                    <LineChart
                      data={{
                        labels: monthlyData.map(item => {
                          return truncateLabel(item.month, maxCharsPerLabel);
                        }),
                        datasets: [{
                          data: monthlyData.map(item => item.amount)
                        }]
                      }}
                      width={chartWidth}
                      height={240}
                      yAxisLabel=""
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
                         },
                         propsForLabels: {
                           fontSize: 9,
                           fontWeight: '500'
                         },
                         propsForVerticalLabels: {
                           fontSize: 9,
                           fontWeight: '500'
                         }
                      }}
                      bezier
                      style={styles.chart}
                      verticalLabelRotation={monthlyData.length > 6 ? -30 : 0}
                      withInnerLines={false}
                      segments={5}
                    />
                  );
                })()}
              </ScrollView>
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
          <ScrollView 
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={[
              styles.modalView,
              { paddingBottom: Math.max(insets.bottom + 20, 20) }
            ]}>
              <Text style={styles.modalTitle}>Select Date Range</Text>
              
              {dateRanges.map((range, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dateRangeOption,
                    dateRange.label === range.label && styles.selectedDateRangeOption
                  ]}
                  onPress={() => handleDateRangeSelect(range)}
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
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text style={styles.customDateButtonText}>
                    Start: {formatDate(dateRange.startDate)}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.customDateButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text style={styles.customDateButtonText}>
                    End: {formatDate(dateRange.endDate)}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.applyCustomDateButton}
                  onPress={() => {
                    setDateRange(prev => ({...prev, label: 'Custom Range'}));
                    setIsDateRangeModalVisible(false);
                  }}
                >
                  <Text style={styles.applyCustomDateButtonText}>Apply Custom Range</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                style={styles.modalButtonClose}
                onPress={() => setIsDateRangeModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Date Pickers */}
      {showStartDatePicker && Platform.OS !== 'web' && (
        <RNDateTimePicker
          value={dateRange.startDate}
          mode="date"
          display={Platform.OS === 'android' ? 'calendar' : 'default'}
          onChange={(event, date) => {
            if (Platform.OS === 'android' && event.type === 'dismissed') {
              setShowStartDatePicker(false);
              return;
            }
            handleCustomDateChange(event, date, true);
          }}
          maximumDate={dateRange.endDate}
        />
      )}
      
      {showEndDatePicker && Platform.OS !== 'web' && (
        <RNDateTimePicker
          value={dateRange.endDate}
          mode="date"
          display={Platform.OS === 'android' ? 'calendar' : 'default'}
          onChange={(event, date) => {
            if (Platform.OS === 'android' && event.type === 'dismissed') {
              setShowEndDatePicker(false);
              return;
            }
            handleCustomDateChange(event, date, false);
          }}
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
          <View style={[
            styles.modalView,
            styles.modalViewBottom,
            { paddingBottom: Math.max(insets.bottom + 20, 20) }
          ]}>
            <Text style={styles.modalTitle}>Save Report As:</Text>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPDF]}
              onPress={() => handleExport('pdf')}
              disabled={exporting}
            >
                <Text style={styles.modalButtonText}>PDF Document</Text>
            </TouchableOpacity>
             <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPNG]}
              onPress={() => handleExport('png')}
              disabled={exporting}
            >
                <Text style={styles.modalButtonText}>PNG Image</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCSV]}
              onPress={() => handleExport('csv')}
              disabled={exporting}
            >
               <Text style={styles.modalButtonText}>CSV Spreadsheet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalButtonClose}
              onPress={() => setIsExportModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalButtonCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
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
  safeAreaTop: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  headerContainer: {
    backgroundColor: '#fff',
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeft: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 22,
    letterSpacing: -0.5,
    textAlign:'center'

  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
    marginTop: 20,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
   
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
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#555',
    marginBottom: 2,
  },
  statValue: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 12,
    color: '#2c3e50',
    flexShrink: 1,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
   
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#333',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  chart: {
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
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#7f8c8d',
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalCenteredView: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalScrollView: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    maxHeight: '90%',
  },
  modalScrollContent: {
    flexGrow: 1,
  },
  modalView: {
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalViewBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
   modalTitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    marginBottom: 15,
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
    alignSelf: 'center',
    marginTop: 5,
    marginBottom: 0,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e74c3c',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: '90%',
   },
  modalButtonText: {
    color: 'white',
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
  },
  modalButtonCloseText: {
    color: '#e74c3c',
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
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
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#4158D0',
    marginHorizontal: 8,
  },
  dateRangeDetail: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  dateRangeOption: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#f0f2f5',
  },
  selectedDateRangeOption: {
    backgroundColor: '#4158D0',
  },
  dateRangeOptionText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  selectedDateRangeOptionText: {
    color: '#fff',
  },
  customDateRangeContainer: {
    width: '100%',
    marginTop: 10,
    marginBottom: 10,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  customDateRangeTitle: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 12,
    color: '#333',
    marginBottom: 8,
  },
  customDateButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  customDateButtonText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#333',
  },
  applyCustomDateButton: {
    backgroundColor: '#4158D0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 0,
  },
  applyCustomDateButtonText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
  },
}); 