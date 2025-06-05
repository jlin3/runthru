import { useState } from "react";
import { SimpleTestRecorder } from "@/components/SimpleTestRecorder";
import { RecordingHistory } from "@/components/RecordingHistory";
import { useRecording } from "@/hooks/useRecording";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Dashboard() {
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
                <h1 className="text-xl font-semibold text-gray-900">AI Test Recording</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/cua">
                <Button variant="outline" className="flex items-center space-x-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <span>CUA Agent</span>
                </Button>
              </Link>
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                AI
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Test Recorder */}
          <div className="lg:col-span-2">
            <SimpleTestRecorder />
          </div>

          {/* Recording History Sidebar */}
          <div>
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
