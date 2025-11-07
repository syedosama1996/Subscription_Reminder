/*
  # Update invoices table schema and increase numeric precision
  
  1. Updates to existing table
    - Add missing columns to match code expectations
    - Increase precision of numeric fields to handle larger values
    - Change numeric precision from (10,2) to (15,2) to support values up to 999,999,999,999,999.99
*/

-- First, check if columns exist and add them if they don't
DO $$ 
BEGIN
  -- Add invoice_no column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'invoice_no') THEN
    ALTER TABLE invoices ADD COLUMN invoice_no text;
  END IF;

  -- Add name column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'name') THEN
    ALTER TABLE invoices ADD COLUMN name text;
  END IF;

  -- Add purchase_amount column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'purchase_amount') THEN
    ALTER TABLE invoices ADD COLUMN purchase_amount numeric(15,2) DEFAULT 0;
  END IF;

  -- Add service_charges column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'service_charges') THEN
    ALTER TABLE invoices ADD COLUMN service_charges numeric(15,2) DEFAULT 0;
  END IF;

  -- Add subscription_charges column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'subscription_charges') THEN
    ALTER TABLE invoices ADD COLUMN subscription_charges numeric(15,2) DEFAULT 0;
  END IF;

  -- Add total_amount column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'total_amount') THEN
    ALTER TABLE invoices ADD COLUMN total_amount numeric(15,2) DEFAULT 0;
  END IF;

  -- Add due_date column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'due_date') THEN
    ALTER TABLE invoices ADD COLUMN due_date date;
  END IF;

  -- Add domain_name column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'domain_name') THEN
    ALTER TABLE invoices ADD COLUMN domain_name text;
  END IF;

  -- Add email column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'email') THEN
    ALTER TABLE invoices ADD COLUMN email text;
  END IF;

  -- Add username column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'username') THEN
    ALTER TABLE invoices ADD COLUMN username text;
  END IF;

  -- Add vendor column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'vendor') THEN
    ALTER TABLE invoices ADD COLUMN vendor text;
  END IF;

  -- Add vendor_link column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'vendor_link') THEN
    ALTER TABLE invoices ADD COLUMN vendor_link text;
  END IF;

  -- Add notes column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'notes') THEN
    ALTER TABLE invoices ADD COLUMN notes text;
  END IF;

  -- Add category_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'category_id') THEN
    ALTER TABLE invoices ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
  END IF;

  -- Make subscription_id nullable if it's not already
  ALTER TABLE invoices ALTER COLUMN subscription_id DROP NOT NULL;

  -- Update status check constraint to include 'cancelled'
  -- First, fix any invalid status values before adding constraint
  UPDATE invoices 
  SET status = 'pending' 
  WHERE status NOT IN ('paid', 'pending', 'cancelled');
  
  -- Now drop the old constraint and add the new one
  ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
  ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('paid', 'pending', 'cancelled'));

  -- Make order_number nullable (since we're using invoice_no now)
  ALTER TABLE invoices ALTER COLUMN order_number DROP NOT NULL;

  -- Make duration nullable
  ALTER TABLE invoices ALTER COLUMN duration DROP NOT NULL;
END $$;

-- Update numeric precision for existing columns
DO $$
BEGIN
  -- Update amount column precision if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'invoices' AND column_name = 'amount') THEN
    ALTER TABLE invoices ALTER COLUMN amount TYPE numeric(15,2);
  END IF;

  -- Update purchase_amount precision
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'invoices' AND column_name = 'purchase_amount') THEN
    ALTER TABLE invoices ALTER COLUMN purchase_amount TYPE numeric(15,2);
  END IF;

  -- Update service_charges precision
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'invoices' AND column_name = 'service_charges') THEN
    ALTER TABLE invoices ALTER COLUMN service_charges TYPE numeric(15,2);
  END IF;

  -- Update subscription_charges precision
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'invoices' AND column_name = 'subscription_charges') THEN
    ALTER TABLE invoices ALTER COLUMN subscription_charges TYPE numeric(15,2);
  END IF;

  -- Update total_amount precision
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'invoices' AND column_name = 'total_amount') THEN
    ALTER TABLE invoices ALTER COLUMN total_amount TYPE numeric(15,2);
  END IF;
END $$;

-- Create index on invoice_no if it doesn't exist
CREATE INDEX IF NOT EXISTS invoices_invoice_no_idx ON invoices(invoice_no);

-- Migrate data from amount to total_amount if needed
DO $$
BEGIN
  -- If amount column exists and total_amount is null or 0, copy amount to total_amount
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'invoices' AND column_name = 'amount') THEN
    UPDATE invoices 
    SET total_amount = amount 
    WHERE total_amount IS NULL OR total_amount = 0;
  END IF;
END $$;

