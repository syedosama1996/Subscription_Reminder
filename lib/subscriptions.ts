import { supabase } from './supabase';
import { Category, ActivityLog, SubscriptionFilter } from './types';
import { generateInvoiceForSubscription } from './invoices';
import { scheduleNotification } from './notifications';
// Keep shared functions within this file or import correctly if moved
// import { createSubscriptionHistory, logActivity } from './sharedSubscriptionFunctions'; 

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
  domain_name?: string | null;
  purchase_date: string;
  purchase_amount_pkr: number;
  purchase_amount_usd: number;
  expiry_date: string;
  email?: string | null;
  username?: string | null;
  password?: string | null;
  notes?: string | null;
  vendor?: string | null;
  vendor_link?: string | null;
  category_id?: string | null;
  is_active?: boolean;
  created_at?: string;
  reminders?: Reminder[];
  history?: SubscriptionHistory[];
  category?: Category;
};

// Create a new subscription
export const createSubscription = async (subscription: Partial<Subscription>, userId: string) => {
  try {
    const subscriptionPayload = {
      user_id: userId,
      service_name: subscription.service_name,
      purchase_date: subscription.purchase_date,
      purchase_amount_pkr: subscription.purchase_amount_pkr,
      expiry_date: subscription.expiry_date,
      domain_name: subscription.domain_name,
      purchase_amount_usd: subscription.purchase_amount_usd || 0,
      email: subscription.email,
      username: subscription.username,
      password: subscription.password,
      notes: subscription.notes,
      vendor: subscription.vendor,
      vendor_link: subscription.vendor_link,
      category_id: subscription.category_id,
      is_active: subscription.is_active ?? true,
    };

    if (!subscriptionPayload.service_name || !subscriptionPayload.purchase_date || subscriptionPayload.purchase_amount_pkr === undefined || !subscriptionPayload.expiry_date) {
        throw new Error("Missing required subscription fields for creation.");
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .insert(subscriptionPayload)
      .select()
      .single();

    if (error) throw error;
    
    const newSubscription = data as Subscription;

    if (newSubscription?.id) {
      await createSubscriptionHistory({
        subscription_id: newSubscription.id,
        purchase_date: newSubscription.purchase_date,
        purchase_amount_pkr: newSubscription.purchase_amount_pkr,
        purchase_amount_usd: newSubscription.purchase_amount_usd ?? 0,
        vendor: newSubscription.vendor ?? undefined,
        vendor_link: newSubscription.vendor_link ?? undefined
      });

      const subscriptionDetailsForInvoice = {
        service_name: newSubscription.service_name,
        purchase_date: newSubscription.purchase_date,
        purchase_amount_pkr: newSubscription.purchase_amount_pkr,
        domain_name: newSubscription.domain_name,
        email: newSubscription.email,
        username: newSubscription.username,
        vendor: newSubscription.vendor,
        vendor_link: newSubscription.vendor_link,
        category_id: newSubscription.category_id,
      };

      await generateInvoiceForSubscription(
        newSubscription.id,
        userId,
        subscriptionDetailsForInvoice
      );

      // Create notification for new subscription
      await scheduleNotification(
        'New Subscription Added',
        `${newSubscription.service_name} has been added to your subscriptions`
      );

      await logActivity({
        user_id: userId,
        action: 'create',
        entity_type: 'subscription',
        entity_id: newSubscription.id,
        details: { service_name: newSubscription.service_name }
      });
    }
    
    return newSubscription;
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

    // Sort by last_updated_at in descending order (newest first)
    query = query.order('last_updated_at', { ascending: false });

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
    // Remove the category field if it exists since it's not a column in the subscriptions table
    const { category, ...subscriptionData } = subscription;

    const { data, error } = await supabase
      .from('subscriptions')
      .update({ 
        ...subscriptionData,
        last_updated_at: new Date().toISOString()
      })
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
      details: { changes: subscriptionData }
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
    // First get the subscription to get its name
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('service_name')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Update the subscription status
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ 
        is_active: isActive,
        last_updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Create notification
    await scheduleNotification(
      `Subscription ${isActive ? 'Activated' : 'Deactivated'}`,
      `${subscription.service_name} has been ${isActive ? 'activated' : 'deactivated'}`
    );

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

    // Delete related records in the correct order to handle foreign key constraints
    // 1. First delete related invoices
    const { error: invoiceError } = await supabase
      .from('invoices')
      .delete()
      .eq('subscription_id', id);

    if (invoiceError) {
      console.error('Error deleting related invoices:', invoiceError);
      throw invoiceError;
    }

    // 2. Delete related reminders
    const { error: reminderError } = await supabase
      .from('reminders')
      .delete()
      .eq('subscription_id', id);

    if (reminderError) {
      console.error('Error deleting related reminders:', reminderError);
      throw reminderError;
    }

    // 3. Delete subscription history
    const { error: historyError } = await supabase
      .from('subscription_history')
      .delete()
      .eq('subscription_id', id);

    if (historyError) {
      console.error('Error deleting subscription history:', historyError);
      throw historyError;
    }

    // 4. Finally delete the subscription
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Create notification for deleted subscription
    if (subscription) {
      await scheduleNotification(
        'Subscription Deleted',
        `${subscription.service_name} has been removed from your subscriptions`
      );

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

    // Delete related records in the correct order to handle foreign key constraints
    // 1. First delete related invoices
    const { error: invoiceError } = await supabase
      .from('invoices')
      .delete()
      .in('subscription_id', ids);

    if (invoiceError) {
      console.error('Error deleting related invoices:', invoiceError);
      throw invoiceError;
    }

    // 2. Delete related reminders
    const { error: reminderError } = await supabase
      .from('reminders')
      .delete()
      .in('subscription_id', ids);

    if (reminderError) {
      console.error('Error deleting related reminders:', reminderError);
      throw reminderError;
    }

    // 3. Delete subscription history
    const { error: historyError } = await supabase
      .from('subscription_history')
      .delete()
      .in('subscription_id', ids);

    if (historyError) {
      console.error('Error deleting subscription history:', historyError);
      throw historyError;
    }

    // 4. Finally delete the subscriptions
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .in('id', ids);

    if (error) throw error;

    // Log activity and create notifications for each deleted subscription
    if (subscriptions) {
      for (const subscription of subscriptions) {
        await scheduleNotification(
          'Subscription Deleted',
          `${subscription.service_name} has been removed from your subscriptions`
        );

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
export const getSubscriptionHistory = async (userId: string) => {
  try {
    // First get all subscription IDs for the user
    const { data: userSubscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId);

    if (subError) throw subError;

    if (!userSubscriptions || userSubscriptions.length === 0) {
      return [];
    }

    const subscriptionIds = userSubscriptions.map(sub => sub.id);

    // Then get the history for these subscriptions
    const { data, error } = await supabase
      .from('subscription_history')
      .select(`
        *,
        subscription:subscriptions (
          service_name,
          domain_name
        )
      `)
      .in('subscription_id', subscriptionIds)
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
    const { data: existingSubscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('service_name, domain_name, email, username, vendor, vendor_link, category_id')
      .eq('id', id)
      .single();
      
    if (fetchError) throw fetchError;
    if (!existingSubscription) throw new Error("Subscription not found for renewal.");
    
    const updatePayload = {
      purchase_date: renewalData.purchase_date,
      expiry_date: renewalData.expiry_date,
      purchase_amount_pkr: renewalData.purchase_amount_pkr,
      purchase_amount_usd: renewalData.purchase_amount_usd || 0,
      vendor: renewalData.vendor,
      vendor_link: renewalData.vendor_link,
      is_active: true 
    };

    const { data: updatedSubscription, error: updateError } = await supabase
      .from('subscriptions')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    const finalSubscription = updatedSubscription as Subscription;

    await createSubscriptionHistory({
      subscription_id: id,
      purchase_date: renewalData.purchase_date,
      purchase_amount_pkr: renewalData.purchase_amount_pkr,
      purchase_amount_usd: renewalData.purchase_amount_usd || 0,
      vendor: renewalData.vendor,
      vendor_link: renewalData.vendor_link
    });
    
    const subscriptionDetailsForInvoice = {
      service_name: existingSubscription.service_name,
      purchase_date: renewalData.purchase_date,
      purchase_amount_pkr: renewalData.purchase_amount_pkr,
      domain_name: existingSubscription.domain_name,
      email: existingSubscription.email,
      username: existingSubscription.username,
      vendor: renewalData.vendor,
      vendor_link: renewalData.vendor_link,
      category_id: existingSubscription.category_id,
    };

    await generateInvoiceForSubscription(
      id,
      userId,
      subscriptionDetailsForInvoice
    );

    // Create notification for subscription renewal
    await scheduleNotification(
      'Subscription Renewed',
      `${existingSubscription.service_name} has been renewed until ${new Date(renewalData.expiry_date).toLocaleDateString()}`
    );

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

    return finalSubscription;
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
          // Log the error but don't necessarily stop the activity logging
          console.error('Error fetching subscription user_id for activity log:', error);
        } else if (subscription) {
          log.user_id = subscription.user_id;
        }
      } catch (err) {
        console.error('Error in subscription lookup for activity log:', err);
      }
    }

    // Ensure user_id is set before inserting
    if (!log.user_id) {
      console.error('Activity log missing user_id:', log);
      // Decide how to handle: throw error, return null, or try to find user_id another way
      return null; // Example: Don't insert log if user_id is missing
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
      // Decide whether to throw: throw error;
      return null; // Example: Return null on logging failure but don't crash app
    }
    return data;
  } catch (error) {
    console.error('Caught error during activity logging:', error);
    return null;
  }
};