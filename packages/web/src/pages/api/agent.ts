import type { NextApiRequest, NextApiResponse } from "next";
import { spawn } from "child_process";

const OPENAI_API_KEY = "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";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const { testDescription, prLink, isConnectedToGithub } = req.body;

  // Send ack event so client knows request received
  res.write(JSON.stringify({ event: "request_received" }) + "\n");

  // Spawn agent process with test description and hardcoded OpenAI key
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