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

function generateDynamicNarration(testPlan: string): string {
  // Analyze the test plan to generate appropriate narration
  const plan = testPlan.toLowerCase();
  
  if (plan.includes('calendly') && plan.includes('jesse-substream')) {
    return `In this demonstration, I'll walk through the process of booking a meeting using Calendly. I'll start by navigating to the Calendly scheduling page, select a 15-minute meeting option, choose an available time slot on Friday June 6th, and complete the booking by entering the attendee details including name and email address. This showcases the smooth user experience of the Calendly scheduling platform.`;
  } else if (plan.includes('bookvid') && plan.includes('marketplace')) {
    return `Here is a demo of the BookVid platform. I'll navigate to the marketplace to browse available experts and walk through the booking process for a consultation session.`;
  } else {
    // Generic fallback narration
    const steps = testPlan.split(',').map(s => s.trim());
    return `In this automated test demonstration, I'll execute ${steps.length} key steps to validate the user workflow. ${steps.slice(0, 3).join(', ')}, and complete the process to ensure all functionality works as expected.`;
  }
}

async function main() {
  const spec = process.argv.slice(2).join(" ") || "Go to bookvid.com, click on the marketplace, and browse the available experts.";

  // 1. Test Script Generation
  console.log(JSON.stringify({ event: "handoff_start", agent: "TestScriptAgent" }));
  const testScriptResult = await run(testScriptAgent, spec);
  const testPlan = testScriptResult.finalOutput as string;
  console.log(JSON.stringify({ event: "handoff_end", agent: "TestScriptAgent" }));

  // 2. Screen Recording
  console.log(JSON.stringify({ event: "handoff_start", agent: "ScreenRecordAgent" }));
  const recordingResult = await run(screenRecordAgent, testPlan);
  const recordedVideoPath = extractPath(recordingResult.finalOutput as string);
  console.log(JSON.stringify({ event: "handoff_end", agent: "ScreenRecordAgent", detail: `Video at: ${recordedVideoPath}` }));

  // 3. Metadata Generation (passing video path for potential analysis)
  console.log(JSON.stringify({ event: "handoff_start", agent: "MetadataAgent" }));
  const metadataResult = await run(metadataAgent, `Analyze video at ${recordedVideoPath}`);
  console.log(JSON.stringify({ event: "handoff_end", agent: "MetadataAgent" }));
  
  // 4. Voiceover Generation - Dynamic narration based on actual test plan
  const narrationText = generateDynamicNarration(testPlan);
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