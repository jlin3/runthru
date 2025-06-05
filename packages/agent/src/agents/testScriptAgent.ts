import { Agent } from "@openai/agents";
import { planTest } from "../tools/planTest";

export const testScriptAgent = new Agent({
  name: "TestScriptAgent",
  model: "gpt-4o-mini",
  instructions: "Generate detailed Playwright test scripts from natural language specifications.",
  tools: [planTest],
}); 