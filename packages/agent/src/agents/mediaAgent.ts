import { Agent } from "@openai/agents";
import { mergeVideo } from "../tools/mergeVideo";

export const mediaAgent = new Agent({
  name: "MediaAgent",
  model: "gpt-4o-mini",
  instructions: "Merge video and audio into final demo and handoff to Publisher agent.",
  tools: [mergeVideo],
}); 