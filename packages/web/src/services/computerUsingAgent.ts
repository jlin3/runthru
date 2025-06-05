import { chromium, Browser, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs-extra';
import { exec } from 'child_process';
import util from 'util';
import { VideoService } from './videoService';
import { OpenAIService } from './openaiService';

const execAsync = util.promisify(exec);

interface SessionEvent {
  id: number;
  timestamp: number;
  action: string;
  detail: any;
  success: boolean;
  screenshot?: string;
}

export class ComputerUsingAgent {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private videoService = new VideoService();
  private openaiService = new OpenAIService();

  private getSessionDir(sessionId: string) {
    return path.join(process.cwd(), 'uploads', 'cua-sessions', sessionId);
  }

  async startSession(sessionId: string, targetUrl: string, testScript: string[]) {
    const sessionDir = this.getSessionDir(sessionId);
    await fs.ensureDir(sessionDir);

    const sessionEvents: SessionEvent[] = [];
    let eventCounter = 0;

    try {
      this.browser = await chromium.launch({
        headless: false, // Should be headed for recording
      });

      const videoPath = path.join(sessionDir, 'video.webm');

      this.context = await this.browser.newContext({
        recordVideo: {
          dir: sessionDir,
          size: { width: 1280, height: 720 },
        },
      });

      this.page = await this.context.newPage();

      for (const step of testScript) {
        eventCounter++;
        const event: SessionEvent = {
          id: eventCounter,
          timestamp: Date.now(),
          action: 'execute_step',
          detail: step,
          success: false,
        };

        try {
          // This is a simplified execution logic.
          // A real implementation would parse the step and perform the action.
          if (step.startsWith('navigate to')) {
            const url = step.replace('navigate to ', '');
            await this.page.goto(url, { waitUntil: 'networkidle' });
          } else if (step.startsWith('click')) {
            const selector = step.replace('click ', '');
            await this.page.click(selector);
          } else if (step.startsWith('type')) {
            const [_, selector, text] = step.match(/type '([^']*)' in '([^']*)'/) || [];
            if (selector && text) {
              await this.page.fill(selector, text);
            }
          } else {
            console.warn(`Unknown step: ${step}`);
          }

          const screenshotFile = `screenshot-${eventCounter}.png`;
          await this.page.screenshot({
            path: path.join(sessionDir, screenshotFile),
          });
          event.screenshot = screenshotFile;
          event.success = true;
        } catch (error) {
          event.success = false;
          console.error(`Failed to execute step: ${step}`, error);
        }
        sessionEvents.push(event);
      }

      await fs.writeJson(path.join(sessionDir, 'session.json'), sessionEvents, { spaces: 2 });
      
      // The video is saved automatically when context is closed.
      const tempVideoPath = await this.page.video()?.path();
      
      await this.context.close();
      await this.browser.close();

      if (tempVideoPath) {
        await fs.move(tempVideoPath, videoPath, { overwrite: true });
        // 2. Video format conversion
        const convertedVideoPath = await this.videoService.convertVideo(videoPath);
        return {
          sessionId,
          videoPath: convertedVideoPath,
          sessionEvents,
        };
      } else {
        throw new Error('Video recording not found.');
      }
    } catch (error) {
      console.error('Error during CUA session:', error);
      // Ensure cleanup
      if (this.context) await this.context.close().catch(e => console.error("Failed to close context", e));
      if (this.browser) await this.browser.close().catch(e => console.error("Failed to close browser", e));
      throw error;
    }
  }

  async generateVoiceover(sessionId: string) {
    const sessionDir = this.getSessionDir(sessionId);
    const sessionEventsPath = path.join(sessionDir, 'session.json');
    const recordingPath = path.join(sessionDir, 'recording.mp4');

    if (!await fs.pathExists(sessionEventsPath) || !await fs.pathExists(recordingPath)) {
        throw new Error('Session data or recording not found.');
    }

    const sessionEvents: SessionEvent[] = await fs.readJson(sessionEventsPath);

    // 3. Voice-over script generation
    const narrationScript = await this.openaiService.generateNarrationFromCUA(sessionEvents, sessionDir);

    // 4. Audio synthesis
    const audioPath = await this.openaiService.synthesizeAudio(narrationScript, path.join(sessionDir, 'voice.mp3'));

    // 5. Muxing audio + video
    const finalVideoPath = await this.videoService.muxVideoAndAudio(recordingPath, audioPath, sessionId);

    return {
        narrationScript,
        audioPath,
        finalVideoPath
    };
  }
}

export const computerUsingAgent = new ComputerUsingAgent(); 