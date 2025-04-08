import { supabase } from '../supabase';

export type ActivityType = 'success' | 'warning' | 'info';

export interface ActivityLog {
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, any>;
}

interface ActivityRecord {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

export class ActivityLogger {
  static async log(activity: ActivityLog) {
    try {
      // For subscription-related activities, ensure we have the correct user_id
      if (activity.entity_type === 'subscription' && activity.entity_id) {
        try {
          const { data: subscription, error } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('id', activity.entity_id)
            .single();

          if (error) {
            console.error('Error fetching subscription:', error);
          } else if (subscription) {
            activity.user_id = subscription.user_id;
          }
        } catch (err) {
          console.error('Error in subscription lookup:', err);
        }
      }

      // Ensure user_id is set
      if (!activity.user_id) {
        console.error('Activity log missing user_id:', activity);
        // Try to get user_id from auth context if available
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            activity.user_id = session.user.id;
          } else {
            console.error('Could not determine user_id for activity log');
            return; // Skip logging if we can't determine the user
          }
        } catch (err) {
          console.error('Error getting auth session:', err);
          return; // Skip logging if we can't get the auth session
        }
      }

      const { error } = await supabase
        .from('activity_logs')
        .insert({
          ...activity,
          details: activity.details || null,
        });

      if (error) {
        console.error('Error logging activity:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't re-throw to prevent cascading errors
    }
  }

  static async getUserActivities(userId: string, options?: { 
    limit?: number, 
    offset?: number,
    startDate?: Date,
    endDate?: Date
  }) {
    try {
      const limit = options?.limit || 100;
      const offset = options?.offset || 0;
      
      let query = supabase
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Add date filters if provided
      if (options?.startDate) {
        query = query.gte('created_at', options.startDate.toISOString());
      }
      
      if (options?.endDate) {
        query = query.lte('created_at', options.endDate.toISOString());
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching activities:', error);
        throw error;
      }

      
      if (data && data.length > 0) {
        console.log('First activity date:', new Date(data[0].created_at).toLocaleString());
        console.log('Last activity date:', new Date(data[data.length - 1].created_at).toLocaleString());
      } else {
        console.log('No activities found');
      }

      return {
        activities: data || [],
        totalCount: count || 0,
        hasMore: count ? offset + limit < count : false
      };
    } catch (error) {
      console.error('Failed to fetch user activities:', error);
      return {
        activities: [],
        totalCount: 0,
        hasMore: false
      };
    }
  }
} 