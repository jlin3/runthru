import { Agent } from "@openai/agents";
import { generateVoiceover } from "../tools/generateVoiceover";

export const voiceoverAgent = new Agent({
  name: "VoiceoverAgent",
  model: "gpt-4o-mini",
  instructions: "You must use the generate_voiceover tool to create professional voice-over audio. Use the exact text provided to you without any modifications. Always call the tool with the provided text.",
  tools: [generateVoiceover],
}); 