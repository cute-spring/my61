#!/bin/bash

# Test Tutorial Button Design
echo "=== Testing Tutorial Button Design ==="

# Test 1: Check target icon (concentric circles)
echo "🔍 Test 1: Checking target icon..."

if grep -A 10 'id="tutorialBtn"' src/tools/ui/webviewHtmlGenerator.ts | grep -q "circle cx=\"12\" cy=\"12\" r=\"10\"" && \
   grep -A 10 'id="tutorialBtn"' src/tools/ui/webviewHtmlGenerator.ts | grep -q "circle cx=\"12\" cy=\"12\" r=\"6\"" && \
   grep -A 10 'id="tutorialBtn"' src/tools/ui/webviewHtmlGenerator.ts | grep -q "circle cx=\"12\" cy=\"12\" r=\"2\""; then
    echo "✅ Target icon (concentric circles) found"
else
    echo "❌ Target icon not found"
    exit 1
fi

# Test 2: Check blue gradient color
echo ""
echo "🔍 Test 2: Checking blue gradient color..."

if grep -A 5 "Tutorial Button Styling" src/tools/ui/webviewHtmlGenerator.ts | grep -q "#007ACC.*#005A99"; then
    echo "✅ Blue gradient color found"
else
    echo "❌ Blue gradient color not found"
    exit 1
fi

# Test 3: Check hover state color
echo ""
echo "🔍 Test 3: Checking hover state color..."

if grep -A 10 "tutorial-btn:hover" src/tools/ui/webviewHtmlGenerator.ts | grep -q "#005FA3.*#004080"; then
    echo "✅ Hover state color found"
else
    echo "❌ Hover state color not found"
    exit 1
fi

# Test 4: Check blue shadow colors
echo ""
echo "🔍 Test 4: Checking blue shadow colors..."

if grep -A 10 "tutorial-btn" src/tools/ui/webviewHtmlGenerator.ts | grep -q "rgba(0, 122, 204"; then
    echo "✅ Blue shadow colors found"
else
    echo "❌ Blue shadow colors not found"
    exit 1
fi

# Test 5: Check no orange colors remain
echo ""
echo "🔍 Test 5: Checking no orange colors remain..."

if ! grep -A 20 "tutorial-btn" src/tools/ui/webviewHtmlGenerator.ts | grep -q "#ff6b35\|#f7931e\|#e55a2b\|#e8851a"; then
    echo "✅ No orange colors found (clean transition)"
else
    echo "❌ Orange colors still present"
    exit 1
fi

echo ""
echo "🎉 All tutorial button design tests passed!"
echo ""
echo "📋 Summary of new design:"
echo "  ✅ Target icon (concentric circles) - perfect for tutorials"
echo "  ✅ Professional blue gradient (#007ACC to #005A99)"
echo "  ✅ Darker blue hover state (#005FA3 to #004080)"
echo "  ✅ Blue shadow effects for depth"
echo "  ✅ Matches VS Code's professional theme"
echo ""
echo "🎨 Design benefits:"
echo "  - Target icon is universally recognized for goals/guides"
echo "  - Blue color is professional and trustworthy"
echo "  - Matches VS Code's color scheme"
echo "  - Clean, modern appearance" 