import { Agent, tool, run } from "@openai/agents";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { openaiService } from "./openaiService.js";
import path from "path";
import fs from "fs";

interface PageState {
  url: string;
  title: string;
  elements: Array<{
    tag: string;
    text: string;
    selector: string;
    type?: string | null;
    placeholder?: string | null;
  }>;
}

interface BrowserSession {
  browser: Browser | null;
  context: BrowserContext | null;
  page: Page | null;
  isRecording: boolean;
  videoPath?: string;
}

class AgentService {
  private session: BrowserSession = {
    browser: null,
    context: null,
    page: null,
    isRecording: false
  };

  private agent: Agent;

  constructor() {
    // Create browser automation tools
    const runBrowserStep = tool({
      name: "runBrowserStep",
      description: "Execute a single browser automation step",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            description: "The action to perform: navigate, click, fill, wait, scroll, press",
            enum: ["navigate", "click", "fill", "wait", "scroll", "press"]
          },
          target: {
            type: "string", 
            description: "Target selector, text, URL, or value for the action"
          },
          value: {
            type: "string",
            description: "Value to fill (only for fill action)"
          }
        },
        required: ["action"],
        additionalProperties: false
      },
      execute: async ({ action, target, value }: { action: string; target?: string; value?: string }): Promise<string> => {
        return await this.runBrowserStep(action, target, value);
      }
    });

    const analyzePage = tool({
      name: "analyzePage", 
      description: "Analyze the current page content and structure",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false
      },
    })(async (): Promise<string> => {
      return await this.analyzePage();
    });

    const startRecording = tool({
      name: "startRecording",
      description: "Start browser recording session", 
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "URL to navigate to"
          },
          viewport: {
            type: "string", 
            description: "Viewport size (e.g. '1920x1080')",
            default: "1920x1080"
          },
          browser: {
            type: "string",
            description: "Browser type",
            default: "chromium"
          }
        },
        required: ["url"],
        additionalProperties: false
      },
    })(async ({ url, viewport = "1920x1080", browser = "chromium" }: { 
      url: string; 
      viewport?: string; 
      browser?: string 
    }): Promise<string> => {
      return await this.startRecording(url, viewport, browser);
    });

    const stopRecording = tool({
      name: "stopRecording",
      description: "Stop recording and get video path",
      parameters: {
        type: "object", 
        properties: {},
        additionalProperties: false
      },
    })(async (): Promise<string> => {
      return await this.stopRecording();
    });

    const verifyElement = tool({
      name: "verifyElement",
      description: "Verify an element exists and is visible",
      parameters: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector for the element"
          },
          expectedText: {
            type: "string", 
            description: "Expected text content (optional)"
          }
        },
        required: ["selector"],
        additionalProperties: false
      },
    })(async ({ selector, expectedText }: { selector: string; expectedText?: string }): Promise<string> => {
      return await this.verifyElement(selector, expectedText);
    });

    const takeScreenshot = tool({
      name: "takeScreenshot",
      description: "Take a screenshot of the current page",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Custom filename for the screenshot"
          }
        },
        additionalProperties: false
      },
    })(async ({ name }: { name?: string }): Promise<string> => {
      return await this.takeScreenshot(name);
    });

    const generateTestPlan = tool({
      name: "generateTestPlan", 
      description: "Generate a comprehensive test plan",
      parameters: {
        type: "object",
        properties: {
          description: {
            type: "string",
            description: "Test description"
          },
          targetUrl: {
            type: "string", 
            description: "Target URL for testing"
          }
        },
        required: ["description", "targetUrl"],
        additionalProperties: false
      },
    })(async ({ description, targetUrl }: { description: string; targetUrl: string }): Promise<string> => {
      return await this.generateTestPlan(description, targetUrl);
    });

    // Initialize the agent with tools
    this.agent = new Agent({
      name: "RunThru QA Agent",
      instructions: `You are RunThru, an expert QA automation agent. You help create, execute, and verify automated tests.

Your capabilities:
- Navigate web pages and interact with elements
- Analyze page content and structure  
- Generate detailed test steps
- Execute browser automation
- Create comprehensive test reports
- Record demo videos

Always be thorough, accurate, and provide clear explanations of your actions.`,
      tools: [
        runBrowserStep,
        analyzePage, 
        startRecording,
        stopRecording,
        verifyElement,
        takeScreenshot,
        generateTestPlan
      ],
    });
  }

  // Implementation methods
  async runBrowserStep(action: string, target?: string, value?: string): Promise<string> {
    if (!this.session.page) {
      throw new Error("Browser session not started. Call startRecording first.");
    }

    try {
      const page = this.session.page;
      
      switch (action.toLowerCase()) {
        case 'navigate':
        case 'goto':
          if (!target) throw new Error("URL required for navigation");
          await page.goto(target, { waitUntil: 'networkidle' });
          return `Successfully navigated to ${target}`;

        case 'click':
          if (!target) throw new Error("Target selector or text required for click");
          try {
            await page.getByText(target).first().click({ timeout: 5000 });
          } catch {
            await page.locator(target).first().click({ timeout: 5000 });
          }
          return `Successfully clicked on "${target}"`;

        case 'fill':
        case 'type':
          if (!target || value === undefined) throw new Error("Target and value required for fill");
          await page.locator(target).fill(value);
          return `Successfully filled "${target}" with "${value}"`;

        case 'wait':
          const waitTime = parseInt(target || "1000");
          await page.waitForTimeout(waitTime);
          return `Waited for ${waitTime}ms`;

        case 'scroll':
          const distance = parseInt(target || "500");
          await page.mouse.wheel(0, distance);
          return `Scrolled ${distance}px`;

        case 'press':
          if (!target) throw new Error("Key required for press");
          await page.keyboard.press(target);
          return `Pressed key "${target}"`;

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error: any) {
      return `Error executing ${action}: ${error.message}`;
    }
  }

  async analyzePage(): Promise<string> {
    if (!this.session.page) {
      throw new Error("Browser session not started");
    }

    try {
      const page = this.session.page;
      
      const url = page.url();
      const title = await page.title();
      
      const elements = await page.evaluate(() => {
        const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [onclick]');
        return Array.from(interactiveElements).slice(0, 20).map(el => ({
          tag: el.tagName.toLowerCase(),
          text: el.textContent?.trim().substring(0, 50) || '',
          selector: el.id ? `#${el.id}` : el.className ? `.${el.className.split(' ')[0]}` : el.tagName.toLowerCase(),
          type: el.getAttribute('type'),
          placeholder: el.getAttribute('placeholder')
        }));
      });

      return `Page Analysis:
URL: ${url}
Title: ${title}
Interactive Elements Found: ${elements.length}

Key Elements:
${elements.map(el => `- ${el.tag}${el.type ? `[${el.type}]` : ''}: "${el.text}" (${el.selector})`).join('\n')}`;
    } catch (error: any) {
      return `Error analyzing page: ${error.message}`;
    }
  }

  async startRecording(url: string, viewport: string = "1920x1080", browser: string = "chromium"): Promise<string> {
    try {
      const [width, height] = viewport.split('x').map(Number);
      
      this.session.browser = await chromium.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const videoDir = path.join(process.cwd(), "uploads", "videos");
      if (!fs.existsSync(videoDir)) {
        fs.mkdirSync(videoDir, { recursive: true });
      }

      this.session.context = await this.session.browser.newContext({
        viewport: { width, height },
        recordVideo: {
          dir: videoDir,
          size: { width, height }
        }
      });

      this.session.page = await this.session.context.newPage();
      this.session.isRecording = true;

      await this.session.page.goto(url, { waitUntil: 'networkidle' });

      return `Recording started. Browser launched and navigated to ${url}`;
    } catch (error: any) {
      return `Error starting recording: ${error.message}`;
    }
  }

  async stopRecording(): Promise<string> {
    if (!this.session.isRecording) {
      return "No recording in progress";
    }

    try {
      if (this.session.page) await this.session.page.close();
      if (this.session.context) await this.session.context.close();
      if (this.session.browser) await this.session.browser.close();

      this.session.isRecording = false;

      const videoDir = path.join(process.cwd(), "uploads", "videos");
      const videoFiles = fs.readdirSync(videoDir).filter(f => f.endsWith('.webm'));
      
      if (videoFiles.length === 0) {
        return "Recording stopped but no video file found";
      }

      const latestVideo = videoFiles
        .map(f => ({ name: f, time: fs.statSync(path.join(videoDir, f)).mtime }))
        .sort((a, b) => b.time.getTime() - a.time.getTime())[0];

      const videoPath = path.join(videoDir, latestVideo.name);
      this.session.videoPath = videoPath;

      return `Recording stopped. Video saved to: ${videoPath}`;
    } catch (error: any) {
      return `Error stopping recording: ${error.message}`;
    }
  }

  async generateTestPlan(description: string, targetUrl: string): Promise<string> {
    try {
      const steps = await openaiService.generateTestSteps(description, targetUrl);
      return `Generated test plan for: ${description}

Target URL: ${targetUrl}

Test Steps:
${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`;
    } catch (error: any) {
      return `Error generating test plan: ${error.message}`;
    }
  }

  async verifyElement(selector: string, expectedText?: string): Promise<string> {
    if (!this.session.page) {
      throw new Error("Browser session not started");
    }

    try {
      const element = this.session.page.locator(selector);
      const isVisible = await element.isVisible();
      
      if (!isVisible) {
        return `Element "${selector}" is not visible`;
      }

      if (expectedText) {
        const actualText = await element.textContent();
        if (actualText?.includes(expectedText)) {
          return `✅ Element "${selector}" is visible and contains expected text: "${expectedText}"`;
        } else {
          return `❌ Element "${selector}" is visible but text doesn't match. Expected: "${expectedText}", Actual: "${actualText}"`;
        }
      }

      return `✅ Element "${selector}" is visible`;
    } catch (error: any) {
      return `❌ Error verifying element "${selector}": ${error.message}`;
    }
  }

  async takeScreenshot(name?: string): Promise<string> {
    if (!this.session.page) {
      throw new Error("Browser session not started");
    }

    try {
      const screenshotDir = path.join(process.cwd(), "uploads", "screenshots");
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }

      const filename = name ? `${name}_${Date.now()}.png` : `screenshot_${Date.now()}.png`;
      const screenshotPath = path.join(screenshotDir, filename);
      
      await this.session.page.screenshot({ path: screenshotPath, fullPage: true });
      
      return `Screenshot saved to: ${screenshotPath}`;
    } catch (error: any) {
      return `Error taking screenshot: ${error.message}`;
    }
  }

  // Main method to run the agent
  async run(instruction: string): Promise<string> {
    try {
      const result = await run(this.agent, instruction);
      return result.finalOutput || "Agent completed successfully";
    } catch (error: any) {
      console.error('Agent execution error:', error);
      throw new Error(`Agent failed: ${error.message}`);
    }
  }

  // Cleanup method
  async cleanup(): Promise<void> {
    if (this.session.isRecording) {
      await this.stopRecording();
    }
  }
}

export const agentService = new AgentService(); 