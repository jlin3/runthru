// Direct test of CUA functionality without TypeScript imports
require('dotenv').config();

async function testCUADirectly() {
  console.log('🔍 Direct CUA Test (bypassing TypeScript)');
  console.log('==========================================');

  try {
    // Test basic dependencies
    console.log('\n📦 Testing dependencies...');
    
    const { chromium } = require('playwright');
    const OpenAI = require('openai');
    const fs = require('fs');
    const path = require('path');

    console.log('✅ Playwright imported');
    console.log('✅ OpenAI imported');
    console.log('✅ File system modules loaded');

    // Test OpenAI connection
    console.log('\n🤖 Testing OpenAI connection...');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const testResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Say "CUA test successful" if you can read this.' }],
      max_tokens: 10
    });

    console.log('✅ OpenAI API working');
    console.log(`🤖 Response: ${testResponse.choices[0]?.message?.content}`);

    // Test Playwright browser launch
    console.log('\n🚀 Testing Playwright browser...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log('✅ Browser launched');
    
    await page.goto('https://example.com');
    const title = await page.title();
    
    console.log(`✅ Navigation successful - Page title: ${title}`);
    
    // Take a screenshot
    const sessionDir = path.join('uploads', 'cua-sessions', 'test-direct');
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    
    const screenshotPath = path.join(sessionDir, 'test-screenshot.png');
    await page.screenshot({ path: screenshotPath });
    
    console.log(`✅ Screenshot saved: ${screenshotPath}`);
    
    await browser.close();
    console.log('✅ Browser closed');

    // Test vision API with screenshot
    console.log('\n👁️ Testing AI vision with screenshot...');
    const screenshotBuffer = fs.readFileSync(screenshotPath);
    const base64Screenshot = screenshotBuffer.toString('base64');

    const visionResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe what you see in this screenshot in one sentence.' },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Screenshot}`
              }
            }
          ]
        }
      ],
      max_tokens: 100
    });

    console.log('✅ AI Vision working');
    console.log(`👁️ AI sees: ${visionResponse.choices[0]?.message?.content}`);

    console.log('\n🎉 Direct CUA Test Results:');
    console.log('============================');
    console.log('✅ OpenAI API: WORKING');
    console.log('✅ Playwright: WORKING');
    console.log('✅ Browser automation: WORKING');
    console.log('✅ Screenshot capture: WORKING');
    console.log('✅ AI Vision analysis: WORKING');
    console.log('✅ File system operations: WORKING');
    
    console.log('\n🤖 All CUA core components are FUNCTIONAL! 🎯');

  } catch (error) {
    console.error('\n❌ Direct CUA Test Failed');
    console.error('=========================');
    console.error(`Error: ${error.message}`);
    
    if (error.message.includes('API key')) {
      console.error('💡 Check your OpenAI API key in .env file');
    } else if (error.message.includes('chromium')) {
      console.error('💡 Install Playwright browsers: npx playwright install');
    } else {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Test if the problem is in the API routes
async function testAPIRoutes() {
  console.log('\n🔍 Testing API Route Issues');
  console.log('===========================');

  const axios = require('axios');
  const baseURL = 'http://localhost:3000';

  try {
    // Test working routes
    console.log('📡 Testing existing routes...');
    const storageInfo = await axios.get(`${baseURL}/api/storage/info`);
    console.log('✅ Storage info route works');

    const recordings = await axios.get(`${baseURL}/api/recordings`);
    console.log('✅ Recordings route works');

    // Test CUA routes specifically
    console.log('\n📡 Testing CUA routes...');
    try {
      const cuaSessions = await axios.get(`${baseURL}/api/cua/sessions`);
      console.log('✅ CUA sessions route works');
      console.log(`📊 Response: ${JSON.stringify(cuaSessions.data)}`);
    } catch (cuaError) {
      console.error('❌ CUA sessions route failed:', cuaError.response?.status, cuaError.response?.statusText);
      console.error('Response:', cuaError.response?.data);
    }

  } catch (error) {
    console.error('❌ API route test failed:', error.message);
  }
}

async function main() {
  await testCUADirectly();
  await testAPIRoutes();
}

if (require.main === module) {
  main().catch(console.error);
} 