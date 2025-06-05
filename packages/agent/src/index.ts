import "dotenv/config";
import { run } from "@openai/agents";

import { plannerAgent } from "./agents/plannerAgent";
import { browserAgent } from "./agents/browserAgent";
import { mediaAgent } from "./agents/mediaAgent";
import { publisherAgent } from "./agents/publisherAgent";

async function main() {
  const spec = process.argv.slice(2).join(" ") || "Demo checkout flow";

  // Planner
  console.log(JSON.stringify({ event: "handoff_start", agent: "PlannerAgent" }));
  await run(plannerAgent, spec);
  console.log(JSON.stringify({ event: "handoff_end", agent: "PlannerAgent" }));

  // Browser
  console.log(JSON.stringify({ event: "handoff_start", agent: "BrowserAgent" }));
  await run(browserAgent, "run browser");
  console.log(JSON.stringify({ event: "handoff_end", agent: "BrowserAgent" }));

  // Media
  console.log(JSON.stringify({ event: "handoff_start", agent: "MediaAgent" }));
  const videoUrl = await run(mediaAgent, "merge media");
  console.log(JSON.stringify({ event: "handoff_end", agent: "MediaAgent" }));

  // Publisher
  console.log(JSON.stringify({ event: "handoff_start", agent: "PublisherAgent" }));
  await run(publisherAgent, (videoUrl as any)?.finalOutput ?? "placeholder.mp4");
  console.log(JSON.stringify({ event: "handoff_end", agent: "PublisherAgent" }));

  console.log(JSON.stringify({ event: "agent_complete", video: (videoUrl as any)?.finalOutput }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}); 