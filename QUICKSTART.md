# 🚀 Quick Setup Guide

## Step 1: Configure Supabase Environment Variables

The application requires Supabase configuration to work properly.

### Get Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create a new one)
3. Go to **Settings** → **API**
4. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Anon (public) key** (starts with `eyJ...`)

### Update Environment Variables

Open the `.env.local` file in your project root and replace the placeholder values:

```env
# Replace these with your actual Supabase values
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: For admin operations (get from Settings → API → service_role)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Restart Development Server

After updating the environment variables:

```bash
# Stop the server (Ctrl+C if running)
# Then restart:
npm run dev
```

## Step 2: Set Up Database (Required)

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create tracks table
create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  youtube_url text not null,
  audio_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create user_roles table for role-based access
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'cafe')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id)
);

-- Enable RLS (Row Level Security)
alter table public.tracks enable row level security;
alter table public.user_roles enable row level security;

-- Create policies for tracks table
create policy "Anyone can view tracks" on public.tracks
  for select using (true);

create policy "Admins can insert tracks" on public.tracks
  for insert with check (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete tracks" on public.tracks
  for delete using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Create policies for user_roles table
create policy "Users can view their own role" on public.user_roles
  for select using (auth.uid() = user_id);

create policy "Admins can manage all roles" on public.user_roles
  for all using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );
```

## Step 3: Set Up Storage (Required)

1. In Supabase Dashboard, go to **Storage**
2. Create a new bucket called `tracks`
3. Make it **Public** 
4. Run this policy SQL:

```sql
-- Create storage policy
create policy "Anyone can view audio files" on storage.objects
  for select using (bucket_id = 'tracks');

create policy "Admins can upload audio files" on storage.objects
  for insert with check (
    bucket_id = 'tracks' and
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete audio files" on storage.objects
  for delete using (
    bucket_id = 'tracks' and
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );
```

## Step 4: Create Test Users (Optional)

1. Go to **Authentication** → **Users** in Supabase
2. Create users with these emails:
   - `admin@cafe.com` (password: `admin123`)
   - `staff@cafe.com` (password: `staff123`)

3. Add roles for these users:

```sql
-- Replace 'user-id-here' with actual user IDs from the auth.users table
INSERT INTO user_roles (user_id, role) VALUES 
('admin-user-id-here', 'admin'),
('staff-user-id-here', 'cafe');
```

## ✅ You're Ready!

Visit [http://localhost:3000](http://localhost:3000) and you should see the login page without errors.

### Troubleshooting

- **Still seeing errors?** Check the browser console and terminal for specific error messages
- **Environment variables not loading?** Make sure the file is named exactly `.env.local` (not `.env.local.txt`)
- **Database errors?** Verify all SQL commands ran successfully in Supabase SQL Editor