/*
  # Add categories and activity logs

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text, not null)
      - `color` (text)
      - `created_at` (timestamp)
    
    - `activity_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `action` (text, not null)
      - `entity_type` (text, not null)
      - `entity_id` (uuid)
      - `details` (jsonb)
      - `created_at` (timestamp)
  
  2. Changes to existing tables
    - Add to `subscriptions`:
      - `category_id` (uuid, foreign key to categories)
      - `is_active` (boolean, default true)
  
  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  created_at timestamptz DEFAULT now()
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add new columns to subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for categories
CREATE POLICY "Users can create their own categories"
  ON categories
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own categories"
  ON categories
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON categories
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON categories
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for activity_logs
CREATE POLICY "Users can create their own activity logs"
  ON activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own activity logs"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS categories_user_id_idx ON categories(user_id);
CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS subscriptions_category_id_idx ON subscriptions(category_id);
CREATE INDEX IF NOT EXISTS subscriptions_is_active_idx ON subscriptions(is_active);