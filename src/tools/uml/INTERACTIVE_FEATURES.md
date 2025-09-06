# UML Chat Panel Interactive Features Documentation

## Overview
This document details all interactive features implemented in the UML Chat Panel for zoom, pan, and touch controls. This documentation serves as a reference to prevent feature regressions during future development and refactoring.

## Feature Inventory

### 1. Zoom Controls

#### Button-Based Zoom
- **Zoom In Button (+)**: Increases zoom by 0.1 (10%)
- **Zoom Out Button (−)**: Decreases zoom by 0.1 (10%)  
- **Reset Button (⌂)**: Resets zoom to 1.0 and clears pan offset

#### Zoom Range & Constraints
- **Minimum Zoom**: 0.2 (20%) - optimized for usability
- **Maximum Zoom**: 3.0 (300%) - optimized for performance
- **Zoom Step**: 0.1 (10% increments)
- **Default Zoom**: 1.0 (100%)

#### Platform-Specific Implementation
- **Windows**: Uses CSS `zoom` property for better compatibility
- **Other Platforms**: Uses CSS `transform: scale()` for precision
- **Fallback**: Dual implementation ensures cross-platform support

### 2. Pan Controls

#### Mouse Pan
- **Trigger**: Left mouse button (button 0) click and drag
- **Behavior**: Click and drag to move SVG content
- **Visual Feedback**: Cursor changes to `grabbing` during pan
- **State Management**: Tracks `isPanning` flag and last mouse position

#### Touch Pan (One Finger)
- **Trigger**: Single finger touch and drag
- **Behavior**: Touch and drag to move SVG content
- **Coordinate Tracking**: Monitors touch position deltas
- **State Management**: Integrates with pinch-to-zoom state

### 3. Zoom Controls (Non-Button)

#### Mouse Wheel Zoom
- **Trigger**: Mouse wheel scroll over SVG container
- **Behavior**: Scroll up = zoom in (1.1x), scroll down = zoom out (0.9x)
- **Event Handling**: Prevents default scroll behavior
- **Zoom Factor**: 10% per wheel step

#### Keyboard Zoom
- **Zoom In**: Ctrl/Cmd + Plus/Equals
- **Zoom Out**: Ctrl/Cmd + Minus
- **Reset**: Ctrl/Cmd + 0
- **Cross-Platform**: Uses both Ctrl (Windows/Linux) and Cmd (Mac) modifiers

### 4. Touch Controls

#### Pinch-to-Zoom (Two Finger)
- **Trigger**: Two-finger touch gesture
- **Behavior**: Pinch apart = zoom in, pinch together = zoom out
- **Center Point**: Calculates zoom center between two fingers
- **Distance Calculation**: Uses Euclidean distance between touch points
- **State Management**: Tracks last touch distance and center coordinates

#### Touch State Transitions
- **0 → 1 Finger**: Enters pan mode
- **1 → 2 Fingers**: Switches to pinch-to-zoom mode
- **2 → 1 Finger**: Returns to pan mode
- **1 → 0 Fingers**: Exits all touch interactions

### 5. State Management

#### Zoom State Variables
```javascript
let currentZoomLevel = 1.0;        // Current zoom multiplier
const minZoom = 0.2;               // Minimum allowed zoom (optimized for usability)
const maxZoom = 3.0;               // Maximum allowed zoom (optimized for performance)
const zoomStep = 0.1;              // Button zoom increment
```

#### Pan State Variables
```javascript
let currentPanX = 0;               // Horizontal pan offset (pixels)
let currentPanY = 0;               // Vertical pan offset (pixels)
let isPanning = false;             // Whether pan is active
let lastPanX = 0;                  // Last mouse/touch X position
let lastPanY = 0;                  // Last mouse/touch Y position
```

#### Touch State Variables
```javascript
let lastTouchDistance = 0;         // Distance between two fingers
let lastTouchCenterX = 0;          // Center X of pinch gesture
let lastTouchCenterY = 0;          // Center Y of pinch gesture
```

### 6. Event Handling

#### Mouse Events
- `mousedown`: Initiates pan on left button
- `mousemove`: Continues pan when active
- `mouseup`: Ends pan interaction
- `mouseleave`: Handles pan cleanup when leaving container
- `wheel`: Handles mouse wheel zoom

#### Touch Events
- `touchstart`: Initiates pan (1 finger) or pinch (2 fingers)
- `touchmove`: Continues active gesture
- `touchend`: Handles state transitions and cleanup
- `touchcancel`: Emergency cleanup for interrupted gestures

#### Keyboard Events
- `keydown`: Captures zoom keyboard shortcuts
- **Modifier Detection**: Checks for Ctrl/Cmd key combinations
- **Key Codes**: Plus/Equals, Minus, Digit0

### 7. CSS Implementation

#### Container Styles
```css
#svgPreview {
    touch-action: none;           /* Prevents default touch behaviors */
    user-select: none;            /* Prevents text selection */
    overflow: hidden;             /* Contains zoomed content */
    position: relative;           /* Positioning context */
}
```

#### Button Styles
```css
.zoom-controls {
    position: absolute;           /* Fixed positioning */
    bottom: 30px; right: 30px;    /* Bottom-right corner */
    z-index: 1000;               /* Above other content */
    pointer-events: auto;         /* Ensures button interaction */
}

.zoom-btn {
    touch-action: manipulation;   /* Optimizes touch response */
    pointer-events: auto;         /* Explicit interaction enabling */
    user-select: none;            /* Prevents text selection */
}
```

### 8. Transform Application

#### Windows Implementation
```javascript
if (isWindows) {
    svgEl.style.zoom = newZoom.toString();
    if (currentPanX !== 0 || currentPanY !== 0) {
        svgEl.style.transform = `translate(${currentPanX}px, ${currentPanY}px)`;
    }
}
```

#### Other Platforms Implementation
```javascript
else {
    svgEl.style.transform = `translate(${currentPanX}px, ${currentPanY}px) scale(${newZoom})`;
    svgEl.style.transformOrigin = 'center center';
}
```

### 9. Cross-Platform Compatibility

#### Windows-Specific Features
- CSS `zoom` property for primary zoom implementation
- Separate `transform` for pan to avoid conflicts
- Enhanced event handling for better responsiveness

#### macOS/Linux Features  
- Combined `transform` with `scale` and `translate`
- `transform-origin` set to center for consistent scaling
- Standard touch event handling

#### Universal Features
- Comprehensive event prevention (`preventDefault()`)
- Multiple event type handling for reliability
- Fallback mechanisms for edge cases

### 10. Debug and Logging

#### Debug Information
- Platform detection logging
- Event trigger logging
- State change tracking
- Transform application confirmation

#### Troubleshooting Features
- Comprehensive error logging
- State validation
- Element existence checks
- Event flow documentation

## Testing Strategy

### Manual Testing Checklist
- [ ] Zoom in/out buttons work on all platforms
- [ ] Reset button restores default state
- [ ] Mouse wheel zoom functions correctly
- [ ] Keyboard shortcuts respond (Ctrl/Cmd variants)
- [ ] Mouse pan works smoothly
- [ ] Single-finger touch pan works
- [ ] Two-finger pinch-to-zoom works
- [ ] Touch state transitions work correctly
- [ ] Visual feedback (cursor changes) works
- [ ] Boundaries respected (min/max zoom)

### Automated Testing
- Test file: `test-zoom-controls.html`
- Isolated environment for feature validation
- Cross-platform testing capabilities
- Debug logging for troubleshooting

## Future Enhancement Opportunities

### Potential Improvements
1. **Zoom Around Cursor**: Implement zoom centered on mouse position
2. **Pan Boundaries**: Add limits to prevent excessive panning
3. **Momentum Pan**: Add inertial scrolling for touch pan
4. **Accessibility**: Enhance screen reader support
5. **Performance**: Optimize for large SVG files
6. **Animation**: Add smooth transitions for zoom/pan
7. **Gesture Recognition**: Add more touch gestures
8. **Zoom Indicators**: Visual zoom level display

### Accessibility Considerations
- Keyboard navigation support
- Screen reader announcements
- High contrast mode compatibility
- Focus management
- Touch target size compliance

## Maintenance Guidelines

### When Adding New Features
1. **Test all existing interactions** after any WebView HTML changes
2. **Verify cross-platform compatibility** especially on Windows
3. **Update this documentation** with any new interactive features
4. **Run the test file** (`test-zoom-controls.html`) to validate
5. **Check event handling order** to prevent conflicts

### When Refactoring
1. **Preserve all state variables** and their initialization
2. **Maintain event listener registration** order and options
3. **Keep platform detection logic** intact
4. **Test touch state transitions** thoroughly
5. **Validate CSS transform application** methods

### Critical Code Sections
- `applyZoom()` function: Core zoom implementation
- `applyPan()` function: Pan state management
- Touch event handlers: Complex state machine
- Platform detection: Windows vs other OS handling
- CSS transform application: Cross-platform compatibility

## Dependencies

### External Libraries
- No external dependencies for core functionality
- SVG rendering handled by browser engine
- Touch events use native browser APIs

### Internal Dependencies
- WebView HTML generator: Provides container structure
- CSS files: Styling for controls and containers
- Event system: VS Code WebView message passing

## Version History

### Current Implementation
- **Version**: 1.0.0
- **Date**: July 2025
- **Features**: Full zoom, pan, and touch control implementation
- **Platform Support**: Windows, macOS, Linux
- **Testing**: Comprehensive manual and automated testing

This documentation should be updated whenever interactive features are modified, added, or removed to maintain accuracy and prevent regressions.
