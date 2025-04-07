/*
  # Create subscription history table

  1. New Tables
    - `subscription_history`
      - `id` (uuid, primary key)
      - `subscription_id` (uuid, foreign key to subscriptions)
      - `purchase_date` (timestamp)
      - `purchase_amount_pkr` (numeric)
      - `purchase_amount_usd` (numeric)
      - `vendor` (text)
      - `vendor_link` (text)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `subscription_history` table
    - Add policy for authenticated users to manage their subscription history
*/

-- Create subscription history table
CREATE TABLE IF NOT EXISTS subscription_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  purchase_date timestamptz NOT NULL,
  purchase_amount_pkr numeric NOT NULL,
  purchase_amount_usd numeric DEFAULT 0,
  vendor text,
  vendor_link text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Create policies for subscription history
CREATE POLICY "Users can manage subscription history for their subscriptions"
  ON subscription_history
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
CREATE INDEX IF NOT EXISTS subscription_history_subscription_id_idx ON subscription_history(subscription_id);