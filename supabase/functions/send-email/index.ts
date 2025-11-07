// Supabase Edge Function for sending emails via Resend API
// Uses Resend API for reliable email delivery (same as production email services)
// 
// To deploy:
// 1. supabase functions deploy send-email
//
// To configure:
// Get Resend API key from: https://resend.com
// Then set these secrets:
// supabase secrets set RESEND_API_KEY=re_your_api_key
// supabase secrets set FROM_EMAIL=onboarding@resend.dev

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

    const { to, subject, html, text } = await req.json();

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
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

    // Log email attempt
    let emailLogId: string | null = null;
    try {
      const { data: logData } = await supabase.from('email_logs').insert({
        to_email: Array.isArray(to) ? to.join(',') : to,
        subject,
        html_content: html.substring(0, 1000),
        status: 'sending',
      }).select('id').single();
      emailLogId = logData?.id || null;
    } catch (logError) {
      console.log('Could not log email:', logError);
    }

    // Send email using Resend API
    if (RESEND_API_KEY) {
      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
            text: text || subject,
          }),
        });

        if (!resendResponse.ok) {
          const errorData = await resendResponse.json();
          throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
        }

        const result = await resendResponse.json();

        // Update log status to sent
        if (emailLogId) {
          try {
            await supabase.from('email_logs')
              .update({ 
                status: 'sent', 
                sent_at: new Date().toISOString() 
              })
              .eq('id', emailLogId);
          } catch (e) {
            console.log('Could not update email log:', e);
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            data: result,
            message: 'Email sent successfully via Resend API'
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      } catch (error) {
        console.error('Resend API error:', error);
        
        // Update log status to failed
        if (emailLogId) {
          try {
            await supabase.from('email_logs')
              .update({ status: 'failed' })
              .eq('id', emailLogId);
          } catch (e) {
            // Ignore
          }
        }

        return new Response(
          JSON.stringify({ 
            success: false,
            error: error.message,
            message: 'Failed to send email via Resend API'
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Resend API not configured - queue email
      const { data: dbData } = await supabase.rpc('send_email_via_smtp', {
        p_to: Array.isArray(to) ? to : [to],
        p_subject: subject,
        p_html: html,
        p_text: text || subject,
      });

      return new Response(
        JSON.stringify({ 
          success: true,
          data: dbData,
          message: 'Email queued. Set RESEND_API_KEY secret to enable sending.',
          note: 'Get API key from https://resend.com and set: supabase secrets set RESEND_API_KEY=re_your_key'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in send-email function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        message: 'Email sending failed'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
