# Extension Design Documentation

This folder contains comprehensive PlantUML diagrams that document the architecture and design of the VS Code extension.

## 📊 Diagram Overview

### 1. **extension-architecture.puml** - Overall System Architecture
- **Purpose**: High-level view of the entire extension architecture
- **Contents**: 
  - Core framework with ICopilotTool interface and ToolManager
  - 5 core productivity tools and their relationships
  - Analytics system and configuration components
  - Design patterns implementation (Template, Strategy, Observer)
- **Audience**: Developers, architects, stakeholders

### 2. **extension-dataflow.puml** - Data Flow & User Interactions
- **Purpose**: Sequence diagrams showing how data flows through the system
- **Contents**:
  - User interaction workflows (text selection → AI processing → webview display)
  - UML Chat Designer interactive flows
  - Analytics tracking and dashboard interactions
  - Error handling patterns
- **Audience**: Developers understanding system behavior

### 3. **extension-components.puml** - Component Dependencies
- **Purpose**: Detailed component relationships and module structure
- **Contents**:
  - Module organization and folder structure
  - Dependency graph between components
  - External dependencies (VS Code API, GitHub Copilot, PlantUML)
  - Cross-cutting concerns and configuration flows
- **Audience**: Developers working on specific components

### 4. **extension-analytics.puml** - Analytics System Design
- **Purpose**: Deep dive into the privacy-focused analytics architecture
- **Contents**:
  - Analytics core classes and interfaces
  - Privacy and security features
  - Performance optimization strategies
  - Sync management and data flow
  - Dashboard and export capabilities
- **Audience**: Privacy reviewers, performance engineers

## 🎯 Key Design Principles Illustrated

1. **Modular Architecture**: Each tool implements `ICopilotTool` interface for consistency
2. **Template Pattern**: `BaseTool` provides common workflow logic
3. **Privacy-First Design**: Local storage, user consent, data anonymization
4. **Performance Optimization**: Async operations, batched analytics, debounced rendering
5. **Separation of Concerns**: Clear boundaries between UI, logic, and data layers
6. **Extensibility**: Easy to add new tools via interface implementation

## 🔧 Viewing the Diagrams

### Option 1: VS Code with PlantUML Extension
1. Install the PlantUML extension in VS Code
2. Open any `.puml` file
3. Use `Alt+D` to preview the diagram

### Option 2: Online PlantUML Server
1. Copy the content of any `.puml` file
2. Visit http://www.plantuml.com/plantuml/uml/
3. Paste the content to view the diagram

### Option 3: Local PlantUML Installation
```bash
# If you have PlantUML installed locally
java -jar plantuml.jar docs/design/*.puml
```

## 📝 Updating the Diagrams

When making architectural changes to the extension:

1. **Update the relevant diagram(s)** to reflect the changes
2. **Maintain consistency** across all diagrams
3. **Add notes** for any new design patterns or architectural decisions
4. **Test the diagrams** to ensure they render correctly

## 🏗️ Architecture Evolution

These diagrams represent the current state of the extension architecture. As the extension evolves:

- **New features** should follow the established patterns
- **Breaking changes** should be reflected in the diagrams
- **Performance improvements** should be documented in the analytics diagram
- **New dependencies** should be added to the components diagram

## 📚 Related Documentation

- `/docs/analytics/` - Analytics system implementation details
- `/scripts/` - Test and debug scripts
- `README.md` - User-facing feature documentation
- `CHANGELOG.md` - Version history and changes
