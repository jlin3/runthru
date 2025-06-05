import { EventEmitter } from "events";

export interface PipelineEvent {
  runId: string;
  task: string; // tool name
  status: "start" | "end" | "error";
  message?: string;
}

class PipelineEventBus extends EventEmitter {
  emitEvent(event: PipelineEvent) {
    this.emit("pipeline", event);
  }
  onEvent(listener: (event: PipelineEvent) => void) {
    this.on("pipeline", listener);
  }
}

export const pipelineEventBus = new PipelineEventBus(); 