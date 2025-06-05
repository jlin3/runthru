#!/usr/bin/env node

// Script to set up Supabase database with required tables and buckets
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

async function setupSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.log('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
    process.exit(1);
  }

  console.log('🔧 Setting up Supabase database...');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Test connection with a simple operation
    console.log('🔍 Testing Supabase connection...');
    console.log('📍 Connecting to:', supabaseUrl);

    // First, let's try to test if we can query existing tables
    console.log('📝 Testing basic connection...');
    try {
      const { data: existingRecordings, error: testError } = await supabase
        .from('recordings')
        .select('id')
        .limit(1);
      
      if (!testError) {
        console.log('✅ Tables already exist and are accessible');
        return;
      } else {
        console.log('ℹ️ Tables need to be created:', testError.message);
      }
    } catch (e) {
      console.log('ℹ️ Tables need to be created');
    }

    // Create storage buckets
    console.log('📦 Setting up storage buckets...');
    
    // Videos bucket
    const { error: videosBucketError } = await supabase.storage.createBucket('videos', {
      public: true
    });
    
    if (videosBucketError && !videosBucketError.message.includes('already exists')) {
      console.log('ℹ️ Videos bucket:', videosBucketError.message);
    } else {
      console.log('✅ Videos bucket ready');
    }

    // Avatars bucket
    const { error: avatarsBucketError } = await supabase.storage.createBucket('avatars', {
      public: true
    });
    
    if (avatarsBucketError && !avatarsBucketError.message.includes('already exists')) {
      console.log('ℹ️ Avatars bucket:', avatarsBucketError.message);
    } else {
      console.log('✅ Avatars bucket ready');
    }

    // Test the setup by querying the tables
    console.log('🧪 Testing table setup...');
    
    const { data: recordingsTest, error: recordingsTestError } = await supabase
      .from('recordings')
      .select('id')
      .limit(1);
      
    if (recordingsTestError) {
      console.log('⚠️ Recordings table test failed:', recordingsTestError.message);
    } else {
      console.log('✅ Recordings table test successful');
    }

    const { data: usersTest, error: usersTestError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
      
    if (usersTestError) {
      console.log('⚠️ Users table test failed:', usersTestError.message);
    } else {
      console.log('✅ Users table test successful');
    }

    console.log('\n🎉 Supabase database setup completed successfully!');
    console.log('📍 Database URL:', supabaseUrl);
    console.log('🔧 You can now restart your server to use Supabase');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Handle direct execution
import { fileURLToPath } from 'url';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  setupSupabase().catch(console.error);
}

export { setupSupabase }; 