import { supabase } from './supabase';
import { Category, ActivityLog, SubscriptionFilter } from './types';

export type SubscriptionHistory = {
  id?: string;
  subscription_id: string;
  purchase_date: string;
  purchase_amount_pkr: number;
  purchase_amount_usd: number;
  vendor?: string;
  vendor_link?: string;
  created_at?: string;
};

export type Reminder = {
  id?: string;
  subscription_id: string;
  days_before: number;
  enabled: boolean;
  created_at?: string;
};

export type Subscription = {
  id?: string;
  user_id: string;
  service_name: string;
  domain_name?: string;
  purchase_date: string;
  purchase_amount_pkr: number;
  purchase_amount_usd: number;
  expiry_date: string;
  email?: string;
  username?: string;
  password?: string;
  notes?: string;
  vendor?: string;
  vendor_link?: string;
  category_id?: string;
  is_active?: boolean;
  created_at?: string;
  reminders?: Reminder[];
  history?: SubscriptionHistory[];
  category?: Category;
};

// Create a new subscription
export const createSubscription = async (subscription: Subscription, userId: string) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert(subscription)
      .select()
      .single();

    if (error) throw error;
    
    // Create initial history record
    if (data?.id) {
      await createSubscriptionHistory({
        subscription_id: data.id,
        purchase_date: subscription.purchase_date,
        purchase_amount_pkr: subscription.purchase_amount_pkr,
        purchase_amount_usd: subscription.purchase_amount_usd || 0,
        vendor: subscription.vendor,
        vendor_link: subscription.vendor_link
      });

      // Log activity
      await logActivity({
        user_id: userId,
        action: 'create',
        entity_type: 'subscription',
        entity_id: data.id,
        details: { service_name: subscription.service_name }
      });
    }
    
    return data;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
};

// Get all subscriptions for a user with optional filtering
export const getSubscriptions = async (userId: string, filter?: SubscriptionFilter) => {
  try {
    let query = supabase
      .from('subscriptions')
      .select(`
        *,
        reminders (*),
        history:subscription_history(*),
        category:categories(*)
      `)
      .eq('user_id', userId);

    // Apply filters if provided
    if (filter) {
      // Filter by category
      if (filter.categories && filter.categories.length > 0) {
        query = query.in('category_id', filter.categories);
      }

      // Filter by status
      if (filter.status && filter.status.length > 0) {
        // We'll handle status filtering in JavaScript since it involves date calculations
      }
    }

    // Always sort by expiry date
    query = query.order('expiry_date', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;

    // Apply status filtering if needed
    if (filter?.status && filter.status.length > 0 && data) {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      return data.filter(sub => {
        const expiryDate = new Date(sub.expiry_date);
        
        // Only include active subscriptions
        if (!sub.is_active && filter.status && !filter.status.includes('past')) {
          return false;
        }

        // Filter by status
        if (filter.status && filter.status.includes('active') && expiryDate > thirtyDaysFromNow && sub.is_active) {
          return true;
        }
        if (filter.status && filter.status.includes('expiring_soon') && expiryDate <= thirtyDaysFromNow && expiryDate >= today && sub.is_active) {
          return true;
        }
        if (filter.status && filter.status.includes('expired') && expiryDate < today && expiryDate >= thirtyDaysAgo && sub.is_active) {
          return true;
        }
        if (filter.status && filter.status.includes('past') && (!sub.is_active || expiryDate < thirtyDaysAgo)) {
          return true;
        }
        
        return filter.status && filter.status.length === 0; // Include all if no status filter
      });
    }

    return data;
  } catch (error) {
    console.error('Error getting subscriptions:', error);
    throw error;
  }
};

// Get a single subscription by ID
export const getSubscription = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        reminders (*),
        history:subscription_history(*),
        category:categories(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting subscription:', error);
    throw error;
  }
};

// Update a subscription
export const updateSubscription = async (id: string, subscription: Partial<Subscription>, userId: string) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .update(subscription)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await logActivity({
      user_id: userId,
      action: 'update',
      entity_type: 'subscription',
      entity_id: id,
      details: { changes: subscription }
    });
    
    return data;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
};

// Toggle subscription active status
export const toggleSubscriptionStatus = async (id: string, isActive: boolean, userId: string) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await logActivity({
      user_id: userId,
      action: isActive ? 'activate' : 'deactivate',
      entity_type: 'subscription',
      entity_id: id,
      details: { is_active: isActive }
    });
    
    return data;
  } catch (error) {
    console.error('Error toggling subscription status:', error);
    throw error;
  }
};

// Delete a subscription
export const deleteSubscription = async (id: string, userId: string) => {
  try {
    // Get subscription details before deleting for activity log
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('service_name')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Log activity
    if (subscription) {
      await logActivity({
        user_id: userId,
        action: 'delete',
        entity_type: 'subscription',
        entity_id: id,
        details: { service_name: subscription.service_name }
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting subscription:', error);
    throw error;
  }
};

// Delete multiple subscriptions
export const deleteMultipleSubscriptions = async (ids: string[], userId: string) => {
  try {
    // Get subscription details before deleting for activity log
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('id, service_name')
      .in('id', ids);

    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .in('id', ids);

    if (error) throw error;

    // Log activity for each deleted subscription
    if (subscriptions) {
      for (const subscription of subscriptions) {
        await logActivity({
          user_id: userId,
          action: 'delete',
          entity_type: 'subscription',
          entity_id: subscription.id,
          details: { service_name: subscription.service_name }
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting multiple subscriptions:', error);
    throw error;
  }
};

// Create a reminder
export const createReminder = async (reminder: Reminder) => {
  try {
    const { data, error } = await supabase
      .from('reminders')
      .insert(reminder)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating reminder:', error);
    throw error;
  }
};

// Update a reminder
export const updateReminder = async (id: string, reminder: Partial<Reminder>) => {
  try {
    const { data, error } = await supabase
      .from('reminders')
      .update(reminder)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating reminder:', error);
    throw error;
  }
};

// Delete a reminder
export const deleteReminder = async (id: string) => {
  try {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting reminder:', error);
    throw error;
  }
};

// Create subscription history record
export const createSubscriptionHistory = async (history: SubscriptionHistory) => {
  try {
    const { data, error } = await supabase
      .from('subscription_history')
      .insert(history)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating subscription history:', error);
    throw error;
  }
};

// Get subscription history
export const getSubscriptionHistory = async (subscriptionId: string) => {
  try {
    const { data, error } = await supabase
      .from('subscription_history')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting subscription history:', error);
    throw error;
  }
};

// Renew subscription
export const renewSubscription = async (
  id: string, 
  renewalData: {
    purchase_date: string;
    expiry_date: string;
    purchase_amount_pkr: number;
    purchase_amount_usd?: number;
    vendor?: string;
    vendor_link?: string;
  },
  userId: string
) => {
  try {
    // First update the subscription
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('subscriptions')
      .update({
        purchase_date: renewalData.purchase_date,
        expiry_date: renewalData.expiry_date,
        purchase_amount_pkr: renewalData.purchase_amount_pkr,
        purchase_amount_usd: renewalData.purchase_amount_usd || 0,
        vendor: renewalData.vendor,
        vendor_link: renewalData.vendor_link,
        is_active: true // Ensure subscription is active when renewed
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Then create a history record
    await createSubscriptionHistory({
      subscription_id: id,
      purchase_date: renewalData.purchase_date,
      purchase_amount_pkr: renewalData.purchase_amount_pkr,
      purchase_amount_usd: renewalData.purchase_amount_usd || 0,
      vendor: renewalData.vendor,
      vendor_link: renewalData.vendor_link
    });

    // Log activity
    await logActivity({
      user_id: userId,
      action: 'renew',
      entity_type: 'subscription',
      entity_id: id,
      details: { 
        purchase_date: renewalData.purchase_date,
        expiry_date: renewalData.expiry_date
      }
    });

    return updatedSubscription;
  } catch (error) {
    console.error('Error renewing subscription:', error);
    throw error;
  }
};

// Category Management
export const createCategory = async (category: Category) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert(category)
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await logActivity({
      user_id: category.user_id,
      action: 'create',
      entity_type: 'category',
      entity_id: data.id,
      details: { name: category.name }
    });
    
    return data;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

export const getCategories = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting categories:', error);
    throw error;
  }
};

export const updateCategory = async (id: string, category: Partial<Category>, userId: string) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update(category)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await logActivity({
      user_id: userId,
      action: 'update',
      entity_type: 'category',
      entity_id: id,
      details: { changes: category }
    });
    
    return data;
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

export const deleteCategory = async (id: string, userId: string) => {
  try {
    // Get category details before deleting for activity log
    const { data: category } = await supabase
      .from('categories')
      .select('name')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Log activity
    if (category) {
      await logActivity({
        user_id: userId,
        action: 'delete',
        entity_type: 'category',
        entity_id: id,
        details: { name: category.name }
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

// Activity Logs
export const logActivity = async (log: ActivityLog) => {
  try {
    // For subscription-related activities, ensure we have the correct user_id
    if (log.entity_type === 'subscription' && log.entity_id) {
      try {
        const { data: subscription, error } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('id', log.entity_id)
          .single();

        if (error) {
          console.error('Error fetching subscription:', error);
        } else if (subscription) {
          log.user_id = subscription.user_id;
        }
      } catch (err) {
        console.error('Error in subscription lookup:', err);
      }
    }

    // Ensure user_id is set
    if (!log.user_id) {
      console.error('Activity log missing user_id:', log);
      return null;
    }

    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: log.user_id,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        details: log.details || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging activity:', error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw here to prevent cascading errors
    return null;
  }
};

export const getActivityLogs = async (userId: string, options?: { startDate?: Date, endDate?: Date }) => {
  try {
    let query = supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId);

    if (options?.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }

    if (options?.endDate) {
      query = query.lte('created_at', options.endDate.toISOString());
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting activity logs:', error);
    throw error;
  }
};

// Export data
export const exportSubscriptionsToCSV = (subscriptions: Subscription[]): string => {
  if (!subscriptions || subscriptions.length === 0) {
    return '';
  }

  // Define headers
  const headers = [
    'Service Name',
    'Domain Name',
    'Category',
    'Vendor',
    'Vendor Link',
    'Purchase Date',
    'Expiry Date',
    'Amount (PKR)',
    'Amount (USD)',
    'Email',
    'Username',
    'Password',
    'Notes',
    'Status'
  ];

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...subscriptions.map(sub => {
      const status = sub.is_active === false ? 'Inactive' : 
                    (new Date(sub.expiry_date) < new Date() ? 'Expired' : 'Active');
      
      return [
        `"${sub.service_name || ''}"`,
        `"${sub.domain_name || ''}"`,
        `"${sub.category?.name || ''}"`,
        `"${sub.vendor || ''}"`,
        `"${sub.vendor_link || ''}"`,
        `"${new Date(sub.purchase_date).toLocaleDateString()}"`,
        `"${new Date(sub.expiry_date).toLocaleDateString()}"`,
        `"${sub.purchase_amount_pkr || 0}"`,
        `"${sub.purchase_amount_usd || 0}"`,
        `"${sub.email || ''}"`,
        `"${sub.username || ''}"`,
        `"${sub.password || ''}"`,
        `"${sub.notes || ''}"`,
        `"${status}"`
      ].join(',');
    })
  ].join('\n');

  return csvContent;
};