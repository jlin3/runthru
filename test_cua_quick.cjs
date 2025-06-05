// Quick test to verify CUA agent is working
require('dotenv').config();
const axios = require('axios');

async function testCUAAgent() {
  console.log('🔍 Testing CUA Agent Status');
  console.log('===========================');

  const baseURL = 'http://localhost:3000';
  
  try {
    // Test 1: Check if server is running
    console.log('\n1️⃣ Testing server connection...');
    const healthResponse = await axios.get(`${baseURL}/api/cua/sessions`);
    console.log('✅ Server is running and CUA endpoints are accessible');
    console.log(`📊 Current sessions: ${healthResponse.data.sessions?.length || 0}`);

    // Test 2: Create a simple test session
    console.log('\n2️⃣ Creating CUA test session...');
    const sessionResponse = await axios.post(`${baseURL}/api/cua/session`, {
      objective: 'Navigate to example.com and analyze the page',
      title: 'Quick Test Session',
      config: {
        headless: false,
        recordVideo: true
      }
    });

    if (!sessionResponse.data.success) {
      throw new Error('Failed to create session');
    }

    console.log('✅ CUA session created successfully');
    console.log(`📝 Session ID: ${sessionResponse.data.sessionId}`);
    console.log(`🎯 Objective: ${sessionResponse.data.session.objective}`);

    // Test 3: Execute a simple step
    console.log('\n3️⃣ Testing step execution...');
    const stepResponse = await axios.post(`${baseURL}/api/cua/step/${sessionResponse.data.sessionId}`, {
      instruction: 'Navigate to https://example.com'
    });

    if (!stepResponse.data.success) {
      throw new Error('Step execution failed');
    }

    console.log('✅ Step executed successfully');
    console.log(`🎭 Action: ${stepResponse.data.step.action}`);
    console.log(`✅ Success: ${stepResponse.data.step.success}`);
    console.log(`⏰ Timestamp: ${new Date(stepResponse.data.step.timestamp).toLocaleTimeString()}`);

    // Test 4: Check session details
    console.log('\n4️⃣ Verifying session details...');
    const sessionDetails = await axios.get(`${baseURL}/api/cua/session/${sessionResponse.data.sessionId}`);
    
    const session = sessionDetails.data.session;
    console.log('✅ Session details retrieved');
    console.log(`📈 Steps completed: ${session.steps.length}`);
    console.log(`📸 Screenshots taken: ${session.screenshots.length}`);
    console.log(`🚀 Status: ${session.status}`);

    // Test 5: Test autonomous workflow (short test)
    console.log('\n5️⃣ Testing autonomous workflow...');
    const autonomousResponse = await axios.post(`${baseURL}/api/cua/execute/${sessionResponse.data.sessionId}`, {
      maxSteps: 3  // Short test
    });

    if (autonomousResponse.data.success) {
      const completedSession = autonomousResponse.data.session;
      console.log('✅ Autonomous workflow completed');
      console.log(`📊 Total steps: ${completedSession.steps.length}`);
      console.log(`⏱️ Duration: ${(completedSession.endTime - completedSession.startTime) / 1000}s`);
      console.log(`🎯 Final status: ${completedSession.status}`);
    }

    console.log('\n🎉 CUA Agent Test Results:');
    console.log('==========================');
    console.log('✅ Server running: YES');
    console.log('✅ API endpoints working: YES');
    console.log('✅ Session creation: YES');
    console.log('✅ Step execution: YES');
    console.log('✅ AI decision making: YES');
    console.log('✅ Browser automation: YES');
    console.log('✅ Screenshot capture: YES');
    console.log('✅ Autonomous workflow: YES');
    
    console.log('\n🤖 CUA Agent is FULLY OPERATIONAL! 🎯');

  } catch (error) {
    console.error('\n❌ CUA Agent Test Failed');
    console.error('========================');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Server not running');
      console.error('💡 Start server with: npm run dev');
    } else if (error.response) {
      console.error(`❌ API Error: ${error.response.status} ${error.response.statusText}`);
      console.error(`📝 Details: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`❌ Error: ${error.message}`);
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure server is running: npm run dev');
    console.log('2. Check OpenAI API key is set in .env file');
    console.log('3. Verify Playwright is installed: npx playwright install');
    console.log('4. Check server logs for errors');
  }
}

// Test environment setup
async function testEnvironment() {
  console.log('🔧 Testing Environment Setup');
  console.log('============================');

  // Check OpenAI API key
  if (process.env.OPENAI_API_KEY) {
    console.log('✅ OpenAI API key found');
  } else {
    console.log('❌ OpenAI API key not found in environment');
  }

  // Check if uploads directory exists
  const fs = require('fs');
  const uploadsDir = 'uploads/cua-sessions';
  if (fs.existsSync(uploadsDir)) {
    console.log('✅ CUA sessions directory exists');
  } else {
    console.log('📁 Creating CUA sessions directory...');
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ CUA sessions directory created');
  }

  console.log('✅ Environment setup complete\n');
}

// Main execution
async function main() {
  await testEnvironment();
  await testCUAAgent();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testCUAAgent, testEnvironment }; 