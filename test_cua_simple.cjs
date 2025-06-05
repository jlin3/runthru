// Simple test for Computer-Using Agent (CUA)
require('dotenv').config();

async function testSimpleCUA() {
  console.log('🚀 Simple CUA Test');
  console.log('==================');

  try {
    // Import the CUA class (need to handle TypeScript import)
    const path = require('path');
    const { execSync } = require('child_process');
    
    // Quick test via API
    const axios = require('axios');
    const baseURL = 'http://localhost:3000';
    
    console.log('📡 Testing CUA API endpoints...');
    
    // Test if server is running
    try {
      await axios.get(`${baseURL}/api/cua/sessions`);
      console.log('✅ Server is running');
    } catch (error) {
      console.log('❌ Server not running. Start with: npm run dev');
      return;
    }

    // Create a simple test session
    const sessionResponse = await axios.post(`${baseURL}/api/cua/session`, {
      objective: 'Navigate to example.com and take a screenshot',
      title: 'Simple Test Session',
      config: {
        headless: false,
        recordVideo: true
      }
    });

    if (sessionResponse.data.success) {
      console.log('✅ CUA session created:', sessionResponse.data.sessionId);
      
      // Execute a single step
      const stepResponse = await axios.post(`${baseURL}/api/cua/step/${sessionResponse.data.sessionId}`, {
        instruction: 'Navigate to https://example.com'
      });

      if (stepResponse.data.success) {
        console.log('✅ CUA step executed successfully');
        console.log('📊 Step details:', {
          action: stepResponse.data.step.action,
          success: stepResponse.data.step.success,
          timestamp: new Date(stepResponse.data.step.timestamp).toLocaleTimeString()
        });
      } else {
        console.log('❌ CUA step failed');
      }

      // Get session details
      const sessionDetails = await axios.get(`${baseURL}/api/cua/session/${sessionResponse.data.sessionId}`);
      if (sessionDetails.data.success) {
        const session = sessionDetails.data.session;
        console.log('📈 Session Summary:');
        console.log(`   - Steps: ${session.steps.length}`);
        console.log(`   - Screenshots: ${session.screenshots.length}`);
        console.log(`   - Status: ${session.status}`);
        console.log(`   - Objective: ${session.objective}`);
      }

    } else {
      console.log('❌ Failed to create CUA session');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test components individually
async function testCUADirectly() {
  console.log('\n🧪 Direct CUA Component Test');
  console.log('============================');

  try {
    // Test if we can load the module
    console.log('📦 Testing module import...');
    
    // Since it's TypeScript, we'll need to compile or use ts-node
    const tsNode = require('ts-node');
    tsNode.register({
      transpileOnly: true,
      compilerOptions: {
        module: 'commonjs'
      }
    });

    const { ComputerUsingAgent } = require('./server/services/computerUsingAgent.ts');
    console.log('✅ CUA module loaded successfully');

    // Test basic functionality
    const cua = new ComputerUsingAgent();
    console.log('✅ CUA instance created');

    // Test session creation
    const sessionId = await cua.initializeSession(
      'Simple test objective',
      'Direct Test Session'
    );
    console.log('✅ Session initialized:', sessionId);

    // Test directory creation
    const fs = require('fs');
    const sessionDir = `uploads/cua-sessions/${sessionId}`;
    if (fs.existsSync(sessionDir)) {
      console.log('✅ Session directory created');
    } else {
      console.log('❌ Session directory not found');
    }

    console.log('✅ Direct component test completed');

  } catch (error) {
    console.error('❌ Direct test failed:', error.message);
    console.log('💡 Make sure you have ts-node installed: npm install -g ts-node');
  }
}

// Quick feature overview
function showCUAFeatures() {
  console.log('\n🌟 CUA Agent Features');
  console.log('=====================');
  console.log('✨ Computer-Using Agent with OpenAI GPT-4o Vision');
  console.log('🎯 Autonomous workflow execution');
  console.log('📸 Screenshot analysis and AI decision making');
  console.log('🎥 Screen recording capabilities');
  console.log('🤖 Real-time browser automation');
  console.log('🔄 Step-by-step execution tracking');
  console.log('📊 Session management and history');
  console.log('🌐 REST API integration');
  console.log('💻 Web UI for control and monitoring');

  console.log('\n📋 Example Use Cases:');
  console.log('• Automated web testing');
  console.log('• E-commerce workflow automation');
  console.log('• Form filling and data entry');
  console.log('• Website navigation and interaction');
  console.log('• Screenshot-based analysis');
  console.log('• Multi-step process automation');

  console.log('\n🛠️ Technical Stack:');
  console.log('• OpenAI GPT-4o for vision and decision making');
  console.log('• Playwright for browser automation');
  console.log('• TypeScript/Node.js backend');
  console.log('• React frontend with real-time updates');
  console.log('• RESTful API for integration');
  console.log('• Screen recording with timeline sync');
}

// Main execution
async function main() {
  showCUAFeatures();
  
  // Install required dependencies if missing
  try {
    require('ts-node');
  } catch (error) {
    console.log('\n📦 Installing ts-node for TypeScript support...');
    const { execSync } = require('child_process');
    execSync('npm install -D ts-node', { stdio: 'inherit' });
  }

  await testCUADirectly();
  await testSimpleCUA();

  console.log('\n🎉 Simple CUA test completed!');
  console.log('\n🚀 Next Steps:');
  console.log('1. Start the server: npm run dev');
  console.log('2. Open http://localhost:3000 in your browser');
  console.log('3. Navigate to the CUA Agent section');
  console.log('4. Create a new session and test autonomous workflows');
  console.log('\n📱 Try these test objectives:');
  console.log('• "Navigate to google.com and search for OpenAI"');
  console.log('• "Go to github.com and search for computer-use agents"');
  console.log('• "Visit news website and take screenshots of headlines"');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testSimpleCUA, testCUADirectly, showCUAFeatures }; 