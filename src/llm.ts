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

async function tryDirectModel(modelId: string, prompt: string): Promise<string | undefined> {
  const models = await vscode.lm.selectChatModels({ id: modelId });
  if (!models.length) {
    return undefined;
  }
  const model = models[0];
  const messages = [vscode.LanguageModelChatMessage.User(prompt)];
  const chatResponse = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
  let response = '';
  for await (const fragment of chatResponse.text) { response += fragment; }
  if (!response.trim()) {
    throw createError(ErrorCode.LLM_EMPTY, 'Empty response from model', { modelId });
  }
  return response;
}

async function tryModelByName(name: string, prompt: string): Promise<string | undefined> {
  const registry = LLMRegistry.instance();
  if (name === 'copilot') {
    if (!registry.get('copilot')) {
      registry.register(new CopilotClient());
    }
    const client = registry.get('copilot');
    if (client) {
      const rsp = await client.send({ prompt });
      if (!rsp.text || !rsp.text.trim()) {
        throw createError(ErrorCode.LLM_EMPTY, 'Empty LLM response', { model: name });
      }
      return rsp.text;
    }
    return undefined;
  }
  // Treat as concrete model id
  return tryDirectModel(name, prompt);
}

export async function getLLMResponse(prompt: string): Promise<string | undefined> {
  const config = vscode.workspace.getConfiguration('copilotTools.llm');
  const preferred: string[] = config.get<string[]>('preferredModels', ['copilot']);
  for (const modelName of preferred) {
    try {
      const text = await tryModelByName(modelName, prompt);
      if (text) {
        return text;
      }
    } catch (e) {
      ErrorHandler.handle(e, `LLMClient-${modelName}`);
    }
  }
  // Legacy fallback only if 'copilot' not listed
  if (!preferred.includes('copilot')) {
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
        throw createError(ErrorCode.LLM_EMPTY, 'Empty legacy LLM response');
      }
      return response;
    } catch (e) {
      ErrorHandler.handle(e, 'LLM-Legacy');
    }
  }
  return undefined;
}