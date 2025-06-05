import { Storage, Bucket } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

interface GCPStorageConfig {
  projectId: string;
  bucketName: string;
  keyFilename?: string;
  clientEmail?: string;
  privateKey?: string;
}

class GCPStorageService {
  private storage: Storage;
  private bucketName: string;
  private bucket: Bucket;

  constructor() {
    const config: GCPStorageConfig = {
      projectId: process.env.GCP_PROJECT_ID || '',
      bucketName: process.env.GCP_BUCKET_NAME || 'runthru-storage',
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      clientEmail: process.env.GCP_CLIENT_EMAIL,
      privateKey: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    this.bucketName = config.bucketName;

    // Initialize Google Cloud Storage client
    const storageOptions: any = {
      projectId: config.projectId,
    };

    // Use service account key file if provided
    if (config.keyFilename && fs.existsSync(config.keyFilename)) {
      storageOptions.keyFilename = config.keyFilename;
    } 
    // Use environment variables for authentication
    else if (config.clientEmail && config.privateKey) {
      storageOptions.credentials = {
        client_email: config.clientEmail,
        private_key: config.privateKey,
      };
    }

    this.storage = new Storage(storageOptions);
    this.bucket = this.storage.bucket(this.bucketName);
  }

  /**
   * Upload a video file to Google Cloud Storage
   */
  async uploadVideo(localFilePath: string, fileName?: string): Promise<string> {
    try {
      if (!fs.existsSync(localFilePath)) {
        throw new Error(`File not found: ${localFilePath}`);
      }

      const uploadFileName = fileName || `videos/${Date.now()}_${path.basename(localFilePath)}`;
      const file = this.bucket.file(uploadFileName);

      await this.bucket.upload(localFilePath, {
        destination: uploadFileName,
        metadata: {
          contentType: 'video/mp4',
        },
      });

      // Make the file publicly readable (optional)
      await file.makePublic();

      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${uploadFileName}`;
      
      console.log(`Video uploaded successfully: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading video to GCP:', error);
      throw new Error(`Failed to upload video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload an avatar image to Google Cloud Storage
   */
  async uploadAvatar(localFilePath: string, fileName?: string): Promise<string> {
    try {
      if (!fs.existsSync(localFilePath)) {
        throw new Error(`File not found: ${localFilePath}`);
      }

      const uploadFileName = fileName || `avatars/${Date.now()}_${path.basename(localFilePath)}`;
      const file = this.bucket.file(uploadFileName);

      await this.bucket.upload(localFilePath, {
        destination: uploadFileName,
        metadata: {
          contentType: this.getContentType(localFilePath),
        },
      });

      // Make the file publicly readable
      await file.makePublic();

      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${uploadFileName}`;
      
      console.log(`Avatar uploaded successfully: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading avatar to GCP:', error);
      throw new Error(`Failed to upload avatar: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a file from Google Cloud Storage
   */
  async deleteFile(fileName: string): Promise<boolean> {
    try {
      const file = this.bucket.file(fileName);
      await file.delete();
      console.log(`File deleted successfully: ${fileName}`);
      return true;
    } catch (error) {
      console.error('Error deleting file from GCP:', error);
      return false;
    }
  }

  /**
   * Get a signed URL for private file access
   */
  async getSignedUrl(fileName: string, expirationTime: number = 3600): Promise<string> {
    try {
      const file = this.bucket.file(fileName);
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expirationTime * 1000, // Convert to milliseconds
      });
      return signedUrl;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List files in a specific folder
   */
  async listFiles(prefix?: string): Promise<string[]> {
    try {
      const [files] = await this.bucket.getFiles({ prefix });
      return files.map(file => file.name);
    } catch (error) {
      console.error('Error listing files from GCP:', error);
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if GCP storage is properly configured
   */
  async isConfigured(): Promise<boolean> {
    try {
      await this.bucket.exists();
      return true;
    } catch (error) {
      console.error('GCP Storage not properly configured:', error);
      return false;
    }
  }

  /**
   * Create bucket if it doesn't exist
   */
  async createBucketIfNotExists(): Promise<void> {
    try {
      const [exists] = await this.bucket.exists();
      if (!exists) {
        await this.storage.createBucket(this.bucketName, {
          location: 'US',
          storageClass: 'STANDARD',
        });
        console.log(`Bucket ${this.bucketName} created successfully`);
      }
    } catch (error) {
      console.error('Error creating bucket:', error);
      throw new Error(`Failed to create bucket: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(filePath: string): string {
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

  /**
   * Get the bucket name
   */
  getBucketName(): string {
    return this.bucketName;
  }
}

// Export singleton instance
export const gcpStorageService = new GCPStorageService(); 