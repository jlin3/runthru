import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { spawn } from "child_process";

export const config = { api: { bodyParser: false } };

const openai = new OpenAI();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const chunks: Buffer[] = [];
  for await (const chunk of req as any) {
    chunks.push(Buffer.from(chunk as any));
  }
  const audioBuffer = Buffer.concat(chunks);

  // Send ack event so client knows upload finished
  res.write(JSON.stringify({ event: "upload_complete" }) + "\n");

  // Speech-to-text
  // @ts-ignore typing mismatch
  const stt = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file: audioBuffer as any,
  });

  res.write(JSON.stringify({ event: "stt_complete", text: stt.text }) + "\n");

  // Spawn agent process
  const child = spawn(
    "pnpm",
    ["--filter", "@runthru/agent", "exec", "ts-node", "src/index.ts", stt.text],
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
    // After agent finishes we need to build reply audio
    // For simplicity, parse lastOutput from agent log maybe not needed
    const replyText = "Your demo is ready";
    // @ts-ignore typing mismatch
    const speech = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: replyText,
    } as any);

    res.write(
      JSON.stringify({ event: "tts_complete", reply: speech.url, video: null }) + "\n"
    );

    res.end();
  });
} 