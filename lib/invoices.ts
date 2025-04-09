import { supabase } from './supabase';
import { format } from 'date-fns';

export type Invoice = {
  id: string;
  user_id: string;
  subscription_id?: string | null;
  subscription_name?: string;
  order_number: string;
  purchase_date: string;
  purchase_amount: number;
  service_charges: number;
  subscription_charges: number;
  total_amount: number;
  status: 'paid' | 'pending' | 'cancelled';
  duration?: string;
  user_name?: string;
  user_address?: string;
  payment_method?: string;
  created_at?: string;
  due_date?: string;
  name: string;
  domain_name?: string | null;
  email?: string | null;
  username?: string | null;
  vendor?: string | null;
  vendor_link?: string | null;
  notes?: string | null;
  category_id?: string | null;
  invoice_no: string;
  subscription?: { service_name: string };
};

// Generate a unique invoice number
export const generateInvoiceNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `INV-${year}-${random}`;
};

// Create a new invoice
export const createInvoice = async (invoiceData: Partial<Invoice>): Promise<Invoice | null> => {
  try {
    // Ensure required fields are present and map to DB columns
    const invoicePayload = {
      user_id: invoiceData.user_id,
      invoice_no: invoiceData.invoice_no || generateInvoiceNumber(),
      name: invoiceData.name,
      domain_name: invoiceData.domain_name,
      email: invoiceData.email,
      username: invoiceData.username,
      vendor: invoiceData.vendor,
      vendor_link: invoiceData.vendor_link,
      notes: invoiceData.notes,
      category_id: invoiceData.category_id,
      purchase_amount: invoiceData.purchase_amount ?? 0,
      service_charges: invoiceData.service_charges ?? 0,
      subscription_charges: invoiceData.subscription_charges ?? 0,
      total_amount: invoiceData.total_amount ?? 0,
      status: invoiceData.status || 'pending',
      due_date: invoiceData.due_date || new Date(new Date().setDate(new Date().getDate() + 14)).toISOString().split('T')[0],
      subscription_id: invoiceData.subscription_id,
    };

    if (!invoicePayload.user_id || !invoicePayload.name) {
        throw new Error("User ID and Name are required to create an invoice.");
    }

    const { data, error } = await supabase
      .from('invoices')
      .insert(invoicePayload)
      .select()
      .single();

    if (error) throw error;
    return data ? (data as Invoice) : null;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
};

// Auto-generate an invoice for a subscription
export const generateInvoiceForSubscription = async (
  subscriptionId: string,
  userId: string,
  subscriptionDetails: {
    service_name: string;
    purchase_date: string;
    purchase_amount_pkr: number;
    domain_name?: string | null;
    email?: string | null;
    username?: string | null;
    vendor?: string | null;
    vendor_link?: string | null;
    category_id?: string | null;
  },
  serviceCharges: number = 0
): Promise<Invoice | null> => {
  try {
    const subscriptionCharges = subscriptionDetails.purchase_amount_pkr;
    const totalAmount = subscriptionCharges + serviceCharges;

    const invoiceData: Partial<Invoice> = {
      user_id: userId,
      subscription_id: subscriptionId,
      invoice_no: generateInvoiceNumber(),
      name: subscriptionDetails.service_name,
      domain_name: subscriptionDetails.domain_name,
      email: subscriptionDetails.email,
      username: subscriptionDetails.username,
      vendor: subscriptionDetails.vendor,
      vendor_link: subscriptionDetails.vendor_link,
      category_id: subscriptionDetails.category_id,
      purchase_amount: 0,
      service_charges: serviceCharges,
      subscription_charges: subscriptionCharges,
      total_amount: totalAmount,
      status: 'paid',
      due_date: new Date().toISOString().split('T')[0],
    };

    return await createInvoice(invoiceData);
  } catch (error) {
    console.error('Error generating invoice for subscription:', error);
    return null;
  }
};

// Get all invoices for a user
export const getUserInvoices = async (
  user_id: string,
  filterStatus?: 'paid' | 'pending' | 'cancelled' | 'all'
): Promise<Invoice[]> => {
  try {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        subscription:subscriptions (service_name)
      `)
      .eq('user_id', user_id);

    if (filterStatus && filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    
    const transformedData = (data || []).map(invoice => ({
      ...invoice,
      purchase_amount: Number(invoice.purchase_amount),
      service_charges: Number(invoice.service_charges),
      subscription_charges: Number(invoice.subscription_charges),
      total_amount: Number(invoice.total_amount),
      subscription_name: invoice.subscription?.service_name
    }));
    
    return transformedData as Invoice[];
  } catch (error) {
    console.error('Error fetching user invoices:', error);
    throw error;
  }
};

// Get a single invoice by ID
export const getInvoice = async (id: string): Promise<Invoice | null> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        subscription:subscriptions (service_name)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return null;

    const transformedData = {
        ...data,
        purchase_amount: Number(data.purchase_amount),
        service_charges: Number(data.service_charges),
        subscription_charges: Number(data.subscription_charges),
        total_amount: Number(data.total_amount),
        subscription_name: data.subscription?.service_name
    };

    return transformedData as Invoice;
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return null;
  }
};

// Update an invoice
export const updateInvoice = async (
  id: string,
  updates: Partial<Invoice>
): Promise<Invoice | null> => {
  try {
    const updatePayload: { [key: string]: any } = {};
    for (const key in updates) {
        if (Object.prototype.hasOwnProperty.call(updates, key)) {
            updatePayload[key] = (updates as any)[key];
        }
    }
    delete updatePayload.subscription;
    delete updatePayload.subscription_name;

    const { data, error } = await supabase
      .from('invoices')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data ? (data as Invoice) : null;
  } catch (error) {
    console.error('Error updating invoice:', error);
    return null;
  }
};

// Delete an invoice
export const deleteInvoice = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return false;
  }
}; 