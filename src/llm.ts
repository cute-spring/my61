/**
 * Selects the default Copilot LLM model.
 */
export async function selectCopilotLLMModel(): Promise<vscode.LanguageModelChat | undefined> {
  const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot' });
  return model;
}
import * as vscode from 'vscode';

export async function getLLMResponse(prompt: string): Promise<string | undefined> {
  const model = await selectCopilotLLMModel();
  if (!model) {
    vscode.window.showErrorMessage('No Copilot LLM model available.');
    return;
  }
  const messages = [vscode.LanguageModelChatMessage.User(prompt)];
  const chatResponse = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
  let response = '';
  for await (const fragment of chatResponse.text) {
    response += fragment;
  }
  return response;
} 