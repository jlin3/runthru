import { tool } from '@openai/agents';
import fs from 'fs-extra';
import path from 'path';
import { z } from 'zod';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

export const mergeVideo = tool({
  description: 'Merges a video file and an audio file into a single MP4.',
  parameters: z.object({
    videoPath: z.string().describe('The path to the video file (e.g., screen recording).'),
    audioPath: z.string().describe('The path to the audio file (e.g., voiceover).'),
  }),
  execute: async ({ videoPath, audioPath }) => {
    return new Promise((resolve, reject) => {
      const outputDir = path.join(process.cwd(), 'uploads', 'demos');
      fs.ensureDirSync(outputDir);
      const outputPath = path.join(outputDir, `demo-${Date.now()}.mp4`);

      if (!ffmpegPath) {
        reject(new Error('ffmpeg-static not found'));
        return;
      }

      // Clean the paths - remove any "sandbox:" protocol prefix
      const cleanVideoPath = videoPath.replace(/^sandbox:/, '');
      const cleanAudioPath = audioPath.replace(/^sandbox:/, '');

      const ffmpegArgs = [
        '-i', cleanVideoPath,
        '-i', cleanAudioPath,
        '-c:v', 'libx264', // Convert VP8 to H.264 for MP4 compatibility
        '-c:a', 'aac',
        '-y', // overwrite output file
        outputPath
      ];

      const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs);
      let stderr = '';

      ffmpegProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ finalPath: outputPath });
        } else {
          const detail = `ffmpeg error: ${stderr}`;
          console.error(detail);
          process.stdout.write(JSON.stringify({ event: 'error', tool: 'merge_video', detail }) + '\n');
          reject(new Error(detail));
        }
      });

      ffmpegProcess.on('error', (err) => {
        const detail = `ffmpeg spawn error: ${err.message}`;
        console.error(detail);
        process.stdout.write(JSON.stringify({ event: 'error', tool: 'merge_video', detail }) + '\n');
        reject(new Error(detail));
      });
    });
  },
}); 