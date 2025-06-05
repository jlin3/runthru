import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

interface SessionMetadata {
  id: string;
  title: string;
  objective: string;
  startTime: number;
  endTime?: number;
  status: string;
  steps: SessionStep[];
  screenshots: string[];
  conversationHistory: any[];
  duration?: number;
  totalScreenshots: number;
  videoPath?: string;
}

interface SessionStep {
  id: number;
  instruction: string;
  action: string;
  timestamp: number;
  success: boolean;
  result?: string;
  screenshot?: string;
  error?: string;
  aiThinking?: string;
}

interface VoiceOverScript {
  title: string;
  overview: string;
  duration: string;
  segments: VoiceOverSegment[];
  conclusion: string;
  metadata: {
    sessionId: string;
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    generatedAt: string;
  };
}

interface VoiceOverSegment {
  stepId: number;
  timestamp: string;
  action: string;
  narration: string;
  screenshotPath?: string;
  duration: string;
  tone: 'informative' | 'excited' | 'cautious' | 'celebratory' | 'explanatory';
}

export class MetadataVoiceAgent {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Generate a voice-over script for a CUA session
   */
  async generateVoiceOverScript(sessionId: string): Promise<VoiceOverScript> {
    try {
      console.log(`🎙️ Generating voice-over script for session: ${sessionId}`);

      // Load session metadata
      const sessionData = await this.loadSessionData(sessionId);
      
      // Analyze screenshots for visual context
      const visualAnalysis = await this.analyzeScreenshots(sessionData);
      
      // Generate the voice-over script
      const script = await this.createVoiceOverScript(sessionData, visualAnalysis);
      
      // Save the script
      await this.saveVoiceOverScript(sessionId, script);
      
      console.log(`✅ Voice-over script generated successfully for ${sessionId}`);
      return script;

    } catch (error) {
      console.error('Error generating voice-over script:', error);
      throw error;
    }
  }

  /**
   * Load session data from the JSON file
   */
  private async loadSessionData(sessionId: string): Promise<SessionMetadata> {
    const sessionPath = path.join('uploads', 'cua-sessions', sessionId, 'session.json');
    
    if (!fs.existsSync(sessionPath)) {
      throw new Error(`Session data not found: ${sessionId}`);
    }

    const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
    
    // Calculate additional metadata
    const duration = sessionData.endTime ? sessionData.endTime - sessionData.startTime : Date.now() - sessionData.startTime;
    const totalScreenshots = sessionData.screenshots?.length || 0;
    
    // Check for video file
    const sessionDir = path.join('uploads', 'cua-sessions', sessionId);
    const videoFiles = fs.readdirSync(sessionDir).filter(file => file.endsWith('.mp4') || file.endsWith('.webm'));
    const videoPath = videoFiles.length > 0 ? path.join(sessionDir, videoFiles[0]) : undefined;

    return {
      ...sessionData,
      duration,
      totalScreenshots,
      videoPath
    };
  }

  /**
   * Analyze screenshots to understand visual context
   */
  private async analyzeScreenshots(sessionData: SessionMetadata): Promise<string[]> {
    const visualAnalyses: string[] = [];

    for (let i = 0; i < Math.min(sessionData.screenshots.length, 5); i++) {
      const screenshotPath = sessionData.screenshots[i];
      
      try {
        const analysis = await this.analyzeScreenshot(screenshotPath);
        visualAnalyses.push(analysis);
      } catch (error) {
        console.error(`Error analyzing screenshot ${screenshotPath}:`, error);
        visualAnalyses.push("Screenshot analysis unavailable");
      }
    }

    return visualAnalyses;
  }

  /**
   * Analyze a single screenshot using OpenAI Vision
   */
  private async analyzeScreenshot(screenshotPath: string): Promise<string> {
    const fullPath = path.resolve(screenshotPath);
    
    if (!fs.existsSync(fullPath)) {
      return "Screenshot not found";
    }

    const imageBuffer = fs.readFileSync(fullPath);
    const base64Image = imageBuffer.toString('base64');

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o", // Using the latest available model
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Describe what's happening in this screenshot from a browser automation session. Focus on the UI elements, current page, and any visible actions or states. Keep it concise and descriptive for voice-over narration."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 200
    });

    return response.choices[0]?.message?.content || "Unable to analyze screenshot";
  }

  /**
   * Create the voice-over script using OpenAI
   */
  private async createVoiceOverScript(sessionData: SessionMetadata, visualAnalysis: string[]): Promise<VoiceOverScript> {
    const prompt = this.buildVoiceOverPrompt(sessionData, visualAnalysis);

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o", // Using the latest available model
      messages: [
        {
          role: "system",
          content: `You are a clear, human-sounding narrator creating a voice-over that matches an existing screen-recording for stakeholders and PMs.

🎯 GOAL  
Produce a concise, first-person narration (≤ 300 spoken words) that follows the **exact order and timing** of the recording, describing only what viewers see and do.  
No greetings, pleasantries, or wrap-up—just the play-by-play.

🔧 INPUTS  
1. **TIMELINE_JSON** – ordered events with timestamp t, action, detail.  
2. **SCREENSHOTS** – one per event, aligned to the timeline.  
   • Describe what is visible; **never** mention taking a screenshot or any file name/path.  
3. **TARGET_TEST_SCRIPT** – QA checklist.  
   • When an event fulfils a step, append "— step X verified."

📜 OUTPUT REQUIREMENTS  
For **each event** in TIMELINE_JSON, in order:  
• Begin with the timestamp in [mm:ss] or [ss.s].  
• In 1–2 short sentences, describe the user action and what appears on screen.  
   – If action is "screenshot" or "analyze," *ignore the capture itself* and simply describe what the viewer sees at that moment.  
• If the event satisfies a TEST_SCRIPT step, append "— step X verified."  
• Keep each narration chunk under ~12 spoken seconds.

🗣️ STYLE EXAMPLE  
[00:00] I open the Marketplace page; profile cards load in a neat grid.

[00:04] I click Max's profile. His available 30-minute session is highlighted.

[00:09] The booking page shows a calendar widget—step 2 verified.

[00:15] I pick May 12 at 10 A.M. and hit "Confirm Date & Time."

[00:19] The checkout form appears, ready for my details.

• Professional yet conversational—first-person, present tense, plain language.  
• Contractions welcome ("I'm," "I'll").  
• **Do not** say "screenshot saved," "capturing," "loading," or other internal logging terms.  
• No technical jargon unless a one-phrase explanation is provided.  
• Do **not** reveal paths, IDs, code, or metadata.

⚠️ RULES  
• Follow timeline order precisely; no invented actions or visuals.  
• Entire script ≤ 300 words.

**OUTPUT FORMAT**  
Return plain text with one blank line between events, exactly as in the style example above.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1000, // Reduced for more concise output
      temperature: 0.7 // Balanced for natural but consistent narration
    });

    const scriptContent = response.choices[0]?.message?.content || "Unable to generate script";
    
    // Debug logging
    console.log('🔍 AI Generated Script Content:');
    console.log('=====================================');
    console.log(scriptContent);
    console.log('=====================================');
    
    return this.parseVoiceOverScript(sessionData, scriptContent);
  }

  /**
   * Build the prompt for voice-over script generation
   */
  private buildVoiceOverPrompt(sessionData: SessionMetadata, visualAnalysis: string[]): string {
    const successfulSteps = sessionData.steps.filter(step => step.success).length;
    const failedSteps = sessionData.steps.filter(step => !step.success).length;
    const durationMinutes = sessionData.duration ? Math.round(sessionData.duration / 1000 / 60 * 10) / 10 : 0;

    return `**TIMELINE_JSON:**
${sessionData.steps.map((step, index) => {
  const timestamp = this.formatTimestamp(step.timestamp - sessionData.startTime);
  return `${index + 1}. [${timestamp}] ${step.action}: ${step.instruction}
   Result: ${step.success ? (step.result || 'Success') : (step.error || 'Failed')}`;
}).join('\n')}

**SCREENSHOTS:**
${visualAnalysis.map((analysis, i) => `Screenshot ${i + 1}: ${analysis}`).join('\n')}

**TARGET_TEST_SCRIPT:**
Objective: ${sessionData.objective}
Test Steps to Verify:
${sessionData.steps.map((step, i) => `${i + 1}. ${step.instruction} - ${step.success ? '✓ COMPLETED' : '✗ FAILED'}`).join('\n')}

**SESSION INFO:**
- Duration: ${durationMinutes} minutes
- Success Rate: ${Math.round((successfulSteps / sessionData.steps.length) * 100)}%
- Total Events: ${sessionData.steps.length}

Generate a clear, timeline-based voice-over narration that describes what happens at each timestamp and what's visible on screen.`;
  }

  /**
   * Parse the generated script content into structured format
   */
  private parseVoiceOverScript(sessionData: SessionMetadata, scriptContent: string): VoiceOverScript {
    const lines = scriptContent.split('\n').filter(line => line.trim());
    
    // Extract title (first non-empty line or generate default)
    const title = lines[0]?.replace(/^#+\s*/, '') || `${sessionData.title} - Demo`;
    
    // For timeline-based narration, use minimal defaults
    let overview = `Quick walkthrough of ${sessionData.title}.`;
    let conclusion = `That's the complete walkthrough.`;
    
    // Try to extract intro from AI content (first few lines before timestamps)
    const introMatch = scriptContent.match(/^([^[]+?)(?=\[|$)/);
    if (introMatch && introMatch[1] && introMatch[1].trim().length > 20) {
      overview = introMatch[1].trim();
    }
    
    // Generate segments using AI-generated content with timestamp parsing
    const segments: VoiceOverSegment[] = sessionData.steps.map((step, index) => {
      const stepDuration = index < sessionData.steps.length - 1 
        ? Math.round((sessionData.steps[index + 1].timestamp - step.timestamp) / 1000)
        : 30;
      
      const timestamp = this.formatTimestamp(step.timestamp - sessionData.startTime);
      
      // Extract narration from AI content by looking for timestamp blocks
      let narration = '';
      
      // Look for timestamp pattern [X:XX] followed by content
      const timestampPattern = new RegExp(`\\[${timestamp.replace(':', ':')}\\]([^\\[]*?)(?=\\[|$)`, 'i');
      const match = scriptContent.match(timestampPattern);
      
      if (match && match[1]) {
        // Clean up the extracted narration
        narration = match[1]
          .trim()
          .replace(/^[^\w]*/, '') // Remove leading non-word characters
          .replace(/\s+/g, ' ') // Normalize whitespace
          .slice(0, 200); // Limit length
      }
      
      // If no AI narration found, use human-readable fallback
      if (!narration || narration.length < 10) {
        narration = this.generateTimelineNarration(step, index);
      }
      
      return {
        stepId: step.id,
        timestamp,
        action: step.action,
        narration,
        screenshotPath: step.screenshot,
        duration: `${stepDuration}s`,
        tone: step.success ? 'informative' : 'explanatory'
      };
    });

    const successfulSteps = sessionData.steps.filter(step => step.success).length;
    const failedSteps = sessionData.steps.filter(step => !step.success).length;

    return {
      title,
      overview,
      duration: this.formatDuration(sessionData.duration || 0),
      segments,
      conclusion,
      metadata: {
        sessionId: sessionData.id,
        totalSteps: sessionData.steps.length,
        successfulSteps,
        failedSteps,
        generatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Generate timeline-based narration in the human-sounding style
   */
  private generateTimelineNarration(step: SessionStep, index: number): string {
    const humanActions: { [key: string]: string } = {
      'navigate': 'navigate to',
      'click': 'click',
      'type': 'type into',
      'scroll': 'scroll down',
      'screenshot': 'capture',
      'analyze': 'check',
      'wait': 'wait for'
    };

    const action = humanActions[step.action] || step.action;
    
    if (step.success) {
      if (step.result && step.result.includes('Page loaded:')) {
        const pageName = step.result.replace('Page loaded:', '').trim();
        return `I ${action} ${step.instruction.replace('Navigate to', '').trim()}. ${pageName} loads successfully.`;
      } else if (step.result && step.result.includes('Screenshot saved:')) {
        return `I ${action} the current screen for reference.`;
      } else if (step.result && step.result.includes('Page Analysis:')) {
        return `I ${action} the page content. The page shows the main ${step.instruction.toLowerCase()} interface.`;
      } else {
        return `I ${action} ${step.instruction.toLowerCase()}. This works smoothly.`;
      }
    } else {
      return `I try to ${action} ${step.instruction.toLowerCase()}, but encounter an issue. ${step.error ? step.error.split('.')[0] + '.' : 'I\\'ll need to try a different approach.'}`;
    }
  }

  /**
   * Save the voice-over script to file
   */
  private async saveVoiceOverScript(sessionId: string, script: VoiceOverScript): Promise<void> {
    const sessionDir = path.join('uploads', 'cua-sessions', sessionId);
    const scriptPath = path.join(sessionDir, 'voiceover-script.json');
    const readablePath = path.join(sessionDir, 'voiceover-script.md');

    // Save JSON version
    fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2));

    // Save readable markdown version
    const markdown = this.convertScriptToMarkdown(script);
    fs.writeFileSync(readablePath, markdown);

    console.log(`📝 Voice-over script saved to: ${scriptPath}`);
  }

  /**
   * Convert script to readable markdown format
   */
  private convertScriptToMarkdown(script: VoiceOverScript): string {
    return `# ${script.title}

## Overview
${script.overview}

**Duration:** ${script.duration}  
**Total Steps:** ${script.metadata.totalSteps}  
**Success Rate:** ${Math.round((script.metadata.successfulSteps / script.metadata.totalSteps) * 100)}%

## Voice-Over Script

${script.segments.map(segment => `
### Step ${segment.stepId} (${segment.timestamp})
**Action:** ${segment.action}  
**Duration:** ${segment.duration}  
**Tone:** ${segment.tone}

${segment.narration}

${segment.screenshotPath ? `*Screenshot: ${segment.screenshotPath}*` : ''}
`).join('\n')}

## Conclusion
${script.conclusion}

---
*Generated on ${new Date(script.metadata.generatedAt).toLocaleString()}*
`;
  }

  /**
   * Utility functions
   */
  private formatTimestamp(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private formatDuration(milliseconds: number): string {
    const seconds = Math.round(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  }

  /**
   * Get voice-over script for a session
   */
  async getVoiceOverScript(sessionId: string): Promise<VoiceOverScript | null> {
    try {
      const scriptPath = path.join('uploads', 'cua-sessions', sessionId, 'voiceover-script.json');
      
      if (!fs.existsSync(scriptPath)) {
        return null;
      }

      const scriptData = fs.readFileSync(scriptPath, 'utf8');
      return JSON.parse(scriptData);
    } catch (error) {
      console.error('Error loading voice-over script:', error);
      return null;
    }
  }

  /**
   * List all sessions with voice-over scripts
   */
  async listVoiceOverScripts(): Promise<{ sessionId: string; title: string; generatedAt: string }[]> {
    try {
      const sessionsDir = path.join('uploads', 'cua-sessions');
      const sessions = fs.readdirSync(sessionsDir);
      const scriptsInfo = [];

      for (const sessionId of sessions) {
        const scriptPath = path.join(sessionsDir, sessionId, 'voiceover-script.json');
        
        if (fs.existsSync(scriptPath)) {
          const script = JSON.parse(fs.readFileSync(scriptPath, 'utf8'));
          scriptsInfo.push({
            sessionId,
            title: script.title,
            generatedAt: script.metadata.generatedAt
          });
        }
      }

      return scriptsInfo;
    } catch (error) {
      console.error('Error listing voice-over scripts:', error);
      return [];
    }
  }
} 