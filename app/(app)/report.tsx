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
  
  // Get account creation date
  const getAccountCreationDate = (): Date => {
    if (user?.created_at) {
      return new Date(user.created_at);
    }
    // Fallback to current date if no creation date (shouldn't happen)
    return new Date();
  };

  // Helper function to get today's date normalized
  const getToday = (): Date => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setHours(0, 0, 0, 0);
    return today;
  };

  // Helper function to calculate account age in days
  const getAccountAgeDays = (): number => {
    const accountCreationDate = getAccountCreationDate();
    const creationDate = new Date(accountCreationDate);
    creationDate.setHours(0, 0, 0, 0);
    const today = getToday();
    return Math.floor((today.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24));
  };
  
  // Initialize default date range based on account age
  const getDefaultDateRange = (): DateRange => {
    const today = getToday();
    const creationDate = new Date(getAccountCreationDate());
    creationDate.setHours(0, 0, 0, 0);
    const accountAgeDays = getAccountAgeDays();
    
    // If account is less than 7 days old, show all available data
    if (accountAgeDays < 7) {
      return {
        startDate: creationDate,
        endDate: today,
        label: 'All Time'
      };
    }
    // If account is less than 15 days old, show last 7 days
    else if (accountAgeDays < 15) {
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 6);
      // Ensure start date is not before account creation
      const actualStartDate = startDate < creationDate ? creationDate : startDate;
      return {
        startDate: actualStartDate,
        endDate: today,
        label: 'Last 7 Days'
      };
    }
    // If account is less than 30 days old, show last 15 days
    else if (accountAgeDays < 30) {
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 14);
      const actualStartDate = startDate < creationDate ? creationDate : startDate;
      return {
        startDate: actualStartDate,
        endDate: today,
        label: 'Last 15 Days'
      };
    }
    // Otherwise, show last month (but ensure it doesn't go before account creation)
    else {
      const lastMonthStart = new Date(today);
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
      lastMonthStart.setDate(1);
      const lastMonthEnd = new Date(today);
      lastMonthEnd.setDate(0);
      
      const actualStartDate = lastMonthStart < creationDate ? creationDate : lastMonthStart;
      return {
        startDate: actualStartDate,
        endDate: lastMonthEnd < creationDate ? today : lastMonthEnd,
        label: 'Last Month'
      };
    }
  };

  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());

  // Predefined date ranges - adjusted based on account creation date
  const getDateRanges = (): DateRange[] => {
    const today = getToday();
    const creationDate = new Date(getAccountCreationDate());
    creationDate.setHours(0, 0, 0, 0);
    const accountAgeDays = getAccountAgeDays();
    
    const ranges: DateRange[] = [];
    
    // Helper function to ensure date is not before account creation
    const ensureNotBeforeCreation = (date: Date): Date => {
      return date < creationDate ? creationDate : date;
    };
    
    // Last 7 Days - only show if account is at least 7 days old
    if (accountAgeDays >= 6) {
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 6);
      ranges.push({
        startDate: ensureNotBeforeCreation(startDate),
        endDate: today,
        label: 'Last 7 Days'
      });
    }
    
    // Last 15 Days - only show if account is at least 15 days old
    if (accountAgeDays >= 14) {
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 14);
      ranges.push({
        startDate: ensureNotBeforeCreation(startDate),
        endDate: today,
        label: 'Last 15 Days'
      });
    }
    
    // Last 30 Days - only show if account is at least 30 days old
    if (accountAgeDays >= 29) {
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 29);
      ranges.push({
        startDate: ensureNotBeforeCreation(startDate),
        endDate: today,
        label: 'Last 30 Days'
      });
    }
    
    // Last Month - only show if account is at least 1 month old
    if (accountAgeDays >= 30) {
      const lastMonthStart = new Date(today);
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
      lastMonthStart.setDate(1);
      const lastMonthEnd = new Date(today);
      lastMonthEnd.setDate(0);
      
      ranges.push({
        startDate: ensureNotBeforeCreation(lastMonthStart),
        endDate: lastMonthEnd < creationDate ? today : lastMonthEnd,
        label: 'Last Month'
      });
    }
    
    // Last 3 Months - only show if account is at least 3 months old
    if (accountAgeDays >= 90) {
      const startDate = new Date(today);
      startDate.setMonth(startDate.getMonth() - 3);
      ranges.push({
        startDate: ensureNotBeforeCreation(startDate),
        endDate: today,
        label: 'Last 3 Months'
      });
    }
    
    // Last 6 Months - only show if account is at least 6 months old
    if (accountAgeDays >= 180) {
      const startDate = new Date(today);
      startDate.setMonth(startDate.getMonth() - 6);
      ranges.push({
        startDate: ensureNotBeforeCreation(startDate),
        endDate: today,
        label: 'Last 6 Months'
      });
    }
    
    // Last Year - only show if account is at least 1 year old
    if (accountAgeDays >= 365) {
      const startDate = new Date(today);
      startDate.setFullYear(startDate.getFullYear() - 1);
      ranges.push({
        startDate: ensureNotBeforeCreation(startDate),
        endDate: today,
        label: 'Last Year'
      });
    }
    
    // Always show "All Time" option
    ranges.push({
      startDate: creationDate,
      endDate: today,
      label: 'All Time'
    });
    
    return ranges;
  };
  
  const dateRanges = getDateRanges();

  useEffect(() => {
    if (Platform.OS !== 'web') {
      requestMediaLibraryPermission();
    }
  }, []);

  // Reset date range when user changes to ensure it's valid
  useEffect(() => {
    if (user) {
      const newDefaultRange = getDefaultDateRange();
      setDateRange(newDefaultRange);
    }
  }, [user?.id]);

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
    if (!selectedDate) return;
    
    const creationDate = new Date(getAccountCreationDate());
    creationDate.setHours(0, 0, 0, 0);
    const today = getToday();
    today.setHours(23, 59, 59, 999);
    
    // Normalize selected date
    const normalizedDate = new Date(selectedDate);
    normalizedDate.setHours(0, 0, 0, 0);
    
    if (isStartDate) {
      if (Platform.OS === 'android') {
        setShowStartDatePicker(false);
      }
      if (event.type === 'set') {
        // Ensure start date is not before account creation
        const validStartDate = normalizedDate < creationDate ? creationDate : normalizedDate;
        // Ensure start date is not after end date
        const endDate = new Date(dateRange.endDate);
        endDate.setHours(0, 0, 0, 0);
        const finalStartDate = validStartDate > endDate ? endDate : validStartDate;
        
        setDateRange(prev => ({
          ...prev,
          startDate: finalStartDate,
          label: 'Custom Range'
        }));
      }
    } else {
      if (Platform.OS === 'android') {
        setShowEndDatePicker(false);
      }
      if (event.type === 'set') {
        // Ensure end date is not in the future
        const validEndDate = normalizedDate > today ? today : normalizedDate;
        // Ensure end date is not before start date
        const startDate = new Date(dateRange.startDate);
        startDate.setHours(0, 0, 0, 0);
        const finalEndDate = validEndDate < startDate ? startDate : validEndDate;
        // Ensure end date is not before account creation
        const finalEndDate2 = finalEndDate < creationDate ? creationDate : finalEndDate;
        
        setDateRange(prev => ({
          ...prev,
          endDate: finalEndDate2,
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
                    
                    // Calculate max value for Y-axis
                    const maxValue = Math.max(...categoryData.map(item => item.count), 1);
                    // Calculate appropriate segments based on max value
                    const segments = maxValue <= 5 ? Math.max(2, maxValue) : 5;
                    
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
                        height={200}
                        yAxisLabel=""
                        yAxisSuffix=""
                        chartConfig={{
                          backgroundColor: '#ffffff',
                          backgroundGradientFrom: '#ffffff',
                          backgroundGradientTo: '#ffffff',
                          decimalPlaces: 0,
                          color: (opacity = 1) => `rgba(65, 88, 208, ${opacity})`,
                          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                          formatYLabel: (value) => {
                            const num = parseInt(value);
                            return num.toString();
                          },
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
                        segments={segments}
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
            {(() => {
              // Check if date range should show monthly trends
              // Show only if:
              // 1. Selected range is "Last 3 Months" or "Last 6 Months"
              // 2. OR custom range spans at least 2 months
              const shouldShowMonthlyTrends = (): boolean => {
                const rangeLabel = dateRange.label;
                
                // Check if it's "Last 3 Months" or "Last 6 Months"
                if (rangeLabel === 'Last 3 Months' || rangeLabel === 'Last 6 Months') {
                  return true;
                }
                
                // For custom range or other ranges, check if it spans at least 2 months
                const startDate = new Date(dateRange.startDate);
                const endDate = new Date(dateRange.endDate);
                
                // Calculate months difference
                const startYear = startDate.getFullYear();
                const startMonth = startDate.getMonth();
                const endYear = endDate.getFullYear();
                const endMonth = endDate.getMonth();
                
                // Calculate total months difference
                const monthsDiff = (endYear - startYear) * 12 + (endMonth - startMonth);
                
                // Also check if the actual date range is at least 60 days (approximately 2 months)
                const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                
                // Show if at least 2 months difference OR at least 60 days
                return monthsDiff >= 1 || daysDiff >= 60;
              };
              
              return monthlyData.length > 0 && monthlyData.some(d => d.amount > 0) && shouldShowMonthlyTrends();
            })() ? (
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
                  
                  // Calculate max and min values for Y-axis
                  const maxValue = Math.max(...monthlyData.map(item => item.amount), 0);
                  const minValue = Math.min(...monthlyData.map(item => item.amount), 0);
                  const valueRange = maxValue - minValue;
                  
                  // Format Y-axis labels to show readable numbers with PKR prefix
                  // This function is called by react-native-chart-kit for each Y-axis label
                  // Y-axis values are calculated automatically by the library:
                  // 1. It finds min and max values in the dataset
                  // 2. Divides the range into 'segments' number of parts
                  // 3. Calculates evenly spaced values between min and max
                  // 4. Calls formatYLabel for each calculated value
                  const formatYLabel = (value: string | number): string => {
                    try {
                      // Handle both string and number inputs
                      let num: number;
                      if (typeof value === 'string') {
                        // Remove any commas, spaces, or formatting characters
                        const cleanValue = value.replace(/[,\s]/g, '').trim();
                        num = parseFloat(cleanValue);
                      } else {
                        num = value;
                      }
                      
                      // Handle zero, NaN, or invalid values
                      if (num === 0 || isNaN(num) || !isFinite(num)) {
                        return 'PKR 0';
                      }
                      
                      // Format large numbers with K (thousands) or M (millions)
                      // Use absolute value to handle negative numbers
                      const absNum = Math.abs(num);
                      
                      if (absNum >= 1000000) {
                        const formatted = (num / 1000000).toFixed(1);
                        // Remove trailing zero if it's .0 (e.g., "3.0M" -> "3M")
                        const valueStr = formatted.replace(/\.0$/, '') + 'M';
                        return 'PKR ' + valueStr;
                      } else if (absNum >= 1000) {
                        const formatted = (num / 1000).toFixed(1);
                        const valueStr = formatted.replace(/\.0$/, '') + 'K';
                        return 'PKR ' + valueStr;
                      } else {
                        // For numbers less than 1000, show as integer
                        return 'PKR ' + Math.round(num).toString();
                      }
                    } catch (error) {
                      // Fallback to original value if formatting fails
                      return String(value);
                    }
                  };
                  
                  // Calculate appropriate segments based on data range
                  // More segments for larger ranges, fewer for smaller
                  let segments = 5;
                  if (valueRange > 0) {
                    // Adjust segments based on the magnitude of the range
                    if (maxValue >= 1000000) {
                      segments = 5; // For millions, 5 segments is good
                    } else if (maxValue >= 10000) {
                      segments = 5; // For thousands, 5 segments
                    } else {
                      segments = Math.min(5, Math.max(2, Math.ceil(maxValue / 1000))); // For smaller values
                    }
                  }
                  
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
                      formatYLabel={formatYLabel}
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
                      segments={segments}
                    />
                  );
                })()}
              </ScrollView>
            ) : (
              <View style={styles.chartPlaceholder}>
                <Text style={styles.chartText}>
                  {(() => {
                    // Check if it's because of date range requirement
                    const rangeLabel = dateRange.label;
                    const startDate = new Date(dateRange.startDate);
                    const endDate = new Date(dateRange.endDate);
                    const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                    
                    if (rangeLabel !== 'Last 3 Months' && rangeLabel !== 'Last 6 Months' && daysDiff < 60) {
                      return 'Monthly trends are available for date ranges of 2 months or more';
                    }
                    return 'No monthly trend data available';
                  })()}
                </Text>
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
      {showStartDatePicker && Platform.OS !== 'web' && (() => {
        const creationDate = new Date(getAccountCreationDate());
        creationDate.setHours(0, 0, 0, 0);
        const today = getToday();
        today.setHours(23, 59, 59, 999);
        const maxDate = dateRange.endDate < today ? dateRange.endDate : today;
        
        return (
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
            minimumDate={creationDate}
            maximumDate={maxDate}
          />
        );
      })()}
      
      {showEndDatePicker && Platform.OS !== 'web' && (() => {
        const creationDate = new Date(getAccountCreationDate());
        creationDate.setHours(0, 0, 0, 0);
        const today = getToday();
        today.setHours(23, 59, 59, 999);
        const minDate = dateRange.startDate > creationDate ? dateRange.startDate : creationDate;
        
        return (
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
            minimumDate={minDate}
            maximumDate={today}
          />
        );
      })()}

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