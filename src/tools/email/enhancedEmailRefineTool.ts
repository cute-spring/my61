import * as vscode from 'vscode';
import { BaseTool } from '../base/baseTool';
import { escapeHtml } from '../ui/escapeHtml';
import { getLLMResponse } from '../../llm';
import { marked } from 'marked';
import { trackUsage } from '../../analytics';
import { getModernStyles } from '../ui/modernStyles';
import { getInteractiveComponents } from '../ui/interactiveComponents';

interface ParsedEmail {
  refined: string;
  subjects: string[];
  tone?: string;
  wordCount?: number;
  readabilityScore?: number;
}

export class EnhancedEmailRefineTool extends BaseTool {
  command = 'copilotTools.refineEmail';
  title = '📧 Email Refine Pro';

  isEnabled(settings: vscode.WorkspaceConfiguration) {
    return settings.get('features.emailRefine', true);
  }

  buildPrompt(text: string, tone: string = 'professional') {
    return `Refine this email draft with a ${tone} tone. Ensure clarity, proper grammar, and professional formatting. Provide:
1. The refined email with clear paragraphs
2. Three subject line suggestions
3. Word count and readability assessment
4. Tone confirmation

Original email:
${text}`;
  }

  parseResponse(response: string): ParsedEmail {
    // Enhanced parsing logic
    let refined = '';
    let subjects: string[] = [];
    let tone = 'professional';
    let wordCount = 0;
    let readabilityScore = 0;

    // Parse sections from LLM response
    const sections = response.split(/(?:^|\n)(?:\d+\.|##|###)\s*/);
    
    refined = sections[1]?.trim() || response.trim();
    
    // Extract subject suggestions
    const subjectMatch = response.match(/Subject.*?:([\s\S]*?)(?:\n\n|$)/i);
    if (subjectMatch) {
      subjects = subjectMatch[1]
        .split(/\n|\d+\.|-/)
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 3);
    }

    // Calculate metrics
    wordCount = refined.split(/\s+/).length;
    
    return { refined, subjects, tone, wordCount, readabilityScore };
  }

  getWebviewHtml(original: string, parsed: ParsedEmail): string {
    const { refined, subjects, tone, wordCount } = parsed;
    const refinedHtml = marked.parse(refined);

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Refine Pro</title>
        ${getModernStyles()}
        <style>
          /* Primary Action Button Styles - Prominently positioned */
          .copy-btn {
            background: var(--vscode-button-background, #52c41a);
            color: var(--vscode-button-foreground, #fff);
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            font-size: 1em;
            cursor: pointer;
            margin-top: 8px;
            transition: background 0.2s;
          }
          .copy-btn:hover { 
            background: var(--vscode-button-hoverBackground, #73d13d); 
          }
          
          button.refine-again {
            background: #ffc107;
            color: #fff;
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            font-size: 1em;
            cursor: pointer;
            margin-top: 8px;
            transition: background 0.2s;
          }
          button.refine-again:hover { 
            background: #ffca2c; 
          }

          /* Tool Container and Enhanced Styles */
          .tone-selector {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
            flex-wrap: wrap;
          }
          
          .tone-chip {
            padding: 6px 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 16px;
            background: var(--vscode-input-background);
            cursor: pointer;
            font-size: 0.875rem;
            transition: all 0.2s ease;
          }
          
          .tone-chip.active {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-color: var(--vscode-button-background);
          }
          
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 12px;
            margin: 16px 0;
          }
          
          .metric-card {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 12px;
            border-radius: 8px;
            text-align: center;
            font-size: 0.875rem;
          }
          
          .metric-value {
            font-size: 1.5rem;
            font-weight: 600;
            display: block;
          }
          
          .before-after {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin: 24px 0;
          }
          
          @media (max-width: 768px) {
            .before-after {
              grid-template-columns: 1fr;
            }
          }
          
          .email-preview {
            border: 1px solid var(--vscode-input-border);
            border-radius: 8px;
            overflow: hidden;
          }
          
          .email-header {
            background: var(--vscode-list-hoverBackground);
            padding: 12px 16px;
            border-bottom: 1px solid var(--vscode-input-border);
            font-size: 0.875rem;
            font-weight: 500;
          }
          
          .email-content {
            padding: 16px;
            min-height: 150px;
          }
          
          .subject-suggestions {
            margin: 24px 0;
          }
          
          .subject-grid {
            display: grid;
            gap: 8px;
          }
          
          .subject-option {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          .subject-option:hover {
            background: var(--vscode-list-hoverBackground);
            border-color: var(--vscode-textLink-foreground);
          }
          
          .subject-text {
            flex: 1;
            font-weight: 500;
          }
          
          .subject-length {
            font-size: 0.75rem;
            color: var(--vscode-descriptionForeground);
            background: var(--vscode-badge-background);
            padding: 2px 6px;
            border-radius: 4px;
            margin-left: 8px;
          }
          
          .actions-panel {
            position: sticky;
            bottom: 0;
            background: var(--vscode-panel-background);
            border-top: 1px solid var(--vscode-panel-border);
            padding: 16px;
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
          }
          
          .quick-actions {
            display: flex;
            gap: 8px;
            margin: 16px 0;
          }
          
          .refinement-panel {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 8px;
            padding: 16px;
            margin-top: 16px;
          }
          
          .expandable-section {
            border: 1px solid var(--vscode-input-border);
            border-radius: 8px;
            margin-bottom: 16px;
            overflow: hidden;
          }
          
          .section-toggle {
            background: var(--vscode-list-hoverBackground);
            padding: 12px 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-weight: 500;
            transition: background 0.2s ease;
          }
          
          .section-toggle:hover {
            background: var(--vscode-list-activeSelectionBackground);
          }
          
          .section-content {
            padding: 16px;
            border-top: 1px solid var(--vscode-input-border);
            display: none;
          }
          
          .section-content.active {
            display: block;
          }
        </style>
      </head>
      <body>
        <div class="tool-container">
          <div class="tool-header">
            <span class="tool-header-icon">📧</span>
            <div>
              <h1 style="margin: 0; font-size: 1.25rem;">Email Refine Pro</h1>
              <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 0.875rem;">
                Professional email enhancement with AI-powered suggestions
              </p>
            </div>
          </div>
          
          <div class="tool-content">
            <!-- Quick Actions Bar - Prominently displayed at top -->
            <div class="section-card" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #1890ff; margin-bottom: 24px;">
              <div class="form-label" style="color: #1890ff; font-weight: 600; margin-bottom: 12px;">
                ⚡ Quick Actions
              </div>
              <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
                <button class="copy-btn" onclick="copyRefined()" style="background: #52c41a; flex: 0 0 auto;">
                  📋 Copy Email
                </button>
                <button class="copy-btn" onclick="copyAsPlainText()" style="background: #888; flex: 0 0 auto;">
                  📄 Copy Plain Text
                </button>
                <button class="copy-btn" onclick="replaceSelection()" style="background: #1890ff; flex: 0 0 auto;">
                  🔄 Replace Original
                </button>
                <button class="refine-again" onclick="showRefineDialog()" style="flex: 0 0 auto;">
                  ✨ Refine Again
                </button>
              </div>
            </div>

            <!-- Tone Selector -->
            <div class="section-card">
              <div class="form-label">Email Tone</div>
              <div class="tone-selector">
                <div class="tone-chip active" data-tone="professional">Professional</div>
                <div class="tone-chip" data-tone="friendly">Friendly</div>
                <div class="tone-chip" data-tone="formal">Formal</div>
                <div class="tone-chip" data-tone="casual">Casual</div>
                <div class="tone-chip" data-tone="persuasive">Persuasive</div>
                <div class="tone-chip" data-tone="apologetic">Apologetic</div>
              </div>
            </div>

            <!-- Email Metrics -->
            <div class="metrics-grid">
              <div class="metric-card">
                <span class="metric-value">${wordCount || 0}</span>
                Words
              </div>
              <div class="metric-card">
                <span class="metric-value">${Math.ceil((wordCount || 0) / 200)}</span>
                Min Read
              </div>
              <div class="metric-card">
                <span class="metric-value">${tone || 'Professional'}</span>
                Tone
              </div>
              <div class="metric-card">
                <span class="metric-value">A+</span>
                Grade
              </div>
            </div>

            <!-- Before/After Comparison -->
            <div class="before-after">
              <div class="email-preview">
                <div class="email-header">📝 Original Draft</div>
                <div class="email-content">
                  <textarea id="originalText" class="form-textarea" style="border: none; background: transparent; resize: vertical; min-height: 120px;">${escapeHtml(original)}</textarea>
                </div>
              </div>
              
              <div class="email-preview">
                <div class="email-header">✨ Refined Version</div>
                <div class="email-content" id="refinedContent">
                  ${refinedHtml}
                </div>
              </div>
            </div>

            <!-- Subject Line Suggestions -->
            ${subjects.length > 0 ? `
            <div class="section-card">
              <div class="form-label">📬 Subject Line Suggestions</div>
              <div class="subject-grid">
                ${subjects.map((subject, index) => `
                  <div class="subject-option" onclick="selectSubject('${escapeHtml(subject)}')">
                    <span class="subject-text">${escapeHtml(subject)}</span>
                    <span class="subject-length">${subject.length} chars</span>
                  </div>
                `).join('')}
              </div>
            </div>
            ` : ''}

            <!-- Advanced Options -->
            <div class="expandable-section">
              <div class="section-toggle" onclick="toggleSection('advanced')">
                <span>🔧 Advanced Refinement</span>
                <span class="collapse-icon">▶</span>
              </div>
              <div class="section-content" id="advanced">
                <div class="refinement-panel">
                  <div class="form-group">
                    <label class="form-label" for="additionalInstructions">Additional Instructions</label>
                    <textarea 
                      id="additionalInstructions" 
                      class="form-textarea" 
                      rows="3" 
                      placeholder="e.g., Make it more urgent, add a call-to-action, include specific deadline..."
                    ></textarea>
                    <div class="char-count" id="instructionsCount"></div>
                  </div>
                  
                  <div class="quick-actions">
                    <button class="btn btn-secondary btn-sm" onclick="addInstruction('more urgent')">More Urgent</button>
                    <button class="btn btn-secondary btn-sm" onclick="addInstruction('add deadline')">Add Deadline</button>
                    <button class="btn btn-secondary btn-sm" onclick="addInstruction('call to action')">Call to Action</button>
                    <button class="btn btn-secondary btn-sm" onclick="addInstruction('more polite')">More Polite</button>
                  </div>
                  
                  <button class="btn btn-primary" onclick="refineAgain()">
                    <span>🔄</span> Refine Again
                  </button>
                </div>
              </div>
            </div>

            <!-- Email Templates -->
            <div class="expandable-section">
              <div class="section-toggle" onclick="toggleSection('templates')">
                <span>📋 Email Templates</span>
                <span class="collapse-icon">▶</span>
              </div>
              <div class="section-content" id="templates">
                <div class="suggestion-chips">
                  <div class="chip" onclick="applyTemplate('meeting')">📅 Meeting Request</div>
                  <div class="chip" onclick="applyTemplate('followup')">📞 Follow-up</div>
                  <div class="chip" onclick="applyTemplate('introduction')">👋 Introduction</div>
                  <div class="chip" onclick="applyTemplate('thank-you')">🙏 Thank You</div>
                  <div class="chip" onclick="applyTemplate('apology')">😔 Apology</div>
                  <div class="chip" onclick="applyTemplate('announcement')">📢 Announcement</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions Panel -->
          <div class="actions-panel">
            <button class="btn btn-primary btn-lg" onclick="copyRefined()">
              <span>📋</span> Copy Email
            </button>
            <button class="btn btn-secondary" onclick="copyAsPlainText()">
              <span>📄</span> Copy Plain Text
            </button>
            <button class="btn btn-secondary" onclick="replaceSelection()">
              <span>🔄</span> Replace Original
            </button>
            <button class="btn btn-secondary" onclick="exportEmail()">
              <span>📤</span> Export
            </button>
          </div>
        </div>

        ${getInteractiveComponents()}
        
        <script>
          let currentTone = 'professional';
          
          // Tone selection
          document.querySelectorAll('.tone-chip').forEach(chip => {
            chip.addEventListener('click', function() {
              document.querySelectorAll('.tone-chip').forEach(c => c.classList.remove('active'));
              this.classList.add('active');
              currentTone = this.dataset.tone;
            });
          });
          
          // Section toggling
          function toggleSection(sectionId) {
            const content = document.getElementById(sectionId);
            const toggle = content.previousElementSibling;
            const icon = toggle.querySelector('.collapse-icon');
            
            if (content.classList.contains('active')) {
              content.classList.remove('active');
              icon.textContent = '▶';
            } else {
              content.classList.add('active');
              icon.textContent = '▼';
            }
          }
          
          // Subject selection
          function selectSubject(subject) {
            window.acquireVsCodeApi().postMessage({ 
              command: 'insertSubject', 
              subject: subject 
            });
            showToast('Subject line copied!', 'success');
          }
          
          // Quick instruction additions
          function addInstruction(instruction) {
            const textarea = document.getElementById('additionalInstructions');
            const current = textarea.value;
            textarea.value = current ? current + ', ' + instruction : instruction;
          }
          
          // Enhanced copy functions
          async function copyRefined() {
            const content = document.getElementById('refinedContent');
            const text = content.innerText;
            await copyWithFeedback(text, event.target);
          }
          
          async function copyAsPlainText() {
            const content = document.getElementById('refinedContent');
            const text = content.innerText;
            await copyWithFeedback(text, event.target);
          }
          
          // Show prominent refine dialog
          function showRefineDialog() {
            const advancedSection = document.getElementById('advanced');
            const toggle = advancedSection.previousElementSibling;
            
            // Auto-expand advanced section
            if (!advancedSection.classList.contains('active')) {
              toggleSection('advanced');
            }
            
            // Focus on the instruction textarea
            const textarea = document.getElementById('additionalInstructions');
            textarea.focus();
            textarea.placeholder = "✨ What would you like to improve? (e.g., make it more urgent, add deadline, more polite, etc.)";
            
            // Show toast to guide user
            showToast('💡 Add your refinement instructions below and click "Refine Again"', 'info');
          }
          
          // Refine again with instructions
          async function copyRefined() {
            const content = document.getElementById('refinedContent');
            const text = content.innerText;
            await copyWithFeedback(text, event.target);
          }
          
          async function copyAsPlainText() {
            const content = document.getElementById('refinedContent');
            const text = content.innerText;
            await copyWithFeedback(text, event.target);
          }
          
          // Refine again with instructions
          function refineAgain() {
            const instructions = document.getElementById('additionalInstructions').value;
            const original = document.getElementById('originalText').value;
            
            showProgress(event.target, 'Refining...');
            
            window.acquireVsCodeApi().postMessage({
              command: 'refineAgain',
              original: original,
              instructions: instructions,
              tone: currentTone
            });
          }
          
          // Template application
          function applyTemplate(templateType) {
            window.acquireVsCodeApi().postMessage({
              command: 'applyTemplate',
              templateType: templateType
            });
          }
          
          // Replace selection
          function replaceSelection() {
            const content = document.getElementById('refinedContent').innerText;
            window.acquireVsCodeApi().postMessage({
              command: 'replaceSelection',
              content: content
            });
          }
          
          // Export options
          function exportEmail() {
            const content = document.getElementById('refinedContent').innerText;
            const subject = document.querySelector('.subject-option .subject-text')?.textContent || 'Email Subject';
            
            window.acquireVsCodeApi().postMessage({
              command: 'exportEmail',
              content: content,
              subject: subject
            });
          }
          
          // Setup word count for instructions
          document.addEventListener('DOMContentLoaded', function() {
            const textarea = document.getElementById('additionalInstructions');
            const counter = document.getElementById('instructionsCount');
            setupWordCount(textarea, counter, 500);
          });
        </script>
      </body>
      </html>
    `;
  }

  handleWebviewMessage(panel: vscode.WebviewPanel, editor: vscode.TextEditor, selection: vscode.Selection, settings: vscode.WorkspaceConfiguration, original: string, parsed: ParsedEmail, msg: any) {
    switch (msg.command) {
      case 'insertSubject':
        if (msg.subject) {
          editor.edit(editBuilder => {
            editBuilder.insert(selection.start, `${msg.subject}\n`);
          });
        }
        break;
        
      case 'refineAgain':
        this.handleRefineAgain(panel, msg, settings);
        break;
        
      case 'applyTemplate':
        this.handleTemplateApplication(panel, msg, settings);
        break;
        
      case 'replaceSelection':
        if (msg.content) {
          editor.edit(editBuilder => {
            editBuilder.replace(selection, msg.content);
          });
        }
        break;
        
      case 'exportEmail':
        this.handleEmailExport(msg);
        break;
    }
  }

  private async handleRefineAgain(panel: vscode.WebviewPanel, msg: any, settings: vscode.WorkspaceConfiguration) {
    const enhancedPrompt = `${this.buildPrompt(msg.original, msg.tone)}
    
Additional instructions: ${msg.instructions}`;
    
    const response = await getLLMResponse(enhancedPrompt);
    if (response) {
      const newParsed = this.parseResponse(response);
      panel.webview.html = this.getWebviewHtml(msg.original, newParsed);
    }
  }

  private async handleTemplateApplication(panel: vscode.WebviewPanel, msg: any, settings: vscode.WorkspaceConfiguration) {
    const templates = {
      meeting: "Please transform this into a professional meeting request with clear agenda items and time slots.",
      followup: "Convert this into a polite follow-up email that references previous communication.",
      introduction: "Rewrite this as a professional introduction email with clear value proposition.",
      'thank-you': "Transform this into a gracious thank-you email that acknowledges specific contributions.",
      apology: "Rewrite this as a sincere apology email that takes responsibility and offers solutions.",
      announcement: "Convert this into a clear announcement email with key highlights and next steps."
    };
    
    const templateInstruction = templates[msg.templateType as keyof typeof templates];
    if (templateInstruction) {
      // Apply template transformation
      vscode.window.showInformationMessage(`Applied ${msg.templateType} template`);
    }
  }

  private handleEmailExport(msg: any) {
    // Create export options
    vscode.window.showQuickPick([
      'Copy to Clipboard',
      'Save as Draft',
      'Open in Email Client'
    ], {
      title: 'Export Email'
    }).then(choice => {
      switch (choice) {
        case 'Copy to Clipboard':
          vscode.env.clipboard.writeText(`Subject: ${msg.subject}\n\n${msg.content}`);
          break;
        case 'Save as Draft':
          // Implementation for saving as draft
          break;
        case 'Open in Email Client':
          vscode.env.openExternal(vscode.Uri.parse(`mailto:?subject=${encodeURIComponent(msg.subject)}&body=${encodeURIComponent(msg.content)}`));
          break;
      }
    });
  }

  getSettingsSchema() {
    return {
      'copilotTools.features.emailRefine': {
        type: 'boolean',
        default: true,
        description: 'Enable/disable Enhanced Email Refine tool'
      },
      'copilotTools.email.defaultTone': {
        type: 'string',
        enum: ['professional', 'friendly', 'formal', 'casual', 'persuasive', 'apologetic'],
        default: 'professional',
        description: 'Default email tone'
      },
      'copilotTools.email.showMetrics': {
        type: 'boolean',
        default: true,
        description: 'Show email metrics (word count, readability, etc.)'
      }
    };
  }
}
