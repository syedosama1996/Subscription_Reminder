-- Create email_logs table for tracking
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  subject text NOT NULL,
  html_content text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);

-- Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage logs
CREATE POLICY "Service role can manage email logs"
  ON email_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create function to queue emails
CREATE OR REPLACE FUNCTION send_email_via_smtp(
  p_to text[],
  p_subject text,
  p_html text,
  p_text text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email_id uuid;
BEGIN
  -- Log the email attempt
  INSERT INTO email_logs (to_email, subject, html_content, status)
  VALUES (array_to_string(p_to, ','), p_subject, p_html, 'queued')
  RETURNING id INTO v_email_id;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Email queued for sending',
    'email_id', v_email_id,
    'to', p_to,
    'subject', p_subject
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION send_email_via_smtp(text[], text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION send_email_via_smtp(text[], text, text, text) TO service_role;

