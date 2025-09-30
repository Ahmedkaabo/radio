# 🎵 Radio Cafe

A Next.js 15 cafe music management system with role-based access, YouTube audio extraction, and offline playback capabilities.

## 🌟 Features

### Admin Dashboard
- **YouTube Integration**: Add songs by pasting YouTube URLs
- **Automatic Audio Extraction**: Uses yt-dlp to extract MP3 audio from YouTube videos
- **Playlist Management**: View, add, and delete tracks from the cafe playlist
- **Supabase Storage**: All audio files stored securely in Supabase Storage

### Cafe Player
- **Music Player**: Play/pause, volume control, skip tracks
- **Track Selection**: Browse and select from available tracks
- **Offline Playback**: Audio files cached locally for offline use
- **Real-time Updates**: Playlist updates automatically when admins add new tracks

### Technical Features
- **Role-Based Authentication**: Admin and Cafe user roles with Supabase Auth
- **Offline Caching**: Service Worker + IndexedDB for offline music playback
- **Responsive Design**: Shadcn UI components with TailwindCSS
- **State Management**: Zustand for global state management
- **Modern Stack**: Next.js 15, TypeScript, Supabase Edge Functions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- yt-dlp installed on your system (for Edge Function)

### Installation

1. **Clone and Install Dependencies**
   ```bash
   git clone <your-repo>
   cd radio-cafe
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Update `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **Database Setup**
   - Run the SQL from `supabase/schema.sql` in your Supabase SQL Editor
   - Create a storage bucket named `tracks` with public access

4. **Edge Function Setup** (Optional - for YouTube processing)
   ```bash
   # Install Supabase CLI
   npm i supabase --save-dev
   
   # Login to Supabase
   npx supabase login
   
   # Link to your project
   npx supabase link --project-ref your-project-ref
   
   # Deploy the Edge Function
   npx supabase functions deploy download-audio
   ```

5. **Development Server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### User Roles Setup

Create users with roles in your Supabase Auth dashboard, then add role records:

```sql
-- Insert admin role
INSERT INTO user_roles (user_id, role) 
VALUES ('admin-user-id', 'admin');

-- Insert cafe role  
INSERT INTO user_roles (user_id, role) 
VALUES ('cafe-user-id', 'cafe');
```

### Demo Accounts
The login page shows demo account credentials:
- **Admin**: admin@cafe.com / admin123
- **Cafe**: staff@cafe.com / staff123

## 📱 Usage

### For Administrators
1. Login with admin credentials
2. Navigate to Admin Dashboard
3. Add YouTube URLs to extract audio and add to playlist
4. Manage existing tracks (view/delete)

### For Cafe Staff
1. Login with cafe credentials
2. Use the Cafe Player interface
3. Select tracks from the playlist
4. Control playback (play/pause, volume, skip)
5. Offline mode automatically enabled for cached tracks

## 🏗️ Tech Stack

- **Frontend**: Next.js 15, TypeScript, TailwindCSS
- **UI Components**: Shadcn UI
- **Authentication**: Supabase Auth with RLS
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **State Management**: Zustand
- **Audio Processing**: yt-dlp (Edge Function)
- **Offline Storage**: Service Worker + IndexedDB
- **Audio Playbook**: HTML5 Audio API

## 📁 Project Structure

```
├── src/
│   ├── app/
│   │   ├── admin/playlist/       # Admin dashboard
│   │   ├── auth/login/           # Authentication
│   │   ├── cafe/player/          # Cafe player
│   │   └── api/download-audio/   # API route
│   ├── components/ui/            # Shadcn components
│   └── lib/                     # Utilities
│       ├── supabase.ts          # Supabase client
│       ├── auth.ts              # Auth helpers
│       ├── store.ts             # Zustand store
│       └── cache.ts             # IndexedDB cache
├── supabase/
│   ├── functions/download-audio/ # Edge Function
│   └── schema.sql               # Database schema
└── public/sw.js                 # Service Worker
```

## 🔒 Security

- **Row Level Security (RLS)** enabled on all tables
- **Role-based access control** for admin/cafe operations
- **Secure file storage** with Supabase Storage policies
- **Environment variables** for sensitive configuration

## 🌐 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Connect to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically

### Self-hosted
1. Build the application: `npm run build`
2. Start production server: `npm start`
3. Ensure environment variables are configured

## 📝 Development Notes

### Without yt-dlp Edge Function
- The app includes a mock API response for development
- Admin can still add tracks, but audio processing is simulated
- Replace the mock in `src/app/api/download-audio/route.ts`

### Offline Functionality
- Audio files are automatically cached when loaded
- Service Worker handles offline requests
- IndexedDB stores cached audio blobs for offline playbook

### Customization
- Modify UI components in `src/components/ui/`
- Update styling with TailwindCSS classes
- Extend Zustand store for additional state management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section below
2. Review Supabase documentation
3. Open an issue on GitHub

### Troubleshooting

**Authentication Issues**
- Verify Supabase URL and keys in `.env.local`
- Check user roles in `user_roles` table

**Audio Playbook Issues** 
- Ensure audio files are accessible via Supabase Storage
- Check browser console for CORS errors
- Verify storage bucket is public

**Offline Mode Issues**
- Check if Service Worker is registered (dev tools > Application)
- Verify IndexedDB has cached audio files
- Test offline mode by disconnecting internet