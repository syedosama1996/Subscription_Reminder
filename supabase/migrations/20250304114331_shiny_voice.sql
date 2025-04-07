/*
  # Create subscription management tables

  1. New Tables
    - `subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `service_name` (text)
      - `domain_name` (text, nullable)
      - `purchase_date` (timestamptz)
      - `purchase_amount_pkr` (numeric)
      - `purchase_amount_usd` (numeric)
      - `expiry_date` (timestamptz)
      - `email` (text, nullable)
      - `username` (text, nullable)
      - `password` (text, nullable)
      - `notes` (text, nullable)
      - `created_at` (timestamptz)
    - `reminders`
      - `id` (uuid, primary key)
      - `subscription_id` (uuid, references subscriptions)
      - `days_before` (integer)
      - `enabled` (boolean)
      - `created_at` (timestamptz)
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
*/

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  domain_name text,
  purchase_date timestamptz NOT NULL,
  purchase_amount_pkr numeric NOT NULL,
  purchase_amount_usd numeric DEFAULT 0,
  expiry_date timestamptz NOT NULL,
  email text,
  username text,
  password text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  days_before integer NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Create policies for subscriptions
CREATE POLICY "Users can create their own subscriptions"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
  ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
  ON subscriptions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for reminders
CREATE POLICY "Users can manage reminders for their subscriptions"
  ON reminders
  FOR ALL
  TO authenticated
  USING (
    subscription_id IN (
      SELECT id FROM subscriptions WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    subscription_id IN (
      SELECT id FROM subscriptions WHERE user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_expiry_date_idx ON subscriptions(expiry_date);
CREATE INDEX IF NOT EXISTS reminders_subscription_id_idx ON reminders(subscription_id);