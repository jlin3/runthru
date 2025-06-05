import OpenAI from "openai";
import * as fs from "fs-extra";
import * as path from "path";
import { ChatCompletionContentPart } from "openai/resources/index.js";

interface SessionEvent {
    id: number;
    timestamp: number;
    action: string;
    detail: any;
    success: boolean;
    screenshot?: string;
  }

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

  async generateNarrationFromCUA(sessionEvents: SessionEvent[], sessionDir: string): Promise<string> {
    const timelineJson = sessionEvents.map(e => `[${new Date(e.timestamp).toISOString().substr(14, 5)}] ${e.action}: ${e.detail}`).join('\n');

    const imageMessages: ChatCompletionContentPart[] = [];
    const screenshots = sessionEvents.filter(e => e.screenshot).slice(0, 5); // Limit to 5 screenshots
    for (const event of screenshots) {
        if (event.screenshot) {
            const imagePath = path.join(sessionDir, event.screenshot);
            if (await fs.pathExists(imagePath)) {
                const imageBuffer = await fs.readFile(imagePath);
                imageMessages.push({
                    type: "image_url",
                    image_url: {
                        url: `data:image/png;base64,${imageBuffer.toString('base64')}`,
                    },
                });
            }
        }
    }

    const prompt = `You are a clear, human-sounding narrator for a product demo video. Your script will be used for text-to-speech generation.
    
    Here is the timeline of events from the recording:
    **TIMELINE_JSON:**
    ${timelineJson}

    Here are some screenshots from key moments:
    **SCREENSHOTS:**
    (Attached in message)

    **GOAL:**
    Create a narration script of 300 words or less.
    - Narrate in the first-person (e.g., "First, I'll go to the homepage...").
    - Start each line with the timestamp in [mm:ss] format, based on the timeline.
    - Do not add any greetings, intro, or sign-off. Just the narration.
    - Never mention "screenshot saved", file paths, or technical details.

    Produce only the plain-text narration.
    `;
    
    const response = await this.getOpenAIClient().chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              ...imageMessages,
            ],
          },
        ],
      });

      return response.choices[0].message.content || "";
  }

  async synthesizeAudio(text: string, outputPath: string): Promise<string> {
    const speech = await this.getOpenAIClient().audio.speech.create({
        model: 'tts-1-hd',
        input: text,
        voice: 'alloy',
        response_format: 'mp3'
      });
    
    const buffer = Buffer.from(await speech.arrayBuffer());
    await fs.writeFile(outputPath, buffer);
    return outputPath;
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
