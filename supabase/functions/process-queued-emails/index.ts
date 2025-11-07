// Supabase Edge Function for processing queued emails
// This function sends emails that are stuck in 'queued' status
// 
// To deploy:
// 1. supabase functions deploy process-queued-emails
//
// To configure:
// Set RESEND_API_KEY secret: supabase secrets set RESEND_API_KEY=re_your_api_key

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Resend API configuration
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev';

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: 'RESEND_API_KEY not configured',
          message: 'Set RESEND_API_KEY secret to process queued emails'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get queued emails (limit to 50 at a time)
    const { data: queuedEmails, error: fetchError } = await supabase
      .from('email_logs')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      throw fetchError;
    }

    if (!queuedEmails || queuedEmails.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No queued emails to process',
          processed: 0
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process each queued email
    for (const email of queuedEmails) {
      try {
        // Update status to sending
        await supabase.from('email_logs')
          .update({ status: 'sending' })
          .eq('id', email.id);

        // Get full HTML content (we only stored first 1000 chars in html_content)
        // For now, we'll use what we have - in production you might want to store full content
        const htmlContent = email.html_content || email.subject;

        // Send via Resend API
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [email.to_email],
            subject: email.subject,
            html: htmlContent,
            text: email.subject,
          }),
        });

        if (!resendResponse.ok) {
          const errorData = await resendResponse.json();
          throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
        }

        // Update status to sent
        await supabase.from('email_logs')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', email.id);

        processed++;
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Email ${email.id}: ${errorMessage}`);
        
        // Update status to failed
        try {
          await supabase.from('email_logs')
            .update({ status: 'failed' })
            .eq('id', email.id);
        } catch (e) {
          // Ignore
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        failed,
        total: queuedEmails.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Processed ${processed} emails, ${failed} failed`
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-queued-emails function:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        message: 'Failed to process queued emails'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

