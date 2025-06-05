import { IStorage, MemStorage } from '../storage';
import { Recording, InsertRecording, User, InsertUser } from '@shared/schema';
import fs from 'fs';
import path from 'path';

class UnifiedStorageService implements IStorage {
  private primaryStorage: IStorage;
  private fallbackStorage: MemStorage;
  private useSupabase: boolean = false;

  constructor() {
    this.fallbackStorage = new MemStorage();
    this.primaryStorage = this.fallbackStorage; // Initialize with fallback
    
    // Try to initialize Supabase
    this.initializeStorage();
  }

  private async initializeStorage() {
    try {
      console.log('🔄 Attempting to initialize Supabase...');
      
      // Check if Supabase environment variables are present
      const hasSupabaseEnv = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY;
      
      if (!hasSupabaseEnv) {
        console.log('⚠️ Supabase environment variables not found, using in-memory storage');
        this.primaryStorage = this.fallbackStorage;
        this.useSupabase = false;
        return;
      }

      // Dynamically import Supabase service after environment variables are loaded
      const { supabaseService } = await import('./supabaseService');

      // Check if Supabase is configured and working
      if (await supabaseService.isConfigured()) {
        this.primaryStorage = supabaseService as any;
        this.useSupabase = true;
        console.log('✅ Using Supabase for database operations');
        
        // Create storage buckets if they don't exist
        await supabaseService.createBucketsIfNotExist();
      } else {
        throw new Error('Supabase connection test failed');
      }
    } catch (error) {
      console.log('⚠️ Supabase initialization failed:', error instanceof Error ? error.message : 'Unknown error');
      console.log('📝 Falling back to in-memory storage');
      this.primaryStorage = this.fallbackStorage;
      this.useSupabase = false;
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.primaryStorage.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.primaryStorage.getUserByUsername(username);
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.primaryStorage.createUser(user);
  }

  // Recording methods
  async getRecording(id: number): Promise<Recording | undefined> {
    return this.primaryStorage.getRecording(id);
  }

  async getRecordings(): Promise<Recording[]> {
    return this.primaryStorage.getRecordings();
  }

  async createRecording(recording: InsertRecording): Promise<Recording> {
    return this.primaryStorage.createRecording(recording);
  }

  async updateRecording(id: number, updates: Partial<Recording>): Promise<Recording | undefined> {
    return this.primaryStorage.updateRecording(id, updates);
  }

  async deleteRecording(id: number): Promise<boolean> {
    const recording = await this.getRecording(id);
    if (recording?.videoPath) {
      // Delete from storage
      await this.deleteVideoFromCloud(recording.videoPath);
    }
    return this.primaryStorage.deleteRecording(id);
  }

  // File storage methods with intelligent routing
  async uploadVideoToCloud(localPath: string, recordingId: number): Promise<string> {
    try {
      const fileName = `recording_${recordingId}_${Date.now()}.mp4`;
      
      // Priority: Supabase > GCP > Local
      if (this.useSupabase) {
        try {
          const { supabaseService } = await import('./supabaseService');
          const supabaseUrl = await supabaseService.uploadVideoToStorage(localPath, fileName);
          // Clean up local file after successful upload
          if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
          }
          return supabaseUrl;
        } catch (error) {
          console.error('Supabase upload failed, trying GCP:', error);
        }
      }

      // Fallback to GCP
      if (process.env.VIDEO_STORAGE_TYPE === 'gcp') {
        try {
          const { gcpStorageService } = await import('./gcpStorageService');
          if (await gcpStorageService.isConfigured()) {
            const gcpUrl = await gcpStorageService.uploadVideo(localPath, fileName);
            // Clean up local file after successful upload
            if (fs.existsSync(localPath)) {
              fs.unlinkSync(localPath);
            }
            return gcpUrl;
          }
        } catch (error) {
          console.error('GCP upload failed, using local storage:', error);
        }
      }

      // Final fallback to local storage
      console.log('Using local storage for video files');
      return localPath;
    } catch (error) {
      console.error('Error uploading video:', error);
      return localPath;
    }
  }

  async uploadAvatarToCloud(localPath: string): Promise<string> {
    try {
      const fileName = `avatar_${Date.now()}${path.extname(localPath)}`;
      
      // Priority: Supabase > GCP > Local
      if (this.useSupabase) {
        try {
          const { supabaseService } = await import('./supabaseService');
          const supabaseUrl = await supabaseService.uploadAvatarToStorage(localPath, fileName);
          // Clean up local file after successful upload
          if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
          }
          return supabaseUrl;
        } catch (error) {
          console.error('Supabase avatar upload failed, trying GCP:', error);
        }
      }

      // Fallback to GCP
      if (process.env.VIDEO_STORAGE_TYPE === 'gcp') {
        try {
          const { gcpStorageService } = await import('./gcpStorageService');
          if (await gcpStorageService.isConfigured()) {
            const gcpUrl = await gcpStorageService.uploadAvatar(localPath, fileName);
            // Clean up local file after successful upload
            if (fs.existsSync(localPath)) {
              fs.unlinkSync(localPath);
            }
            return gcpUrl;
          }
        } catch (error) {
          console.error('GCP avatar upload failed, using local storage:', error);
        }
      }

      // Final fallback to local storage
      console.log('Using local storage for avatar files');
      return localPath;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return localPath;
    }
  }

  async deleteVideoFromCloud(videoUrl: string): Promise<boolean> {
    try {
      // Determine storage type by URL pattern
      if (videoUrl.includes('supabase')) {
        // Extract filename from Supabase URL and delete from videos bucket
        const urlParts = videoUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const { supabaseService } = await import('./supabaseService');
        return await supabaseService.deleteFileFromStorage('videos', fileName);
      } else if (videoUrl.startsWith('https://storage.googleapis.com/')) {
        // GCP Storage
        const urlParts = videoUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const { gcpStorageService } = await import('./gcpStorageService');
        return await gcpStorageService.deleteFile(fileName);
      } else {
        // Local file
        if (fs.existsSync(videoUrl)) {
          fs.unlinkSync(videoUrl);
          return true;
        }
      }
      return true;
    } catch (error) {
      console.error('Error deleting video from cloud:', error);
      return false;
    }
  }

  // Utility methods
  isUsingSupabase(): boolean {
    return this.useSupabase;
  }

  async getStorageInfo(): Promise<{
    database: 'supabase' | 'memory';
    fileStorage: 'supabase' | 'gcp' | 'local';
  }> {
    let fileStorage: 'supabase' | 'gcp' | 'local' = 'local';
    
    if (this.useSupabase) {
      fileStorage = 'supabase';
    } else if (process.env.VIDEO_STORAGE_TYPE === 'gcp') {
      try {
        const { gcpStorageService } = await import('./gcpStorageService');
        if (await gcpStorageService.isConfigured()) {
          fileStorage = 'gcp';
        }
      } catch (error) {
        // GCP not available, keep local
      }
    }

    return {
      database: this.useSupabase ? 'supabase' : 'memory',
      fileStorage
    };
  }

  // Force reinitialization (useful for testing or config changes)
  async reinitialize(): Promise<void> {
    await this.initializeStorage();
  }
}

// Export singleton instance
export const unifiedStorage = new UnifiedStorageService(); 