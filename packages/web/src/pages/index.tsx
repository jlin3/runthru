import { useState } from "react";

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
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [replyAudio, setReplyAudio] = useState<string>();
  const [videoUrl, setVideoUrl] = useState<string>();
  const [isProcessing, setIsProcessing] = useState(false);
  
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
    setTestDescription("Go to bookvid.com/jesse and book a session with available time slots");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!testDescription.trim()) {
      alert("Please enter a test description");
      return;
    }

    setIsProcessing(true);
    setSteps(INITIAL_STEPS);
    setReplyAudio(undefined);
    setVideoUrl(undefined);

    try {
      const resp = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testDescription,
          prLink,
          isConnectedToGithub,
        }),
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
            } else if (evt.event === "agent_complete") {
              setVideoUrl(evt.video);
            }
          } catch (err) {
            console.error("Failed to parse", line, err);
          }
        }
      }
    } catch (error) {
      console.error("Error submitting test:", error);
      alert("Error running test. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12 text-gray-800">
          RunThru AI Test Agent
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Form */}
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* GitHub Connection */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">GitHub Integration</h3>
                {!isConnectedToGithub ? (
                  <button
                    type="button"
                    onClick={handleConnectGithub}
                    className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
                  >
                    Connect to GitHub
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    <span className="text-green-700 font-medium">Connected to GitHub</span>
                  </div>
                )}
              </div>

              {/* Test Description */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Test Description</h3>
                <div className="space-y-4">
                  <textarea
                    value={testDescription}
                    onChange={(e) => setTestDescription(e.target.value)}
                    placeholder="Example: Go to bookvid.com/jesse and book a session"
                    className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleGenerateWithAI}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Generate with AI
                  </button>
                </div>
              </div>

              {/* PR Link (Optional) */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">GitHub PR Link (Optional)</h3>
                <input
                  type="url"
                  value={prLink}
                  onChange={(e) => setPrLink(e.target.value)}
                  placeholder="https://github.com/username/repo/pull/123"
                  className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing || !testDescription.trim()}
                className={`w-full py-4 px-6 rounded-lg text-white font-semibold text-lg transition-colors ${
                  isProcessing || !testDescription.trim()
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {isProcessing ? "Running Test..." : "Start Test Recording"}
              </button>
            </form>

            {/* Results */}
            {replyAudio && (
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Agent Response</h3>
                <audio controls src={replyAudio} className="w-full" />
              </div>
            )}

            {videoUrl && (
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Demo Video Ready</h3>
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  📹 Watch Demo Video
                </a>
              </div>
            )}
          </div>

          {/* Right Column - Progress Steps */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-xl font-semibold mb-6 text-gray-800">Agent Pipeline Progress</h3>
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-gray-300">
                      {step.status === "done" ? (
                        <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                      ) : step.status === "running" ? (
                        <div className="w-6 h-6 bg-yellow-400 rounded-full animate-pulse"></div>
                      ) : (
                        <span className="text-gray-400 font-semibold">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${
                        step.status === "done" ? "text-green-700" :
                        step.status === "running" ? "text-yellow-700" : 
                        "text-gray-600"
                      }`}>
                        {step.label}
                      </p>
                      <p className="text-sm text-gray-500">
                        {step.status === "done" ? "✓ Complete" :
                         step.status === "running" ? "⚡ In Progress..." : 
                         "⏳ Pending"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Home; 