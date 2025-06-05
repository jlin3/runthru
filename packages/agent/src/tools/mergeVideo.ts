import { z } from "zod";
import { tool } from "@openai/agents";
import { exec } from "child_process";
import ffmpeg from "ffmpeg-static";
import { join } from "path";

function parsePaths(input: string): { videoPath: string; audioPath: string } {
  const videoMatch = input.match(/videoPath: (\S+)/);
  const audioMatch = input.match(/audioPath: (\S+)/);
  return {
    videoPath: videoMatch ? videoMatch[1] : "",
    audioPath: audioMatch ? audioMatch[1] : "",
  };
}

export const mergeVideo = tool({
  name: "merge_video",
  description: "Merge a video file and an audio file into a final demo video. Expects a string with 'videoPath: [path]' and 'audioPath: [path]'.",
  parameters: z.object({
    paths: z.string().describe("A string containing the video and audio file paths, e.g., 'videoPath: /path/to/video.mp4, audioPath: /path/to/audio.mp3'"),
  }),
  execute: async ({ paths }) => {
    const { videoPath, audioPath } = parsePaths(paths);
    if (!videoPath || !audioPath) {
      throw new Error("Invalid input: videoPath or audioPath missing.");
    }
    
    const outputPath = join("uploads", "final_videos", `final-${Date.now()}.mp4`);
    const command = `${ffmpeg} -i ${videoPath} -i ${audioPath} -c:v copy -c:a aac -shortest ${outputPath}`;

    console.log(JSON.stringify({ event: "tool_start", tool: "merge_video", detail: "Merging video and audio..." }));
    
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(JSON.stringify({ event: "error", tool: "merge_video", detail: `ffmpeg error: ${stderr}` }));
          reject(new Error(`Video merge failed: ${stderr}`));
          return;
        }
        console.log(JSON.stringify({ event: "tool_end", tool: "merge_video", detail: `Final video saved to ${outputPath}` }));
        resolve(`Successfully merged video and audio. Final video available at: ${outputPath}`);
      });
    });
  },
}); 