import * as vscode from 'vscode';

const decorationType = vscode.window.createTextEditorDecorationType({
  after: {
    color: "grey",
  },
});

let decorations: vscode.DecorationOptions[] = [];

export function applyDecoration(editor: vscode.TextEditor, line: number, suggestion: string) {
  const lineLength = editor.document.lineAt(line - 1).text.length;
  const range = new vscode.Range(
    new vscode.Position(line - 1, lineLength),
    new vscode.Position(line - 1, lineLength),
  );
  const truncatedSuggestion = suggestion.length > 25 ? suggestion.substring(0, 25) + "..." : suggestion;
  const decoration = { 
    range: range, 
    hoverMessage: suggestion,
    renderOptions: {
      after: {
        contentText: ` ${truncatedSuggestion}`,
      }
    }
  };
  decorations.push(decoration);
  editor.setDecorations(decorationType, decorations);
}

export function clearDecorations(editor: vscode.TextEditor) {
  decorations = [];
  editor.setDecorations(decorationType, []);
} 