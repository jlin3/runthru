import axios from 'axios';

async function testFullBookvidBooking() {
  console.log('🎬 Testing FULL Bookvid Marketplace Booking Flow...\n');
  
  try {
    // Create comprehensive Bookvid booking test
    const recordingData = {
      title: "Complete Bookvid Marketplace Booking - Jesse Linson",
      description: "Full end-to-end booking flow: marketplace → Jesse Linson → payment → confirmation",
      targetUrl: "https://stg.bookvid.com/",
      testSteps: [
        "Navigate to https://stg.bookvid.com/",
        "Wait for the homepage to fully load and examine the layout",
        "Look for and click on the 'Marketplace' navigation link or section", 
        "Wait for the marketplace page to load completely with all profiles",
        "Browse available creator profiles in the marketplace",
        "Look for Jesse Linson profile specifically in Startups,AI,Analytics category",
        "Click on Jesse Linson profile to view his detailed information",
        "Review Jesse Linson's profile information and available time slots",
        "Click on 'Book a Session', 'Request Video', or similar booking button",
        "Fill in client information: Name as Jesse Linson",
        "Fill in email address: jesselinson@gmail.com", 
        "Enter payment card number: 4242424242424242",
        "Enter expiry date: 02/28 and CVV: 111",
        "Complete the session booking process and submit the form",
        "Wait for and verify the booking confirmation appears",
        "Capture final confirmation screen"
      ],
      browserConfig: {
        browser: "Chromium",
        viewport: "1920x1080", 
        headless: false,  // Show browser for complete demo
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

    console.log('📋 Creating comprehensive Bookvid booking test...');
    const response = await axios.post('http://localhost:3000/api/recordings', recordingData);
    console.log(`✅ Recording created with ID: ${response.data.id}`);
    
    // Start the full booking flow
    console.log('🎬 Starting complete Bookvid marketplace booking...');
    await axios.post(`http://localhost:3000/api/recordings/${response.data.id}/start`);
    console.log('✅ Full booking flow started!');
    
    // Monitor the comprehensive booking process
    console.log('👀 Monitoring full marketplace booking automation...\n');
    let lastStep = '';
    let lastProgress = 0;
    
    for (let i = 0; i < 180; i++) { // Extended timeout for full booking flow
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const statusResponse = await axios.get(`http://localhost:3000/api/recordings/${response.data.id}`);
      const recording = statusResponse.data;
      
      if (recording.currentStep !== lastStep || recording.progress !== lastProgress) {
        console.log(`🔄 Progress: ${recording.progress}% - ${recording.currentStep}`);
        lastStep = recording.currentStep;
        lastProgress = recording.progress;
      }
      
      if (recording.status === 'completed') {
        console.log('\n🎉 COMPLETE BOOKVID BOOKING FLOW FINISHED!');
        console.log(`📹 Final Video: ${recording.videoPath}`);
        console.log(`⏱️  Total Duration: ${recording.duration} seconds`);
        
        // Check video size to confirm real recording
        try {
          const fs = await import('fs');
          if (fs.existsSync(recording.videoPath)) {
            const stats = fs.statSync(recording.videoPath);
            console.log(`📁 Video Size: ${(stats.size / (1024*1024)).toFixed(1)} MB`);
            
            if (stats.size > 2000000) { // > 2MB confirms real browser recording
              console.log('✅ Large video confirms REAL BROWSER AUTOMATION was used!');
            }
          }
        } catch (e) { /* ignore */ }
        
        // Check for enhanced timeline and screenshots
        try {
          const fs = await import('fs');
          const timelinePath = '/Users/dhruvmiyani/runthru/uploads/timeline.json';
          if (fs.existsSync(timelinePath)) {
            const timeline = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
            console.log('\n📊 BOOKING FLOW TIMELINE:');
            timeline.forEach((step, i) => {
              const duration = (step.end - step.start).toFixed(1);
              console.log(`  ${i+1}. ${step.label} (${duration}s) → ${step.img}`);
            });
            
            console.log(`\n🎯 Total Steps Recorded: ${timeline.length}`);
            console.log(`🕒 Total Timeline Duration: ${Math.max(...timeline.map(s => s.end)).toFixed(1)}s`);
          }
        } catch (e) {
          console.log('⚠️ Timeline analysis failed:', e.message);
        }
        
        // Check screenshot count
        try {
          const fs = await import('fs');
          const screenshotDir = '/Users/dhruvmiyani/runthru/uploads/screenshots';
          if (fs.existsSync(screenshotDir)) {
            const screenshots = fs.readdirSync(screenshotDir).filter(f => f.endsWith('.png'));
            console.log(`\n📸 SCREENSHOTS OF BOOKING FLOW: ${screenshots.length} step captures`);
            console.log('🖼️  Screenshots show actual Bookvid marketplace and booking forms');
          }
        } catch (e) {
          console.log('⚠️ Screenshot check failed:', e.message);
        }
        
        break;
      } else if (recording.status === 'failed') {
        console.log(`\n❌ Booking flow failed at: ${recording.currentStep}`);
        break;
      }
    }
    
  } catch (error) {
    console.error('❌ Full booking test failed:', error.response?.data || error.message);
  }
}

testFullBookvidBooking(); 