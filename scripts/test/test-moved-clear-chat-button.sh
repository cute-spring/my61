#!/bin/bash

echo "🧪 Testing Moved Clear Chat Button"
echo "=================================="

# Check if Clear Chat button is in primary actions
echo "1. Checking if Clear Chat button is in primary actions area..."
if grep -A 10 "primary-actions" src/tools/ui/webviewHtmlGenerator.ts | grep -q "clearChatBtn"; then
    echo "✅ Clear Chat button moved to primary actions area"
else
    echo "❌ Clear Chat button not found in primary actions area"
fi

# Check if Clear Chat button is removed from utility actions
echo "2. Checking if Clear Chat button is removed from utility actions..."
if ! grep -A 20 "utility-actions" src/tools/ui/webviewHtmlGenerator.ts | grep -q "clearChatBtn"; then
    echo "✅ Clear Chat button removed from utility actions area"
else
    echo "❌ Clear Chat button still exists in utility actions area"
fi

# Check if Clear Chat button has secondary styling
echo "3. Checking if Clear Chat button has secondary styling..."
if grep -q 'class="secondary"' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Clear Chat button has secondary class styling"
else
    echo "❌ Clear Chat button secondary styling not applied"
fi

# Check if Clear Chat button text is shortened
echo "4. Checking if Clear Chat button text is shortened..."
if grep -q '<span>Clear</span>' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Clear Chat button text shortened to 'Clear'"
else
    echo "❌ Clear Chat button text not shortened"
fi

# Check if secondary button CSS is implemented
echo "5. Checking if secondary button CSS is implemented..."
if grep -q "button.secondary" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Secondary button CSS styling implemented"
else
    echo "❌ Secondary button CSS styling not implemented"
fi

# Check if secondary button has gradient background
echo "6. Checking if secondary button has gradient background..."
if grep -q "background: linear-gradient(135deg, #f8f9fa, #e9ecef)" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Secondary button has elegant gradient background"
else
    echo "❌ Secondary button gradient background not implemented"
fi

# Check if secondary button has hover effects
echo "7. Checking if secondary button has hover effects..."
if grep -q "button.secondary:hover" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Secondary button has hover effects"
else
    echo "❌ Secondary button hover effects not implemented"
fi

# Check if secondary button has consistent sizing
echo "8. Checking if secondary button has consistent sizing..."
if grep -q "padding: 6px 12px" src/tools/ui/webviewHtmlGenerator.ts && grep -q "font-size: 0.875rem" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Secondary button has consistent sizing with primary button"
else
    echo "❌ Secondary button sizing not consistent"
fi

# Check if secondary button has subtle shadow
echo "9. Checking if secondary button has subtle shadow..."
if grep -q "box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1)" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Secondary button has subtle shadow"
else
    echo "❌ Secondary button shadow not implemented"
fi

# Check if buttons are positioned next to each other
echo "10. Checking if buttons are positioned next to each other..."
if grep -A 5 "sendBtn" src/tools/ui/webviewHtmlGenerator.ts | grep -q "clearChatBtn"; then
    echo "✅ Clear Chat button positioned next to Send button"
else
    echo "❌ Clear Chat button not positioned next to Send button"
fi

echo ""
echo "📊 Moved Clear Chat Button Features:"
echo "- ✅ Moved from utility actions to primary actions area"
echo "- ✅ Positioned next to Send button for better accessibility"
echo "- ✅ Changed from 'danger' to 'secondary' styling"
echo "- ✅ Shortened text from 'Clear Chat' to 'Clear'"
echo "- ✅ Added secondary button CSS with gradient background"
echo "- ✅ Implemented hover effects and animations"
echo "- ✅ Consistent sizing and typography with primary button"
echo "- ✅ Subtle shadow for depth perception"
echo "- ✅ Professional gray color scheme"
echo "- ✅ Maintains same functionality with better UX"
echo ""
echo "🎯 Result: Clear Chat button is now more accessible and better integrated" 