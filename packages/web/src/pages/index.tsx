import { useState } from "react";
// @ts-ignore No types available for this module
import Recorder from "mic-recorder-to-mp3";

type Step = {
  id: string;
  label: string;
  status: "pending" | "running" | "done";
};

const INITIAL_STEPS: Step[] = [
  { id: "plan_test", label: "Test Script", status: "pending" },
  { id: "run_browser", label: "Screen Record", status: "pending" },
  { id: "generate_metadata", label: "Metadata Generation", status: "pending" },
  { id: "generate_voiceover", label: "Voiceover", status: "pending" },
  { id: "merge_video", label: "Demo Video", status: "pending" },
  { id: "send_to_stakeholder", label: "Send to Stakeholders", status: "pending" },
];

const Home = () => {
  const [rec] = useState(() => new Recorder({ bitRate: 128 }));
  const [recording, setRecording] = useState(false);
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [replyAudio, setReplyAudio] = useState<string>();
  const [videoUrl, setVideoUrl] = useState<string>();
  
  // Form state
  const [testDescription, setTestDescription] = useState("");
  const [prLink, setPrLink] = useState("");
  const [isConnectedToGithub, setIsConnectedToGithub] = useState(false);

  const updateStep = (id: string, status: Step["status"]) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  };

  const handleConnectGithub = () => {
    // TODO: Implement GitHub OAuth flow
    setIsConnectedToGithub(true);
  };

  const handleGenerateWithAI = async () => {
    // TODO: Call AI to generate test description
    setTestDescription("AI-generated test description for checkout flow verification");
  };

  const start = () => {
    setRecording(true);
    rec.start();
  };

  const stop = async () => {
    setRecording(false);
    const [, blob] = await rec.stop().getMp3();

    // Reset step statuses
    setSteps(INITIAL_STEPS);
    setReplyAudio(undefined);
    setVideoUrl(undefined);

    const resp = await fetch("/api/agent", {
      method: "POST",
      body: blob,
    });

    if (!resp.body) return;

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (!line) continue;
        try {
          const evt = JSON.parse(line);
          if (evt.event === "tool_start") {
            updateStep(evt.tool, "running");
          } else if (evt.event === "tool_end") {
            updateStep(evt.tool, "done");
          } else if (evt.event === "handoff_start") {
            console.log(`Agent ${evt.agent} started`);
          } else if (evt.event === "handoff_end") {
            console.log(`Agent ${evt.agent} completed`);
          } else if (evt.event === "tts_complete") {
            setReplyAudio(evt.reply);
            setVideoUrl(evt.video);
          }
        } catch (err) {
          console.error("Failed to parse", line, err);
        }
      }
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 w-full max-w-4xl mx-auto">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-center mb-8">RunThru AI Test Agent</h1>
        
        {/* GitHub Connection */}
        <div className="mb-6 p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-3">GitHub Integration</h3>
          {!isConnectedToGithub ? (
            <button
              onClick={handleConnectGithub}
              className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Connect to GitHub
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span className="text-green-700">Connected to GitHub</span>
            </div>
          )}
        </div>

        {/* Test Description */}
        <div className="mb-6 p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Test Description</h3>
          <div className="space-y-3">
            <textarea
              value={testDescription}
              onChange={(e) => setTestDescription(e.target.value)}
              placeholder="Describe what you want to test. For example: 'Test the user registration flow by creating a new account, filling out profile information, and verifying email confirmation works properly.'"
              className="w-full h-24 p-3 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleGenerateWithAI}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Generate with AI
            </button>
          </div>
        </div>

        {/* PR Link (Optional) */}
        <div className="mb-6 p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-3">GitHub PR Link (Optional)</h3>
          <input
            type="url"
            value={prLink}
            onChange={(e) => setPrLink(e.target.value)}
            placeholder="https://github.com/username/repo/pull/123"
            className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Voice Input */}
        <div className="mb-6 p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Voice Input</h3>
          <button
            onMouseDown={start}
            onMouseUp={stop}
            className={`px-6 py-3 rounded-full text-white transition-colors ${
              recording ? "bg-red-600" : "bg-blue-600"
            }`}
          >
            {recording ? "Recording…" : "Hold to Speak"}
          </button>
        </div>

        {/* Progress Steps */}
        <div className="mb-6 p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Agent Pipeline Progress</h3>
          <ol className="w-full space-y-2">
            {steps.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    s.status === "done"
                      ? "bg-green-500"
                      : s.status === "running"
                      ? "bg-yellow-400"
                      : "bg-gray-300"
                  }`}
                />
                <span>{s.label}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Results */}
        {replyAudio && (
          <div className="mb-6 p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Agent Response</h3>
            <audio controls src={replyAudio} className="w-full" />
          </div>
        )}

        {videoUrl && (
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Demo Video</h3>
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline"
            >
              Watch Demo Video
            </a>
          </div>
        )}
      </div>
    </main>
  );
};

export default Home; 