import * as vscode from 'vscode';
import { LLMRegistry } from './core/llm/llmClient';
import { CopilotClient } from './core/llm/copilotClient';
import { ErrorHandler } from './core/errorHandler';
import { createError, ErrorCode } from './core/errors';

/**
 * Selects the default Copilot LLM model.
 */
export async function selectCopilotLLMModel(): Promise<vscode.LanguageModelChat | undefined> {
  const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot' });
  return model;
}

export async function getLLMResponse(prompt: string): Promise<string | undefined> {
  const registry = LLMRegistry.instance();
  if (!registry.get('copilot')) {
    registry.register(new CopilotClient());
  }
  const client = registry.getDefault();
  if (client) {
    try {
      const rsp = await client.send({ prompt });
      if (!rsp.text || !rsp.text.trim()) {
        throw createError(ErrorCode.LLM_EMPTY, 'Empty LLM response', { promptLength: prompt.length }, 'LLM 返回为空');
      }
      return rsp.text;
    } catch (e) {
      ErrorHandler.handle(e, 'LLMClient');
      // Continue to legacy fallback
    }
  }
  // Legacy fallback
  try {
    const model = await selectCopilotLLMModel();
    if (!model) {
      throw createError(ErrorCode.LLM_FAILURE, 'No Copilot model available', undefined, '无可用模型');
    }
    const messages = [vscode.LanguageModelChatMessage.User(prompt)];
    const chatResponse = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
    let response = '';
    for await (const fragment of chatResponse.text) { response += fragment; }
    if (!response.trim()) {
      throw createError(ErrorCode.LLM_EMPTY, 'Empty legacy LLM response', undefined, 'LLM 返回为空');
    }
    return response;
  } catch (e) {
    ErrorHandler.handle(e, 'LLM-Legacy');
    return undefined;
  }
}