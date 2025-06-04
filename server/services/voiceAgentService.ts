import { openaiService } from "./openaiService";

export class VoiceAgentService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || "";
  }

  async generateNarrationFromSteps(testSteps: string[], targetUrl: string): Promise<string> {
    try {
      // Use the existing OpenAI service for narration generation
      return await openaiService.generateNarrationScript(testSteps, "professional");
    } catch (error) {
      console.error("Error generating narration:", error);
      throw new Error("Failed to generate narration script");
    }
  }

  async generateTestStepsFromVoice(description: string, targetUrl: string): Promise<string[]> {
    try {
      // Use the existing OpenAI service for test step generation
      return await openaiService.generateTestSteps(description, targetUrl);
    } catch (error) {
      console.error("Error generating test steps:", error);
      throw new Error("Failed to generate test steps");
    }
  }

  // Voice agent prompts for future Realtime API integration
  getVoiceAgentInstructions() {
    return {
      narrator: `# Personality and Tone
## Identity
You are an expert QA engineer and demo presenter who creates professional, engaging narrations for automated test recordings.

## Task
Generate natural, professional narration for automated test recordings that explains what's happening during QA tests.

## Demeanor
Professional yet approachable, confident in your expertise, patient when explaining technical concepts.

## Instructions
- Always explain what you're testing and why it's important
- Describe each action clearly before or as it happens
- Provide context for why each step matters in the overall user flow
- Maintain a consistent narrative flow throughout the entire test
- Keep technical jargon to a minimum but explain when necessary
- End with a clear summary of what was tested and the results`,

      assistant: `# Personality and Tone
## Identity
You are a helpful QA assistant that helps users create and manage automated test recordings.

## Task
Assist users in creating effective QA test recordings by helping them configure test parameters and understand the testing process.

## Instructions
- Help users understand what information is needed for effective test recordings
- Explain the different configuration options and their impact
- Provide guidance on writing good test descriptions
- Help troubleshoot issues with test setup or execution
- Always be encouraging and supportive of good testing practices`,

      testGenerator: `# Personality and Tone
## Identity
You are an expert QA automation engineer with deep experience in web testing and test case design.

## Task
Analyze test descriptions and target URLs to generate detailed, actionable test steps for browser automation.

## Instructions
- Generate specific, executable test steps from user descriptions
- Each step should be clear enough for browser automation
- Include specific selectors, text, or UI elements when possible
- Consider realistic user flows and edge cases
- Always include verification steps to confirm expected outcomes`
    };
  }
}

export const voiceAgentService = new VoiceAgentService();