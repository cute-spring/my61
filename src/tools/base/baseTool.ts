import { ICopilotTool } from '../../copilotTool';

export abstract class BaseTool implements ICopilotTool {
  abstract command: string;
  abstract title: string;
  abstract isEnabled(settings: any): boolean;
  abstract handleInput(...args: any[]): Promise<void>;
  // Add shared logic here as needed in the future
}
