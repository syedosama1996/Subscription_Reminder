/*
  # Create invoices table

  1. New Tables
    - `invoices`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `subscription_id` (uuid, references subscriptions)
      - `order_number` (text)
      - `purchase_date` (timestamp)
      - `amount` (numeric)
      - `status` (text: 'paid', 'pending')
      - `duration` (text)
      - `user_name` (text, nullable)
      - `user_address` (text, nullable)
      - `payment_method` (text, nullable)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `invoices` table
    - Add policies for authenticated users to manage their own invoices
*/

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  purchase_date timestamptz NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL CHECK (status IN ('paid', 'pending')),
  duration text NOT NULL,
  user_name text,
  user_address text,
  payment_method text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create policies for invoices
CREATE POLICY "Users can view their own invoices"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
  ON invoices
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service can create invoices"
  ON invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS invoices_user_id_idx ON invoices(user_id);
CREATE INDEX IF NOT EXISTS invoices_subscription_id_idx ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS invoices_order_number_idx ON invoices(order_number); 