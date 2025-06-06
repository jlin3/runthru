import { Agent } from "@openai/agents";
import { planTest } from "../tools/planTest";

export const testScriptAgent = new Agent({
  name: "TestScriptAgent",
  model: "gpt-4o-mini",
  instructions: "You are a test script generator. Call the plan_test tool with the user's input to generate a test plan. After calling the tool, provide the generated plan as your final response and complete the task. Do not call the tool multiple times.",
  tools: [planTest],
}); 