import { Agent } from "@openai/agents";
import { generateMetadata } from "../tools/generateMetadata";

export const metadataAgent = new Agent({
  name: "MetadataAgent",
  model: "gpt-4o-mini",
  instructions: "You must use the generate_metadata tool to analyze screen recording and extract key interaction metadata. Always call the tool.",
  tools: [generateMetadata],
}); 