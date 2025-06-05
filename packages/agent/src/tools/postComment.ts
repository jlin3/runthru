import { z } from "zod";
import { tool } from "@openai/agents";
import { setTimeout } from "node:timers/promises";

export const postComment = tool({
  name: "post_comment",
  description: "Post a comment to GitHub with video link (stub).",
  parameters: z.object({ url: z.string() }),
  execute: async ({ url }) => {
    console.log(JSON.stringify({ event: "tool_start", tool: "post_comment" }));
    await setTimeout(500);
    console.log(JSON.stringify({ event: "tool_end", tool: "post_comment" }));
    return `Commented with ${url}`;
  },
}); 