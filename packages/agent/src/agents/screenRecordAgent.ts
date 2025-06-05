import { Agent } from "@openai/agents";
import { runBrowser } from "../tools/runBrowser";

export const screenRecordAgent = new Agent({
  name: "ScreenRecordAgent",
  model: "gpt-4o-mini",
  instructions: "Take the EXACT test plan you receive and call run_browser with it. Do not create your own test steps. Use the exact plan text as the 'plan' parameter for run_browser. Your only job is to pass the plan to the run_browser tool.",
  tools: [runBrowser],
}); 