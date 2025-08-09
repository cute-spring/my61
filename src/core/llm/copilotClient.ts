import * as vscode from 'vscode';
import { LLMClient, LLMRequest, LLMResponse } from './llmClient';

export class CopilotClient implements LLMClient {
  name() { return 'copilot'; }
  async send(req: LLMRequest): Promise<LLMResponse> {
    const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot' });
    if (!model) {
      throw new Error('No Copilot model available');
    }
    let prompt = req.prompt;
    if (req.system) {
      // VS Code API 当前未提供显式 system 消消息构造，前置拼接实现“系统指令”效果
      prompt = `[SYSTEM]\n${req.system}\n\n${prompt}`;
    }
    const messages: vscode.LanguageModelChatMessage[] = [
      vscode.LanguageModelChatMessage.User(prompt)
    ];
    const controller = new vscode.CancellationTokenSource();
    const rsp = await model.sendRequest(messages, {}, controller.token);
    let text = '';
    for await (const frag of rsp.text) { text += frag; }
    return { text, raw: rsp };
  }
}
