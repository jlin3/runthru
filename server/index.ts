import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { supabaseService } from "./services/supabaseService.js";
import { agentService } from "./services/agentService.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Agent routes
app.post('/api/agent/run', async (req, res) => {
  try {
    const { instruction } = req.body;
    
    if (!instruction) {
      return res.status(400).json({ error: 'Instruction is required' });
    }

    console.log(`🤖 Running agent with instruction: ${instruction}`);
    const result = await agentService.run(instruction);
    
    res.json({ 
      success: true, 
      result,
      instruction 
    });
  } catch (error: any) {
    console.error('Agent route error:', error);
    res.status(500).json({ 
      error: 'Agent execution failed',
      details: error.message 
    });
  }
});

app.post('/api/agent/demo', async (req, res) => {
  try {
    const { url, testDescription } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const instruction = testDescription 
      ? `Create and run a demo test for "${testDescription}" on ${url}. Start recording, analyze the page, generate a test plan, execute some basic interactions, take screenshots, and stop recording.`
      : `Create a demo recording of ${url}. Start recording, analyze the page structure, interact with key elements, take screenshots, and stop recording.`;

    console.log(`🎬 Running demo agent for: ${url}`);
    const result = await agentService.run(instruction);
    
    res.json({ 
      success: true, 
      result,
      url,
      testDescription: testDescription || 'Basic page exploration'
    });
  } catch (error: any) {
    console.error('Demo agent error:', error);
    res.status(500).json({ 
      error: 'Demo execution failed',
      details: error.message 
    });
  }
});

app.post('/api/agent/cleanup', async (req, res) => {
  try {
    await agentService.cleanup();
    res.json({ success: true, message: 'Agent cleaned up successfully' });
  } catch (error: any) {
    console.error('Agent cleanup error:', error);
    res.status(500).json({ 
      error: 'Cleanup failed',
      details: error.message 
    });
  }
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use PORT from environment (Google App Engine) or default to 3000
  const port = parseInt(process.env.PORT || "3000", 10);
  const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";
  
  server.listen(port, host, () => {
    log(`serving on ${host}:${port}`);
  });
})();
