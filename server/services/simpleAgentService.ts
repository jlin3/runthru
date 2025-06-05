import { Agent, run } from "@openai/agents";

class SimpleAgentService {
  private agent: Agent;

  constructor() {
    this.agent = new Agent({
      name: 'RunThru QA Agent',
      instructions: 'You are RunThru, a QA automation assistant. You help create test plans and provide guidance for automated testing. Be helpful and provide detailed test steps.',
    });
  }

  async run(instruction: string): Promise<string> {
    try {
      const result = await run(this.agent, instruction);
      return result.finalOutput || "Agent completed successfully";
    } catch (error: any) {
      console.error('Agent execution error:', error);
      throw new Error(`Agent failed: ${error.message}`);
    }
  }

  async cleanup(): Promise<void> {
    // No cleanup needed for simple agent
  }
}

export const simpleAgentService = new SimpleAgentService(); 