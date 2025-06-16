-- Create users table to extend Supabase auth.users
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
  upscale_quota INTEGER DEFAULT 0,
  expand_quota INTEGER DEFAULT 0,
  upscale_used INTEGER DEFAULT 0,
  expand_used INTEGER DEFAULT 0
);

-- Create user_images table to store project history
CREATE TABLE public.user_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  processed_url TEXT,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('background_removal', 'upscale', 'expand')),
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_images ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for user_images table
CREATE POLICY "Users can view own images" ON public.user_images
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own images" ON public.user_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own images" ON public.user_images
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own images" ON public.user_images
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX user_images_user_id_idx ON public.user_images(user_id);
CREATE INDEX user_images_created_at_idx ON public.user_images(created_at DESC);
CREATE INDEX user_images_operation_type_idx ON public.user_images(operation_type);

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, subscription_tier, upscale_quota, expand_quota)
  VALUES (
    NEW.id,
    NEW.email,
    'free',
    0,
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run the function when a new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update user quota
CREATE OR REPLACE FUNCTION public.increment_user_quota(user_id UUID, quota_type TEXT)
RETURNS VOID AS $$
BEGIN
  IF quota_type = 'upscale' THEN
    UPDATE public.users 
    SET upscale_used = upscale_used + 1 
    WHERE id = user_id;
  ELSIF quota_type = 'expand' THEN
    UPDATE public.users 
    SET expand_used = expand_used + 1 
    WHERE id = user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.user_images TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_user_quota TO authenticated;