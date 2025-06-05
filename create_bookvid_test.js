async function createBookvidTest() {
  const baseUrl = 'http://localhost:3000';
  
  // Wait for server to be ready
  console.log('Waiting for server to start...');
  await new Promise(resolve => setTimeout(resolve, 8000));
  
  try {
    // Step 1: Generate test steps
    console.log('Generating test steps...');
    const stepsResponse = await fetch(`${baseUrl}/api/recordings/generate-steps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: `Test the Bookvid marketplace booking flow: 
        1. Navigate to stg.bookvid.com
        2. Click on 'Marketplace' in the navigation
        3. Browse profiles and locate Jesse Linson in the Startups,AI,Analytics category
        4. Click on Jesse Linson's profile to view details
        5. Click the 'Book' or scheduling button to start booking process
        6. Fill out the booking form with:
           - Name: Jesse Linson
           - Email: jesselinson@gmail.com
           - Payment info: Card 42424242424242, Expiry 02/28, CVV 111
        7. Complete the booking process
        8. Verify booking confirmation appears`,
        targetUrl: "https://stg.bookvid.com/"
      })
    });
    
    if (!stepsResponse.ok) {
      throw new Error(`Steps API failed: ${stepsResponse.status} ${stepsResponse.statusText}`);
    }
    
    const stepsData = await stepsResponse.json();
    console.log('Generated steps:', stepsData.steps);
    
    // Step 2: Create recording
    console.log('Creating recording...');
    const recordingData = {
      title: 'Bookvid Marketplace Booking Test',
      description: 'Test booking flow for Jesse Linson profile on Bookvid marketplace',
      targetUrl: 'https://stg.bookvid.com/',
      testSteps: stepsData.steps,
      browserConfig: {
        browser: 'Chromium',
        viewport: '1920x1080',
        headless: false, // Set to false so you can see the browser
        recordingQuality: 'High (1080p)'
      },
      narrationConfig: {
        provider: 'OpenAI',
        voice: 'alloy',
        style: 'Professional & Clear',
        speed: 1.0,
        autoGenerate: true
      },
      videoConfig: {
        format: 'MP4 (H.264)',
        avatarPosition: 'Bottom Right',
        avatarStyle: 'AI Assistant',
        avatarSize: 100,
        showAvatar: true
      }
    };
    
    const recordingResponse = await fetch(`${baseUrl}/api/recordings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(recordingData)
    });
    
    if (!recordingResponse.ok) {
      throw new Error(`Recording API failed: ${recordingResponse.status} ${recordingResponse.statusText}`);
    }
    
    const recording = await recordingResponse.json();
    console.log('Recording created:', recording);
    
    // Step 3: Start recording
    console.log('Starting recording execution...');
    const startResponse = await fetch(`${baseUrl}/api/recordings/${recording.id}/start`, {
      method: 'POST'
    });
    
    if (!startResponse.ok) {
      throw new Error(`Start API failed: ${startResponse.status} ${startResponse.statusText}`);
    }
    
    const startData = await startResponse.json();
    console.log('Recording started:', startData);
    
    console.log(`\nRecording ID: ${recording.id}`);
    console.log('You can monitor progress at: http://localhost:3000');
    console.log('The recording will appear in the dashboard once completed.');
    
  } catch (error) {
    console.error('Error creating test:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

createBookvidTest(); 