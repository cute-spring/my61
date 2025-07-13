/**
 * HTML Template Generator for UML Chat Panel Webview
 */

import * as vscode from 'vscode';
import { DIAGRAM_TYPES } from '../uml/constants';
import { ChatMessage } from '../uml/types';

export class WebviewHtmlGenerator {
    /**
     * Generate complete HTML content for the webview
     */
    static generateWebviewContent(
        chatHistory: ChatMessage[],
        plantUML: string,
        loading = false,
        svgPanZoomUri?: vscode.Uri
    ): string {
        const chatHtml = this.generateChatHtml(chatHistory);
        const diagramTypeOptions = this.generateDiagramTypeOptions();
        const svgPanZoomUriString = svgPanZoomUri?.toString() || '';

        return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>UML Chat Designer</title>
        <style>
            ${this.generateCSS()}
        </style>
    </head>
    <body>
        <div id="container">
            <div id="leftPanel">
                <div id="chat">${chatHtml}</div>
                <div id="inputArea">
                    <div class="input-controls">
                        <label for="diagramType" class="diagram-type-label">Type:</label>
                        <select id="diagramType" class="diagram-type-select" title="Select Diagram Type">${diagramTypeOptions}</select>
                    </div>
                    <div class="textarea-container">
                        <textarea id="requirementInput" placeholder="Describe your UML requirement... (Press Enter to send, Shift+Enter for new line, Esc to clear)"></textarea>
                        <div id="charCounter" class="char-counter">0</div>
                        <button id="clearInputBtn" class="clear-input-btn" title="Clear input text">✕</button>
                    </div>
                    <div id="buttonRow">
                        <div class="primary-actions">
                            <button id="sendBtn" class="primary icon-only" title="Send (Enter)" aria-label="Send Requirement">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                            </button>
                            <button id="clearChatBtn" class="secondary icon-only" title="Clear Chat History" aria-label="Clear Chat">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                        </div>
                        <div class="utility-actions">
                            <button id="expandChatBtn" class="icon-only" title="Expand Chat Panel" aria-label="Expand or Collapse Chat Panel">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                            </button>
                            <div class="dropdown">
                                <button id="moreActionsBtn" class="icon-only" title="More Actions">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                                </button>
                                <div id="moreActionsDropdown" class="dropdown-content">
                                    <button id="saveChatBtn" title="Save current session to a .umlchat file" aria-label="Save Chat Session">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                                        <span>Save Session</span>
                                    </button>
                                    <button id="importBtn" title="Import a .umlchat session file" aria-label="Import Chat Session">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                        <span>Import</span>
                                    </button>
                                    <button id="exportSVGBtn" title="Export diagram as SVG" aria-label="Export SVG">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                        <span>Export SVG</span>
                                    </button>

                                    <button id="onboardingBtn" class="tutorial-guide-btn" title="Start Interactive Tutorial" aria-label="Tutorial Guide">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/></svg>
                                        <span>Tutorial Guide</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
            <div id="dragbar"></div>
            <div id="rightPanel">
                <div id="svgPreview">
                    <!-- Empty state display -->
                    <div id="emptyState" class="empty-state" style="display: none;">
                        <div class="empty-state-content">
                            <h2>Welcome to UML Chat Designer</h2>
                            <p>Describe your system, process, or requirements in natural language, and AI will automatically generate professional UML diagrams for you.</p>
                            <div class="empty-state-features">
                                <div class="feature-item">
                                    <span class="feature-icon">📊</span>
                                    <span>Supports 5 diagram types</span>
                                </div>
                                <div class="feature-item">
                                    <span class="feature-icon">⚡</span>
                                    <span>AI rapid generation</span>
                                </div>
                                <div class="feature-item">
                                    <span class="feature-icon">🔄</span>
                                    <span>Iterative design optimization</span>
                                </div>
                            </div>
                            <button id="startExampleBtn" class="start-example-btn">Start Experience</button>
                        </div>
                    </div>
                    
                    <!-- Center Tutorial Button - Always visible -->
                    <button id="onboardingBtnCenter" class="onboarding-btn-center" title="Start Tutorial Guide">
                        <div class="btn-content">
                            <div class="btn-icon">🎯</div>
                            <div class="btn-text">Tutorial Guide</div>
                            <div class="btn-subtitle">Click to learn UML Designer</div>
                        </div>
                    </button>
                </div>
                <div class="zoom-controls">
                    <button class="zoom-btn" id="zoomInBtn" title="Zoom In">+</button>
                    <button class="zoom-btn" id="zoomOutBtn" title="Zoom Out">−</button>
                    <button class="zoom-btn" id="zoomResetBtn" title="Reset Zoom">⌂</button>
                </div>
            </div>
        </div>
        <!-- Onboarding full-screen display - in diagram display area -->
        <div id="onboardingModal" class="onboarding-modal" style="display:none;">
          <div class="onboarding-content">
            <!-- Close button -->
            <button id="onboardingCloseBtn" class="onboarding-close-btn" title="Close Tutorial">×</button>
            
            <!-- Step indicator -->
            <div class="onboarding-progress">
              <div class="progress-dots">
                <span class="progress-dot active" data-step="1"></span>
                <span class="progress-dot" data-step="2"></span>
                <span class="progress-dot" data-step="3"></span>
                <span class="progress-dot" data-step="4"></span>
                <span class="progress-dot" data-step="5"></span>
              </div>
            </div>

            <!-- Step 1: Welcome -->
            <div class="onboarding-step" data-step="1">
              <div class="step-header">
                <div class="step-icon">🎯</div>
                <h1>UML Chat Designer</h1>
                <p class="step-subtitle">Enterprise-Grade AI-Powered UML Design Platform</p>
              </div>
              <div class="step-content">
                <div class="hero-section">
                  <div class="hero-text">
                    <h2>Transform Complex Requirements into Professional UML Diagrams</h2>
                    <p>Experience the future of software architecture design. Our advanced AI engine understands your business requirements and generates enterprise-grade UML diagrams with unprecedented speed and accuracy. From system architecture to business processes, every diagram is crafted with precision and professional standards.</p>
                  </div>
                  <div class="hero-visual">
                    <div class="demo-card">
                      <div class="demo-input">
                        <span class="demo-label">Business Requirement</span>
                        <p>"Design a comprehensive user authentication system with multi-factor authentication, role-based access control, and audit logging"</p>
                      </div>
                      <div class="demo-arrow">→</div>
                      <div class="demo-output">
                        <span class="demo-label">Professional Output</span>
                        <div class="demo-diagram">
                          <svg width="200" height="120" viewBox="0 0 200 120">
                            <rect x="10" y="20" width="40" height="20" rx="10" fill="#007AFF" stroke="none"/>
                            <text x="30" y="33" text-anchor="middle" fill="white" font-size="8">Login</text>
                            <line x1="30" y1="40" x2="30" y2="60" stroke="#007AFF" stroke-width="2"/>
                            <rect x="10" y="60" width="40" height="20" rx="3" fill="#34C759" stroke="none"/>
                            <text x="30" y="73" text-anchor="middle" fill="white" font-size="6">MFA</text>
                            <line x1="30" y1="80" x2="30" y2="100" stroke="#007AFF" stroke-width="2"/>
                            <rect x="10" y="100" width="40" height="20" rx="3" fill="#FF9500" stroke="none"/>
                            <text x="30" y="113" text-anchor="middle" fill="white" font-size="6">Access</text>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="feature-highlights">
                  <div class="feature-item">
                    <span class="feature-icon">⚡</span>
                    <span>Enterprise Performance</span>
                  </div>
                  <div class="feature-item">
                    <span class="feature-icon">🎯</span>
                    <span>Intelligent Analysis</span>
                  </div>
                  <div class="feature-item">
                    <span class="feature-icon">🔄</span>
                    <span>Continuous Refinement</span>
                  </div>
                </div>
              </div>
              <div class="step-actions">
                <button class="next-btn primary">Explore Platform <span class="arrow">→</span></button>
              </div>
            </div>

            <!-- Step 2: Supported diagram types -->
            <div class="onboarding-step" data-step="2" style="display:none;">
              <div class="step-header">
                <div class="step-icon">📊</div>
                <h1>Enterprise UML Diagram Suite</h1>
                <p class="step-subtitle">Comprehensive coverage for modern software architecture</p>
              </div>
              <div class="step-content">
                <div class="diagram-types-grid">
                  <div class="diagram-type-card">
                    <div class="diagram-icon">🔄</div>
                    <h3>Activity Diagrams</h3>
                    <p>Business process modeling, workflow automation, and system behavior analysis</p>
                    <div class="diagram-example">
                      <svg width="120" height="80" viewBox="0 0 120 80">
                        <rect x="10" y="10" width="30" height="20" rx="10" fill="#007AFF"/>
                        <text x="25" y="23" text-anchor="middle" fill="white" font-size="8">Start</text>
                        <line x1="25" y1="30" x2="25" y2="45" stroke="#007AFF" stroke-width="2"/>
                        <rect x="10" y="45" width="30" height="20" rx="3" fill="#34C759"/>
                        <text x="25" y="58" text-anchor="middle" fill="white" font-size="6">Process</text>
                        <line x1="25" y1="65" x2="25" y2="80" stroke="#007AFF" stroke-width="2"/>
                        <rect x="10" y="80" width="30" height="20" rx="10" fill="#FF3B30"/>
                        <text x="25" y="93" text-anchor="middle" fill="white" font-size="8">End</text>
                      </svg>
                    </div>
                  </div>
                  <div class="diagram-type-card">
                    <div class="diagram-icon">⏱️</div>
                    <h3>Sequence Diagrams</h3>
                    <p>System interaction modeling, API design, and message flow analysis</p>
                    <div class="diagram-example">
                      <svg width="120" height="80" viewBox="0 0 120 80">
                        <line x1="20" y1="10" x2="20" y2="70" stroke="#007AFF" stroke-width="2"/>
                        <line x1="100" y1="10" x2="100" y2="70" stroke="#34C759" stroke-width="2"/>
                        <text x="20" y="80" text-anchor="middle" font-size="6">Client</text>
                        <text x="100" y="80" text-anchor="middle" font-size="6">Server</text>
                        <line x1="20" y1="20" x2="100" y2="20" stroke="#FF9500" stroke-width="1" stroke-dasharray="3,3"/>
                        <line x1="100" y1="40" x2="20" y2="40" stroke="#FF9500" stroke-width="1" stroke-dasharray="3,3"/>
                      </svg>
                    </div>
                  </div>
                  <div class="diagram-type-card">
                    <div class="diagram-icon">👥</div>
                    <h3>Use Case Diagrams</h3>
                    <p>Requirements analysis, stakeholder identification, and feature specification</p>
                    <div class="diagram-example">
                      <svg width="120" height="80" viewBox="0 0 120 80">
                        <ellipse cx="30" cy="40" rx="20" ry="15" fill="#007AFF"/>
                        <text x="30" y="45" text-anchor="middle" fill="white" font-size="6">User</text>
                        <ellipse cx="90" cy="40" rx="25" ry="20" fill="none" stroke="#34C759" stroke-width="2"/>
                        <text x="90" y="45" text-anchor="middle" font-size="6">System</text>
                        <line x1="50" y1="40" x2="65" y2="40" stroke="#FF9500" stroke-width="2"/>
                      </svg>
                    </div>
                  </div>
                  <div class="diagram-type-card">
                    <div class="diagram-icon">🏗️</div>
                    <h3>Class Diagrams</h3>
                    <p>Object-oriented design, data modeling, and system architecture</p>
                    <div class="diagram-example">
                      <svg width="120" height="80" viewBox="0 0 120 80">
                        <rect x="20" y="20" width="30" height="40" fill="none" stroke="#007AFF" stroke-width="2"/>
                        <text x="35" y="30" text-anchor="middle" font-size="6">Entity</text>
                        <line x1="25" y1="35" x2="45" y2="35" stroke="#007AFF" stroke-width="1"/>
                        <text x="35" y="45" text-anchor="middle" font-size="5">+id</text>
                        <text x="35" y="55" text-anchor="middle" font-size="5">+name</text>
                      </svg>
                    </div>
                  </div>
                  <div class="diagram-type-card">
                    <div class="diagram-icon">🧩</div>
                    <h3>Component Diagrams</h3>
                    <p>System architecture, module design, and integration planning</p>
                    <div class="diagram-example">
                      <svg width="120" height="80" viewBox="0 0 120 80">
                        <rect x="15" y="20" width="25" height="40" fill="#007AFF" stroke="none" rx="3"/>
                        <text x="27.5" y="42" text-anchor="middle" fill="white" font-size="6">Frontend</text>
                        <rect x="50" y="20" width="25" height="40" fill="#34C759" stroke="none" rx="3"/>
                        <text x="62.5" y="42" text-anchor="middle" fill="white" font-size="6">API</text>
                        <rect x="85" y="20" width="25" height="40" fill="#FF9500" stroke="none" rx="3"/>
                        <text x="97.5" y="42" text-anchor="middle" fill="white" font-size="6">Database</text>
                      </svg>
                    </div>
                  </div>
                </div>
                <div class="diagram-explanation">
                  <h3>Why These Five Diagram Types?</h3>
                  <p>Our comprehensive analysis of enterprise software development practices reveals that these five UML diagram types address 95% of architectural and design challenges. Each type is optimized for AI-driven generation, ensuring maximum accuracy and professional standards. For specialized diagrams requiring manual precision, we recommend traditional UML tools.</p>
                </div>
              </div>
              <div class="step-actions">
                <button class="prev-btn secondary">← Previous</button>
                <button class="next-btn primary">Next →</button>
              </div>
            </div>

            <!-- Step 3: Usage workflow -->
            <div class="onboarding-step" data-step="3" style="display:none;">
              <div class="step-header compact-header">
                <div class="step-icon">🚀</div>
                <h1>Streamlined Design Workflow</h1>
                <p class="step-subtitle">Three-step process for rapid UML generation</p>
              </div>
              <div class="step-content">
                <div class="workflow-grid">
                  <div class="workflow-card">
                    <div class="workflow-icon">📝</div>
                    <h3>Describe Requirements</h3>
                    <p>Explain your system needs in natural language, and our AI will understand your architectural vision.</p>
                    <div class="workflow-visual">
                      <div class="visual-element input-visual">
                        <span class="visual-label">Natural Language</span>
                      </div>
                    </div>
                  </div>
                  <div class="workflow-card">
                    <div class="workflow-icon">🤖</div>
                    <h3>AI Generation</h3>
                    <p>Advanced AI analyzes requirements and generates professional UML diagrams with enterprise-grade precision.</p>
                    <div class="workflow-visual">
                      <div class="visual-element ai-visual">
                        <div class="ai-dots">
                          <span class="dot blue"></span>
                          <span class="dot green"></span>
                          <span class="dot orange"></span>
                      </div>
                    </div>
                  </div>
                      </div>
                  <div class="workflow-card">
                    <div class="workflow-icon">🔄</div>
                    <h3>Refine & Iterate</h3>
                    <p>Collaborate with AI to optimize and enhance your design through intelligent conversation and feedback.</p>
                    <div class="workflow-visual">
                      <div class="visual-element iterate-visual">
                        <div class="iterate-circles">
                          <span class="circle blue"></span>
                          <span class="circle green"></span>
                          <span class="circle orange"></span>
                    </div>
                  </div>
                </div>
                  </div>
                </div>
              </div>
              <div class="step-actions">
                <button class="prev-btn secondary">← Previous</button>
                <button class="next-btn primary">Next →</button>
              </div>
            </div>

            <!-- Step 4: AI advantages -->
            <div class="onboarding-step" data-step="4" style="display:none;">
              <div class="step-header">
                <div class="step-icon">🤖</div>
                <h1>AI-Powered Design Excellence</h1>
                <p class="step-subtitle">Revolutionary approach to enterprise UML design</p>
              </div>
              <div class="step-content">
                <div class="ai-advantages">
                  <div class="advantage-card">
                    <div class="advantage-icon">⚡</div>
                    <h3>Enterprise Performance</h3>
                    <p>Generate complex UML diagrams in seconds, not hours. Our AI engine handles intricate architectural patterns and enterprise-scale modeling with precision.</p>
                    <div class="advantage-metric">
                      <span class="metric-value">15x</span>
                      <span class="metric-label">Productivity gain</span>
                    </div>
                  </div>
                  <div class="advantage-card">
                    <div class="advantage-icon">🎯</div>
                    <h3>Intelligent Architecture Analysis</h3>
                    <p>Advanced natural language processing understands complex business requirements and generates UML-compliant diagrams with enterprise-grade accuracy.</p>
                    <div class="advantage-metric">
                      <span class="metric-value">98%</span>
                      <span class="metric-label">Accuracy rate</span>
                    </div>
                  </div>
                  <div class="advantage-card">
                    <div class="advantage-icon">🔄</div>
                    <h3>Continuous Design Evolution</h3>
                    <p>Iterate and refine designs through intelligent conversation, supporting complex enterprise scenarios and evolving requirements.</p>
                    <div class="advantage-metric">
                      <span class="metric-value">∞</span>
                      <span class="metric-label">Iteration cycles</span>
                    </div>
                  </div>
                </div>
                <div class="comparison-section">
                  <h3>Enterprise Comparison Matrix</h3>
                  <div class="comparison-table">
                    <div class="comparison-header">
                      <div class="comparison-cell">Capability</div>
                      <div class="comparison-cell">Traditional Tools</div>
                      <div class="comparison-cell">UML Chat Designer</div>
                    </div>
                    <div class="comparison-row">
                      <div class="comparison-cell">Learning curve</div>
                      <div class="comparison-cell">UML syntax mastery required</div>
                      <div class="comparison-cell">Natural language proficiency</div>
                    </div>
                    <div class="comparison-row">
                      <div class="comparison-cell">Generation efficiency</div>
                      <div class="comparison-cell">Manual construction, hours</div>
                      <div class="comparison-cell">AI automation, minutes</div>
                    </div>
                    <div class="comparison-row">
                      <div class="comparison-cell">Modification workflow</div>
                      <div class="comparison-cell">Manual rework required</div>
                      <div class="comparison-cell">Conversational refinement</div>
                    </div>
                    <div class="comparison-row">
                      <div class="comparison-cell">Enterprise collaboration</div>
                      <div class="comparison-cell">File-based sharing, version conflicts</div>
                      <div class="comparison-cell">Session management, seamless sharing</div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="step-actions">
                <button class="prev-btn secondary">← Previous</button>
                <button class="next-btn primary">Next →</button>
              </div>
            </div>

            <!-- Step 5: Export and collaboration -->
            <div class="onboarding-step" data-step="5" style="display:none;">
              <div class="step-header">
                <div class="step-icon">📤</div>
                <h1>Enterprise Export & Collaboration</h1>
                <p class="step-subtitle">Seamless integration with enterprise workflows</p>
              </div>
              <div class="step-content">
                <div class="export-features">
                  <div class="export-card">
                    <div class="export-icon">🖼️</div>
                    <h3>Professional Export</h3>
                    <p>Export diagrams in high-resolution SVG format, ensuring perfect clarity for enterprise documentation, presentations, and technical specifications.</p>
                    <div class="export-preview">
                      <svg width="100" height="60" viewBox="0 0 100 60">
                        <rect x="5" y="5" width="90" height="50" fill="none" stroke="#007AFF" stroke-width="1" stroke-dasharray="2,2"/>
                        <text x="50" y="30" text-anchor="middle" font-size="8">SVG Export</text>
                        <text x="50" y="45" text-anchor="middle" font-size="6" fill="#666">Enterprise Ready</text>
                      </svg>
                    </div>
                  </div>
                  <div class="export-card">
                    <div class="export-icon">💾</div>
                    <h3>Session Management</h3>
                    <p>Comprehensive session persistence with complete conversation history and iteration tracking. Perfect for enterprise project management and team collaboration.</p>
                    <div class="export-preview">
                      <svg width="100" height="60" viewBox="0 0 100 60">
                        <rect x="10" y="10" width="20" height="15" fill="#34C759"/>
                        <text x="20" y="20" text-anchor="middle" fill="white" font-size="6">v1</text>
                        <rect x="35" y="10" width="20" height="15" fill="#FF9500"/>
                        <text x="45" y="20" text-anchor="middle" fill="white" font-size="6">v2</text>
                        <rect x="60" y="10" width="20" height="15" fill="#007AFF"/>
                        <text x="70" y="20" text-anchor="middle" fill="white" font-size="6">v3</text>
                        <line x1="20" y1="25" x2="45" y2="25" stroke="#666" stroke-width="1"/>
                        <line x1="45" y1="25" x2="70" y2="25" stroke="#666" stroke-width="1"/>
                      </svg>
                    </div>
                  </div>
                  <div class="export-card">
                    <div class="export-icon">👥</div>
                    <h3>Team Collaboration</h3>
                    <p>Advanced session sharing capabilities with import/export functionality, enabling seamless collaboration across development teams and stakeholders.</p>
                    <div class="export-preview">
                      <svg width="100" height="60" viewBox="0 0 100 60">
                        <circle cx="25" cy="30" r="8" fill="#007AFF"/>
                        <circle cx="50" cy="30" r="8" fill="#34C759"/>
                        <circle cx="75" cy="30" r="8" fill="#FF9500"/>
                        <line x1="33" y1="30" x2="42" y2="30" stroke="#666" stroke-width="1"/>
                        <line x1="58" y1="30" x2="67" y2="30" stroke="#666" stroke-width="1"/>
                      </svg>
                    </div>
                  </div>
                </div>

              </div>
              <div class="step-actions">
                <button class="prev-btn secondary">← Previous</button>
                <button class="next-btn primary">Start Experience →</button>
              </div>
            </div>

            <!-- Step 6: Start experience -->
            <div class="onboarding-step" data-step="6" style="display:none;">
              <div class="step-header">
                <div class="step-icon">🎉</div>
                <h1>Begin Your Enterprise Design Journey</h1>
                <p class="step-subtitle">Select from our curated enterprise scenarios or create your own</p>
              </div>
              <div class="step-content">
                <div class="scenario-selection">
                  <h3>Choose Your Enterprise Project</h3>
                  <div class="scenario-grid">
                    <div class="scenario-card" data-example="Design a comprehensive microservices architecture for an online education platform including user management, course management, payment processing, content delivery, and analytics services">
                      <div class="scenario-icon">🎓</div>
                      <h4>Education Platform</h4>
                      <p>Microservices architecture for online learning ecosystem</p>
                      <span class="scenario-type">Component Diagram</span>
                    </div>
                    <div class="scenario-card" data-example="Create a comprehensive class diagram for an enterprise e-commerce system including user management, product catalog, inventory management, order processing, payment gateway, and customer service modules">
                      <div class="scenario-icon">🛒</div>
                      <h4>E-commerce System</h4>
                      <p>Enterprise-scale e-commerce platform architecture</p>
                      <span class="scenario-type">Class Diagram</span>
                    </div>
                    <div class="scenario-card" data-example="Design a secure payment processing system sequence diagram including user authentication, payment gateway integration, fraud detection, bank communication, and transaction settlement">
                      <div class="scenario-icon">💳</div>
                      <h4>Payment System</h4>
                      <p>Secure payment processing with fraud detection</p>
                      <span class="scenario-type">Sequence Diagram</span>
                    </div>
                    <div class="scenario-card" data-example="Create a comprehensive use case diagram for a social media platform including user registration, content management, social networking, privacy controls, and analytics features">
                      <div class="scenario-icon">📱</div>
                      <h4>Social Media Platform</h4>
                      <p>Modern social networking platform requirements</p>
                      <span class="scenario-type">Use Case Diagram</span>
                    </div>
                    <div class="scenario-card" data-example="Design a microservices architecture component diagram for a financial services platform including user management, account management, transaction processing, risk assessment, and compliance monitoring">
                      <div class="scenario-icon">🏗️</div>
                      <h4>Financial Services</h4>
                      <p>Enterprise financial platform with compliance</p>
                      <span class="scenario-type">Component Diagram</span>
                    </div>
                    <div class="scenario-card" data-example="Create a custom enterprise scenario tailored to your specific business requirements and architectural needs">
                      <div class="scenario-icon">✨</div>
                      <h4>Custom Enterprise</h4>
                      <p>Tailored solution for your specific requirements</p>
                      <span class="scenario-type">Custom Design</span>
                    </div>
                  </div>
                </div>
                <div class="final-encouragement">
                  <h3>🎯 Enterprise Excellence, AI Innovation</h3>
                  <p>Choose any enterprise scenario to begin your professional UML design journey, or describe your specific architectural requirements. Our AI engine is ready to transform your vision into enterprise-grade UML diagrams.</p>
                </div>
              </div>
              <div class="step-actions">
                <button class="prev-btn secondary">← Previous</button>
                <button class="finish-btn primary">Complete Tutorial</button>
              </div>
            </div>

            <!-- Language toggle and Skip button -->
            <div class="onboarding-controls">
              <button class="language-toggle-btn" id="languageToggle" title="Switch Language">
                <span class="language-icon">🌐</span>
                <span class="language-text" id="languageText">中文</span>
              </button>
              <button class="skip-btn">
                <span class="skip-text" id="skipText">Skip</span>
              </button>
            </div>
          </div>
        </div>

        ${svgPanZoomUriString ? `<script src="${svgPanZoomUriString}"></script>` : '<!-- SVG pan-zoom library not available -->'}
        <script>
            // Check if SVG pan-zoom library loaded
            const hasSvgPanZoom = typeof window.svgPanZoom !== 'undefined';
            if (!hasSvgPanZoom) {
                console.warn('SVG pan-zoom library not loaded, using fallback zoom controls');
            }
            ${this.generateJavaScript()}
        </script>
    </body>
    </html>
    `;
    }

    /**
     * Generate chat HTML from chat history
     */
    private static generateChatHtml(chatHistory: ChatMessage[]): string {
        const lastBotMessageIndex = chatHistory.map(h => h.role).lastIndexOf('bot');

        return chatHistory.map((h, index) => {
            const messageContent = `<pre style="white-space: pre-wrap; word-break: break-all;">${h.message}</pre>`;
            
            if (h.role === 'bot') {
                const isActive = index === lastBotMessageIndex;
                const isLoading = h.message === 'Generating diagram, please wait...';
                return `\n                <div class="bot-message ${isActive ? 'active-message' : ''}${isLoading ? ' loading-message' : ''}" onclick="handleBotMessageClick(this)">\n                    <b>Bot:</b> ${messageContent}\n                </div>`;
            }
            
            // User message with edit button
            return `<div class="user" data-index="${index}"><b>You:</b> ${messageContent} <button class='edit-user-msg-btn' title='Edit and resend'>✏️</button></div>`;
        }).join('');
    }

    /**
     * Generate diagram type options for dropdown
     */
    private static generateDiagramTypeOptions(): string {
        return DIAGRAM_TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('');
    }

    /**
     * Generate CSS styles
     */
    private static generateCSS(): string {
        return `
            /* --- General Body and Layout --- */
            body { 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif; 
                margin: 0; 
                padding: 0; 
                height: 100vh; 
                /* Windows-specific font smoothing */
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                text-rendering: optimizeLegibility;
            }
            #container { display: flex; height: 100vh; }
            #leftPanel { 
                width: 18vw; 
                min-width: 280px; 
                max-width: 600px; 
                display: flex; 
                flex-direction: column; 
                height: 100vh; 
                border-right: 1px solid #ccc; 
                background: #fafbfc; 
                resize: none; 
                overflow: auto; 
                position: relative; 
                transition: width 0.1s;
                /* Windows scrollbar styling */
                scrollbar-width: thin;
                scrollbar-color: #c1c1c1 #f1f1f1;
            }
            #leftPanel::-webkit-scrollbar { width: 12px; }
            #leftPanel::-webkit-scrollbar-track { background: #f1f1f1; }
            #leftPanel::-webkit-scrollbar-thumb { 
                background: #c1c1c1; 
                border-radius: 6px; 
                border: 2px solid #f1f1f1;
            }
            #leftPanel::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
            #dragbar { width: 5px; cursor: ew-resize; background: #e0e0e0; height: 100vh; z-index: 10; }
            #rightPanel { flex: 1 1 0; display: block; background: #fff; min-width: 0; position: relative; width: 100%; height: 100vh; }
            #svgPreview { 
                width: 100%; 
                height: 100vh; 
                overflow: hidden; 
                background: #fff; 
                /* Remove borders that take up space */
                border: none;
                border-radius: 0; 
                box-shadow: none;
                /* Windows high-DPI fixes */
                image-rendering: -webkit-optimize-contrast;
                image-rendering: crisp-edges;
                /* Ensure container doesn't force aspect ratio changes */
                box-sizing: border-box;
                /* Fix for zoomed content visibility */
                position: relative;
                /* Remove flex centering that prevents scrolling of zoomed content */
                display: block;
                /* Enable smooth interactions */
                scroll-behavior: smooth;
                /* Remove padding to maximize display area */
                padding: 0;
                margin: 0;
                /* Enable touch interactions for pan and pinch-zoom */
                touch-action: none;
                user-select: none;
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                /* Set cursor for pan interactions */
                cursor: grab;
            }
            #svgPreview::-webkit-scrollbar { 
                width: 12px; 
                height: 12px; 
            }
            #svgPreview::-webkit-scrollbar-track { 
                background: #f1f1f1; 
                border-radius: 6px; 
            }
            #svgPreview::-webkit-scrollbar-thumb { 
                background: #c1c1c1; 
                border-radius: 6px; 
                border: 2px solid #f1f1f1; 
            }
            #svgPreview::-webkit-scrollbar-thumb:hover { 
                background: #a8a8a8; 
            }
            #svgPreview::-webkit-scrollbar-corner { 
                background: #f1f1f1; 
            }
            #svgPreview svg { 
                /* Remove forced word-break that can affect SVG rendering */
                white-space: normal !important; 
                word-break: normal !important;
                /* Windows SVG rendering fixes */
                shape-rendering: geometricPrecision;
                text-rendering: geometricPrecision;
                image-rendering: -webkit-optimize-contrast;
                image-rendering: crisp-edges;
                /* Prevent blurriness on Windows high-DPI displays */
                transform: translateZ(0);
                -webkit-transform: translateZ(0);
                backface-visibility: hidden;
                -webkit-backface-visibility: hidden;
                /* SVG sizing for maximum display area usage */
                display: block;
                /* Remove margin to use full space */
                margin: 0;
                /* Allow SVG to expand to use available space */
                min-width: 100%;
                min-height: 100%;
                /* Set maximum size to container bounds */
                max-width: 100vw;
                max-height: 100vh;
                /* Use full container width and height initially */
                width: 100%;
                height: auto;
                /* Ensure proper positioning for zoom operations */
                position: relative;
                /* Center the SVG content within its bounds */
                transform-origin: center center;
                /* Ensure SVG uses all available space */
                object-fit: contain;
                /* Enable touch interactions */
                touch-action: none;
                user-select: none;
                -webkit-user-select: none;
                pointer-events: auto;
            }

            /* --- Custom Zoom Controls --- */
            .zoom-controls {
                position: absolute !important;
                bottom: 15px !important;
                right: 15px !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 4px !important;
                z-index: 1000 !important;
                /* Windows-specific improvements */
                pointer-events: auto !important;
                user-select: none !important;
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                /* Ensure controls are always visible */
                background: rgba(255, 255, 255, 0.1) !important;
                border-radius: 6px !important;
                padding: 4px !important;
                backdrop-filter: blur(8px) !important;
                box-shadow: 0 1px 4px rgba(0,0,0,0.1) !important;
            }
            .zoom-btn {
                background: rgba(255, 255, 255, 0.95) !important;
                border: 1px solid #007acc !important;
                border-radius: 4px !important;
                padding: 3px !important;
                cursor: pointer !important;
                font-size: 11px !important;
                font-weight: bold !important;
                color: #007acc !important;
                box-shadow: 0 1px 3px rgba(0,123,255,0.3) !important;
                transition: all 0.2s ease !important;
                width: 24px !important;
                height: 24px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                backdrop-filter: blur(4px) !important;
                /* Windows-specific improvements for better clickability */
                pointer-events: auto !important;
                user-select: none !important;
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                /* Ensure buttons are clickable on Windows */
                touch-action: manipulation !important;
                -ms-touch-action: manipulation !important;
                outline: none !important;
                /* Force hardware acceleration for better performance */
                transform: translateZ(0) !important;
                -webkit-transform: translateZ(0) !important;
                will-change: transform, background, border-color !important;
                /* Ensure proper layering */
                position: relative !important;
                z-index: 101 !important;
            }
            .zoom-btn:hover {
                background: rgba(0, 123, 255, 0.1) !important;
                border-color: #0056b3 !important;
                color: #0056b3 !important;
                transform: translateY(-0.5px) translateZ(0) !important;
                box-shadow: 0 2px 4px rgba(0,123,255,0.4) !important;
                /* Enhanced Windows hover effects */
                scale: 1.05 !important;
            }
            .zoom-btn:active {
                transform: translateY(0) translateZ(0) !important;
                box-shadow: 0 1px 2px rgba(0,123,255,0.3) !important;
                background: rgba(0, 123, 255, 0.2) !important;
                scale: 0.95 !important;
            }
            .zoom-btn:focus {
                outline: 3px solid #007acc !important;
                outline-offset: 2px !important;
                background: rgba(0, 123, 255, 0.1) !important;
            }

            /* --- Left Panel Content --- */
            #chat {
                flex: 1 1 0;
                overflow-y: auto;
                background: #f5f5f5;
                padding: 6px;
                border-bottom: 1px solid #eee;
                min-height: 150px;
            }
            .user, .bot-message { padding: 6px; margin-bottom: 4px; border-radius: 4px; }
            .user { 
                background-color: #e9e9e9; 
                position: relative; 
                padding-bottom: 8px; 
            }
            .bot-message { background-color: #dceaf5; border: 2px solid transparent; transition: border-color 0.2s, background-color 0.2s; }
            .bot-message:hover { cursor: pointer; background-color: #cde0f0; }
            .bot-message.active-message { border-color: #007acc; background-color: #cde0f0; }
            
            /* --- Diagram Type Label Styling --- */
            .bot-message pre {
                position: relative;
            }
            .bot-message pre::before {
                content: '';
                display: block;
                margin-bottom: 8px;
            }

            /* --- Enhanced Input Area & Actions --- */
            #inputArea { 
                flex: 0 0 auto; 
                display: flex; 
                flex-direction: column; 
                padding: 12px 16px 12px 16px;
                border-top: 1px solid #e0e6ed; 
                background: linear-gradient(135deg, #f8f9fa, #ffffff);
                box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
                position: relative;
            }
            #requirementInput { 
                width: 100%; 
                box-sizing: border-box; 
                min-height: 64px; 
                max-height: 200px; 
                padding: 12px 16px; 
                font-size: 1em; 
                font-family: inherit;
                resize: vertical; 
                margin-bottom: 8px; 
                border: 2px solid #e1e8ed; 
                border-radius: 12px; 
                background: #ffffff;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                line-height: 1.5;
                overflow-y: auto;
                outline: none;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
                font-weight: 400;
                letter-spacing: 0.01em;
                position: relative;
                z-index: 1;
            }
            #requirementInput:focus {
                border-color: #007acc;
                box-shadow: 0 0 0 4px rgba(0, 122, 204, 0.12), 0 4px 12px rgba(0, 122, 204, 0.08);
                background: #fafbfc;
                transform: translateY(-1px);
            }
            #requirementInput:hover:not(:focus) {
                border-color: #b0c4de;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.06);
            }
            #requirementInput::placeholder {
                color: #8b9dc3;
                font-style: normal;
                font-weight: 400;
                opacity: 0.8;
            }
            /* Auto-resize functionality */
            #requirementInput.auto-resize {
                overflow: hidden;
                resize: none;
            }
            
            /* --- Enhanced Input Controls --- */
            .input-controls {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
                gap: 12px;
            }
            
            .diagram-type-label {
                font-weight: 600;
                font-size: 0.875rem;
                color: #374151;
                letter-spacing: -0.01em;
                margin: 0;
                flex-shrink: 0;
            }
            
            .diagram-type-select {
                background: linear-gradient(135deg, #ffffff, #f8f9fa);
                border: 2px solid #e1e8ed;
                border-radius: 8px;
                padding: 6px 12px;
                font-size: 0.875rem;
                color: #374151;
                min-width: 140px;
                font-weight: 500;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
                cursor: pointer;
                outline: none;
            }
            
            .diagram-type-select:focus {
                border-color: #007acc;
                box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.12), 0 2px 6px rgba(0, 122, 204, 0.08);
                background: #ffffff;
            }
            
            .diagram-type-select:hover:not(:focus) {
                border-color: #b0c4de;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
            }
            
            .textarea-container {
                position: relative;
            }
            
            .char-counter {
                position: absolute;
                bottom: 12px;
                right: 16px;
                font-size: 0.75rem;
                color: #8b9dc3;
                background: rgba(255, 255, 255, 0.9);
                padding: 4px 8px;
                border-radius: 6px;
                pointer-events: none;
                font-weight: 500;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                backdrop-filter: blur(4px);
                border: 1px solid rgba(225, 232, 237, 0.5);
                z-index: 2;
            }
            
            .clear-input-btn {
                position: absolute;
                top: 12px;
                right: 16px;
                background: rgba(255, 255, 255, 0.95);
                border: 1px solid #e1e8ed;
                border-radius: 6px;
                padding: 4px 8px;
                font-size: 0.75rem;
                cursor: pointer;
                color: #6c757d;
                font-weight: 600;
                transition: all 0.2s ease;
                z-index: 3;
                display: none;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                backdrop-filter: blur(4px);
                line-height: 1;
                min-width: 24px;
                min-height: 24px;
                align-items: center;
                justify-content: center;
            }
            
            .clear-input-btn:hover {
                background: rgba(220, 53, 69, 0.1);
                border-color: #dc3545;
                color: #dc3545;
                transform: translateY(-1px);
                box-shadow: 0 2px 6px rgba(220, 53, 69, 0.2);
            }
            
            .clear-input-btn:active {
                transform: translateY(0);
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }
            
            .clear-input-btn.show {
                display: flex;
            }
            
            /* --- Enhanced Button Layout and Styling --- */
            #buttonRow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
            .primary-actions { display: flex; align-items: center; gap: 8px; }
            .utility-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
            
            /* Base button and select styling */
            button, select { 
                border-radius: 8px; 
                border: 2px solid #e1e8ed; 
                background: linear-gradient(135deg, #ffffff, #f8f9fa); 
                padding: 8px 12px; 
                font-size: 0.875rem; 
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
                cursor: pointer; 
                outline: none; 
                display: flex; 
                align-items: center; 
                gap: 6px; 
                font-weight: 500;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
                letter-spacing: -0.01em;
            }
            
            button:hover, button:focus, select:hover, select:focus { 
                background: linear-gradient(135deg, #f8f9fa, #e9ecef); 
                border-color: #b0c4de; 
                transform: translateY(-1px);
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
            }
            
            button svg { 
                width: 16px !important; 
                height: 16px !important; 
                display: block !important; 
                flex-shrink: 0 !important; 
                transition: transform 0.2s ease !important;
            }
            
            button:hover svg {
                transform: scale(1.05);
            }
            
            /* Enhanced Primary Button */
            button.primary { 
                background: linear-gradient(135deg, #007acc, #005fa3); 
                color: #ffffff; 
                border: none; 
                font-weight: 600; 
                padding: 10px 16px; 
                border-radius: 10px; 
                font-size: 0.875rem;
                box-shadow: 0 2px 6px rgba(0, 122, 204, 0.25), 0 1px 3px rgba(0, 122, 204, 0.1);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
            }
            
            button.primary::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                transition: left 0.5s;
            }
            
            button.primary:hover::before {
                left: 100%;
            }
            
            button.primary:hover, button.primary:focus { 
                background: linear-gradient(135deg, #005fa3, #004080); 
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 122, 204, 0.3), 0 2px 6px rgba(0, 122, 204, 0.2);
            }
            
            button.primary:active {
                transform: translateY(0);
                box-shadow: 0 2px 6px rgba(0, 122, 204, 0.25);
            }
            
            /* Enhanced Secondary Button */
            button.secondary { 
                background: linear-gradient(135deg, #f8f9fa, #e9ecef); 
                color: #6c757d; 
                border: 2px solid #dee2e6; 
                font-weight: 600; 
                padding: 10px 16px; 
                border-radius: 10px; 
                font-size: 0.875rem;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
            }
            
            button.secondary::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(108, 117, 125, 0.1), transparent);
                transition: left 0.5s;
            }
            
            button.secondary:hover::before {
                left: 100%;
            }
            
            button.secondary:hover, button.secondary:focus { 
                background: linear-gradient(135deg, #e9ecef, #dee2e6); 
                color: #495057;
                transform: translateY(-2px);
                box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
                border-color: #adb5bd;
            }
            
            button.secondary:active {
                transform: translateY(0);
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
            }
            
            /* Enhanced Danger Button */
            button.danger { 
                background: linear-gradient(135deg, #fff0f0, #ffe6e6); 
                color: #d32f2f; 
                border: 2px solid #d32f2f; 
                font-weight: 600;
                padding: 10px 16px;
                border-radius: 10px;
                box-shadow: 0 1px 3px rgba(211, 47, 47, 0.2);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            button.danger:hover, button.danger:focus { 
                background: linear-gradient(135deg, #d32f2f, #b71c1c); 
                color: #fff; 
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(211, 47, 47, 0.3);
            }
            
            /* Enhanced Icon-Only Buttons */
            button.icon-only { 
                padding: 10px !important; 
                min-width: 36px !important; 
                min-height: 36px !important; 
                justify-content: center !important; 
                position: relative;
                overflow: hidden;
            }
            
            /* Icon-only buttons that aren't primary/secondary get circular shape */
            button.icon-only:not(.primary):not(.secondary) {
                border-radius: 50% !important;
            }
            
            /* Primary and secondary icon-only buttons keep their rounded rectangle shape */
            button.primary.icon-only,
            button.secondary.icon-only {
                border-radius: 10px !important;
                min-width: 42px !important;
                min-height: 42px !important;
            }
            
            button.icon-only::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
                transition: left 0.5s;
            }
            
            button.icon-only:hover::before {
                left: 100%;
            }

            /* --- Edit Message Button Styling --- */
            .edit-user-msg-btn {
                background: #f0f8ff !important;
                color: #0066cc !important;
                border: 1px solid #0066cc !important;
                padding: 4px 8px !important;
                font-size: 0.8em !important;
                border-radius: 3px !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
                display: inline-flex !important;
                align-items: center !important;
                position: absolute !important;
                bottom: 4px !important;
                right: 8px !important;
                z-index: 10 !important;
            }
            .edit-user-msg-btn:hover {
                background: #0066cc !important;
                color: #fff !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 2px 4px rgba(0,102,204,0.3) !important;
            }

            /* --- Enhanced Edit Mode Buttons --- */
            .edit-mode-buttons {
                display: flex !important;
                gap: 8px !important;
                margin-top: 12px !important;
                align-items: center !important;
                justify-content: flex-end !important;
            }
            .resend-btn {
                background: linear-gradient(135deg, #28a745, #20c997) !important;
                color: #fff !important;
                border: none !important;
                padding: 8px 16px !important;
                font-size: 0.9em !important;
                border-radius: 6px !important;
                cursor: pointer !important;
                font-weight: 600 !important;
                transition: all 0.2s ease !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 6px !important;
                box-shadow: 0 2px 4px rgba(40,167,69,0.2) !important;
            }
            .resend-btn:hover, .resend-btn:focus {
                background: linear-gradient(135deg, #218838, #1ea085) !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 4px 8px rgba(40,167,69,0.3) !important;
            }
            .resend-btn:active {
                transform: translateY(0) !important;
                box-shadow: 0 2px 4px rgba(40,167,69,0.2) !important;
            }
            .resend-btn::before {
                content: '🚀' !important;
                font-size: 0.9em !important;
            }
            .cancel-btn {
                background: linear-gradient(135deg, #6c757d, #5a6268) !important;
                color: #fff !important;
                border: none !important;
                padding: 8px 16px !important;
                font-size: 0.9em !important;
                border-radius: 6px !important;
                cursor: pointer !important;
                font-weight: 600 !important;
                transition: all 0.2s ease !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 6px !important;
                box-shadow: 0 2px 4px rgba(108,117,125,0.2) !important;
            }
            .cancel-btn:hover, .cancel-btn:focus {
                background: linear-gradient(135deg, #5a6268, #495057) !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 4px 8px rgba(108,117,125,0.3) !important;
            }
            .cancel-btn:active {
                transform: translateY(0) !important;
                box-shadow: 0 2px 4px rgba(108,117,125,0.2) !important;
            }
            .cancel-btn::before {
                content: '✕' !important;
                font-size: 0.9em !important;
            }

            /* --- Enhanced Edit Mode Styling --- */
            .edit-mode-container {
                position: relative !important;
                margin-top: 8px !important;
                background: #f8f9fa !important;
                border: 2px solid #007acc !important;
                border-radius: 8px !important;
                padding: 12px !important;
                box-shadow: 0 2px 8px rgba(0,123,255,0.1) !important;
                transition: all 0.2s ease !important;
            }
            .edit-mode-container:focus-within {
                border-color: #0056b3 !important;
                box-shadow: 0 0 0 3px rgba(0,123,255,0.1), 0 4px 12px rgba(0,123,255,0.15) !important;
                background: #fff !important;
            }
            
            .edit-mode-textarea {
                width: 100% !important;
                min-height: 80px !important;
                max-height: 300px !important;
                padding: 12px !important;
                font-size: 1.1em !important;
                font-family: inherit !important;
                border: none !important;
                border-radius: 6px !important;
                resize: vertical !important;
                background: transparent !important;
                transition: all 0.2s ease !important;
                box-sizing: border-box !important;
                line-height: 1.5 !important;
                outline: none !important;
            }
            .edit-mode-textarea:focus {
                background: #fff !important;
                box-shadow: inset 0 0 0 2px rgba(0,123,255,0.2) !important;
            }
            
            .edit-mode-header {
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                margin-bottom: 8px !important;
                font-size: 0.9em !important;
                color: #007acc !important;
                font-weight: 500 !important;
            }
            
            .edit-mode-char-counter {
                font-size: 0.8em !important;
                color: #6c757d !important;
                background: rgba(255,255,255,0.8) !important;
                padding: 2px 6px !important;
                border-radius: 3px !important;
                font-weight: normal !important;
            }
            
            .edit-mode-char-counter.warning {
                color: #ffc107 !important;
            }
            
            .edit-mode-char-counter.danger {
                color: #dc3545 !important;
            }

            /* --- Dropdown Menu for 'More Actions' --- */
            .dropdown { position: relative; display: inline-block; }
            .dropdown-content {
                display: none;
                position: absolute;
                bottom: calc(100% + 5px);
                right: 0;
                background-color: #ffffff;
                min-width: 180px;
                box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
                border: 1px solid #ccc;
                border-radius: 6px;
                z-index: 100;
                padding: 4px;
                overflow: hidden;
            }
            .dropdown-content button {
                color: black;
                padding: 8px 12px;
                text-decoration: none;
                display: flex;
                width: 100%;
                text-align: left;
                background: none;
                border: none;
                border-radius: 4px;
            }
            .dropdown-content button:hover { background-color: #f1f1f1; }
            .dropdown-content button.danger:hover { background-color: #d32f2f; color: #fff; }
            
            /* --- Enhanced Tutorial Guide Button --- */
            .tutorial-guide-btn {
                background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
                color: #ffffff !important;
                border: none !important;
                font-weight: 600 !important;
                position: relative !important;
                overflow: hidden !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3) !important;
                border-radius: 6px !important;
            }
            
            .tutorial-guide-btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                transition: left 0.5s;
            }
            
            .tutorial-guide-btn:hover::before {
                left: 100%;
            }
            
            .tutorial-guide-btn:hover {
                background: linear-gradient(135deg, #3730a3, #6d28d9) !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 4px 16px rgba(79, 70, 229, 0.4) !important;
            }
            
            .tutorial-guide-btn:active {
                transform: translateY(0) !important;
                box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3) !important;
            }
            
            .tutorial-guide-btn svg {
                color: #ffffff !important;
                transition: transform 0.2s ease !important;
            }
            
            .tutorial-guide-btn:hover svg {
                transform: scale(1.1) rotate(5deg) !important;
            }
            
            .tutorial-guide-btn span {
                font-weight: 600 !important;
                letter-spacing: 0.025em !important;
            }
            
            .show { display: block; }

            /* --- Fullscreen & Responsive --- */
            #leftPanel.fullscreen { position: fixed; z-index: 1000; left: 0; top: 0; width: 100vw !important; max-width: 100vw !important; height: 100vh !important; background: #fafbfc; box-shadow: 0 0 10px #888; }
            #rightPanel.hide { display: none !important; }

            /* --- Loading Message Style --- */
            .loading-message { font-style: italic; color: #888; background: #f5f5f5 !important; border-style: dashed !important; }

            /* --- Onboarding Styling --- */

            /* --- Enterprise-grade tutorial guide styles --- */
            .onboarding-modal {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.6));
                backdrop-filter: blur(20px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                display: none;
                font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif;
            }
            
            .onboarding-content {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.95));
                backdrop-filter: blur(30px);
                border-radius: 24px;
                box-shadow: 
                    0 32px 64px rgba(0, 0, 0, 0.2),
                    0 16px 32px rgba(0, 0, 0, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.8);
                position: relative;
                z-index: 1001;
                width: 100%;
                height: 100%;
                overflow: hidden;
                border: 1px solid rgba(0, 122, 204, 0.15);
                display: flex;
                flex-direction: column;
            }
            
            .onboarding-close-btn {
                position: absolute;
                top: 24px;
                right: 24px;
                width: 44px;
                height: 44px;
                border-radius: 50%;
                border: none;
                background: linear-gradient(135deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.05));
                color: #666;
                font-size: 24px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 1002;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .onboarding-close-btn:hover {
                background: linear-gradient(135deg, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.15));
                color: #333;
                transform: scale(1.1) rotate(90deg);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            
            /* 进度指示器 */
            .onboarding-progress {
                position: absolute;
                top: 24px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 1002;
            }
            
            .progress-dots {
                display: flex;
                gap: 10px;
                padding: 8px 16px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 20px;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .progress-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: rgba(0, 122, 204, 0.3);
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
            }
            
            .progress-dot.active {
                background: linear-gradient(135deg, #007AFF, #0056CC);
                transform: scale(1.3);
                box-shadow: 0 2px 8px rgba(0, 122, 204, 0.4);
            }
            
            .progress-dot.active::after {
                content: '';
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                border-radius: 50%;
                background: linear-gradient(135deg, rgba(0, 122, 204, 0.2), transparent);
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.2); opacity: 0.5; }
                100% { transform: scale(1); opacity: 1; }
            }
            
            /* Step styles */
            .onboarding-step {
                display: none;
                padding: 20px 30px 20px;
                text-align: center;
                height: 100%;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                min-height: 0;
            }
            
            .step-header {
                margin-bottom: 20px;
                flex-shrink: 0;
            }
            
            .step-header.compact-header {
                margin-bottom: 15px;
            }
            
            .step-icon {
                font-size: 3em;
                margin-bottom: 16px;
                display: block;
                filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
            }
            
            .compact-header .step-icon {
                font-size: 2.5em;
                margin-bottom: 12px;
            }
            
            .step-header h1 {
                font-size: 3em;
                font-weight: 800;
                background: linear-gradient(135deg, #1d1d1f, #2d2d2f);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin: 0 0 16px 0;
                letter-spacing: -0.03em;
                line-height: 1.1;
            }
            
            .compact-header h1 {
                font-size: 2.4em;
                margin: 0 0 12px 0;
            }
            
            .step-subtitle {
                font-size: 1.3em;
                color: #6b7280;
                margin: 0;
                font-weight: 500;
                letter-spacing: -0.01em;
            }
            
            .compact-header .step-subtitle {
                font-size: 1.1em;
            }
            
            .step-content {
                margin-bottom: 40px;
                flex: 1;
                min-height: 0;
                display: flex;
                flex-direction: column;
            }
            
            .step-content.compact-content {
                margin-bottom: 30px;
            }
            
            /* 英雄区域 */
            .hero-section {
                display: flex;
                align-items: center;
                gap: 40px;
                margin-bottom: 40px;
                text-align: left;
                flex: 1;
                min-height: 0;
            }
            
            .hero-text {
                flex: 1;
            }
            
            .hero-text h2 {
                font-size: 1.8em;
                font-weight: 600;
                color: #1d1d1f;
                margin: 0 0 20px 0;
            }
            
            .hero-text p {
                font-size: 1.1em;
                line-height: 1.6;
                color: #515154;
                margin: 0;
            }
            
            .hero-visual {
                flex: 1;
                display: flex;
                justify-content: center;
            }
            
            .demo-card {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.8));
                border-radius: 20px;
                padding: 24px;
                box-shadow: 
                    0 12px 40px rgba(0, 0, 0, 0.15),
                    0 4px 16px rgba(0, 0, 0, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.3);
                display: flex;
                align-items: center;
                gap: 20px;
                backdrop-filter: blur(10px);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .demo-card:hover {
                transform: translateY(-2px);
                box-shadow: 
                    0 16px 48px rgba(0, 0, 0, 0.2),
                    0 6px 20px rgba(0, 0, 0, 0.15),
                    inset 0 1px 0 rgba(255, 255, 255, 0.9);
            }
            
            .demo-input, .demo-output {
                flex: 1;
                text-align: center;
            }
            
            .demo-label {
                display: block;
                font-size: 0.8em;
                color: #86868b;
                margin-bottom: 8px;
                font-weight: 500;
            }
            
            .demo-input p {
                background: linear-gradient(135deg, #007AFF, #0056CC);
                color: white;
                padding: 12px 16px;
                border-radius: 12px;
                font-size: 0.9em;
                margin: 0;
                box-shadow: 0 4px 12px rgba(0, 122, 204, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .demo-arrow {
                font-size: 1.5em;
                color: #007AFF;
                font-weight: 600;
            }
            
            .demo-diagram {
                background: linear-gradient(135deg, #ffffff, #f8fafc);
                border-radius: 12px;
                padding: 12px;
                box-shadow: 
                    0 4px 16px rgba(0, 0, 0, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.8);
                border: 1px solid rgba(0, 0, 0, 0.05);
            }
            
            /* 特性亮点 */
            .feature-highlights {
                display: flex;
                justify-content: center;
                gap: 30px;
                margin-top: 30px;
            }
            
            .feature-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
            }
            
            .feature-icon {
                font-size: 2em;
            }
            
            .feature-item span:last-child {
                font-size: 0.9em;
                color: #515154;
                font-weight: 500;
            }
            
            /* 图表类型网格 */
            .diagram-types-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 20px;
                margin-bottom: 40px;
                flex: 1;
                min-height: 0;
            }
            
            .diagram-type-card {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.8));
                border-radius: 20px;
                padding: 24px;
                text-align: center;
                box-shadow: 
                    0 8px 24px rgba(0, 0, 0, 0.1),
                    0 2px 8px rgba(0, 0, 0, 0.05),
                    inset 0 1px 0 rgba(255, 255, 255, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.3);
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(10px);
                position: relative;
                overflow: hidden;
            }
            
            .diagram-type-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
                transition: left 0.6s ease;
            }
            
            .diagram-type-card:hover {
                transform: translateY(-6px) scale(1.02);
                box-shadow: 
                    0 16px 40px rgba(0, 0, 0, 0.15),
                    0 6px 20px rgba(0, 0, 0, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.9);
            }
            
            .diagram-type-card:hover::before {
                left: 100%;
            }
            
            .diagram-icon {
                font-size: 2.5em;
                margin-bottom: 15px;
                display: block;
            }
            
            .diagram-type-card h3 {
                font-size: 1.2em;
                font-weight: 600;
                color: #1d1d1f;
                margin: 0 0 10px 0;
            }
            
            .diagram-type-card p {
                font-size: 0.9em;
                color: #86868b;
                margin: 0 0 15px 0;
                line-height: 1.4;
            }
            
            .diagram-example {
                background: linear-gradient(135deg, #ffffff, #f8fafc);
                border-radius: 12px;
                padding: 12px;
                box-shadow: 
                    0 4px 16px rgba(0, 0, 0, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.8);
                border: 1px solid rgba(0, 0, 0, 0.05);
                transition: all 0.3s ease;
            }
            
            .diagram-type-card:hover .diagram-example {
                transform: scale(1.05);
                box-shadow: 
                    0 6px 20px rgba(0, 0, 0, 0.15),
                    inset 0 1px 0 rgba(255, 255, 255, 0.9);
            }
            
            /* Workflow grid */
            .workflow-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 30px;
                margin-bottom: 20px;
                max-width: 1200px;
                margin-left: auto;
                margin-right: auto;
            }
            
            .workflow-card {
                background: #ffffff;
                border-radius: 16px;
                padding: 25px 15px;
                text-align: center;
                box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
                border: 1px solid rgba(0, 0, 0, 0.04);
                transition: all 0.3s ease;
                position: relative;
            }
            
            .workflow-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            }
            
            .workflow-icon {
                font-size: 2.5em;
                margin-bottom: 15px;
                display: block;
            }
            
            .workflow-card h3 {
                font-size: 1.2em;
                font-weight: 600;
                color: #1d1d1f;
                margin: 0 0 10px 0;
            }
            
            .workflow-card p {
                font-size: 0.9em;
                color: #515154;
                margin: 0 0 15px 0;
                line-height: 1.4;
            }
            
            .workflow-visual {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 45px;
            }
            
            .visual-element {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                height: 100%;
            }
            
            .input-visual {
                background: linear-gradient(135deg, #f5f5f7, #e8e8ed);
                border-radius: 8px;
                border: 2px dashed #007AFF;
                position: relative;
            }
            
            .visual-label {
                font-size: 0.8em;
                color: #007AFF;
                font-weight: 500;
            }
            
            .ai-visual {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .ai-dots {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            
            .dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                display: inline-block;
            }
            
            .dot.blue { background: #007AFF; }
            .dot.green { background: #34C759; }
            .dot.orange { background: #FF9500; }
            
            .iterate-visual {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .iterate-circles {
                display: flex;
                gap: 6px;
                align-items: center;
            }
            
            .circle {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                display: inline-block;
                border: 2px solid;
            }
            
            .circle.blue { border-color: #007AFF; }
            .circle.green { border-color: #34C759; }
            .circle.orange { border-color: #FF9500; }
            
            /* Responsive design for workflow grid */
            @media (max-width: 768px) {
                .workflow-grid {
                    grid-template-columns: 1fr;
                    gap: 15px;
                    margin-bottom: 15px;
                }
                
                .workflow-card {
                    padding: 20px 12px;
                }
                
                .workflow-icon {
                    font-size: 2.2em;
                    margin-bottom: 12px;
                }
                
                .workflow-card h3 {
                font-size: 1.1em;
                margin: 0 0 8px 0;
            }
            
                .workflow-card p {
                    font-size: 0.85em;
                margin: 0 0 12px 0;
                }
                
                .workflow-visual {
                    height: 40px;
                }
                
                .onboarding-step {
                    padding: 15px 20px 15px;
                }
                
                .step-actions {
                    margin-top: 10px;
                    padding-top: 10px;
                }
            }
            

            
            .example-box {
                background: rgba(0, 122, 204, 0.1);
                border-radius: 8px;
                padding: 10px;
                border-left: 3px solid #007AFF;
            }
            
            .example-box.compact-example {
                padding: 10px;
                border-radius: 6px;
                border-left-width: 3px;
            }
            
            .example-label {
                display: block;
                font-size: 0.8em;
                color: #007AFF;
                font-weight: 600;
                margin-bottom: 5px;
            }
            
            .compact-example .example-label {
                font-size: 0.75em;
                margin-bottom: 4px;
            }
            
            .example-box p {
                font-size: 0.85em;
                color: #1d1d1f;
                margin: 0;
                font-style: italic;
            }
            
            .compact-example p {
                font-size: 0.8em;
                line-height: 1.2;
            }
            

            
            /* AI优势卡片 */
            .ai-advantages {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 40px;
                flex: 1;
                min-height: 0;
            }
            
            .advantage-card {
                background: linear-gradient(135deg, #f5f5f7, #ffffff);
                border-radius: 16px;
                padding: 25px;
                text-align: center;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.2);
                transition: all 0.3s ease;
            }
            
            .advantage-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
            }
            
            .advantage-icon {
                font-size: 2.5em;
                margin-bottom: 15px;
                display: block;
            }
            
            .advantage-card h3 {
                font-size: 1.2em;
                font-weight: 600;
                color: #1d1d1f;
                margin: 0 0 12px 0;
            }
            
            .advantage-card p {
                font-size: 0.9em;
                color: #515154;
                margin: 0 0 20px 0;
                line-height: 1.5;
            }
            
            .advantage-metric {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 5px;
            }
            
            .metric-value {
                font-size: 1.8em;
                font-weight: 700;
                color: #007AFF;
            }
            
            .metric-label {
                font-size: 0.8em;
                color: #86868b;
                font-weight: 500;
            }
            
            /* 对比表格 */
            .comparison-section {
                background: linear-gradient(135deg, #f5f5f7, #ffffff);
                border-radius: 16px;
                padding: 25px;
            }
            
            .comparison-section h3 {
                font-size: 1.3em;
                font-weight: 600;
                color: #1d1d1f;
                margin: 0 0 20px 0;
                text-align: center;
            }
            
            .comparison-table {
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
            }
            
            .comparison-header {
                background: linear-gradient(135deg, #007AFF, #0056CC);
                color: white;
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
            }
            
            .comparison-row {
                background: white;
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                border-bottom: 1px solid #f0f0f0;
            }
            
            .comparison-row:nth-child(even) {
                background: #fafafa;
            }
            
            .comparison-cell {
                padding: 15px;
                font-size: 0.9em;
                display: flex;
                align-items: center;
            }
            
            .comparison-header .comparison-cell {
                font-weight: 600;
                justify-content: center;
            }
            
            /* 导出功能 */
            .export-features {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 40px;
            }
            
            .export-card {
                background: linear-gradient(135deg, #f5f5f7, #ffffff);
                border-radius: 16px;
                padding: 25px;
                text-align: center;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.2);
                transition: all 0.3s ease;
            }
            
            .export-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
            }
            
            .export-icon {
                font-size: 2.5em;
                margin-bottom: 15px;
                display: block;
            }
            
            .export-card h3 {
                font-size: 1.2em;
                font-weight: 600;
                color: #1d1d1f;
                margin: 0 0 12px 0;
            }
            
            .export-card p {
                font-size: 0.9em;
                color: #515154;
                margin: 0 0 20px 0;
                line-height: 1.5;
            }
            
            .export-preview {
                background: white;
                border-radius: 8px;
                padding: 10px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            

            
            /* 场景选择 */
            .scenario-selection {
                margin-bottom: 40px;
            }
            
            .scenario-selection h3 {
                font-size: 1.3em;
                font-weight: 600;
                color: #1d1d1f;
                margin: 0 0 20px 0;
                text-align: center;
            }
            
            .scenario-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
            }
            
            .scenario-card {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.8));
                border-radius: 20px;
                padding: 28px;
                text-align: center;
                box-shadow: 
                    0 8px 24px rgba(0, 0, 0, 0.1),
                    0 2px 8px rgba(0, 0, 0, 0.05),
                    inset 0 1px 0 rgba(255, 255, 255, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.3);
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                cursor: pointer;
                backdrop-filter: blur(10px);
                position: relative;
                overflow: hidden;
            }
            
            .scenario-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(0, 122, 204, 0.1), transparent);
                transition: left 0.6s ease;
            }
            
            .scenario-card:hover {
                transform: translateY(-6px) scale(1.02);
                box-shadow: 
                    0 16px 40px rgba(0, 0, 0, 0.15),
                    0 6px 20px rgba(0, 0, 0, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.9);
            }
            
            .scenario-card:hover::before {
                left: 100%;
            }
            
            .scenario-icon {
                font-size: 2.5em;
                margin-bottom: 15px;
                display: block;
            }
            
            .scenario-card h4 {
                font-size: 1.1em;
                font-weight: 600;
                color: #1d1d1f;
                margin: 0 0 10px 0;
            }
            
            .scenario-card p {
                font-size: 0.9em;
                color: #515154;
                margin: 0 0 15px 0;
                line-height: 1.4;
            }
            
            .scenario-type {
                display: inline-block;
                background: #007AFF;
                color: white;
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 0.8em;
                font-weight: 500;
            }
            
            /* 最终鼓励 */
            .final-encouragement {
                background: linear-gradient(135deg, #007AFF, #0056CC);
                color: white;
                border-radius: 20px;
                padding: 36px;
                text-align: center;
                box-shadow: 
                    0 12px 32px rgba(0, 122, 204, 0.3),
                    0 6px 16px rgba(0, 122, 204, 0.2),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.1);
                position: relative;
                overflow: hidden;
            }
            
            .final-encouragement::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
                animation: rotate 20s linear infinite;
            }
            
            @keyframes rotate {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            .final-encouragement h3 {
                font-size: 1.6em;
                font-weight: 700;
                margin: 0 0 18px 0;
                position: relative;
                z-index: 1;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .final-encouragement p {
                font-size: 1.1em;
                margin: 0;
                opacity: 0.95;
                line-height: 1.6;
                position: relative;
                z-index: 1;
                font-weight: 500;
            }
            
            /* 按钮样式 */
            .step-actions {
                display: flex;
                justify-content: center;
                gap: 15px;
                flex-wrap: wrap;
                margin-top: 15px;
                padding-top: 15px;
                flex-shrink: 0;
            }
            
            .primary {
                background: linear-gradient(135deg, #007AFF, #0056CC);
                color: white;
                border: none;
                padding: 16px 32px;
                border-radius: 16px;
                font-size: 1.1em;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 
                    0 8px 24px rgba(0, 122, 204, 0.3),
                    0 4px 12px rgba(0, 122, 204, 0.2);
                display: flex;
                align-items: center;
                gap: 10px;
                position: relative;
                overflow: hidden;
                letter-spacing: 0.02em;
            }
            
            .primary::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                transition: left 0.6s ease;
            }
            
            .primary:hover {
                transform: translateY(-3px) scale(1.02);
                box-shadow: 
                    0 12px 32px rgba(0, 122, 204, 0.4),
                    0 6px 16px rgba(0, 122, 204, 0.3);
                background: linear-gradient(135deg, #0056CC, #004499);
            }
            
            .primary:hover::before {
                left: 100%;
            }
            
            .secondary {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.8));
                color: #007AFF;
                border: 2px solid rgba(0, 122, 204, 0.2);
                padding: 16px 32px;
                border-radius: 16px;
                font-size: 1.1em;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(10px);
                box-shadow: 
                    0 4px 16px rgba(0, 0, 0, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.8);
            }
            
            .secondary:hover {
                background: linear-gradient(135deg, rgba(0, 122, 204, 0.1), rgba(0, 122, 204, 0.05));
                transform: translateY(-2px) scale(1.02);
                border-color: rgba(0, 122, 204, 0.4);
                box-shadow: 
                    0 8px 24px rgba(0, 122, 204, 0.2),
                    0 4px 12px rgba(0, 0, 0, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.9);
            }
            
            .arrow {
                font-size: 1.1em;
            }
            
            /* Onboarding Controls Container */
            .onboarding-controls {
                position: absolute;
                top: 20px;
                right: 20px;
                display: flex;
                align-items: center;
                gap: 8px;
                z-index: 1002;
            }
            
            /* Language Toggle Button */
            .language-toggle-btn {
                background: rgba(255, 255, 255, 0.95);
                border: none;
                color: #64748b;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                padding: 6px 12px;
                border-radius: 8px;
                transition: all 0.15s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                min-width: 50px;
                height: 32px;
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                box-shadow: 
                    0 1px 3px rgba(0, 0, 0, 0.1),
                    0 1px 2px rgba(0, 0, 0, 0.06),
                    inset 0 0 0 1px rgba(255, 255, 255, 0.1);
            }
            
            .language-toggle-btn:hover {
                background: rgba(255, 255, 255, 0.98);
                color: #475569;
                transform: translateY(-1px);
                box-shadow: 
                    0 4px 12px rgba(0, 0, 0, 0.15),
                    0 2px 4px rgba(0, 0, 0, 0.1),
                    inset 0 0 0 1px rgba(255, 255, 255, 0.2);
            }
            
            .language-toggle-btn:active {
                transform: translateY(0);
                background: rgba(255, 255, 255, 0.9);
                box-shadow: 
                    0 1px 2px rgba(0, 0, 0, 0.1),
                    inset 0 0 0 1px rgba(255, 255, 255, 0.1);
            }
            
            .language-icon {
                font-size: 12px;
                line-height: 1;
            }
            
            .language-text {
                font-size: 12px;
                font-weight: 600;
                letter-spacing: -0.02em;
            }
            
            /* Skip Button */
            .skip-btn {
                background: rgba(255, 255, 255, 0.95);
                border: none;
                color: #64748b;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                padding: 8px 16px;
                border-radius: 8px;
                transition: all 0.15s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                min-width: 60px;
                height: 32px;
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                box-shadow: 
                    0 1px 3px rgba(0, 0, 0, 0.1),
                    0 1px 2px rgba(0, 0, 0, 0.06),
                    inset 0 0 0 1px rgba(255, 255, 255, 0.1);
            }
            
            .skip-btn:hover {
                background: rgba(255, 255, 255, 0.98);
                color: #475569;
                transform: translateY(-1px);
                box-shadow: 
                    0 4px 12px rgba(0, 0, 0, 0.15),
                    0 2px 4px rgba(0, 0, 0, 0.1),
                    inset 0 0 0 1px rgba(255, 255, 255, 0.2);
            }
            
            .skip-btn:active {
                transform: translateY(0);
                background: rgba(255, 255, 255, 0.9);
                box-shadow: 
                    0 1px 2px rgba(0, 0, 0, 0.1),
                    inset 0 0 0 1px rgba(255, 255, 255, 0.1);
            }
            
            .skip-text {
                font-size: 14px;
                font-weight: 500;
                white-space: nowrap;
                line-height: 1;
                letter-spacing: -0.01em;
            }
            
            /* 响应式设计 */
            @media (max-width: 768px) {
                .onboarding-content {
                    width: 100%;
                    height: 100%;
                    border-radius: 0;
                }
                
                .onboarding-step {
                    padding: 20px 15px 15px;
                }
                
                .skip-btn {
                    top: 16px;
                    right: 16px;
                    padding: 6px 12px;
                    font-size: 13px;
                    min-width: 50px;
                    height: 28px;
                    border-radius: 6px;
                }
                
                .skip-text {
                    font-size: 13px;
                }
                
                .step-header h1 {
                    font-size: 2em;
                }
                
                .hero-section {
                    flex-direction: column;
                    gap: 20px;
                }
                
                .diagram-types-grid,
                .ai-advantages,
                .export-features,
                .scenario-grid {
                    grid-template-columns: 1fr;
                }
                
                
                

                
                .demo-buttons {
                    flex-direction: column;
                }
                
                .step-actions {
                    flex-direction: column;
                }
            }
            
            /* 大屏幕优化 */
            @media (min-width: 1200px) {
                .onboarding-step {
                    padding: 100px 60px 60px;
                }
                
                .step-header h1 {
                    font-size: 3em;
                }
                
                .diagram-types-grid {
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                }
            }



            /* --- Empty State Styling --- */
            .empty-state {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            }
            .empty-state-content {
                text-align: center;
                max-width: 500px;
                padding: 40px;
                background: rgba(255, 255, 255, 0.9);
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            }
            .empty-state-content h2 {
                color: #007acc;
                margin-bottom: 15px;
                font-size: 1.8em;
            }
            .empty-state-content p {
                color: #666;
                margin-bottom: 30px;
                line-height: 1.6;
                font-size: 1.1em;
            }
            .empty-state-features {
                display: flex;
                justify-content: space-around;
                margin-bottom: 30px;
                flex-wrap: wrap;
            }
            .feature-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                margin: 10px;
                padding: 15px;
                background: rgba(0, 122, 204, 0.1);
                border-radius: 10px;
                min-width: 120px;
            }
            .feature-icon {
                font-size: 2em;
                margin-bottom: 8px;
            }
            .feature-item span:last-child {
                font-size: 0.9em;
                color: #333;
                font-weight: 500;
            }
            .start-example-btn {
                background: linear-gradient(135deg, #007acc, #005fa3);
                color: white;
                border: none;
                padding: 12px 30px;
                font-size: 1.1em;
                border-radius: 25px;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(0, 122, 204, 0.3);
            }
            .start-example-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 122, 204, 0.4);
            }

            /* --- Tutorial Center Button Styling --- */
            .tutorial-center-btn {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 100;
                background: linear-gradient(135deg, #007AFF, #0056CC);
                color: white;
                border: none;
                border-radius: 50px;
                padding: 16px 32px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow: 
                    0 8px 32px rgba(0, 122, 204, 0.3),
                    0 4px 16px rgba(0, 122, 204, 0.2);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            .tutorial-center-btn:hover {
                background: linear-gradient(135deg, #0056CC, #004499);
                transform: translate(-50%, -50%) scale(1.05);
                box-shadow: 
                    0 12px 40px rgba(0, 122, 204, 0.4),
                    0 6px 20px rgba(0, 122, 204, 0.3);
            }
            .tutorial-center-btn.hidden {
                display: none;
            }
            
            /* Center Tutorial Button - Always visible, appears above all content */
            .onboarding-btn-center {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #007ACC, #005A99);
                color: white;
                border: none;
                border-radius: 16px;
                padding: 20px 24px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                box-shadow: 
                    0 8px 32px rgba(0, 122, 204, 0.3),
                    0 4px 16px rgba(0, 122, 204, 0.2);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                z-index: 9999;
                min-width: 200px;
                pointer-events: auto;
            }
            
            .onboarding-btn-center:hover {
                background: linear-gradient(135deg, #0056CC, #004499);
                transform: translate(-50%, -50%) scale(1.05);
                box-shadow: 
                    0 12px 40px rgba(0, 122, 204, 0.4),
                    0 6px 20px rgba(0, 122, 204, 0.3);
            }
            
            .onboarding-btn-center .btn-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
            }
            
            .onboarding-btn-center .btn-icon {
                font-size: 24px;
                line-height: 1;
            }
            
            .onboarding-btn-center .btn-text {
                font-size: 16px;
                font-weight: 600;
                line-height: 1.2;
            }
            
            .onboarding-btn-center .btn-subtitle {
                font-size: 12px;
                opacity: 0.9;
                line-height: 1.2;
            }
            
            .onboarding-btn-center.hidden {
                display: none;
            }
        `;
    }

    /**
     * Generate JavaScript for webview functionality
     */
    private static generateJavaScript(): string {
        return `
            const vscode = acquireVsCodeApi();

            // --- Elements ---
            const requirementInput = document.getElementById('requirementInput');
            const sendBtn = document.getElementById('sendBtn');
            const exportSVGBtn = document.getElementById('exportSVGBtn');
            const clearChatBtn = document.getElementById('clearChatBtn');
            const expandBtn = document.getElementById('expandChatBtn');
            const importBtn = document.getElementById('importBtn');
            const saveChatBtn = document.getElementById('saveChatBtn');
            const moreActionsBtn = document.getElementById('moreActionsBtn');
            const moreActionsDropdown = document.getElementById('moreActionsDropdown');
            const leftPanel = document.getElementById('leftPanel');
            const rightPanel = document.getElementById('rightPanel');
            const zoomInBtn = document.getElementById('zoomInBtn');
            const zoomOutBtn = document.getElementById('zoomOutBtn');
            const zoomResetBtn = document.getElementById('zoomResetBtn');
            const chat = document.getElementById('chat');
            const onboardingBtn = document.getElementById('onboardingBtn');
            const onboardingModal = document.getElementById('onboardingModal');
            const languageToggle = document.getElementById('languageToggle');

            // --- Language System ---
            let currentLanguage = 'en'; // Default to English
            
            const translations = {
                en: {
                    skip: 'Skip',
                    languageToggle: '中文',
                    welcome: {
                        title: 'UML Chat Designer',
                        subtitle: 'Enterprise-Grade AI-Powered UML Design Platform',
                        description: 'Experience the future of software architecture design. Our advanced AI engine understands your business requirements and generates enterprise-grade UML diagrams with unprecedented speed and accuracy.',
                        nextBtn: 'Explore Platform →'
                    },
                    diagrams: {
                        title: 'Enterprise UML Diagram Suite',
                        subtitle: 'Comprehensive coverage for modern software architecture',
                        explanationTitle: 'Why These Five Diagram Types?',
                        explanationText: 'Our comprehensive analysis of enterprise software development practices reveals that these five UML diagram types address 95% of architectural and design challenges. Each type is optimized for AI-driven generation, ensuring maximum accuracy and professional standards. For specialized diagrams requiring manual precision, we recommend traditional UML tools.'
                    },
                    workflow: {
                        title: 'Streamlined Design Workflow',
                        subtitle: 'Three-step process for rapid UML generation',
                        step1: {
                            title: 'Describe Requirements',
                            description: 'Explain your system needs in natural language, and our AI will understand your architectural vision.'
                        },
                        step2: {
                            title: 'AI Generation',
                            description: 'Advanced AI analyzes requirements and generates professional UML diagrams with enterprise-grade precision.'
                        },
                        step3: {
                            title: 'Refine & Iterate',
                            description: 'Collaborate with AI to optimize and enhance your design through intelligent conversation and feedback.'
                        }
                    },
                    aiAdvantages: {
                        title: 'AI-Powered Design Excellence',
                        subtitle: 'Revolutionary approach to enterprise UML design',
                        card1: {
                            title: 'Enterprise Performance',
                            description: 'Generate complex UML diagrams in seconds, not hours. Our AI engine handles intricate architectural patterns and enterprise-scale modeling with precision.'
                        },
                        card2: {
                            title: 'Intelligent Architecture Analysis',
                            description: 'Advanced natural language processing understands complex business requirements and generates UML-compliant diagrams with enterprise-grade accuracy.'
                        },
                        card3: {
                            title: 'Continuous Design Evolution',
                            description: 'Iterate and refine designs through intelligent conversation, supporting complex enterprise scenarios and evolving requirements.'
                        },
                        comparisonTitle: 'Enterprise Comparison Matrix',
                        comparisonData: {
                            capability: 'Capability',
                            traditionalTools: 'Traditional Tools',
                            umlChatDesigner: 'UML Chat Designer',
                            learningCurve: 'Learning curve',
                            learningTraditional: 'UML syntax mastery required',
                            learningAI: 'Natural language proficiency',
                            efficiency: 'Generation efficiency',
                            efficiencyTraditional: 'Manual construction, hours',
                            efficiencyAI: 'AI automation, minutes',
                            modification: 'Modification workflow',
                            modificationTraditional: 'Manual rework required',
                            modificationAI: 'Conversational refinement',
                            collaboration: 'Enterprise collaboration',
                            collaborationTraditional: 'File-based sharing, version conflicts',
                            collaborationAI: 'Session management, seamless sharing'
                        }
                    },
                    getStarted: {
                        title: 'Ready to Transform Your Design Process?',
                        subtitle: 'Join thousands of developers and architects who trust our platform',
                        startBtn: 'Start Designing →'
                    }
                },
                'zh-CN': {
                    skip: '跳过',
                    languageToggle: 'EN',
                    welcome: {
                        title: 'UML Chat Designer',
                        subtitle: '企业级 AI 驱动的 UML 设计平台',
                        description: '体验软件架构设计的未来。我们先进的 AI 引擎理解您的业务需求，以前所未有的速度和准确性生成企业级 UML 图表。',
                        nextBtn: '探索平台 →'
                    },
                    diagrams: {
                        title: '企业 UML 图表套件',
                        subtitle: '现代软件架构的全面覆盖',
                        explanationTitle: '为什么选择这五种图表类型？',
                        explanationText: '我们对企业软件开发实践的全面分析表明，这五种 UML 图表类型能够解决 95% 的架构和设计挑战。每种类型都针对 AI 驱动的生成进行了优化，确保最大的准确性和专业标准。对于需要手动精确控制的专业图表，我们建议使用传统的 UML 工具。'
                    },
                    workflow: {
                        title: '流线型设计工作流程',
                        subtitle: '快速 UML 生成的三步骤流程',
                        step1: {
                            title: '描述需求',
                            description: '用自然语言解释您的系统需求，我们的 AI 将理解您的架构愿景。'
                        },
                        step2: {
                            title: 'AI 生成',
                            description: '先进的 AI 分析需求并以企业级精度生成专业的 UML 图表。'
                        },
                        step3: {
                            title: '精炼与迭代',
                            description: '通过智能对话和反馈与 AI 协作，优化和增强您的设计。'
                        }
                    },
                    aiAdvantages: {
                        title: 'AI 驱动的设计卓越',
                        subtitle: '企业 UML 设计的革命性方法',
                        card1: {
                            title: '企业级性能',
                            description: '在几秒钟内生成复杂的 UML 图表，而不是几小时。我们的 AI 引擎精确处理复杂的架构模式和企业级建模。'
                        },
                        card2: {
                            title: '智能架构分析',
                            description: '先进的自然语言处理理解复杂的业务需求，生成符合 UML 标准的图表，具有企业级准确性。'
                        },
                        card3: {
                            title: '持续设计演进',
                            description: '通过智能对话迭代和完善设计，支持复杂的企业场景和不断发展的需求。'
                        },
                        comparisonTitle: '企业对比矩阵',
                        comparisonData: {
                            capability: '能力',
                            traditionalTools: '传统工具',
                            umlChatDesigner: 'UML Chat Designer',
                            learningCurve: '学习曲线',
                            learningTraditional: '需要掌握 UML 语法',
                            learningAI: '自然语言熟练度',
                            efficiency: '生成效率',
                            efficiencyTraditional: '手动构建，数小时',
                            efficiencyAI: 'AI 自动化，数分钟',
                            modification: '修改工作流程',
                            modificationTraditional: '需要手动重做',
                            modificationAI: '对话式完善',
                            collaboration: '企业协作',
                            collaborationTraditional: '基于文件的共享，版本冲突',
                            collaborationAI: '会话管理，无缝共享'
                        }
                    },
                    getStarted: {
                        title: '准备好转变您的设计流程了吗？',
                        subtitle: '加入数千名信任我们平台的开发人员和架构师',
                        startBtn: '开始设计 →'
                    }
                }
            };
            
            function updateLanguage(lang) {
                currentLanguage = lang;
                const t = translations[lang];
                
                // Update language toggle button
                const languageText = document.getElementById('languageText');
                if (languageText) {
                    languageText.textContent = t.languageToggle;
                }
                
                // Update skip button
                const skipText = document.getElementById('skipText');
                if (skipText) {
                    skipText.textContent = t.skip;
                }
                
                // Update onboarding content based on current step
                updateOnboardingContent(lang);
            }
            
            function updateOnboardingContent(lang) {
                const t = translations[lang];
                
                // Update step 1 content
                const step1 = document.querySelector('.onboarding-step[data-step="1"]');
                if (step1) {
                    const title = step1.querySelector('h1');
                    const subtitle = step1.querySelector('.step-subtitle');
                    const description = step1.querySelector('.hero-text p');
                    const nextBtn = step1.querySelector('.next-btn');
                    
                    if (title) title.textContent = t.welcome.title;
                    if (subtitle) subtitle.textContent = t.welcome.subtitle;
                    if (description) description.textContent = t.welcome.description;
                    if (nextBtn) nextBtn.innerHTML = t.welcome.nextBtn;
                }
                
                // Update step 2 content
                const step2 = document.querySelector('.onboarding-step[data-step="2"]');
                if (step2) {
                    const title = step2.querySelector('h1');
                    const subtitle = step2.querySelector('.step-subtitle');
                    const explanationTitle = step2.querySelector('.diagram-explanation h3');
                    const explanationText = step2.querySelector('.diagram-explanation p');
                    
                    if (title) title.textContent = t.diagrams.title;
                    if (subtitle) subtitle.textContent = t.diagrams.subtitle;
                    if (explanationTitle) explanationTitle.textContent = t.diagrams.explanationTitle;
                    if (explanationText) explanationText.textContent = t.diagrams.explanationText;
                }
                
                // Update step 3 content (workflow)
                const step3 = document.querySelector('.onboarding-step[data-step="3"]');
                if (step3) {
                    const title = step3.querySelector('h1');
                    const subtitle = step3.querySelector('.step-subtitle');
                    
                    if (title) title.textContent = t.workflow.title;
                    if (subtitle) subtitle.textContent = t.workflow.subtitle;
                    
                    // Update workflow cards
                    const workflowCards = step3.querySelectorAll('.workflow-card');
                    if (workflowCards.length >= 3) {
                        const card1Title = workflowCards[0].querySelector('h3');
                        const card1Desc = workflowCards[0].querySelector('p');
                        const card2Title = workflowCards[1].querySelector('h3');
                        const card2Desc = workflowCards[1].querySelector('p');
                        const card3Title = workflowCards[2].querySelector('h3');
                        const card3Desc = workflowCards[2].querySelector('p');
                        
                        if (card1Title) card1Title.textContent = t.workflow.step1.title;
                        if (card1Desc) card1Desc.textContent = t.workflow.step1.description;
                        if (card2Title) card2Title.textContent = t.workflow.step2.title;
                        if (card2Desc) card2Desc.textContent = t.workflow.step2.description;
                        if (card3Title) card3Title.textContent = t.workflow.step3.title;
                        if (card3Desc) card3Desc.textContent = t.workflow.step3.description;
                    }
                }
                
                // Update step 4 content
                const step4 = document.querySelector('.onboarding-step[data-step="4"]');
                if (step4) {
                    const title = step4.querySelector('h1');
                    const subtitle = step4.querySelector('.step-subtitle');
                    
                    if (title) title.textContent = t.aiAdvantages.title;
                    if (subtitle) subtitle.textContent = t.aiAdvantages.subtitle;
                    
                    // Update advantage cards
                    const advantageCards = step4.querySelectorAll('.advantage-card');
                    if (advantageCards.length >= 3) {
                        const card1Title = advantageCards[0].querySelector('h3');
                        const card1Desc = advantageCards[0].querySelector('p');
                        const card2Title = advantageCards[1].querySelector('h3');
                        const card2Desc = advantageCards[1].querySelector('p');
                        const card3Title = advantageCards[2].querySelector('h3');
                        const card3Desc = advantageCards[2].querySelector('p');
                        
                        if (card1Title) card1Title.textContent = t.aiAdvantages.card1.title;
                        if (card1Desc) card1Desc.textContent = t.aiAdvantages.card1.description;
                        if (card2Title) card2Title.textContent = t.aiAdvantages.card2.title;
                        if (card2Desc) card2Desc.textContent = t.aiAdvantages.card2.description;
                        if (card3Title) card3Title.textContent = t.aiAdvantages.card3.title;
                        if (card3Desc) card3Desc.textContent = t.aiAdvantages.card3.description;
                    }
                    
                    // Update comparison table
                    const comparisonTitle = step4.querySelector('.comparison-section h3');
                    if (comparisonTitle) comparisonTitle.textContent = t.aiAdvantages.comparisonTitle;
                    
                    const comparisonCells = step4.querySelectorAll('.comparison-cell');
                    if (comparisonCells.length >= 12) {
                        const cd = t.aiAdvantages.comparisonData;
                        comparisonCells[0].textContent = cd.capability;
                        comparisonCells[1].textContent = cd.traditionalTools;
                        comparisonCells[2].textContent = cd.umlChatDesigner;
                        comparisonCells[3].textContent = cd.learningCurve;
                        comparisonCells[4].textContent = cd.learningTraditional;
                        comparisonCells[5].textContent = cd.learningAI;
                        comparisonCells[6].textContent = cd.efficiency;
                        comparisonCells[7].textContent = cd.efficiencyTraditional;
                        comparisonCells[8].textContent = cd.efficiencyAI;
                        comparisonCells[9].textContent = cd.modification;
                        comparisonCells[10].textContent = cd.modificationTraditional;
                        comparisonCells[11].textContent = cd.modificationAI;
                        if (comparisonCells[12]) comparisonCells[12].textContent = cd.collaboration;
                        if (comparisonCells[13]) comparisonCells[13].textContent = cd.collaborationTraditional;
                        if (comparisonCells[14]) comparisonCells[14].textContent = cd.collaborationAI;
                    }
                }
                
                // Update step 5 content
                const step5 = document.querySelector('.onboarding-step[data-step="5"]');
                if (step5) {
                    const title = step5.querySelector('h1');
                    const subtitle = step5.querySelector('.step-subtitle');
                    const startBtn = step5.querySelector('.next-btn');
                    
                    if (title) title.textContent = t.getStarted.title;
                    if (subtitle) subtitle.textContent = t.getStarted.subtitle;
                    if (startBtn) startBtn.innerHTML = t.getStarted.startBtn;
                }
            }
            
            // Language toggle functionality
            if (languageToggle) {
                languageToggle.addEventListener('click', () => {
                    const newLang = currentLanguage === 'en' ? 'zh-CN' : 'en';
                    updateLanguage(newLang);
                });
            }
            
            // Initialize with default language
            updateLanguage('en');

            // --- Click handler for historical bot messages ---
            function handleBotMessageClick(element) {
                document.querySelectorAll('.bot-message').forEach(el => el.classList.remove('active-message'));
                element.classList.add('active-message');
                const messageText = element.querySelector('pre').textContent;
                const umlRegex = /@startuml([\\s\\S]*?)@enduml/;
                const match = messageText.match(umlRegex);
                if (match && match[0]) {
                    const umlCode = match[0];
                    vscode.postMessage({ command: 'renderSpecificUML', umlCode: umlCode });
                }
            }

            // --- Dropdown Menu Logic ---
            moreActionsBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                moreActionsDropdown.classList.toggle('show');
            });
            window.addEventListener('click', (event) => {
                if (!moreActionsBtn.contains(event.target)) {
                    if (moreActionsDropdown.classList.contains('show')) {
                        moreActionsDropdown.classList.remove('show');
                    }
                }
            });

            // --- Enhanced Input Handling with Auto-resize ---
            function autoResizeTextarea() {
                const textarea = requirementInput;
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px';
            }

            // Character counter functionality
            const charCounter = document.getElementById('charCounter');
            const clearInputBtn = document.getElementById('clearInputBtn');
            
            function updateCharCounter() {
                const count = requirementInput.value.length;
                charCounter.textContent = count;
                // Show/hide clear button based on content
                if (count > 0) {
                    clearInputBtn.classList.add('show');
                } else {
                    clearInputBtn.classList.remove('show');
                }
                // Change color based on length
                if (count > 1000) {
                    charCounter.style.color = '#dc3545';
                } else if (count > 500) {
                    charCounter.style.color = '#ffc107';
                } else {
                    charCounter.style.color = '#8b9dc3';
                }
            }
            
            // Clear button functionality
            clearInputBtn.onclick = () => {
                requirementInput.value = '';
                requirementInput.style.height = '80px';
                updateCharCounter();
                requirementInput.focus();
            };

            // Auto-resize on input
            requirementInput.addEventListener('input', () => {
                autoResizeTextarea();
                updateCharCounter();
            });
            
            // Initialize auto-resize and counter
            autoResizeTextarea();
            updateCharCounter();

            sendBtn.onclick = () => {
                const text = requirementInput.value.trim();
                if (text) {
                    vscode.postMessage({ command: 'sendRequirement', text: text, diagramType: document.getElementById('diagramType').value });
                    requirementInput.value = '';
                    // Reset height and counter after sending
                    requirementInput.style.height = '80px';
                    updateCharCounter();
                }
            };
            
            // Enhanced keyboard handling with better UX
            requirementInput.addEventListener('keydown', (e) => {
                // Send on Enter (without Shift)
                if (e.key === 'Enter' && !e.shiftKey) { 
                    e.preventDefault(); 
                    sendBtn.click(); 
                }
                // Alternative: Ctrl+Enter to send
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    sendBtn.click();
                }
                // Tab handling for accessibility
                if (e.key === 'Tab') {
                    // Let default tab behavior work
                    return;
                }
                // Escape to clear input
                if (e.key === 'Escape') {
                    requirementInput.value = '';
                    requirementInput.style.height = '80px';
                    updateCharCounter();
                    requirementInput.blur();
                }
            });
            
            document.addEventListener('keydown', (e) => {
                if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
                
                if (e.ctrlKey || e.metaKey) {
                    switch(e.key) {
                        case '+':
                        case '=':
                            e.preventDefault();
                            if (zoomInBtn) zoomInBtn.click();
                            break;
                        case '-':
                            e.preventDefault();
                            if (zoomOutBtn) zoomOutBtn.click();
                            break;
                        case '0':
                            e.preventDefault();
                            if (zoomResetBtn) zoomResetBtn.click();
                            break;
                    }
                }
            });

            exportSVGBtn.onclick = () => vscode.postMessage({ command: 'exportSVG', svgContent: document.getElementById('svgPreview').innerHTML });
            clearChatBtn.onclick = () => vscode.postMessage({ command: 'clearChat' });
            importBtn.onclick = () => {
                vscode.postMessage({ command: 'importChat' });
            };
            saveChatBtn.onclick = () => vscode.postMessage({ command: 'exportChat' });
            
            expandBtn.onclick = () => {
                const isFullscreen = leftPanel.classList.toggle('fullscreen');
                rightPanel.classList.toggle('hide', isFullscreen);
                
                if (isFullscreen) {
                    expandBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="10" y1="14" x2="3" y2="21"/></svg>';
                    expandBtn.title = "Collapse Chat Panel";
                } else {
                    expandBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
                    expandBtn.title = "Expand Chat Panel";
                }
            };

            // --- Dragbar for resizing ---
            const dragbar = document.getElementById('dragbar');
            let isDragging = false;
            
            const startDrag = (e) => {
                isDragging = true;
                document.body.style.cursor = 'ew-resize';
                document.body.style.userSelect = 'none';
                e.preventDefault();
                e.stopPropagation();
            };
            
            const handleDrag = (e) => {
                if (!isDragging) return;
                const containerRect = document.getElementById('container').getBoundingClientRect();
                const newWidth = Math.max(320, Math.min(900, e.clientX - containerRect.left));
                leftPanel.style.width = newWidth + 'px';
                e.preventDefault();
                e.stopPropagation();
            };
            
            const endDrag = () => {
                isDragging = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };
            
            dragbar.addEventListener('mousedown', startDrag);
            document.addEventListener('mousemove', handleDrag);
            document.addEventListener('mouseup', endDrag);
            
            dragbar.addEventListener('touchstart', (e) => startDrag(e.touches[0]));
            document.addEventListener('touchmove', (e) => handleDrag(e.touches[0]));
            document.addEventListener('touchend', endDrag);

            // --- SVG Pan & Zoom ---
            let panZoomInstance;
            let fallbackZoomLevel = 1;
            function enablePanZoom() {
                try {
                    if(panZoomInstance) { 
                        panZoomInstance.destroy(); 
                        panZoomInstance = null;
                    }
                    const svgEl = document.querySelector('#svgPreview svg');
                    if (!svgEl) {
                        console.warn('No SVG element found for pan-zoom initialization');
                        return;
                    }
                    
                    // Validate SVG before initializing pan-zoom
                    const container = document.getElementById('svgPreview');
                    const svgViewBox = svgEl.getAttribute('viewBox');
                    const svgWidth = svgEl.getAttribute('width');
                    const svgHeight = svgEl.getAttribute('height');
                    
                    console.log('SVG validation:', { 
                        hasViewBox: !!svgViewBox, 
                        hasWidth: !!svgWidth, 
                        hasHeight: !!svgHeight,
                        viewBox: svgViewBox,
                        width: svgWidth,
                        height: svgHeight
                    });
                    
                    // Check for valid dimensions
                    let hasValidDimensions = false;
                    if (svgViewBox) {
                        const viewBoxValues = svgViewBox.split(' ');
                        if (viewBoxValues.length === 4) {
                            const vbWidth = parseFloat(viewBoxValues[2]);
                            const vbHeight = parseFloat(viewBoxValues[3]);
                            hasValidDimensions = !isNaN(vbWidth) && !isNaN(vbHeight) && vbWidth > 0 && vbHeight > 0;
                        }
                    } else if (svgWidth && svgHeight) {
                        const width = parseFloat(svgWidth);
                        const height = parseFloat(svgHeight);
                        hasValidDimensions = !isNaN(width) && !isNaN(height) && width > 0 && height > 0;
                    }
                    
                    if (!hasValidDimensions) {
                        console.warn('SVG has invalid or missing dimensions, setting fallback dimensions');
                        // Set fallback dimensions
                        svgEl.setAttribute('viewBox', '0 0 400 300');
                        svgEl.setAttribute('width', '400');
                        svgEl.setAttribute('height', '300');
                    }
                    
                    if (window.svgPanZoom && hasSvgPanZoom) {
                        const containerWidth = container ? container.clientWidth : window.innerWidth;
                        const containerHeight = container ? container.clientHeight : window.innerHeight;
                        
                        svgEl.style.display = 'block';
                        svgEl.style.margin = '0';
                        svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                        
                        // Get final dimensions after potential fallback
                        const finalViewBox = svgEl.getAttribute('viewBox');
                        const finalWidth = svgEl.getAttribute('width');
                        const finalHeight = svgEl.getAttribute('height');
                        
                        if (finalWidth && finalHeight) {
                            const aspectRatio = parseFloat(finalWidth) / parseFloat(finalHeight);
                            const containerAspectRatio = containerWidth / containerHeight;
                            
                            if (aspectRatio > containerAspectRatio) {
                                svgEl.style.width = '100%';
                                svgEl.style.height = 'auto';
                            } else {
                                svgEl.style.width = 'auto';
                                svgEl.style.height = '100%';
                            }
                        } else if (finalViewBox) {
                            const viewBoxValues = finalViewBox.split(' ');
                            if (viewBoxValues.length === 4) {
                                const vbWidth = parseFloat(viewBoxValues[2]);
                                const vbHeight = parseFloat(viewBoxValues[3]);
                                const aspectRatio = vbWidth / vbHeight;
                                const containerAspectRatio = containerWidth / containerHeight;
                                
                                if (aspectRatio > containerAspectRatio) {
                                    svgEl.style.width = '100%';
                                    svgEl.style.height = 'auto';
                                } else {
                                    svgEl.style.width = 'auto';
                                    svgEl.style.height = '100%';
                                }
                            }
                        }
                        
                        svgEl.style.maxWidth = 'none';
                        svgEl.style.maxHeight = 'none';
                        
                        try {
                            panZoomInstance = window.svgPanZoom(svgEl, { 
                                zoomEnabled: true, 
                                controlIconsEnabled: false,
                                fit: true, 
                                center: true, 
                                minZoom: 0.1,
                                maxZoom: 10,
                                panEnabled: true,
                                dblClickZoomEnabled: true,
                                mouseWheelZoomEnabled: true,
                                preventMouseEventsDefault: true,
                                contain: false,
                                viewportSelector: '#svgPreview',
                                beforeZoom: function(oldZoom, newZoom) {
                                    return newZoom >= 0.1 && newZoom <= 10;
                                },
                                onZoom: function(level) {
                                    if (container) {
                                        container.style.overflow = 'auto';
                                    }
                                    console.log('Zoom level:', level);
                                }
                            });
                            console.log('Pan-zoom initialized successfully');
                        } catch (panZoomError) {
                            console.error('Failed to initialize svg-pan-zoom:', panZoomError);
                            panZoomInstance = null;
                            // Apply basic styling without pan-zoom
                            svgEl.style.width = '100%';
                            svgEl.style.height = 'auto';
                            svgEl.style.maxWidth = 'none';
                            svgEl.style.maxHeight = 'none';
                        }
                    } else {
                        console.warn('SVG element found but svgPanZoom library not available, using fallback');
                        // Basic fallback styling
                        svgEl.style.display = 'block';
                        svgEl.style.margin = '0';
                        svgEl.style.width = '100%';
                        svgEl.style.height = 'auto';
                        svgEl.style.maxWidth = 'none';
                        svgEl.style.maxHeight = 'none';
                        svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                        fallbackZoomLevel = 1;
                    }
                } catch (error) {
                    console.error('Error initializing pan-zoom:', error);
                    const svgEl = document.querySelector('#svgPreview svg');
                    if (svgEl) {
                        svgEl.style.display = 'block';
                        svgEl.style.margin = '0';
                        svgEl.style.width = '100%';
                        svgEl.style.height = 'auto';
                        svgEl.style.maxWidth = 'none';
                        svgEl.style.maxHeight = 'none';
                        svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                        fallbackZoomLevel = 1;
                    }
                }
            }

            // --- Custom Zoom Control Functions ---
            function setupZoomControls() {
                console.log('Setting up Windows-optimized zoom controls...');
                
                // Simple, robust zoom implementation for Windows
                let currentZoomLevel = 1.0;
                const minZoom = 0.1;
                const maxZoom = 5.0;
                const zoomStep = 0.2;
                
                function applyZoom(newZoom, svgEl) {
                    newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
                    currentZoomLevel = newZoom;
                    
                    // Clear any existing transforms
                    svgEl.style.transform = '';
                    svgEl.style.zoom = '';
                    svgEl.style.scale = '';
                    
                    // Apply zoom using multiple methods for Windows compatibility
                    const isWindows = navigator.userAgent.toLowerCase().includes('windows');
                    
                    if (isWindows) {
                        // Use CSS zoom property for Windows (best compatibility)
                        svgEl.style.zoom = newZoom.toString();
                        console.log('Applied Windows CSS zoom:', newZoom);
                    } else {
                        // Use transform scale for other platforms
                        svgEl.style.transform = 'scale(' + newZoom + ')';
                        svgEl.style.transformOrigin = 'center center';
                        console.log('Applied transform scale:', newZoom);
                    }
                    
                    // Ensure proper positioning
                    svgEl.style.display = 'block';
                    svgEl.style.margin = '0 auto';
                    
                    return newZoom;
                }
                
                function getZoomLevel() {
                    return currentZoomLevel;
                }
                
                // Enhanced button event handlers
                function setupButton(button, action) {
                    if (!button) return;
                    
                    // Remove all existing listeners
                    const newButton = button.cloneNode(true);
                    button.parentNode.replaceChild(newButton, button);
                    
                    // Add ONLY click event to prevent double execution
                    newButton.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        
                        console.log('Button clicked:', action);
                        
                        const svgEl = document.querySelector('#svgPreview svg');
                        if (!svgEl) {
                            console.log('No SVG element found');
                            return false;
                        }
                        
                        let success = false;
                        
                        // Try svg-pan-zoom first if available
                        if (panZoomInstance && hasSvgPanZoom) {
                            try {
                                switch(action) {
                                    case 'zoomIn':
                                        if (typeof panZoomInstance.zoomIn === 'function') {
                                            panZoomInstance.zoomIn();
                                            success = true;
                                            console.log('svg-pan-zoom zoomIn succeeded');
                                        }
                                        break;
                                    case 'zoomOut':
                                        if (typeof panZoomInstance.zoomOut === 'function') {
                                            panZoomInstance.zoomOut();
                                            success = true;
                                            console.log('svg-pan-zoom zoomOut succeeded');
                                        }
                                        break;
                                    case 'zoomReset':
                                        if (typeof panZoomInstance.reset === 'function') {
                                            panZoomInstance.reset();
                                            success = true;
                                            console.log('svg-pan-zoom reset succeeded');
                                        }
                                        break;
                                }
                            } catch (error) {
                                console.warn('svg-pan-zoom operation failed:', error);
                                success = false;
                            }
                        }
                        
                        // Use fallback if svg-pan-zoom failed or not available
                        if (!success) {
                            console.log('Using fallback zoom for:', action);
                            const currentZoom = getZoomLevel();
                            let newZoom = currentZoom;
                            
                            switch(action) {
                                case 'zoomIn':
                                    newZoom = currentZoom + zoomStep;
                                    break;
                                case 'zoomOut':
                                    newZoom = currentZoom - zoomStep;
                                    break;
                                case 'zoomReset':
                                    newZoom = 1.0;
                                    break;
                            }
                            
                            const appliedZoom = applyZoom(newZoom, svgEl);
                            console.log('Fallback zoom applied:', appliedZoom);
                        }
                        
                        return false;
                    }, { passive: false, capture: true });
                    
                    return newButton;
                }
                
                // Setup all zoom buttons
                const zoomInButton = setupButton(document.getElementById('zoomInBtn'), 'zoomIn');
                const zoomOutButton = setupButton(document.getElementById('zoomOutBtn'), 'zoomOut');
                const zoomResetButton = setupButton(document.getElementById('zoomResetBtn'), 'zoomReset');
                
                console.log('Windows-optimized zoom controls setup completed');
                console.log('Buttons configured:', {
                    zoomIn: !!zoomInButton,
                    zoomOut: !!zoomOutButton,
                    zoomReset: !!zoomResetButton
                });
                
                // Test zoom functionality
                setTimeout(() => {
                    const svgEl = document.querySelector('#svgPreview svg');
                    if (svgEl) {
                        console.log('Testing initial zoom setup...');
                        applyZoom(1.0, svgEl);
                        console.log('Initial zoom test completed');
                    }
                }, 500);
            }

            // --- Pan and Pinch-to-Zoom Setup ---
            function setupPanAndPinch() {
                console.log('Setting up pan and pinch-to-zoom...');
                
                const container = document.getElementById('svgPreview');
                if (!container) {
                    console.warn('SVG preview container not found for pan/pinch setup');
                    return;
                }
                
                // Pan and zoom state
                let isPanning = false;
                let lastPanX = 0;
                let lastPanY = 0;
                let currentPanX = 0;
                let currentPanY = 0;
                
                // Touch/pinch state
                let lastTouchDistance = 0;
                let lastTouchCenterX = 0;
                let lastTouchCenterY = 0;
                
                // Touch event helpers
                function getTouchDistance(touch1, touch2) {
                    const dx = touch1.clientX - touch2.clientX;
                    const dy = touch1.clientY - touch2.clientY;
                    return Math.sqrt(dx * dx + dy * dy);
                }
                
                function getTouchCenter(touch1, touch2) {
                    return {
                        x: (touch1.clientX + touch2.clientX) / 2,
                        y: (touch1.clientY + touch2.clientY) / 2
                    };
                }
                
                function applyPanToSvg(deltaX, deltaY) {
                    currentPanX += deltaX;
                    currentPanY += deltaY;
                    
                    const svgEl = document.querySelector('#svgPreview svg');
                    if (!svgEl) return;
                    
                    // Try svg-pan-zoom first if available
                    if (panZoomInstance && hasSvgPanZoom) {
                        try {
                            if (typeof panZoomInstance.panBy === 'function') {
                                panZoomInstance.panBy({x: deltaX, y: deltaY});
                                console.log('svg-pan-zoom pan applied:', deltaX, deltaY);
                                return;
                            }
                        } catch (error) {
                            console.warn('svg-pan-zoom pan failed:', error);
                        }
                    }
                    
                    // Fallback: apply manual transform
                    const isWindows = navigator.userAgent.toLowerCase().includes('windows');
                    const currentZoom = getCurrentZoomLevel();
                    
                    if (isWindows && svgEl.style.zoom) {
                        // Windows: use separate transform for pan
                        svgEl.style.transform = 'translate(' + currentPanX + 'px, ' + currentPanY + 'px)';
                    } else {
                        // Other platforms: combine zoom and pan
                        svgEl.style.transform = 'translate(' + currentPanX + 'px, ' + currentPanY + 'px) scale(' + currentZoom + ')';
                        svgEl.style.transformOrigin = 'center center';
                    }
                    
                    console.log('Manual pan applied:', currentPanX, currentPanY);
                }
                
                function getCurrentZoomLevel() {
                    if (panZoomInstance && hasSvgPanZoom) {
                        try {
                            if (typeof panZoomInstance.getZoom === 'function') {
                                return panZoomInstance.getZoom();
                            }
                        } catch (error) {
                            console.warn('Failed to get svg-pan-zoom zoom level:', error);
                        }
                    }
                    return currentZoomLevel || 1.0;
                }
                
                // Mouse events for panning
                container.addEventListener('mousedown', function(e) {
                    if (e.button === 0) { // Left mouse button
                        isPanning = true;
                        lastPanX = e.clientX;
                        lastPanY = e.clientY;
                        container.style.cursor = 'grabbing';
                        e.preventDefault();
                        console.log('Mouse pan started');
                    }
                });
                
                container.addEventListener('mousemove', function(e) {
                    if (isPanning) {
                        const deltaX = e.clientX - lastPanX;
                        const deltaY = e.clientY - lastPanY;
                        applyPanToSvg(deltaX, deltaY);
                        lastPanX = e.clientX;
                        lastPanY = e.clientY;
                        e.preventDefault();
                    }
                });
                
                container.addEventListener('mouseup', function(e) {
                    if (isPanning) {
                        isPanning = false;
                        container.style.cursor = 'grab';
                        console.log('Mouse pan ended');
                    }
                });
                
                container.addEventListener('mouseleave', function(e) {
                    if (isPanning) {
                        isPanning = false;
                        container.style.cursor = 'grab';
                        console.log('Mouse pan ended (leave)');
                    }
                });
                
                // Touch events for one finger pan and two finger pinch-to-zoom
                container.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    
                    if (e.touches.length === 1) {
                        // One finger - start panning
                        isPanning = true;
                        lastPanX = e.touches[0].clientX;
                        lastPanY = e.touches[0].clientY;
                        console.log('Touch pan started');
                    } else if (e.touches.length === 2) {
                        // Two fingers - start pinch-to-zoom
                        isPanning = false;
                        const touch1 = e.touches[0];
                        const touch2 = e.touches[1];
                        lastTouchDistance = getTouchDistance(touch1, touch2);
                        const center = getTouchCenter(touch1, touch2);
                        lastTouchCenterX = center.x;
                        lastTouchCenterY = center.y;
                        console.log('Pinch-to-zoom started, distance:', lastTouchDistance);
                    }
                }, { passive: false });
                
                container.addEventListener('touchmove', function(e) {
                    e.preventDefault();
                    
                    if (e.touches.length === 1 && isPanning) {
                        // One finger - continue panning
                        const deltaX = e.touches[0].clientX - lastPanX;
                        const deltaY = e.touches[0].clientY - lastPanY;
                        applyPanToSvg(deltaX, deltaY);
                        lastPanX = e.touches[0].clientX;
                        lastPanY = e.touches[0].clientY;
                    } else if (e.touches.length === 2) {
                        // Two fingers - continue pinch-to-zoom
                        const touch1 = e.touches[0];
                        const touch2 = e.touches[1];
                        const currentDistance = getTouchDistance(touch1, touch2);
                        const center = getTouchCenter(touch1, touch2);
                        
                        if (lastTouchDistance > 0) {
                            const zoomFactor = currentDistance / lastTouchDistance;
                            
                            // Try svg-pan-zoom first
                            let zoomSuccess = false;
                            if (panZoomInstance && hasSvgPanZoom) {
                                try {
                                    if (typeof panZoomInstance.zoomAtPoint === 'function') {
                                        const currentZoom = panZoomInstance.getZoom();
                                        const newZoom = currentZoom * zoomFactor;
                                        panZoomInstance.zoomAtPoint(newZoom, {x: center.x, y: center.y});
                                        zoomSuccess = true;
                                        console.log('svg-pan-zoom pinch zoom:', newZoom);
                                    }
                                } catch (error) {
                                    console.warn('svg-pan-zoom pinch zoom failed:', error);
                                }
                            }
                            
                            // Fallback zoom
                            if (!zoomSuccess) {
                                const svgEl = document.querySelector('#svgPreview svg');
                                if (svgEl) {
                                    const currentZoom = getCurrentZoomLevel();
                                    const newZoom = Math.max(0.1, Math.min(5.0, currentZoom * zoomFactor));
                                    
                                    const isWindows = navigator.userAgent.toLowerCase().includes('windows');
                                    if (isWindows) {
                                        svgEl.style.zoom = newZoom.toString();
                                    } else {
                                        svgEl.style.transform = 'translate(' + currentPanX + 'px, ' + currentPanY + 'px) scale(' + newZoom + ')';
                                        svgEl.style.transformOrigin = 'center center';
                                    }
                                    
                                    console.log('Manual pinch zoom:', newZoom);
                                }
                            }
                        }
                        
                        lastTouchDistance = currentDistance;
                        lastTouchCenterX = center.x;
                        lastTouchCenterY = center.y;
                    }
                }, { passive: false });
                
                container.addEventListener('touchend', function(e) {
                    e.preventDefault();
                    
                    if (e.touches.length === 0) {
                        // All fingers lifted
                        isPanning = false;
                        lastTouchDistance = 0;
                        console.log('Touch interaction ended');
                    } else if (e.touches.length === 1) {
                        // From two fingers to one finger - switch to panning
                        isPanning = true;
                        lastPanX = e.touches[0].clientX;
                        lastPanY = e.touches[0].clientY;
                        lastTouchDistance = 0;
                        console.log('Switched from pinch to pan');
                    }
                }, { passive: false });
                
                // Mouse wheel zoom (existing functionality enhancement)
                container.addEventListener('wheel', function(e) {
                    e.preventDefault();
                    
                    // Get mouse position relative to container
                    const rect = container.getBoundingClientRect();
                    const centerX = e.clientX - rect.left;
                    const centerY = e.clientY - rect.top;
                    
                    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
                    
                    // Try svg-pan-zoom first
                    let zoomSuccess = false;
                    if (panZoomInstance && hasSvgPanZoom) {
                        try {
                            if (typeof panZoomInstance.zoomAtPoint === 'function') {
                                const currentZoom = panZoomInstance.getZoom();
                                const newZoom = currentZoom * zoomFactor;
                                panZoomInstance.zoomAtPoint(newZoom, {x: centerX, y: centerY});
                                zoomSuccess = true;
                                console.log('svg-pan-zoom wheel zoom:', newZoom);
                            }
                        } catch (error) {
                            console.warn('svg-pan-zoom wheel zoom failed:', error);
                        }
                    }
                    
                    // Fallback zoom
                    if (!zoomSuccess) {
                        const svgEl = document.querySelector('#svgPreview svg');
                        if (svgEl) {
                            const currentZoom = getCurrentZoomLevel();
                            const newZoom = Math.max(0.1, Math.min(5.0, currentZoom * zoomFactor));
                            
                            const isWindows = navigator.userAgent.toLowerCase().includes('windows');
                            if (isWindows) {
                                svgEl.style.zoom = newZoom.toString();
                            } else {
                                svgEl.style.transform = 'translate(' + currentPanX + 'px, ' + currentPanY + 'px) scale(' + newZoom + ')';
                                svgEl.style.transformOrigin = 'center center';
                            }
                            
                            console.log('Manual wheel zoom:', newZoom);
                        }
                    }
                }, { passive: false });
                
                console.log('Pan and pinch-to-zoom setup completed');
            }

            // Initial setup only if SVG exists
            const initialSvg = document.querySelector('#svgPreview svg');
            console.log('Initial SVG check:', !!initialSvg);
            console.log('Setting up zoom controls on page load...');
            
            // Always set up zoom controls, even without SVG initially
            setupZoomControls();
            
            // Setup pan and pinch-to-zoom functionality
            setupPanAndPinch();

            // --- VS Code Message Handling ---
            window.addEventListener('message', event => {
                const message = event.data;
                if (message.command === 'updatePreview') {
                    const svgContainer = document.getElementById('svgPreview');
                    if (svgContainer) {
                        // PRESERVE the center button before clearing content
                        const centerBtn = document.getElementById('onboardingBtnCenter');
                        let centerBtnHTML = '';
                        if (centerBtn) {
                            centerBtnHTML = centerBtn.outerHTML;
                            console.log('[PRESERVE] Saving center button HTML');
                        }
                        
                        svgContainer.innerHTML = '';
                        if (window.gc) {
                            setTimeout(() => window.gc(), 100);
                    }
                    
                    // Validate SVG content before inserting
                    if (!message.svgContent || message.svgContent.trim().length === 0) {
                        console.warn('Empty or invalid SVG content received');
                            svgContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666; font-family: Arial, sans-serif;">No diagram content available</div>' + centerBtnHTML;
                            // Reactive state will automatically detect no SVG content
                        return;
                    }
                    
                    // Check if the SVG content looks valid
                    if (!message.svgContent.includes('<svg')) {
                        console.warn('SVG content does not contain <svg> tag');
                            svgContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666; font-family: Arial, sans-serif;">Invalid diagram format</div>' + centerBtnHTML;
                            // Reactive state will automatically detect no valid SVG
                        return;
                    }
                    
                        // Insert SVG content AND restore the center button
                        svgContainer.innerHTML = message.svgContent + centerBtnHTML;
                        console.log('[PRESERVE] Center button restored after SVG update');
                        
                        // Re-add event listener to the restored button
                        setTimeout(() => {
                            const restoredBtn = document.getElementById('onboardingBtnCenter');
                            if (restoredBtn) {
                                console.log('[PRESERVE] Re-adding click handler to restored button');
                                restoredBtn.addEventListener('click', (e) => {
                                    console.log('[PRESERVE] Restored button clicked!', e);
                                    onboardingModal.style.display = 'block';
                                    currentOnboardingStep = 1;
                                    showOnboardingStep(currentOnboardingStep);
                                    isOnboardingActive = true;
                                    tutorialButtonState.setOnboardingActive(true);
                                });
                            } else {
                                console.warn('[PRESERVE] Restored button not found!');
                            }
                        }, 100);
                    }
                    
                    const newSvgEl = svgContainer.querySelector('svg');
                    if (newSvgEl) {
                        const originalWidth = newSvgEl.getAttribute('width');
                        const originalHeight = newSvgEl.getAttribute('height');
                        const viewBox = newSvgEl.getAttribute('viewBox');
                        console.log('SVG dimensions before fix:', { originalWidth, originalHeight, viewBox });
                        
                        // Ensure SVG has valid dimensions
                        if (!originalWidth || !originalHeight || originalWidth === 'null' || originalHeight === 'null') {
                            console.log('Setting fallback SVG dimensions');
                            newSvgEl.setAttribute('width', '400');
                            newSvgEl.setAttribute('height', '300');
                        }
                        
                        if (!viewBox || viewBox === 'null') {
                            console.log('Setting fallback SVG viewBox');
                            const width = newSvgEl.getAttribute('width') || '400';
                            const height = newSvgEl.getAttribute('height') || '300';
                            newSvgEl.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
                        }
                        
                        newSvgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                        newSvgEl.style.display = 'block';
                        newSvgEl.style.margin = '0';
                        
                        const containerWidth = svgContainer.clientWidth;
                        const containerHeight = svgContainer.clientHeight;
                        
                        const finalWidth = newSvgEl.getAttribute('width');
                        const finalHeight = newSvgEl.getAttribute('height');
                        
                        if (finalWidth && finalHeight) {
                            const aspectRatio = parseFloat(finalWidth) / parseFloat(finalHeight);
                            const containerAspectRatio = containerWidth / containerHeight;
                            
                            if (aspectRatio > containerAspectRatio) {
                                newSvgEl.style.width = '100%';
                                newSvgEl.style.height = 'auto';
                            } else {
                                newSvgEl.style.width = 'auto';
                                newSvgEl.style.height = '100%';
                            }
                        } else {
                            newSvgEl.style.width = '100%';
                            newSvgEl.style.height = 'auto';
                        }
                        
                        newSvgEl.style.maxWidth = 'none';
                        newSvgEl.style.maxHeight = 'none';
                        
                        console.log('SVG configured for maximum space usage');
                    } else {
                        console.warn('No SVG element found in the inserted content');
                        svgContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666; font-family: Arial, sans-serif;">Failed to load diagram</div>';
                        // Reactive state will automatically detect SVG loading failure
                        return;
                    }
                    
                    setTimeout(() => {
                        enablePanZoom();
                        setupZoomControls();
                        // Reactive state will automatically detect SVG changes via DOM observer
                    }, 100);
                } else if (message.command === 'updateChat') {
                    document.getElementById('chat').innerHTML = message.chatHtml;
                    const chatDiv = document.getElementById('chat');
                    if (chatDiv) {
                        chatDiv.scrollTop = chatDiv.scrollHeight;
                    }
                } else if (message.command === 'error') {
                    console.error('Extension error:', message.error);
                    const svgContainer = document.getElementById('svgPreview');
                    if (svgContainer) {
                        svgContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #d73a49; font-family: Arial, sans-serif;">Error: ' + (message.error || 'Unknown error') + '</div>';
                    }
                }
            });
            
            window.addEventListener('beforeunload', () => {
                try {
                    if (panZoomInstance) {
                        panZoomInstance.destroy();
                        panZoomInstance = null;
                    }
                } catch (error) {
                    console.warn('Cleanup error:', error);
                }
            });

            // --- Debug Info ---
            const userAgent = navigator.userAgent;
            const isWindows = userAgent.indexOf('Windows') !== -1;
            const isEdge = userAgent.indexOf('Edg') !== -1;
            const isChrome = userAgent.indexOf('Chrome') !== -1;
            
            console.log('=== ZOOM CONTROLS DEBUG INFO ===');
            console.log('Platform detection:', {
                userAgent: userAgent,
                isWindows: isWindows,
                isEdge: isEdge,
                isChrome: isChrome,
                devicePixelRatio: window.devicePixelRatio || 1,
                screenResolution: screen.width + 'x' + screen.height,
                innerSize: window.innerWidth + 'x' + window.innerHeight,
                vsCodeWebview: typeof acquireVsCodeApi !== 'undefined'
            });
            
            console.log('Zoom button elements:', {
                zoomInBtn: zoomInBtn ? 'found' : 'NOT FOUND',
                zoomOutBtn: zoomOutBtn ? 'found' : 'NOT FOUND', 
                zoomResetBtn: zoomResetBtn ? 'found' : 'NOT FOUND'
            });
            
            console.log('svg-pan-zoom library:', window.svgPanZoom ? 'loaded' : 'NOT LOADED');
            console.log('hasSvgPanZoom variable:', hasSvgPanZoom ? 'true' : 'false');
            
            // Test button click detection
            if (isWindows) {
                console.log('Windows detected - applying enhanced button handling');
                const testButtons = document.querySelectorAll('.zoom-btn');
                testButtons.forEach((btn, index) => {
                    console.log('Button', index, ':', {
                        id: btn.id,
                        visible: btn.offsetParent !== null,
                        style: {
                            display: getComputedStyle(btn).display,
                            pointerEvents: getComputedStyle(btn).pointerEvents,
                            zIndex: getComputedStyle(btn).zIndex
                        }
                    });
                });
            }
            console.log('=== END DEBUG INFO ===');

            // Enhanced edit mode functionality
            chat.addEventListener('click', function(event) {
                const target = event.target;
                if (target && target.classList.contains('edit-user-msg-btn')) {
                    const userDiv = target.closest('.user');
                    if (!userDiv) return;
                    const idx = parseInt(userDiv.getAttribute('data-index'));
                    const pre = userDiv.querySelector('pre');
                    if (!pre) return;
                    
                    // Create enhanced edit mode container
                    const editContainer = document.createElement('div');
                    editContainer.className = 'edit-mode-container';
                    
                    // Create header with character counter
                    const header = document.createElement('div');
                    header.className = 'edit-mode-header';
                    header.innerHTML = '<span>✏️ Editing message</span><span class="edit-mode-char-counter">0</span>';
                    
                    // Create textarea with enhanced styling
                    const textarea = document.createElement('textarea');
                    textarea.value = pre.textContent;
                    textarea.className = 'edit-mode-textarea';
                    textarea.placeholder = 'Edit your message here... (Ctrl+Enter to save, Esc to cancel)';
                    
                    // Create button container
                    const buttonContainer = document.createElement('div');
                    buttonContainer.className = 'edit-mode-buttons';
                    
                    // Add enhanced buttons
                    const saveBtn = document.createElement('button');
                    saveBtn.textContent = 'Resend';
                    saveBtn.className = 'resend-btn';
                    saveBtn.title = 'Send the modified message (Ctrl+Enter)';
                    
                    const cancelBtn = document.createElement('button');
                    cancelBtn.textContent = 'Cancel';
                    cancelBtn.className = 'cancel-btn';
                    cancelBtn.title = 'Cancel editing and restore original message (Esc)';
                    
                    buttonContainer.appendChild(saveBtn);
                    buttonContainer.appendChild(cancelBtn);
                    
                    // Assemble the edit container
                    editContainer.appendChild(header);
                    editContainer.appendChild(textarea);
                    editContainer.appendChild(buttonContainer);
                    
                    // Replace pre and edit button with enhanced edit container
                    userDiv.replaceChild(editContainer, pre);
                    target.style.display = 'none';
                    
                    // Auto-resize functionality for edit textarea
                    function autoResizeEditTextarea() {
                        textarea.style.height = 'auto';
                        textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px';
                    }
                    
                    // Character counter functionality
                    function updateEditCharCounter() {
                        const count = textarea.value.length;
                        const counter = header.querySelector('.edit-mode-char-counter');
                        counter.textContent = count;
                        
                        // Update counter color based on length
                        counter.classList.remove('warning', 'danger');
                        if (count > 1000) {
                            counter.classList.add('danger');
                        } else if (count > 500) {
                            counter.classList.add('warning');
                        }
                    }
                    
                    // Initialize auto-resize and counter
                    autoResizeEditTextarea();
                    updateEditCharCounter();
                    
                    // Add event listeners
                    textarea.addEventListener('input', () => {
                        autoResizeEditTextarea();
                        updateEditCharCounter();
                    });
                    
                    // Focus and select all text
                    textarea.focus();
                    textarea.select();
                    
                    // Save handler
                    saveBtn.onclick = function() {
                        const newText = textarea.value.trim();
                        if (newText) {
                            vscode.postMessage({ command: 'editAndResendUserMsg', index: idx, newText: newText });
                        }
                    };
                    
                    // Cancel handler
                    cancelBtn.onclick = function() {
                        // Restore original pre and edit button
                        userDiv.replaceChild(pre, editContainer);
                        target.style.display = '';
                    };
                    
                    // Enhanced keyboard shortcuts
                    textarea.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter' && e.ctrlKey) {
                            e.preventDefault();
                            saveBtn.click();
                        } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelBtn.click();
                        } else if (e.key === 'Tab') {
                            // Allow tab for indentation
                            if (e.shiftKey) {
                                // Shift+Tab for outdent
                                e.preventDefault();
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const value = textarea.value;
                                
                                if (start === end) {
                                    // Single cursor - remove one tab/space
                                    const beforeCursor = value.substring(0, start);
                                    const afterCursor = value.substring(end);
                                    const newValue = beforeCursor.replace(/\t$/, '') + afterCursor;
                                    textarea.value = newValue;
                                    textarea.selectionStart = textarea.selectionEnd = start - 1;
                                }
                            } else {
                                // Tab for indent
                                e.preventDefault();
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const value = textarea.value;
                                
                                textarea.value = value.substring(0, start) + '\t' + value.substring(end);
                                textarea.selectionStart = textarea.selectionEnd = start + 1;
                            }
                        }
                    });
                    
                    // Add visual feedback for changes
                    const originalText = pre.textContent;
                    textarea.addEventListener('input', function() {
                        const hasChanges = textarea.value !== originalText;
                        saveBtn.style.opacity = hasChanges ? '1' : '0.7';
                        saveBtn.disabled = !hasChanges;
                    });
                }
            });

            // --- Onboarding and Whats New functionality ---
            
            // Initialize onboarding modal
            let currentOnboardingStep = 1;
            const totalOnboardingSteps = 6;
            let isOnboardingActive = false;
            
            function showOnboardingStep(step) {
                // Hide all steps
                document.querySelectorAll('.onboarding-step').forEach(s => s.style.display = 'none');
                // Show current step
                const currentStepEl = document.querySelector('.onboarding-step[data-step="' + step + '"]');
                if (currentStepEl) {
                    currentStepEl.style.display = 'block';
                }
                
                // Update progress dots
                document.querySelectorAll('.progress-dot').forEach(dot => dot.classList.remove('active'));
                const activeDot = document.querySelector('.progress-dot[data-step="' + step + '"]');
                if (activeDot) {
                    activeDot.classList.add('active');
                }
            }
            
            // Onboarding button functionality
            onboardingBtn.addEventListener('click', () => {
                onboardingModal.style.display = 'block';
                currentOnboardingStep = 1;
                showOnboardingStep(currentOnboardingStep);
                isOnboardingActive = true;
                tutorialButtonState.setOnboardingActive(true);
            });
            

            
            // Center onboarding button functionality
            const onboardingBtnCenter = document.getElementById('onboardingBtnCenter');
            if (onboardingBtnCenter) {
                console.log('[DEBUG] Center button found, adding click handler');
                onboardingBtnCenter.addEventListener('click', (e) => {
                    console.log('[DEBUG] Center button clicked!', e);
                    onboardingModal.style.display = 'block';
                    currentOnboardingStep = 1;
                    showOnboardingStep(currentOnboardingStep);
                    isOnboardingActive = true;
                    tutorialButtonState.setOnboardingActive(true);
                    // Hide the center button when onboarding is active
                    onboardingBtnCenter.classList.add('hidden');
                    console.log('[DEBUG] Center button hidden during onboarding');
                });
                
                // Add debugging for button state
                console.log('[DEBUG] Center button details:', {
                    id: onboardingBtnCenter.id,
                    className: onboardingBtnCenter.className,
                    style: onboardingBtnCenter.style.cssText,
                    visible: onboardingBtnCenter.offsetParent !== null,
                    clickable: onboardingBtnCenter.style.pointerEvents !== 'none'
                });
            } else {
                console.warn('[DEBUG] Center button not found!');
            }
            
            // Next button functionality
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('next-btn')) {
                    if (currentOnboardingStep < totalOnboardingSteps) {
                        currentOnboardingStep++;
                        showOnboardingStep(currentOnboardingStep);
                    }
                }
            });
            
            // Previous button functionality
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('prev-btn')) {
                    if (currentOnboardingStep > 1) {
                        currentOnboardingStep--;
                        showOnboardingStep(currentOnboardingStep);
                    }
                }
            });
            

            
            // Scenario card functionality
            document.addEventListener('click', (e) => {
                if (e.target.closest('.scenario-card')) {
                    const card = e.target.closest('.scenario-card');
                    const example = card.getAttribute('data-example');
                    if (example) {
                        const input = document.getElementById('requirementInput');
                        if (input) {
                            input.value = example;
                            input.focus();
                            input.dispatchEvent(new Event('input'));
                        }
                        onboardingModal.style.display = 'none';
                        isOnboardingActive = false;
                        tutorialButtonState.setOnboardingActive(false);
                        // Show the center button again when onboarding is closed
                        const centerBtn = document.getElementById('onboardingBtnCenter');
                        if (centerBtn) {
                            centerBtn.classList.remove('hidden');
                            console.log('[DEBUG] Center button shown after onboarding closed');
                        }
                    }
                }
            });
            
            // Finish button functionality
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('finish-btn')) {
                    onboardingModal.style.display = 'none';
                    isOnboardingActive = false;
                    tutorialButtonState.setOnboardingActive(false);
                    // Show the center button again when onboarding is closed
                    const centerBtn = document.getElementById('onboardingBtnCenter');
                    if (centerBtn) {
                        centerBtn.classList.remove('hidden');
                        console.log('[DEBUG] Center button shown after onboarding finished');
                    }
                    vscode.postMessage({ command: 'onboardingComplete' });
                }
            });
            
            // Skip button functionality
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('skip-btn')) {
                    onboardingModal.style.display = 'none';
                    isOnboardingActive = false;
                    tutorialButtonState.setOnboardingActive(false);
                    // Show the center button again when onboarding is closed
                    const centerBtn = document.getElementById('onboardingBtnCenter');
                    if (centerBtn) {
                        centerBtn.classList.remove('hidden');
                        console.log('[DEBUG] Center button shown after onboarding skipped');
                    }
                    vscode.postMessage({ command: 'onboardingSkip' });
                }
            });
            
            // Close button functionality
            document.addEventListener('click', (e) => {
                if (e.target.id === 'onboardingCloseBtn') {
                    onboardingModal.style.display = 'none';
                    isOnboardingActive = false;
                    tutorialButtonState.setOnboardingActive(false);
                    // Show the center button again when onboarding is closed
                    const centerBtn = document.getElementById('onboardingBtnCenter');
                    if (centerBtn) {
                        centerBtn.classList.remove('hidden');
                        console.log('[DEBUG] Center button shown after onboarding closed');
                    }
                }
            });
            

            

            
            // Empty state functionality
            const emptyState = document.getElementById('emptyState');
            const startExampleBtn = document.getElementById('startExampleBtn');
            
            // === REACTIVE STATE MANAGEMENT ===
            // Lightweight reactive state for tutorial button visibility
            
            class TutorialButtonStateManager {
                constructor() {
                    this.state = {
                        hasSvg: false,
                        isOnboardingActive: false
                    };
                    this.listeners = [];
                }
                
                // Subscribe to state changes
                subscribe(listener) {
                    this.listeners.push(listener);
                    return () => {
                        const index = this.listeners.indexOf(listener);
                        if (index > -1) this.listeners.splice(index, 1);
                    };
                }
                
                // Update state and notify listeners
                updateState(updates) {
                    const oldState = { ...this.state };
                    this.state = { ...this.state, ...updates };
                    
                    // Only notify if state actually changed
                    if (JSON.stringify(oldState) !== JSON.stringify(this.state)) {
                        console.log('[REACTIVE] State changed:', {
                            from: oldState,
                            to: this.state,
                            buttonVisible: this.shouldShowButton()
                        });
                        
                        this.listeners.forEach(listener => listener(this.state, oldState));
                    }
                }
                
                // Computed property: should button be visible?
                shouldShowButton() {
                    return !this.state.hasSvg && !this.state.isOnboardingActive;
                }
                
                // Public methods
                setSvgContent(hasSvg) {
                    this.updateState({ hasSvg });
                }
                
                setOnboardingActive(isActive) {
                    this.updateState({ isOnboardingActive: isActive });
                }
                
                // Initialize with current DOM state
                initialize() {
                const svgPreview = document.getElementById('svgPreview');
                    const hasRealDiagram = svgPreview ? this.hasRealDiagram(svgPreview) : false;
                    
                    this.updateState({ 
                        hasSvg: hasRealDiagram, 
                        isOnboardingActive: false 
                    });
                    
                    // Set up DOM observer
                    this.observeDOM();
                }
                
                // Observe DOM changes and update state
                observeDOM() {
                    const svgPreview = document.getElementById('svgPreview');
                    if (svgPreview) {
                        const observer = new MutationObserver(() => {
                            const hasRealDiagram = this.hasRealDiagram(svgPreview);
                            this.setSvgContent(hasRealDiagram);
                        });
                        
                        observer.observe(svgPreview, {
                            childList: true,
                            subtree: true
                        });
                    }
                }
                
                // Advanced detection: Check if there's a real PlantUML diagram
                hasRealDiagram(svgPreview) {
                    const svgElement = svgPreview.querySelector('svg');
                    if (!svgElement) {
                        console.log('[REACTIVE] No SVG element found');
                        return false;
                    }
                    
                    const svgContent = svgElement.outerHTML;
                    
                    // Check for error/setup SVGs (these are NOT real diagrams)
                    const errorIndicators = [
                        'PlantUML Setup Required',
                        'Java Required',
                        'Error:',
                        'No content',
                        'Failed to load diagram',
                        'No diagram content available',
                        'Invalid diagram format'
                    ];
                    
                    for (const indicator of errorIndicators) {
                        if (svgContent.includes(indicator)) {
                            console.log('[REACTIVE] Found error/setup SVG, not a real diagram:', indicator);
                            return false;
                        }
                    }
                    
                    // Check for empty or minimal SVGs
                    const isEmpty = svgContent.includes('<!-- No content -->') || 
                                  svgContent.includes('<!-- Error:') ||
                                  svgContent.length < 200; // Very small SVGs are likely empty
                    
                    if (isEmpty) {
                        console.log('[REACTIVE] Found empty/minimal SVG, not a real diagram');
                        return false;
                    }
                    
                    // Check for real PlantUML diagram indicators
                    const realDiagramIndicators = [
                        '<rect',     // PlantUML generates rectangles for classes, activities, etc.
                        '<path',     // PlantUML generates paths for arrows, connections
                        '<line',     // PlantUML generates lines for connections
                        '<ellipse',  // PlantUML generates ellipses for use cases, states
                        '<polygon',  // PlantUML generates polygons for various shapes
                        'class=',    // PlantUML adds CSS classes to elements
                        'stroke=',   // PlantUML adds stroke attributes
                        'fill='      // PlantUML adds fill attributes
                    ];
                    
                    let indicatorCount = 0;
                    for (const indicator of realDiagramIndicators) {
                        if (svgContent.includes(indicator)) {
                            indicatorCount++;
                        }
                    }
                    
                    // Need at least 3 indicators to be considered a real diagram
                    const isRealDiagram = indicatorCount >= 3;
                    
                    console.log('[REACTIVE] Diagram analysis:', {
                        hasBasicSvg: !!svgElement,
                        svgLength: svgContent.length,
                        indicatorCount: indicatorCount,
                        isRealDiagram: isRealDiagram,
                        svgPreview: svgContent.substring(0, 300) + '...'
                    });
                    
                    return isRealDiagram;
                }
                
                // Update button visibility in DOM
                updateButtonVisibility() {
                    const tutorialBtn = document.getElementById('onboardingBtn');
                    const tutorialBtnCenter = document.getElementById('onboardingBtnCenter');
                    const shouldShow = this.shouldShowButton();
                    
                    // Always show chat area tutorial button
                    if (tutorialBtn) {
                        tutorialBtn.classList.remove('hidden');
                    }
                    
                    // Show/hide center button based on state
                    if (tutorialBtnCenter) {
                        if (shouldShow) {
                            tutorialBtnCenter.classList.remove('hidden');
                            console.log('[REACTIVE] ✅ Showing center tutorial button');
                } else {
                            tutorialBtnCenter.classList.add('hidden');
                            console.log('[REACTIVE] ❌ Hiding center tutorial button');
                        }
                    } else {
                        console.warn('[REACTIVE] ⚠️ Center button not found in DOM');
                    }
                    
                    // Hide empty state display
                    if (emptyState) {
                    emptyState.style.display = 'none';
                    }
                }
            }
            
            // Initialize reactive state manager
            const tutorialButtonState = new TutorialButtonStateManager();
            
            // Subscribe to state changes and update DOM
            tutorialButtonState.subscribe(() => {
                tutorialButtonState.updateButtonVisibility();
            });
            
            // Start example button
            if (startExampleBtn) {
                startExampleBtn.addEventListener('click', () => {
                    const example = '请画一个用户注册流程的活动图';
                    const input = document.getElementById('requirementInput');
                    if (input) {
                        input.value = example;
                        input.focus();
                        input.dispatchEvent(new Event('input'));
                    }
                });
            }
            
            // Initialize reactive state management
            document.addEventListener('DOMContentLoaded', () => {
                console.log('[REACTIVE] DOM fully loaded, initializing state manager');
                const centerBtn = document.getElementById('onboardingBtnCenter');
                console.log('[REACTIVE] Center button found on DOMContentLoaded:', !!centerBtn);
                if (centerBtn) {
                    console.log('[REACTIVE] Center button classes:', centerBtn.className);
                }
                tutorialButtonState.initialize();
            });
            
            // Also initialize after short delays to ensure everything is ready
            setTimeout(() => {
                console.log('[REACTIVE] 100ms timeout initialization');
                tutorialButtonState.initialize();
            }, 100);
            setTimeout(() => {
                console.log('[REACTIVE] 500ms timeout initialization');
                tutorialButtonState.initialize();
            }, 500);
            setTimeout(() => {
                console.log('[REACTIVE] 1000ms timeout initialization');
                tutorialButtonState.initialize();
            }, 1000);

            // Listen for messages from extension
            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case 'showOnboarding':
                        onboardingModal.style.display = 'block';
                        currentOnboardingStep = 1;
                        showOnboardingStep(currentOnboardingStep);
                        isOnboardingActive = true;
                        tutorialButtonState.setOnboardingActive(true);
                        break;

                    case 'fillExample':
                        if (message.example) {
                            const input = document.getElementById('requirementInput');
                            if (input) {
                                input.value = message.example;
                                input.focus();
                                input.dispatchEvent(new Event('input'));
                            }
                        }
                        break;
                }
            });


        `;
    }
}
