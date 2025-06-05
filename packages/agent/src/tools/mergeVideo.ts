import { z } from "zod";
import { tool } from "@openai/agents";
import { setTimeout } from "node:timers/promises";

export const mergeVideo = tool({
  name: "merge_video",
  description: "Merge video and audio into final demo (stub).",
  parameters: z.object({ input: z.string() }),
  execute: async ({ input }) => {
    console.log(JSON.stringify({ event: "tool_start", tool: "merge_video" }));
    await setTimeout(1000);
    console.log(JSON.stringify({ event: "tool_end", tool: "merge_video" }));
    return `merged_video.mp4`;
  },
}); 