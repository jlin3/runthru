import { Agent } from "@openai/agents";
import { sendToStakeholder } from "../tools/sendToStakeholder";

export const stakeholderAgent = new Agent({
  name: "StakeholderAgent",
  model: "gpt-4o-mini",
  instructions: "Distribute demo video to stakeholders via GitHub or email.",
  tools: [sendToStakeholder],
}); 