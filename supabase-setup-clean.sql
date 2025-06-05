-- RunThru Database Schema Setup for Supabase
-- This script creates the required tables and storage buckets
-- NOTE: We don't create a custom users table - Supabase provides auth.users

-- Create recordings table (linked to auth.users via user_id)
CREATE TABLE IF NOT EXISTS recordings (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_url TEXT NOT NULL,
  test_steps JSONB NOT NULL,
  browser_config JSONB NOT NULL,
  narration_config JSONB NOT NULL,
  video_config JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  current_step TEXT,
  video_path TEXT,
  duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(status);
CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON recordings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON recordings(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- Create storage buckets for videos and avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for the buckets
CREATE POLICY "Allow all operations on videos bucket" ON storage.objects FOR ALL
USING (bucket_id = 'videos');

CREATE POLICY "Allow all operations on avatars bucket" ON storage.objects FOR ALL
USING (bucket_id = 'avatars');

-- Create policies for recordings table (users can only see their own recordings)
CREATE POLICY "Users can view own recordings" ON recordings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recordings" ON recordings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recordings" ON recordings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recordings" ON recordings FOR DELETE
USING (auth.uid() = user_id); 