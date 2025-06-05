import "dotenv/config";
import { run } from "@openai/agents";

import { testScriptAgent } from "./agents/testScriptAgent";
import { screenRecordAgent } from "./agents/screenRecordAgent";
import { metadataAgent } from "./agents/metadataAgent";
import { voiceoverAgent } from "./agents/voiceoverAgent";
import { demoVideoAgent } from "./agents/demoVideoAgent";
import { stakeholderAgent } from "./agents/stakeholderAgent";

function extractPath(text: string | undefined): string {
  if (!text) return "";
  const match = text.match(/(\S+\.(?:mp4|mp3|webm))/);
  return match ? match[0] : "";
}

async function main() {
  const spec = process.argv.slice(2).join(" ") || "Go to bookvid.com, click on the marketplace, and browse the available experts.";

  // 1. Test Script Generation
  console.log(JSON.stringify({ event: "handoff_start", agent: "TestScriptAgent" }));
  const testScriptResult = await run(testScriptAgent, spec);
  console.log(JSON.stringify({ event: "handoff_end", agent: "TestScriptAgent" }));

  // 2. Screen Recording
  console.log(JSON.stringify({ event: "handoff_start", agent: "ScreenRecordAgent" }));
  const recordingResult = await run(screenRecordAgent, testScriptResult.finalOutput as string);
  const recordedVideoPath = extractPath(recordingResult.finalOutput as string);
  console.log(JSON.stringify({ event: "handoff_end", agent: "ScreenRecordAgent", detail: `Video at: ${recordedVideoPath}` }));

  // 3. Metadata Generation (passing video path for potential analysis)
  console.log(JSON.stringify({ event: "handoff_start", agent: "MetadataAgent" }));
  const metadataResult = await run(metadataAgent, `Analyze video at ${recordedVideoPath}`);
  console.log(JSON.stringify({ event: "handoff_end", agent: "MetadataAgent" }));
  
  // 4. Voiceover Generation
  const narrationText = `Here is a demo of the feature: ${spec}. We first land on the page, then navigate to the marketplace to see the list of available experts for booking.`;
  console.log(JSON.stringify({ event: "handoff_start", agent: "VoiceoverAgent" }));
  const voiceoverResult = await run(voiceoverAgent, narrationText);
  const voiceoverAudioPath = extractPath(voiceoverResult.finalOutput as string);
  console.log(JSON.stringify({ event: "handoff_end", agent: "VoiceoverAgent", detail: `Audio at: ${voiceoverAudioPath}` }));

  // 5. Demo Video Creation
  console.log(JSON.stringify({ event: "handoff_start", agent: "DemoVideoAgent" }));
  const finalVideoResult = await run(demoVideoAgent, `videoPath: ${recordedVideoPath}, audioPath: ${voiceoverAudioPath}`);
  const finalVideoPath = extractPath(finalVideoResult.finalOutput as string);
  console.log(JSON.stringify({ event: "handoff_end", agent: "DemoVideoAgent", detail: `Final video at: ${finalVideoPath}` }));
  
  // 6. Send to Stakeholders
  console.log(JSON.stringify({ event: "handoff_start", agent: "StakeholderAgent" }));
  await run(stakeholderAgent, `New demo video created: ${finalVideoPath}`);
  console.log(JSON.stringify({ event: "handoff_end", agent: "StakeholderAgent" }));

  console.log(JSON.stringify({ event: "agent_complete", video: finalVideoPath }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}); 