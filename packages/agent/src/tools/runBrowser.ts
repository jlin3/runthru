import { z } from "zod";
import { tool } from "@openai/agents";
import { chromium } from "playwright";
import { writeFile } from "fs/promises";
import { join } from "path";

export const runBrowser = tool({
  name: "run_browser",
  description: "Run Playwright to record a screen video of a user journey.",
  parameters: z.object({
    plan: z.string().describe("A detailed, step-by-step plan of the user actions to record."),
  }),
  execute: async ({ plan }) => {
    console.log(JSON.stringify({ event: "tool_start", tool: "run_browser", detail: "Launching browser..." }));
    
    const browser = await chromium.launch({ headless: false }); // Use headless: true for CI/background
    const context = await browser.newContext({
      recordVideo: { dir: "uploads/videos" },
      viewport: { width: 1920, height: 1080 },
    });
    const page = await context.newPage();
    
    // Simulate executing the plan.
    // A real implementation would parse the 'plan' and execute each step.
    // For this demo, we'll simulate a few common steps from Dhruv's example.
    try {
      console.log(JSON.stringify({ event: "tool_step", tool: "run_browser", detail: "Navigating to Bookvid..." }));
      await page.goto("https://stg.bookvid.com/", { waitUntil: 'networkidle' });
      
      console.log(JSON.stringify({ event: "tool_step", tool: "run_browser", detail: "Clicking Marketplace link..." }));
      await page.click('a[href="/marketplace"]');
      await page.waitForNavigation({ waitUntil: 'networkidle' });

      console.log(JSON.stringify({ event: "tool_step", tool: "run_browser", detail: "Waiting and scrolling..." }));
      await page.waitForTimeout(3000); // Wait for content to load
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(1000);

    } catch (error: any) {
      console.error(JSON.stringify({ event: "error", tool: "run_browser", detail: error.message }));
      await browser.close();
      throw new Error(`Browser automation failed: ${error.message}`);
    }

    await context.close();
    const videoPath = await page.video()?.path();
    
    console.log(JSON.stringify({ event: "tool_end", tool: "run_browser", detail: `Video saved to ${videoPath}` }));
    
    if (!videoPath) {
      throw new Error("Video recording was not created.");
    }
    
    return `Successfully recorded browser actions. Video available at: ${videoPath}`;
  },
}); 