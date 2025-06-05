import { z } from "zod";
import { tool } from "@openai/agents";
import OpenAI from "openai";
import { writeFile } from "fs/promises";
import { join } from "path";

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
      const speech = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: text,
      });
      
      const buffer = Buffer.from(await speech.arrayBuffer());
      const audioPath = join("uploads", "audio", `voiceover-${Date.now()}.mp3`);
      await writeFile(audioPath, buffer);
      
      console.log(JSON.stringify({ event: "tool_end", tool: "generate_voiceover", detail: `Audio saved to ${audioPath}` }));
      
      return `Successfully generated voiceover. Audio available at: ${audioPath}`;
    } catch (error: any) {
      console.error(JSON.stringify({ event: "error", tool: "generate_voiceover", detail: error.message }));
      throw new Error(`Voiceover generation failed: ${error.message}`);
    }
  },
}); 