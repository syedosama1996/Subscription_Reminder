# Supabase Configuration Setup

## Issue
The app is crashing on startup because Supabase credentials are not configured.

## Solution

### Option 1: Create a .env file (Recommended)

1. Create a `.env` file in your project root directory
2. Add your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Option 2: Set environment variables in app.config.js

Update your `app.config.js` file and replace the placeholder values:

```javascript
extra: {
  supabaseUrl: "https://your-project.supabase.co",
  supabaseAnonKey: "your-anon-key-here",
  eas: {
    projectId: "a6b04bbf-baa0-4b2e-9abd-1beb06b3609e"
  }
},
```

## How to get your Supabase credentials:

1. Go to [supabase.com](https://supabase.com)
2. Create a new project or select an existing one
3. Go to Settings > API
4. Copy the "Project URL" (this is your `EXPO_PUBLIC_SUPABASE_URL`)
5. Copy the "anon public" key (this is your `EXPO_PUBLIC_SUPABASE_ANON_KEY`)

## After configuration:

1. Restart your development server: `npx expo start --clear`
2. The app should now start without crashing
3. You'll be able to use authentication and database features

## Current Status

The app has been modified to handle missing Supabase configuration gracefully:
- In development mode, it will show helpful error messages
- The app won't crash, but authentication features won't work until configured
- You'll see console warnings about missing configuration

## Database Schema

Make sure your Supabase database has the required tables. Check the `supabase/migrations/` folder for the database schema files. 