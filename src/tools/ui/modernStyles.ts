// Modern UI styles for enhanced tool interfaces
export const getModernStyles = () => `
  <style>
    /* CSS Custom Properties for consistent theming */
    :root {
      --radius-sm: 4px;
      --radius-md: 8px;
      --radius-lg: 12px;
      --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
      --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
      --spacing-xs: 4px;
      --spacing-sm: 8px;
      --spacing-md: 16px;
      --spacing-lg: 24px;
      --spacing-xl: 32px;
    }

    /* Modern Typography Scale */
    .text-xs { font-size: 0.75rem; line-height: 1rem; }
    .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
    .text-base { font-size: 1rem; line-height: 1.5rem; }
    .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
    .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
    .text-2xl { font-size: 1.5rem; line-height: 2rem; }

    /* Enhanced Container Layouts */
    .tool-container {
      max-width: 900px;
      margin: var(--spacing-xl) auto;
      background: var(--vscode-panel-background);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      overflow: hidden;
      border: 1px solid var(--vscode-panel-border);
    }

    .tool-header {
      background: linear-gradient(135deg, 
        var(--vscode-textLink-foreground) 0%, 
        var(--vscode-button-background) 100%);
      color: white;
      padding: var(--spacing-lg) var(--spacing-xl);
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .tool-header-icon {
      font-size: 1.5rem;
      opacity: 0.9;
    }

    .tool-content {
      padding: var(--spacing-xl);
    }

    /* Card-based Sections */
    .section-card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: var(--radius-md);
      padding: var(--spacing-lg);
      margin-bottom: var(--spacing-lg);
      transition: all 0.2s ease;
    }

    .section-card:hover {
      box-shadow: var(--shadow-md);
      border-color: var(--vscode-textLink-foreground);
    }

    /* Enhanced Form Controls */
    .form-group {
      margin-bottom: var(--spacing-lg);
    }

    .form-label {
      display: block;
      font-size: var(--text-sm);
      font-weight: 600;
      color: var(--vscode-foreground);
      margin-bottom: var(--spacing-xs);
    }

    .form-input, .form-textarea {
      width: 100%;
      padding: var(--spacing-md);
      border: 2px solid var(--vscode-input-border);
      border-radius: var(--radius-md);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-size: 1rem;
      transition: all 0.2s ease;
      resize: vertical;
    }

    .form-input:focus, .form-textarea:focus {
      outline: none;
      border-color: var(--vscode-textLink-foreground);
      box-shadow: 0 0 0 3px rgba(30, 144, 255, 0.1);
    }

    /* Modern Button System */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-sm) var(--spacing-md);
      border: none;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      position: relative;
      overflow: hidden;
    }

    .btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: left 0.5s;
    }

    .btn:hover::before {
      left: 100%;
    }

    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }

    .btn-secondary {
      background: var(--vscode-input-background);
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-input-border);
    }

    .btn-secondary:hover {
      background: var(--vscode-list-hoverBackground);
      border-color: var(--vscode-textLink-foreground);
    }

    .btn-sm {
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: 0.75rem;
    }

    .btn-lg {
      padding: var(--spacing-md) var(--spacing-lg);
      font-size: 1rem;
    }

    /* Loading States */
    .loading {
      position: relative;
      pointer-events: none;
      opacity: 0.6;
    }

    .loading::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 16px;
      height: 16px;
      margin: -8px 0 0 -8px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Enhanced Content Areas */
    .content-compare {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-lg);
      margin: var(--spacing-lg) 0;
    }

    @media (max-width: 768px) {
      .content-compare {
        grid-template-columns: 1fr;
      }
    }

    .content-original, .content-refined {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: var(--radius-md);
      padding: var(--spacing-lg);
    }

    .content-refined {
      border-left: 4px solid var(--vscode-textLink-foreground);
      background: var(--vscode-inputValidation-infoBackground);
    }

    /* Interactive Elements */
    .suggestion-chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-sm);
      margin: var(--spacing-md) 0;
    }

    .chip {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }

    .chip:hover {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      transform: translateY(-1px);
    }

    /* Status Indicators */
    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-size: 0.75rem;
      font-weight: 500;
    }

    .status-success { color: var(--vscode-testing-iconPassed); }
    .status-warning { color: var(--vscode-testing-iconQueued); }
    .status-error { color: var(--vscode-testing-iconFailed); }

    /* Collapsible Sections */
    .collapsible {
      border: 1px solid var(--vscode-input-border);
      border-radius: var(--radius-md);
      overflow: hidden;
      margin-bottom: var(--spacing-md);
    }

    .collapsible-header {
      background: var(--vscode-list-hoverBackground);
      padding: var(--spacing-md);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: background 0.2s ease;
    }

    .collapsible-header:hover {
      background: var(--vscode-list-activeSelectionBackground);
    }

    .collapsible-content {
      padding: var(--spacing-lg);
      border-top: 1px solid var(--vscode-input-border);
    }

    /* Animations */
    .fade-in {
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .slide-in {
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from { transform: translateX(-20px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  </style>
`;
