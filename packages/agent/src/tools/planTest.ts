import { z } from "zod";
import { tool } from "@openai/agents";

/**
 * plan_test – Turns a natural-language spec into a Playwright-ready test plan.
 */
export const planTest = tool({
  name: "plan_test",
  description:
    "Create a Playwright test plan from a natural-language specification.",
  parameters: z.object({
    spec: z.string(),
  }),
  // For now just echo back a stub so the agent runs end-to-end.
  execute: async ({ spec }) => {
    console.log(JSON.stringify({ event: "tool_start", tool: "plan_test" }));
    // Simulate a bit of work
    await new Promise((r) => setTimeout(r, 500));
    console.log(JSON.stringify({ event: "tool_end", tool: "plan_test" }));
    return `1. Open browser→${spec}\n2. (stub) More steps here…`;
  },
}); 