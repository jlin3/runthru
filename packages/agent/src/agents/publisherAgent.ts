import { Agent } from "@openai/agents";
import { postComment } from "../tools/postComment";

export const publisherAgent = new Agent({
  name: "PublisherAgent",
  model: "gpt-4o-mini",
  instructions: "Publish the demo video link to stakeholders.",
  tools: [postComment],
}); 