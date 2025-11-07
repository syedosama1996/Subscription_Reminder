// Test email sending function
// Call this from your app to test email configuration

import { sendEmail } from './lib/email';

export const testEmail = async (testEmailAddress: string) => {
  console.log('🧪 Testing email configuration...');
  
  const testHTML = `
    <html>
      <body>
        <h1>Test Email</h1>
        <p>This is a test email from Subscription Reminder.</p>
        <p>If you received this, your email configuration is working! ✅</p>
      </body>
    </html>
  `;
  
  const result = await sendEmail(
    testEmailAddress,
    'Test Email - Subscription Reminder',
    testHTML
  );
  
  if (result) {
    console.log('✅ Test email sent successfully!');
    return true;
  } else {
    console.log('❌ Test email failed. Check console logs for details.');
    return false;
  }
};

// Usage:
// import { testEmail } from './lib/test-email';
// await testEmail('your-email@example.com');

