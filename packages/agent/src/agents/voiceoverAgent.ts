import { Agent } from "@openai/agents";
import { generateVoiceover } from "../tools/generateVoiceover";

export const voiceoverAgent = new Agent({
  name: "VoiceoverAgent",
  model: "gpt-4o-mini",
  instructions: "Create narration and synthesize professional voice-over audio.",
  tools: [generateVoiceover],
}); 