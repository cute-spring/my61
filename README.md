# Copilot-Powered Productivity VS Code Extension

A modular, extensible productivity extension for VS Code, powered by Copilot/LLM APIs. Includes tools for Email Refinement, English/Chinese Translation, and Jira Description Refinement.

## Features

### Core Productivity Tools

- **🎯 Refine Email**: Select email text, get a professional rewrite and subject suggestions. Diff/split view, quick pick for subject lines, accept/refine/copy options.
- **🌏 Translate Text**: English ↔ Chinese (Simplified/Traditional, auto-detect). Popup/quick pick for output, configurable default, copy/replace/insert options.
- **📋 Refine Jira**: Select Jira description, get a structured, concise version. Side-by-side diff, accept/refine/copy options.
- **📊 Preview UML**: Generate PlantUML diagrams from selected text with live preview.
- **🤖 UML Designer**: AI-powered, chat-driven tool for creating and refining UML diagrams through natural language conversation.

### Additional Features

- **Settings Management**: Configure API key, translation defaults, feature toggles, and PlantUML settings.
- **Usage Analytics**: Track feature usage with privacy-focused local analytics and optional export.
- **Extensible Framework**: Add new tools by implementing a simple interface and registering with ToolManager.

## UML Chat Designer

The UML Chat Designer is an AI-powered, chat-driven tool for generating and refining UML diagrams directly in VS Code. Describe your requirements in natural language, and the tool will generate PlantUML code and a live diagram preview. Supports iterative design, diagram type selection, chat history, and more.

### Prerequisites

For full diagram rendering functionality, you'll need:
- **Java Runtime Environment** (JRE 8 or higher)
- **PlantUML JAR file** or the PlantUML VS Code extension

See [PLANTUML_SETUP.md](PLANTUML_SETUP.md) for detailed setup instructions.

**Note**: Even without PlantUML setup, you can still chat about UML concepts and generate PlantUML code - you just won't see visual diagrams until setup is complete.

### Layout Engine Configuration

The extension **automatically detects and configures** the best available PlantUML layout engine on first run, providing a seamless out-of-the-box experience:

#### **🤖 Automatic Configuration**
- **DOT Engine Detection**: Automatically searches for and validates Graphviz/DOT installations
- **Execution Validation**: Tests actual diagram processing capability, not just file existence
- **Enterprise-Ready**: Handles security restrictions and permission issues gracefully
- **Smart Fallback**: Falls back to Smetana (pure Java) when DOT is unavailable or blocked
- **Zero Configuration**: Works immediately without manual setup
- **Preserve User Settings**: Respects existing manual configurations

#### **🎯 Layout Engines**
- **DOT Engine** (preferred): Uses Graphviz/DOT for high-quality diagram layout. Auto-detected if available.
- **Smetana Engine** (fallback): Pure Java layout engine that doesn't require Graphviz. Works out-of-the-box but may have layout limitations for complex diagrams.

#### **🔍 Intelligent DOT Auto-Detection**
When auto-configuring the DOT engine, the extension automatically searches for Graphviz installations in common locations:
- **Windows**: Program Files, Chocolatey, Scoop, Registry
- **macOS**: Homebrew, MacPorts, standard directories
- **Linux**: System packages, Snap, Flatpak, user installations

#### **⚙️ Manual Override**
While auto-detection handles most cases, you can still manually configure:
1. Press `Ctrl+Alt+P` or run `Configure PlantUML (Manual Override)`
2. Choose between auto-detection, manual configuration, or reset to auto-detection
3. For manual mode: Select layout engine and custom paths
4. Test your configuration with the UML Chat Designer

#### **📊 Status Visibility**
- **Status Bar Indicator**: Always visible in VS Code status bar (left side)
- **Real-time Verification**: Shows the actual engine being used, not just configured
- **Auto-fallback Detection**: Warns when DOT is configured but Smetana is actually used
- **Color Coding**: Green for Smetana, Blue for DOT

#### **⚙️ Manual Settings**
You can also configure these settings manually in VS Code settings:
- `plantuml.layoutEngine`: Choose between "dot" and "smetana"
- `plantuml.dotPath`: Custom path to dot.exe (only used with DOT engine)
- `plantuml.showStatusBar`: Show/hide the status bar indicator

### How to Use

1. **Start a New Design**
   - Open the UML Chat Designer from the VS Code command palette or sidebar.
   - In the left panel, type your system/process description or requirement in natural language.

2. **Select Diagram Type (Optional)**
   - Use the “Diagram Type” dropdown to specify the UML diagram you want (e.g., Class Diagram).
   - Leave it as “Auto-detect” if you’re unsure; the tool will choose the best type.

3. **Send Your Requirement**
   - Click “Send” or press Enter.
   - The Copilot LLM will reply with an explanation, the detected diagram type, and the PlantUML code.

4. **View and Interact with the Diagram**
   - The right panel displays the generated UML diagram as SVG.
   - Use the zoom controls (+, −, ⌂) or keyboard shortcuts (Ctrl+Plus/Minus/0) to zoom and reset.
   - Pan the diagram by dragging or using scrollbars if zoomed in.

5. **Iterate and Refine**
   - Edit any previous user message by clicking the ✏️ button, then resend to update the diagram.
   - Click on any bot message to preview the corresponding diagram version.

6. **Save and Load Sessions**
   - Save the chat session for future editing or collaboration.
   - Import a previous session to continue work.

7. **Session Management**
   - Use “Clear Chat” to start over.
   - Use “Import” to load a previous session or “Save” to archive your current work.

**Best Practices:**
- Be as clear and specific as possible in your requirements for best results.
- Use the diagram type selector if you want a specific UML view.
- Use the chat history to track changes and rationale for each diagram version.


### Example Scenarios

#### 1. Explain a Complex IT Concept
> **User:**
> Explain the concept of microservices architecture and show a class diagram for a simple e-commerce system using microservices.
>
> **AI Designer:**
> _[Explains microservices, then generates a class diagram with services like OrderService, ProductService, UserService, etc.]_

#### 2. Describe a Workflow (e.g., Production Support Process)
> **User:**
> Show a sequence diagram for a typical production support incident workflow, from user ticket creation to resolution.
>
> **AI Designer:**
> _[Explains the workflow, then generates a sequence diagram showing User → Helpdesk → Support Engineer → Resolution steps.]_

#### 3. Iterative System Enhancement Design (Multi-Round Chat)
> **User:**
> Design a use case diagram for a library management system.
>
> **AI Designer:**
> _[Explains and generates a use case diagram with actors: Librarian, Member, System; use cases: Borrow Book, Return Book, etc.]_
>
> **User:**
> Add an online reservation feature for members.
>
> **AI Designer:**
> _[Updates the diagram and explanation to include 'Reserve Book Online' use case for Member.]_
>
> **User:**
> Now show the sequence diagram for the online reservation process.
>
> **AI Designer:**
> _[Generates a sequence diagram showing Member → System → Book Inventory interactions for reservation.]_

## Requirements

- Requires a Copilot/LLM API key (set in extension settings).
- Internet connection for LLM-powered features.

## Extension Settings

This extension contributes the following settings:

**General Settings:**
- `copilotTools.apiKey`: API key for Copilot/LLM
- `copilotTools.translation.defaultChinese`: Default Chinese output (Simplified/Traditional)
- `copilotTools.features.emailRefine`: Enable/disable Email Refine tool
- `copilotTools.features.translate`: Enable/disable Translate tool
- `copilotTools.features.jiraRefine`: Enable/disable Jira Refine tool

**PlantUML Settings:**
- `plantuml.jarPath`: Optional path to PlantUML JAR file (auto-download if not set)
- `plantuml.layoutEngine`: Layout engine for diagrams ("dot" or "smetana")
- `plantuml.dotPath`: Optional path to DOT executable (for DOT engine only)

## Usage

### Main Commands

1. **Select text** in the editor
2. **Open Command Palette** (`⇧⌘P`) and run one of the core commands:
   - `Refine Email (with Subject Suggestions)`
   - `Translate Text (English <-> Chinese)`
   - `Refine Jira Issue Description`
   - `Preview PlantUML Diagram`
   - `UML Chat Designer (AI-powered)`
3. **Or use hotkeys** (Ctrl+Alt+E, T, J, U, P) or right-click context menu
4. **Follow UI prompts** to review, accept, or further refine results

### Additional Commands

Access these through the Command Palette for configuration and management:
- `Copilot Tools: Open Settings` - Configure extension settings
- `Configure PlantUML Layout Engine and DOT Path` - Set up diagram rendering
- `Show Usage Analytics Dashboard` - View feature usage statistics

## Privacy

- Only user-selected text is sent to LLM APIs. No other data is transmitted.
- See privacy note in settings.

## Known Issues

- Mixed-language translation may yield variable results.
- LLM/API failures show fallback messages.

## Release Notes

See `CHANGELOG.md` for details.

---
