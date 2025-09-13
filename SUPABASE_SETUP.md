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

### New Migration: Profiles Table

A new migration has been added to create the `profiles` table with the following structure:

```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  phone text,
  location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**To apply this migration:**

1. **Option 1: Using Supabase CLI (Recommended)**
   ```bash
   # Install Supabase CLI if you haven't already
   npm install -g supabase
   
   # Login to your Supabase account
   supabase login
   
   # Link your project (replace with your project ref)
   supabase link --project-ref your-project-ref
   
   # Apply the migration
   supabase db push
   ```

2. **Option 2: Using Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy and paste the SQL from `supabase/migrations/20250308000002_create_profiles_table.sql`
   - Execute the SQL

3. **Option 3: Manual SQL Execution**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the following SQL:
   ```sql
   -- Create profiles table
   CREATE TABLE IF NOT EXISTS profiles (
     id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
     username text NOT NULL,
     phone text,
     location text,
     created_at timestamptz DEFAULT now(),
     updated_at timestamptz DEFAULT now()
   );
   
   -- Enable RLS
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   
   -- Create policies
   CREATE POLICY "Users can manage their own profile"
     ON profiles FOR ALL TO authenticated
     USING (auth.uid() = id)
     WITH CHECK (auth.uid() = id);
   ```

**Note:** The app will now work with the Edit Profile functionality, but you must run this migration first to create the required database table. 