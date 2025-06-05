const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

class ComputerUsingAgent {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.browser = null;
    this.page = null;
    this.context = null;
    this.currentSession = null;
    this.screenshotCount = 0;
    this.stepCount = 0;
  }

  /**
   * Initialize a new CUA session with objective and browser config
   */
  async initializeSession(objective, title = 'CUA Session', config = {}) {
    const sessionId = `cua_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    this.currentSession = {
      id: sessionId,
      title,
      objective,
      startTime: Date.now(),
      steps: [],
      screenshots: [],
      status: 'running',
      browserConfig: {
        headless: false,
        viewport: { width: 1920, height: 1080 },
        recordVideo: true,
        ...config
      }
    };

    // Create session directory
    const sessionDir = path.join('uploads', 'cua-sessions', sessionId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    console.log(`🤖 CUA Session initialized: ${sessionId}`);
    console.log(`📝 Objective: ${objective}`);
    
    // Save initial session data
    const sessionPath = path.join('uploads', 'cua-sessions', sessionId, 'session.json');
    fs.writeFileSync(sessionPath, JSON.stringify(this.currentSession, null, 2));
    
    return sessionId;
  }

  /**
   * Launch browser with recording capabilities
   */
  async launchBrowser() {
    if (!this.currentSession) {
      throw new Error('No active session. Call initializeSession() first.');
    }

    const sessionDir = path.join('uploads', 'cua-sessions', this.currentSession.id);
    
    this.browser = await chromium.launch({
      headless: this.currentSession.browserConfig.headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-extensions',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    const contextOptions = {
      viewport: this.currentSession.browserConfig.viewport,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    // Add video recording if enabled
    if (this.currentSession.browserConfig.recordVideo) {
      contextOptions.recordVideo = {
        dir: sessionDir,
        size: this.currentSession.browserConfig.viewport
      };
    }

    this.context = await this.browser.newContext(contextOptions);
    this.page = await this.context.newPage();

    console.log('🚀 Browser launched with CUA capabilities');
  }

  /**
   * Take screenshot and analyze current state with AI
   */
  async analyzeCurrentState(instruction) {
    if (!this.page || !this.currentSession) {
      throw new Error('Browser not initialized');
    }

    this.screenshotCount++;
    const screenshotPath = path.join(
      'uploads', 
      'cua-sessions', 
      this.currentSession.id, 
      `screenshot-${this.screenshotCount}.png`
    );

    // Take screenshot
    await this.page.screenshot({ path: screenshotPath, fullPage: false });
    this.currentSession.screenshots.push(screenshotPath);

    // Convert screenshot to base64 for OpenAI vision
    const screenshotBuffer = fs.readFileSync(screenshotPath);
    const base64Screenshot = screenshotBuffer.toString('base64');

    // Analyze with OpenAI Vision
    const prompt = instruction 
      ? `You are a Computer-Using Agent (CUA) analyzing a screenshot. Current objective: "${this.currentSession.objective}". Current instruction: "${instruction}". Analyze what you see and suggest the next action.`
      : `You are a Computer-Using Agent (CUA) analyzing a screenshot. Current objective: "${this.currentSession.objective}". Analyze what you see and describe the current state.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64Screenshot}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      });

      const analysis = response.choices[0]?.message?.content || 'Unable to analyze screenshot';
      console.log(`🔍 AI Analysis: ${analysis}`);
      return analysis;
    } catch (error) {
      console.error('❌ Error analyzing screenshot:', error);
      return 'Error analyzing current state';
    }
  }

  /**
   * Execute a step with AI guidance
   */
  async executeStep(instruction) {
    if (!this.page || !this.currentSession) {
      throw new Error('Browser not initialized');
    }

    this.stepCount++;
    const stepStartTime = Date.now();
    
    console.log(`\n🎯 Step ${this.stepCount}: ${instruction}`);

    // Analyze current state
    const aiAnalysis = await this.analyzeCurrentState(instruction);
    
    // Determine action based on instruction and AI analysis
    const action = await this.determineAction(instruction, aiAnalysis);
    
    const step = {
      id: this.stepCount,
      instruction,
      action: action.type,
      selector: action.selector,
      text: action.text,
      url: action.url,
      timestamp: stepStartTime,
      success: false,
      aiDecision: aiAnalysis
    };

    try {
      // Execute the determined action
      await this.performAction(action);
      
      // Wait a moment for changes to take effect
      await this.page.waitForTimeout(1000);
      
      // Take screenshot after action
      const postActionScreenshot = await this.takeStepScreenshot();
      step.screenshot = postActionScreenshot;
      step.success = true;

      console.log(`✅ Step ${this.stepCount} completed successfully`);
      
    } catch (error) {
      step.error = error instanceof Error ? error.message : 'Unknown error';
      step.success = false;
      console.error(`❌ Step ${this.stepCount} failed:`, error);
    }

    this.currentSession.steps.push(step);
    return step;
  }

  /**
   * Determine action based on instruction and AI analysis
   */
  async determineAction(instruction, aiAnalysis) {
    const prompt = `
Based on the instruction and current page analysis, determine the exact action to take.

Instruction: "${instruction}"
Current Page Analysis: "${aiAnalysis}"

Return ONLY a JSON object with this format:
{
  "type": "navigate|click|type|scroll|wait|screenshot|evaluate",
  "selector": "CSS selector if needed",
  "text": "text to type if needed",
  "url": "URL if navigating"
}

Examples:
- To click a button: {"type": "click", "selector": "button[text='Submit']"}
- To type text: {"type": "type", "selector": "input[name='email']", "text": "user@example.com"}
- To navigate: {"type": "navigate", "url": "https://example.com"}
- To scroll: {"type": "scroll"}
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200
      });

      const actionText = response.choices[0]?.message?.content?.trim() || '{}';
      const action = JSON.parse(actionText);
      
      console.log(`🎭 AI determined action:`, action);
      return action;
      
    } catch (error) {
      console.error('❌ Error determining action, using fallback:', error);
      // Fallback action
      return { type: 'screenshot' };
    }
  }

  /**
   * Perform the determined action
   */
  async performAction(action) {
    if (!this.page) throw new Error('Page not initialized');

    switch (action.type) {
      case 'navigate':
        if (action.url) {
          await this.page.goto(action.url, { waitUntil: 'networkidle' });
        }
        break;

      case 'click':
        if (action.selector) {
          await this.page.click(action.selector);
        }
        break;

      case 'type':
        if (action.selector && action.text) {
          await this.page.fill(action.selector, action.text);
        }
        break;

      case 'scroll':
        await this.page.mouse.wheel(0, 300);
        break;

      case 'wait':
        await this.page.waitForTimeout(2000);
        break;

      case 'screenshot':
        await this.takeStepScreenshot();
        break;

      case 'evaluate':
        // Custom JavaScript evaluation if needed
        await this.page.evaluate(() => {
          console.log('CUA evaluation step');
        });
        break;

      default:
        console.log(`⚠️ Unknown action type: ${action.type}`);
    }
  }

  /**
   * Take screenshot for current step
   */
  async takeStepScreenshot() {
    if (!this.page || !this.currentSession) {
      throw new Error('Browser not initialized');
    }

    const screenshotPath = path.join(
      'uploads',
      'cua-sessions',
      this.currentSession.id,
      `step-${this.stepCount}-screenshot.png`
    );

    await this.page.screenshot({ path: screenshotPath, fullPage: false });
    return screenshotPath;
  }

  /**
   * Execute autonomous workflow based on objective
   */
  async executeAutonomousWorkflow(maxSteps = 10) {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    console.log(`🤖 Starting autonomous workflow with objective: ${this.currentSession.objective}`);
    console.log(`📊 Maximum steps: ${maxSteps}`);

    // Launch browser if not already launched
    if (!this.browser) {
      await this.launchBrowser();
    }

    // Generate initial plan with AI
    const plan = await this.generateExecutionPlan();
    console.log(`📋 Execution Plan:\n${plan}`);

    let currentStep = 0;
    while (currentStep < maxSteps && this.currentSession.status === 'running') {
      try {
        // Get next instruction from plan or analyze current state
        const instruction = await this.getNextInstruction(currentStep, plan);
        
        if (!instruction) {
          console.log('✅ Workflow completed - no more instructions');
          break;
        }

        // Execute step
        await this.executeStep(instruction);
        currentStep++;

        // Check if objective is completed
        const isCompleted = await this.checkObjectiveCompletion();
        if (isCompleted) {
          console.log('🎉 Objective completed successfully!');
          break;
        }

      } catch (error) {
        console.error(`❌ Error in step ${currentStep}:`, error);
        this.currentSession.status = 'failed';
        break;
      }
    }

    // Finalize session
    await this.finalizeSession();
    return this.currentSession;
  }

  /**
   * Generate execution plan using AI
   */
  async generateExecutionPlan() {
    const prompt = `
You are a Computer-Using Agent (CUA) planning how to achieve this objective: "${this.currentSession?.objective}"

Create a step-by-step plan with 5-10 specific, actionable steps. Each step should be clear and executable.

Example format:
1. Navigate to the target website
2. Click on the login button
3. Enter username in the email field
4. Enter password in the password field
5. Click submit button
6. Wait for page to load
7. Navigate to the desired section

Objective: ${this.currentSession?.objective}
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500
      });

      return response.choices[0]?.message?.content || 'Unable to generate plan';
    } catch (error) {
      console.error('❌ Error generating plan:', error);
      return 'Error generating execution plan';
    }
  }

  /**
   * Get next instruction based on current progress
   */
  async getNextInstruction(stepNumber, plan) {
    const prompt = `
Execution Plan:
${plan}

Current step number: ${stepNumber + 1}
Objective: ${this.currentSession?.objective}

Based on the plan and current progress, what should be the next specific instruction?
Return ONLY the instruction text, nothing else. If the objective is complete, return "COMPLETE".

Previous steps completed: ${this.currentSession?.steps.length}
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100
      });

      const instruction = response.choices[0]?.message?.content?.trim();
      
      if (instruction === 'COMPLETE' || !instruction) {
        return null;
      }

      return instruction;
    } catch (error) {
      console.error('❌ Error getting next instruction:', error);
      return null;
    }
  }

  /**
   * Check if objective is completed using AI
   */
  async checkObjectiveCompletion() {
    if (!this.page || !this.currentSession) return false;

    // Take current screenshot
    const currentAnalysis = await this.analyzeCurrentState();
    
    const prompt = `
Objective: ${this.currentSession.objective}
Current page analysis: ${currentAnalysis}
Steps completed: ${this.currentSession.steps.length}

Based on the current state, has the objective been completed? 
Answer with only "YES" or "NO".
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 10
      });

      const result = response.choices[0]?.message?.content?.trim().toLowerCase();
      return result === 'yes';
    } catch (error) {
      console.error('❌ Error checking completion:', error);
      return false;
    }
  }

  /**
   * Finalize session and generate summary
   */
  async finalizeSession() {
    if (!this.currentSession) return;

    this.currentSession.endTime = Date.now();
    this.currentSession.status = this.currentSession.status === 'running' ? 'completed' : this.currentSession.status;

    // Close browser and save video
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }

    // Generate session summary
    const summary = await this.generateSessionSummary();
    
    // Save session data
    const sessionPath = path.join('uploads', 'cua-sessions', this.currentSession.id, 'session.json');
    fs.writeFileSync(sessionPath, JSON.stringify({
      ...this.currentSession,
      summary
    }, null, 2));

    console.log(`📊 Session completed: ${this.currentSession.id}`);
    console.log(`⏱️ Duration: ${(this.currentSession.endTime - this.currentSession.startTime) / 1000}s`);
    console.log(`📈 Steps: ${this.currentSession.steps.length}`);
    console.log(`📸 Screenshots: ${this.currentSession.screenshots.length}`);
  }

  /**
   * Generate session summary using AI
   */
  async generateSessionSummary() {
    if (!this.currentSession) return '';

    const stepsText = this.currentSession.steps.map(step => 
      `Step ${step.id}: ${step.instruction} (${step.success ? 'Success' : 'Failed'})`
    ).join('\n');

    const prompt = `
Generate a concise summary of this CUA session:

Objective: ${this.currentSession.objective}
Duration: ${this.currentSession.endTime ? (this.currentSession.endTime - this.currentSession.startTime) / 1000 : 0}s
Status: ${this.currentSession.status}

Steps executed:
${stepsText}

Provide a brief summary of what was accomplished and any notable outcomes.
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300
      });

      return response.choices[0]?.message?.content || 'Summary generation failed';
    } catch (error) {
      console.error('❌ Error generating summary:', error);
      return 'Error generating session summary';
    }
  }

  /**
   * Get current session
   */
  getCurrentSession() {
    return this.currentSession;
  }

  /**
   * Restore session state from loaded session data
   */
  restoreSession(sessionData) {
    this.currentSession = sessionData;
    this.stepCount = sessionData.steps.length;
    this.screenshotCount = sessionData.screenshots.length;
  }

  /**
   * Check if browser is launched
   */
  isBrowserLaunched() {
    return this.browser !== null;
  }

  /**
   * Save current session to disk
   */
  saveSession() {
    if (!this.currentSession) return;
    
    const sessionPath = path.join('uploads', 'cua-sessions', this.currentSession.id, 'session.json');
    fs.writeFileSync(sessionPath, JSON.stringify(this.currentSession, null, 2));
  }

  /**
   * List all CUA sessions
   */
  static listSessions() {
    const sessionsDir = path.join('uploads', 'cua-sessions');
    if (!fs.existsSync(sessionsDir)) {
      return [];
    }
    return fs.readdirSync(sessionsDir);
  }

  /**
   * Load a specific session
   */
  static loadSession(sessionId) {
    try {
      const sessionPath = path.join('uploads', 'cua-sessions', sessionId, 'session.json');
      const sessionData = fs.readFileSync(sessionPath, 'utf-8');
      return JSON.parse(sessionData);
    } catch (error) {
      console.error(`❌ Error loading session ${sessionId}:`, error);
      return null;
    }
  }
}

module.exports = { ComputerUsingAgent }; 