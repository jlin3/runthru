# 🤖 RunThru Agent Guide

RunThru now features a powerful AI agent using the OpenAI Agents SDK for TypeScript. This agent can intelligently create, execute, and manage automated tests with natural language instructions.

## 🚀 Quick Start

### CLI Usage

```bash
# Basic page analysis
npm run test-agent "Start recording https://google.com, analyze the page, take a screenshot"

# Full demo with test description
npm run test-agent demo https://example.com "test the login functionality"

# Simple page exploration
npm run test-agent demo https://github.com
```

### API Usage

```bash
# Direct agent instruction
curl -X POST http://localhost:3000/api/agent/run \
  -H "Content-Type: application/json" \
  -d '{"instruction": "Start recording https://google.com, analyze the page"}'

# Demo endpoint
curl -X POST http://localhost:3000/api/agent/demo \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "testDescription": "test contact form"}'
```

## 🛠️ Agent Capabilities

### Core Tools

#### `startRecording(url, viewport?, browser?)`
- Launch browser and start video recording
- Navigate to target URL
- Set up recording context

#### `runBrowserStep(action, target?, value?)`
- **Actions**: `navigate`, `click`, `fill`, `wait`, `scroll`, `press`
- **Examples**:
  - `click("Login button")`
  - `fill("input[type='email']", "test@example.com")`
  - `navigate("https://example.com")`

#### `analyzePage()`
- Extract page title, URL, and interactive elements
- Identify buttons, links, inputs, and other interactive elements
- Return structured analysis

#### `getPageState()`
- Get detailed page state as structured data
- Useful for programmatic analysis

#### `verifyElement(selector, expectedText?)`
- Check if element exists and is visible
- Optionally verify text content
- Returns ✅/❌ status

#### `takeScreenshot(name?)`
- Capture full page screenshot
- Save to uploads/screenshots/
- Optional custom filename

#### `stopRecording()`
- Close browser and finalize video
- Return path to recorded video file

#### `generateTestPlan(description, targetUrl)`
- Generate comprehensive test steps
- Leverage existing OpenAI service

## 🎯 Example Use Cases

### 1. Basic Page Exploration
```bash
npm run test-agent demo https://example.com
```

**What it does:**
- Starts recording
- Analyzes page structure
- Takes screenshots
- Stops recording

### 2. Specific Feature Testing
```bash
npm run test-agent demo https://login.example.com "test login with valid credentials"
```

**What it does:**
- Generates test plan for login flow
- Executes login steps
- Verifies success/failure
- Records entire process

### 3. Custom Instructions
```bash
npm run test-agent "Start recording https://shop.example.com, find the search box, search for 'laptop', click the first result, add to cart, take screenshots at each step"
```

## 🔧 Advanced Features

### Tracing & Debugging
Enable detailed tracing:
```bash
OPENAI_TRACE=1 npm run test-agent demo https://example.com
```

This provides:
- Step-by-step tool execution logs
- Model reasoning traces
- Error debugging information

### Handoffs (Future)
The agent supports handoffs to specialized sub-agents:
- **Navigation Agent**: Page traversal and URL handling
- **Interaction Agent**: Form filling and clicking
- **Verification Agent**: Assertions and validations
- **Reporting Agent**: Test result compilation

### Guardrails (Future)
Built-in safety checks:
- Validate test steps before execution
- Prevent destructive actions
- Schema validation for inputs

## 📁 Output Files

### Videos
- Location: `uploads/videos/`
- Format: `.webm`
- Automatic naming with timestamps

### Screenshots
- Location: `uploads/screenshots/`
- Format: `.png`
- Full page captures

### Traces (when enabled)
- Detailed execution logs
- Model decision reasoning
- Tool call sequences

## 🔗 Integration with Existing Services

The agent leverages existing RunThru services:

### OpenAI Service
- Test step generation
- Narration script creation
- Speech synthesis

### Playwright Service
- Browser automation fallback
- Complex interaction patterns

### Video Service
- Post-processing workflows
- Format conversion
- Compression

### Storage Services
- Supabase integration
- Google Cloud Storage
- Multi-tier fallbacks

## 🚀 Deployment

### GitHub Actions Integration
The agent works seamlessly with the existing CI/CD pipeline:

```yaml
# In .github/workflows/deploy.yml
- name: Run Agent Tests
  run: npm run test-agent demo ${{ env.TEST_URL }}
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    OPENAI_TRACE: 1
```

### Production Considerations
- **Environment Variables**: Same as existing setup
- **Browser Dependencies**: Already configured for GAE
- **File Storage**: Uses existing unified storage service
- **Resource Limits**: Agent automatically manages browser lifecycle

## 📊 Monitoring & Analytics

Track agent performance:
- Execution time per instruction
- Success/failure rates
- Tool usage patterns
- Browser automation metrics

## 🔮 Future Enhancements

### NPM Package
Create `@runthru/agent` package:
```bash
npx @runthru/agent demo https://example.com
```

### VS Code Extension
Direct integration with development workflow:
- Generate tests from code comments
- Live test execution
- Results in editor

### Multi-Agent Orchestration
- Parallel test execution
- Agent specialization
- Collaborative test creation

## 🛟 Troubleshooting

### Common Issues

**Agent fails to start:**
```bash
# Check environment variables
echo $OPENAI_API_KEY

# Verify dependencies
npm ls openai-agents
```

**Browser doesn't launch:**
```bash
# Check Playwright installation
npx playwright install

# Test browser availability
npm run test-agent "takeScreenshot()"
```

**Tool execution errors:**
- Enable tracing: `OPENAI_TRACE=1`
- Check browser console logs
- Verify element selectors

### Debug Mode
```bash
# Maximum verbosity
DEBUG=* OPENAI_TRACE=1 npm run test-agent demo https://example.com
```

## 💡 Best Practices

1. **Clear Instructions**: Be specific about desired actions
2. **Incremental Testing**: Start with simple page analysis
3. **Error Handling**: Always include cleanup in scripts
4. **Resource Management**: The agent handles browser lifecycle
5. **Trace Analysis**: Use tracing for complex debugging

---

**The agent transforms RunThru from a recording tool into an intelligent QA automation platform!** 🎉 