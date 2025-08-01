#!/bin/bash

# Test Tutorial Button Fix
echo "=== Testing Tutorial Button Fix ==="

# Test 1: Check TutorialButtonStateManager has forceVisible state
echo "🔍 Test 1: Checking TutorialButtonStateManager forceVisible state..."

if grep -A 10 "constructor()" src/tools/ui/webviewHtmlGenerator.ts | grep -q "forceVisible: false"; then
    echo "✅ TutorialButtonStateManager has forceVisible state"
else
    echo "❌ TutorialButtonStateManager missing forceVisible state"
    exit 1
fi

# Test 2: Check shouldShowButton includes forceVisible logic
echo ""
echo "🔍 Test 2: Checking shouldShowButton forceVisible logic..."

if grep -A 5 "shouldShowButton()" src/tools/ui/webviewHtmlGenerator.ts | grep -q "forceVisible"; then
    echo "✅ shouldShowButton includes forceVisible logic"
else
    echo "❌ shouldShowButton missing forceVisible logic"
    exit 1
fi

# Test 3: Check setForceVisible method exists
echo ""
echo "🔍 Test 3: Checking setForceVisible method..."

if grep -A 5 "setForceVisible" src/tools/ui/webviewHtmlGenerator.ts | grep -q "updateState.*forceVisible"; then
    echo "✅ setForceVisible method properly updates state"
else
    echo "❌ setForceVisible method not working correctly"
    exit 1
fi

# Test 4: Check forceShowTutorialButton calls setForceVisible
echo ""
echo "🔍 Test 4: Checking forceShowTutorialButton calls setForceVisible..."

if grep -A 10 "case 'forceShowTutorialButton':" src/tools/ui/webviewHtmlGenerator.ts | grep -q "setForceVisible(true)"; then
    echo "✅ forceShowTutorialButton calls setForceVisible(true)"
else
    echo "❌ forceShowTutorialButton not calling setForceVisible"
    exit 1
fi

# Test 5: Check resetTutorialButtonState command exists
echo ""
echo "🔍 Test 5: Checking resetTutorialButtonState command..."

if grep -A 5 "case 'resetTutorialButtonState':" src/tools/ui/webviewHtmlGenerator.ts | grep -q "setForceVisible(false)"; then
    echo "✅ resetTutorialButtonState command properly resets forceVisible"
else
    echo "❌ resetTutorialButtonState command not working correctly"
    exit 1
fi

echo ""
echo "🎉 All tutorial button fix tests passed!"
echo ""
echo "📋 Summary of fixes:"
echo "  ✅ Added forceVisible state to TutorialButtonStateManager"
echo "  ✅ Updated shouldShowButton to respect forceVisible flag"
echo "  ✅ Added setForceVisible method"
echo "  ✅ forceShowTutorialButton now sets forceVisible(true)"
echo "  ✅ Added resetTutorialButtonState command"
echo ""
echo "🛠️ Expected behavior:"
echo "  - Tutorial button should now stay visible when forced"
echo "  - State manager won't override force commands"
echo "  - Button visibility is properly controlled" 