import { useState } from "react";
// @ts-ignore No types available for this module
import Recorder from "mic-recorder-to-mp3";

type Step = {
  id: string;
  label: string;
  status: "pending" | "running" | "done";
};

const INITIAL_STEPS: Step[] = [
  { id: "plan_test", label: "Plan Test", status: "pending" },
  { id: "run_browser", label: "Run Browser", status: "pending" },
  { id: "merge_video", label: "Merge Video", status: "pending" },
  { id: "post_comment", label: "Post Comment", status: "pending" },
];

const Home = () => {
  const [rec] = useState(() => new Recorder({ bitRate: 128 }));
  const [recording, setRecording] = useState(false);
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [replyAudio, setReplyAudio] = useState<string>();
  const [videoUrl, setVideoUrl] = useState<string>();

  const updateStep = (id: string, status: Step["status"]) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
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
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 w-full max-w-2xl mx-auto">
      <button
        onMouseDown={start}
        onMouseUp={stop}
        className={`px-6 py-3 rounded-full text-white transition-colors ${
          recording ? "bg-red-600" : "bg-blue-600"
        }`}
      >
        {recording ? "Recording…" : "Hold to Speak"}
      </button>

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

      {replyAudio && <audio controls src={replyAudio} className="w-full" />}

      {videoUrl && (
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline"
        >
          Watch Demo Video
        </a>
      )}
    </main>
  );
};

export default Home; 