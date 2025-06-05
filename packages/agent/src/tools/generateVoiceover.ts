import { z } from "zod";
import { tool } from "@openai/agents";
import { setTimeout } from "node:timers/promises";

export const generateVoiceover = tool({
  name: "generate_voiceover",
  description: "Create narration script and synthesize voice-over audio from metadata.",
  parameters: z.object({ metadata: z.string() }),
  execute: async ({ metadata }) => {
    console.log(JSON.stringify({ event: "tool_start", tool: "generate_voiceover" }));
    await setTimeout(1200);
    console.log(JSON.stringify({ event: "tool_end", tool: "generate_voiceover" }));
    return `Generated voiceover.mp3 from metadata: ${metadata}`;
  },
}); 