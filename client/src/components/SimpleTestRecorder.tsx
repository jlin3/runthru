import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

const testSchema = z.object({
  description: z.string().min(10, "Please provide a detailed test description"),
  targetUrl: z.string().url("Must be a valid URL"),
});

type TestData = z.infer<typeof testSchema>;

interface Recording {
  id: number;
  status: string;
  progress: number;
  currentStep?: string;
  videoPath?: string;
  duration?: number;
}

export function SimpleTestRecorder() {
  const [recording, setRecording] = useState<Recording | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<TestData>({
    resolver: zodResolver(testSchema),
    defaultValues: {
      description: "",
      targetUrl: "",
    },
  });

  const createRecordingMutation = useMutation({
    mutationFn: async (data: TestData) => {
      // Generate test steps using AI
      const stepsResponse = await apiRequest("POST", "/api/recordings/generate-steps", {
        description: data.description,
        targetUrl: data.targetUrl,
      });
      const { steps } = await stepsResponse.json();

      // Create recording with generated steps
      const recordingData = {
        title: `Test Recording - ${new Date().toLocaleDateString()}`,
        description: data.description,
        targetUrl: data.targetUrl,
        testSteps: steps,
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
      };

      const response = await apiRequest("POST", "/api/recordings", recordingData);
      return response.json();
    },
    onSuccess: async (recording) => {
      setRecording(recording);
      toast({
        title: "Recording Started",
        description: "Your test recording has begun. This may take a few minutes.",
      });
      
      // Start the recording process
      await apiRequest("POST", `/api/recordings/${recording.id}/start`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TestData) => {
    setIsGenerating(true);
    createRecordingMutation.mutate(data);
  };

  const handleReset = () => {
    setRecording(null);
    setIsGenerating(false);
    form.reset();
  };

  if (recording) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Recording in Progress</CardTitle>
          <CardDescription>
            Creating your test recording with AI-generated narration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Status: {recording.status}</span>
              <span className="text-sm text-gray-600">{recording.progress}%</span>
            </div>
            <Progress value={recording.progress} className="w-full" />
            {recording.currentStep && (
              <p className="text-sm text-gray-600">{recording.currentStep}</p>
            )}
          </div>

          {recording.status === "completed" && recording.videoPath && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-medium text-green-800">Recording Complete!</h3>
                <p className="text-sm text-green-600">
                  Your test recording with AI narration is ready for download.
                </p>
              </div>
              <Button
                onClick={() => window.open(`/api/recordings/${recording.id}/download`, '_blank')}
                className="w-full"
              >
                Download Video
              </Button>
            </div>
          )}

          {recording.status === "failed" && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-medium text-red-800">Recording Failed</h3>
              <p className="text-sm text-red-600">
                There was an error creating your recording. Please try again.
              </p>
            </div>
          )}

          <Button variant="outline" onClick={handleReset} className="w-full">
            Create New Recording
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>AI Test Recording</CardTitle>
        <CardDescription>
          Describe your test scenario and let AI create a recorded walkthrough with voiceover
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="targetUrl">Website URL</Label>
            <Input
              id="targetUrl"
              type="url"
              placeholder="https://example.com"
              {...form.register("targetUrl")}
            />
            {form.formState.errors.targetUrl && (
              <p className="text-sm text-red-600">{form.formState.errors.targetUrl.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Test Description</Label>
            <Textarea
              id="description"
              rows={6}
              placeholder="Describe what you want to test. For example: 'Test the user registration flow by creating a new account, filling out the profile information, and verifying email confirmation works properly.'"
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">What happens next:</h4>
            <ul className="text-sm text-blue-600 space-y-1">
              <li>• AI generates detailed test steps from your description</li>
              <li>• Browser automation records the screen during test execution</li>
              <li>• AI creates professional narration explaining each action</li>
              <li>• Video is composed with voiceover and avatar overlay</li>
            </ul>
          </div>

          <Button
            type="submit"
            disabled={createRecordingMutation.isPending}
            className="w-full"
          >
            {createRecordingMutation.isPending ? "Creating Recording..." : "Start Recording"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}