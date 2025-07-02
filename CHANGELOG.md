# Change Log

All notable changes to the "nondevtaskkiller" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.1] - 2025-07-02

### 🎉 Major UML Chat Panel Refactoring & Enhancement

#### ✅ **Complete Modular Refactoring**
- **Broke down monolithic architecture** into focused, maintainable modules:
  - `src/tools/uml/types.ts` - Type definitions and interfaces
  - `src/tools/uml/constants.ts` - Constants and configuration
  - `src/tools/uml/generator.ts` - UML diagram generation logic
  - `src/tools/uml/renderer.ts` - SVG rendering and processing
  - `src/tools/chat/chatManager.ts` - Chat message management
  - `src/tools/utils/helpers.ts` - Utility functions
  - `src/tools/ui/webviewHtmlGenerator.ts` - HTML/CSS/JS generation
  - `src/tools/umlChatPanelRefactored.ts` - Main orchestrator

#### 🔧 **Fixed Critical Zoom Control Issues**
- **Resolved broken zoom functionality** that was causing runtime errors
- **Implemented robust error handling** for svg-pan-zoom library
- **Added fallback manual CSS zoom** when svg-pan-zoom fails
- **Prevented duplicate event listeners** and button cloning issues
- **Added comprehensive debug logging** for troubleshooting
- **Improved SVG validation** with fallback dimensions and viewBox

#### 🚀 **Restored Automatic PlantUML JAR Download**
- **Automatic download functionality** with real-time progress indication
- **Visual progress notifications** showing percentage and file size
- **Smart error handling** with helpful setup instructions
- **Cross-platform compatibility** for macOS, Windows, and Linux
- **Robust download retry** and fallback mechanisms
- **VS Code global storage integration** for proper file management

#### 🖥️ **Enhanced Windows Compatibility**
- **Cross-platform file operations** using proper Node.js APIs
- **Windows-specific troubleshooting** documentation
- **Antivirus and firewall considerations** addressed
- **PowerShell and Command Prompt** test scripts provided
- **Windows PATH and Java detection** improvements

#### 📚 **Comprehensive Documentation**
- **Complete setup guide** (`PLANTUML_SETUP.md`) with automatic download instructions
- **Cross-platform test scripts** for verifying functionality:
  - `test-plantuml-download.sh` (macOS/Linux)
  - `test-plantuml-download.bat` (Windows CMD)
  - `test-plantuml-download.ps1` (Windows PowerShell)
- **Detailed troubleshooting** for all platforms
- **Step-by-step testing instructions** for developers

#### 🛠️ **Build & Package Improvements**
- **Fixed all packaging warnings** by adding proper LICENSE file
- **Added `"license": "MIT"`** to package.json
- **Optimized activation events** for better VS Code performance
- **Excluded minified third-party files** from ESLint checks
- **Clean builds without warnings** for production deployment

#### 🎯 **Enhanced User Experience**
- **Zero-friction setup** for new users with automatic download
- **Clear error messages** with actionable guidance
- **Graceful degradation** when dependencies are missing
- **Better progress feedback** during first-time setup
- **Professional UI** with reliable controls

#### 🧪 **Testing & Validation**
- **All TypeScript compilation** passes without errors
- **ESLint checks** pass with proper exclusions
- **Extension packages** cleanly without warnings
- **Unit tests** pass successfully
- **Manual testing** confirms all functionality works
- **Cross-platform testing** verified on macOS and Windows compatibility

### 🔧 **Technical Debt Resolved**
- **Monolithic code** → **Modular architecture**
- **Broken zoom controls** → **Reliable zoom functionality**
- **Missing auto-download** → **Seamless automatic setup**
- **Build warnings** → **Clean production builds**
- **Poor error handling** → **Comprehensive error management**
- **Limited documentation** → **Complete user guides**

### 📦 **Files Added/Modified**
- ✅ Complete UML Chat Panel refactoring (8+ new modular files)
- ✅ Automatic PlantUML downloader with progress indication
- ✅ Cross-platform test scripts (3 different platforms)
- ✅ Comprehensive setup and troubleshooting documentation
- ✅ Enhanced build configuration and packaging
- ✅ LICENSE file and proper package metadata

---

## [Previous Releases]

### Initial UML Chat Panel & Tool Framework
- Initial release of the extension with Email Refine, Translate, and Jira Refine tools.
- Added code annotation feature.
- Refactored the codebase for better readability and maintainability.
- Added a setting to control the scope of code annotation.
- Added a command to clear annotations.
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