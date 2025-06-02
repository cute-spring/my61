<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

This is a VS Code extension project. Please use the get_vscode_api with a query as input to fetch the latest VS Code API references.

- The extension implements a modular tool framework: each tool (Email Refine, Translate, Jira Refine) is a class implementing a common interface and registered with a ToolManager.
- Commands: copilotTools.refineEmail, copilotTools.translateText, copilotTools.refineJira.
- UI: diff/split view, quick pick, popups, settings page, error handling, privacy note.
- Extensible for new tools.
