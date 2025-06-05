import { Agent } from "@openai/agents";
import { generateVoiceover } from "../tools/generateVoiceover";

export const voiceoverAgent = new Agent({
  name: "VoiceoverAgent",
  model: "gpt-4o-mini",
  instructions: "You must use the generate_voiceover tool to create narration and synthesize professional voice-over audio. Always call the tool.",
  tools: [generateVoiceover],
}); 