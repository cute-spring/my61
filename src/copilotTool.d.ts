export interface ICopilotTool {
  command: string;
  title: string;
  isEnabled(settings: import('vscode').WorkspaceConfiguration): boolean;
  handleInput(
    editor: import('vscode').TextEditor,
    selection: import('vscode').Selection,
    settings: import('vscode').WorkspaceConfiguration
  ): Promise<void>;
}
