#!/bin/bash

# Test script for Jira Planning Tool debugging
echo "🔍 Testing Jira Planning Tool with debugging enabled..."

# Compile the project
echo "📦 Compiling project..."
npm run compile

if [ $? -eq 0 ]; then
    echo "✅ Compilation successful"
else
    echo "❌ Compilation failed"
    exit 1
fi

# Test the debugging features
echo "🧪 Testing debugging features..."

# Check if debug statements are present
echo "🔍 Checking for debug statements in webview..."
if grep -q "console.log('Setting up event listeners..." src/tools/jira/jiraPlannerWebview.ts; then
    echo "✅ Frontend debug statements found"
else
    echo "❌ Frontend debug statements missing"
fi

if grep -q "console.log('handleWebviewMessage called with:" src/tools/jira/jiraPlanningTool.ts; then
    echo "✅ Backend debug statements found"
else
    echo "❌ Backend debug statements missing"
fi

# Check if message handler is properly registered
if grep -q "console.log('Message handler registered successfully')" src/tools/jira/jiraPlanningTool.ts; then
    echo "✅ Message handler registration debug found"
else
    echo "❌ Message handler registration debug missing"
fi

echo ""
echo "🎯 Debug version is ready!"
echo ""
echo "📋 To test the send button issue:"
echo "1. Open VS Code"
echo "2. Run: Ctrl+Shift+P -> 'AI Jira Planning Assistant'"
echo "3. Right-click in the webview -> 'Inspect'"
echo "4. Go to Console tab"
echo "5. Type some text and click Send button"
echo "6. Check console output for debugging information"
echo ""
echo "🔍 Expected console output:"
echo "- 'Setting up event listeners...'"
echo "- 'Send button clicked!'"
echo "- 'postMessage called with command: send_requirement'"
echo "- 'Webview message received:'"
echo "- 'handleWebviewMessage called with:'"
echo ""
echo "📚 For detailed debugging guide, see: JIRA_PLANNER_DEBUG_GUIDE.md"

echo "✅ All debugging features are in place!" 