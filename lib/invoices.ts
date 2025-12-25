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
  bank_name?: string | null;
  card_holder_name?: string | null;
  card_last_four?: string | null;
  auto_renewal?: boolean;
  subscription?: { service_name: string };
};

export const generateInvoiceNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `INV-${year}-${random}`;
};

const roundToTwoDecimals = (value: number): number => {
  return Math.round(value * 100) / 100;
};

const validateNumericValue = (value: number, fieldName: string): number => {
  const rounded = roundToTwoDecimals(value);
  const maxValue = 999999999999999.99;
  const minValue = -999999999999999.99;
  
  if (rounded > maxValue) {
    console.warn(`${fieldName} value ${rounded} exceeds maximum ${maxValue}, truncating`);
    return maxValue;
  }
  if (rounded < minValue) {
    console.warn(`${fieldName} value ${rounded} exceeds minimum ${minValue}, truncating`);
    return minValue;
  }
  return rounded;
};

export const createInvoice = async (invoiceData: Partial<Invoice>): Promise<Invoice | null> => {
  try {
    // Calculate temporary due_date for insertion (will be updated after insertion based on created_at)
    const tempDueDate = invoiceData.due_date || new Date(new Date().setDate(new Date().getDate() + 14)).toISOString().split('T')[0];
    
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
      bank_name: invoiceData.bank_name,
      card_holder_name: invoiceData.card_holder_name,
      card_last_four: invoiceData.card_last_four,
      auto_renewal: invoiceData.auto_renewal,
      purchase_amount: validateNumericValue(invoiceData.purchase_amount ?? 0, 'purchase_amount'),
      service_charges: validateNumericValue(invoiceData.service_charges ?? 0, 'service_charges'),
      subscription_charges: validateNumericValue(invoiceData.subscription_charges ?? 0, 'subscription_charges'),
      total_amount: validateNumericValue(invoiceData.total_amount ?? 0, 'total_amount'),
      status: invoiceData.status || 'pending',
      due_date: tempDueDate,
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
    
    // Recalculate due_date based on created_at (invoice date) + 14 days if not explicitly provided
    if (data && !invoiceData.due_date && data.created_at) {
      const invoiceDate = new Date(data.created_at);
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 14);
      const calculatedDueDate = dueDate.toISOString().split('T')[0];
      
      // Only update if the calculated date is different from the temporary one
      if (calculatedDueDate !== tempDueDate) {
        const { data: updatedData, error: updateError } = await supabase
          .from('invoices')
          .update({ due_date: calculatedDueDate })
          .eq('id', data.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('Error updating due_date:', updateError);
          return data ? (data as Invoice) : null;
        }
        
        return updatedData ? (updatedData as Invoice) : null;
      }
    }
    
    return data ? (data as Invoice) : null;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
};

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
    bank_name?: string | null;
    card_holder_name?: string | null;
    card_last_four?: string | null;
    auto_renewal?: boolean;
  },
  serviceCharges: number = 0
): Promise<Invoice | null> => {
  try {
    const subscriptionCharges = roundToTwoDecimals(subscriptionDetails.purchase_amount_pkr);
    const serviceChargesRounded = roundToTwoDecimals(serviceCharges);
    const totalAmount = roundToTwoDecimals(subscriptionCharges + serviceChargesRounded);

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
      bank_name: subscriptionDetails.bank_name,
      card_holder_name: subscriptionDetails.card_holder_name,
      card_last_four: subscriptionDetails.card_last_four,
      auto_renewal: subscriptionDetails.auto_renewal,
      purchase_amount: 0,
      service_charges: serviceChargesRounded,
      subscription_charges: subscriptionCharges,
      total_amount: totalAmount,
      status: 'paid',
      // due_date will be calculated from created_at in createInvoice function
      due_date: undefined,
    };

    return await createInvoice(invoiceData);
  } catch (error) {
    console.error('Error generating invoice for subscription:', error);
    return null;
  }
};

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

    if ('purchase_amount' in updatePayload && typeof updatePayload.purchase_amount === 'number') {
      updatePayload.purchase_amount = validateNumericValue(updatePayload.purchase_amount, 'purchase_amount');
    }
    if ('service_charges' in updatePayload && typeof updatePayload.service_charges === 'number') {
      updatePayload.service_charges = validateNumericValue(updatePayload.service_charges, 'service_charges');
    }
    if ('subscription_charges' in updatePayload && typeof updatePayload.subscription_charges === 'number') {
      updatePayload.subscription_charges = validateNumericValue(updatePayload.subscription_charges, 'subscription_charges');
    }
    if ('total_amount' in updatePayload && typeof updatePayload.total_amount === 'number') {
      updatePayload.total_amount = validateNumericValue(updatePayload.total_amount, 'total_amount');
    }

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