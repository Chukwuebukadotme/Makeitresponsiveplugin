# Make It Responsive - Figma Plugin with Google Authentication

A Figma plugin that helps designers create responsive layouts with Google authentication and user management via Supabase.

## Features

- 🔐 Google OAuth authentication
- 👤 User profile management
- 📊 Usage tracking
- 💎 Subscription management
- 🎨 Responsive design tools
- 📱 Cross-device layout optimization

## Setup Instructions

### 1. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and anon key
3. Go to Authentication > Providers and enable Google OAuth:
   - Add your Google OAuth client ID and secret
   - Set the redirect URL to: `https://your-project.supabase.co/auth/v1/callback`

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Go to Credentials > Create Credentials > OAuth 2.0 Client ID
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - `https://your-project.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (for development)

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### 4. Database Migration

Run the migration to create the user profiles table:

```bash
# If using Supabase CLI
supabase db push

# Or copy the SQL from supabase/migrations/create_user_profiles.sql
# and run it in your Supabase SQL editor
```

### 5. Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### 6. Figma Plugin Setup

1. Open Figma
2. Go to Plugins > Development > Import plugin from manifest
3. Select the `manifest.json` file from this project
4. The plugin will appear in your plugins list

## Project Structure

```
src/
├── components/
│   ├── AuthProvider.tsx      # Authentication context
│   ├── AuthButton.tsx        # Sign in/out button
│   ├── AuthCallback.tsx      # OAuth callback handler
│   ├── ProtectedFeature.tsx  # Feature access control
│   └── AuthenticatedApp.tsx  # Main app component
├── hooks/
│   └── useUserProfile.ts     # User profile management
├── lib/
│   └── supabase.ts          # Supabase client setup
├── styles/
│   └── auth.css             # Authentication styles
├── utils/
│   └── figmaAuth.ts         # Figma-specific auth utilities
└── main.tsx                 # App entry point
```

## Authentication Flow

1. User clicks "Continue with Google"
2. Redirected to Google OAuth consent screen
3. After approval, redirected back to Supabase
4. Supabase creates/updates user record
5. Database trigger creates user profile
6. User is signed in and can use the plugin

## User Management

- **User Profiles**: Stored in `user_profiles` table
- **Usage Tracking**: Automatic increment on feature use
- **Subscription Management**: Support for free/trial/premium tiers
- **Session Persistence**: Sessions stored in Figma's client storage

## Security Features

- Row Level Security (RLS) enabled
- User can only access their own data
- Service role for admin operations
- Secure token handling

## Subscription Tiers

- **Free**: Limited usage
- **Trial**: Extended trial period
- **Premium**: Full access to all features
- **Expired**: Subscription ended

## API Functions

- `handle_new_user()`: Auto-create profile on signup
- `increment_usage_count()`: Track feature usage
- `check_subscription_status()`: Validate subscription
- `update_user_profile()`: Update profile data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details