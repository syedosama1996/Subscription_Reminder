export type Category = {
  id?: string;
  user_id: string;
  name: string;
  color?: string;
  created_at?: string;
};

export type ActivityLog = {
  id?: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: any;
  created_at?: string;
};

export type SubscriptionStatus = 'active' | 'expiring_soon' | 'expired' | 'past';

export type SubscriptionFilter = {
  status?: SubscriptionStatus[];
  categories?: string[];
  search?: string;
};