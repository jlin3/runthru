import OpenAI from 'openai';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

interface CUASession {
  id: string;
  title: string;
  objective: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'failed';
  steps: CUAStep[];
  screenshots: string[];
  conversationHistory: OpenAI.Chat.ChatCompletionMessageParam[];
}

interface CUAStep {
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

interface CUATools {
  [key: string]: {
    description: string;
    parameters: any;
    handler: (args: any) => Promise<string>;
  };
}

export class CUAAgentSDK {
  private openai: OpenAI;
  private browser: Browser | null = null;
  private page: Page | null = null;
  private context: BrowserContext | null = null;
  private currentSession: CUASession | null = null;
  private stepCount = 0;
  private tools: CUATools;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Define available tools for the agent
    this.tools = {
      navigate_to_url: {
        description: 'Navigate to a specific URL in the browser',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'The URL to navigate to' }
          },
          required: ['url']
        },
        handler: this.handleNavigate.bind(this)
      },
      take_screenshot: {
        description: 'Take a screenshot of the current page to see what is visible',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        },
        handler: this.handleScreenshot.bind(this)
      },
      click_element: {
        description: 'Click on an element using CSS selector, text content, or description',
        parameters: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector, or description of the element to click' }
          },
          required: ['selector']
        },
        handler: this.handleClick.bind(this)
      },
      type_text: {
        description: 'Type text into an input field',
        parameters: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector or description of the input field' },
            text: { type: 'string', description: 'Text to type' }
          },
          required: ['selector', 'text']
        },
        handler: this.handleType.bind(this)
      },
      scroll_page: {
        description: 'Scroll the page up or down',
        parameters: {
          type: 'object',
          properties: {
            direction: { type: 'string', enum: ['up', 'down'], description: 'Direction to scroll' },
            pixels: { type: 'number', description: 'Number of pixels to scroll', default: 300 }
          },
          required: ['direction']
        },
        handler: this.handleScroll.bind(this)
      },
      analyze_page: {
        description: 'Analyze the current page content and extract key information',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        },
        handler: this.handleAnalyze.bind(this)
      },
      wait_for_element: {
        description: 'Wait for an element to appear on the page',
        parameters: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector of the element to wait for' },
            timeout: { type: 'number', description: 'Timeout in milliseconds', default: 5000 }
          },
          required: ['selector']
        },
        handler: this.handleWait.bind(this)
      }
    };
  }

  /**
   * Initialize a new CUA session
   */
  async initializeSession(objective: string, title: string = 'CUA Session'): Promise<string> {
    const sessionId = `cua_sdk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Create session directory
    const sessionDir = path.join('uploads', 'cua-sessions', sessionId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    this.currentSession = {
      id: sessionId,
      title,
      objective,
      startTime: Date.now(),
      status: 'running',
      steps: [],
      screenshots: [],
      conversationHistory: [
        {
          role: 'system',
          content: `You are a Computer-Using Agent (CUA) that can control web browsers and automate tasks.

OBJECTIVE: ${objective}

You have access to these tools:
- navigate_to_url: Navigate to websites
- take_screenshot: See what's currently on screen
- click_element: Click buttons, links, etc.
- type_text: Fill in forms and input fields
- scroll_page: Scroll to see more content
- analyze_page: Understand page content
- wait_for_element: Wait for elements to load

INSTRUCTIONS:
1. Always take a screenshot first to understand the current state
2. Be methodical and verify each step
3. If something doesn't work, try alternative approaches
4. Break down complex tasks into smaller steps
5. Explain your reasoning for each action

Remember: You are helping achieve this objective: ${objective}`
        }
      ]
    };

    // Save initial session data
    this.saveSession();

    console.log(`🤖 CUA Agent SDK Session initialized: ${sessionId}`);
    console.log(`📝 Objective: ${objective}`);

    return sessionId;
  }

  /**
   * Execute autonomous workflow
   */
  async executeAutonomousWorkflow(maxSteps: number = 15): Promise<CUASession> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    console.log(`🤖 Starting autonomous CUA workflow: ${this.currentSession.objective}`);

    try {
      // Launch browser if needed
      if (!this.browser) {
        await this.launchBrowser();
      }

      let stepCount = 0;
      let consecutiveErrors = 0;

      while (stepCount < maxSteps && this.currentSession.status === 'running') {
        try {
          // Get next action from the AI agent
          const nextAction = await this.getNextAction();
          
          if (!nextAction) {
            console.log('✅ Agent determined objective is complete');
            break;
          }

          // Execute the action
          await this.executeAction(nextAction);
          
          stepCount++;
          consecutiveErrors = 0;

        } catch (error) {
          console.error(`❌ Error in step ${stepCount + 1}:`, error);
          consecutiveErrors++;
          
          if (consecutiveErrors >= 3) {
            console.log('❌ Too many consecutive errors, stopping workflow');
            this.currentSession.status = 'failed';
            break;
          }
          
          // Add error to conversation history
          this.currentSession.conversationHistory.push({
            role: 'user',
            content: `The last action failed with error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try a different approach.`
          });
        }
      }

      // Finalize session
      this.currentSession.status = this.currentSession.status === 'running' ? 'completed' : this.currentSession.status;
      this.currentSession.endTime = Date.now();

      console.log('🎉 Autonomous workflow completed');
      console.log(`📊 Steps executed: ${this.currentSession.steps.length}`);
      console.log(`⏱️ Duration: ${(this.currentSession.endTime - this.currentSession.startTime) / 1000}s`);

    } catch (error) {
      console.error('❌ Autonomous workflow failed:', error);
      this.currentSession.status = 'failed';
      this.currentSession.endTime = Date.now();
    }

    // Cleanup
    await this.cleanup();
    this.saveSession();

    return this.currentSession;
  }

  /**
   * Get next action from AI agent
   */
  private async getNextAction(): Promise<any> {
    if (!this.currentSession) return null;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: this.currentSession.conversationHistory,
      tools: Object.entries(this.tools).map(([name, tool]) => ({
        type: 'function' as const,
        function: {
          name,
          description: tool.description,
          parameters: tool.parameters
        }
      })),
      tool_choice: 'auto',
      max_tokens: 2000
    });

    const message = response.choices[0]?.message;
    if (!message) return null;

    // Add AI response to conversation history
    this.currentSession.conversationHistory.push(message);

    // Check if AI wants to use a tool
    if (message.tool_calls && message.tool_calls.length > 0) {
      return message.tool_calls[0];
    }

    // Check if AI thinks objective is complete
    if (message.content?.toLowerCase().includes('objective is complete') ||
        message.content?.toLowerCase().includes('task is finished') ||
        message.content?.toLowerCase().includes('successfully completed')) {
      return null;
    }

    // If no tool call but has content, treat as analysis
    if (message.content) {
      console.log('🤔 AI Analysis:', message.content);
      return { function: { name: 'take_screenshot', arguments: '{}' } };
    }

    return null;
  }

  /**
   * Execute an action (tool call)
   */
  private async executeAction(toolCall: any): Promise<void> {
    if (!this.currentSession) return;

    const functionName = toolCall.function.name;
    const functionArgs = JSON.parse(toolCall.function.arguments || '{}');

    console.log(`🎯 Executing: ${functionName}(${JSON.stringify(functionArgs)})`);

    if (!this.tools[functionName]) {
      throw new Error(`Unknown tool: ${functionName}`);
    }

    try {
      const result = await this.tools[functionName].handler(functionArgs);
      
      // Add result to conversation history
      this.currentSession.conversationHistory.push({
        role: 'tool',
        content: result,
        tool_call_id: toolCall.id || `tool_${Date.now()}`
      });

      console.log(`✅ Tool result: ${result.substring(0, 100)}...`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      // Add error to conversation history
      this.currentSession.conversationHistory.push({
        role: 'tool',
        content: `Error: ${errorMsg}`,
        tool_call_id: toolCall.id || `tool_${Date.now()}`
      });

      throw error;
    }
  }

  // Tool handlers
  private async handleNavigate(args: { url: string }): Promise<string> {
    if (!this.page) {
      await this.launchBrowser();
    }
    
    if (!this.page) {
      throw new Error('Failed to launch browser');
    }

    await this.page.goto(args.url, { waitUntil: 'networkidle' });
    const title = await this.page.title();
    
    await this.recordStep('navigate', `Navigate to ${args.url}`, true, `Page loaded: ${title}`);
    
    return `Successfully navigated to ${args.url}. Page title: ${title}`;
  }

  private async handleScreenshot(): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const screenshotPath = await this.takeScreenshot();
    await this.recordStep('screenshot', 'Take screenshot', true, `Screenshot saved: ${screenshotPath}`);
    
    // Also analyze the page content
    const title = await this.page.title();
    const url = this.page.url();
    
    return `Screenshot taken and saved. Current page: ${title} (${url})`;
  }

  private async handleClick(args: { selector: string }): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    // Try different approaches to find and click the element
    try {
      // First try as CSS selector
      await this.page.click(args.selector, { timeout: 3000 });
    } catch {
      try {
        // Try as text content
        await this.page.click(`text=${args.selector}`, { timeout: 3000 });
      } catch {
        // Try as partial text
        await this.page.click(`text*=${args.selector}`, { timeout: 3000 });
      }
    }

    await this.recordStep('click', `Click element: ${args.selector}`, true);
    return `Successfully clicked element: ${args.selector}`;
  }

  private async handleType(args: { selector: string; text: string }): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    await this.page.fill(args.selector, args.text);
    await this.recordStep('type', `Type into ${args.selector}`, true, `Text: ${args.text}`);
    return `Successfully typed "${args.text}" into element: ${args.selector}`;
  }

  private async handleScroll(args: { direction: 'up' | 'down'; pixels?: number }): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const pixels = args.pixels || 300;
    const scrollAmount = args.direction === 'down' ? pixels : -pixels;
    
    await this.page.mouse.wheel(0, scrollAmount);
    await this.recordStep('scroll', `Scroll ${args.direction} ${pixels}px`, true);
    return `Successfully scrolled ${args.direction} by ${pixels} pixels`;
  }

  private async handleAnalyze(): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const title = await this.page.title();
    const url = this.page.url();
    const content = await this.page.textContent('body');
    
    // Get visible buttons and links
    const buttons = await this.page.$$eval('button, a, input[type="submit"]', elements => 
      elements.slice(0, 10).map(el => ({
        tag: el.tagName,
        text: el.textContent?.trim() || '',
        type: el.getAttribute('type'),
        href: el.getAttribute('href')
      }))
    );

    const analysis = `
Page Analysis:
- Title: ${title}
- URL: ${url}
- Content length: ${content?.length || 0} characters
- Interactive elements found: ${buttons.length}
- Key buttons/links: ${buttons.map(b => `${b.tag}("${b.text}")`).slice(0, 5).join(', ')}
`;

    await this.recordStep('analyze', 'Analyze page', true, analysis);
    return analysis;
  }

  private async handleWait(args: { selector: string; timeout?: number }): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const timeout = args.timeout || 5000;
    await this.page.waitForSelector(args.selector, { timeout });
    await this.recordStep('wait', `Wait for ${args.selector}`, true);
    return `Successfully waited for element: ${args.selector}`;
  }

  // Helper methods (keeping the same as before)
  private async launchBrowser(): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const sessionDir = path.join('uploads', 'cua-sessions', this.currentSession.id);
    
    this.browser = await chromium.launch({
      headless: false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-extensions',
        '--no-sandbox'
      ]
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: {
        dir: sessionDir,
        size: { width: 1920, height: 1080 }
      }
    });

    this.page = await this.context.newPage();
    console.log('🚀 Browser launched for CUA Agent SDK');
  }

  private async takeScreenshot(): Promise<string> {
    if (!this.page || !this.currentSession) {
      throw new Error('Browser not initialized');
    }

    const screenshotPath = path.join(
      'uploads',
      'cua-sessions',
      this.currentSession.id,
      `screenshot-${Date.now()}.png`
    );

    await this.page.screenshot({ path: screenshotPath, fullPage: false });
    this.currentSession.screenshots.push(screenshotPath);
    
    return screenshotPath;
  }

  private async recordStep(
    action: string,
    instruction: string,
    success: boolean,
    result?: string,
    error?: string
  ): Promise<void> {
    if (!this.currentSession) return;

    this.stepCount++;
    const step: CUAStep = {
      id: this.stepCount,
      instruction,
      action,
      timestamp: Date.now(),
      success,
      result,
      error
    };

    // Take screenshot for this step (if not already a screenshot step)
    if (this.page && action !== 'screenshot') {
      try {
        step.screenshot = await this.takeScreenshot();
      } catch (e) {
        console.error('Failed to take screenshot for step:', e);
      }
    }

    this.currentSession.steps.push(step);
    this.saveSession();

    console.log(`📝 Step ${this.stepCount}: ${instruction} - ${success ? 'SUCCESS' : 'FAILED'}`);
  }

  private async cleanup(): Promise<void> {
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
    this.browser = null;
    this.page = null;
    this.context = null;
  }

  private saveSession(): void {
    if (!this.currentSession) return;

    const sessionPath = path.join(
      'uploads',
      'cua-sessions',
      this.currentSession.id,
      'session.json'
    );

    fs.writeFileSync(sessionPath, JSON.stringify(this.currentSession, null, 2));
  }

  // Public methods
  getCurrentSession(): CUASession | null {
    return this.currentSession;
  }

  static loadSession(sessionId: string): CUASession | null {
    try {
      const sessionPath = path.join('uploads', 'cua-sessions', sessionId, 'session.json');
      const sessionData = fs.readFileSync(sessionPath, 'utf-8');
      return JSON.parse(sessionData);
    } catch (error) {
      console.error(`❌ Error loading session ${sessionId}:`, error);
      return null;
    }
  }

  static listSessions(): string[] {
    const sessionsDir = path.join('uploads', 'cua-sessions');
    if (!fs.existsSync(sessionsDir)) {
      return [];
    }
    return fs.readdirSync(sessionsDir).filter(dir => 
      fs.statSync(path.join(sessionsDir, dir)).isDirectory()
    );
  }

  /**
   * Execute single step manually
   */
  async executeStep(instruction: string): Promise<CUAStep> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    // Add instruction to conversation
    this.currentSession.conversationHistory.push({
      role: 'user',
      content: instruction
    });

    try {
      const nextAction = await this.getNextAction();
      if (nextAction) {
        await this.executeAction(nextAction);
      }
      
      return this.currentSession.steps[this.currentSession.steps.length - 1];
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await this.recordStep('manual_step', instruction, false, undefined, errorMsg);
      return this.currentSession.steps[this.currentSession.steps.length - 1];
    }
  }
}

export { CUASession, CUAStep }; 