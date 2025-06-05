import { Agent } from "@openai/agents";
import { runBrowser } from "../tools/runBrowser";

export const screenRecordAgent = new Agent({
  name: "ScreenRecordAgent",
  model: "gpt-4o-mini",
  instructions: "Execute Playwright scripts and capture screen recordings with timeline data.",
  tools: [runBrowser],
}); 