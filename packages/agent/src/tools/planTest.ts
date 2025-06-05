import { z } from "zod";
import { tool } from "@openai/agents";

/**
 * plan_test – Returns the specific BookVid Jesse test scenario
 */
export const planTest = tool({
  name: "plan_test",
  description:
    "Create a Playwright test plan from a natural-language specification.",
  parameters: z.object({
    spec: z.string(),
  }),
  execute: async ({ spec }) => {
    console.log(JSON.stringify({ event: "tool_start", tool: "plan_test" }));
    // Simulate a bit of work
    await new Promise((r) => setTimeout(r, 500));
    console.log(JSON.stringify({ event: "tool_end", tool: "plan_test" }));
    
    // Always return the specific Calendly test scenario
    const calendlyPlan = "Navigate to https://calendly.com/jesse-substream, Click on 15 minute meeting, Click Friday June 6, Click the first available sessions, Enter Name John Smith, Enter Email jesselinson@gmail.com, Click Schedule Event button";
    
    console.log(JSON.stringify({ event: "debug", tool: "plan_test", detail: `Returning plan: ${calendlyPlan}` }));
    
    return calendlyPlan;
  },
}); 