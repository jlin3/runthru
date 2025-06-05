import WebSocket from 'ws';
import { openaiService } from './openaiService';

interface RealtimeConfig {
  model: string;
  voice: string;
  instructions: string;
  temperature: number;
  tools?: any[];
}

export class RealtimeVoiceService {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private sessionConfig: RealtimeConfig;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || "";
    this.sessionConfig = {
      model: "gpt-4o-realtime-preview-2024-10-01",
      voice: "alloy",
      instructions: "",
      temperature: 0.7
    };
  }

  async createQAAssistantSession(): Promise<WebSocket> {
    const instructions = `You are an expert QA assistant specializing in automated test recording and screen capture workflows. Your role is to help users:

1. **Test Configuration**: Guide users through setting up test parameters, browser configurations, and recording options
2. **Test Step Generation**: Help create detailed, executable test steps from user descriptions
3. **Narration Planning**: Assist with planning professional narration for demo videos
4. **Troubleshooting**: Help resolve issues with test setup, execution, or video generation

## Personality
- Professional yet approachable QA expert
- Patient and encouraging with users of all technical levels
- Clear explanations with practical examples
- Focused on quality and best practices

## Key Capabilities
- Analyze user requirements and suggest optimal test configurations
- Break down complex user flows into executable automation steps
- Recommend browser settings, viewport sizes, and recording quality
- Guide narration style and voice selection
- Explain the video generation pipeline
- Troubleshoot common QA automation issues

## Response Style
- Provide step-by-step guidance
- Ask clarifying questions when needed
- Offer practical recommendations
- Explain technical concepts clearly
- Always encourage good testing practices

When users describe what they want to test, help them create comprehensive, executable test plans that will produce high-quality demo videos.`;

    this.sessionConfig.instructions = instructions;
    this.sessionConfig.voice = "nova";
    this.sessionConfig.temperature = 0.5;

    return this.createSession();
  }

  async createNarrationAgentSession(): Promise<WebSocket> {
    const instructions = `You are a professional demo narrator and QA expert who creates engaging, educational narrations for automated test recordings.

## Your Role
Create natural, flowing narration scripts that explain QA test processes in an accessible way for stakeholders, team members, and customers.

## Narration Style
- **Professional but conversational**: Like an expert colleague explaining a process
- **Clear and educational**: Explain what's being tested and why it matters
- **Well-paced**: Allow time for visual actions to complete
- **Contextual**: Provide background on user flows and business value

## Key Principles
- Introduce the test scenario and its purpose
- Describe each action as it happens on screen
- Explain the business value of each interaction
- Point out successful validations and important UI feedback
- Maintain narrative flow throughout the entire test
- Conclude with a summary of test coverage and results

## Technical Approach
- Keep jargon minimal but don't avoid necessary technical terms
- Explain complex interactions in simple terms
- Acknowledge loading times and transitions naturally
- Highlight both happy path and edge case testing

## Voice Characteristics
- Steady, confident pace with natural pauses
- Professional enthusiasm for quality assurance
- Clear articulation for technical terms
- Warm, engaging tone that builds stakeholder confidence

When given test steps and context, create narration that transforms a technical test execution into an engaging, educational demo experience.`;

    this.sessionConfig.instructions = instructions;
    this.sessionConfig.voice = "alloy";
    this.sessionConfig.temperature = 0.7;

    return this.createSession();
  }

  async createTestGeneratorSession(): Promise<WebSocket> {
    const instructions = `You are an expert QA automation engineer specializing in web application testing with tools like Playwright, Selenium, and Cypress.

## Your Expertise
- Web application testing patterns and best practices
- User experience flows and edge case identification
- Browser automation and cross-platform testing
- Accessibility and responsive design testing
- Performance and reliability considerations

## Test Generation Approach
When users describe what they want to test:

1. **Analyze the scenario**: Understand the business flow and user intent
2. **Identify key interactions**: Focus on critical user journeys
3. **Create executable steps**: Generate specific, automation-friendly instructions
4. **Include validations**: Add verification points for expected outcomes
5. **Consider edge cases**: Think about error states and boundary conditions

## Step Format
Generate test steps that are:
- **Specific**: Include exact selectors, text, or UI elements when possible
- **Executable**: Clear enough for automation tools to interpret
- **Realistic**: Follow natural user behavior patterns
- **Comprehensive**: Cover the full user journey
- **Verifiable**: Include checkpoints to confirm expected results

## Technical Considerations
- Cross-browser compatibility requirements
- Mobile/responsive design testing needs
- Performance implications of test actions
- Accessibility compliance verification
- Data dependency and test isolation

Transform user descriptions into professional, comprehensive test plans that ensure thorough quality coverage.`;

    this.sessionConfig.instructions = instructions;
    this.sessionConfig.voice = "echo";
    this.sessionConfig.temperature = 0.3;

    // Add test generation tool
    this.sessionConfig.tools = [
      {
        type: "function",
        name: "generate_test_steps",
        description: "Generate detailed test steps from a test description",
        parameters: {
          type: "object",
          properties: {
            description: {
              type: "string",
              description: "The test scenario description from the user"
            },
            target_url: {
              type: "string",
              description: "The target URL to test"
            },
            user_flow: {
              type: "string",
              description: "The specific user flow or journey to test"
            }
          },
          required: ["description", "target_url"]
        }
      }
    ];

    return this.createSession();
  }

  private async createSession(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const wsUrl = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
      
      this.ws = new WebSocket(wsUrl, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "OpenAI-Beta": "realtime=v1"
        }
      });

      this.ws.on('open', () => {
        console.log('Connected to OpenAI Realtime API');
        
        // Send session configuration
        this.sendMessage({
          type: 'session.update',
          session: this.sessionConfig
        });

        resolve(this.ws!);
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleRealtimeMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('Disconnected from OpenAI Realtime API');
        this.ws = null;
      });
    });
  }

  private handleRealtimeMessage(message: any) {
    console.log('Received message:', message.type);
    
    switch (message.type) {
      case 'session.created':
        console.log('Realtime session created:', message.session.id);
        break;
      case 'session.updated':
        console.log('Session updated successfully');
        break;
      case 'conversation.item.created':
        console.log('New conversation item:', message.item.type);
        break;
      case 'response.audio.delta':
        // Handle streaming audio data
        this.handleAudioDelta(message.delta);
        break;
      case 'response.text.delta':
        // Handle streaming text data
        this.handleTextDelta(message.delta);
        break;
      case 'response.function_call_arguments.delta':
        // Handle function call arguments
        this.handleFunctionCallDelta(message);
        break;
      case 'error':
        console.error('Realtime API error:', message.error);
        break;
    }
  }

  private handleAudioDelta(delta: string) {
    // Handle audio chunks - can be sent to client for real-time playback
    console.log('Audio delta received, length:', delta.length);
  }

  private handleTextDelta(delta: string) {
    // Handle text chunks - can be sent to client for real-time display
    console.log('Text delta:', delta);
  }

  private handleFunctionCallDelta(message: any) {
    // Handle function call arguments for test generation
    console.log('Function call delta:', message);
  }

  sendMessage(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected');
    }
  }

  sendAudio(audioData: ArrayBuffer) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendMessage({
        type: 'input_audio_buffer.append',
        audio: Buffer.from(audioData).toString('base64')
      });
    }
  }

  sendText(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendMessage({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: text
            }
          ]
        }
      });

      // Trigger response generation
      this.sendMessage({
        type: 'response.create'
      });
    }
  }

  async generateTestSteps(description: string, targetUrl: string): Promise<string[]> {
    // Fallback to regular OpenAI API if realtime not available
    try {
      return await openaiService.generateTestSteps(description, targetUrl);
    } catch (error) {
      console.error('Error generating test steps:', error);
      throw error;
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const realtimeVoiceService = new RealtimeVoiceService();