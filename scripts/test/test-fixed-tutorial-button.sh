#!/bin/bash

# Test Fixed Tutorial Button Implementation
echo "=== Testing Fixed Tutorial Button Implementation ==="

# Test 1: Check tutorial button HTML exists
echo "🔍 Test 1: Checking tutorial button HTML exists..."

if grep -A 5 'id="tutorialBtn"' src/tools/ui/webviewHtmlGenerator.ts | grep -q "tutorial-btn"; then
    echo "✅ Tutorial button HTML found with correct class"
else
    echo "❌ Tutorial button HTML not found or missing class"
    exit 1
fi

# Test 2: Check tutorial button CSS styling
echo ""
echo "🔍 Test 2: Checking tutorial button CSS styling..."

if grep -A 20 "Tutorial Button Styling" src/tools/ui/webviewHtmlGenerator.ts | grep -q "tutorial-btn"; then
    echo "✅ Tutorial button CSS styling found"
else
    echo "❌ Tutorial button CSS styling missing"
    exit 1
fi

# Test 3: Check tutorial button event listener
echo ""
echo "🔍 Test 3: Checking tutorial button event listener..."

if grep -A 10 "Fixed tutorial button functionality" src/tools/ui/webviewHtmlGenerator.ts | grep -q "addEventListener"; then
    echo "✅ Tutorial button event listener found"
else
    echo "❌ Tutorial button event listener missing"
    exit 1
fi

# Test 4: Check tutorial button position in utility actions
echo ""
echo "🔍 Test 4: Checking tutorial button position..."

if grep -A 10 "utility-actions" src/tools/ui/webviewHtmlGenerator.ts | grep -q "tutorialBtn"; then
    echo "✅ Tutorial button positioned in utility actions"
else
    echo "❌ Tutorial button not in utility actions"
    exit 1
fi

# Test 5: Check tutorial button icon
echo ""
echo "🔍 Test 5: Checking tutorial button icon..."

if grep -A 10 'id="tutorialBtn"' src/tools/ui/webviewHtmlGenerator.ts | grep -q "svg"; then
    echo "✅ Tutorial button has SVG icon"
else
    echo "❌ Tutorial button missing SVG icon"
    exit 1
fi

echo ""
echo "🎉 All fixed tutorial button tests passed!"
echo ""
echo "📋 Summary of fixed tutorial button:"
echo "  ✅ Added tutorial button to utility actions area"
echo "  ✅ Styled with orange gradient to stand out"
echo "  ✅ Added click event listener to open tutorial"
echo "  ✅ Positioned alongside export/import buttons"
echo "  ✅ Always visible and accessible"
echo ""
echo "🛠️ Expected behavior:"
echo "  - Tutorial button is always visible in chat area"
echo "  - Orange gradient styling makes it prominent"
echo "  - Clicking opens the tutorial modal"
echo "  - No dependency on diagram state or visibility" 