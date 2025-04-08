/*
  # Add Categories and Activity Logs

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `color` (text)
      - `created_at` (timestamp)
    
    - `activity_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `action` (text)
      - `entity_type` (text)
      - `entity_id` (uuid)
      - `details` (jsonb)
      - `created_at` (timestamp)

  2. Changes to Existing Tables
    - Add `category_id` to subscriptions table
    - Add `is_active` to subscriptions table

  3. Security
    - Enable RLS on new tables
    - Add policies for categories and activity logs
*/

-- Create categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  created_at timestamptz DEFAULT now()
);

-- Create activity_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add new columns to subscriptions table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscriptions' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscriptions' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for categories if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Users can create their own categories'
  ) THEN
    CREATE POLICY "Users can create their own categories"
      ON categories
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Users can view their own categories'
  ) THEN
    CREATE POLICY "Users can view their own categories"
      ON categories
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Users can update their own categories'
  ) THEN
    CREATE POLICY "Users can update their own categories"
      ON categories
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Users can delete their own categories'
  ) THEN
    CREATE POLICY "Users can delete their own categories"
      ON categories
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create policies for activity_logs if they don't exist
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can create their own activity logs" ON activity_logs;
  DROP POLICY IF EXISTS "Users can view their own activity logs" ON activity_logs;
  DROP POLICY IF EXISTS "Users can manage subscription activity logs" ON activity_logs;

  -- Create a single comprehensive policy for all activity log operations
  CREATE POLICY "Users can manage all activity logs"
    ON activity_logs
    FOR ALL
    TO authenticated
    USING (
      auth.uid() = user_id
    )
    WITH CHECK (
      auth.uid() = user_id
    );
END $$;

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS categories_user_id_idx ON categories(user_id);
CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS subscriptions_category_id_idx ON subscriptions(category_id);
CREATE INDEX IF NOT EXISTS subscriptions_is_active_idx ON subscriptions(is_active);