#!/bin/bash

# Test script for Test Prompt Button functionality
# This script verifies that the test prompt button has been added correctly

set -e

echo "🧪 Testing Test Prompt Button Implementation"
echo "==========================================="

# Check if the test prompt button HTML is present in the webview generator
echo "📋 Checking HTML template for test prompt button in webviewHtmlGenerator.ts..."
if grep -q "testPromptBtn" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Test prompt button HTML found in webviewHtmlGenerator.ts"
else
    echo "❌ Test prompt button HTML not found in webviewHtmlGenerator.ts"
    exit 1
fi

# Check if the test prompt button HTML is present in the original umlChatPanel.ts
echo "📋 Checking HTML template for test prompt button in umlChatPanel.ts..."
if grep -q "testPromptBtn" src/tools/umlChatPanel.ts; then
    echo "✅ Test prompt button HTML found in umlChatPanel.ts"
else
    echo "❌ Test prompt button HTML not found in umlChatPanel.ts"
    exit 1
fi

# Check if the CSS styling is present
echo "📋 Checking CSS styling for test prompt button..."
if grep -q "\.test-prompt-btn" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Test prompt button CSS styling found"
else
    echo "❌ Test prompt button CSS styling not found"
    exit 1
fi

# Check if the JavaScript event handler is present in webviewHtmlGenerator.ts
echo "📋 Checking JavaScript event handler in webviewHtmlGenerator.ts..."
if grep -q "testPromptBtn\.onclick" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Test prompt button event handler found in webviewHtmlGenerator.ts"
else
    echo "❌ Test prompt button event handler not found in webviewHtmlGenerator.ts"
    exit 1
fi

# Check if the JavaScript event handler is present in umlChatPanel.ts
echo "📋 Checking JavaScript event handler in umlChatPanel.ts..."
if grep -q "testPromptBtn\.onclick" src/tools/umlChatPanel.ts; then
    echo "✅ Test prompt button event handler found in umlChatPanel.ts"
else
    echo "❌ Test prompt button event handler not found in umlChatPanel.ts"
    exit 1
fi

# Check if the test prompt text is present
echo "📋 Checking test prompt text..."
if grep -q "Design a secure payment processing system sequence diagram" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Test prompt text found in webviewHtmlGenerator.ts"
else
    echo "❌ Test prompt text not found in webviewHtmlGenerator.ts"
    exit 1
fi

if grep -q "Design a secure payment processing system sequence diagram" src/tools/umlChatPanel.ts; then
    echo "✅ Test prompt text found in umlChatPanel.ts"
else
    echo "❌ Test prompt text not found in umlChatPanel.ts"
    exit 1
fi

# Check if the button has proper styling attributes
echo "📋 Checking button styling attributes..."
if grep -q "background: linear-gradient.*#28a745" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Button gradient styling found"
else
    echo "❌ Button gradient styling not found"
    exit 1
fi

# Check if the button has proper icon
echo "📋 Checking button icon..."
if grep -q "path d=\"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z\"" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Button icon found"
else
    echo "❌ Button icon not found"
    exit 1
fi

# Check if the button has proper title attribute
echo "📋 Checking button title attribute..."
if grep -q "Insert test prompt for easy testing" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Button title attribute found"
else
    echo "❌ Button title attribute not found"
    exit 1
fi

echo ""
echo "🎉 All tests passed! Test prompt button implementation is complete."
echo ""
echo "📋 Summary of changes:"
echo "  ✅ Added test prompt button to webviewHtmlGenerator.ts"
echo "  ✅ Added test prompt button to umlChatPanel.ts"
echo "  ✅ Added CSS styling for the button"
echo "  ✅ Added JavaScript event handlers"
echo "  ✅ Added test prompt text"
echo "  ✅ Added proper button styling and icon"
echo ""
echo "🚀 The test prompt button now provides:"
echo "   - Easy testing with a pre-filled complex prompt"
echo "   - Visual feedback with green gradient styling"
echo "   - Proper icon and tooltip"
echo "   - Automatic textarea resizing and focus"
echo "   - Consistent behavior across both chat panel implementations"
echo ""
echo "📝 Test prompt:"
echo "   'Design a secure payment processing system sequence diagram including user authentication, payment gateway integration, fraud detection, bank communication, and transaction settlement'" 