-- RunThru Database Schema Setup for Supabase
-- This script creates the required tables and storage buckets

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

-- Create recordings table
CREATE TABLE IF NOT EXISTS recordings (
  id SERIAL PRIMARY KEY,
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
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Enable Row Level Security (RLS) for security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- Create storage buckets for videos and avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for the buckets (allow all operations for now - customize as needed)
CREATE POLICY "Allow all operations on videos bucket" ON storage.objects FOR ALL
USING (bucket_id = 'videos');

CREATE POLICY "Allow all operations on avatars bucket" ON storage.objects FOR ALL
USING (bucket_id = 'avatars');

-- Create policies for tables (allow all operations for now - customize as needed)
CREATE POLICY "Allow all operations on users" ON users FOR ALL
USING (true);

CREATE POLICY "Allow all operations on recordings" ON recordings FOR ALL
USING (true);

-- Insert a test user (optional)
INSERT INTO users (username, password) 
VALUES ('test_user', '$2b$10$example_hashed_password')
ON CONFLICT (username) DO NOTHING; 