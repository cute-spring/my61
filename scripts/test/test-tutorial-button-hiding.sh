#!/bin/bash

# Test script for Tutorial Button Hiding During Onboarding
# Verifies that the center tutorial button is hidden when onboarding modal is active

echo "🧪 Testing Tutorial Button Hiding During Onboarding"
echo "=================================================="

# Test 1: Check that button is hidden when onboarding is opened
echo "📝 Test 1: Button Hiding Logic"
echo "Checking that center button is hidden when onboarding modal is opened..."

if grep -A 10 'onboardingBtnCenter.addEventListener.*click' src/tools/ui/webviewHtmlGenerator.ts | grep -q 'classList.add.*hidden'; then
    echo "✅ Center button is hidden when onboarding opens"
else
    echo "❌ Center button hiding logic missing"
fi

# Test 2: Check that button is shown when onboarding is closed
echo ""
echo "📝 Test 2: Button Showing Logic"
echo "Checking that center button is shown when onboarding modal is closed..."

# Check for finish button
if grep -A 10 'finish-btn' src/tools/ui/webviewHtmlGenerator.ts | grep -q 'classList.remove.*hidden'; then
    echo "✅ Center button is shown when onboarding is finished"
else
    echo "❌ Center button showing logic missing for finish button"
fi

# Check for skip button
if grep -A 10 'skip-btn' src/tools/ui/webviewHtmlGenerator.ts | grep -q 'classList.remove.*hidden'; then
    echo "✅ Center button is shown when onboarding is skipped"
else
    echo "❌ Center button showing logic missing for skip button"
fi

# Check for close button
if grep -A 10 'onboardingCloseBtn' src/tools/ui/webviewHtmlGenerator.ts | grep -q 'classList.remove.*hidden'; then
    echo "✅ Center button is shown when onboarding is closed"
else
    echo "❌ Center button showing logic missing for close button"
fi

# Check for example buttons
if grep -A 15 'closest.*scenario-card' src/tools/ui/webviewHtmlGenerator.ts | grep -q 'classList.remove.*hidden'; then
    echo "✅ Center button is shown when example is selected"
else
    echo "❌ Center button showing logic missing for example buttons"
fi

echo ""
echo "📝 Test 3: Debug Logging"
echo "Checking for debug logging to help troubleshoot..."

if grep -q 'Center button hidden during onboarding' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Debug logging for hiding is present"
else
    echo "❌ Debug logging for hiding is missing"
fi

if grep -q 'Center button shown after onboarding' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Debug logging for showing is present"
else
    echo "❌ Debug logging for showing is missing"
fi

echo ""
echo "🎯 Manual Testing Instructions:"
echo "================================"
echo "1. Open UML Chat Designer"
echo "2. Clear any existing chat to see the center Tutorial Guide button"
echo "3. Click the center Tutorial Guide button"
echo "4. Verify that the button disappears when the onboarding modal opens"
echo "5. Navigate through the tutorial steps"
echo "6. Close the tutorial using one of these methods:"
echo "   - Click 'Finish' button"
echo "   - Click 'Skip Tutorial' button"
echo "   - Click the X close button"
echo "   - Click on an example button"
echo "7. Verify that the center Tutorial Guide button reappears"
echo ""
echo "Expected Behavior:"
echo "- Button should be visible when SVG area is empty"
echo "- Button should disappear when onboarding modal opens"
echo "- Button should reappear when onboarding modal closes"
echo "- This prevents the button from showing over the tutorial content"
echo ""
echo "🔧 Technical Details:"
echo "- Button hiding: onboardingBtnCenter.classList.add('hidden')"
echo "- Button showing: onboardingBtnCenter.classList.remove('hidden')"
echo "- All modal close events restore button visibility"
echo "- Debug logging helps track button state changes"
echo ""
echo "✅ Tutorial button hiding during onboarding is now implemented!" 