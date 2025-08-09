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
      ErrorCode.CFG_INVALID_DOT_PATH
    ]);
    if (!actionable.has(err.code)) { return; }
    const msg = err.userMessage || `发生错误: ${err.code}`;
    const actions: string[] = [];
    if (err.code === ErrorCode.RENDER_JAVA_MISSING) { actions.push('安装 Java'); }
    if (err.code === ErrorCode.CFG_INVALID_DOT_PATH) { actions.push('重新配置'); }
    vscode.window.showErrorMessage(msg, ...actions).then(sel => {
      if (sel === '安装 Java') { vscode.env.openExternal(vscode.Uri.parse('https://adoptium.net/')); }
      if (sel === '重新配置') { vscode.commands.executeCommand('copilotTools.configurePlantUML'); }
    });
  }
}
