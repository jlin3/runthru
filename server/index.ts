import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { supabaseService } from "./services/supabaseService.js";
import { spawn } from "child_process";
import path from "path";

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

// Function to run the agent pipeline
async function runAgentPipeline(instruction: string): Promise<{ success: boolean; output?: string; error?: string }> {
  return new Promise((resolve) => {
    const agentPath = path.join(__dirname, "..", "packages", "agent");
    const child = spawn("node", ["-r", "tsx/cjs", "src/index.ts", instruction], {
      cwd: agentPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output });
      } else {
        resolve({ success: false, error: errorOutput || `Process exited with code ${code}` });
      }
    });

    child.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
  });
}

// Function to run agent pipeline with streaming output
async function runAgentPipelineStreaming(instruction: string, outputCallback: (data: string) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const agentPath = path.join(__dirname, "..", "packages", "agent");
    const child = spawn("node", ["-r", "tsx/cjs", "src/index.ts", instruction], {
      cwd: agentPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    child.stdout.on('data', (data) => {
      const output = data.toString();
      outputCallback(output);
    });

    child.stderr.on('data', (data) => {
      console.error('Agent stderr:', data.toString());
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Agent process exited with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Agent routes
app.post('/api/agent', async (req, res) => {
  try {
    const { testDescription, prLink, isConnectedToGithub } = req.body;
    
    if (!testDescription) {
      return res.status(400).json({ error: 'Test description is required' });
    }

    // Set up streaming response
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    console.log(`🎬 Running agent pipeline for: ${testDescription}`);
    
    // Create instruction based on frontend inputs
    let instruction = `Create a demo recording based on: "${testDescription}".`;
    if (prLink) {
      instruction += ` Related to GitHub PR: ${prLink}.`;
    }
    instruction += ' Execute the full 6-agent pipeline: plan test, run browser recording, generate metadata, create voiceover, merge video, and send to stakeholders.';

    try {
      await runAgentPipelineStreaming(instruction, (data) => {
        // Parse each line as potential JSON event
        const lines = data.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.event) {
                res.write(line + '\n');
              }
            } catch (e) {
              // Not a JSON event, but might be important output
              console.log('Agent output:', line);
            }
          }
        }
      });
      
      res.end();
      
    } catch (error: any) {
      res.write(JSON.stringify({ 
        event: "error", 
        error: error.message 
      }) + '\n');
      res.end();
    }
    
  } catch (error: any) {
    console.error('Agent route error:', error);
    res.write(JSON.stringify({ 
      event: "error", 
      error: error.message 
    }) + '\n');
    res.end();
  }
});

app.post('/api/agent/run', async (req, res) => {
  try {
    const { instruction } = req.body;
    
    if (!instruction) {
      return res.status(400).json({ error: 'Instruction is required' });
    }

    console.log(`🤖 Running agent with instruction: ${instruction}`);
    const result = await runAgentPipeline(instruction);
    
    res.json({ 
      success: result.success, 
      result: result.output,
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
    const result = await runAgentPipeline(instruction);
    
    res.json({ 
      success: result.success, 
      result: result.output,
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
    await runAgentPipeline('cleanup');
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
