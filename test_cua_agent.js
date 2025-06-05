const { ComputerUsingAgent } = require('./server/services/computerUsingAgent.ts');

async function testCUAAgent() {
  console.log('🤖 Testing Computer-Using Agent (CUA)');
  console.log('==================================');

  const cua = new ComputerUsingAgent();

  try {
    // Test 1: Simple website analysis
    console.log('\n📋 Test 1: Simple Website Analysis');
    const sessionId1 = await cua.initializeSession(
      'Navigate to google.com and search for "OpenAI"',
      'Google Search Test'
    );

    await cua.launchBrowser();
    
    // Execute individual steps with AI guidance
    await cua.executeStep('Navigate to google.com');
    await cua.executeStep('Find the search box and type "OpenAI"');
    await cua.executeStep('Click the search button or press enter');
    await cua.executeStep('Take a screenshot of the results');

    await cua.finalizeSession();
    console.log('✅ Test 1 completed');

    // Test 2: Autonomous Bookvid marketplace workflow
    console.log('\n📋 Test 2: Autonomous Bookvid Marketplace');
    const sessionId2 = await cua.initializeSession(
      'Navigate to https://stg.bookvid.com marketplace, find Jesse Linson in Startups,AI,Analytics category, and book a session',
      'Bookvid Marketplace Automation',
      { headless: false, recordVideo: true }
    );

    // Execute autonomous workflow
    const completedSession = await cua.executeAutonomousWorkflow(15);
    
    console.log('✅ Test 2 completed');
    console.log(`📊 Session Summary:`);
    console.log(`   - Duration: ${(completedSession.endTime - completedSession.startTime) / 1000}s`);
    console.log(`   - Steps: ${completedSession.steps.length}`);
    console.log(`   - Screenshots: ${completedSession.screenshots.length}`);
    console.log(`   - Status: ${completedSession.status}`);

    // Test 3: Multi-step e-commerce workflow
    console.log('\n📋 Test 3: E-commerce Workflow');
    const sessionId3 = await cua.initializeSession(
      'Navigate to amazon.com, search for "laptop", filter by price range $500-1000, and add first result to cart',
      'Amazon Shopping Test'
    );

    const ecommerceSession = await cua.executeAutonomousWorkflow(12);
    console.log('✅ Test 3 completed');

  } catch (error) {
    console.error('❌ CUA Test failed:', error);
  }
}

// Test individual components
async function testCUAComponents() {
  console.log('\n🧪 Testing CUA Components');
  console.log('========================');

  const cua = new ComputerUsingAgent();

  try {
    // Test session management
    const sessionId = await cua.initializeSession(
      'Test session for component validation',
      'Component Test'
    );
    console.log('✅ Session creation:', sessionId);

    // Test browser launch
    await cua.launchBrowser();
    console.log('✅ Browser launch successful');

    // Test screenshot and AI analysis
    await cua.executeStep('Navigate to https://example.com');
    console.log('✅ Navigation and analysis successful');

    // Test action determination
    await cua.executeStep('Take a screenshot and analyze the page');
    console.log('✅ AI analysis successful');

    await cua.finalizeSession();
    console.log('✅ Component tests completed');

  } catch (error) {
    console.error('❌ Component test failed:', error);
  }
}

// API integration test
async function testCUAAPI() {
  console.log('\n🌐 Testing CUA API Integration');
  console.log('=============================');

  const axios = require('axios');
  const baseURL = 'http://localhost:3000';

  try {
    // Test session creation via API
    const createResponse = await axios.post(`${baseURL}/api/cua/session`, {
      objective: 'Navigate to github.com and search for "openai agents"',
      title: 'GitHub Search API Test'
    });

    console.log('✅ API Session created:', createResponse.data.sessionId);

    // Test session listing
    const listResponse = await axios.get(`${baseURL}/api/cua/sessions`);
    console.log('✅ API Sessions listed:', listResponse.data.sessions.length);

    // Test step execution via API
    const stepResponse = await axios.post(`${baseURL}/api/cua/step/${createResponse.data.sessionId}`, {
      instruction: 'Navigate to github.com'
    });

    console.log('✅ API Step executed:', stepResponse.data.step.success);

  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

// Performance benchmarking
async function benchmarkCUA() {
  console.log('\n⚡ CUA Performance Benchmark');
  console.log('===========================');

  const startTime = Date.now();
  const cua = new ComputerUsingAgent();

  try {
    const sessionId = await cua.initializeSession(
      'Quick performance test - navigate to 3 different websites',
      'Performance Benchmark'
    );

    await cua.launchBrowser();

    const websites = [
      'https://example.com',
      'https://httpbin.org',
      'https://jsonplaceholder.typicode.com'
    ];

    for (let i = 0; i < websites.length; i++) {
      const stepStart = Date.now();
      await cua.executeStep(`Navigate to ${websites[i]}`);
      const stepTime = Date.now() - stepStart;
      console.log(`   Step ${i + 1}: ${stepTime}ms`);
    }

    await cua.finalizeSession();
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ Benchmark completed in ${totalTime}ms`);
    console.log(`   Average step time: ${totalTime / websites.length}ms`);

  } catch (error) {
    console.error('❌ Benchmark failed:', error);
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting CUA Agent Testing Suite');
  console.log('====================================');

  // Run all tests
  await testCUAComponents();
  await testCUAAgent();
  
  // Note: API tests require server to be running
  console.log('\n💡 To test API integration, start the server with: npm run dev');
  console.log('   Then run: node test_cua_api.js');
  
  await benchmarkCUA();

  console.log('\n🎉 All CUA tests completed!');
  console.log('\n📁 Check uploads/cua-sessions/ for session recordings and screenshots');
}

// Export for use in other files
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testCUAAgent,
  testCUAComponents,
  testCUAAPI,
  benchmarkCUA
}; 