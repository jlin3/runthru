import { z } from "zod";
import { tool } from "@openai/agents";
import { setTimeout } from "node:timers/promises";

export const generateMetadata = tool({
  name: "generate_metadata",
  description: "Extract page titles, URLs, and screenshot data from screen recording.",
  parameters: z.object({ recordingData: z.string() }),
  execute: async ({ recordingData }) => {
    console.log(JSON.stringify({ event: "tool_start", tool: "generate_metadata" }));
    await setTimeout(800);
    console.log(JSON.stringify({ event: "tool_end", tool: "generate_metadata" }));
    return `Generated metadata with 5 key interactions from ${recordingData}`;
  },
}); 