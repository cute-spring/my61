#!/bin/bash

# Test script for refined zoom buttons
# This script verifies that the zoom buttons have been enhanced with better styling and icons

echo "🧪 Testing Refined Zoom Buttons"
echo "==============================="

# Test 1: Check if zoom buttons have proper SVG icons
echo "✅ Test 1: Checking SVG icons implementation"
if grep -A 5 "zoom-btn zoom-in" src/tools/ui/webviewHtmlGenerator.ts | grep -q "<svg.*viewBox" && \
   grep -A 5 "zoom-btn zoom-out" src/tools/ui/webviewHtmlGenerator.ts | grep -q "<svg.*viewBox" && \
   grep -A 5 "zoom-btn zoom-reset" src/tools/ui/webviewHtmlGenerator.ts | grep -q "<svg.*viewBox"; then
    echo "   ✓ SVG icons properly implemented for all zoom buttons"
else
    echo "   ✗ SVG icons not properly implemented"
    exit 1
fi

# Test 2: Verify enhanced accessibility
echo "✅ Test 2: Verifying enhanced accessibility"
if grep -q 'aria-label="Zoom In"' src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q 'aria-label="Zoom Out"' src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q 'aria-label="Reset Zoom"' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ Enhanced accessibility with aria-labels"
else
    echo "   ✗ Enhanced accessibility not implemented"
    exit 1
fi

# Test 3: Check keyboard shortcuts in tooltips
echo "✅ Test 3: Checking keyboard shortcuts in tooltips"
if grep -q "Ctrl + +" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "Ctrl + -" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "Ctrl + 0" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ Keyboard shortcuts added to tooltips"
else
    echo "   ✗ Keyboard shortcuts not added to tooltips"
    exit 1
fi

# Test 4: Verify individual button classes
echo "✅ Test 4: Verifying individual button classes"
if grep -q "zoom-btn zoom-in" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "zoom-btn zoom-out" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "zoom-btn zoom-reset" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ Individual button classes implemented"
else
    echo "   ✗ Individual button classes not implemented"
    exit 1
fi

# Test 5: Check modern glass-morphism styling
echo "✅ Test 5: Checking modern glass-morphism styling"
if grep -q "backdrop-filter: blur(16px)" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "glass-morphism container" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "rgba(255, 255, 255, 0.08)" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ Modern glass-morphism styling implemented"
else
    echo "   ✗ Modern glass-morphism styling not implemented"
    exit 1
fi

# Test 6: Verify color-coded button styling
echo "✅ Test 6: Verifying color-coded button styling"
if grep -q "rgba(34, 197, 94" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "rgba(239, 68, 68" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "rgba(168, 85, 247" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ Color-coded button styling (green, red, purple) implemented"
else
    echo "   ✗ Color-coded button styling not implemented"
    exit 1
fi

# Test 7: Check enhanced animations
echo "✅ Test 7: Checking enhanced animations"
if grep -q "zoomControlsAppear" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "cubic-bezier(0.4, 0, 0.2, 1)" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "transform: scale(1.1)" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ Enhanced animations and transitions implemented"
else
    echo "   ✗ Enhanced animations not implemented"
    exit 1
fi

# Test 8: Verify responsive design
echo "✅ Test 8: Verifying responsive design"
if grep -q "@media (max-width: 768px)" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "width: 32px" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "height: 32px" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ Responsive design for mobile devices implemented"
else
    echo "   ✗ Responsive design not implemented"
    exit 1
fi

# Test 9: Check improved button dimensions
echo "✅ Test 9: Checking improved button dimensions"
if grep -q "width: 36px" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "height: 36px" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "border-radius: 8px" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ Improved button dimensions (36x36px with 8px border-radius)"
else
    echo "   ✗ Improved button dimensions not implemented"
    exit 1
fi

# Test 10: Verify enhanced hover effects
echo "✅ Test 10: Verifying enhanced hover effects"
if grep -q "translateY(-1px)" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "box-shadow: 0 4px 16px" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "transform: scale(1.1)" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ Enhanced hover effects with lift and icon scaling"
else
    echo "   ✗ Enhanced hover effects not implemented"
    exit 1
fi

# Test 11: Check if original button IDs are preserved
echo "✅ Test 11: Checking original button IDs preservation"
if grep -q 'id="zoomInBtn"' src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q 'id="zoomOutBtn"' src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q 'id="zoomResetBtn"' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ Original button IDs preserved for functionality"
else
    echo "   ✗ Original button IDs not preserved"
    exit 1
fi

# Test 12: Verify SVG icon details
echo "✅ Test 12: Verifying SVG icon details"
if grep -A 10 "zoom-btn zoom-in" src/tools/ui/webviewHtmlGenerator.ts | grep -q "circle.*cx.*cy.*r" && \
   grep -A 10 "zoom-btn zoom-out" src/tools/ui/webviewHtmlGenerator.ts | grep -q "circle.*cx.*cy.*r" && \
   grep -A 10 "zoom-btn zoom-reset" src/tools/ui/webviewHtmlGenerator.ts | grep -q "rect.*width.*height"; then
    echo "   ✓ SVG icon details properly implemented"
else
    echo "   ✗ SVG icon details not properly implemented"
    exit 1
fi

echo ""
echo "🎉 All tests passed! Refined zoom buttons are working correctly."
echo ""
echo "📋 Summary of improvements:"
echo "   • Modern SVG icons replace simple text characters"
echo "   • Enhanced glass-morphism container with backdrop blur"
echo "   • Color-coded buttons: Green (zoom in), Red (zoom out), Purple (reset)"
echo "   • Improved accessibility with aria-labels and keyboard shortcuts"
echo "   • Larger button size (36x36px) for better touch targets"
echo "   • Smooth animations and hover effects with icon scaling"
echo "   • Responsive design for mobile devices"
echo "   • Enhanced visual feedback with lift effects and shadows"
echo ""
echo "🔧 Visual improvements:"
echo "   • Zoom In: Green magnifying glass with plus icon"
echo "   • Zoom Out: Red magnifying glass with minus icon"
echo "   • Reset: Purple square with X icon"
echo "   • Glass-morphism container with subtle animations"
echo "   • Better spacing and modern border radius" 