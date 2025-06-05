// Test the actual PlaywrightService class
import { execSync } from 'child_process';

// Compile TypeScript service and test it
async function testPlaywrightService() {
  console.log('🎭 Testing RunThru PlaywrightService...\n');
  
  try {
    // Use tsx to run TypeScript directly
    console.log('🚀 Starting PlaywrightService test via tsx...');
    
    const result = execSync(`npx tsx -e "
      import { playwrightService } from './server/services/playwrightService.js';
      
      async function test() {
        try {
          console.log('📋 Testing Playwright service...');
          
          const testSteps = [
            'Navigate to https://stg.bookvid.com/',
            'Wait for the homepage to fully load',
            'Look for and click on the \\'Marketplace\\' navigation link'
          ];
          
          const browserConfig = {
            browser: 'Chromium',
            viewport: '1920x1080',
            headless: false,
            recordingQuality: 'High (1080p)'
          };
          
          const videoPath = await playwrightService.startRecording(
            'https://stg.bookvid.com/',
            testSteps,
            browserConfig,
            (step, progress) => {
              console.log(\`📊 \${progress}% - \${step}\`);
            }
          );
          
          console.log('🎉 PlaywrightService completed!');
          console.log(\`📹 Video: \${videoPath}\`);
          
        } catch (error) {
          console.error('❌ PlaywrightService failed:');
          console.error('Type:', error.constructor.name);
          console.error('Message:', error.message);
          console.error('Stack:', error.stack);
          process.exit(1);
        }
      }
      
      test();
    "`, { 
      encoding: 'utf8',
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log('✅ PlaywrightService test completed!');
    
  } catch (error) {
    console.error('❌ Service test failed:');
    console.error('Exit code:', error.status);
    console.error('Output:', error.stdout?.toString());
    console.error('Error:', error.stderr?.toString());
  }
}

testPlaywrightService(); 