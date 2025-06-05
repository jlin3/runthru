import axios from 'axios';

async function testRecording() {
  console.log('🧪 Testing RunThru Recording with OpenAI API...\n');
  
  try {
    // Create recording
    const recordingData = {
      title: "Bookvid Test - With OpenAI",
      description: "Testing the fixed recording system with OpenAI API",
      targetUrl: "https://stg.bookvid.com/",
      testSteps: [
        "Navigate to https://stg.bookvid.com/",
        "Wait for page to load",
        "Look for marketplace section",
        "Test basic functionality"
      ],
      browserConfig: {
        browser: "Chromium",
        viewport: "1920x1080",
        headless: false,
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

    console.log('📋 Creating new recording...');
    const response = await axios.post('http://localhost:3000/api/recordings', recordingData);
    console.log(`✅ Recording created with ID: ${response.data.id}`);
    
    // Start recording
    console.log('🎬 Starting recording execution...');
    await axios.post(`http://localhost:3000/api/recordings/${response.data.id}/start`);
    console.log('✅ Recording started successfully!');
    
    // Monitor progress
    console.log('👀 Monitoring progress...\n');
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await axios.get(`http://localhost:3000/api/recordings/${response.data.id}`);
      const recording = statusResponse.data;
      
      console.log(`📊 Progress: ${recording.progress}% - ${recording.currentStep} - Status: ${recording.status}`);
      
      if (recording.status === 'completed') {
        console.log('\n🎉 Recording completed successfully!');
        console.log(`📹 Video path: ${recording.videoPath}`);
        console.log(`⏱️  Duration: ${recording.duration} seconds`);
        break;
      } else if (recording.status === 'failed') {
        console.log(`\n❌ Recording failed: ${recording.currentStep}`);
        break;
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testRecording(); 