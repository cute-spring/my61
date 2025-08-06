#!/bin/bash

# Test Single Tutorial Button Implementation
echo "=== Testing Single Tutorial Button Implementation ==="

# Test 1: Check only one tutorial button exists
echo "🔍 Test 1: Checking only one tutorial button exists..."

tutorialBtnCount=$(grep -c 'id="tutorialBtn"' src/tools/ui/webviewHtmlGenerator.ts)
onboardingBtnCount=$(grep -c 'id="onboardingBtn"' src/tools/ui/webviewHtmlGenerator.ts)
onboardingBtnCenterCount=$(grep -c 'id="onboardingBtnCenter"' src/tools/ui/webviewHtmlGenerator.ts)

echo "  - tutorialBtn count: $tutorialBtnCount"
echo "  - onboardingBtn count: $onboardingBtnCount"
echo "  - onboardingBtnCenter count: $onboardingBtnCenterCount"

if [ "$tutorialBtnCount" -eq 1 ] && [ "$onboardingBtnCount" -eq 0 ] && [ "$onboardingBtnCenterCount" -eq 0 ]; then
    echo "✅ Only one tutorial button (tutorialBtn) exists"
else
    echo "❌ Multiple tutorial buttons found"
    exit 1
fi

# Test 2: Check tutorial button is in utility actions
echo ""
echo "🔍 Test 2: Checking tutorial button position..."

if grep -A 10 "utility-actions" src/tools/ui/webviewHtmlGenerator.ts | grep -q "tutorialBtn"; then
    echo "✅ Tutorial button positioned in utility actions"
else
    echo "❌ Tutorial button not in utility actions"
    exit 1
fi

# Test 3: Check no tutorial button in dropdown
echo ""
echo "🔍 Test 3: Checking no tutorial button in dropdown..."

if ! grep -A 20 "dropdown-content" src/tools/ui/webviewHtmlGenerator.ts | grep -q "Tutorial Guide"; then
    echo "✅ No tutorial button in dropdown menu"
else
    echo "❌ Tutorial button still exists in dropdown"
    exit 1
fi

# Test 4: Check tutorial button has correct styling
echo ""
echo "🔍 Test 4: Checking tutorial button styling..."

if grep -A 5 "Tutorial Button Styling" src/tools/ui/webviewHtmlGenerator.ts | grep -q "tutorial-btn"; then
    echo "✅ Tutorial button has correct styling"
else
    echo "❌ Tutorial button styling missing"
    exit 1
fi

# Test 5: Check tutorial button event listener
echo ""
echo "🔍 Test 5: Checking tutorial button event listener..."

if grep -A 10 "Fixed tutorial button functionality" src/tools/ui/webviewHtmlGenerator.ts | grep -q "addEventListener"; then
    echo "✅ Tutorial button has event listener"
else
    echo "❌ Tutorial button event listener missing"
    exit 1
fi

# Test 6: Check no forceShowTutorialButton commands
echo ""
echo "🔍 Test 6: Checking no forceShowTutorialButton commands..."

if ! grep -r "forceShowTutorialButton" src/tools/; then
    echo "✅ No forceShowTutorialButton commands found"
else
    echo "❌ forceShowTutorialButton commands still exist"
    exit 1
fi

echo ""
echo "🎉 All single tutorial button tests passed!"
echo ""
echo "📋 Summary of single tutorial button:"
echo "  ✅ Only one tutorial button exists (tutorialBtn)"
echo "  ✅ Positioned in utility actions area"
echo "  ✅ No tutorial button in dropdown menu"
echo "  ✅ No center tutorial button"
echo "  ✅ No forceShowTutorialButton commands"
echo "  ✅ Clean, simple implementation"
echo ""
echo "🛠️ Expected behavior:"
echo "  - Only one orange tutorial button in chat area"
echo "  - Always visible and accessible"
echo "  - No redundant buttons or commands" 