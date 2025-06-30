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
- **Windows SVG Rendering Fix**: Fixed diagram stretching and deformation issues on Windows when rendering diagrams directly from LLM chat
  - Preserved SVG aspect ratio by using `preserveAspectRatio="xMidYMid meet"`
  - Updated CSS to prevent forced width/height that caused distortion
  - Enhanced SVG post-processing for better Windows compatibility
  - Added debugging output to help diagnose rendering issues
  - Fixed both svg-pan-zoom and fallback rendering modes
- **Zoom Display Area Fix**: Fixed issue where zoomed diagrams were clipped and couldn't be fully viewed
  - Removed flex centering that prevented scrolling of zoomed content
  - Added proper scrolling support with smooth scroll behavior
  - Enhanced container padding to prevent edge clipping
  - Improved scrollbar styling for better Windows compatibility
  - Added auto-centering for zoom operations with fallback controls
  - Fixed both svg-pan-zoom and manual zoom fallback modes to support full content visibility
- **Maximum Display Area Utilization**: Enhanced diagram display to use the full available space
  - Removed restrictive borders, padding, and decorative elements that limited diagram size
  - Updated SVG sizing to use 100% of container width/height while preserving aspect ratio
  - Enhanced aspect ratio calculation for optimal space utilization
  - Configured both svg-pan-zoom and fallback modes for maximum space usage
  - Added intelligent sizing based on SVG dimensions and container aspect ratio
  - Removed container constraints that were preventing full-screen diagram display
- **LLM-Driven Type Classification**: Replaced regex-based detection with LLM-provided diagram types for higher accuracy
- **Code Cleanup**: Removed complex fallback detection logic (~60 lines) in favor of forced LLM compliance
- **Improved Prompts**: Enhanced LLM prompts to force diagram type specification with strict format requirements
- **Better UX**: Auto-detection mode now shows accurate diagram types (e.g., "[Auto-detected: Component Diagram]")
- **Streamlined Architecture**: Simplified codebase with more reliable diagram classification workflow

### Windows Compatibility Improvements
- **Cross-Platform File Paths**: Enhanced file path handling using `path.join()` for Windows compatibility
- **Windows Font Rendering**: Added Windows-specific font smoothing and text rendering optimizations
- **High-DPI Display Support**: Implemented proper scaling and rendering for Windows high-DPI displays
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