/*
  # Add vendor fields to subscriptions table

  1. Changes
    - Add `vendor` column to subscriptions table
    - Add `vendor_link` column to subscriptions table
*/

-- Add vendor fields to subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS vendor text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS vendor_link text;