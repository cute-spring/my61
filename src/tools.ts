import * as vscode from 'vscode';
import { ICopilotTool } from './copilotTool';

// Remove EmailRefineTool, JiraRefineTool, TranslateTool, escapeHtml, and their webview HTML functions from this file.
// Instead, export the tools from their new locations for registration.
export { EmailRefineTool } from './tools/email/emailRefineTool';
export { JiraRefineTool } from './tools/jira/jiraRefineTool';
export { TranslateTool } from './tools/translate/translateTool';
