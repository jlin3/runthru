import axios from 'axios';

async function testEnhancedBooking() {
  console.log('🎬 Testing Enhanced Marketplace Booking with Timeline...\n');
  
  try {
    // Create recording with complete Bookvid booking flow
    const recordingData = {
      title: "Enhanced Bookvid Marketplace Booking",
      description: "Complete booking flow with Jesse Linson including payment details",
      targetUrl: "https://stg.bookvid.com/",
      testSteps: [
        "Navigate to https://stg.bookvid.com/",
        "Wait for the homepage to fully load",
        "Look for and click on the 'Marketplace' navigation link", 
        "Wait for the marketplace page to load completely",
        "Browse available profiles in the marketplace",
        "Look for Jesse Linson profile in Startups,AI,Analytics category",
        "Click on Jesse Linson profile to view details",
        "Review the profile information and available time slots",
        "Click on 'Book a Session' or similar booking button",
        "Fill in booking information: Jesse Linson, jesselinson@gmail.com",
        "Enter payment details: 4242424242424242, 02/28, 111",
        "Complete the session booking process",
        "Verify the booking confirmation appears"
      ],
      browserConfig: {
        browser: "Chromium",
        viewport: "1920x1080", 
        headless: false,  // Show browser for demo
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

    console.log('📋 Creating enhanced booking recording...');
    const response = await axios.post('http://localhost:3000/api/recordings', recordingData);
    console.log(`✅ Recording created with ID: ${response.data.id}`);
    
    // Start recording
    console.log('🎬 Starting enhanced booking flow...');
    await axios.post(`http://localhost:3000/api/recordings/${response.data.id}/start`);
    console.log('✅ Enhanced booking recording started!');
    
    // Monitor progress with detailed output
    console.log('👀 Monitoring enhanced marketplace automation...\n');
    let lastStep = '';
    
    for (let i = 0; i < 120; i++) { // Longer timeout for full booking flow
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const statusResponse = await axios.get(`http://localhost:3000/api/recordings/${response.data.id}`);
      const recording = statusResponse.data;
      
      if (recording.currentStep !== lastStep) {
        console.log(`🔄 Step Change: ${recording.currentStep}`);
        lastStep = recording.currentStep;
      }
      
      console.log(`📊 Progress: ${recording.progress}% - Status: ${recording.status}`);
      
      if (recording.status === 'completed') {
        console.log('\n🎉 ENHANCED BOOKING RECORDING COMPLETED!');
        console.log(`📹 Video path: ${recording.videoPath}`);
        console.log(`⏱️  Duration: ${recording.duration} seconds`);
        console.log(`🎯 This should show complete marketplace booking flow!`);
        
        // Check for timeline.json
        try {
          const fs = await import('fs');
          const timelinePath = '/Users/dhruvmiyani/runthru/uploads/timeline.json';
          if (fs.existsSync(timelinePath)) {
            const timeline = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
            console.log('\n📊 TIMELINE GENERATED:');
            timeline.forEach((step, i) => {
              console.log(`  ${i+1}. ${step.label} (${step.start.toFixed(1)}s - ${step.end.toFixed(1)}s) → ${step.img}`);
            });
          }
        } catch (e) {
          console.log('⚠️ Timeline check failed:', e.message);
        }
        
        // Check for screenshots
        try {
          const fs = await import('fs');
          const screenshotDir = '/Users/dhruvmiyani/runthru/uploads/screenshots';
          if (fs.existsSync(screenshotDir)) {
            const screenshots = fs.readdirSync(screenshotDir).filter(f => f.endsWith('.png'));
            console.log(`\n📸 SCREENSHOTS CAPTURED: ${screenshots.length} files`);
            screenshots.slice(0, 5).forEach(file => console.log(`  - ${file}`));
            if (screenshots.length > 5) console.log(`  ... and ${screenshots.length - 5} more`);
          }
        } catch (e) {
          console.log('⚠️ Screenshot check failed:', e.message);
        }
        
        break;
      } else if (recording.status === 'failed') {
        console.log(`\n❌ Enhanced booking failed: ${recording.currentStep}`);
        break;
      }
    }
    
  } catch (error) {
    console.error('❌ Enhanced booking test failed:', error.response?.data || error.message);
  }
}

testEnhancedBooking(); 