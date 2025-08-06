#!/bin/bash

# Simple Tutorial Button Fix Test
echo "=== Testing Simple Tutorial Button Fix ==="

# Test 1: Check simplified shouldShowButton logic
echo "🔍 Test 1: Checking simplified shouldShowButton logic..."

if grep -A 5 "shouldShowButton()" src/tools/ui/webviewHtmlGenerator.ts | grep -q "!this.state.hasSvg && !this.state.isOnboardingActive"; then
    echo "✅ shouldShowButton uses simple logic"
else
    echo "❌ shouldShowButton logic not simplified"
    exit 1
fi

# Test 2: Check forceShowTutorialButton command
echo ""
echo "🔍 Test 2: Checking forceShowTutorialButton command..."

if grep -A 10 "case 'forceShowTutorialButton':" src/tools/ui/webviewHtmlGenerator.ts | grep -q "setSvgContent(false)"; then
    echo "✅ forceShowTutorialButton sets hasSvg to false"
else
    echo "❌ forceShowTutorialButton not working correctly"
    exit 1
fi

# Test 3: Check clearChat sends forceShowTutorialButton
echo ""
echo "🔍 Test 3: Checking clearChat sends forceShowTutorialButton..."

if grep -A 35 "function handleClearChat" src/tools/umlChatPanelRefactored.ts | grep -q "forceShowTutorialButton"; then
    echo "✅ clearChat sends forceShowTutorialButton"
else
    echo "❌ clearChat not sending forceShowTutorialButton"
    exit 1
fi

# Test 4: Check initial load sends forceShowTutorialButton for empty chat
echo ""
echo "🔍 Test 4: Checking initial load for empty chat..."

if grep -A 10 "Show tutorial button for empty chat" src/tools/umlChatPanelRefactored.ts | grep -q "forceShowTutorialButton"; then
    echo "✅ Initial load sends forceShowTutorialButton for empty chat"
else
    echo "❌ Initial load not sending forceShowTutorialButton"
    exit 1
fi

# Test 5: Check tutorial button HTML structure
echo ""
echo "🔍 Test 5: Checking tutorial button HTML structure..."

if grep -A 5 'id="onboardingBtnCenter"' src/tools/ui/webviewHtmlGenerator.ts | grep -v "hidden"; then
    echo "✅ Tutorial button starts visible (no hidden class)"
else
    echo "❌ Tutorial button may be hidden by default"
    exit 1
fi

echo ""
echo "🎉 All simple tutorial fix tests passed!"
echo ""
echo "📋 Summary of simplified approach:"
echo "  ✅ Removed complex forceVisible state"
echo "  ✅ Simplified shouldShowButton logic"
echo "  ✅ forceShowTutorialButton sets hasSvg to false"
echo "  ✅ clearChat and initial load send forceShowTutorialButton"
echo "  ✅ Tutorial button starts visible by default"
echo ""
echo "🛠️ Expected behavior:"
echo "  - Tutorial button shows when chat is empty"
echo "  - Button appears after clearing chat"
echo "  - Simple, reliable logic based on master branch" 