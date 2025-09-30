# Supabase Integration Setup

## Overview
Your Radio Cafe app now supports both localStorage (for testing) and Supabase (for production) data storage. The app will automatically detect if Supabase is configured and use it, otherwise it falls back to localStorage.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or sign in to your account
3. Click "New Project"
4. Choose your organization
5. Fill in your project details:
   - **Name**: radio-cafe (or any name you prefer)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the closest to your users
6. Click "Create new project"
7. Wait for the project to be ready (usually 1-2 minutes)

## Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. You'll see two important values:
   - **Project URL**: Looks like `https://xyzcompany.supabase.co`
   - **Project API Keys** → **anon public**: Long string starting with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`

## Step 3: Configure Environment Variables

1. In your project root, copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your Supabase credentials:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

## Step 4: Set Up the Database

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the contents of `supabase/schema.sql`
4. Click "Run" to execute the SQL
5. This will create:
   - `tracks` table for storing music
   - `admin_users` table for authentication
   - Sample admin user with passcode "1234"
   - Sample cafe user with passcode "5678"

## Step 5: Test Your Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000)
3. Try logging in with:
   - **Admin**: passcode `1234`
   - **Cafe**: passcode `5678`

4. If Supabase is configured correctly, you'll see a console message: "✅ Supabase connection established"
5. If not configured, you'll see: "📦 Using localStorage fallback mode"

## Step 6: Deploy to Vercel

1. Push your code to GitHub
2. In Vercel dashboard, go to your project settings
3. Go to **Environment Variables**
4. Add both environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Redeploy your application

## Troubleshooting

### Connection Issues
- Double-check your environment variables are correct
- Make sure you copied the full anon key (it's very long)
- Verify your project URL doesn't have trailing slashes

### Database Issues
- Ensure you ran the schema.sql file completely
- Check the Supabase logs in your dashboard
- Verify Row Level Security policies are applied

### Authentication Issues
- Default passcodes are "1234" (admin) and "5678" (cafe)
- You can modify these in the database or add new users

## Features

### Hybrid Storage System
- **Supabase Mode**: Real-time data, user authentication, production ready
- **LocalStorage Mode**: Offline testing, development without backend setup
- **Auto-Detection**: App automatically chooses the best available option

### Admin Dashboard (Passcode: 1234)
- Add music tracks from YouTube URLs
- Edit track information
- Delete tracks
- View all tracks in a table

### Cafe Player (Passcode: 5678)
- View all available tracks
- Music player interface (UI only - audio playback requires additional setup)
- Beautiful track display with thumbnails

## Next Steps

### Audio Playback Integration
To add actual audio playback, you'll need to:
1. Set up YouTube API or use a service like YouTube Data API
2. Use audio streaming libraries
3. Handle audio controls and progress tracking

### Enhanced Features
- User management system
- Playlist creation
- Real-time updates across multiple clients
- Audio file uploads
- Advanced player controls