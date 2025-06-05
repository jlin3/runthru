import { Agent } from "@openai/agents";
import { generateMetadata } from "../tools/generateMetadata";

export const metadataAgent = new Agent({
  name: "MetadataAgent",
  model: "gpt-4o-mini",
  instructions: "Analyze screen recording and extract key interaction metadata.",
  tools: [generateMetadata],
}); 