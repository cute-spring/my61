import * as vscode from 'vscode';
import { LLMClient, LLMRequest, LLMResponse } from './llmClient';

export class CopilotClient implements LLMClient {
  name() { return 'copilot'; }
  async send(req: LLMRequest): Promise<LLMResponse> {
    // Reuse streaming path to accumulate
    const parts: string[] = [];
    if (this.sendStream) {
      for await (const frag of this.sendStream(req)) { parts.push(frag); }
    }
    const text = parts.join('');
    return { text };
  }
  async *sendStream(req: LLMRequest): AsyncIterable<string> {
    const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot' });
    if (!model) {
      throw new Error('No Copilot model available');
    }
    let prompt = req.prompt;
    if (req.system) {
      prompt = `[SYSTEM]\n${req.system}\n\n${prompt}`;
    }
    const messages: vscode.LanguageModelChatMessage[] = [
      vscode.LanguageModelChatMessage.User(prompt)
    ];
    const controller = new vscode.CancellationTokenSource();
    const rsp = await model.sendRequest(messages, {}, controller.token);
    for await (const frag of rsp.text) { yield frag; }
  }
}
