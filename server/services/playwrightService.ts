import { chromium, firefox, webkit, type Browser, type BrowserContext, type Page } from "playwright";
import path from "path";
import fs from "fs";

interface TimelineStep {
  label: string;
  start: number;
  end: number;
  img: string;
}

export class PlaywrightService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private isRecording = false;
  private timeline: TimelineStep[] = [];
  private recordingStartTime = 0;

  async startRecording(
    targetUrl: string,
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
      this.timeline = [];
      this.recordingStartTime = Date.now();
      
      // Launch browser
      progressCallback("Launching browser", 15);
      
      const browserType = this.getBrowserType(browserConfig.browser);
      this.browser = await browserType.launch({
        headless: browserConfig.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
      });

      // Parse viewport
      const [width, height] = browserConfig.viewport.split('x').map(Number);
      
      // Create directories
      const videoDir = path.join(process.cwd(), "uploads", "videos");
      const screenshotDir = path.join(process.cwd(), "uploads", "screenshots");
      if (!fs.existsSync(videoDir)) {
        fs.mkdirSync(videoDir, { recursive: true });
      }
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }
      
      this.context = await this.browser.newContext({
        viewport: { width, height },
        recordVideo: {
          dir: videoDir,
          size: { width, height }
        }
      });

      this.page = await this.context.newPage();

      // Execute enhanced test steps with timing and screenshots
      for (let i = 0; i < testSteps.length; i++) {
        if (!this.isRecording) break;
        
        const step = testSteps[i];
        const progress = 20 + Math.floor((i / testSteps.length) * 50);
        
        progressCallback(`Executing: ${step}`, progress);
        
        const stepStartTime = this.getRelativeTime();
        
        // Execute the step with enhanced logic
        await this.executeEnhancedStep(step, i, screenshotDir);
        
        const stepEndTime = this.getRelativeTime();
        
        // Add to timeline
        this.timeline.push({
          label: this.getStepLabel(step),
          start: stepStartTime,
          end: stepEndTime,
          img: `step-${i}.png`
        });
        
        // Add delay between steps for better recording
        await this.page.waitForTimeout(1500);
      }

      progressCallback("Finalizing recording", 70);

      // Save timeline.json
      const timelineFile = path.join(process.cwd(), "uploads", "timeline.json");
      fs.writeFileSync(timelineFile, JSON.stringify(this.timeline, null, 2));
      console.log("📊 Timeline saved:", timelineFile);

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

  private getRelativeTime(): number {
    return (Date.now() - this.recordingStartTime) / 1000;
  }

  private getStepLabel(step: string): string {
    const lowerStep = step.toLowerCase();
    if (lowerStep.includes('navigate') || lowerStep.includes('go to')) {
      return "Navigate to homepage";
    } else if (lowerStep.includes('marketplace')) {
      return "Open marketplace";
    } else if (lowerStep.includes('profile') || lowerStep.includes('linson')) {
      return "Select Jesse Linson profile";
    } else if (lowerStep.includes('book') || lowerStep.includes('session')) {
      return "Book session";
    } else if (lowerStep.includes('payment') || lowerStep.includes('card')) {
      return "Enter payment details";
    } else if (lowerStep.includes('complete')) {
      return "Complete booking";
    } else {
      return step.substring(0, 30) + (step.length > 30 ? "..." : "");
    }
  }

  private async executeEnhancedStep(step: string, stepIndex: number, screenshotDir: string): Promise<void> {
    if (!this.page) throw new Error("Page not initialized");

    const lowerStep = step.toLowerCase();
    
    try {
      if (lowerStep.includes('navigate to') || lowerStep.includes('go to')) {
        const urlMatch = step.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
          await this.page.goto(urlMatch[1], { waitUntil: 'networkidle' });
          await this.page.waitForTimeout(2000); // Let page settle
        }
      } 
      else if (lowerStep.includes('marketplace')) {
        // Enhanced marketplace navigation
        console.log("🔍 Looking for marketplace link...");
        const selectors = [
          'text=Marketplace',
          'a[href*="marketplace"]',
          'nav a:has-text("Marketplace")',
          '[data-testid*="marketplace"]',
          'button:has-text("Marketplace")'
        ];
        
        let clicked = false;
        for (const selector of selectors) {
          try {
            const element = await this.page.locator(selector).first();
            if (await element.isVisible({ timeout: 3000 })) {
              console.log(`✅ Found marketplace with selector: ${selector}`);
              await element.click();
              clicked = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (!clicked) {
          console.log("⚠️ Marketplace link not found, trying scroll and search...");
          await this.page.mouse.wheel(0, 500);
          await this.page.waitForTimeout(1000);
        }
        
        await this.page.waitForTimeout(3000); // Wait for marketplace page
      }
      else if (lowerStep.includes('linson') || lowerStep.includes('profile')) {
        // Enhanced profile selection for Jesse Linson
        console.log("🔍 Looking for Jesse Linson profile...");
        const profileSelectors = [
          'text=Jesse Linson',
          '[data-testid*="jesse"]',
          '.profile:has-text("Jesse")',
          '.creator-card:has-text("Linson")',
          'a:has-text("Jesse Linson")'
        ];
        
        let foundProfile = false;
        for (const selector of profileSelectors) {
          try {
            const profile = await this.page.locator(selector).first();
            if (await profile.isVisible({ timeout: 3000 })) {
              console.log(`✅ Found Jesse Linson profile: ${selector}`);
              await profile.click();
              foundProfile = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (!foundProfile) {
          console.log("⚠️ Jesse Linson profile not found, looking for any profile...");
          const anyProfile = await this.page.locator('.profile, .creator-card, [class*="profile"]').first();
          if (await anyProfile.isVisible({ timeout: 3000 })) {
            await anyProfile.click();
          }
        }
        
        await this.page.waitForTimeout(3000);
      }
      else if (lowerStep.includes('book') || lowerStep.includes('session')) {
        // Enhanced booking button detection
        console.log("🔍 Looking for booking button...");
        const bookingSelectors = [
          'text=Book a Session',
          'text=Book Session',
          'button:has-text("Book")',
          '[data-testid*="book"]',
          '.book-btn, .booking-btn',
          'text=Request Video',
          'text=Personalized Video Request'
        ];
        
        let booked = false;
        for (const selector of bookingSelectors) {
          try {
            const button = await this.page.locator(selector).first();
            if (await button.isVisible({ timeout: 3000 })) {
              console.log(`✅ Found booking button: ${selector}`);
              await button.click();
              booked = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (!booked) {
          console.log("⚠️ Specific booking button not found, trying generic buttons...");
          const anyButton = await this.page.locator('button, .btn, [role="button"]').first();
          if (await anyButton.isVisible({ timeout: 3000 })) {
            await anyButton.click();
          }
        }
        
        await this.page.waitForTimeout(3000);
      }
      else if (lowerStep.includes('payment') || lowerStep.includes('card') || lowerStep.includes('4242')) {
        // Enhanced payment form filling
        console.log("💳 Filling payment details...");
        
        // Fill name
        if (lowerStep.includes('linson')) {
          const nameFields = ['input[name*="name"]', '[placeholder*="name"]', '#name', '.name-input'];
          for (const field of nameFields) {
            try {
              if (await this.page.locator(field).isVisible({ timeout: 2000 })) {
                await this.page.fill(field, 'Jesse Linson');
                break;
              }
            } catch (e) { continue; }
          }
        }
        
        // Fill email
        if (lowerStep.includes('email')) {
          const emailFields = ['input[type="email"]', 'input[name*="email"]', '[placeholder*="email"]'];
          for (const field of emailFields) {
            try {
              if (await this.page.locator(field).isVisible({ timeout: 2000 })) {
                await this.page.fill(field, 'jesselinson@gmail.com');
                break;
              }
            } catch (e) { continue; }
          }
        }
        
        // Fill card number
        if (lowerStep.includes('4242')) {
          const cardFields = ['input[name*="card"]', '[placeholder*="card"]', '#card-number'];
          for (const field of cardFields) {
            try {
              if (await this.page.locator(field).isVisible({ timeout: 2000 })) {
                await this.page.fill(field, '4242424242424242');
                break;
              }
            } catch (e) { continue; }
          }
        }
        
        await this.page.waitForTimeout(2000);
      }
      else if (lowerStep.includes('complete') || lowerStep.includes('submit')) {
        // Enhanced form submission
        console.log("✅ Completing booking...");
        const submitSelectors = [
          'button[type="submit"]',
          'text=Complete',
          'text=Submit',
          'text=Confirm',
          '.submit-btn, .complete-btn'
        ];
        
        for (const selector of submitSelectors) {
          try {
            const button = await this.page.locator(selector).first();
            if (await button.isVisible({ timeout: 3000 })) {
              await button.click();
              break;
            }
          } catch (e) { continue; }
        }
        
        await this.page.waitForTimeout(3000);
      }
      else if (lowerStep.includes('wait') || lowerStep.includes('verify')) {
        await this.page.waitForTimeout(2000);
      }
      else {
        // Generic step execution
        console.log(`⚠️ Generic execution for: ${step}`);
        await this.page.waitForTimeout(1000);
      }
      
      // Take screenshot after each step
      const screenshotPath = path.join(screenshotDir, `step-${stepIndex}.png`);
      await this.page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`📸 Screenshot saved: step-${stepIndex}.png`);
      
    } catch (error) {
      console.warn(`⚠️ Failed to execute step: ${step}`, error instanceof Error ? error.message : String(error));
      // Take screenshot even on error
      try {
        const screenshotPath = path.join(screenshotDir, `step-${stepIndex}-error.png`);
        await this.page.screenshot({ path: screenshotPath, fullPage: false });
      } catch (e) { /* ignore */ }
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
}

export const playwrightService = new PlaywrightService();
