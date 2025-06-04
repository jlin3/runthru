import { chromium, firefox, webkit, type Browser, type BrowserContext, type Page } from "playwright";
import path from "path";
import fs from "fs";

export class PlaywrightService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private isRecording = false;

  async startRecording(
    testSteps: string[],
    browserConfig: {
      browser: string;
      viewport: string;
      headless: boolean;
      recordingQuality: string;
    },
    progressCallback: (step: string, progress: number) => void
  ): Promise<string> {
    try {
      this.isRecording = true;
      
      // Launch browser
      progressCallback("Launching browser", 15);
      
      const browserType = this.getBrowserType(browserConfig.browser);
      this.browser = await browserType.launch({
        headless: browserConfig.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      // Parse viewport
      const [width, height] = browserConfig.viewport.split('x').map(Number);
      
      // Create context with video recording
      const videoDir = path.join(process.cwd(), "uploads", "videos");
      if (!fs.existsSync(videoDir)) {
        fs.mkdirSync(videoDir, { recursive: true });
      }

      const videoPath = path.join(videoDir, `recording_${Date.now()}.webm`);
      
      this.context = await this.browser.newContext({
        viewport: { width, height },
        recordVideo: {
          dir: videoDir,
          size: { width, height }
        }
      });

      this.page = await this.context.newPage();

      // Execute test steps
      for (let i = 0; i < testSteps.length; i++) {
        if (!this.isRecording) break;
        
        const step = testSteps[i];
        const progress = 20 + Math.floor((i / testSteps.length) * 50);
        
        progressCallback(`Executing: ${step}`, progress);
        await this.executeStep(step);
        
        // Add delay between steps for better recording
        await this.page.waitForTimeout(1000);
      }

      progressCallback("Finalizing recording", 70);

      // Close page and context to finalize video
      await this.page.close();
      await this.context.close();
      await this.browser.close();

      // Get the actual video file path
      const videoFiles = fs.readdirSync(videoDir).filter(f => f.endsWith('.webm'));
      const latestVideo = videoFiles
        .map(f => ({ name: f, time: fs.statSync(path.join(videoDir, f)).mtime }))
        .sort((a, b) => b.time.getTime() - a.time.getTime())[0];

      if (!latestVideo) {
        throw new Error("Video recording not found");
      }

      return path.join(videoDir, latestVideo.name);
    } catch (error) {
      this.isRecording = false;
      await this.cleanup();
      throw error;
    }
  }

  async stopRecording(): Promise<void> {
    this.isRecording = false;
    await this.cleanup();
  }

  private async cleanup(): Promise<void> {
    try {
      if (this.page) await this.page.close();
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
    
    this.page = null;
    this.context = null;
    this.browser = null;
  }

  private getBrowserType(browserName: string) {
    switch (browserName.toLowerCase()) {
      case 'firefox':
        return firefox;
      case 'webkit':
      case 'safari':
        return webkit;
      case 'chromium':
      case 'chrome':
      default:
        return chromium;
    }
  }

  private async executeStep(step: string): Promise<void> {
    if (!this.page) throw new Error("Page not initialized");

    const lowerStep = step.toLowerCase();
    
    try {
      if (lowerStep.includes('navigate to') || lowerStep.includes('go to')) {
        const urlMatch = step.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
          await this.page.goto(urlMatch[1], { waitUntil: 'networkidle' });
        }
      } else if (lowerStep.includes('click')) {
        // Extract text to click or selector
        const textMatch = step.match(/['"]([^'"]+)['"]/);
        if (textMatch) {
          const text = textMatch[1];
          try {
            // Try clicking by text first
            await this.page.getByText(text).first().click({ timeout: 5000 });
          } catch {
            // Fallback to more generic selectors
            await this.page.locator(`text=${text}`).first().click({ timeout: 5000 });
          }
        } else {
          // Generic click handling
          const buttonSelectors = [
            'button',
            '[role="button"]',
            'input[type="submit"]',
            'input[type="button"]',
            'a'
          ];
          
          for (const selector of buttonSelectors) {
            try {
              await this.page.locator(selector).first().click({ timeout: 2000 });
              break;
            } catch {
              continue;
            }
          }
        }
      } else if (lowerStep.includes('fill') || lowerStep.includes('type') || lowerStep.includes('enter')) {
        const valueMatch = step.match(/['"]([^'"]+)['"].*['"]([^'"]+)['"]/);
        if (valueMatch) {
          const field = valueMatch[1];
          const value = valueMatch[2];
          
          try {
            await this.page.fill(`[placeholder*="${field}" i]`, value);
          } catch {
            try {
              await this.page.fill(`[name*="${field}" i]`, value);
            } catch {
              await this.page.fill('input[type="text"]', value);
            }
          }
        }
      } else if (lowerStep.includes('scroll')) {
        await this.page.mouse.wheel(0, 500);
      } else if (lowerStep.includes('wait') || lowerStep.includes('verify')) {
        await this.page.waitForTimeout(2000);
      }
      
      // Wait a bit after each action
      await this.page.waitForTimeout(500);
      
    } catch (error) {
      console.warn(`Failed to execute step: ${step}`, error);
      // Continue with next step instead of failing completely
    }
  }
}

export const playwrightService = new PlaywrightService();
