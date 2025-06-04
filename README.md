# RunThru - AI-Powered QA Screen Recording Agent

An intelligent system that automatically creates demo videos by executing web user flows with screen recording and synthetic narration capabilities.

## Features

- **AI Test Generation**: Uses OpenAI GPT-4o to generate detailed test steps from natural language descriptions
- **Automated Browser Control**: Playwright-powered browser automation for reliable test execution
- **Screen Recording**: Captures high-quality video recordings of test workflows
- **AI Narration**: Generates professional voiceover scripts and speech using OpenAI's text-to-speech
- **Video Composition**: Creates polished demo videos with avatar overlays and synchronized audio
- **Real-time Progress**: WebSocket-powered real-time updates during recording sessions

## Core Technologies

- **Frontend**: React with Vite, TypeScript, TailwindCSS
- **Backend**: Express.js with TypeScript
- **AI Integration**: OpenAI GPT-4o for test generation and narration, OpenAI TTS for voiceover
- **Browser Automation**: Playwright for reliable cross-browser testing
- **Video Processing**: FFmpeg for video composition and editing
- **Real-time Communication**: WebSocket for live progress updates

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Environment Variables**
   ```bash
   OPENAI_API_KEY=your_openai_api_key
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Access the Application**
   Open http://localhost:5000 in your browser

## Usage

1. **Enter Website URL**: Provide the target website for testing
2. **Describe Test Scenario**: Use natural language to describe what you want to test
3. **Generate Recording**: The system will:
   - Generate detailed test steps using AI
   - Execute browser automation with screen recording
   - Create professional narration script
   - Generate voiceover using OpenAI's text-to-speech
   - Compose final video with audio and visual elements

## Example Test Scenarios

- "Test the user registration flow by creating a new account and verifying email confirmation"
- "Navigate to the marketplace, browse profiles, and complete a booking process"
- "Test the checkout flow with form validation and payment processing"

## Architecture

- **Input Processing**: AI-powered interpretation of test requirements
- **Browser Automation**: Playwright-driven test execution with screen capture
- **Narration Generation**: OpenAI-generated scripts and synthetic voice
- **Video Composition**: FFmpeg-powered video editing with avatar overlays
- **Real-time Updates**: WebSocket communication for progress tracking

## API Endpoints

- `POST /api/recordings/generate-steps` - Generate test steps from description
- `POST /api/recordings` - Create new recording session
- `POST /api/recordings/:id/start` - Start recording execution
- `GET /api/recordings/:id/download` - Download completed video

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details