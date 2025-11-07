import Constants from 'expo-constants';
import { supabase } from './supabase';
import { Invoice } from './invoices';
import { Subscription } from './subscriptions';
import { format } from 'date-fns';

// Email service configuration
const RESEND_API_KEY = Constants.expoConfig?.extra?.resendApiKey || process.env.EXPO_PUBLIC_RESEND_API_KEY;
const FROM_EMAIL = Constants.expoConfig?.extra?.fromEmail || process.env.EXPO_PUBLIC_FROM_EMAIL || 'noreply@subscriptionreminder.app';

// Email templates
const getPurchaseEmailTemplate = (
  userEmail: string,
  subscription: Subscription,
  invoice: Invoice
): string => {
  const purchaseDate = format(new Date(subscription.purchase_date), 'MMMM dd, yyyy');
  const expiryDate = format(new Date(subscription.expiry_date), 'MMMM dd, yyyy');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Purchase Confirmation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px 8px 0 0;
      margin: -30px -30px 30px -30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .success-icon {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .content {
      margin-bottom: 30px;
    }
    .section {
      margin-bottom: 25px;
      padding: 20px;
      background-color: #f9f9f9;
      border-radius: 6px;
      border-left: 4px solid #667eea;
    }
    .section h2 {
      margin-top: 0;
      color: #667eea;
      font-size: 18px;
      font-weight: 600;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #666;
    }
    .info-value {
      color: #333;
      text-align: right;
    }
    .credentials-box {
      background-color: #fff;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      padding: 15px;
      margin-top: 10px;
    }
    .credentials-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-family: 'Courier New', monospace;
      font-size: 14px;
    }
    .invoice-box {
      background-color: #f0f7ff;
      border: 2px solid #667eea;
      border-radius: 6px;
      padding: 20px;
      margin-top: 20px;
    }
    .invoice-box h3 {
      margin-top: 0;
      color: #667eea;
    }
    .amount {
      font-size: 24px;
      font-weight: 700;
      color: #667eea;
      margin: 10px 0;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      color: #999;
      font-size: 12px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      margin-top: 10px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="success-icon">✓</div>
      <h1>Subscription Added Successfully!</h1>
    </div>
    
    <div class="content">
      <p>Hello,</p>
      <p>Your subscription has been added successfully. Below are the details:</p>
      
      <div class="section">
        <h2>Subscription Details</h2>
        <div class="info-row">
          <span class="info-label">Service Name:</span>
          <span class="info-value">${subscription.service_name}</span>
        </div>
        ${subscription.domain_name ? `
        <div class="info-row">
          <span class="info-label">Domain:</span>
          <span class="info-value">${subscription.domain_name}</span>
        </div>
        ` : ''}
        <div class="info-row">
          <span class="info-label">Purchase Date:</span>
          <span class="info-value">${purchaseDate}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Expiry Date:</span>
          <span class="info-value">${expiryDate}</span>
        </div>
        ${subscription.vendor ? `
        <div class="info-row">
          <span class="info-label">Vendor:</span>
          <span class="info-value">${subscription.vendor}</span>
        </div>
        ` : ''}
      </div>

      ${(subscription.email || subscription.username || subscription.password) ? `
      <div class="section">
        <h2>Account Credentials</h2>
        <div class="credentials-box">
          ${subscription.email ? `
          <div class="credentials-row">
            <span><strong>Email:</strong></span>
            <span>${subscription.email}</span>
          </div>
          ` : ''}
          ${subscription.username ? `
          <div class="credentials-row">
            <span><strong>Username:</strong></span>
            <span>${subscription.username}</span>
          </div>
          ` : ''}
          ${subscription.password ? `
          <div class="credentials-row">
            <span><strong>Password:</strong></span>
            <span>${subscription.password}</span>
          </div>
          ` : ''}
        </div>
      </div>
      ` : ''}

      <div class="invoice-box">
        <h3>Invoice Information</h3>
        <div class="info-row">
          <span class="info-label">Invoice Number:</span>
          <span class="info-value">${invoice.invoice_no}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Purchase Amount (PKR):</span>
          <span class="info-value">₨ ${subscription.purchase_amount_pkr.toLocaleString()}</span>
        </div>
        ${subscription.purchase_amount_usd > 0 ? `
        <div class="info-row">
          <span class="info-label">Purchase Amount (USD):</span>
          <span class="info-value">$${subscription.purchase_amount_usd.toLocaleString()}</span>
        </div>
        ` : ''}
        ${invoice.service_charges > 0 ? `
        <div class="info-row">
          <span class="info-label">Service Charges:</span>
          <span class="info-value">₨ ${invoice.service_charges.toLocaleString()}</span>
        </div>
        ` : ''}
        <div class="amount">
          Total Amount: ₨ ${invoice.total_amount.toLocaleString()}
        </div>
      </div>
    </div>
    
    <div class="footer">
      <p>Thank you for using Subscription Reminder!</p>
      <p>This is an automated email. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
  `;
};

const getExpiryReminderEmailTemplate = (
  userEmail: string,
  subscription: Subscription,
  daysUntilExpiry: number
): string => {
  const expiryDate = format(new Date(subscription.expiry_date), 'MMMM dd, yyyy');
  const today = format(new Date(), 'MMMM dd, yyyy');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Expiring Soon</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      padding: 30px;
      border-radius: 8px 8px 0 0;
      margin: -30px -30px 30px -30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .warning-icon {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .content {
      margin-bottom: 30px;
    }
    .alert-box {
      background-color: #fff3cd;
      border: 2px solid #ffc107;
      border-radius: 6px;
      padding: 20px;
      margin: 20px 0;
      text-align: center;
    }
    .alert-box h2 {
      margin: 0 0 10px 0;
      color: #856404;
      font-size: 20px;
    }
    .days-count {
      font-size: 36px;
      font-weight: 700;
      color: #f5576c;
      margin: 10px 0;
    }
    .section {
      margin-bottom: 25px;
      padding: 20px;
      background-color: #f9f9f9;
      border-radius: 6px;
      border-left: 4px solid #f5576c;
    }
    .section h2 {
      margin-top: 0;
      color: #f5576c;
      font-size: 18px;
      font-weight: 600;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #666;
    }
    .info-value {
      color: #333;
      text-align: right;
    }
    .credentials-box {
      background-color: #fff;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      padding: 15px;
      margin-top: 10px;
    }
    .credentials-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-family: 'Courier New', monospace;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      color: #999;
      font-size: 12px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #f5576c;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      margin-top: 10px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="warning-icon">⚠️</div>
      <h1>Subscription Expiring Soon!</h1>
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
        <div class="info-row">
          <span class="info-label">Service Name:</span>
          <span class="info-value">${subscription.service_name}</span>
        </div>
        ${subscription.domain_name ? `
        <div class="info-row">
          <span class="info-label">Domain:</span>
          <span class="info-value">${subscription.domain_name}</span>
        </div>
        ` : ''}
        <div class="info-row">
          <span class="info-label">Expiry Date:</span>
          <span class="info-value"><strong>${expiryDate}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Today's Date:</span>
          <span class="info-value">${today}</span>
        </div>
        ${subscription.vendor ? `
        <div class="info-row">
          <span class="info-label">Vendor:</span>
          <span class="info-value">${subscription.vendor}</span>
        </div>
        ` : ''}
      </div>

      ${(subscription.email || subscription.username || subscription.password) ? `
      <div class="section">
        <h2>Account Credentials</h2>
        <div class="credentials-box">
          ${subscription.email ? `
          <div class="credentials-row">
            <span><strong>Email:</strong></span>
            <span>${subscription.email}</span>
          </div>
          ` : ''}
          ${subscription.username ? `
          <div class="credentials-row">
            <span><strong>Username:</strong></span>
            <span>${subscription.username}</span>
          </div>
          ` : ''}
          ${subscription.password ? `
          <div class="credentials-row">
            <span><strong>Password:</strong></span>
            <span>${subscription.password}</span>
          </div>
          ` : ''}
        </div>
      </div>
      ` : ''}

      <div style="text-align: center; margin-top: 30px;">
        <p><strong>Don't forget to renew your subscription before it expires!</strong></p>
      </div>
    </div>
    
    <div class="footer">
      <p>Thank you for using Subscription Reminder!</p>
      <p>This is an automated email. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
  `;
};

// Send email using Supabase Edge Function (uses Supabase SMTP)
export const sendEmailViaEdgeFunction = async (
  to: string,
  subject: string,
  html: string
): Promise<boolean> => {
  try {
    console.log('[EMAIL] Calling Edge Function send-email...');
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to,
        subject,
        html,
      },
    });

    if (error) {
      console.error('[EMAIL] Error sending email via Edge Function:', error);
      // Don't throw - fallback to database function
      return false;
    }

    console.log('[EMAIL] Edge Function response:', data);

    // Check if response indicates success
    if (data && data.success !== false) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('[EMAIL] Error calling email Edge Function:', error);
    // Don't throw - fallback to database function
    return false;
  }
};

// Fallback: Send email using Supabase database function (uses Supabase SMTP)
export const sendEmailViaDatabaseFunction = async (
  to: string,
  subject: string,
  html: string
): Promise<boolean> => {
  try {
    console.log('[EMAIL] Calling database function send_email_via_smtp...');
    const { data, error } = await supabase.rpc('send_email_via_smtp', {
      p_to: [to],
      p_subject: subject,
      p_html: html,
      p_text: subject, // Plain text fallback
    });

    if (error) {
      console.error('[EMAIL] Error sending email via database function:', error);
      return false;
    }

    console.log('[EMAIL] Database function response:', data);
    return true;
  } catch (error) {
    console.error('[EMAIL] Error calling email database function:', error);
    return false;
  }
};

// Send email using Resend API (fallback - requires API key)
export const sendEmailViaResend = async (
  to: string,
  subject: string,
  html: string
): Promise<boolean> => {
  if (!RESEND_API_KEY) {
    console.error('[EMAIL] Resend API key not configured');
    return false;
  }

  try {
    console.log('[EMAIL] Calling Resend API...');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('[EMAIL] Resend API error:', {
        status: response.status,
        statusText: response.statusText,
        error: responseData
      });
      return false;
    }

    console.log('[EMAIL] Resend API response:', responseData);
    return true;
  } catch (error) {
    console.error('[EMAIL] Error sending email via Resend:', error);
    return false;
  }
};

// Main email sending function (tries Resend first, then Edge Function, then database function)
export const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<boolean> => {
  console.log('[EMAIL] Starting email send to:', to);
  console.log('[EMAIL] Resend API Key configured:', !!RESEND_API_KEY);
  console.log('[EMAIL] FROM_EMAIL:', FROM_EMAIL);
  
  // Try Resend API first (most reliable and works immediately)
  if (RESEND_API_KEY) {
    console.log('[EMAIL] Attempting to send via Resend API...');
    const resendResult = await sendEmailViaResend(to, subject, html);
    if (resendResult) {
      console.log('[EMAIL] ✅ Successfully sent via Resend API');
      return true;
    }
    console.log('[EMAIL] ❌ Resend API failed, trying Edge Function...');
  } else {
    console.log('[EMAIL] ⚠️ Resend API key not configured, trying Edge Function...');
  }

  // Try Edge Function second (if deployed)
  console.log('[EMAIL] Attempting to send via Edge Function...');
  const edgeFunctionResult = await sendEmailViaEdgeFunction(to, subject, html);
  if (edgeFunctionResult) {
    console.log('[EMAIL] ✅ Successfully sent via Edge Function');
    return true;
  }
  console.log('[EMAIL] ❌ Edge Function failed, trying database function...');

  // Try database function third (queues email)
  console.log('[EMAIL] Attempting to queue email in database...');
  const dbFunctionResult = await sendEmailViaDatabaseFunction(to, subject, html);
  if (dbFunctionResult) {
    console.log('[EMAIL] ⚠️ Email queued in database. Configure Resend API or SMTP for actual sending.');
    return true; // Return true even if just queued
  }

  // If all fail, just log and return false (don't break the app)
  console.warn('[EMAIL] ❌ All email sending methods failed. Email not sent, but subscription was created successfully.');
  return false;
};

// Send subscription purchase email
export const sendSubscriptionPurchaseEmail = async (
  userEmail: string,
  subscription: Subscription,
  invoice: Invoice
): Promise<boolean> => {
  try {
    const html = getPurchaseEmailTemplate(userEmail, subscription, invoice);
    const subject = `Subscription Added: ${subscription.service_name}`;
    
    return await sendEmail(userEmail, subject, html);
  } catch (error) {
    console.error('Error sending subscription purchase email:', error);
    return false;
  }
};

// Send subscription expiry reminder email
export const sendSubscriptionExpiryReminderEmail = async (
  userEmail: string,
  subscription: Subscription,
  daysUntilExpiry: number
): Promise<boolean> => {
  try {
    const html = getExpiryReminderEmailTemplate(userEmail, subscription, daysUntilExpiry);
    const subject = `⚠️ Subscription Expiring Soon: ${subscription.service_name} (${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'day' : 'days'} left)`;
    
    return await sendEmail(userEmail, subject, html);
  } catch (error) {
    console.error('Error sending subscription expiry reminder email:', error);
    return false;
  }
};

// Check and send expiry reminder emails for all subscriptions
export const checkAndSendExpiryReminders = async (): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all active subscriptions with their reminders
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        reminders (*),
        user:profiles!subscriptions_user_id_fkey (email)
      `)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching subscriptions for expiry reminders:', error);
      return;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No active subscriptions found');
      return;
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

    // Track sent reminders to avoid duplicates
    const sentReminders = new Set<string>();

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
          console.log(`No email found for user ${subscription.user_id}`);
          continue;
        }

        // Create unique key to avoid duplicate emails
        const reminderKey = `${subscription.id}-${daysUntilExpiry}`;
        if (sentReminders.has(reminderKey)) {
          continue;
        }

        // Check if we've already sent this reminder today (optional - you might want to add a table to track this)
        const emailSent = await sendSubscriptionExpiryReminderEmail(
          userEmail,
          subscription as Subscription,
          daysUntilExpiry
        );

        if (emailSent) {
          sentReminders.add(reminderKey);
          console.log(`Sent expiry reminder email for ${subscription.service_name} (${daysUntilExpiry} days)`);
        }
      }
    }
  } catch (error) {
    console.error('Error checking and sending expiry reminders:', error);
  }
};

