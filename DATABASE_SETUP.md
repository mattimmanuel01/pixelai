# Database Setup Guide

This guide explains how to set up the Supabase database schema for PixelAI.

## Prerequisites
- Supabase project created
- Environment variables configured in `.env.local`
- Supabase CLI installed (optional but recommended)

## Option 1: Using Supabase Dashboard (Recommended)

### Step 1: Access SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to "SQL Editor" in the left sidebar
3. Click "New Query"

### Step 2: Run Initial Schema
Copy and paste the contents of `supabase/migrations/001_initial_schema.sql` and execute it.

This will create:
- `users` table with subscription tracking
- `user_images` table for project history  
- Row Level Security (RLS) policies
- Automatic user profile creation trigger
- Helper functions for quota management

### Step 3: Run Pro Features Migration
Copy and paste the contents of `supabase/migrations/002_update_pro_quotas.sql` and execute it.

This adds functions for:
- Upgrading users to Pro
- Downgrading users to Free
- Monthly quota resets

### Step 4: Create Storage Bucket
1. Navigate to "Storage" in the left sidebar
2. Click "Create bucket" 
3. Name it `temp-images`
4. Set it to **Public** (for image URLs to work)
5. Configure the following policies:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'temp-images' AND auth.role() = 'authenticated');

-- Allow public access to view images  
CREATE POLICY "Public can view temp images" ON storage.objects
  FOR SELECT USING (bucket_id = 'temp-images');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own uploads" ON storage.objects
  FOR DELETE USING (bucket_id = 'temp-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## Option 2: Using Supabase CLI

### Step 1: Initialize Supabase
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF
```

### Step 2: Run Migrations
```bash
# Apply migrations
supabase db push

# Or run individual migrations
supabase db reset
```

## Verification

After running the migrations, verify the setup:

### Check Tables
1. Go to "Table Editor" in Supabase dashboard
2. You should see:
   - `users` table
   - `user_images` table

### Check Functions
1. Go to "Database" → "Functions"
2. You should see:
   - `handle_new_user()`
   - `increment_user_quota()`
   - `upgrade_user_to_pro()`
   - `downgrade_user_to_free()`
   - `reset_monthly_quotas()`

### Check Storage
1. Go to "Storage"
2. You should see `temp-images` bucket

### Test User Creation
1. Sign up a test user through your app
2. Check the `users` table - a profile should be automatically created
3. The new user should have:
   - `subscription_tier: 'free'`
   - `upscale_quota: 0`
   - `expand_quota: 0`

## Troubleshooting

### Common Issues

**Error: "relation 'public.users' does not exist"**
- Make sure you ran the initial schema migration
- Check that the migration executed without errors

**Error: "RLS policy violation"**
- Ensure RLS policies are created correctly
- Check that `auth.uid()` is properly referenced in policies

**Images not loading**
- Verify `temp-images` bucket is set to **Public**
- Check storage policies allow public read access

**User profile not created automatically**
- Ensure the trigger `on_auth_user_created` exists
- Check the `handle_new_user()` function is defined

### Manual User Profile Creation
If automatic profile creation isn't working, you can manually create profiles:

```sql
INSERT INTO public.users (id, email, subscription_tier, upscale_quota, expand_quota)
VALUES (
  'USER_UUID_FROM_AUTH_USERS',
  'user@example.com',
  'free',
  0,
  0
);
```

## Monthly Maintenance

For Pro subscribers, you'll want to reset quotas monthly. You can:

1. **Manual Reset**: Run this SQL monthly:
```sql
SELECT public.reset_monthly_quotas();
```

2. **Automated Reset**: Set up a cron job or use Supabase Edge Functions to run this automatically.

## Next Steps

After database setup:
1. Test user registration/login
2. Verify quota tracking works
3. Test image upload to storage
4. Set up Stripe for Pro subscriptions (optional)
5. Configure email templates in Supabase Auth