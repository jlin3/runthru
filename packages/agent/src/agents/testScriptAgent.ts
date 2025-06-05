import { Agent } from "@openai/agents";
import { planTest } from "../tools/planTest";

export const testScriptAgent = new Agent({
  name: "TestScriptAgent",
  model: "gpt-4o-mini",
  instructions: "Call the plan_test tool and return EXACTLY what it returns. Do not modify, interpret, or generate any additional content. Simply call plan_test with the input and pass through its exact output to the next agent.",
  tools: [planTest],
}); 