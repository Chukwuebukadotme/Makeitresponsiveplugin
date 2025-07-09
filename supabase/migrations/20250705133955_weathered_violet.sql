/*
  # User Profiles Table for Google Authentication

  - Stores user profile info after Google OAuth signup.
  - Linked to Supabase's auth.users table (id = user's UUID).
  - Populates fields from Google profile data.
*/

-- 1. Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  provider text DEFAULT 'google', -- Always 'google' for Google OAuth
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_sign_in_at timestamptz DEFAULT now(),
  plugin_usage_count integer DEFAULT 0,
  subscription_status text DEFAULT 'free' CHECK (subscription_status IN ('free', 'trial', 'premium', 'expired')),
  subscription_expires_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- 2. Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Policies
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role can manage all profiles"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Function: Create or update profile on new Google user signup
CREATE OR REPLACE FUNCTION handle_new_google_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_profiles (
    id,
    email,
    full_name,
    avatar_url,
    provider,
    created_at,
    updated_at,
    last_sign_in_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    'google', -- Always set provider to 'google'
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    last_sign_in_at = NOW(),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger: Run function after new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_google_user();

-- 6. (Optional) Other helper functions (unchanged)
-- update_user_profile, increment_usage_count, check_subscription_status

-- Create function to update user profile
CREATE OR REPLACE FUNCTION update_user_profile(
  user_id uuid,
  profile_data jsonb
)
RETURNS user_profiles AS $$
DECLARE
  updated_profile user_profiles;
BEGIN
  UPDATE user_profiles
  SET
    full_name = COALESCE(profile_data->>'full_name', full_name),
    avatar_url = COALESCE(profile_data->>'avatar_url', avatar_url),
    metadata = COALESCE(profile_data->'metadata', metadata),
    updated_at = NOW()
  WHERE id = user_id
  RETURNING * INTO updated_profile;
  
  RETURN updated_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment usage count
CREATE OR REPLACE FUNCTION increment_usage_count(user_id uuid)
RETURNS integer AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE user_profiles
  SET 
    plugin_usage_count = plugin_usage_count + 1,
    updated_at = NOW()
  WHERE id = user_id
  RETURNING plugin_usage_count INTO new_count;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check subscription status
CREATE OR REPLACE FUNCTION check_subscription_status(user_id uuid)
RETURNS text AS $$
DECLARE
  current_status text;
  expires_at timestamptz;
BEGIN
  SELECT subscription_status, subscription_expires_at
  INTO current_status, expires_at
  FROM user_profiles
  WHERE id = user_id;
  
  -- Check if subscription has expired
  IF current_status = 'premium' AND expires_at IS NOT NULL AND expires_at < NOW() THEN
    UPDATE user_profiles
    SET 
      subscription_status = 'expired',
      updated_at = NOW()
    WHERE id = user_id;
    
    RETURN 'expired';
  END IF;
  
  RETURN current_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;