import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Modal, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { FileText, Download, Calendar, DollarSign, Filter, User, Package, CreditCard, Share, Clock, Hash, CheckCircle, XCircle, AlertTriangle, ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { Invoice, getUserInvoices } from '../../lib/invoices';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';

interface InvoiceItemProps {
  item: Invoice;
}

// Function to generate HTML for the PDF - Updated for closer resemblance
const generateInvoiceHtml = (invoice: Invoice, userName: string | null | undefined): string => {
  const safeFormatDate = (dateString: string | null | undefined, includeTime = false) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return format(date, includeTime ? 'yyyy-MM-dd hh:mm:ss aa' : 'yyyy-MM-dd'); // Format closer to image
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    return `PKR ${amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}`;
  };

  const subTotal = (invoice.subscription_charges ?? 0) + (invoice.service_charges ?? 0) + (invoice.purchase_amount ?? 0);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoice_no}</title>
      <style>
        body {
          font-family: sans-serif; /* Basic sans-serif */
          margin: 20px;
          color: #000;
          font-size: 12px; /* Smaller base font size */
          line-height: 1.4;
        }
        .receipt-container {
          width: 100%;
          max-width: 800px; /* Optional: constrain width */
          margin: auto;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start; /* Align items to the top */
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid #ccc;
        }
        .header-left {
          /* Add logo styling here if needed */
        }
         .header-center {
            text-align: center;
        }
        .header-center h1 {
            margin: 0 0 5px 0;
            font-size: 24px;
            font-weight: bold;
        }
         .header-center p {
            margin: 0;
            font-size: 14px;
            font-weight: bold;
        }
        .header-right {
          text-align: right;
          font-size: 11px;
        }
         .header-right p {
             margin: 2px 0;
         }
        .details-section {
          display: flex; /* Use flexbox for side-by-side columns */
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .details-left, .details-right {
          width: 48%; /* Adjust width as needed */
        }
        .details-row {
          display: flex;
          margin-bottom: 3px; /* Reduced spacing */
        }
        .details-label {
          width: 110px; /* Fixed width for labels */
          min-width: 110px;
          color: #000;
          /* Removed gray color */
        }
        .details-separator {
            width: 10px;
            text-align: center;
        }
        .details-value {
          flex: 1;
          font-weight: normal; /* Match image */
          white-space: pre-wrap; /* Allow address to wrap */
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 0; /* Remove margin for contiguous totals */
        }
        .items-table th, .items-table td {
          border: 1px solid #aaa; /* Match image border */
          padding: 5px 8px; /* Reduced padding */
          text-align: left;
          vertical-align: top;
        }
        .items-table th {
          background-color: #eee; /* Lighter gray */
          font-weight: bold;
          font-size: 11px; /* Smaller header font */
          text-transform: uppercase;
        }
        .items-table td {
            font-size: 12px;
        }
        .align-right {
          text-align: right;
        }
        /* Specific column widths */
        .col-type { width: 15%; }
        .col-name { width: 35%; }
        .col-qty { width: 8%; text-align: right; }
        .col-duration { width: 12%; text-align: right; }
        .col-price { width: 15%; text-align: right; }
        .col-subtotal { width: 15%; text-align: right; }

        .totals-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: -1px; /* Overlap border with items table */
        }
        .totals-table td {
            border: 1px solid #aaa;
            padding: 5px 8px;
            font-size: 12px;
        }
        .totals-label {
            text-align: right;
            font-weight: bold;
        }
        .totals-value {
            text-align: right;
            font-weight: bold;
        }
        .additional-details {
            margin-top: 20px;
            font-size: 11px;
        }
        .additional-details p {
             margin: 3px 0;
        }

      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="header">
          <div class="header-left">
            <p style="font-weight: bold; font-size: 16px; color: #FF6600;">PPDCA</p> <!-- Placeholder for logo/brand -->
             <p>www.ppdca.com</p> <!-- Placeholder website -->
          </div>
           <div class="header-center">
                <h1>RECEIPT</h1>
                <p>Order # ${invoice.invoice_no}</p>
            </div>
          <div class="header-right">
            <p style="font-weight: bold;">PPDCA, Inc.</p>
            <p>Your Company Address</p> <!-- Placeholder address -->
            <p>City, State ZIP</p>
            <p>Country</p>
            <p>support@ppdca.com</p> <!-- Placeholder email -->
          </div>
        </div>

        <div class="details-section">
          <div class="details-left">
            <div class="details-row">
              <span class="details-label">Order Date</span>
              <span class="details-separator">:</span>
              <span class="details-value">${safeFormatDate(invoice.created_at, true)}</span>
            </div>
            <div class="details-row">
              <span class="details-label">Order Number</span>
              <span class="details-separator">:</span>
              <span class="details-value">${invoice.invoice_no}</span>
            </div>
             <div class="details-row">
              <span class="details-label">Transaction ID</span>
              <span class="details-separator">:</span>
              <span class="details-value">N/A</span> <!-- Missing field -->
            </div>
            <div class="details-row">
              <span class="details-label">User Name</span>
              <span class="details-separator">:</span>
              <span class="details-value">${invoice.username || 'N/A'}</span> <!-- Using username field -->
            </div>
             <div class="details-row">
              <span class="details-label">Address</span>
              <span class="details-separator">:</span>
              <span class="details-value">${invoice.name || userName || 'N/A'}<br>User Address Not Available</span> <!-- Placeholder -->
            </div>
          </div>
          <div class="details-right">
            <div class="details-row">
              <span class="details-label">Payment Source</span>
              <span class="details-separator">:</span>
              <span class="details-value">CreditCard</span> <!-- Hardcoded -->
            </div>
            <div class="details-row">
              <span class="details-label">Initial Charge</span>
               <span class="details-separator">:</span>
              <span class="details-value">${formatCurrency(invoice.total_amount)}</span> <!-- Mapped total -->
            </div>
             <div class="details-row">
              <span class="details-label">Final Cost</span>
               <span class="details-separator">:</span>
              <span class="details-value">${formatCurrency(invoice.total_amount)}</span>
            </div>
             <div class="details-row">
              <span class="details-label">Total Refund</span>
               <span class="details-separator">:</span>
              <span class="details-value">PKR 0.00</span> <!-- Placeholder -->
            </div>
             <div class="details-row">
              <span class="details-label">Refund Transaction ID</span>
               <span class="details-separator">:</span>
              <span class="details-value">N/A</span>
            </div>
            <div class="details-row">
              <span class="details-label">Refunded To</span>
               <span class="details-separator">:</span>
              <span class="details-value">N/A</span>
            </div>
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th class="col-type">TYPE</th>
              <th class="col-name">NAME</th>
              <th class="col-qty">QTY</th>
              <th class="col-duration">DURATION</th>
              <th class="col-price">PRICE</th>
              <th class="col-subtotal">SUB TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>PURCHASE</td>
              <td>${invoice.name || 'Subscription/Service'} ${invoice.domain_name ? `for ${invoice.domain_name}` : ''}</td>
              <td class="align-right">1</td>
              <td class="align-right">N/A</td> <!-- Duration missing -->
              <td class="align-right">${formatCurrency(invoice.subscription_charges)}</td>
              <td class="align-right">${formatCurrency(invoice.subscription_charges)}</td>
            </tr>
            ${invoice.service_charges > 0 ? `
            <tr>
              <td>SERVICE</td>
              <td>Service Charges</td>
              <td class="align-right">1</td>
              <td class="align-right">N/A</td>
              <td class="align-right">${formatCurrency(invoice.service_charges)}</td>
              <td class="align-right">${formatCurrency(invoice.service_charges)}</td>
            </tr>
            ` : ''}
             ${invoice.purchase_amount > 0 ? `
            <tr>
              <td>SETUP</td> <!-- Assuming purchase_amount is like setup -->
              <td>Initial Purchase / Setup</td>
              <td class="align-right">1</td>
              <td class="align-right">N/A</td>
              <td class="align-right">${formatCurrency(invoice.purchase_amount)}</td>
              <td class="align-right">${formatCurrency(invoice.purchase_amount)}</td>
            </tr>
            ` : ''}
            <!-- Add more rows if needed based on invoice structure -->
          </tbody>
        </table>

        <table class="totals-table">
            <tbody>
                <tr>
                    <td style="border: none; border-left: 1px solid #aaa; width: 70%;">&nbsp;</td> <!-- Spacer cell -->
                    <td class="totals-label" style="border-bottom: none; width: 15%;">Sub Total</td>
                    <td class="totals-value" style="border-bottom: none; width: 15%;">${formatCurrency(subTotal)}</td>
                </tr>
                <tr>
                    <td style="border: none; border-left: 1px solid #aaa;">&nbsp;</td> <!-- Spacer cell -->
                    <td class="totals-label">TOTAL</td>
                    <td class="totals-value">${formatCurrency(invoice.total_amount)}</td>
                </tr>
            </tbody>
        </table>

        <div class="additional-details">
            <p style="font-weight: bold;">Additional Transaction Details:</p>
            <p>Order: N/A</p>
            <p>Approval: N/A</p>
        </div>
      </div>
    </body>
    </html>
  `;
  return htmlContent;
};

export default function InvoiceScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (user) {
      fetchInvoices();
    }
  }, [user]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await getUserInvoices(user?.id || '');
      
      setInvoices(data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const openInvoiceDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setModalVisible(true);
  };

  const renderInvoiceItem = ({ item }: InvoiceItemProps) => {
    const safeFormatDate = (dateString: string | null | undefined) => {
      if (!dateString) return 'N/A';
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return format(date, 'dd MMM yyyy');
      } catch (e) {
        return 'Invalid Date';
      }
    };

    const getStatusIcon = (status: string) => {
      switch (status.toLowerCase()) {
        case 'paid': return <CheckCircle size={18} color="#2ecc71" />; 
        case 'pending': return <Clock size={18} color="#f39c12" />; 
        case 'cancelled': return <XCircle size={18} color="#e74c3c" />; 
        default: return <AlertTriangle size={18} color="#95a5a6" />; 
      }
    };

    return (
      <TouchableOpacity 
        style={styles.invoiceCardImproved}
        onPress={() => openInvoiceDetails(item)}
      >
        <View style={styles.invoiceCardHeader}>
          <View style={styles.invoiceCardTitleContainer}>
            <FileText size={20} color={styles.invoiceCardTitle.color} style={{ marginRight: 8 }}/>
            <Text style={styles.invoiceCardTitle}>{item.name || 'Invoice'}</Text>
          </View>
          <View style={[styles.statusBadgeImproved, { backgroundColor: item.status === 'paid' ? '#e8f9f0' : (item.status === 'pending' ? '#fef5e7' : '#fdecea') }]}>
            {getStatusIcon(item.status)}
            <Text style={[styles.statusTextImproved, { color: item.status === 'paid' ? '#2ecc71' : (item.status === 'pending' ? '#f39c12' : '#e74c3c') } ]}>
              {item.status}
            </Text>
          </View>
        </View>
        
        <View style={styles.invoiceCardBody}>
          <View style={styles.invoiceCardRow}>
            <Hash size={16} color={styles.invoiceCardLabel.color} style={{ marginRight: 6 }}/>
            <Text style={styles.invoiceCardLabel}>Invoice No:</Text>
            <Text style={styles.invoiceCardValue}>{item.invoice_no}</Text>
          </View>
           <View style={styles.invoiceCardRow}>
            <Calendar size={16} color={styles.invoiceCardLabel.color} style={{ marginRight: 6 }}/>
            <Text style={styles.invoiceCardLabel}>Created:</Text>
            <Text style={styles.invoiceCardValue}>{safeFormatDate(item.created_at)}</Text>
          </View>
          <View style={styles.invoiceCardRow}>
            <DollarSign size={16} color={styles.invoiceCardLabel.color} style={{ marginRight: 6 }}/>
            <Text style={styles.invoiceCardLabel}>Amount:</Text>
            <Text style={[styles.invoiceCardValue, styles.invoiceCardAmount]}>PKR {item.total_amount?.toLocaleString() ?? '0.00'}</Text>
          </View>
        </View>

         <View style={styles.invoiceCardFooter}>
            <TouchableOpacity style={styles.viewDetailsButton} onPress={() => openInvoiceDetails(item)} >
              <Text style={styles.viewDetailsButtonText}>View Details</Text>
            </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const handleDownloadPdf = async () => {
    if (!selectedInvoice) return;

    setPdfLoading(true);
    try {
      const html = generateInvoiceHtml(selectedInvoice, user?.email);
      const { uri } = await Print.printToFileAsync({ html });
      console.log('File has been saved to:', uri);
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.error('Error generating or sharing PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  const renderInvoiceDetails = () => {
    if (!selectedInvoice) return null;

    const safeFormatDate = (dateString: string | null | undefined) => {
      if (!dateString) return 'N/A';
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return format(date, 'dd MMM yyyy');
      } catch (e) {
        return 'Invalid Date';
      }
    };

    return (
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalScrollViewImproved}> 
            <View style={styles.modalContentImproved}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Invoice Details</Text>
                <Text style={styles.modalSubtitle}>Order # {selectedInvoice.invoice_no}</Text>
              </View>

              <View style={styles.modalSection}>
                 <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Invoice Number:</Text>
                    <Text style={styles.modalDetailValue}>{selectedInvoice.invoice_no}</Text>
                 </View>
                 <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Invoice Date:</Text>
                    <Text style={styles.modalDetailValue}>{safeFormatDate(selectedInvoice.created_at)}</Text>
                 </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Due Date:</Text>
                    <Text style={styles.modalDetailValue}>{safeFormatDate(selectedInvoice.due_date)}</Text>
                 </View>
                 <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Billed To:</Text>
                    <Text style={styles.modalDetailValue}>{selectedInvoice.name || user?.email}</Text>
                 </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Status:</Text>
                    <Text style={[styles.modalDetailValue, { color: selectedInvoice.status === 'paid' ? '#2ecc71' : (selectedInvoice.status === 'pending' ? '#f39c12' : '#e74c3c') } ]}>
                      {selectedInvoice.status}
                    </Text>
                 </View>
              </View>

              <View style={styles.modalSection}>
                 <Text style={styles.modalSectionTitle}>Summary</Text>
                 <View style={styles.itemsTableContainer}>
                    <View style={styles.itemsTableHeaderRow}>
                      <Text style={[styles.itemsTableCell, styles.itemsTableHeader, { flex: 4}]}>Description</Text>
                      <Text style={[styles.itemsTableCell, styles.itemsTableHeader, { flex: 2, textAlign: 'right'}]}>Amount</Text>
                    </View>
                    <View style={styles.itemsTableRow}>
                      <Text style={[styles.itemsTableCell, { flex: 4}]}>{selectedInvoice.name || 'Subscription/Service'}</Text>
                      <Text style={[styles.itemsTableCell, { flex: 2, textAlign: 'right'}]}>PKR {selectedInvoice.subscription_charges?.toLocaleString() ?? '0.00'}</Text>
                    </View>
                    {selectedInvoice.service_charges > 0 && (
                      <View style={styles.itemsTableRow}>
                        <Text style={[styles.itemsTableCell, { flex: 4}]}>Service Charges</Text>
                        <Text style={[styles.itemsTableCell, { flex: 2, textAlign: 'right'}]}>PKR {selectedInvoice.service_charges?.toLocaleString() ?? '0.00'}</Text>
                      </View>
                    )}
                    {selectedInvoice.purchase_amount > 0 && (
                      <View style={styles.itemsTableRow}>
                        <Text style={[styles.itemsTableCell, { flex: 4}]}>Initial Purchase</Text>
                        <Text style={[styles.itemsTableCell, { flex: 2, textAlign: 'right'}]}>PKR {selectedInvoice.purchase_amount?.toLocaleString() ?? '0.00'}</Text>
                      </View>
                    )}
                 </View>
                 <View style={styles.itemsTotalRow}>
                    <Text style={styles.itemsTotalLabel}>Total Amount</Text>
                    <Text style={styles.itemsTotalValue}>PKR {selectedInvoice.total_amount?.toLocaleString() ?? '0.00'}</Text>
                 </View>
              </View>
              
              <View style={styles.modalActionsImproved}>
                <TouchableOpacity 
                  style={[styles.modalButtonImproved, styles.closeButtonImproved]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={[styles.modalButtonTextImproved, styles.closeButtonTextImproved]}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButtonImproved, styles.downloadPdfButtonImproved]}
                  onPress={handleDownloadPdf}
                  disabled={pdfLoading}
                >
                  {pdfLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Download size={18} color="#fff" style={{ marginRight: 8}} />
                  )}
                  <Text style={[styles.modalButtonTextImproved, styles.downloadPdfButtonTextImproved]}>
                    {pdfLoading ? 'Generating...' : 'Download'}
                  </Text>
                </TouchableOpacity>
              </View>

            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#4158D0', '#8A54C8', '#C850C0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Invoices</Text>
        <View style={styles.placeholder} />
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4158D0" />
        </View>
      ) : (
        <FlatList
          data={invoices}
          renderItem={renderInvoiceItem}
          keyExtractor={item => item.id || item.invoice_no || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FileText size={60} color="#C850C0" />
              <Text style={styles.emptyText}>No invoices found</Text>
            </View>
          }
        />
      )}

      {renderInvoiceDetails()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  placeholder: {
    width: 40,
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
  listContent: {
    padding: 16,
    paddingTop: 10,
  },
  invoiceCardImproved: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#999',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  invoiceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
   invoiceCardTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
  },
  invoiceCardTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#34495e',
    marginRight: 10,
  },
  statusBadgeImproved: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginLeft: 'auto',
  },
  statusTextImproved: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    marginLeft: 5,
    textTransform: 'capitalize',
  },
  invoiceCardBody: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  invoiceCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceCardLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#7f8c8d',
    marginRight: 5,
  },
  invoiceCardValue: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#34495e',
    flexShrink: 1,
  },
  invoiceCardAmount: {
     fontFamily: 'Inter-SemiBold',
     color: '#2c3e50',
  },
   invoiceCardFooter: {
      padding: 12,
      paddingTop: 8,
      alignItems: 'flex-end',
      backgroundColor: '#f8f9fa',
  },
   viewDetailsButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: '#4158D0',
  },
   viewDetailsButtonText: {
      fontFamily: 'Inter-Medium',
      fontSize: 13,
      color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    marginTop: 30,
  },
  emptyText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#95a5a6',
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalScrollViewImproved: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalContentImproved: {
    paddingHorizontal: 24,
    paddingVertical: 30,
    paddingBottom: 40,
  },
  modalHeader: {
    marginBottom: 25,
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    color: '#2c3e50',
    marginBottom: 4,
  },
   modalSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: '#7f8c8d',
  },
  modalSection: {
    marginBottom: 25,
  },
   modalSectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#34495e',
    marginBottom: 15,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalDetailLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#555',
  },
  modalDetailValue: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#2c3e50',
    textAlign: 'right',
    maxWidth: '65%',
  },
  itemsTableContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  itemsTableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: '#f8f9fa',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#e0e0e0',
  },
  itemsTableRow: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f2f5',
  },
  itemsTableCell: {
      fontSize: 14,
      color: '#333',
  },
  itemsTableHeader: {
      fontFamily: 'Inter-SemiBold',
      color: '#7f8c8d',
      fontSize: 12,
      textTransform: 'uppercase',
  },
  itemsTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 15,
      paddingTop: 15,
      borderTopWidth: 1,
      borderTopColor: '#e0e0e0',
  },
  itemsTotalLabel: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: '#34495e',
  },
  itemsTotalValue: {
      fontFamily: 'Inter-Bold',
      fontSize: 16,
      color: '#4158D0',
  },
  modalActionsImproved: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 30,
    gap: 15,
  },
  modalButtonImproved: {
    flex: 1, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  modalButtonTextImproved: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  closeButtonImproved: {
    backgroundColor: '#e0e6ed',
  },
  closeButtonTextImproved: {
    color: '#52616B',
  },
  downloadPdfButtonImproved: {
    backgroundColor: '#4158D0',
  },
  downloadPdfButtonTextImproved: {
    color: '#fff',
  },

  // Original styles potentially needed for PDF generation - kept for safety
  productTable: { },
  tableHeader: { },
  tableHeaderCell: { },
  tableRow: { },
  tableCell: { },
  tableTotalRow: { },
  tableTotalRowSummary: { },
  tableTotalRowFinal: { },
  totalLabel: { },
  totalAmount: { },
  modalActions: { },
  modalButton: { },
  modalButtonText: { },
  closeButton: { },
  closeButtonText: { },
  downloadPdfButton: { },
  downloadPdfButtonText: { },
  receiptHeader: { },
  companyName: { },
  receiptTitle: { },
  orderNumber: { },
  receiptSection: { },
  receiptRow: { },
  receiptLabel: { },
  receiptValue: { },
  // Add any other original styles if they were used and removed

}); 