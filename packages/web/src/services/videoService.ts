import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export class VideoService {
  async composeVideo(
    videoPath: string,
    audioPath: string,
    videoConfig: {
      format: string;
      avatarPosition: string;
      avatarStyle: string;
      avatarSize: number;
      showAvatar: boolean;
    }
  ): Promise<string> {
    try {
      const outputDir = path.join(process.cwd(), "uploads", "final_videos");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputPath = path.join(outputDir, `final_${Date.now()}.mp4`);
      
      // Create avatar overlay if enabled
      let ffmpegArgs: string[] = [];
      
      // Check if we have audio
      const hasAudio = audioPath && audioPath.length > 0 && fs.existsSync(audioPath);
      
      if (videoConfig.showAvatar) {
        const avatarPath = await this.createAvatar(videoConfig.avatarStyle, videoConfig.avatarSize);
        const position = this.getAvatarPosition(videoConfig.avatarPosition, videoConfig.avatarSize);
        
        if (hasAudio) {
          ffmpegArgs = [
            '-i', videoPath,
            '-i', audioPath,
            '-i', avatarPath,
            '-filter_complex',
            `[0:v][2:v] overlay=${position}[v]`,
            '-map', '[v]',
            '-map', '1:a',
            '-c:v', 'libx264',
            '-c:a', 'aac',
            '-shortest',
            outputPath
          ];
        } else {
          // Video with avatar but no audio
          ffmpegArgs = [
            '-i', videoPath,
            '-i', avatarPath,
            '-filter_complex',
            `[0:v][1:v] overlay=${position}[v]`,
            '-map', '[v]',
            '-c:v', 'libx264',
            outputPath
          ];
        }
      } else {
        if (hasAudio) {
          ffmpegArgs = [
            '-i', videoPath,
            '-i', audioPath,
            '-c:v', 'libx264',
            '-c:a', 'aac',
            '-shortest',
            outputPath
          ];
        } else {
          // Just copy the video without audio
          ffmpegArgs = [
            '-i', videoPath,
            '-c:v', 'libx264',
            outputPath
          ];
        }
      }

      await this.runFFmpeg(ffmpegArgs);
      return outputPath;
    } catch (error) {
      console.error("Error composing video:", error);
      throw new Error("Failed to compose video");
    }
  }

  async getVideoDuration(videoPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-show_entries', 'format=duration',
        '-of', 'csv=p=0',
        videoPath
      ]);

      let output = '';
      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          const duration = parseFloat(output.trim());
          resolve(Math.floor(duration));
        } else {
          reject(new Error('Failed to get video duration'));
        }
      });

      ffprobe.on('error', reject);
    });
  }

  private async createAvatar(style: string, size: number): Promise<string> {
    const avatarsDir = path.join(process.cwd(), "uploads", "avatars");
    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
    }

    const avatarPath = path.join(avatarsDir, `avatar_${style}_${size}.png`);
    
    // Check if avatar already exists
    if (fs.existsSync(avatarPath)) {
      return avatarPath;
    }

    // Create a simple circular avatar using FFmpeg
    const color = this.getAvatarColor(style);
    const text = this.getAvatarText(style);
    
    const ffmpegArgs = [
      '-f', 'lavfi',
      '-i', `color=${color}:size=${size}x${size}:duration=1`,
      '-vf', `drawtext=text='${text}':fontcolor=white:fontsize=${Math.floor(size * 0.4)}:x=(w-text_w)/2:y=(h-text_h)/2:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf,geq=lum='if(lt(sqrt((X-${size/2})^2+(Y-${size/2})^2),${size/2}),lum(X,Y),0)':cb='if(lt(sqrt((X-${size/2})^2+(Y-${size/2})^2),${size/2}),cb(X,Y),128)':cr='if(lt(sqrt((X-${size/2})^2+(Y-${size/2})^2),${size/2}),cr(X,Y),128)'`,
      '-frames:v', '1',
      avatarPath
    ];

    await this.runFFmpeg(ffmpegArgs);
    return avatarPath;
  }

  private getAvatarColor(style: string): string {
    const colors: Record<string, string> = {
      "AI Assistant": "#2563EB",
      "QA Tester": "#059669",
      "Robot": "#7C3AED",
      "Custom": "#6B7280"
    };
    return colors[style] || colors["AI Assistant"];
  }

  private getAvatarText(style: string): string {
    const texts: Record<string, string> = {
      "AI Assistant": "AI",
      "QA Tester": "QA",
      "Robot": "🤖",
      "Custom": "U"
    };
    return texts[style] || texts["AI Assistant"];
  }

  private getAvatarPosition(position: string, size: number): string {
    const padding = 20;
    
    switch (position) {
      case "Bottom Left":
        return `${padding}:H-h-${padding}`;
      case "Top Right":
        return `W-w-${padding}:${padding}`;
      case "Top Left":
        return `${padding}:${padding}`;
      case "Bottom Right":
      default:
        return `W-w-${padding}:H-h-${padding}`;
    }
  }

  private runFFmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', ['-y', ...args]);
      
      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg spawn error: ${error.message}`));
      });
    });
  }

  async convertVideo(videoPath: string): Promise<string> {
    const outputDir = path.dirname(videoPath);
    const outputName = `recording.mp4`;
    const outputPath = path.join(outputDir, outputName);

    const ffmpegArgs = [
        '-i', videoPath,
        '-c:v', 'libx264',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        outputPath
    ];

    await this.runFFmpeg(ffmpegArgs);
    return outputPath;
  }

  async muxVideoAndAudio(videoPath: string, audioPath: string, sessionId: string): Promise<string> {
    const outputDir = path.join(process.cwd(), "uploads", "final_videos");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputName = `final_${sessionId}_${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, outputName);

    const ffmpegArgs = [
        '-i', videoPath,
        '-i', audioPath,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-shortest',
        outputPath
    ];

    await this.runFFmpeg(ffmpegArgs);
    return outputPath;
  }
}

export const videoService = new VideoService();
