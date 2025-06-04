import { useState } from "react";
import { ConfigurationForm } from "@/components/ConfigurationForm";
import { ExecutionStatus } from "@/components/ExecutionStatus";
import { RecordingHistory } from "@/components/RecordingHistory";
import { useRecording } from "@/hooks/useRecording";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [activeRecordingId, setActiveRecordingId] = useState<number | null>(null);
  const { recordings, isLoading } = useRecording();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15 8v8H5V8h10m1-2H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1V7a1 1 0 00-1-1z"/>
                    <path d="M19 10h2v8a2 2 0 01-2 2H7v-2h12V10z"/>
                  </svg>
                </div>
                <h1 className="text-xl font-semibold text-gray-900">QA Recording Agent</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
                </svg>
                Settings
              </Button>
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                A
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Configuration Panel */}
          <div className="lg:col-span-2">
            <ConfigurationForm 
              onRecordingStart={setActiveRecordingId}
              activeRecordingId={activeRecordingId}
            />
          </div>

          {/* Status & History Sidebar */}
          <div className="space-y-6">
            {activeRecordingId && (
              <ExecutionStatus 
                recordingId={activeRecordingId}
                onComplete={() => setActiveRecordingId(null)}
              />
            )}
            
            <RecordingHistory 
              recordings={recordings || []}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
