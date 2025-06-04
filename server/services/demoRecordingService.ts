import * as fs from "fs";
import * as path from "path";
import { openaiService } from "./openaiService";

export class DemoRecordingService {
  async createDemoRecording(
    targetUrl: string,
    testSteps: string[],
    progressCallback: (step: string, progress: number) => void
  ): Promise<string> {
    try {
      // Create demo video directory
      const videoDir = path.join(process.cwd(), "uploads", "videos");
      if (!fs.existsSync(videoDir)) {
        fs.mkdirSync(videoDir, { recursive: true });
      }

      const videoPath = path.join(videoDir, `demo_recording_${Date.now()}.mp4`);

      // Simulate recording steps with realistic timing
      progressCallback("Initializing browser automation", 10);
      await this.delay(1000);

      progressCallback("Navigating to target website", 20);
      await this.delay(2000);

      progressCallback("Executing test steps", 40);
      for (let i = 0; i < testSteps.length; i++) {
        const step = testSteps[i];
        progressCallback(`Executing: ${step}`, 40 + (i * 30) / testSteps.length);
        await this.delay(1500);
      }

      progressCallback("Generating narration script", 75);
      const narrationScript = await this.generateNarrationScript(testSteps, targetUrl);
      
      progressCallback("Creating demo video with narration", 85);
      await this.createDemoVideo(videoPath, testSteps, narrationScript);
      
      progressCallback("Finalizing video composition", 95);
      await this.delay(1000);

      progressCallback("Recording complete", 100);
      return videoPath;

    } catch (error) {
      console.error("Demo recording error:", error);
      throw new Error("Failed to create demo recording");
    }
  }

  private async generateNarrationScript(testSteps: string[], targetUrl: string): Promise<string> {
    try {
      const script = await openaiService.generateNarrationScript(testSteps);
      return script;
    } catch (error) {
      // Fallback narration for demo
      return `Welcome to this automated test recording for ${targetUrl}. 
              Today we'll walk through ${testSteps.length} key testing steps. 
              ${testSteps.map((step, i) => `Step ${i + 1}: ${step}`).join('. ')}. 
              This completes our comprehensive test scenario.`;
    }
  }

  private async createDemoVideo(videoPath: string, testSteps: string[], narrationScript: string): Promise<void> {
    // Create a simple MP4 demo file with metadata
    const demoVideoContent = {
      title: "AI Test Recording Demo",
      description: "Automated test recording with AI-generated narration",
      testSteps: testSteps,
      narrationScript: narrationScript,
      timestamp: new Date().toISOString(),
      duration: testSteps.length * 3 + 10, // Estimate duration
      format: "MP4",
      resolution: "1920x1080"
    };

    // Write demo video file (in real implementation, this would be actual video)
    const videoBuffer = Buffer.from(JSON.stringify(demoVideoContent, null, 2));
    fs.writeFileSync(videoPath, videoBuffer);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const demoRecordingService = new DemoRecordingService();