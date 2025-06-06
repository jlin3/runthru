import type { NextApiRequest, NextApiResponse } from "next";
import { spawn } from "child_process";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  // Check if API key is available
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ 
      error: "OPENAI_API_KEY environment variable is not set" 
    });
  }

  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const { testDescription, prLink, isConnectedToGithub } = req.body;

  // Send ack event so client knows request received
  res.write(JSON.stringify({ event: "request_received" }) + "\n");

  // Spawn agent process with test description and OpenAI key from environment
  const child = spawn(
    "pnpm",
    ["--filter", "@runthru/agent", "exec", "tsx", "src/index.ts", testDescription || "Demo test"],
    {
      cwd: process.cwd(),
      env: { ...process.env, OPENAI_API_KEY },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  child.stderr.on("data", (d) => {
    res.write(JSON.stringify({ event: "error", error: d.toString() }) + "\n");
    console.error(d.toString());
  });

  child.stdout.on("data", (d) => {
    // Each tool logs a JSON line; forward as-is
    res.write(d);
  });

  child.on("close", async () => {
    res.write(
      JSON.stringify({ event: "pipeline_complete" }) + "\n"
    );

    res.end();
  });
} 