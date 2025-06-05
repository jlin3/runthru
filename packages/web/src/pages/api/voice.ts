import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { spawn } from "child_process";

const openai = new OpenAI();

export const config = { api: { bodyParser: false } };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  // Collect raw chunks
  // @ts-ignore – Buffer iterable typing quirk
  const chunks: Buffer[] = [];
  for await (const chunk of req as any) {
    chunks.push(Buffer.from(chunk as any));
  }
  const audioBuffer = Buffer.concat(chunks);

  // @ts-ignore – SDK typing mismatch for Node buffer upload
  const stt = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file: audioBuffer as any,
  });

  // Kick off the agent CLI inside the monorepo
  const agentOutput = await new Promise<string>((resolve, reject) => {
    const child = spawn(
      "pnpm",
      ["--filter", "@runthru/agent", "exec", "ts-node", "src/index.ts", stt.text],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    let buf = "";
    child.stdout.on("data", (d) => (buf += d.toString()));
    child.stderr.on("data", (d) => console.error(d.toString()));
    child.on("error", reject);
    child.on("close", () => resolve(buf));
  });

  // @ts-ignore – SDK typing still stabilizing for TTS
  const speech = await openai.audio.speech.create({
    model: "tts-1",
    voice: "alloy",
    input: agentOutput,
  } as any);

  // For now video URL is empty – will be filled when tools implemented
  res.status(200).json({ reply: speech.url, video: null });
} 