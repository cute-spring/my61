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
- **UI Fixes**:
    - Fixed zoom controls by refactoring event handling to use `svg-pan-zoom` library reliably.
    - Corrected display issues with the "Expand" and "More Actions" button icons by embedding SVGs directly and adjusting CSS.

### Windows Compatibility Improvements
- **Cross-Platform File Paths**: Enhanced file path handling using `path.join()` for Windows compatibility
- **Windows Font Rendering**: Added Windows-specific font smoothing and text rendering optimizations
- **High-DPI Display Support**: Implemented proper scaling and rendering for Windows high-DPI displays

### UI/UX Improvements
- **Fixed Button Icons**: Resolved issue where expand button and "more actions" (three dots) button were not displaying their SVG icons
  - Added proper SVG sizing with explicit width/height attributes
  - Enhanced CSS styling with `!important` rules to ensure icon visibility
  - Fixed icon-only button styling with consistent padding and sizing
  - Implemented proper icon switching for expand/collapse states
- **Enhanced Zoom Functionality**: Completely refactored zoom controls for better reliability
  - Fixed zoom in/out/reset buttons that were not working correctly
  - Ensured svg-pan-zoom library is always prioritized when available
  - Improved fallback zoom logic for when svg-pan-zoom is not loaded
  - Eliminated duplicate event listeners and conflicting zoom handlers
  - Added proper error handling and debugging for zoom operations
- **Enhanced Event Handling**: Improved drag and drop with Windows-compatible touch events and better event prevention
- **SVG Rendering Fixes**: Added Windows-specific SVG rendering properties for crisp edges and proper display
- **Memory Management**: Enhanced cleanup and garbage collection hints to prevent memory leaks on Windows
- **Keyboard Shortcuts**: Added Windows keyboard shortcuts (Ctrl+Plus/Minus/0 for zoom controls)
- **Touch Device Support**: Implemented touch event handling for Windows touch-enabled devices
- **Performance Optimizations**: Increased rendering timeouts and added hardware acceleration hints for Windows
- **Enhanced Debugging**: Added Windows platform detection and comprehensive debugging for troubleshooting

### Technical Improvements
- Enhanced user message editing with inline textarea and styled action buttons
- Added debounced SVG rendering for better performance
- Improved error handling and user feedback with fallback mechanisms
- Better chat history management and session import/export
- Cross-platform zoom controls that work reliably across different operating systems
- Multiple event listener strategies for maximum compatibility
- Proper cleanup on page unload to prevent resource leaks
- Visual feedback for button interactions on all platforms

### Bug Fixes
- Fixed zoom button functionality on Windows systems
- Resolved SVG blurriness issues on high-DPI Windows displays
- Improved dragbar resize functionality with proper event handling
- Enhanced scrollbar styling for Windows systems
- Fixed memory leaks during SVG content updates

- Initial release