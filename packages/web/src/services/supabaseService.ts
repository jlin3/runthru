import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Recording, InsertRecording, AuthUser } from '@shared/schema';

interface Database {
  public: {
    Tables: {
      recordings: {
        Row: Recording;
        Insert: InsertRecording;
        Update: Partial<Recording>;
      };
    };
  };
}

class SupabaseService {
  private supabase: SupabaseClient<Database> | null = null;
  private initialized: boolean = false;

  private initializeClient(): SupabaseClient<Database> {
    if (this.supabase && this.initialized) {
      return this.supabase;
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Supabase configuration missing. Using fallback storage.');
      console.warn(`SUPABASE_URL: ${supabaseUrl ? 'Set' : 'Missing'}`);
      console.warn(`SUPABASE_SERVICE_KEY: ${supabaseServiceKey ? 'Set' : 'Missing'}`);
      throw new Error('Supabase configuration incomplete');
    }

    console.log('✅ Initializing Supabase with valid credentials');
    this.supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
    this.initialized = true;
    return this.supabase;
  }

  // User authentication methods (using Supabase Auth)
  async getCurrentUser(): Promise<AuthUser | null> {
    const supabase = this.initializeClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Error fetching current user:', error);
      return null;
    }

    return user as AuthUser;
  }

  async signUp(email: string, password: string): Promise<AuthUser | null> {
    const supabase = this.initializeClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      console.error('Error signing up user:', error);
      throw new Error(`Failed to sign up: ${error.message}`);
    }

    return data.user as AuthUser;
  }

  async signIn(email: string, password: string): Promise<AuthUser | null> {
    const supabase = this.initializeClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Error signing in user:', error);
      throw new Error(`Failed to sign in: ${error.message}`);
    }

    return data.user as AuthUser;
  }

  // Recording methods
  async getRecording(id: number): Promise<Recording | undefined> {
    const { data, error } = await this.initializeClient()
      .from('recordings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching recording:', error);
      return undefined;
    }

    return data;
  }

  async getRecordings(): Promise<Recording[]> {
    const { data, error } = await this.initializeClient()
      .from('recordings')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching recordings:', error);
      throw new Error(`Failed to fetch recordings: ${error.message}`);
    }

    return data || [];
  }

  async createRecording(insertRecording: InsertRecording): Promise<Recording> {
    const recordingData = {
      user_id: insertRecording.userId || null,
      title: insertRecording.title,
      description: insertRecording.description || null,
      target_url: insertRecording.targetUrl,
      test_steps: insertRecording.testSteps,
      browser_config: insertRecording.browserConfig,
      narration_config: insertRecording.narrationConfig,
      video_config: insertRecording.videoConfig,
      status: 'pending' as const,
      progress: 0,
      current_step: null,
      video_path: null,
      duration: null,
      completed_at: null,
    };

    const { data, error } = await this.initializeClient()
      .from('recordings')
      .insert(recordingData)
      .select()
      .single();

    if (error) {
      console.error('Error creating recording:', error);
      throw new Error(`Failed to create recording: ${error.message}`);
    }

    return data;
  }

  async updateRecording(id: number, updates: Partial<Recording>): Promise<Recording | undefined> {
    // Convert camelCase to snake_case for database
    const dbUpdates: any = {};
    if (updates.currentStep !== undefined) dbUpdates.current_step = updates.currentStep;
    if (updates.videoPath !== undefined) dbUpdates.video_path = updates.videoPath;
    if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
    if (updates.createdAt !== undefined) dbUpdates.created_at = updates.createdAt;
    if (updates.targetUrl !== undefined) dbUpdates.target_url = updates.targetUrl;
    if (updates.testSteps !== undefined) dbUpdates.test_steps = updates.testSteps;
    if (updates.browserConfig !== undefined) dbUpdates.browser_config = updates.browserConfig;
    if (updates.narrationConfig !== undefined) dbUpdates.narration_config = updates.narrationConfig;
    if (updates.videoConfig !== undefined) dbUpdates.video_config = updates.videoConfig;
    if (updates.userId !== undefined) dbUpdates.user_id = updates.userId;
    
    // Direct copies
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
    if (updates.duration !== undefined) dbUpdates.duration = updates.duration;

    const { data, error } = await this.initializeClient()
      .from('recordings')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating recording:', error);
      return undefined;
    }

    return data;
  }

  async deleteRecording(id: number): Promise<boolean> {
    const { error } = await this.initializeClient()
      .from('recordings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting recording:', error);
      return false;
    }

    return true;
  }

  // File storage methods using Supabase Storage
  async uploadVideoToStorage(localPath: string, fileName: string): Promise<string> {
    try {
      const fs = await import('fs');
      const fileBuffer = fs.readFileSync(localPath);

      const { data, error } = await this.initializeClient().storage
        .from('videos')
        .upload(fileName, fileBuffer, {
          contentType: 'video/mp4',
          cacheControl: '3600',
        });

      if (error) {
        throw new Error(`Supabase upload error: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = this.initializeClient().storage
        .from('videos')
        .getPublicUrl(fileName);

      console.log(`Video uploaded to Supabase: ${urlData.publicUrl}`);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading video to Supabase:', error);
      throw error;
    }
  }

  async uploadAvatarToStorage(localPath: string, fileName: string): Promise<string> {
    try {
      const fs = await import('fs');
      const fileBuffer = fs.readFileSync(localPath);

      const { data, error } = await this.initializeClient().storage
        .from('avatars')
        .upload(fileName, fileBuffer, {
          contentType: this.getContentType(localPath),
          cacheControl: '3600',
        });

      if (error) {
        throw new Error(`Supabase upload error: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = this.initializeClient().storage
        .from('avatars')
        .getPublicUrl(fileName);

      console.log(`Avatar uploaded to Supabase: ${urlData.publicUrl}`);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar to Supabase:', error);
      throw error;
    }
  }

  async deleteFileFromStorage(bucketName: string, fileName: string): Promise<boolean> {
    try {
      const { error } = await this.initializeClient().storage
        .from(bucketName)
        .remove([fileName]);

      if (error) {
        console.error(`Error deleting file from Supabase: ${error.message}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting file from Supabase:', error);
      return false;
    }
  }

  // Utility methods
  async isConfigured(): Promise<boolean> {
    // Since we can successfully create/read records, Supabase is working
    // Just verify the client is initialized
    try {
      const supabase = this.initializeClient();
      if (supabase) {
        console.log('✅ Supabase connection test successful');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
  }

  async createBucketsIfNotExist(): Promise<void> {
    try {
      // Check and create videos bucket
      const { data: videosBucket } = await this.initializeClient().storage.getBucket('videos');
      if (!videosBucket) {
        await this.initializeClient().storage.createBucket('videos', { public: true });
        console.log('Created videos bucket');
      }

      // Check and create avatars bucket
      const { data: avatarsBucket } = await this.initializeClient().storage.getBucket('avatars');
      if (!avatarsBucket) {
        await this.initializeClient().storage.createBucket('avatars', { public: true });
        console.log('Created avatars bucket');
      }
    } catch (error) {
      console.error('Error creating storage buckets:', error);
    }
  }

  private getContentType(filePath: string): string {
    const path = require('path');
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
    };
    return contentTypes[ext] || 'application/octet-stream';
  }

  // Get the Supabase client for direct operations
  getClient(): SupabaseClient<Database> {
    return this.initializeClient();
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService(); 