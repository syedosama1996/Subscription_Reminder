import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Modal, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { History, Filter, Calendar, CreditCard, ArrowLeft, Download, X, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { getSubscriptions, Subscription, exportSubscriptionsToCSV, getCategories } from '../../lib/subscriptions';
import { Category } from '../../lib/types';
import { router } from 'expo-router';
import CustomLoader from '@/components/CustomLoader';
import { TouchableOpacity } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import CategoryBadge from '@/components/CategoryBadge';
import { FONT_FAMILY } from '../../constants/Typography';     

const STATUS_OPTIONS = [
  { id: 'active', label: 'Active', color: '#10b981' },
  { id: 'inactive', label: 'Inactive', color: '#6b7280' },
  { id: 'expired', label: 'Expired', color: '#ef4444' },
  { id: 'expiring_soon', label: 'Expiring Soon', color: '#f59e0b' },
];

export default function PurchaseHistoryScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<Subscription[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [localSelectedCategories, setLocalSelectedCategories] = useState<string[]>([]);
  const [localSelectedStatuses, setLocalSelectedStatuses] = useState<string[]>([]);
  const viewShotRef = useRef<ViewShot>(null);
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();

  useEffect(() => {
    if (Platform.OS !== 'web') {
      requestMediaLibraryPermission();
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Load categories
      const categoriesData = await getCategories(user.id);
      setCategories(categoriesData || []);
      
      // Load subscriptions
      const data = await getSubscriptions(user.id, {
        status: ['active', 'expired', 'expiring_soon', 'past']
      });
      
      // Sort subscriptions by purchase date in descending order (newest first)
      const sortedData = [...(data || [])].sort((a, b) => {
        const dateA = a.purchase_date ? new Date(a.purchase_date).getTime() : 0;
        const dateB = b.purchase_date ? new Date(b.purchase_date).getTime() : 0;
        return dateB - dateA; // Descending order (newest first)
      });
      
      setSubscriptions(sortedData);
    } catch (err) {
      setError('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    applyFilters();
  }, [subscriptions, selectedCategories, selectedStatuses]);

  const applyFilters = () => {
    let filtered = [...subscriptions];

    // Filter by category
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(sub => 
        sub.category_id && selectedCategories.includes(sub.category_id)
      );
    }

    // Filter by status
    if (selectedStatuses.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      filtered = filtered.filter(sub => {
        if (!sub.expiry_date) return false;
        const expiryDate = new Date(sub.expiry_date);
        expiryDate.setHours(0, 0, 0, 0);

        if (selectedStatuses.includes('active')) {
          if (sub.is_active && expiryDate > thirtyDaysFromNow) return true;
        }
        if (selectedStatuses.includes('inactive')) {
          if (!sub.is_active) return true;
        }
        if (selectedStatuses.includes('expired')) {
          if (sub.is_active && expiryDate < today) return true;
        }
        if (selectedStatuses.includes('expiring_soon')) {
          if (sub.is_active && expiryDate >= today && expiryDate <= thirtyDaysFromNow) return true;
        }
        return false;
      });
    }

    setFilteredSubscriptions(filtered);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const toggleCategory = (categoryId: string) => {
    if (localSelectedCategories.includes(categoryId)) {
      setLocalSelectedCategories(localSelectedCategories.filter(id => id !== categoryId));
    } else {
      setLocalSelectedCategories([...localSelectedCategories, categoryId]);
    }
  };

  const toggleStatus = (statusId: string) => {
    if (localSelectedStatuses.includes(statusId)) {
      setLocalSelectedStatuses(localSelectedStatuses.filter(id => id !== statusId));
    } else {
      setLocalSelectedStatuses([...localSelectedStatuses, statusId]);
    }
  };

  const handleApplyFilters = () => {
    setSelectedCategories(localSelectedCategories);
    setSelectedStatuses(localSelectedStatuses);
    setIsFilterModalVisible(false);
  };

  const handleClearFilters = () => {
    setLocalSelectedCategories([]);
    setLocalSelectedStatuses([]);
    setSelectedCategories([]);
    setSelectedStatuses([]);
    setIsFilterModalVisible(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getCategoryBreakdown = () => {
    const breakdown: Record<string, { count: number; totalAmount: number }> = {};
    
    filteredSubscriptions.forEach(sub => {
      const categoryName = sub.category?.name || 'Uncategorized';
      if (!breakdown[categoryName]) {
        breakdown[categoryName] = { count: 0, totalAmount: 0 };
      }
      breakdown[categoryName].count += 1;
      breakdown[categoryName].totalAmount += sub.purchase_amount_pkr || 0;
    });

    return breakdown;
  };

  const generateReportHtml = () => {
    const date = new Date().toLocaleDateString();
    const categoryBreakdown = getCategoryBreakdown();
    const totalSpent = filteredSubscriptions.reduce((sum, sub) => sum + (sub.purchase_amount_pkr || 0), 0);
    const totalItems = filteredSubscriptions.length;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Purchase History Report</title>
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
            .category-breakdown { margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Purchase History Report</h1>
            <p>Generated on ${date} for ${user?.email || 'User'}</p>
          </div>

          <div class="stats">
            <div class="stat-card">
              <div class="stat-label">Total Items</div>
              <div class="stat-value">${totalItems}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Total Spent (PKR)</div>
              <div class="stat-value">${totalSpent.toLocaleString()}</div>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">Purchase Breakdown by Category</h2>
            ${Object.keys(categoryBreakdown).length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Count</th>
                  <th>Total Amount (PKR)</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(categoryBreakdown).map(([category, data]) => `
                  <tr>
                    <td>${category}</td>
                    <td>${data.count}</td>
                    <td>${data.totalAmount.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ` : '<p>No category data available.</p>'}
          </div>

          <div class="section">
            <h2 class="section-title">All Purchases</h2>
            ${filteredSubscriptions.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Service Name</th>
                  <th>Category</th>
                  <th>Vendor</th>
                  <th>Purchase Date</th>
                  <th>Expiry Date</th>
                  <th>Amount (PKR)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${filteredSubscriptions.map(sub => {
                  const status = sub.is_active === false ? 'Inactive' : 
                                (new Date(sub.expiry_date) < new Date() ? 'Expired' : 'Active');
                  return `
                    <tr>
                      <td>${sub.service_name || ''}</td>
                      <td>${sub.category?.name || 'Uncategorized'}</td>
                      <td>${sub.vendor || ''}</td>
                      <td>${formatDate(new Date(sub.purchase_date))}</td>
                      <td>${formatDate(new Date(sub.expiry_date))}</td>
                      <td>${(sub.purchase_amount_pkr || 0).toLocaleString()}</td>
                      <td>${status}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
            ` : '<p>No purchase data available.</p>'}
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

    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Direct saving is not supported on the web.');
      return;
    }

    let tempFilePath: string | undefined = undefined;
    let savedPath: string | undefined = undefined;
    let useSharing = false;
    let screenshotUri: string | undefined = undefined;

    try {
      setExporting(true);
      const timestamp = Date.now();
      const dateStr = new Date().toISOString().split('T')[0];
      const baseFileName = `purchase_history_${dateStr}_${timestamp}`;
      let finalFileName = `${baseFileName}.${format}`;

      const cacheDir = FileSystem.cacheDirectory + 'reports/';
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });

      // Capture screenshot first for PDF and PNG (both use image format)
      if (format === 'pdf' || format === 'png') {
        if (!viewShotRef.current?.capture) {
          throw new Error('Screenshot capture is not available.');
        }

        // Capture the screenshot
        screenshotUri = await viewShotRef.current.capture();
        if (!screenshotUri) {
          throw new Error('Failed to capture screenshot.');
        }

        // Move screenshot to cache directory
        const screenshotPath = `${cacheDir}screenshot_${timestamp}.png`;
        await FileSystem.moveAsync({
          from: screenshotUri,
          to: screenshotPath,
        });
        screenshotUri = screenshotPath;
      }

      if (format === 'csv') {
        // For CSV, also create a screenshot version alongside the data
        if (viewShotRef.current?.capture) {
          screenshotUri = await viewShotRef.current.capture();
          if (screenshotUri) {
            const screenshotPath = `${cacheDir}screenshot_${timestamp}.png`;
            await FileSystem.moveAsync({
              from: screenshotUri,
              to: screenshotPath,
            });
            screenshotUri = screenshotPath;
          }
        }

        // Create CSV data file
        const csvContent = exportSubscriptionsToCSV(filteredSubscriptions);
        tempFilePath = `${cacheDir}${finalFileName}`;
        await FileSystem.writeAsStringAsync(tempFilePath, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
        savedPath = tempFilePath;
        useSharing = true;
      } else if (format === 'pdf') {
        if (!screenshotUri) {
          throw new Error('Screenshot not captured for PDF generation.');
        }

        // Convert screenshot image to PDF using expo-print
        try {
          // Read the image as base64
          const imageBase64 = await FileSystem.readAsStringAsync(screenshotUri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // Create HTML with embedded image for PDF
          const imageHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { margin: 0; padding: 0; }
                  img { width: 100%; height: auto; display: block; }
                </style>
              </head>
              <body>
                <img src="data:image/png;base64,${imageBase64}" />
              </body>
            </html>
          `;

          const { uri } = await Print.printToFileAsync({
            html: imageHtml,
            base64: false,
          });

          if (uri) {
            // For Android emulator, use sharing to ensure file appears in Downloads
            // For iOS, save directly to Documents
            if (Platform.OS === 'android') {
              // Use sharing for Android so user can save to Downloads folder
              tempFilePath = uri;
              savedPath = uri;
              useSharing = true;
            } else {
              // For iOS, save to Documents directory
              const documentsDir = FileSystem.documentDirectory;
              if (documentsDir) {
                const pdfPath = `${documentsDir}${finalFileName}`;
                await FileSystem.copyAsync({
                  from: uri,
                  to: pdfPath,
                });
                tempFilePath = pdfPath;
                savedPath = pdfPath;
                useSharing = false; // Direct save for iOS
              } else {
                tempFilePath = uri;
                savedPath = uri;
                useSharing = true;
              }
            }
          } else {
            throw new Error('PDF generation from image failed');
          }
        } catch (printError) {
          console.error('PDF generation error:', printError);
          throw new Error('Failed to create PDF from screenshot. Please try PNG format.');
        }
      } else if (format === 'png') {
        if (!screenshotUri) {
          throw new Error('Screenshot not captured for PNG generation.');
        }

        // Request permission for images
        if (!mediaLibraryPermission?.granted) {
          const { status } = await requestMediaLibraryPermission();
          if (status !== 'granted') {
            // If permission denied, use sharing as fallback
            savedPath = screenshotUri;
            useSharing = true;
          }
        }

        if (!useSharing) {
          // Copy screenshot to final location
          tempFilePath = `${cacheDir}${finalFileName}`;
          await FileSystem.copyAsync({
            from: screenshotUri,
            to: tempFilePath,
          });

          // Try to save to Media Library
          try {
            const asset = await MediaLibrary.createAssetAsync(tempFilePath);
            if (asset) {
              try {
                const album = await MediaLibrary.getAlbumAsync('Subscription-Reminder App Reports');
                if (album) {
                  await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
                } else {
                  await MediaLibrary.createAlbumAsync('Subscription-Reminder App Reports', asset, false);
                }
              } catch (albumError) {
                console.log('Album creation skipped:', albumError);
              }
              savedPath = asset.uri;
            }
          } catch (mediaError) {
            console.log('MediaLibrary save failed, using sharing:', mediaError);
            savedPath = tempFilePath;
            useSharing = true;
          }
        } else {
          savedPath = screenshotUri;
        }
      }

      if (savedPath) {
        // Check if file exists
        const fileInfo = await FileSystem.getInfoAsync(savedPath);
        if (!fileInfo.exists) {
          throw new Error('File was not created successfully.');
        }

        // Use sharing for CSV and Android PDF (to ensure Downloads folder access)
        // Direct save for iOS PDF and PNG
        if ((format === 'csv' || (format === 'pdf' && Platform.OS === 'android')) && useSharing && await Sharing.isAvailableAsync()) {
          let mimeType: string | undefined;
          if (format === 'pdf') mimeType = 'application/pdf';
          else if (format === 'csv') mimeType = 'text/csv';

          await Sharing.shareAsync(savedPath, {
            mimeType,
            dialogTitle: `Save ${format.toUpperCase()} file`,
            UTI: format === 'pdf' ? 'com.adobe.pdf' : undefined
          });
          
          Alert.alert(
            'File Ready',
            `${format.toUpperCase()} file is ready. Select "Save to Downloads" or "Files" from the share menu to save it.`,
            [{ text: 'OK' }]
          );
        } else if (!useSharing || (format === 'pdf' && Platform.OS === 'ios') || format === 'png') {
          // Direct save successful
          const formatName = format.toUpperCase();
          let location = '';
          
          if (format === 'png') {
            location = 'Photos/Subscription-Reminder App Reports';
          } else if (format === 'pdf') {
            location = Platform.OS === 'ios' 
              ? 'Files app (Documents folder)' 
              : 'Downloads/Documents folder';
          } else {
            location = Platform.OS === 'ios' 
              ? 'Files app (Documents folder)' 
              : 'Downloads/Documents folder';
          }
          
          Alert.alert(
            'Download Complete',
            `${formatName} file has been saved to ${location}`,
            [{ text: 'OK' }]
          );
        } else {
          throw new Error('Sharing is not available on this device.');
        }
      } else {
        throw new Error(`Failed to create ${format.toUpperCase()} file.`);
      }
    } catch (error: any) {
      console.error('Error exporting report:', error);
      Alert.alert(
        'Export Error', 
        `Failed to save report: ${error.message || 'Unknown error'}\n\nTip: Try using the share option to save the file manually.`
      );
    } finally {
      setExporting(false);
      // Clean up screenshot file if it exists and wasn't used as final output
      if (screenshotUri && screenshotUri !== savedPath) {
        try {
          await FileSystem.deleteAsync(screenshotUri, { idempotent: true });
        } catch (cleanupError) {
          console.log('Screenshot cleanup error (non-critical):', cleanupError);
        }
      }
      // Don't delete temp file immediately if using sharing
      // Let user save it first
    }
  };

  const renderSubscriptionItem = ({ item }: { item: Subscription }) => (
    <View style={styles.purchaseCard}>
      <View style={styles.purchaseHeader}>
        <View style={styles.purchaseInfo}>
          <Text style={styles.subscriptionName}>{item.service_name}</Text>
          <View style={styles.paymentInfo}>
            <CreditCard size={16} color="#7f8c8d" />
            <Text style={styles.paymentMethod}>{item.vendor || 'Unknown Vendor'}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#2ecc71' : '#e74c3c' }]}>
          <Text style={styles.statusText}>{item.is_active ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>
      
      <View style={styles.purchaseDetails}>
        <View style={styles.amountContainer}>
          <Text style={styles.amountText}>Rs. {item.purchase_amount_pkr.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.dateContainer}>
        <View style={styles.dateBox}>
          <Calendar size={18} color="#4158D0" />
          <View style={styles.dateTextContainer}>
            <Text style={styles.dateLabel}>Purchase Date</Text>
            <Text style={styles.dateText}>{new Date(item.purchase_date).toLocaleDateString()}</Text>
          </View>
        </View>
        <View style={styles.dateBox}>
          <Calendar size={18} color="#C850C0" />
          <View style={styles.dateTextContainer}>
            <Text style={styles.dateLabel}>Expiry Date</Text>
            <Text style={[styles.dateText, new Date(item.expiry_date) < new Date() ? styles.expiredDate : null]}>
              {new Date(item.expiry_date).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
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
                maskElement={<Text style={styles.title}>Purchase History</Text>}
              >
                <LinearGradient
                  colors={['#4158D0', '#C850C0']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={[styles.title, { opacity: 0 }]}>Purchase History</Text>
                </LinearGradient>
              </MaskedView>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={[styles.filterButton, (selectedCategories.length > 0 || selectedStatuses.length > 0) && styles.filterButtonActive]}
                onPress={() => {
                  setLocalSelectedCategories(selectedCategories);
                  setLocalSelectedStatuses(selectedStatuses);
                  setIsFilterModalVisible(true);
                }}
              >
                <Filter size={18} color="#2c3e50" />
                {(selectedCategories.length > 0 || selectedStatuses.length > 0) && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>
                      {selectedCategories.length + selectedStatuses.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
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
      
      { error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredSubscriptions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <History size={40} color="#7f8c8d" />
          <Text style={styles.emptyText}>
            {selectedCategories.length > 0 || selectedStatuses.length > 0 
              ? 'No subscriptions match your filters' 
              : 'No subscriptions available'}
          </Text>
        </View>
      ) : (
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }} style={{ flex: 1 }}>
          <FlatList
            data={filteredSubscriptions}
            renderItem={renderSubscriptionItem}
            keyExtractor={item => item.id || ''}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#4158D0']}
                tintColor="#4158D0"
                title="Pull to refresh"
                titleColor="#4158D0"
                progressViewOffset={20}
              />
            }
          />
        </ViewShot>
      )}

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isFilterModalVisible}
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.modalCenteredView}>
          <View style={[styles.modalView, { paddingBottom: Math.max(insets.bottom + 20, Platform.OS === 'ios' ? 40 : 50) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Purchases</Text>
              <TouchableOpacity
                onPress={() => setIsFilterModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Status</Text>
                <View style={styles.filterOptionsContainer}>
                  {STATUS_OPTIONS.map((status) => (
                    <TouchableOpacity
                      key={status.id}
                      style={[
                        styles.filterOption,
                        localSelectedStatuses.includes(status.id) && styles.filterOptionSelected
                      ]}
                      onPress={() => toggleStatus(status.id)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        localSelectedStatuses.includes(status.id) && styles.filterOptionTextSelected
                      ]}>
                        {status.label}
                      </Text>
                      {localSelectedStatuses.includes(status.id) && (
                        <Check size={16} color="#fff" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {categories.length > 0 && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Categories</Text>
                  <View style={styles.categoriesContainer}>
                    {categories.map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        onPress={() => toggleCategory(category.id!)}
                        activeOpacity={0.7}
                      >
                        <CategoryBadge 
                          category={category} 
                          selected={localSelectedCategories.includes(category.id!)}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              {(localSelectedCategories.length > 0 || localSelectedStatuses.length > 0) && (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={handleClearFilters}
                  activeOpacity={0.7}
                >
                  <Text style={styles.clearButtonText}>Clear All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.applyButton}
                onPress={handleApplyFilters}
                activeOpacity={0.7}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Export Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isExportModalVisible}
        onRequestClose={() => setIsExportModalVisible(false)}
      >
        <View style={styles.modalCenteredView}>
          <View style={styles.modalView}>
            <Text style={[styles.modalTitle, { textAlign: 'center', width: '100%' }]}>Save Report As:</Text>
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
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    gap: 10,
    alignItems: 'center',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: '#e8e9ea',
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  listContent: {
    padding: 20,
    marginTop: 20,
  },
  purchaseCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
 
  },
  purchaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  purchaseInfo: {
    flex: 1,
  },
  subscriptionName: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 10,
    color: '#2c3e50',
    marginBottom: 4,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethod: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10,
    color: '#7f8c8d',
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 10,
    color: '#fff',
  },
  purchaseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(65, 88, 208, 0.1)',
    padding: 12,
    borderRadius: 12,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 22,
    color: '#2c3e50',
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  dateTextContainer: {
    marginLeft: 8,
  },
  dateLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  dateText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 10,
    color: '#2c3e50',
  },
  expiredDate: {
    color: '#e74c3c',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(65, 88, 208, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  downloadText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 10,
    color: '#4158D0',
    marginLeft: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 10,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4158D0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 10,
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
      fontFamily: FONT_FAMILY.medium,
    fontSize: 10,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 16,
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
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bold,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  closeButton: {
    padding: 4,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: '#333',
    marginBottom: 12,
  },
  filterOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f2f5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterOptionSelected: {
    backgroundColor: '#4158D0',
  },
  filterOptionText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: '#333',
  },
  filterOptionTextSelected: {
    color: '#fff',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f2f5',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.medium,
    color: '#666',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4158D0',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#fff',
  },
  modalButton: {
    width: '90%',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 10,
    elevation: 2,
    alignItems: 'center',
    alignSelf: 'center',
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
    marginTop: 5,
    marginBottom: 0,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e74c3c',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: '90%',
    alignSelf: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  modalButtonCloseText: {
    color: '#e74c3c',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
}); 