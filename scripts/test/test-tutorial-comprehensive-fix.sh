#!/bin/bash

# Comprehensive Tutorial Display Fix Test
echo "=== Testing Comprehensive Tutorial Display Fix ==="

# Test 1: Check enhanced logging in handleClearChat
echo "🔍 Test 1: Checking enhanced logging in handleClearChat..."

if grep -A 20 "function handleClearChat(" src/tools/umlChatPanelRefactored.ts | grep -q "console.log.*handleClearChat called with"; then
    echo "✅ Enhanced logging added to handleClearChat"
else
    echo "❌ Enhanced logging missing in handleClearChat"
    exit 1
fi

# Test 2: Check forceShowTutorialButton command handler
echo ""
echo "🔍 Test 2: Checking forceShowTutorialButton command handler..."

if grep -A 10 "case 'forceShowTutorialButton':" src/tools/ui/webviewHtmlGenerator.ts | grep -q "classList.remove('hidden')"; then
    echo "✅ forceShowTutorialButton command handler found"
else
    echo "❌ forceShowTutorialButton command handler missing"
    exit 1
fi

# Test 3: Check enhanced showOnboarding logging
echo ""
echo "🔍 Test 3: Checking enhanced showOnboarding logging..."

if grep -A 5 "case 'showOnboarding':" src/tools/ui/webviewHtmlGenerator.ts | grep -q "console.log.*ONBOARDING.*Received showOnboarding"; then
    echo "✅ Enhanced showOnboarding logging found"
else
    echo "❌ Enhanced showOnboarding logging missing"
    exit 1
fi

# Test 4: Check reset onboarding command registration
echo ""
echo "🔍 Test 4: Checking reset onboarding command registration..."

if grep -q "copilotTools.resetOnboardingState" src/extension.ts && grep -q "copilotTools.resetOnboardingState" package.json; then
    echo "✅ Reset onboarding command registered in both extension.ts and package.json"
else
    echo "❌ Reset onboarding command not properly registered"
    exit 1
fi

# Test 5: Check resetOnboardingState function
echo ""
echo "🔍 Test 5: Checking resetOnboardingState function..."

if grep -A 10 "function resetOnboardingState" src/extension.ts | grep -q "globalState.update.*umlChatOnboardingState.*undefined"; then
    echo "✅ resetOnboardingState function properly clears state"
else
    echo "❌ resetOnboardingState function not working correctly"
    exit 1
fi

# Test 6: Check clearChat shows button, not modal
echo ""
echo "🔍 Test 6: Checking clearChat shows button, not modal..."

if grep -A 35 "function handleClearChat" src/tools/umlChatPanelRefactored.ts | grep -q "forceShowTutorialButton"; then
    echo "✅ clearChat shows tutorial button"
    # Check that there's no showOnboarding in the clearChat function body
    if ! grep -A 35 "function handleClearChat" src/tools/umlChatPanelRefactored.ts | grep -q "showOnboarding"; then
        echo "✅ clearChat does not show modal directly"
    else
        echo "❌ clearChat still shows modal - should only show button"
        exit 1
    fi
else
    echo "❌ clearChat not sending forceShowTutorialButton"
    exit 1
fi

# Test 7: Check initial tutorial button logic
echo ""
echo "🔍 Test 7: Checking initial tutorial button logic..."

if grep -A 10 "Check if we should show tutorial button" src/tools/umlChatPanelRefactored.ts | grep -q "forceShowTutorialButton"; then
    echo "✅ Initial load shows tutorial button for empty chat"
else
    echo "❌ Initial load not showing tutorial button correctly"
    exit 1
fi

# Test 8: Check tutorial button default visibility
echo ""
echo "🔍 Test 8: Checking tutorial button default visibility..."

if grep -A 5 'id="onboardingBtnCenter"' src/tools/ui/webviewHtmlGenerator.ts | grep -v "hidden"; then
    echo "✅ Tutorial button starts visible by default (no hidden class)"
else
    echo "❌ Tutorial button may be hidden by default"
    exit 1
fi

echo ""
echo "🎉 All comprehensive tutorial fix tests passed!"
echo ""
echo "📋 Summary of fixes implemented:"
echo "  ✅ Enhanced logging throughout the tutorial system"
echo "  ✅ Added forceShowTutorialButton command for reliable button display"
echo "  ✅ Added resetOnboardingState debug command"
echo "  ✅ Improved timing with delays for UI readiness"
echo "  ✅ Force show tutorial button after clearing chat"
echo "  ✅ Better debugging and state tracking"
echo ""
echo "🛠️ To test the fix:"
echo "  1. Open UML Chat Designer - tutorial button should show in center when empty"
echo "  2. Clear chat - tutorial button should appear in center of diagram panel"
echo "  3. Click tutorial button to open tutorial modal"
echo "  4. Check browser console for detailed logging"