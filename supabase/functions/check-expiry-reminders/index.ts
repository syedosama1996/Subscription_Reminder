// Supabase Edge Function for checking and sending expiry reminder emails
// This function should be called daily via Supabase pg_cron or external cron service
//
// To deploy:
// 1. supabase functions new check-expiry-reminders
// 2. Copy this file to: supabase/functions/check-expiry-reminders/index.ts
// 3. Deploy: supabase functions deploy check-expiry-reminders
//
// To schedule:
// 1. Use Supabase pg_cron extension to schedule daily execution
// 2. Or use external cron service (e.g., cron-job.org) to call this function daily

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@subscriptionreminder.app';

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
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all active subscriptions with their reminders
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        reminders (*)
      `)
      .eq('is_active', true);

    if (error) {
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active subscriptions found', emailsSent: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user emails
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email');

    const userEmailMap = new Map<string, string>();
    profiles?.forEach(profile => {
      if (profile.email) {
        userEmailMap.set(profile.id, profile.email);
      }
    });

    let emailsSent = 0;
    const errors: string[] = [];

    for (const subscription of subscriptions) {
      const expiryDate = new Date(subscription.expiry_date);
      expiryDate.setHours(0, 0, 0, 0);

      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Skip if subscription is already expired or too far in the future
      if (daysUntilExpiry < 0 || daysUntilExpiry > 30) {
        continue;
      }

      // Check if subscription has reminders
      const reminders = subscription.reminders || [];
      const enabledReminders = reminders.filter((r: any) => r.enabled && r.days_before <= daysUntilExpiry);

      // Find the reminder that matches today's days until expiry
      const matchingReminder = enabledReminders.find((r: any) => r.days_before === daysUntilExpiry);

      if (matchingReminder) {
        const userEmail = userEmailMap.get(subscription.user_id);
        if (!userEmail) {
          continue;
        }

        // Send expiry reminder email
        try {
          // Import email template (you'll need to include the template function here)
          const emailHtml = generateExpiryReminderEmail(subscription, daysUntilExpiry);
          const subject = `⚠️ Subscription Expiring Soon: ${subscription.service_name} (${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'day' : 'days'} left)`;

          // Send via Resend
          const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: FROM_EMAIL,
              to: [userEmail],
              subject,
              html: emailHtml,
            }),
          });

          if (resendResponse.ok) {
            emailsSent++;
            console.log(`Sent expiry reminder for ${subscription.service_name} to ${userEmail}`);
          } else {
            const errorData = await resendResponse.json();
            errors.push(`Failed to send email for ${subscription.service_name}: ${JSON.stringify(errorData)}`);
          }
        } catch (error) {
          errors.push(`Error sending email for ${subscription.service_name}: ${error.message}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-expiry-reminders function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// Email template function (simplified version - you can enhance this)
function generateExpiryReminderEmail(subscription: any, daysUntilExpiry: number): string {
  const expiryDate = new Date(subscription.expiry_date).toLocaleDateString();
  const today = new Date().toLocaleDateString();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; }
    .content { background: #fff; padding: 30px; border-radius: 8px; margin-top: 20px; }
    .alert-box { background-color: #fff3cd; border: 2px solid #ffc107; padding: 20px; border-radius: 6px; text-align: center; margin: 20px 0; }
    .days-count { font-size: 36px; font-weight: bold; color: #f5576c; }
    .section { margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 6px; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>⚠️ Subscription Expiring Soon!</h1>
  </div>
  <div class="content">
    <p>Hello,</p>
    <p>This is a reminder that your subscription is expiring soon.</p>
    <div class="alert-box">
      <h2>Your subscription expires in</h2>
      <div class="days-count">${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'day' : 'days'}</div>
    </div>
    <div class="section">
      <h2>Subscription Details</h2>
      <div class="info-row"><span>Service Name:</span><span><strong>${subscription.service_name}</strong></span></div>
      ${subscription.domain_name ? `<div class="info-row"><span>Domain:</span><span>${subscription.domain_name}</span></div>` : ''}
      <div class="info-row"><span>Expiry Date:</span><span><strong>${expiryDate}</strong></span></div>
      <div class="info-row"><span>Today's Date:</span><span>${today}</span></div>
    </div>
    <p><strong>Don't forget to renew your subscription before it expires!</strong></p>
  </div>
</body>
</html>
  `;
}

