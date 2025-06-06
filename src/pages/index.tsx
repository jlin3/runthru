import { useState, useEffect } from "react";

// API Configuration - Updated for root directory fix
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://runthru-backend-prod.uc.r.appspot.com';

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
  const [summaryLog, setSummaryLog] = useState<string[]>([]);

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
    setSummaryLog([]);

    try {
      const apiUrl = `${API_BASE_URL}/api/agent`;
      console.log('Making request to:', apiUrl);
      
      const resp = await fetch(apiUrl, {
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

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }

      if (!resp.body) {
        throw new Error("No response body received");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
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
              console.log('Received event:', evt);
              
              if (evt.event === "tool_start") {
                updateStep(evt.tool, "running");
                setSummaryLog((log) => [...log, `Started: ${evt.tool.replace(/_/g, ' ')}`]);
              } else if (evt.event === "tool_end") {
                updateStep(evt.tool, "done");
                setSummaryLog((log) => [...log, `Completed: ${evt.tool.replace(/_/g, ' ')}`]);
              } else if (evt.event === "handoff_start") {
                setSummaryLog((log) => [...log, `Agent: ${evt.agent} started`]);
              } else if (evt.event === "handoff_end") {
                setSummaryLog((log) => [...log, `Agent: ${evt.agent} completed`]);
              } else if (evt.event === "tts_complete") {
                setReplyAudio(evt.reply);
                setVideoUrl(evt.video);
              } else if (evt.event === "agent_complete") {
                setVideoUrl(evt.video);
                setSummaryLog((log) => [...log, "Agent pipeline complete."]);
              } else if (evt.event === "error") {
                setSummaryLog((log) => [...log, `Error: ${evt.error || evt.detail}`]);
              }
            } catch (parseErr) {
              console.error("Failed to parse event:", line, parseErr);
              setSummaryLog((log) => [...log, `Received: ${line.substring(0, 50)}...`]);
            }
          }
        }
      } catch (streamErr) {
        console.error("Stream reading error:", streamErr);
        setSummaryLog((log) => [...log, `Stream error: ${streamErr instanceof Error ? streamErr.message : String(streamErr)}`]);
      }
    } catch (error: any) {
      console.error("Error submitting test:", error);
      setSummaryLog((log) => [...log, `Connection error: ${error.message}`]);
      alert(`Error running test: ${error.message}. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen p-4 bg-gray-50 flex flex-col items-center justify-center">
      <header className="w-full max-w-5xl mx-auto mb-8 flex flex-col items-center">
        <h1 className="text-5xl font-extrabold text-blue-700 tracking-tight mb-2">RunThru</h1>
        <p className="text-lg text-gray-600 font-medium">Agentic Feature Walk-Thru Videos</p>
      </header>
      <div className="w-full max-w-5xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column - Form */}
        <div className="flex-1 w-full max-w-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Test Description */}
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-2 text-gray-800">Test Description</h3>
              <div className="space-y-2">
                <textarea
                  value={testDescription}
                  onChange={(e) => setTestDescription(e.target.value)}
                  placeholder={
                    `Best practice: Describe a clear, user-focused scenario with expected outcome.\n\nExample: ` +
                    `"Visit https://bookvid.com/jesse, click 'Book a Session', select a date and time, fill in the form with test user info, submit, and verify the confirmation page appears with correct details."`
                  }
                  className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            {/* PR Link (Optional) + Connect to GitHub */}
            <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-col gap-3">
              <h3 className="text-lg font-semibold mb-2 text-gray-800">GitHub PR Link (Optional)</h3>
              <input
                type="url"
                value={prLink}
                onChange={(e) => setPrLink(e.target.value)}
                placeholder="https://github.com/username/repo/pull/123"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div>
                {!isConnectedToGithub ? (
                  <button
                    type="button"
                    onClick={handleConnectGithub}
                    className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors mt-2"
                  >
                    Connect to GitHub
                  </button>
                ) : (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    <span className="text-green-700 font-medium">Connected to GitHub</span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isProcessing || !testDescription.trim()}
              className={`w-full py-3 px-6 rounded-lg text-white font-semibold text-lg transition-colors ${
                isProcessing || !testDescription.trim()
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isProcessing ? "Running Test..." : "Create RunThru"}
            </button>
          </form>

          {/* Results */}
          {replyAudio && (
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-2 text-gray-800">Agent Response</h3>
              <audio controls src={replyAudio} className="w-full" />
            </div>
          )}

          {videoUrl && (
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-2 text-gray-800">Demo Video Ready</h3>
              <a
                href={(() => {
                  // If the backend returns a markdown link, extract the URL
                  const match = videoUrl.match(/\[.*?\]\((.*?)\)/);
                  if (match) return match[1];
                  // If the backend returns a plain URL, use as is
                  return videoUrl.replace(/\[.*?\]\((.*?)\)/, "$1").replace(/^.*?(https?:\/\/)/, "$1");
                })()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                📹 Open Demo Video
              </a>
            </div>
          )}
        </div>

        {/* Right Column - Progress Steps */}
        <div className="w-full max-w-sm lg:sticky lg:top-8 lg:self-start">
          <div className="bg-white p-4 rounded-lg shadow-sm border mb-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 text-center">Agent Pipeline Progress</h3>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full border-2 border-gray-300">
                    {step.status === "done" ? (
                      <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    ) : step.status === "running" ? (
                      <div className="w-5 h-5 bg-yellow-400 rounded-full animate-pulse"></div>
                    ) : (
                      <span className="text-gray-400 font-semibold">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${
                      step.status === "done" ? "text-green-700" :
                      step.status === "running" ? "text-yellow-700" : 
                      "text-gray-600"
                    }`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-gray-500">
                      {step.status === "done" ? "✓ Complete" :
                        step.status === "running" ? "⚡ In Progress..." : 
                        "⏳ Pending"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Streaming summary log */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-2 text-gray-800 text-center">Live Agent Log</h3>
            <div className="h-40 overflow-y-auto text-sm text-gray-700 space-y-1 font-mono">
              {summaryLog.length === 0 ? (
                <div className="text-gray-400 text-center">Agent progress will appear here…</div>
              ) : (
                summaryLog.map((msg, i) => <div key={i}>{msg}</div>)
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Home; 