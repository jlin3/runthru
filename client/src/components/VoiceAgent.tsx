import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface VoiceAgentProps {
  onTestStepsGenerated?: (steps: string[]) => void;
  onNarrationGenerated?: (script: string) => void;
}

export function VoiceAgent({ onTestStepsGenerated, onNarrationGenerated }: VoiceAgentProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [agentResponse, setAgentResponse] = useState("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const initializeAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 24000
        } 
      });
      
      // Setup audio level monitoring
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      // Setup MediaRecorder for voice capture
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        
        // Convert to base64 and send to voice agent
        const arrayBuffer = await audioBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        let binaryString = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binaryString += String.fromCharCode(uint8Array[i]);
        }
        const base64Audio = btoa(binaryString);
        
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'voice_audio',
            audio: base64Audio,
            agentType: activeAgent
          }));
        }
      };

      // Monitor audio levels
      const updateAudioLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average);
        }
        if (isRecording) {
          requestAnimationFrame(updateAudioLevel);
        }
      };
      
      if (isRecording) {
        updateAudioLevel();
      }

      return true;
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast({
        title: "Microphone Access Error",
        description: "Please allow microphone access to use voice features.",
        variant: "destructive"
      });
      return false;
    }
  };

  const connectToVoiceAgent = async (agentType: string) => {
    try {
      setConnectionStatus("connecting");
      
      // Create voice session
      await apiRequest("POST", `/api/voice/${agentType}`);
      
      // Connect to WebSocket for real-time communication
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      
      ws.onopen = () => {
        setConnectionStatus("connected");
        setActiveAgent(agentType);
        
        // Initialize voice session
        ws.send(JSON.stringify({
          type: 'create_session',
          agentType: agentType
        }));
        
        toast({
          title: "Voice Agent Connected",
          description: `Connected to ${agentType.replace('-', ' ')} voice agent.`
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleVoiceAgentMessage(data);
        } catch (error) {
          console.error("Error parsing voice agent message:", error);
        }
      };

      ws.onclose = () => {
        setConnectionStatus("disconnected");
        setActiveAgent(null);
        setIsRecording(false);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionStatus("disconnected");
        toast({
          title: "Connection Error",
          description: "Failed to connect to voice agent.",
          variant: "destructive"
        });
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Error connecting to voice agent:", error);
      setConnectionStatus("disconnected");
      toast({
        title: "Connection Failed",
        description: "Unable to establish voice agent connection.",
        variant: "destructive"
      });
    }
  };

  const handleVoiceAgentMessage = (data: any) => {
    switch (data.type) {
      case 'transcript':
        setTranscript(data.text);
        break;
      case 'response':
        setAgentResponse(data.text);
        break;
      case 'test_steps':
        if (onTestStepsGenerated) {
          onTestStepsGenerated(data.steps);
        }
        toast({
          title: "Test Steps Generated",
          description: "Voice agent has created test steps from your description."
        });
        break;
      case 'narration_script':
        if (onNarrationGenerated) {
          onNarrationGenerated(data.script);
        }
        toast({
          title: "Narration Generated",
          description: "Voice agent has created narration script."
        });
        break;
      case 'audio_response':
        // Play audio response from agent
        const audioData = atob(data.audio);
        const audioArray = new Uint8Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          audioArray[i] = audioData.charCodeAt(i);
        }
        const audioBlob = new Blob([audioArray], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
        break;
      case 'error':
        toast({
          title: "Voice Agent Error",
          description: data.error,
          variant: "destructive"
        });
        break;
    }
  };

  const startRecording = async () => {
    if (!activeAgent) {
      toast({
        title: "No Agent Selected",
        description: "Please select a voice agent first.",
        variant: "destructive"
      });
      return;
    }

    const audioInitialized = await initializeAudio();
    if (!audioInitialized) return;

    setIsRecording(true);
    mediaRecorderRef.current?.start(1000); // Capture in 1-second chunks
  };

  const stopRecording = () => {
    setIsRecording(false);
    setAudioLevel(0);
    mediaRecorderRef.current?.stop();
  };

  const disconnectAgent = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setConnectionStatus("disconnected");
    setActiveAgent(null);
    setIsRecording(false);
    setTranscript("");
    setAgentResponse("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected": return "bg-green-500";
      case "connecting": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  const getAgentDescription = (agentType: string) => {
    switch (agentType) {
      case "qa-assistant":
        return "Helps configure test settings, explains options, and guides you through the recording process.";
      case "narrator":
        return "Creates professional narration scripts for your test recordings with natural, engaging explanations.";
      case "test-generator":
        return "Generates detailed test steps from your descriptions using QA automation best practices.";
      default:
        return "";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-500 text-white rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2c-4.42 0-8 3.58-8 8v6c0 1.1.9 2 2 2h2V10c0-2.21 1.79-4 4-4s4 1.79 4 4v8h2c1.1 0 2-.9 2-2v-6c0-4.42-3.58-8-8-8z"/>
              </svg>
            </div>
            <span>AI Voice Agents</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(connectionStatus)}`}></div>
            <Badge variant={connectionStatus === "connected" ? "default" : "secondary"}>
              {connectionStatus === "connected" ? "Connected" : "Disconnected"}
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Interact with AI voice agents using OpenAI's Realtime API for natural conversation about QA testing
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="agents" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="agents">Voice Agents</TabsTrigger>
            <TabsTrigger value="conversation">Conversation</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: "qa-assistant", name: "QA Assistant", icon: "🤖" },
                { id: "narrator", name: "Narrator", icon: "🎙️" },
                { id: "test-generator", name: "Test Generator", icon: "⚡" }
              ].map((agent) => (
                <Card 
                  key={agent.id}
                  className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                    activeAgent === agent.id ? "ring-2 ring-purple-500 bg-purple-50" : ""
                  }`}
                  onClick={() => activeAgent !== agent.id && connectToVoiceAgent(agent.id)}
                >
                  <CardContent className="pt-6">
                    <div className="text-center space-y-2">
                      <div className="text-2xl">{agent.icon}</div>
                      <h3 className="font-medium">{agent.name}</h3>
                      <p className="text-sm text-gray-600">{getAgentDescription(agent.id)}</p>
                      {activeAgent === agent.id && (
                        <Badge className="bg-purple-500">Active</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="conversation" className="space-y-4">
            {/* Voice Recording Controls */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Button
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={connectionStatus !== "connected"}
                      variant={isRecording ? "destructive" : "default"}
                      size="lg"
                    >
                      {isRecording ? (
                        <>
                          <div className="w-4 h-4 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                          Stop Recording
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2c-4.42 0-8 3.58-8 8v6c0 1.1.9 2 2 2h2V10c0-2.21 1.79-4 4-4s4 1.79 4 4v8h2c1.1 0 2-.9 2-2v-6c0-4.42-3.58-8-8-8z"/>
                          </svg>
                          Start Voice Chat
                        </>
                      )}
                    </Button>
                    
                    {connectionStatus === "connected" && (
                      <Button variant="outline" onClick={disconnectAgent}>
                        Disconnect
                      </Button>
                    )}
                  </div>

                  {/* Audio Level Indicator */}
                  {isRecording && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Audio Level:</span>
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all duration-100"
                          style={{ width: `${Math.min(audioLevel, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Conversation Display */}
            <div className="space-y-4">
              {transcript && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Your Speech</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{transcript}</p>
                  </CardContent>
                </Card>
              )}

              {agentResponse && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Agent Response</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{agentResponse}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Voice Settings</CardTitle>
                <CardDescription>Configure voice interaction preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Microphone Access</label>
                    <p className="text-sm text-gray-600">
                      Voice agents require microphone access for real-time conversation.
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Response Format</label>
                    <p className="text-sm text-gray-600">
                      Agents can respond with both voice and text for better accessibility.
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Real-time Processing</label>
                    <p className="text-sm text-gray-600">
                      Uses OpenAI's Realtime API for low-latency voice interactions.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}