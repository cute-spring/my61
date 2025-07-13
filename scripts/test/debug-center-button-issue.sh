#!/bin/bash

# Debug script to identify why the center tutorial button isn't working
# while the tutorial button near Send works fine

echo "🔍 Debugging Center Tutorial Button Issue..."
echo "============================================="

# Check compilation
echo "📦 Checking compilation..."
if npm run compile > /dev/null 2>&1; then
    echo "✅ Compilation successful"
else
    echo "❌ Compilation failed"
    exit 1
fi

echo ""
echo "🎯 Analyzing Button Implementations..."
echo "------------------------------------"

# Check if both buttons exist in HTML
echo "1. Button HTML Structure:"
if grep -q 'id="onboardingBtnCenter"' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✅ Center button HTML exists (onboardingBtnCenter)"
else
    echo "   ❌ Center button HTML missing"
fi

if grep -q 'id="tutorialBtn"' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✅ Tutorial button HTML exists (tutorialBtn) - WORKING"
else
    echo "   ❌ Tutorial button HTML missing"
fi

echo ""
echo "2. Button Event Handlers:"
if grep -A 5 'onboardingBtnCenter.*addEventListener' src/tools/ui/webviewHtmlGenerator.ts | grep -q 'click'; then
    echo "   ✅ Center button has click handler"
else
    echo "   ❌ Center button missing click handler"
fi

if grep -A 5 'tutorialBtn.*addEventListener' src/tools/ui/webviewHtmlGenerator.ts | grep -q 'click'; then
    echo "   ✅ Tutorial button has click handler - WORKING"
else
    echo "   ❌ Tutorial button missing click handler"
fi

echo ""
echo "3. Button CSS Styling:"
if grep -A 10 '\.onboarding-btn-center {' src/tools/ui/webviewHtmlGenerator.ts | grep -q 'position: absolute'; then
    echo "   ✅ Center button has absolute positioning"
else
    echo "   ❌ Center button missing absolute positioning"
fi

if grep -A 10 '\.onboarding-btn-center {' src/tools/ui/webviewHtmlGenerator.ts | grep -q 'z-index'; then
    z_index=$(grep -A 10 '\.onboarding-btn-center {' src/tools/ui/webviewHtmlGenerator.ts | grep 'z-index' | head -1 | sed 's/.*z-index: *\([0-9]*\).*/\1/')
    echo "   ✅ Center button z-index: $z_index"
else
    echo "   ❌ Center button missing z-index"
fi

if grep -A 10 '\.onboarding-btn-center {' src/tools/ui/webviewHtmlGenerator.ts | grep -q 'pointer-events: auto'; then
    echo "   ✅ Center button has pointer-events: auto"
else
    echo "   ❌ Center button missing pointer-events: auto"
fi

echo ""
echo "4. Button Visibility Control:"
if grep -q 'tutorialBtnCenter.*classList.*remove.*hidden' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✅ Center button visibility is controlled by reactive state"
else
    echo "   ❌ Center button visibility control missing"
fi

if grep -q 'tutorialBtn.*classList.*remove.*hidden' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✅ Tutorial button visibility is controlled"
else
    echo "   ❌ Tutorial button visibility control missing"
fi

echo ""
echo "🔍 Potential Issues Analysis..."
echo "-----------------------------"

# Check if center button starts with hidden class
if grep 'id="onboardingBtnCenter"' src/tools/ui/webviewHtmlGenerator.ts | grep -q 'hidden'; then
    echo "❌ ISSUE: Center button starts with 'hidden' class"
    echo "   This could prevent it from being visible initially"
else
    echo "✅ Center button doesn't start with hidden class"
fi

# Check if there are elements that might cover the center button
echo ""
echo "5. Elements that might cover center button:"
if grep -A 20 '<div id="svgPreview"' src/tools/ui/webviewHtmlGenerator.ts | grep -q '<svg'; then
    echo "   ⚠️  SVG content might be covering the center button"
fi

if grep -A 20 '<div id="svgPreview"' src/tools/ui/webviewHtmlGenerator.ts | grep -q 'zoom-controls'; then
    echo "   ⚠️  Zoom controls might be interfering"
fi

echo ""
echo "6. SVG Content Overlay Issue:"
# Check if SVG content is being inserted dynamically
if grep -q 'svgContainer.innerHTML = message.svgContent' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ❌ POTENTIAL ISSUE: SVG content overwrites center button"
    echo "   The center button might be getting replaced by SVG content"
else
    echo "   ✅ No direct SVG content replacement found"
fi

echo ""
echo "🎯 Recommendations..."
echo "--------------------"

echo "Based on the analysis, here are the most likely issues:"
echo ""
echo "1. **SVG Content Overlay**: The center button might be getting covered"
echo "   by SVG content that's inserted dynamically into the same container."
echo ""
echo "2. **Z-Index Issue**: Despite having z-index: 9999, something might"
echo "   still be covering the button."
echo ""
echo "3. **Positioning Issue**: The absolute positioning might be placing"
echo "   the button outside the clickable area."
echo ""
echo "4. **Reactive State Issue**: The button might be getting hidden"
echo "   by the reactive state management system."
echo ""

echo "🔧 Quick Fix Suggestions:"
echo "1. Move center button outside svgPreview container"
echo "2. Add higher z-index (like 99999)"
echo "3. Add debug logging to click handler"
echo "4. Check if button is actually visible in DOM"
echo ""

echo "✨ Next Steps:"
echo "1. Check browser dev tools to see if button is visible"
echo "2. Verify button is not covered by other elements"
echo "3. Test click handler with manual JavaScript execution"
echo "4. Compare working tutorialBtn vs non-working onboardingBtnCenter" 