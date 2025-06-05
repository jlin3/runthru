import axios from 'axios';

async function testRealRecording() {
  console.log('🎬 Testing REAL Browser Recording for Bookvid Marketplace...\n');
  
  try {
    // Create recording with specific Bookvid test steps
    const recordingData = {
      title: "Bookvid Marketplace - Real Browser Test",
      description: "Real browser automation test for Jesse Linson booking flow",
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
        "Complete the session booking process"
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

    console.log('📋 Creating real browser recording...');
    const response = await axios.post('http://localhost:3000/api/recordings', recordingData);
    console.log(`✅ Recording created with ID: ${response.data.id}`);
    
    // Start recording
    console.log('🎬 Starting REAL browser execution...');
    await axios.post(`http://localhost:3000/api/recordings/${response.data.id}/start`);
    console.log('✅ Real browser recording started!');
    
    // Monitor progress with more detailed output
    console.log('👀 Monitoring real browser automation...\n');
    let lastStep = '';
    
    for (let i = 0; i < 60; i++) { // Longer timeout for real browser
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const statusResponse = await axios.get(`http://localhost:3000/api/recordings/${response.data.id}`);
      const recording = statusResponse.data;
      
      if (recording.currentStep !== lastStep) {
        console.log(`🔄 Step Change: ${recording.currentStep}`);
        lastStep = recording.currentStep;
      }
      
      console.log(`📊 Progress: ${recording.progress}% - Status: ${recording.status}`);
      
      if (recording.status === 'completed') {
        console.log('\n🎉 REAL BROWSER RECORDING COMPLETED!');
        console.log(`📹 Video path: ${recording.videoPath}`);
        console.log(`⏱️  Duration: ${recording.duration} seconds`);
        console.log(`🎯 This should be a REAL browser recording of Bookvid!`);
        break;
      } else if (recording.status === 'failed') {
        console.log(`\n❌ Recording failed: ${recording.currentStep}`);
        break;
      }
    }
    
  } catch (error) {
    console.error('❌ Real browser test failed:', error.response?.data || error.message);
  }
}

testRealRecording(); 