# Copilot-Powered Productivity VS Code Extension

A modular, extensible productivity extension for VS Code, powered by Copilot/LLM APIs. Includes tools for Email Refinement, English/Chinese Translation, and Jira Description Refinement.

## Features

- **Refine Email**: Select email text, get a professional rewrite and subject suggestions. Diff/split view, quick pick for subject lines, accept/refine/copy options.
- **Translate Text**: English <-> Chinese (Simplified/Traditional, auto-detect). Popup/quick pick for output, configurable default, copy/replace/insert options.
- **Refine Jira**: Select Jira description, get a structured, concise version. Side-by-side diff, accept/refine/copy options.
- **Settings Page**: Configure API key, translation default (Simplified/Traditional), enable/disable features, privacy note.
- **Extensible Tool Framework**: Add new tools by implementing a simple interface and registering with ToolManager.

## Requirements

- Requires a Copilot/LLM API key (set in extension settings).
- Internet connection for LLM-powered features.

## Extension Settings

This extension contributes the following settings:

- `copilotTools.apiKey`: API key for Copilot/LLM
- `copilotTools.translation.defaultChinese`: Default Chinese output (Simplified/Traditional)
- `copilotTools.features.emailRefine`: Enable/disable Email Refine tool
- `copilotTools.features.translate`: Enable/disable Translate tool
- `copilotTools.features.jiraRefine`: Enable/disable Jira Refine tool

## Usage

1. Select text in the editor.
2. Open Command Palette (⇧⌘P) and run one of:
   - `Refine Email (with Subject Suggestions)`
   - `Translate Text (English <-> Chinese)`
   - `Refine Jira Issue Description`
3. Or use the context menu or hotkeys (configurable).
4. Follow UI prompts to review, accept, or further refine results.

## Privacy

- Only user-selected text is sent to LLM APIs. No other data is transmitted.
- See privacy note in settings.

## Known Issues

- Mixed-language translation may yield variable results.
- LLM/API failures show fallback messages.

## Release Notes

See `CHANGELOG.md` for details.

---
