import axios from 'axios';

async function debugPlaywright() {
  console.log('🔍 Debug: Testing Playwright Enhanced Service Directly...\n');
  
  try {
    // Create recording
    const recordingData = {
      title: "DEBUG: Enhanced Marketplace Booking",
      description: "Debug test to see Playwright errors",
      targetUrl: "https://stg.bookvid.com/",
      testSteps: [
        "Navigate to https://stg.bookvid.com/",
        "Look for marketplace link",
        "Click on marketplace"
      ],
      browserConfig: {
        browser: "Chromium",
        viewport: "1920x1080", 
        headless: false,  // Show browser
        recordingQuality: "High (1080p)"
      },
      narrationConfig: {
        provider: "OpenAI",
        voice: "alloy",
        style: "Professional & Clear",
        speed: 1,
        autoGenerate: true
      },
      videoConfig: {
        format: "MP4 (H.264)",
        avatarPosition: "Bottom Right", 
        avatarStyle: "AI Assistant",
        avatarSize: 100,
        showAvatar: true
      }
    };

    console.log('📋 Creating debug recording...');
    const response = await axios.post('http://localhost:3000/api/recordings', recordingData);
    console.log(`✅ Recording created with ID: ${response.data.id}`);
    
    // Start recording and immediately check server logs
    console.log('🎬 Starting debug recording...');
    const startResponse = await axios.post(`http://localhost:3000/api/recordings/${response.data.id}/start`);
    console.log('✅ Recording start request sent');
    
    // Wait a bit for the first few steps
    console.log('⏳ Waiting 10 seconds to let recording start...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check status
    const statusResponse = await axios.get(`http://localhost:3000/api/recordings/${response.data.id}`);
    const recording = statusResponse.data;
    
    console.log('📊 Current Status:');
    console.log(`  - Status: ${recording.status}`);
    console.log(`  - Progress: ${recording.progress}%`);
    console.log(`  - Current Step: ${recording.currentStep}`);
    
    if (recording.status === 'completed') {
      console.log(`📹 Video: ${recording.videoPath}`);
      console.log(`⏱️ Duration: ${recording.duration}s`);
      
      // Check video size
      const fs = await import('fs');
      if (fs.existsSync(recording.videoPath)) {
        const stats = fs.statSync(recording.videoPath);
        console.log(`📁 Video Size: ${Math.round(stats.size / 1024)} KB`);
        
        if (stats.size < 1000000) { // Less than 1MB suggests test pattern
          console.log('⚠️ Small video size suggests test pattern fallback was used');
        } else {
          console.log('✅ Large video size suggests real browser recording');
        }
      }
    }
    
    console.log('\n🔍 Note: Check the server terminal for detailed Playwright error logs');
    
  } catch (error) {
    console.error('❌ Debug test failed:', error.response?.data || error.message);
  }
}

debugPlaywright(); 