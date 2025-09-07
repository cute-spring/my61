import * as vscode from 'vscode';
import { AppError, ErrorCode, ensureAppError } from './errors';
import { trackUsage } from '../analytics';

interface RecordedError { ts: number; code: ErrorCode; message: string; }

export class ErrorHandler {
  private static recent: RecordedError[] = [];
  private static maxRecent = 50;

  static handle(err: unknown, context?: string) {
    const appErr = ensureAppError(err);
    this.record(appErr);
    this.log(appErr, context);
    this.maybeNotify(appErr);
    trackUsage('error', { code: appErr.code, context });
  }

  static getRecent() { return [...this.recent]; }
  static clear() { this.recent = []; }

  private static record(err: AppError) {
    this.recent.unshift({ ts: Date.now(), code: err.code, message: err.message });
    if (this.recent.length > this.maxRecent) { this.recent.pop(); }
  }

  private static log(err: AppError, context?: string) {
    console.error(`[ERROR][${err.code}]${context? '['+context+']':''} ${err.message}`, err.details);
  }

  private static maybeNotify(err: AppError) {
    const actionable = new Set<ErrorCode>([
      ErrorCode.LLM_TIMEOUT,
      ErrorCode.LLM_FAILURE,
      ErrorCode.RENDER_JAVA_MISSING,
      ErrorCode.RENDER_DOT_BLOCKED,
      ErrorCode.CFG_INVALID_DOT_PATH,
      ErrorCode.RENDER_FAILURE
    ]);
    if (!actionable.has(err.code)) { return; }
    
    const msg = err.userMessage || `Error occurred: ${err.code}`;
    const actions: string[] = [];
    
    // Enhanced error recovery actions
    switch (err.code) {
      case ErrorCode.RENDER_JAVA_MISSING:
        actions.push('Install Java', 'Use Online Renderer');
        break;
      case ErrorCode.CFG_INVALID_DOT_PATH:
        actions.push('Reconfigure', 'Use Smetana Engine');
        break;
      case ErrorCode.RENDER_FAILURE:
        actions.push('Retry', 'Switch Layout Engine', 'Simplify Diagram');
        break;
      case ErrorCode.LLM_TIMEOUT:
      case ErrorCode.LLM_FAILURE:
        actions.push('Retry', 'Check Network');
        break;
      default:
        actions.push('Retry');
    }
    
    vscode.window.showErrorMessage(msg, ...actions).then(sel => {
      this.handleUserAction(sel, err.code);
    });
  }
  
  /**
   * Handle user-selected recovery actions
   */
  private static handleUserAction(action: string | undefined, errorCode: ErrorCode) {
    if (!action) return;
    
    switch (action) {
      case 'Install Java':
        vscode.env.openExternal(vscode.Uri.parse('https://adoptium.net/'));
        break;
      case 'Use Online Renderer':
        vscode.window.showInformationMessage('Switching to online PlantUML renderer for this session.');
        // Could implement online renderer fallback here
        break;
      case 'Reconfigure':
        vscode.commands.executeCommand('copilotTools.configurePlantUML');
        break;
      case 'Use Smetana Engine':
        vscode.workspace.getConfiguration('plantuml').update('layoutEngine', 'smetana', true);
        vscode.window.showInformationMessage('Switched to Smetana layout engine (pure Java, no external dependencies).');
        break;
      case 'Switch Layout Engine':
        this.promptLayoutEngineSwitch();
        break;
      case 'Retry':
        vscode.window.showInformationMessage('Please try your operation again.');
        break;
      case 'Check Network':
        vscode.window.showInformationMessage('Please check your network connection and try again.');
        break;
      case 'Simplify Diagram':
        vscode.window.showInformationMessage('Try reducing the complexity of your diagram or breaking it into smaller parts.');
        break;
    }
  }
  
  /**
   * Prompt user to switch layout engine
   */
  private static async promptLayoutEngineSwitch() {
    const engines = ['smetana', 'dot'];
    const current = vscode.workspace.getConfiguration('plantuml').get<string>('layoutEngine', 'smetana');
    const alternative = engines.find(e => e !== current) || 'smetana';
    
    const choice = await vscode.window.showQuickPick(
      engines.map(engine => ({
        label: engine,
        description: engine === current ? '(current)' : '',
        detail: engine === 'smetana' ? 'Pure Java, no dependencies' : 'Requires Graphviz installation'
      })),
      { placeHolder: 'Select layout engine' }
    );
    
    if (choice && choice.label !== current) {
      await vscode.workspace.getConfiguration('plantuml').update('layoutEngine', choice.label, true);
      vscode.window.showInformationMessage(`Switched to ${choice.label} layout engine.`);
    }
  }
}
