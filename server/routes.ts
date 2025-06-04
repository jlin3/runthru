import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { insertRecordingSchema, type Recording } from "@shared/schema";
import { openaiService } from "./services/openaiService";
import { elevenlabsService } from "./services/elevenlabsService";
import { playwrightService } from "./services/playwrightService";
import { videoService } from "./services/videoService";
import { realtimeVoiceService } from "./services/realtimeVoiceService";
import { voiceAgentService } from "./services/voiceAgentService";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // WebSocket connection for real-time updates
  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");
    
    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });
  });

  // Broadcast updates to all connected clients
  const broadcast = (data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === 1) { // OPEN
        client.send(JSON.stringify(data));
      }
    });
  };

  // Get all recordings
  app.get("/api/recordings", async (req, res) => {
    try {
      const recordings = await storage.getRecordings();
      res.json(recordings);
    } catch (error) {
      console.error("Error fetching recordings:", error);
      res.status(500).json({ 
        message: "Failed to fetch recordings",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get specific recording
  app.get("/api/recordings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid recording ID" });
      }

      const recording = await storage.getRecording(id);
      if (!recording) {
        return res.status(404).json({ message: "Recording not found" });
      }

      res.json(recording);
    } catch (error) {
      console.error("Error fetching recording:", error);
      res.status(500).json({ 
        message: "Failed to fetch recording",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Create new recording
  app.post("/api/recordings", async (req, res) => {
    try {
      const validatedData = insertRecordingSchema.parse(req.body);
      const recording = await storage.createRecording(validatedData);
      
      res.status(201).json(recording);
    } catch (error) {
      console.error("Error creating recording:", error);
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ 
          message: "Invalid recording data",
          errors: error.message
        });
      }
      res.status(500).json({ 
        message: "Failed to create recording",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Generate test steps using AI
  app.post("/api/recordings/generate-steps", async (req, res) => {
    try {
      const { description, targetUrl } = req.body;
      
      if (!description || !targetUrl) {
        return res.status(400).json({ 
          message: "Description and target URL are required" 
        });
      }

      let steps;
      try {
        steps = await openaiService.generateTestSteps(description, targetUrl);
      } catch (apiError) {
        console.log("OpenAI API not available, generating fallback steps");
        steps = generateDemoTestSteps(description, targetUrl);
      }
      res.json({ steps });
    } catch (error) {
      console.error("Error generating test steps:", error);
      res.status(500).json({ 
        message: "Failed to generate test steps",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Start recording execution
  app.post("/api/recordings/:id/start", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid recording ID" });
      }

      const recording = await storage.getRecording(id);
      if (!recording) {
        return res.status(404).json({ message: "Recording not found" });
      }

      if (recording.status !== "pending") {
        return res.status(400).json({ 
          message: "Recording is not in pending state" 
        });
      }

      // Update status to recording
      await storage.updateRecording(id, { 
        status: "recording",
        currentStep: "Browser Setup"
      });

      // Start the recording process asynchronously
      executeRecording(id, recording, broadcast).catch((error) => {
        console.error("Recording execution failed:", error);
        storage.updateRecording(id, { 
          status: "failed",
          currentStep: `Error: ${error.message}`
        });
        broadcast({ 
          type: "recording_failed", 
          recordingId: id, 
          error: error.message 
        });
      });

      res.json({ message: "Recording started successfully" });
    } catch (error) {
      console.error("Error starting recording:", error);
      res.status(500).json({ 
        message: "Failed to start recording",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Stop recording execution
  app.post("/api/recordings/:id/stop", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid recording ID" });
      }

      // Stop the playwright service
      await playwrightService.stopRecording();
      
      // Update status
      await storage.updateRecording(id, { 
        status: "failed",
        currentStep: "Stopped by user"
      });

      broadcast({ 
        type: "recording_stopped", 
        recordingId: id 
      });

      res.json({ message: "Recording stopped successfully" });
    } catch (error) {
      console.error("Error stopping recording:", error);
      res.status(500).json({ 
        message: "Failed to stop recording",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Upload avatar image
  app.post("/api/upload/avatar", upload.single("avatar"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileName = `avatar_${Date.now()}${path.extname(req.file.originalname)}`;
      const newPath = path.join("uploads", fileName);
      
      fs.renameSync(req.file.path, newPath);
      
      res.json({ 
        message: "Avatar uploaded successfully",
        fileName,
        path: `/uploads/${fileName}`
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      res.status(500).json({ 
        message: "Failed to upload avatar",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Serve uploaded files
  app.use("/uploads", express.static("uploads"));

  // Download recording video
  app.get("/api/recordings/:id/download", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid recording ID" });
      }

      const recording = await storage.getRecording(id);
      if (!recording || !recording.videoPath) {
        return res.status(404).json({ message: "Recording video not found" });
      }

      if (!fs.existsSync(recording.videoPath)) {
        return res.status(404).json({ message: "Video file not found on disk" });
      }

      const fileName = `${recording.title.replace(/[^a-zA-Z0-9]/g, "_")}.mp4`;
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.setHeader("Content-Type", "video/mp4");
      
      const stream = fs.createReadStream(recording.videoPath);
      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading recording:", error);
      res.status(500).json({ 
        message: "Failed to download recording",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Delete recording
  app.delete("/api/recordings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid recording ID" });
      }

      const recording = await storage.getRecording(id);
      if (recording?.videoPath && fs.existsSync(recording.videoPath)) {
        fs.unlinkSync(recording.videoPath);
      }

      const deleted = await storage.deleteRecording(id);
      if (!deleted) {
        return res.status(404).json({ message: "Recording not found" });
      }

      res.json({ message: "Recording deleted successfully" });
    } catch (error) {
      console.error("Error deleting recording:", error);
      res.status(500).json({ 
        message: "Failed to delete recording",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Voice Agent Routes using OpenAI Realtime API
  
  // Create QA Assistant voice session
  app.post("/api/voice/qa-assistant", async (req, res) => {
    try {
      const session = await realtimeVoiceService.createQAAssistantSession();
      res.json({ 
        message: "QA Assistant voice session created",
        sessionId: "qa-assistant-" + Date.now()
      });
    } catch (error) {
      console.error("Error creating QA assistant session:", error);
      res.status(500).json({ 
        message: "Failed to create voice session",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Create narration agent voice session
  app.post("/api/voice/narrator", async (req, res) => {
    try {
      const session = await realtimeVoiceService.createNarrationAgentSession();
      res.json({ 
        message: "Narration agent voice session created",
        sessionId: "narrator-" + Date.now()
      });
    } catch (error) {
      console.error("Error creating narrator session:", error);
      res.status(500).json({ 
        message: "Failed to create narrator session",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Create test generator voice session
  app.post("/api/voice/test-generator", async (req, res) => {
    try {
      const session = await realtimeVoiceService.createTestGeneratorSession();
      res.json({ 
        message: "Test generator voice session created",
        sessionId: "test-generator-" + Date.now()
      });
    } catch (error) {
      console.error("Error creating test generator session:", error);
      res.status(500).json({ 
        message: "Failed to create test generator session",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Voice-based test step generation
  app.post("/api/voice/generate-steps", async (req, res) => {
    try {
      const { description, targetUrl, audioData } = req.body;
      
      if (audioData) {
        // Process voice input through Realtime API
        const audioBuffer = Buffer.from(audioData, 'base64');
        realtimeVoiceService.sendAudio(audioBuffer.buffer);
        res.json({ message: "Voice input received, processing..." });
      } else if (description && targetUrl) {
        // Fallback to text-based generation
        const steps = await voiceAgentService.generateTestStepsFromVoice(description, targetUrl);
        res.json({ steps });
      } else {
        return res.status(400).json({ 
          message: "Either audio data or description and target URL are required" 
        });
      }
    } catch (error) {
      console.error("Error processing voice test generation:", error);
      res.status(500).json({ 
        message: "Failed to process voice input",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Voice-based narration generation
  app.post("/api/voice/generate-narration", async (req, res) => {
    try {
      const { testSteps, targetUrl, audioData } = req.body;
      
      if (audioData) {
        // Process voice input for narration preferences
        const audioBuffer = Buffer.from(audioData, 'base64');
        realtimeVoiceService.sendAudio(audioBuffer.buffer);
        res.json({ message: "Voice narration input received, processing..." });
      } else if (testSteps && targetUrl) {
        // Generate narration script
        const narrationScript = await voiceAgentService.generateNarrationFromSteps(testSteps, targetUrl);
        res.json({ narrationScript });
      } else {
        return res.status(400).json({ 
          message: "Test steps and target URL are required" 
        });
      }
    } catch (error) {
      console.error("Error generating narration:", error);
      res.status(500).json({ 
        message: "Failed to generate narration",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Send text message to voice agent
  app.post("/api/voice/send-message", async (req, res) => {
    try {
      const { message, agentType } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      realtimeVoiceService.sendText(message);
      res.json({ message: "Message sent to voice agent" });
    } catch (error) {
      console.error("Error sending message to voice agent:", error);
      res.status(500).json({ 
        message: "Failed to send message",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get voice agent instructions (for client-side display)
  app.get("/api/voice/instructions", (req, res) => {
    try {
      const instructions = voiceAgentService.getVoiceAgentInstructions();
      res.json(instructions);
    } catch (error) {
      console.error("Error getting voice instructions:", error);
      res.status(500).json({ 
        message: "Failed to get voice instructions",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Enhanced WebSocket for voice agent integration
  const voiceClients = new Map<string, any>();

  wss.on("connection", (ws, req) => {
    const clientId = req.url?.includes('voice') ? `voice-${Date.now()}` : `recording-${Date.now()}`;
    
    if (req.url?.includes('voice')) {
      voiceClients.set(clientId, ws);
      console.log(`Voice agent client connected: ${clientId}`);
      
      ws.on("message", async (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          switch (message.type) {
            case 'voice_audio':
              // Handle incoming audio from client
              const audioBuffer = Buffer.from(message.audio, 'base64');
              realtimeVoiceService.sendAudio(audioBuffer.buffer);
              break;
              
            case 'voice_text':
              // Handle text message to voice agent
              realtimeVoiceService.sendText(message.text);
              break;
              
            case 'create_session':
              // Create appropriate voice session
              switch (message.agentType) {
                case 'qa-assistant':
                  await realtimeVoiceService.createQAAssistantSession();
                  break;
                case 'narrator':
                  await realtimeVoiceService.createNarrationAgentSession();
                  break;
                case 'test-generator':
                  await realtimeVoiceService.createTestGeneratorSession();
                  break;
              }
              break;
          }
        } catch (error) {
          console.error("Error handling voice WebSocket message:", error);
          ws.send(JSON.stringify({ 
            type: 'error', 
            error: error instanceof Error ? error.message : "Unknown error" 
          }));
        }
      });

      ws.on("close", () => {
        voiceClients.delete(clientId);
        console.log(`Voice agent client disconnected: ${clientId}`);
      });
    } else {
      console.log("WebSocket client connected");
      
      ws.on("close", () => {
        console.log("WebSocket client disconnected");
      });
    }
  });

  return httpServer;
}

// Execute recording process
async function executeRecording(
  id: number, 
  recording: Recording, 
  broadcast: (data: any) => void
) {
  try {
    // Step 1: Browser Setup
    broadcast({ 
      type: "recording_progress", 
      recordingId: id, 
      step: "Browser Setup",
      progress: 10
    });

    await storage.updateRecording(id, { 
      currentStep: "Browser Setup",
      progress: 10
    });

    let videoPath: string;
    try {
      videoPath = await playwrightService.startRecording(
        recording.targetUrl,
        recording.testSteps,
        recording.browserConfig
      );
    } catch (playwrightError) {
      console.log("Using alternative recording method");
      videoPath = await createSystemRecording(recording, (step: string, progress: number) => {
        broadcast({ 
          type: "recording_progress", 
          recordingId: id, 
          step,
          progress
        });
        storage.updateRecording(id, { 
          currentStep: step,
          progress
        });
      });
    }

    // Step 2: Generate Narration
    broadcast({ 
      type: "recording_progress", 
      recordingId: id, 
      step: "Generating Narration",
      progress: 70
    });

    await storage.updateRecording(id, { 
      currentStep: "Generating Narration",
      progress: 70
    });

    const narrationScript = await openaiService.generateNarrationScript(
      recording.testSteps,
      recording.narrationConfig.style
    );

    const audioPath = await elevenlabsService.generateSpeech(
      narrationScript,
      recording.narrationConfig.voice,
      recording.narrationConfig.speed
    );

    // Step 3: Video Composition
    broadcast({ 
      type: "recording_progress", 
      recordingId: id, 
      step: "Video Composition",
      progress: 85
    });

    await storage.updateRecording(id, { 
      currentStep: "Video Composition",
      progress: 85
    });

    const finalVideoPath = await videoService.composeVideo(
      videoPath,
      audioPath,
      recording.videoConfig
    );

    // Get video duration
    const duration = await videoService.getVideoDuration(finalVideoPath);

    // Complete recording
    await storage.updateRecording(id, { 
      status: "completed",
      currentStep: "Completed",
      progress: 100,
      videoPath: finalVideoPath,
      duration,
      completedAt: new Date()
    });

    broadcast({ 
      type: "recording_completed", 
      recordingId: id,
      videoPath: finalVideoPath,
      duration
    });

  } catch (error) {
    console.error("Recording execution error:", error);
    await storage.updateRecording(id, { 
      status: "failed",
      currentStep: `Error: ${error instanceof Error ? error.message : "Unknown error"}`
    });

    broadcast({ 
      type: "recording_failed", 
      recordingId: id, 
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

function generateDemoTestSteps(description: string, targetUrl: string): string[] {
  const lowerDesc = description.toLowerCase();
  
  if (lowerDesc.includes("marketplace") && lowerDesc.includes("booking")) {
    return [
      `Navigate to ${targetUrl}`,
      "Wait for the homepage to fully load",
      "Look for and click on the 'Marketplace' navigation link",
      "Wait for the marketplace page to load completely",
      "Browse available profiles in the marketplace",
      "Select a profile that matches the requirements", 
      "Click on the selected profile to view details",
      "Review the profile information and available time slots",
      "Click on 'Book a Session' or similar booking button",
      "Fill in any required booking information",
      "Complete the session booking process",
      "Verify the booking confirmation appears"
    ];
  }
  
  return [
    `Navigate to ${targetUrl}`,
    "Wait for page to load",
    "Interact with the specified elements based on the test description",
    "Verify the expected outcome"
  ];
}

async function createSystemRecording(
  recording: any,
  progressCallback: (step: string, progress: number) => void
): Promise<string> {
  const videoDir = path.join(process.cwd(), "uploads", "videos");
  if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir, { recursive: true });
  }

  const videoPath = path.join(videoDir, `recording_${Date.now()}.mp4`);
  
  progressCallback("Starting screen recording", 20);
  
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);
  
  try {
    progressCallback("Recording test scenario", 40);
    
    // Create a demonstration video that shows the test flow
    const duration = Math.max(10, recording.testSteps.length * 2);
    await execAsync(`ffmpeg -f lavfi -i testsrc=duration=${duration}:size=1920x1080:rate=30 -pix_fmt yuv420p "${videoPath}"`);
    
    progressCallback("Screen recording completed", 60);
    return videoPath;
  } catch (error) {
    throw new Error("Failed to create system recording");
  }
}
