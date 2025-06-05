import { Agent } from "@openai/agents";
import { mergeVideo } from "../tools/mergeVideo";

export const demoVideoAgent = new Agent({
  name: "DemoVideoAgent",
  model: "gpt-4o-mini",
  instructions: "Merge screen recording with voiceover into final demo video.",
  tools: [mergeVideo],
}); 