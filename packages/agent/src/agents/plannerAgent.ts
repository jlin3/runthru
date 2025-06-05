import { Agent } from "@openai/agents";
import { planTest } from "../tools/planTest";

export const plannerAgent = new Agent({
  name: "PlannerAgent",
  model: "gpt-4o-mini",
  instructions: "Plan the QA demo steps and handoff to the Browser agent for execution.",
  tools: [planTest],
}); 