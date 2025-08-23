// Interactive components for enhanced user experience
export const getInteractiveComponents = () => `
  <script>
    // Enhanced clipboard functionality with feedback
    async function copyWithFeedback(text, button) {
      try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success');
        
        // Visual feedback on button
        const originalText = button.textContent;
        button.textContent = '✓ Copied';
        button.classList.add('btn-success');
        
        setTimeout(() => {
          button.textContent = originalText;
          button.classList.remove('btn-success');
        }, 2000);
      } catch (err) {
        showToast('Failed to copy', 'error');
      }
    }

    // Toast notification system
    function showToast(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = \`toast toast-\${type}\`;
      toast.textContent = message;
      
      const toastContainer = getOrCreateToastContainer();
      toastContainer.appendChild(toast);
      
      // Animate in
      setTimeout(() => toast.classList.add('toast-show'), 100);
      
      // Auto remove
      setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }

    function getOrCreateToastContainer() {
      let container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
      }
      return container;
    }

    // Progress indicator for async operations
    function showProgress(element, message = 'Processing...') {
      element.classList.add('loading');
      element.dataset.originalText = element.textContent;
      element.textContent = message;
      element.disabled = true;
    }

    function hideProgress(element) {
      element.classList.remove('loading');
      element.textContent = element.dataset.originalText || element.textContent;
      element.disabled = false;
    }

    // Auto-resize textarea
    function autoResize(textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }

    // Word count and character limit
    function setupWordCount(textarea, countElement, limit = null) {
      function updateCount() {
        const text = textarea.value;
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        const chars = text.length;
        
        let display = \`\${words} words, \${chars} characters\`;
        if (limit) {
          display += \` (limit: \${limit})\`;
          if (chars > limit) {
            countElement.classList.add('text-error');
          } else {
            countElement.classList.remove('text-error');
          }
        }
        
        countElement.textContent = display;
      }
      
      textarea.addEventListener('input', updateCount);
      updateCount();
    }

    // Collapsible sections
    function toggleCollapsible(header) {
      const content = header.nextElementSibling;
      const icon = header.querySelector('.collapse-icon');
      
      if (content.style.display === 'none') {
        content.style.display = 'block';
        content.classList.add('fade-in');
        icon.textContent = '▼';
      } else {
        content.style.display = 'none';
        icon.textContent = '▶';
      }
    }

    // Enhanced button interactions
    function setupButtonEffects() {
      document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
          // Ripple effect
          const ripple = document.createElement('span');
          ripple.className = 'ripple';
          this.appendChild(ripple);
          
          const rect = this.getBoundingClientRect();
          const size = Math.max(rect.width, rect.height);
          ripple.style.width = ripple.style.height = size + 'px';
          ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
          ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
          
          setTimeout(() => ripple.remove(), 600);
        });
      });
    }

    // Smart suggestions with type-ahead
    function setupSmartSuggestions(input, suggestions, callback) {
      const dropdown = document.createElement('div');
      dropdown.className = 'suggestions-dropdown';
      input.parentNode.appendChild(dropdown);
      
      input.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        const filtered = suggestions.filter(s => 
          s.toLowerCase().includes(value)
        );
        
        dropdown.innerHTML = '';
        if (filtered.length > 0 && value.length > 0) {
          filtered.slice(0, 5).forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = suggestion;
            item.onclick = () => {
              input.value = suggestion;
              dropdown.innerHTML = '';
              if (callback) callback(suggestion);
            };
            dropdown.appendChild(item);
          });
          dropdown.style.display = 'block';
        } else {
          dropdown.style.display = 'none';
        }
      });
      
      // Hide on click outside
      document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.style.display = 'none';
        }
      });
    }

    // Keyboard shortcuts
    function setupKeyboardShortcuts() {
      document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Enter to submit
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          const submitBtn = document.querySelector('.btn-primary');
          if (submitBtn) submitBtn.click();
        }
        
        // Escape to close modals/dropdowns
        if (e.key === 'Escape') {
          document.querySelectorAll('.suggestions-dropdown').forEach(d => {
            d.style.display = 'none';
          });
        }
      });
    }

    // Initialize all interactive components
    document.addEventListener('DOMContentLoaded', function() {
      setupButtonEffects();
      setupKeyboardShortcuts();
      
      // Auto-resize all textareas
      document.querySelectorAll('textarea').forEach(textarea => {
        textarea.addEventListener('input', () => autoResize(textarea));
        autoResize(textarea);
      });
    });
  </script>

  <style>
    /* Toast notifications */
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .toast {
      background: var(--vscode-notifications-background);
      color: var(--vscode-notifications-foreground);
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border-left: 4px solid var(--vscode-textLink-foreground);
      transform: translateX(100%);
      opacity: 0;
      transition: all 0.3s ease;
      max-width: 300px;
    }

    .toast-show {
      transform: translateX(0);
      opacity: 1;
    }

    .toast-success {
      border-left-color: var(--vscode-testing-iconPassed);
    }

    .toast-error {
      border-left-color: var(--vscode-testing-iconFailed);
    }

    /* Suggestions dropdown */
    .suggestions-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--vscode-dropdown-background);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      display: none;
      max-height: 200px;
      overflow-y: auto;
    }

    .suggestion-item {
      padding: 8px 12px;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .suggestion-item:hover {
      background: var(--vscode-list-hoverBackground);
    }

    /* Ripple effect */
    .ripple {
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      transform: scale(0);
      animation: ripple 0.6s linear;
      pointer-events: none;
    }

    @keyframes ripple {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }

    /* Enhanced form styles */
    .form-group {
      position: relative;
    }

    .char-count {
      position: absolute;
      bottom: -20px;
      right: 0;
      font-size: 0.75rem;
      color: var(--vscode-descriptionForeground);
    }

    .text-error {
      color: var(--vscode-testing-iconFailed);
    }

    /* Collapsible sections */
    .collapse-icon {
      transition: transform 0.2s ease;
      font-family: monospace;
    }

    /* Button success state */
    .btn-success {
      background: var(--vscode-testing-iconPassed) !important;
      color: white !important;
    }

    /* Loading overlay */
    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: inherit;
    }

    /* Enhanced hover states */
    .hover-lift {
      transition: transform 0.2s ease;
    }

    .hover-lift:hover {
      transform: translateY(-2px);
    }

    /* Focus indicators */
    .focus-visible:focus {
      outline: 2px solid var(--vscode-textLink-foreground);
      outline-offset: 2px;
    }
  </style>
`;
