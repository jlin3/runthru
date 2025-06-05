-- FRESH START: Simple Supabase Setup for RunThru
-- Run this after clearing everything

-- Step 1: Create the recordings table (simple, no RLS yet)
CREATE TABLE recordings (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  target_url TEXT NOT NULL,
  test_steps JSONB NOT NULL DEFAULT '[]',
  browser_config JSONB NOT NULL DEFAULT '{}',
  narration_config JSONB NOT NULL DEFAULT '{}',
  video_config JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  current_step TEXT,
  video_path TEXT,
  duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Step 2: Create simple indexes
CREATE INDEX idx_recordings_status ON recordings(status);
CREATE INDEX idx_recordings_created_at ON recordings(created_at DESC);

-- Step 3: Create storage buckets (simple public buckets)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Step 4: Add a test recording to verify it works
INSERT INTO recordings (title, target_url, test_steps, browser_config, narration_config, video_config)
VALUES (
  'Test Recording',
  'https://example.com',
  '["Navigate to homepage", "Click login"]',
  '{"browser": "chromium", "viewport": "1920x1080"}',
  '{"provider": "openai", "voice": "alloy"}',
  '{"format": "mp4", "avatarPosition": "bottom-right"}'
);

-- That's it! Simple and working. 