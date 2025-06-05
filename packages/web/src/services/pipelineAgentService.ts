import { Agent, run, tool } from "@openai/agents";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { openaiService } from "./openaiService.js";
import { playwrightService } from "./playwrightService.js";
import { videoService } from "./videoService.js";
import { githubService } from "./githubService.js";
import { pipelineEventBus } from "../eventBus.js";

// Helper to write JSON metadata
async function saveJson(obj: any, filename: string): Promise<string> {
  const dir = path.join(process.cwd(), "uploads", "metadata");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, `${filename}_${Date.now()}.json`);
  await fs.promises.writeFile(f, JSON.stringify(obj, null, 2), "utf8");
  return f;
}

/**
 * 1) Generate test script tool
 */
const generateTestScriptTool = tool({
  name: "generate_test_script",
  description: "Turn a natural-language request into an ordered list of Playwright steps",
  parameters: z.object({
    description: z.string(),
    targetUrl: z.string().url(),
  }),
  execute: async ({ description, targetUrl }) => {
    const steps = await openaiService.generateTestSteps(description, targetUrl);
    const stepsFile = await saveJson({ steps }, "steps");
    return stepsFile; // path
  },
});

/**
 * 2) Screen recording tool
 */
const recordScreenTool = tool({
  name: "record_screen",
  description: "Run Playwright steps and record a video",
  parameters: z.object({
    stepsFile: z.string(),
    targetUrl: z.string().url(),
    viewport: z.string().optional().default("1280x720"),
  }),
  execute: async ({ stepsFile, targetUrl, viewport }) => {
    const data = JSON.parse(await fs.promises.readFile(stepsFile, "utf8"));
    const steps: string[] = data.steps;

    const videoPath = await playwrightService.startRecording(
      targetUrl,
      steps,
      { browser: "chromium", viewport, headless: true, recordingQuality: "high" },
      () => {}
    );
    await playwrightService.stopRecording();
    return videoPath;
  },
});

/**
 * 3) Metadata aggregation
 */
const metadataTool = tool({
  name: "aggregate_metadata",
  description: "Collect metadata JSON for the run",
  parameters: z.object({
    videoPath: z.string(),
    stepsFile: z.string(),
  }),
  execute: async ({ videoPath, stepsFile }) => {
    const meta = {
      video: path.basename(videoPath),
      stepsFile: path.basename(stepsFile),
      createdAt: new Date().toISOString(),
    };
    const metaFile = await saveJson(meta, "meta");
    return metaFile;
  },
});

/**
 * 4) Voice over generation
 */
const voiceTool = tool({
  name: "generate_voice_over",
  description: "Generate a narration audio track using OpenAI TTS",
  parameters: z.object({
    stepsFile: z.string(),
  }),
  execute: async ({ stepsFile }) => {
    const data = JSON.parse(await fs.promises.readFile(stepsFile, "utf8"));
    const narrationText = await openaiService.generateNarrationScript(data.steps);
    const audioPath = await openaiService.generateSpeech(narrationText, "alloy");
    return audioPath;
  },
});

/**
 * 5) Merge video + audio
 */
const mergeTool = tool({
  name: "produce_demo_video",
  description: "Merge screen recording and voice-over to final demo video",
  parameters: z.object({
    videoPath: z.string(),
    audioPath: z.string(),
  }),
  execute: async ({ videoPath, audioPath }) => {
    const finalVideo = await videoService.composeVideo(videoPath, audioPath, {
      format: "mp4",
      avatarPosition: "Bottom Right",
      avatarStyle: "AI Assistant",
      avatarSize: 150,
      showAvatar: false,
    });
    return finalVideo;
  },
});

/**
 * 6) Upload to GitHub
 */
const githubTool = tool({
  name: "upload_to_github",
  description: "Attach demo video and metadata to GitHub PR or issue",
  parameters: z.object({
    finalVideo: z.string(),
    metadataPath: z.string(),
  }),
  execute: async ({ finalVideo, metadataPath }) => {
    await githubService.postVideoComment(finalVideo, metadataPath);
    return "Uploaded to GitHub successfully";
  },
});

export const pipelineAgent = new Agent({
  name: "RunThru Pipeline Agent",
  instructions: `You are RunThru Pipeline Agent. Execute each tool in order, passing outputs to the next.
Return only the result of upload_to_github at the end.`,
  tools: [
    generateTestScriptTool,
    recordScreenTool,
    metadataTool,
    voiceTool,
    mergeTool,
    githubTool,
  ],
});

export async function runPipeline(description: string, url: string): Promise<string> {
  const result = await run(
    pipelineAgent,
    `Create a QA demo for "${description}" on ${url}. Follow the pipeline.`
  );
  return (result.finalOutput ?? "") as string;
} 