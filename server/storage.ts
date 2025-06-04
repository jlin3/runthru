import { recordings, users, type Recording, type InsertRecording, type User, type InsertUser } from "@shared/schema";

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
      ...insertRecording,
      id,
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
    return this.recordings.delete(id);
  }
}

export const storage = new MemStorage();
