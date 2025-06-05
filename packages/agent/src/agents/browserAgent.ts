import { Agent } from "@openai/agents";
import { runBrowser } from "../tools/runBrowser";

export const browserAgent = new Agent({
  name: "BrowserAgent",
  model: "gpt-4o-mini",
  instructions: "Use Playwright to run browser steps and capture video, then handoff to Media agent.",
  tools: [runBrowser],
}); 