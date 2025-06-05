import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Play, Square, Eye, Download, Loader2, Bot, Monitor, Camera, Activity } from 'lucide-react';

interface CUAStep {
  id: number;
  instruction: string;
  action: string;
  timestamp: number;
  screenshot?: string;
  success: boolean;
  error?: string;
  aiDecision?: string;
}

interface CUASession {
  id: string;
  title: string;
  objective: string;
  startTime: number;
  endTime?: number;
  steps: CUAStep[];
  screenshots: string[];
  status: 'running' | 'completed' | 'failed';
  summary?: string;
}

export function CUAAgent() {
  const [objective, setObjective] = useState('');
  const [title, setTitle] = useState('');
  const [maxSteps, setMaxSteps] = useState(10);
  const [currentSession, setCurrentSession] = useState<CUASession | null>(null);
  const [sessions, setSessions] = useState<CUASession[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedStep, setSelectedStep] = useState<CUAStep | null>(null);
  const [manualInstruction, setManualInstruction] = useState('');

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/cua/sessions');
      const data = await response.json();
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const createSession = async () => {
    if (!objective.trim()) {
      alert('Please enter an objective');
      return;
    }

    try {
      const response = await fetch('/api/cua/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective,
          title: title || 'CUA Session',
          config: {
            headless: false,
            recordVideo: true
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        setCurrentSession(data.session);
        await loadSessions();
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const executeAutonomous = async () => {
    if (!currentSession) return;

    setIsRunning(true);
    try {
      const response = await fetch(`/api/cua/execute/${currentSession.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxSteps })
      });

      const data = await response.json();
      if (data.success) {
        setCurrentSession(data.session);
        await loadSessions();
      }
    } catch (error) {
      console.error('Error executing autonomous workflow:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const executeManualStep = async () => {
    if (!currentSession || !manualInstruction.trim()) return;

    try {
      const response = await fetch(`/api/cua/step/${currentSession.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: manualInstruction })
      });

      const data = await response.json();
      if (data.success) {
        setCurrentSession(data.session);
        setManualInstruction('');
        await loadSessions();
      }
    } catch (error) {
      console.error('Error executing manual step:', error);
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/cua/session/${sessionId}`);
      const data = await response.json();
      if (data.success) {
        setCurrentSession(data.session);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDuration = (startTime: number, endTime?: number) => {
    const duration = (endTime || Date.now()) - startTime;
    return `${Math.round(duration / 1000)}s`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <Bot className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Computer-Using Agent (CUA)</h1>
          <p className="text-gray-600">AI-powered autonomous browser automation with screen recording</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Control Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Monitor className="h-5 w-5" />
                <span>New Session</span>
              </CardTitle>
              <CardDescription>Create and configure a new CUA session</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Session Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter session title..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Objective</label>
                <Textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Describe what the agent should accomplish..."
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Max Steps</label>
                <Input
                  type="number"
                  value={maxSteps}
                  onChange={(e) => setMaxSteps(parseInt(e.target.value))}
                  min={1}
                  max={50}
                />
              </div>

              <Button onClick={createSession} className="w-full">
                <Play className="h-4 w-4 mr-2" />
                Create Session
              </Button>
            </CardContent>
          </Card>

          {/* Session Control */}
          {currentSession && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Session Control</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm">
                  <div className="font-medium">Session: {currentSession.title}</div>
                  <div className="text-gray-600">ID: {currentSession.id}</div>
                  <Badge className={getStatusColor(currentSession.status)}>
                    {currentSession.status}
                  </Badge>
                </div>

                <Button 
                  onClick={executeAutonomous} 
                  disabled={isRunning}
                  className="w-full"
                >
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {isRunning ? 'Executing...' : 'Run Autonomous'}
                </Button>

                <Separator />

                <div>
                  <label className="text-sm font-medium">Manual Step</label>
                  <Input
                    value={manualInstruction}
                    onChange={(e) => setManualInstruction(e.target.value)}
                    placeholder="Enter manual instruction..."
                    onKeyPress={(e) => e.key === 'Enter' && executeManualStep()}
                  />
                  <Button onClick={executeManualStep} size="sm" className="mt-2 w-full">
                    Execute Step
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Session History */}
          <Card>
            <CardHeader>
              <CardTitle>Session History</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-3 border rounded-lg mb-2 cursor-pointer hover:bg-gray-50"
                    onClick={() => loadSession(session.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{session.title}</div>
                        <div className="text-xs text-gray-600 truncate">
                          {session.objective}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={getStatusColor(session.status)}>
                            {session.status}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {session.steps.length} steps
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDuration(session.startTime, session.endTime)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Session Details */}
        <div className="lg:col-span-2 space-y-4">
          {currentSession ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Session Overview</CardTitle>
                  <CardDescription>
                    {currentSession.objective}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{currentSession.steps.length}</div>
                      <div className="text-sm text-gray-600">Steps</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{currentSession.screenshots.length}</div>
                      <div className="text-sm text-gray-600">Screenshots</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {formatDuration(currentSession.startTime, currentSession.endTime)}
                      </div>
                      <div className="text-sm text-gray-600">Duration</div>
                    </div>
                    <div className="text-center">
                      <Badge className={getStatusColor(currentSession.status)}>
                        {currentSession.status}
                      </Badge>
                    </div>
                  </div>

                  {currentSession.summary && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-sm mb-1">Summary</div>
                      <div className="text-sm text-gray-700">{currentSession.summary}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Steps Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Camera className="h-5 w-5" />
                    <span>Execution Timeline</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    {currentSession.steps.map((step, index) => (
                      <div
                        key={step.id}
                        className={`p-4 border rounded-lg mb-3 cursor-pointer transition-colors ${
                          selectedStep?.id === step.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedStep(step)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">Step {step.id}</span>
                              <Badge 
                                className={step.success ? 'bg-green-500' : 'bg-red-500'}
                              >
                                {step.success ? 'Success' : 'Failed'}
                              </Badge>
                              <span className="text-xs text-gray-500">{step.action}</span>
                            </div>
                            <div className="text-sm mt-1">{step.instruction}</div>
                            {step.error && (
                              <div className="text-xs text-red-600 mt-1">Error: {step.error}</div>
                            )}
                            {step.aiDecision && (
                              <div className="text-xs text-blue-600 mt-1 bg-blue-50 p-2 rounded">
                                AI Analysis: {step.aiDecision.substring(0, 200)}...
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(step.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Screenshot Viewer */}
              {selectedStep?.screenshot && (
                <Card>
                  <CardHeader>
                    <CardTitle>Screenshot - Step {selectedStep.id}</CardTitle>
                    <CardDescription>{selectedStep.instruction}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <img 
                      src={`/api/cua/files/${currentSession.id}/${selectedStep.screenshot.split('/').pop()}`}
                      alt={`Step ${selectedStep.id} screenshot`}
                      className="max-w-full h-auto border rounded-lg"
                    />
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Bot className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Session</h3>
                <p className="text-gray-600">Create a new CUA session to get started</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 