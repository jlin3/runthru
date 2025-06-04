import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Recording } from "@shared/schema";

interface ExecutionStatusProps {
  recordingId: number;
  onComplete: () => void;
}

interface WSMessage {
  type: string;
  recordingId: number;
  step?: string;
  progress?: number;
  error?: string;
  videoPath?: string;
  duration?: number;
}

export function ExecutionStatus({ recordingId, onComplete }: ExecutionStatusProps) {
  const [wsData, setWsData] = useState<WSMessage | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: recording, isLoading } = useQuery<Recording>({
    queryKey: [`/api/recordings/${recordingId}`],
    refetchInterval: 2000,
  });

  const stopRecordingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/recordings/${recordingId}/stop`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Recording Stopped",
        description: "The recording has been stopped.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/recordings"] });
      onComplete();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onmessage = (event) => {
      const data: WSMessage = JSON.parse(event.data);
      if (data.recordingId === recordingId) {
        setWsData(data);
        
        if (data.type === "recording_completed") {
          toast({
            title: "Recording Complete",
            description: "Your test recording has been successfully generated.",
          });
          queryClient.invalidateQueries({ queryKey: ["/api/recordings"] });
          onComplete();
        } else if (data.type === "recording_failed") {
          toast({
            title: "Recording Failed",
            description: data.error || "An error occurred during recording.",
            variant: "destructive",
          });
          onComplete();
        }
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      ws.close();
    };
  }, [recordingId, onComplete, toast, queryClient]);

  if (isLoading || !recording) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentStep = wsData?.step || recording.currentStep || "Initializing";
  const progress = wsData?.progress || recording.progress || 0;
  const status = recording.status;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "recording":
      case "processing":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "completed":
        return "text-green-600 bg-green-50 border-green-200";
      case "failed":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "recording":
      case "processing":
        return (
          <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center animate-pulse">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </div>
        );
      case "completed":
        return (
          <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
            </svg>
          </div>
        );
      case "failed":
        return (
          <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 bg-gray-400 text-white rounded-full flex items-center justify-center">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-3">
          {getStatusIcon(status)}
          <span>Execution Status</span>
        </CardTitle>
        <CardDescription>Real-time recording progress</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className={`border rounded-lg p-4 ${getStatusColor(status)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium capitalize">{status}</span>
            <span className="text-sm">{progress}%</span>
          </div>
          <div className="text-sm opacity-90">{currentStep}</div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {(status === "recording" || status === "processing") && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => stopRecordingMutation.mutate()}
              disabled={stopRecordingMutation.isPending}
              className="flex-1"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
              Stop Recording
            </Button>
          )}
          
          {status === "completed" && recording.videoPath && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/api/recordings/${recordingId}/download`, '_blank')}
              className="flex-1"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              Download Video
            </Button>
          )}
        </div>

        {/* Recording Info */}
        {status === "completed" && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {recording.duration ? `${Math.floor(recording.duration / 60)}:${(recording.duration % 60).toString().padStart(2, '0')}` : "--"}
              </div>
              <div className="text-sm text-gray-500">Duration</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {recording.testSteps.length}
              </div>
              <div className="text-sm text-gray-500">Test Steps</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}