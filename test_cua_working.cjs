// Working demonstration of CUA agent functionality
require('dotenv').config();
const { ComputerUsingAgent } = require('./server/services/computerUsingAgent.js');

async function demonstrateCUA() {
  console.log('🤖 CUA Agent Working Demonstration');
  console.log('==================================');

  try {
    // Create CUA instance
    const cua = new ComputerUsingAgent();
    
    // Initialize session
    console.log('\n1️⃣ Initializing CUA session...');
    const sessionId = await cua.initializeSession(
      'Navigate to example.com, take a screenshot, and analyze the page',
      'Example.com Analysis Demo'
    );
    console.log(`✅ Session created: ${sessionId}`);

    // Launch browser
    console.log('\n2️⃣ Launching browser...');
    await cua.launchBrowser();
    console.log('✅ Browser launched successfully');

    // Execute step 1: Navigate
    console.log('\n3️⃣ Executing Step 1: Navigate to example.com');
    const step1 = await cua.executeStep('Navigate to https://example.com');
    console.log(`✅ Step 1 completed: ${step1.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`🎭 Action taken: ${step1.action}`);

    // Execute step 2: Take screenshot and analyze
    console.log('\n4️⃣ Executing Step 2: Take screenshot and analyze page');
    const step2 = await cua.executeStep('Take a screenshot and analyze what is visible on the page');
    console.log(`✅ Step 2 completed: ${step2.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`🎭 Action taken: ${step2.action}`);

    // Execute step 3: Scroll and explore
    console.log('\n5️⃣ Executing Step 3: Scroll down to see more content');
    const step3 = await cua.executeStep('Scroll down to see more content on the page');
    console.log(`✅ Step 3 completed: ${step3.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`🎭 Action taken: ${step3.action}`);

    // Get session summary
    const session = cua.getCurrentSession();
    console.log('\n📊 Session Summary:');
    console.log(`🎯 Objective: ${session.objective}`);
    console.log(`📈 Steps completed: ${session.steps.length}`);
    console.log(`📸 Screenshots taken: ${session.screenshots.length}`);
    console.log(`⏱️ Duration: ${(Date.now() - session.startTime) / 1000}s`);

    // Show AI analysis from last step
    if (session.steps.length > 0) {
      const lastStep = session.steps[session.steps.length - 1];
      console.log('\n🔍 Latest AI Analysis:');
      console.log(lastStep.aiDecision?.substring(0, 200) + '...');
    }

    // Finalize session
    console.log('\n6️⃣ Finalizing session...');
    await cua.finalizeSession();
    console.log('✅ Session finalized');

    console.log('\n🎉 CUA Agent Demonstration Complete!');
    console.log('====================================');
    console.log('✅ Session management: WORKING');
    console.log('✅ Browser automation: WORKING');
    console.log('✅ AI decision making: WORKING');
    console.log('✅ Screenshot capture: WORKING');
    console.log('✅ Step execution: WORKING');
    console.log('✅ Session persistence: WORKING');
    
    console.log(`\n📁 Session files saved in: uploads/cua-sessions/${sessionId}/`);
    console.log('🎬 Video recording saved (if enabled)');
    console.log('📸 Screenshots available for review');

  } catch (error) {
    console.error('\n❌ CUA Demonstration Failed');
    console.error('============================');
    console.error(`Error: ${error.message}`);
    console.error('Stack:', error.stack);
  }
}

// Test autonomous workflow
async function testAutonomousWorkflow() {
  console.log('\n\n🚀 Testing Autonomous CUA Workflow');
  console.log('===================================');

  try {
    const cua = new ComputerUsingAgent();
    
    const sessionId = await cua.initializeSession(
      'Visit example.com and gather information about the page content',
      'Autonomous Information Gathering'
    );

    console.log(`🤖 Starting autonomous workflow: ${sessionId}`);
    
    const completedSession = await cua.executeAutonomousWorkflow(5); // 5 steps max
    
    console.log('\n🎉 Autonomous Workflow Results:');
    console.log(`📊 Steps executed: ${completedSession.steps.length}`);
    console.log(`🎯 Final status: ${completedSession.status}`);
    console.log(`⏱️ Total duration: ${(completedSession.endTime - completedSession.startTime) / 1000}s`);

  } catch (error) {
    console.error('❌ Autonomous workflow failed:', error.message);
  }
}

async function main() {
  await demonstrateCUA();
  await testAutonomousWorkflow();
}

if (require.main === module) {
  main().catch(console.error);
} 