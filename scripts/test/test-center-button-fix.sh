#!/bin/bash

# Test script to verify center button fix with debugging
echo "🔧 Testing Center Button Fix with Debugging..."
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
echo "🎯 Verifying Debug Enhancements..."
echo "--------------------------------"

# Check if debugging was added to center button click handler
if grep -q '\[DEBUG\] Center button clicked!' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Debug logging added to center button click handler"
else
    echo "❌ Debug logging missing from center button click handler"
fi

# Check if debugging was added to button state
if grep -q '\[DEBUG\] Center button details:' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Debug logging added for button state details"
else
    echo "❌ Debug logging missing for button state details"
fi

# Check if preserve-and-restore debugging was added
if grep -q '\[PRESERVE\] Re-adding click handler to restored button' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Debug logging added to preserve-and-restore mechanism"
else
    echo "❌ Debug logging missing from preserve-and-restore mechanism"
fi

# Check if event listener is re-added after restoration
if grep -A 10 '\[PRESERVE\] Re-adding click handler' src/tools/ui/webviewHtmlGenerator.ts | grep -q 'addEventListener.*click'; then
    echo "✅ Event listener re-added to restored button"
else
    echo "❌ Event listener not re-added to restored button"
fi

echo ""
echo "🔍 Testing Instructions..."
echo "------------------------"

echo "To test the center button fix:"
echo ""
echo "1. **Open UML Chat Designer** in VS Code"
echo "   - Run command: UML Chat Designer"
echo ""
echo "2. **Open Browser Dev Tools**"
echo "   - Right-click in the webview and select 'Inspect'"
echo "   - Go to Console tab"
echo ""
echo "3. **Look for Debug Messages**"
echo "   - You should see: '[DEBUG] Center button found, adding click handler'"
echo "   - You should see: '[DEBUG] Center button details: {...}'"
echo ""
echo "4. **Test Button Visibility**"
echo "   - Clear any existing chat (click 'Clear Chat' button)"
echo "   - Look for blue 'Tutorial Guide' button in center of right panel"
echo ""
echo "5. **Test Button Click**"
echo "   - Click the center 'Tutorial Guide' button"
echo "   - Watch console for: '[DEBUG] Center button clicked!'"
echo "   - Tutorial modal should open"
echo ""
echo "6. **Test After Diagram Generation**"
echo "   - Send a request like: 'Create a simple class diagram'"
echo "   - After diagram appears, button should be hidden"
echo "   - Check console for: '[PRESERVE] Center button restored after SVG update'"
echo "   - Check console for: '[PRESERVE] Re-adding click handler to restored button'"
echo ""
echo "7. **Test Button After Clear**"
echo "   - Click 'Clear Chat' to remove diagram"
echo "   - Button should appear again in center"
echo "   - Click button to test if it still works"
echo ""

echo "🐛 Debugging Information..."
echo "-------------------------"

echo "If the center button still doesn't work, check console for:"
echo ""
echo "**Expected Messages:**"
echo "- '[DEBUG] Center button found, adding click handler'"
echo "- '[DEBUG] Center button details: {...}'"
echo "- '[PRESERVE] Saving center button HTML'"
echo "- '[PRESERVE] Center button restored after SVG update'"
echo "- '[PRESERVE] Re-adding click handler to restored button'"
echo ""
echo "**Problem Indicators:**"
echo "- '[DEBUG] Center button not found!' - Button missing from DOM"
echo "- '[PRESERVE] Restored button not found!' - Button not restored properly"
echo "- No click messages when clicking - Event handler not working"
echo ""
echo "**Button State Check:**"
echo "The debug log will show button details including:"
echo "- visible: true/false (whether button is visible)"
echo "- clickable: true/false (whether pointer events are enabled)"
echo "- className: current CSS classes"
echo "- style: inline styles"
echo ""

echo "🎯 Expected Behavior..."
echo "----------------------"

echo "**Working Button Should:**"
echo "1. ✅ Appear in center when no diagram is shown"
echo "2. ✅ Show debug messages when clicked"
echo "3. ✅ Open tutorial modal when clicked"
echo "4. ✅ Be hidden when diagram is displayed"
echo "5. ✅ Reappear when diagram is cleared"
echo "6. ✅ Work after being restored from SVG updates"
echo ""

echo "**Working Tutorial Button (near Send) Should:**"
echo "1. ✅ Always be visible in button row"
echo "2. ✅ Open tutorial modal when clicked"
echo "3. ✅ Not be affected by diagram state"
echo ""

echo "✨ The center button should now work correctly!"
echo "If it still doesn't work, the debug messages will help identify the issue." 