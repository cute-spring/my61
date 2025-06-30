# Change Log

All notable changes to the "nondevtaskkiller" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.1]

- Initial release of the extension with Email Refine, Translate, and Jira Refine tools.
- Added code annotation feature.
- Refactored the codebase for better readability and maintainability.
- Added a setting to control the scope of code annotation.
- Added a command to clear annotations.

## [Unreleased]

### UML Chat Panel Enhancements
- **Enhanced UI Controls**: Improved Edit, Resend, and Cancel buttons for user messages with professional styling and better positioning
- **Custom Zoom Controls**: Added reliable zoom controls (Zoom In, Zoom Out, Reset) for SVG diagrams with cross-platform compatibility
- **Diagram Type Detection**: Implemented intelligent diagram type detection and display in bot replies
- **LLM-Driven Type Classification**: Replaced regex-based detection with LLM-provided diagram types for higher accuracy
- **Code Cleanup**: Removed complex fallback detection logic (~60 lines) in favor of forced LLM compliance
- **Improved Prompts**: Enhanced LLM prompts to force diagram type specification with strict format requirements
- **Better UX**: Auto-detection mode now shows accurate diagram types (e.g., "[Auto-detected: Component Diagram]")
- **Streamlined Architecture**: Simplified codebase with more reliable diagram classification workflow

### Technical Improvements
- Enhanced user message editing with inline textarea and styled action buttons
- Added debounced SVG rendering for better performance
- Improved error handling and user feedback
- Better chat history management and session import/export
- Cross-platform zoom controls that work reliably across different operating systems

- Initial release