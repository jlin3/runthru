import { z } from "zod";
import { tool } from "@openai/agents";
import { setTimeout } from "node:timers/promises";

export const runBrowser = tool({
  name: "run_browser",
  description: "Run Playwright to record a screen video (stub).",
  parameters: z.object({ plan: z.string() }),
  execute: async ({ plan }) => {
    console.log(JSON.stringify({ event: "tool_start", tool: "run_browser" }));
    // Simulate work
    await setTimeout(1000);
    console.log(JSON.stringify({ event: "tool_end", tool: "run_browser" }));
    return `Recorded browser actions for plan: ${plan}`;
  },
}); 