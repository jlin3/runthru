import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Recording, InsertRecording, User, InsertUser } from '@shared/schema';

interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: InsertUser;
        Update: Partial<User>;
      };
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

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const supabase = this.initializeClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return undefined;
    }

    return data;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const supabase = this.initializeClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      console.error('Error fetching user by username:', error);
      return undefined;
    }

    return data;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const supabase = this.initializeClient();
    const { data, error } = await supabase
      .from('users')
      .insert(insertUser)
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return data;
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
      ...insertRecording,
      status: 'pending' as const,
      progress: 0,
      currentStep: null,
      videoPath: null,
      duration: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
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
    const { data, error } = await this.initializeClient()
      .from('recordings')
      .update(updates)
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
    try {
      const { data, error } = await this.initializeClient()
        .from('recordings')
        .select('count')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('Supabase not properly configured:', error);
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