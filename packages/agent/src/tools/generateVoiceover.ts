import { z } from "zod";
import { tool } from "@openai/agents";
import OpenAI from "openai";
import { writeFile } from "fs/promises";
import { join } from "path";
import fs from 'fs-extra';

const openai = new OpenAI();

export const generateVoiceover = tool({
  name: "generate_voiceover",
  description: "Create narration script and synthesize voice-over audio from text.",
  parameters: z.object({
    text: z.string().describe("The text to be converted into a voiceover."),
  }),
  execute: async ({ text }) => {
    console.log(JSON.stringify({ event: "tool_start", tool: "generate_voiceover", detail: "Synthesizing audio..." }));
    
    try {
      const response = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: text,
      });
      
      // Use /tmp in production, uploads in development
      const baseDir = process.env.NODE_ENV === "production" ? "/tmp" : join(process.cwd(), 'uploads');
      const audioDir = join(baseDir, 'audio');
      await fs.ensureDir(audioDir);
      const filePath = join(audioDir, `voiceover-${Date.now()}.mp3`);
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      
      console.log(JSON.stringify({ event: "tool_end", tool: "generate_voiceover", detail: `Audio saved to ${filePath}` }));
      
      return { filePath };
    } catch (error: any) {
      console.error(JSON.stringify({ event: "error", tool: "generate_voiceover", detail: error.message }));
      throw new Error(`Voiceover generation failed: ${error.message}`);
    }
  },
}); 