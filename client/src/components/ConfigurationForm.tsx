import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, queryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  targetUrl: z.string().url("Must be a valid URL"),
  testSteps: z.array(z.string()).min(1, "At least one test step is required"),
  browserConfig: z.object({
    browser: z.string(),
    viewport: z.string(),
    headless: z.boolean(),
    recordingQuality: z.string(),
  }),
  narrationConfig: z.object({
    provider: z.string(),
    voice: z.string(),
    style: z.string(),
    speed: z.number(),
    autoGenerate: z.boolean(),
  }),
  videoConfig: z.object({
    format: z.string(),
    avatarPosition: z.string(),
    avatarStyle: z.string(),
    avatarSize: z.number(),
    showAvatar: z.boolean(),
  }),
});

type FormData = z.infer<typeof formSchema>;

interface ConfigurationFormProps {
  onRecordingStart: (id: number) => void;
  activeRecordingId: number | null;
}

export function ConfigurationForm({ onRecordingStart, activeRecordingId }: ConfigurationFormProps) {
  const [activeTab, setActiveTab] = useState("input");
  const [isGeneratingSteps, setIsGeneratingSteps] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      targetUrl: "",
      testSteps: [],
      browserConfig: {
        browser: "Chromium",
        viewport: "1920x1080",
        headless: true,
        recordingQuality: "High (1080p)",
      },
      narrationConfig: {
        provider: "ElevenLabs",
        voice: "Rachel",
        style: "Professional & Clear",
        speed: 1.0,
        autoGenerate: true,
      },
      videoConfig: {
        format: "MP4 (H.264)",
        avatarPosition: "Bottom Right",
        avatarStyle: "AI Assistant",
        avatarSize: 100,
        showAvatar: true,
      },
    },
  });

  const createRecordingMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/recordings", data);
      return response.json();
    },
    onSuccess: (recording) => {
      toast({
        title: "Recording Created",
        description: "Your recording configuration has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/recordings"] });
      startRecordingMutation.mutate(recording.id);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startRecordingMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/recordings/${id}/start`);
      return response.json();
    },
    onSuccess: (_, id) => {
      onRecordingStart(id);
      toast({
        title: "Recording Started",
        description: "Your test recording has begun.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateStepsMutation = useMutation({
    mutationFn: async ({ description, targetUrl }: { description: string; targetUrl: string }) => {
      const response = await apiRequest("POST", "/api/recordings/generate-steps", {
        description,
        targetUrl,
      });
      return response.json();
    },
    onSuccess: (data) => {
      form.setValue("testSteps", data.steps);
      toast({
        title: "Steps Generated",
        description: "AI has generated test steps for your flow.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (!data.title) {
      data.title = `Test Recording ${new Date().toLocaleDateString()}`;
    }
    createRecordingMutation.mutate(data);
  };

  const handleGenerateSteps = () => {
    const description = form.getValues("description");
    const targetUrl = form.getValues("targetUrl");
    
    if (!description || !targetUrl) {
      toast({
        title: "Missing Information",
        description: "Please provide both description and target URL to generate steps.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingSteps(true);
    generateStepsMutation.mutate({ description, targetUrl });
    setIsGeneratingSteps(false);
  };

  const isRecording = activeRecordingId !== null;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Progress Indicator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Create New Recording
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">System Ready</span>
            </div>
          </CardTitle>
          <CardDescription>Configure your automated test recording</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: "20%" }}></div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="input">Test Input</TabsTrigger>
          <TabsTrigger value="browser">Browser Setup</TabsTrigger>
          <TabsTrigger value="narration">Narration</TabsTrigger>
          <TabsTrigger value="video">Video Output</TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
                    <path d="M14 2v6h6M16 13H8m8 4H8m2-8H8"/>
                  </svg>
                </div>
                Test Criteria Input
              </CardTitle>
              <CardDescription>Define the test flow and instructions for automation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Test Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., E-commerce Checkout Flow"
                  {...form.register("title")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetUrl">Target URL</Label>
                <Input
                  id="targetUrl"
                  type="url"
                  placeholder="https://your-app.com"
                  {...form.register("targetUrl")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Test Description</Label>
                <Textarea
                  id="description"
                  rows={4}
                  placeholder="Describe the user flow you want to test..."
                  {...form.register("description")}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateSteps}
                disabled={isGeneratingSteps}
                className="w-full"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                {isGeneratingSteps ? "Generating..." : "AI Generate Steps"}
              </Button>

              {form.watch("testSteps").length > 0 && (
                <div className="space-y-2">
                  <Label>Generated Test Steps</Label>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    {form.watch("testSteps").map((step, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <span className="text-sm font-medium text-gray-500 min-w-[20px]">{index + 1}.</span>
                        <span className="text-sm text-gray-700">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="browser" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                Browser & Recording Settings
              </CardTitle>
              <CardDescription>Configure Playwright automation and screen recording options</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Browser Engine</Label>
                  <Select value={form.watch("browserConfig.browser")} onValueChange={(value) => form.setValue("browserConfig.browser", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Chromium">Chromium</SelectItem>
                      <SelectItem value="Firefox">Firefox</SelectItem>
                      <SelectItem value="WebKit">WebKit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Viewport Size</Label>
                  <Select value={form.watch("browserConfig.viewport")} onValueChange={(value) => form.setValue("browserConfig.viewport", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1920x1080">1920x1080 (Desktop)</SelectItem>
                      <SelectItem value="1440x900">1440x900 (Laptop)</SelectItem>
                      <SelectItem value="1366x768">1366x768 (Standard)</SelectItem>
                      <SelectItem value="390x844">390x844 (Mobile)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Recording Quality</Label>
                  <Select value={form.watch("browserConfig.recordingQuality")} onValueChange={(value) => form.setValue("browserConfig.recordingQuality", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High (1080p)">High (1080p)</SelectItem>
                      <SelectItem value="Medium (720p)">Medium (720p)</SelectItem>
                      <SelectItem value="Low (480p)">Low (480p)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="headless"
                      checked={form.watch("browserConfig.headless")}
                      onCheckedChange={(checked) => form.setValue("browserConfig.headless", checked as boolean)}
                    />
                    <Label htmlFor="headless">Run in headless mode</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="narration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <div className="w-8 h-8 bg-green-500 text-white rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2c-4.42 0-8 3.58-8 8v6c0 1.1.9 2 2 2h2V10c0-2.21 1.79-4 4-4s4 1.79 4 4v8h2c1.1 0 2-.9 2-2v-6c0-4.42-3.58-8-8-8z"/>
                  </svg>
                </div>
                Narration & Voice Settings
              </CardTitle>
              <CardDescription>Configure AI-generated narration and text-to-speech options</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Voice Provider</Label>
                  <Select value={form.watch("narrationConfig.provider")} onValueChange={(value) => form.setValue("narrationConfig.provider", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ElevenLabs">ElevenLabs</SelectItem>
                      <SelectItem value="OpenAI Voice">OpenAI Voice</SelectItem>
                      <SelectItem value="Azure Speech">Azure Speech</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Voice Character</Label>
                  <Select value={form.watch("narrationConfig.voice")} onValueChange={(value) => form.setValue("narrationConfig.voice", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rachel">Rachel (Professional Female)</SelectItem>
                      <SelectItem value="Adam">Adam (Professional Male)</SelectItem>
                      <SelectItem value="Josh">Josh (Friendly Male)</SelectItem>
                      <SelectItem value="Elli">Elli (Casual Female)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Narration Style</Label>
                  <Select value={form.watch("narrationConfig.style")} onValueChange={(value) => form.setValue("narrationConfig.style", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Professional & Clear">Professional & Clear</SelectItem>
                      <SelectItem value="Casual & Friendly">Casual & Friendly</SelectItem>
                      <SelectItem value="Technical & Detailed">Technical & Detailed</SelectItem>
                      <SelectItem value="Brief & Concise">Brief & Concise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Speaking Speed: {form.watch("narrationConfig.speed")}x</Label>
                  <Slider
                    value={[form.watch("narrationConfig.speed")]}
                    onValueChange={([value]) => form.setValue("narrationConfig.speed", value)}
                    min={0.5}
                    max={2}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoGenerate"
                    checked={form.watch("narrationConfig.autoGenerate")}
                    onCheckedChange={(checked) => form.setValue("narrationConfig.autoGenerate", checked as boolean)}
                  />
                  <Label htmlFor="autoGenerate">Auto-generate narration script</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="video" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <div className="w-8 h-8 bg-purple-500 text-white rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z"/>
                  </svg>
                </div>
                Video Composition & Avatar
              </CardTitle>
              <CardDescription>Configure Loom-style video output with presenter overlay</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Output Format</Label>
                  <Select value={form.watch("videoConfig.format")} onValueChange={(value) => form.setValue("videoConfig.format", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MP4 (H.264)">MP4 (H.264)</SelectItem>
                      <SelectItem value="WebM">WebM</SelectItem>
                      <SelectItem value="MOV">MOV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Avatar Position</Label>
                  <Select value={form.watch("videoConfig.avatarPosition")} onValueChange={(value) => form.setValue("videoConfig.avatarPosition", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bottom Right">Bottom Right</SelectItem>
                      <SelectItem value="Bottom Left">Bottom Left</SelectItem>
                      <SelectItem value="Top Right">Top Right</SelectItem>
                      <SelectItem value="Top Left">Top Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <Label>Avatar Style</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {["AI Assistant", "QA Tester", "Robot", "Custom"].map((style) => (
                    <div
                      key={style}
                      className={`relative cursor-pointer border-2 rounded-lg p-4 transition-colors ${
                        form.watch("videoConfig.avatarStyle") === style
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => form.setValue("videoConfig.avatarStyle", style)}
                    >
                      <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-semibold ${
                        style === "AI Assistant" ? "bg-gradient-to-br from-blue-400 to-blue-600" :
                        style === "QA Tester" ? "bg-gradient-to-br from-green-400 to-green-600" :
                        style === "Robot" ? "bg-gradient-to-br from-purple-400 to-purple-600" :
                        "bg-gradient-to-br from-gray-400 to-gray-600"
                      }`}>
                        {style === "AI Assistant" ? "AI" :
                         style === "QA Tester" ? "QA" :
                         style === "Robot" ? "🤖" : "U"}
                      </div>
                      <p className="text-xs text-center font-medium">{style}</p>
                      {form.watch("videoConfig.avatarStyle") === style && (
                        <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                          <svg className="w-2 h-2 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showAvatar"
                    checked={form.watch("videoConfig.showAvatar")}
                    onCheckedChange={(checked) => form.setValue("videoConfig.showAvatar", checked as boolean)}
                  />
                  <Label htmlFor="showAvatar">Show avatar in video</Label>
                </div>

                <div className="space-y-2">
                  <Label>Avatar Size: {form.watch("videoConfig.avatarSize")}px</Label>
                  <Slider
                    value={[form.watch("videoConfig.avatarSize")]}
                    onValueChange={([value]) => form.setValue("videoConfig.avatarSize", value)}
                    min={60}
                    max={150}
                    step={10}
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          type="submit"
          disabled={isRecording || createRecordingMutation.isPending}
          className="flex-1"
          size="lg"
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7L8 5z"/>
          </svg>
          {isRecording ? "Recording in Progress..." : "Start Recording"}
        </Button>

        <Button type="button" variant="outline" size="lg">
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
            <path d="M17 21v-8H7v8M7 3v5h8"/>
          </svg>
          Save Configuration
        </Button>
      </div>
    </form>
  );
}
