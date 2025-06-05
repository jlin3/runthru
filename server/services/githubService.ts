import { Octokit } from "@octokit/rest";
import fs from "fs";
import path from "path";

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.warn("⚠️  GITHUB_TOKEN not set. GitHub service will be disabled.");
}

const octokit = token ? new Octokit({ auth: token }) : null;

export interface GitHubTarget {
  owner: string;
  repo: string;
  issue_number: number; // PR number or issue number
}

export const githubService = {
  async postVideoComment(videoPath: string, metadataPath: string): Promise<void> {
    if (!octokit) {
      console.warn("GitHub service disabled – missing token");
      return;
    }

    const targetEnv = process.env.GITHUB_TARGET;
    if (!targetEnv) {
      console.warn("GITHUB_TARGET env var not set. Skipping GitHub upload.");
      return;
    }

    let target: GitHubTarget;
    try {
      target = JSON.parse(targetEnv);
    } catch (err) {
      console.error("Invalid GITHUB_TARGET JSON", err);
      return;
    }

    // Upload metadata as a gist (private)
    const metaContent = await fs.promises.readFile(metadataPath, "utf8");
    const gistRes = await octokit.gists.create({
      files: { "metadata.json": { content: metaContent } },
      public: false,
      description: "RunThru test metadata",
    });

    const gistUrl = gistRes.data.html_url;

    // TODO: upload video as a release asset or via another method.
    // For now we'll just reference that it's stored in Supabase / GCS.

    await octokit.issues.createComment({
      owner: target.owner,
      repo: target.repo,
      issue_number: target.issue_number,
      body: `🎬 **RunThru Demo Video Ready**\n\nMetadata: ${gistUrl}\n\nVideo available in storage: ${path.basename(videoPath)}`,
    });
  },
}; 