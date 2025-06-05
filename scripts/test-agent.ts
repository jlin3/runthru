#!/usr/bin/env tsx

import { agentService } from "../server/services/agentService.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🤖 RunThru Agent CLI

Usage:
  npm run test-agent "instruction"
  npm run test-agent demo https://example.com
  npm run test-agent demo https://example.com "test login flow"

Examples:
  npm run test-agent "Start recording https://google.com, analyze the page, take a screenshot"
  npm run test-agent demo https://google.com
  npm run test-agent demo https://google.com "search for 'OpenAI agents'"
    `);
    process.exit(1);
  }

  const command = args[0];

  try {
    if (command === 'demo') {
      const url = args[1];
      const testDescription = args[2];
      
      if (!url) {
        console.error('❌ URL required for demo command');
        process.exit(1);
      }

      console.log(`🎬 Starting demo for: ${url}`);
      if (testDescription) {
        console.log(`📝 Test: ${testDescription}`);
      }

      const instruction = testDescription 
        ? `Create and run a demo test for "${testDescription}" on ${url}. Start recording, analyze the page, generate a test plan, execute some basic interactions, take screenshots, and stop recording.`
        : `Create a demo recording of ${url}. Start recording, analyze the page structure, interact with key elements, take screenshots, and stop recording.`;

      const result = await agentService.run(instruction);
      console.log('\n🎉 Demo completed!');
      console.log('\n📋 Result:');
      console.log(result);

    } else {
      // Direct instruction
      const instruction = args.join(' ');
      console.log(`🤖 Running instruction: ${instruction}`);
      
      const result = await agentService.run(instruction);
      console.log('\n✅ Agent completed!');
      console.log('\n📋 Result:');
      console.log(result);
    }

  } catch (error: any) {
    console.error('\n❌ Agent failed:', error.message);
    console.error('\n🔍 Full error:', error);
  } finally {
    // Always cleanup
    try {
      await agentService.cleanup();
      console.log('\n🧹 Cleanup completed');
    } catch (cleanupError) {
      console.error('⚠️ Cleanup error:', cleanupError);
    }
    
    process.exit(0);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Interrupted, cleaning up...');
  try {
    await agentService.cleanup();
  } catch (error) {
    console.error('Cleanup error:', error);
  }
  process.exit(0);
});

main().catch(console.error); 