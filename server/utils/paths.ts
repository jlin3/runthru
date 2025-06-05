import fs from "fs";
import path from "path";

/**
 * Get a writable directory path for the given subdirectory
 * In production (App Engine), use /tmp which is writable
 * In development, use the project uploads directory
 */
export function getWritableDir(subDir: string): string {
  const isProduction = process.env.NODE_ENV === "production";
  
  if (isProduction) {
    // Use /tmp in production (App Engine)
    return path.join("/tmp", subDir);
  } else {
    // Use uploads directory in development
    return path.join(process.cwd(), "uploads", subDir);
  }
}

/**
 * Ensure a directory exists, creating it if necessary
 * Safe for both development and production environments
 */
export function ensureDir(dirPath: string): void {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (error) {
    console.warn(`Could not create directory ${dirPath}:`, error);
    // In production, this might fail but we continue anyway
  }
}

/**
 * Get a writable path for specific file types
 */
export const writablePaths = {
  videos: () => getWritableDir("videos"),
  audio: () => getWritableDir("audio"), 
  avatars: () => getWritableDir("avatars"),
  finalVideos: () => getWritableDir("final_videos"),
  temp: () => getWritableDir("temp")
}; 