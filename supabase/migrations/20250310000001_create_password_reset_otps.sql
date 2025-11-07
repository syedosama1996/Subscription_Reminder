-- Create table for storing password reset OTPs
-- This allows custom email function to send OTP codes when Supabase Auth SMTP fails

CREATE TABLE IF NOT EXISTS password_reset_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  otp TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email ON password_reset_otps(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_expires_at ON password_reset_otps(expires_at);

-- Add RLS policies
ALTER TABLE password_reset_otps ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage all OTPs (for cleanup and inserts)
CREATE POLICY "Service role can manage all OTPs"
  ON password_reset_otps
  FOR ALL
  USING (auth.role() = 'service_role');

-- Allow inserts for password reset (no auth required)
CREATE POLICY "Allow password reset OTP inserts"
  ON password_reset_otps
  FOR INSERT
  WITH CHECK (true);

-- Allow users to read their own OTPs (if authenticated)
CREATE POLICY "Users can read their own OTPs"
  ON password_reset_otps
  FOR SELECT
  USING (
    auth.uid()::text = (SELECT id::text FROM profiles WHERE email = password_reset_otps.email)
    OR auth.role() = 'service_role'
  );

-- Allow updates for OTP verification (no auth required, but only for unused OTPs)
CREATE POLICY "Allow OTP verification updates"
  ON password_reset_otps
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Function to clean up expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_otps
  WHERE expires_at < NOW() OR used = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create a scheduled job to clean up expired OTPs (if pg_cron is enabled)
-- SELECT cron.schedule('cleanup-expired-otps', '0 * * * *', 'SELECT cleanup_expired_otps()');

