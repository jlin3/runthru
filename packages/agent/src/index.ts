import { Agent, run } from "@openai/agents";
import "dotenv/config";

import { planTest } from "./tools/planTest";
import { runBrowser } from "./tools/runBrowser";
import { mergeVideo } from "./tools/mergeVideo";
import { postComment } from "./tools/postComment";

const bot = new Agent({
  name: "RunThru",
  model: "gpt-4o-mini",
  instructions:
    "You are RunThru, a QA demo assistant. Plan steps, run them, narrate.",
  tools: [planTest, runBrowser, mergeVideo, postComment],
});

async function main() {
  const input = process.argv.slice(2).join(" ") || "Demo checkout flow";
  const result = await run(bot, input);
  console.log(JSON.stringify({ event: "agent_complete", output: result.finalOutput }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}); 