import type { NextApiRequest, NextApiResponse } from "next";
import { spawn } from "child_process";

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

  // Spawn agent process with test description
  const child = spawn(
    "pnpm",
    ["--filter", "@runthru/agent", "exec", "ts-node", "src/index.ts", testDescription || "Demo test"],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  child.stderr.on("data", (d) => console.error(d.toString()));

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