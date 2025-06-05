import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

export class OpenAIService {
  private openai: OpenAI | null = null;

  private getOpenAIClient(): OpenAI {
    if (!this.openai) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error('OPENAI_API_KEY not found in environment variables');
        throw new Error('OpenAI API key not configured');
      }
      console.log('✅ Initializing OpenAI with API key');
      this.openai = new OpenAI({ apiKey });
    }
    return this.openai;
  }
  async generateTestSteps(description: string, targetUrl: string): Promise<string[]> {
    try {
      const prompt = `You are an expert QA automation engineer. Given the following test description and target URL, generate a detailed step-by-step test plan that can be executed by Playwright automation.

Test Description: ${description}
Target URL: ${targetUrl}

Please provide a JSON response with an array of specific, actionable test steps. Each step should be clear and executable by browser automation. Focus on user interactions like clicking buttons, filling forms, navigating pages, etc.

Example format:
{
  "steps": [
    "Navigate to https://example.com",
    "Click on the 'Login' button",
    "Fill in email field with 'test@example.com'",
    "Fill in password field with 'password123'",
    "Click the 'Submit' button",
    "Verify that dashboard page is displayed"
  ]
}`;

      const response = await this.getOpenAIClient().chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.steps || [];
    } catch (error) {
      console.error("Error generating test steps:", error);
      throw new Error("Failed to generate test steps");
    }
  }

  async generateNarrationScript(testSteps: string[], style: string = "professional"): Promise<string> {
    try {
      const prompt = `You are creating a professional narration script for a QA demo video. Given these test steps, create a natural, engaging script that explains what's happening in the test.

Test Steps:
${testSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

Narration Style: ${style}

Create a script that:
- Sounds natural and conversational
- Explains the purpose of each action
- Provides context for why we're performing each step
- Flows smoothly from one step to the next
- Is appropriate for stakeholders and team members

Provide only the narration text, no formatting or stage directions.`;

      const response = await this.getOpenAIClient().chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
      });

      return response.choices[0].message.content || "";
    } catch (error) {
      console.error("Error generating narration script:", error);
      throw new Error("Failed to generate narration script");
    }
  }

  async generateSpeech(text: string, voice: string = "alloy"): Promise<string> {
    try {
      const response = await this.getOpenAIClient().audio.speech.create({
        model: "tts-1",
        voice: voice as any,
        input: text,
      });

      const audioDir = path.join(process.cwd(), "uploads", "audio");
      if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
      }

      const audioPath = path.join(audioDir, `narration_${Date.now()}.mp3`);
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(audioPath, buffer);

      return audioPath;
    } catch (error) {
      console.error("Error generating speech:", error);
      throw new Error("Failed to generate speech");
    }
  }
}

export const openaiService = new OpenAIService();
