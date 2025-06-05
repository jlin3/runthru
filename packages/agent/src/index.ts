import "dotenv/config";
import { run } from "@openai/agents";

import { testScriptAgent } from "./agents/testScriptAgent";
import { screenRecordAgent } from "./agents/screenRecordAgent";
import { metadataAgent } from "./agents/metadataAgent";
import { voiceoverAgent } from "./agents/voiceoverAgent";
import { demoVideoAgent } from "./agents/demoVideoAgent";
import { stakeholderAgent } from "./agents/stakeholderAgent";

async function main() {
  const spec = process.argv.slice(2).join(" ") || "Demo checkout flow";

  // 1. Test Script Generation
  console.log(JSON.stringify({ event: "handoff_start", agent: "TestScriptAgent" }));
  const testScript = await run(testScriptAgent, spec);
  console.log(JSON.stringify({ event: "handoff_end", agent: "TestScriptAgent" }));

  // 2. Screen Recording
  console.log(JSON.stringify({ event: "handoff_start", agent: "ScreenRecordAgent" }));
  const recording = await run(screenRecordAgent, "Execute test script");
  console.log(JSON.stringify({ event: "handoff_end", agent: "ScreenRecordAgent" }));

  // 3. Metadata Generation
  console.log(JSON.stringify({ event: "handoff_start", agent: "MetadataAgent" }));
  const metadata = await run(metadataAgent, "Analyze recording");
  console.log(JSON.stringify({ event: "handoff_end", agent: "MetadataAgent" }));

  // 4. Voiceover Generation
  console.log(JSON.stringify({ event: "handoff_start", agent: "VoiceoverAgent" }));
  const voiceover = await run(voiceoverAgent, "Create narration");
  console.log(JSON.stringify({ event: "handoff_end", agent: "VoiceoverAgent" }));

  // 5. Demo Video Creation
  console.log(JSON.stringify({ event: "handoff_start", agent: "DemoVideoAgent" }));
  const finalVideo = await run(demoVideoAgent, "Merge video and audio");
  console.log(JSON.stringify({ event: "handoff_end", agent: "DemoVideoAgent" }));

  // 6. Send to Stakeholders
  console.log(JSON.stringify({ event: "handoff_start", agent: "StakeholderAgent" }));
  await run(stakeholderAgent, (finalVideo as any)?.finalOutput ?? "demo.mp4");
  console.log(JSON.stringify({ event: "handoff_end", agent: "StakeholderAgent" }));

  console.log(JSON.stringify({ event: "agent_complete", video: (finalVideo as any)?.finalOutput }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}); 