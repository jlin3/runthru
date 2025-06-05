import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// We use Supabase's built-in auth.users table instead of a custom users table
// Define the auth user type for TypeScript
export type AuthUser = {
  id: string;
  email?: string;
  created_at: string;
  updated_at: string;
};

export const recordings = pgTable("recordings", {
  id: serial("id").primaryKey(),
  userId: text("user_id"), // Optional - References auth.users(id)
  title: text("title").notNull(),
  description: text("description"),
  targetUrl: text("target_url").notNull(),
  testSteps: jsonb("test_steps").$type<string[]>().notNull(),
  browserConfig: jsonb("browser_config").$type<{
    browser: string;
    viewport: string;
    headless: boolean;
    recordingQuality: string;
  }>().notNull(),
  narrationConfig: jsonb("narration_config").$type<{
    provider: string;
    voice: string;
    style: string;
    speed: number;
    autoGenerate: boolean;
  }>().notNull(),
  videoConfig: jsonb("video_config").$type<{
    format: string;
    avatarPosition: string;
    avatarStyle: string;
    avatarSize: number;
    showAvatar: boolean;
  }>().notNull(),
  status: text("status").notNull().default("pending"), // pending, recording, processing, completed, failed
  progress: integer("progress").notNull().default(0),
  currentStep: text("current_step"),
  videoPath: text("video_path"),
  duration: integer("duration"), // in seconds
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertRecordingSchema = createInsertSchema(recordings).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertRecording = z.infer<typeof insertRecordingSchema>;
export type Recording = typeof recordings.$inferSelect;

// For user authentication, we use Supabase's built-in auth system
// The AuthUser type is defined above for TypeScript typing
