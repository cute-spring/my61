/**
 * Configuration constants for UML Chat Panel
 * 
 * Focused on diagram types with significant AI-driven comparative advantages:
 * - Activity Diagrams: Quick business process modeling from natural language
 * - Sequence Diagrams: Rapid system interaction design through conversation
 * - Use Case Diagrams: Fast functional requirement visualization
 * - Class Diagrams: Progressive system design with iterative refinement
 * - Component Diagrams: Quick architecture prototyping
 */

export const DIAGRAM_TYPES = [
    { value: '', label: 'Auto-detect' },
    { value: 'activity', label: 'Activity Diagram (Business Process)' },
    { value: 'sequence', label: 'Sequence Diagram (System Interaction)' },
    { value: 'usecase', label: 'Use Case Diagram (Functional Requirements)' },
    { value: 'class', label: 'Class Diagram (System Structure)' },
    { value: 'component', label: 'Component Diagram (Architecture)' }
] as const;

export const ZOOM_CONFIG = {
    MIN_ZOOM: 0.1,
    MAX_ZOOM: 10,
    ZOOM_STEP: 1.2,
    DEBOUNCE_DELAY: 300
} as const;

export const UI_CONFIG = {
    MIN_PANEL_WIDTH: 320,
    MAX_PANEL_WIDTH: 900,
    DEFAULT_PANEL_WIDTH: '20vw'
} as const;



export const UML_TEMPLATES = {
    DEFAULT_PLANTUML: '@startuml\n\n@enduml',
    ERROR_SVG: '<svg><!-- Error: {message} --></svg>',
    EMPTY_SVG: '<svg><!-- No content --></svg>',
    SETUP_REQUIRED_MESSAGE: `
🔧 **PlantUML Setup Required**

To enable diagram rendering, you need:

1. **Java Runtime Environment** (JRE 8 or higher)
   - Download from: https://adoptium.net/
   
2. **PlantUML JAR file**
   - Download from: https://plantuml.com/download
   - Or set path in VS Code settings: \`plantuml.jarPath\`

3. **Alternative: Install PlantUML Extension**
   - Search for "PlantUML" in VS Code Extensions
   - It provides automatic setup and additional features

For now, you can still discuss UML concepts and get PlantUML code - you just won't see the visual diagrams until setup is complete.
`
} as const;


