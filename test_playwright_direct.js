// Direct test of Playwright browser recording
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function testPlaywrightDirect() {
  console.log('🎭 Testing Playwright Direct Browser Recording...\n');
  
  let browser = null;
  let context = null;
  let page = null;
  
  try {
    console.log('🚀 Launching Chromium browser...');
    
    // Launch browser
    browser = await chromium.launch({
      headless: false,  // Show browser window
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    
    console.log('✅ Browser launched successfully!');
    
    // Create context with video recording
    const videoDir = path.join(process.cwd(), "uploads", "videos");
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }
    
    console.log('📹 Setting up video recording...');
    
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: {
        dir: videoDir,
        size: { width: 1920, height: 1080 }
      }
    });
    
    page = await context.newPage();
    
    console.log('🌐 Navigating to Bookvid...');
    
    // Navigate to the page
    await page.goto('https://stg.bookvid.com/', { waitUntil: 'networkidle' });
    
    console.log('✅ Page loaded successfully!');
    
    // Wait a bit to record some content
    console.log('⏱️ Recording for 5 seconds...');
    await page.waitForTimeout(5000);
    
    // Try to find marketplace link
    console.log('🔍 Looking for marketplace link...');
    try {
      const marketplaceLink = await page.locator('text=Marketplace').first();
      if (await marketplaceLink.isVisible({ timeout: 3000 })) {
        console.log('📍 Found marketplace link, clicking...');
        await marketplaceLink.click();
        await page.waitForTimeout(3000);
      } else {
        console.log('⚠️ Marketplace link not found, continuing...');
      }
    } catch (e) {
      console.log('⚠️ Could not interact with marketplace:', e.message);
    }
    
    console.log('🏁 Finishing recording...');
    
    // Close page and context to finalize video
    await page.close();
    await context.close();
    await browser.close();
    
    console.log('✅ Browser closed successfully!');
    
    // Find the video file
    console.log('📁 Looking for video files...');
    const videoFiles = fs.readdirSync(videoDir).filter(f => f.endsWith('.webm'));
    
    if (videoFiles.length > 0) {
      const latestVideo = videoFiles
        .map(f => ({ name: f, time: fs.statSync(path.join(videoDir, f)).mtime }))
        .sort((a, b) => b.time.getTime() - a.time.getTime())[0];
      
      const videoPath = path.join(videoDir, latestVideo.name);
      const stats = fs.statSync(videoPath);
      
      console.log('\n🎉 Real Playwright recording completed!');
      console.log(`📹 Video path: ${videoPath}`);
      console.log(`📁 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`🕐 Created: ${stats.birthtime}`);
      
      return videoPath;
    } else {
      throw new Error('No video files found after recording');
    }
    
  } catch (error) {
    console.error('❌ Playwright direct test failed:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    
    // Cleanup on error
    try {
      if (page) await page.close();
      if (context) await context.close();
      if (browser) await browser.close();
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError.message);
    }
    
    throw error;
  }
}

testPlaywrightDirect(); 