# UML Chat Panel - Interactive Controls Feature Documentation

## Overview

This document describes the comprehensive interactive controls implemented for the UML Chat Panel, including zoom, pan, and touch gesture functionality. This serves as a reference to prevent feature regression during future development and refactoring.

## Feature Categories

### 1. **Zoom Controls**

#### Button-Based Zoom
- **Zoom In Button (+)**: Increases zoom by 0.1 increments
- **Zoom Out Button (−)**: Decreases zoom by 0.1 increments  
- **Reset Button (⌂)**: Resets zoom to 1.0 and pan to (0,0)
- **Range**: 0.2x to 3.0x zoom levels - optimized for usability and performance
- **Windows Compatibility**: Uses CSS `zoom` property for better Windows performance

#### Implementation Details
```typescript
// Location: src/tools/ui/webviewHtmlGenerator.ts
// Function: setupZoomControls()

// Key features:
- Button cloning to replace event listeners
- Multiple event types: 'click', 'mousedown', 'touchstart'
- Windows-specific CSS zoom vs transform scale
- Fallback mechanisms when svg-pan-zoom library fails
- Hardware acceleration with translateZ(0)
```

#### CSS Specifications
```css
/* Enhanced button styling for Windows compatibility */
.zoom-btn {
    width: 42px;
    height: 42px;
    background: rgba(255, 255, 255, 0.95);
    border: 2px solid #007acc;
    z-index: 1000;
    pointer-events: auto;
    touch-action: manipulation;
}
```

### 2. **Pan (Drag) Controls**

#### Mouse Pan
- **Trigger**: Left mouse button down + drag
- **Visual Feedback**: Cursor changes to `grab` → `grabbing`
- **Coordinate Tracking**: Tracks deltaX, deltaY movements
- **End Conditions**: Mouse up, mouse leave container

#### Touch Pan (One Finger)
- **Trigger**: Single touch point + drag
- **Implementation**: touchstart → touchmove → touchend
- **Coordinate System**: clientX, clientY from touch events
- **State Management**: isPanning flag prevents conflicts

#### Implementation Details
```typescript
// Location: src/tools/ui/webviewHtmlGenerator.ts
// Function: setupPanAndPinch()

// Key features:
- Separate pan state (currentPanX, currentPanY)
- Windows CSS zoom + transform vs unified transform
- SVG-pan-zoom library integration with fallback
- Event prevention to avoid default behaviors
```

### 3. **Pinch-to-Zoom (Two Finger Touch)**

#### Touch Gesture Recognition
- **Trigger**: Two simultaneous touch points
- **Distance Calculation**: Euclidean distance between touch points
- **Center Point**: Midpoint between two touches
- **Zoom Factor**: currentDistance / lastDistance

#### Implementation Details
```typescript
// Touch distance calculation
function getTouchDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// Center point calculation
function getTouchCenter(touch1, touch2) {
    return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
    };
}
```

### 4. **Mouse Wheel Zoom**

#### Behavior
- **Scroll Up**: Zoom in (factor: 1.1)
- **Scroll Down**: Zoom out (factor: 0.9)
- **Zoom Point**: Cursor position (future enhancement)
- **Event Prevention**: Prevents page scroll

### 5. **Keyboard Shortcuts**

#### Implemented Shortcuts
- **Ctrl/Cmd + Plus**: Zoom in
- **Ctrl/Cmd + Minus**: Zoom out  
- **Ctrl/Cmd + 0**: Reset zoom and pan

#### Implementation
```typescript
// Location: src/tools/ui/webviewHtmlGenerator.ts
// Event listener on document for keydown events
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case '+':
            case '=':
                e.preventDefault();
                if (zoomInBtn) zoomInBtn.click();
                break;
            // ...
        }
    }
});
```

## Cross-Platform Compatibility

### Windows-Specific Optimizations

#### Primary Approach: CSS Zoom
```typescript
if (isWindows) {
    // Use CSS zoom property for Windows (best compatibility)
    svgEl.style.zoom = newZoom.toString();
    if (currentPanX !== 0 || currentPanY !== 0) {
        svgEl.style.transform = `translate(${currentPanX}px, ${currentPanY}px)`;
    }
}
```

#### Enhanced Event Handling
- Multiple event types for reliability
- Event capture with `{ passive: false, capture: true }`
- Platform detection for behavior branching

#### CSS Hardware Acceleration
```css
transform: translateZ(0) !important;
will-change: transform, background, border-color !important;
```

### macOS/Linux Approach: Transform Scale
```typescript
else {
    // Use transform scale for other platforms
    svgEl.style.transform = `translate(${currentPanX}px, ${currentPanY}px) scale(${newZoom})`;
    svgEl.style.transformOrigin = 'center center';
}
```

## Integration with SVG-Pan-Zoom Library

### Primary/Fallback Strategy
1. **Primary**: Try svg-pan-zoom library methods
2. **Fallback**: Use manual CSS transforms
3. **Error Handling**: Graceful degradation with logging

### SVG-Pan-Zoom Methods Used
```typescript
// Zoom operations
panZoomInstance.zoomIn()
panZoomInstance.zoomOut()
panZoomInstance.reset()
panZoomInstance.zoomAtPoint(newZoom, {x: centerX, y: centerY})

// Pan operations  
panZoomInstance.panBy({x: deltaX, y: deltaY})

// State queries
panZoomInstance.getZoom()
```

## CSS Touch and Interaction Properties

### Container Setup
```css
#svgPreview {
    touch-action: none;           /* Disable default touch behaviors */
    user-select: none;            /* Prevent text selection */
    overflow: hidden;             /* Hide scrollbars during interaction */
    cursor: grab;                 /* Visual feedback for pan capability */
}
```

### SVG Element Setup
```css
#svgPreview svg {
    touch-action: none;           /* Prevent default SVG touch behaviors */
    user-select: none;            /* Prevent selection */
    pointer-events: auto;         /* Enable interactions */
    transform-origin: center center; /* Consistent zoom center */
}
```

## State Management

### Zoom State
```typescript
let currentZoomLevel = 1.0;      // Current zoom multiplier
const minZoom = 0.2;             // Minimum zoom level (optimized)
const maxZoom = 3.0;             // Maximum zoom level (optimized)
const zoomStep = 0.1;            // Button zoom increment
```

### Pan State
```typescript
let currentPanX = 0;             // X offset in pixels
let currentPanY = 0;             // Y offset in pixels
let isPanning = false;           // Active pan state
let lastPanX = 0;                // Last mouse/touch X
let lastPanY = 0;                // Last mouse/touch Y
```

### Touch State
```typescript
let lastTouchDistance = 0;       // Previous pinch distance
let lastTouchCenterX = 0;        // Previous pinch center X
let lastTouchCenterY = 0;        // Previous pinch center Y
```

## Error Handling and Logging

### Debug Logging
```typescript
console.log('=== ZOOM CONTROLS DEBUG INFO ===');
console.log('Platform detection:', {
    userAgent: userAgent,
    isWindows: isWindows,
    isEdge: isEdge,
    isChrome: isChrome,
    vsCodeWebview: typeof acquireVsCodeApi !== 'undefined'
});
```

### Error Recovery
- SVG-pan-zoom library failure → Manual CSS fallback
- Missing SVG element → Graceful error logging
- Invalid zoom levels → Clamping to min/max bounds
- Touch event conflicts → State management prevents interference

## Testing and Validation

### Test File Location
- **File**: `/test-zoom-controls.html`
- **Purpose**: Isolated testing of all interactive features
- **Usage**: Open in browser to verify functionality outside VS Code

### Test Scenarios
1. **Button Zoom**: All three buttons (in/out/reset)
2. **Mouse Pan**: Click and drag to move diagram
3. **Mouse Wheel**: Scroll to zoom in/out
4. **Touch Pan**: Single finger drag (touch devices)
5. **Pinch Zoom**: Two finger pinch gesture (touch devices)
6. **Keyboard**: Ctrl/Cmd + shortcuts
7. **Windows Compatibility**: CSS zoom vs transform behavior

### Validation Criteria
- ✅ Smooth zoom transitions without jitter
- ✅ Pan state preserved during zoom operations
- ✅ Touch gestures don't conflict with each other
- ✅ Keyboard shortcuts work without interfering with text input
- ✅ Zoom limits respected (0.1x - 5.0x)
- ✅ Reset functionality restores both zoom and pan
- ✅ Cross-platform consistency (Windows/macOS/Linux)

## File Locations and Architecture

### Primary Implementation
- **Main File**: `src/tools/ui/webviewHtmlGenerator.ts`
- **Functions**: 
  - `setupZoomControls()` - Button-based zoom
  - `setupPanAndPinch()` - Touch and pan interactions
  - `enablePanZoom()` - SVG-pan-zoom library integration

### Test Implementation
- **Test File**: `test-zoom-controls.html`
- **Purpose**: Standalone validation of all features

### CSS Integration
- **Location**: Within `generateCSS()` method
- **Classes**: `.zoom-controls`, `.zoom-btn`, `#svgPreview`, `#svgPreview svg`

## Future Enhancements

### Potential Improvements
1. **Zoom Around Cursor**: Mouse wheel zoom at cursor position
2. **Zoom Boundaries**: Limit pan to keep content in view
3. **Momentum Pan**: Continued motion after touch release
4. **Zoom Animation**: Smooth transitions between zoom levels
5. **Accessibility**: Screen reader support and keyboard navigation
6. **Touch Pressure**: Variable zoom speed based on touch pressure

### Backward Compatibility
- Maintain fallback for svg-pan-zoom library absence
- Preserve existing keyboard shortcuts
- Ensure VS Code webview security compliance
- Support for older Windows versions (IE compatibility mode)

## Maintenance Guidelines

### When Adding New Features
1. **Test with this documentation** to ensure no regression
2. **Update this document** with any new functionality
3. **Run test-zoom-controls.html** to validate changes
4. **Test on Windows specifically** due to platform differences

### When Refactoring
1. **Preserve state management structure** (zoom/pan/touch state variables)
2. **Maintain cross-platform branching** (Windows vs other platforms)
3. **Keep error handling and fallback mechanisms**
4. **Test all interaction methods** after changes

### Code Review Checklist
- [ ] All zoom/pan state variables preserved
- [ ] Windows-specific CSS zoom handling intact
- [ ] Touch event prevention and handling correct
- [ ] SVG-pan-zoom integration with fallback working
- [ ] Test file updated if behavior changes
- [ ] Documentation updated for new features

---

**Last Updated**: July 3, 2025  
**Version**: 1.0  
**Author**: Modular UML Chat Panel Refactoring  
**Related Files**: `src/tools/ui/webviewHtmlGenerator.ts`, `test-zoom-controls.html`
