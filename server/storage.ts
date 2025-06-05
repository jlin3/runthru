import { recordings, users, type Recording, type InsertRecording, type User, type InsertUser } from "@shared/schema";
import { gcpStorageService } from "./services/gcpStorageService";
import fs from "fs";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Recording methods
  getRecording(id: number): Promise<Recording | undefined>;
  getRecordings(): Promise<Recording[]>;
  createRecording(recording: InsertRecording): Promise<Recording>;
  updateRecording(id: number, updates: Partial<Recording>): Promise<Recording | undefined>;
  deleteRecording(id: number): Promise<boolean>;
  
  // File storage methods
  uploadVideoToCloud(localPath: string, recordingId: number): Promise<string>;
  uploadAvatarToCloud(localPath: string): Promise<string>;
  deleteVideoFromCloud(videoUrl: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private recordings: Map<number, Recording>;
  private currentUserId: number;
  private currentRecordingId: number;

  constructor() {
    this.users = new Map();
    this.recordings = new Map();
    this.currentUserId = 1;
    this.currentRecordingId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getRecording(id: number): Promise<Recording | undefined> {
    return this.recordings.get(id);
  }

  async getRecordings(): Promise<Recording[]> {
    return Array.from(this.recordings.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createRecording(insertRecording: InsertRecording): Promise<Recording> {
    const id = this.currentRecordingId++;
    const recording: Recording = {
      id,
      title: insertRecording.title,
      description: insertRecording.description ?? null,
      targetUrl: insertRecording.targetUrl,
      testSteps: insertRecording.testSteps as string[],
      browserConfig: insertRecording.browserConfig,
      narrationConfig: insertRecording.narrationConfig,
      videoConfig: insertRecording.videoConfig,
      status: "pending",
      progress: 0,
      currentStep: null,
      videoPath: null,
      duration: null,
      createdAt: new Date(),
      completedAt: null,
    };
    this.recordings.set(id, recording);
    return recording;
  }

  async updateRecording(id: number, updates: Partial<Recording>): Promise<Recording | undefined> {
    const recording = this.recordings.get(id);
    if (!recording) return undefined;

    const updatedRecording = { ...recording, ...updates };
    this.recordings.set(id, updatedRecording);
    return updatedRecording;
  }

  async deleteRecording(id: number): Promise<boolean> {
    const recording = this.recordings.get(id);
    if (recording?.videoPath) {
      // Delete from cloud storage if it's a cloud URL
      if (recording.videoPath.startsWith('https://storage.googleapis.com/')) {
        await this.deleteVideoFromCloud(recording.videoPath);
      }
      // Delete local file if it exists
      else if (fs.existsSync(recording.videoPath)) {
        fs.unlinkSync(recording.videoPath);
      }
    }
    return this.recordings.delete(id);
  }

  async uploadVideoToCloud(localPath: string, recordingId: number): Promise<string> {
    try {
      const useGCP = process.env.VIDEO_STORAGE_TYPE === 'gcp';
      
      if (useGCP && await gcpStorageService.isConfigured()) {
        const fileName = `recording_${recordingId}_${Date.now()}.mp4`;
        const cloudUrl = await gcpStorageService.uploadVideo(localPath, fileName);
        
        // Clean up local file after successful upload
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
        
        return cloudUrl;
      } else {
        // Return local path if GCP is not configured
        console.log('Using local storage for video files');
        return localPath;
      }
    } catch (error) {
      console.error('Error uploading video to cloud:', error);
      // Fallback to local storage
      return localPath;
    }
  }

  async uploadAvatarToCloud(localPath: string): Promise<string> {
    try {
      const useGCP = process.env.VIDEO_STORAGE_TYPE === 'gcp';
      
      if (useGCP && await gcpStorageService.isConfigured()) {
        const cloudUrl = await gcpStorageService.uploadAvatar(localPath);
        
        // Clean up local file after successful upload
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
        
        return cloudUrl;
      } else {
        // Return local path if GCP is not configured
        console.log('Using local storage for avatar files');
        return localPath;
      }
    } catch (error) {
      console.error('Error uploading avatar to cloud:', error);
      // Fallback to local storage
      return localPath;
    }
  }

  async deleteVideoFromCloud(videoUrl: string): Promise<boolean> {
    try {
      if (videoUrl.startsWith('https://storage.googleapis.com/')) {
        // Extract filename from GCP URL
        const urlParts = videoUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        return await gcpStorageService.deleteFile(fileName);
      }
      return true;
    } catch (error) {
      console.error('Error deleting video from cloud:', error);
      return false;
    }
  }
}

export const storage = new MemStorage();
