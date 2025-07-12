import * as vscode from 'vscode';
import { BaseTool } from '../base/baseTool';
import { getLLMResponse } from '../../llm';

interface RequirementData {
  description: string;
  summary?: string;
  refinedRequirements?: string;
  jiraStructure?: { epic: string; stories: string[] };
  context?: {
    projectName?: string;
    readmeContent?: string;
    userRole?: string;
  };
}

interface ChatMessage {
  sender: 'User' | 'AI' | 'System';
  message: string;
  timestamp: Date;
  step?: number;
}

export class JiraPlanningTool extends BaseTool {
  command = 'copilotTools.planJira';
  title = 'AI Jira Planning Assistant';

  private workflowStep = 0;
  private chatHistory: ChatMessage[] = [];
  private requirementData: RequirementData = { description: '' };
  private isProcessing = false;
  private sessionId: string = '';
  private templates: { [key: string]: RequirementData } = {};

  constructor() {
    super();
    this.sessionId = this.generateSessionId();
    this.loadTemplates();
  }

  isEnabled(settings: vscode.WorkspaceConfiguration): boolean {
    return true; // Always enabled for now
  }

  buildPrompt(...args: any[]): string {
    return 'Describe the feature or requirement you want to plan.';
  }

  parseResponse(response: string): any {
    return response;
  }

  async handleInputWithoutEditor(settings: vscode.WorkspaceConfiguration) {
    // Handle tool execution without requiring an active editor
    this.trackUsage('tool_opened', {
      hasSelection: false,
      selectionLength: 0,
      fileExtension: 'none'
    });

    // Create and show the webview panel
    this.panel = vscode.window.createWebviewPanel(
      'jiraPlanningTool',
      'AI Jira Planning Assistant',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    // Initialize the chat
    if (this.chatHistory.length === 0) {
      const context = await this.gatherContextWithoutEditor();
      const greeting = `Welcome! I'll help you plan a feature for ${context?.projectName || 'your project'}. Describe the feature or requirement you want to plan.`;
      this.addMessage('AI', greeting);
    }

    this.panel.webview.html = this.getWebviewHtml();

    // Handle webview messages
    this.panel.webview.onDidReceiveMessage(async (msg) => {
      try {
        if (msg.type === 'userInput') {
          if (this.isProcessing) {
            return;
          }
          
          this.addMessage('User', msg.message);
          this.isProcessing = true;
          this.panel!.webview.html = this.getWebviewHtml();
          
          const context = await this.gatherContextWithoutEditor();
          let aiResponse = await this.processWorkflowStep(msg.message, context);
          
          this.addMessage('AI', aiResponse);
          this.isProcessing = false;
          this.panel!.webview.html = this.getWebviewHtml();
          
        } else if (msg.type === 'reset') {
          this.resetWorkflow();
          this.panel!.webview.html = this.getWebviewHtml();
        }
      } catch (error) {
        this.isProcessing = false;
        this.addMessage('System', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        this.panel!.webview.html = this.getWebviewHtml();
      }
    });

    // Handle panel disposal
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  async handleInput(editor: vscode.TextEditor, selection: vscode.Selection, settings: vscode.WorkspaceConfiguration) {
    // Fallback to handleInputWithoutEditor for compatibility
    return this.handleInputWithoutEditor(settings);
  }

  getWebviewHtml(...args: any[]): string {
    const stepNames = ['Requirements', 'Summary', 'SME Review', 'Jira Structure', 'Creation', 'Complete'];
    const progressBar = stepNames.map((step, index) => 
      `<span class="${index <= this.workflowStep ? 'completed' : 'pending'}">${step}</span>`
    ).join(' → ');
    
    const messages = this.chatHistory.map((msg) => 
      `<div class="message ${msg.sender.toLowerCase()}">
         <strong>${msg.sender}:</strong> ${this.escapeHtml(msg.message)}
         <small>${msg.timestamp.toLocaleTimeString()}</small>
       </div>`
    ).join('');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 10px; background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); }
          .progress { margin-bottom: 20px; padding: 10px; background: var(--vscode-panel-background); border-radius: 5px; }
          .completed { color: var(--vscode-charts-green); font-weight: bold; }
          .pending { color: var(--vscode-descriptionForeground); }
          .message { margin: 10px 0; padding: 8px; border-radius: 5px; }
          .user { background: var(--vscode-inputValidation-infoBorder); }
          .ai { background: var(--vscode-inputValidation-warningBorder); }
          .system { background: var(--vscode-inputValidation-errorBorder); }
          .input-area { margin-top: 20px; }
          .action-btn { margin: 5px; padding: 5px 10px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer; }
          .processing { opacity: 0.7; }
          #userInput { width: 70%; padding: 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); }
          #sendBtn { padding: 8px 15px; margin-left: 5px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; cursor: pointer; }
        </style>
      </head>
      <body>
        <div id='chat-panel'>
          <h2>🎯 AI Jira Planning Assistant</h2>
          <div class='progress'><strong>Progress:</strong> ${progressBar}</div>
          <div id='messages'>${messages}</div>
          <div class='input-area'>
            <input id='userInput' type='text' placeholder='Type your message...' ${this.isProcessing ? 'disabled' : ''}/>
            <button id='sendBtn' ${this.isProcessing ? 'disabled' : ''}>Send</button>
            <button id='resetBtn' class='action-btn'>Reset Workflow</button>
          </div>
          ${this.isProcessing ? '<div class="processing">🤖 AI is thinking...</div>' : ''}
        </div>
        <script>
          const vscode = acquireVsCodeApi();
          
          function sendMessage() {
            const input = document.getElementById('userInput');
            if (input.value.trim()) {
              vscode.postMessage({ type: 'userInput', message: input.value });
              input.value = '';
            }
          }
          
          document.getElementById('sendBtn').onclick = sendMessage;
          document.getElementById('userInput').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') sendMessage();
          });
          
          document.getElementById('resetBtn').onclick = () => vscode.postMessage({ type: 'reset' });
        </script>
      </body>
      </html>
    `;
  }

  private async gatherContextWithoutEditor(): Promise<RequirementData['context']> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    let context: RequirementData['context'] = {};

    if (workspaceFolder) {
      context.projectName = workspaceFolder.name;
      
      // Try to read README file
      const readmePath = vscode.Uri.joinPath(workspaceFolder.uri, 'README.md');
      try {
        const readmeContent = await vscode.workspace.fs.readFile(readmePath);
        context.readmeContent = new TextDecoder().decode(readmeContent).substring(0, 1000);
      } catch (error) {
        // README not found, continue without it
      }
    }

    const settings = vscode.workspace.getConfiguration('copilotTools');
    context.userRole = settings.get('defaultUserRole', 'Developer');

    return context;
  }

  private async processWorkflowStep(userMessage: string, context: RequirementData['context']): Promise<string> {
    let response = '';

    switch (this.workflowStep) {
      case 0:
        this.requirementData.description = userMessage;
        response = `Great! You want to plan: "${userMessage}". Let me ask a few clarifying questions:\n\n1. Who is the primary user for this feature?\n2. What's the main business goal?\n3. Are there any technical constraints I should know about?`;
        this.workflowStep = 1;
        break;

      case 1:
        response = `Perfect! Based on your requirements, here's a summary:\n\n**Feature:** ${this.requirementData.description}\n**Additional Details:** ${userMessage}\n\nDoes this look accurate? If yes, I'll create the Jira structure.`;
        this.workflowStep = 2;
        break;

      case 2:
        if (userMessage.toLowerCase().includes('yes') || userMessage.toLowerCase().includes('accurate')) {
          response = `Excellent! Here's the proposed Jira structure:\n\n**Epic:** ${this.requirementData.description}\n\n**User Stories:**\n1. As a user, I want to ${this.requirementData.description.toLowerCase()} so that I can achieve my goals\n2. As a developer, I want to implement the core functionality\n3. As a QA, I want to test the feature thoroughly\n\nShould I create these tickets?`;
          this.workflowStep = 3;
        } else {
          response = 'No problem! Please tell me what needs to be adjusted.';
        }
        break;

      case 3:
        if (userMessage.toLowerCase().includes('yes') || userMessage.toLowerCase().includes('create')) {
          response = '🎉 Perfect! I would create the Jira tickets now (requires Jira configuration). \n\nWorkflow complete! You can:\n- Reset to start over\n- Configure Jira settings for real ticket creation';
          this.workflowStep = 4;
        } else {
          response = 'What would you like me to modify about the Jira structure?';
        }
        break;

      default:
        response = 'Workflow complete! Use Reset to start a new planning session.';
    }

    return response;
  }

  private addMessage(sender: 'User' | 'AI' | 'System', message: string, step?: number) {
    this.chatHistory.push({
      sender,
      message,
      timestamp: new Date(),
      step: step || this.workflowStep
    });
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private resetWorkflow() {
    this.workflowStep = 0;
    this.chatHistory = [];
    this.requirementData = { description: '' };
    this.isProcessing = false;
    this.addMessage('AI', 'Workflow reset. Describe the feature or requirement you want to plan.');
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadTemplates(): void {
    this.templates = {
      'web-feature': {
        description: 'New web application feature',
        context: { userRole: 'Developer' }
      }
    };
  }

  private trackUsage(event: string, properties: any = {}) {
    try {
      console.log(`Analytics: ${event}`, properties);
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }

  async handleWebviewMessage(panel: vscode.WebviewPanel, editor: vscode.TextEditor, selection: vscode.Selection, settings: vscode.WorkspaceConfiguration, ...args: any[]) {
    // This method is required by BaseTool but we handle messages in handleInputWithoutEditor
    // This is kept for compatibility
  }

  getSettingsSchema(): { [key: string]: any } {
    return {
      jiraUrl: {
        type: 'string',
        title: 'Jira URL',
        description: 'Your Jira instance URL (e.g., https://company.atlassian.net)',
        default: ''
      },
      defaultUserRole: {
        type: 'string',
        title: 'Default User Role',
        description: 'Your role for context-aware prompts',
        enum: ['Developer', 'Product Manager', 'Business Analyst', 'Designer', 'QA Engineer'],
        default: 'Developer'
      }
    };
  }
}
