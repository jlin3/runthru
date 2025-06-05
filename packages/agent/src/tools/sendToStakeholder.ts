import { z } from "zod";
import { tool } from "@openai/agents";
import { setTimeout } from "node:timers/promises";

export const sendToStakeholder = tool({
  name: "send_to_stakeholder",
  description: "Send demo video to GitHub PR/issues or email stakeholders.",
  parameters: z.object({ videoUrl: z.string() }),
  execute: async ({ videoUrl }) => {
    console.log(JSON.stringify({ event: "tool_start", tool: "send_to_stakeholder" }));
    await setTimeout(600);
    console.log(JSON.stringify({ event: "tool_end", tool: "send_to_stakeholder" }));
    return `Demo shared with stakeholders: ${videoUrl}`;
  },
}); 