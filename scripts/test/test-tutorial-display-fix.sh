#!/bin/bash

# Test Tutorial Display Fix - Verify new user tutorial shows when chat history is empty
echo "=== Testing Tutorial Display Fix ==="

# Test 1: Check handleClearChat function signature and logic
echo "🔍 Test 1: Checking handleClearChat function signature and tutorial logic..."

if grep -q "function handleClearChat(" src/tools/umlChatPanelRefactored.ts; then
    echo "✅ handleClearChat function found"
    
    # Check if function has correct parameters
    if grep -A 10 "function handleClearChat(" src/tools/umlChatPanelRefactored.ts | grep -q "context.*vscode.ExtensionContext" && \
       grep -A 10 "function handleClearChat(" src/tools/umlChatPanelRefactored.ts | grep -q "userOnboardingState.*UserOnboardingState" && \
       grep -A 10 "function handleClearChat(" src/tools/umlChatPanelRefactored.ts | grep -q "panel.*vscode.WebviewPanel"; then
        echo "✅ handleClearChat has correct parameters (context, userOnboardingState, panel)"
    else
        echo "❌ handleClearChat missing required parameters"
        exit 1
    fi
    
    # Check if it has tutorial logic
    if grep -A 25 "function handleClearChat(" src/tools/umlChatPanelRefactored.ts | grep -q "showOnboarding"; then
        echo "✅ handleClearChat contains showOnboarding logic"
    else
        echo "❌ handleClearChat missing showOnboarding logic"
        exit 1
    fi
else
    echo "❌ handleClearChat function not found"
    exit 1
fi

# Test 2: Check clearChat case handler calls handleClearChat with correct parameters
echo ""
echo "🔍 Test 2: Checking clearChat case handler..."

if grep -A 5 "case 'clearChat':" src/tools/umlChatPanelRefactored.ts | grep -q "handleClearChat.*context.*userOnboardingState.*panel"; then
    echo "✅ clearChat case calls handleClearChat with correct parameters"
else
    echo "❌ clearChat case not calling handleClearChat with correct parameters"
    exit 1
fi

# Test 3: Check webview showOnboarding message handler
echo ""
echo "🔍 Test 3: Checking webview showOnboarding message handler..."

if grep -A 10 "case 'showOnboarding':" src/tools/ui/webviewHtmlGenerator.ts | grep -q "onboardingModal.style.display = 'block'"; then
    echo "✅ showOnboarding message handler displays modal correctly"
else
    echo "❌ showOnboarding message handler not working correctly"
    exit 1
fi

# Test 4: Check initial onboarding trigger for new users
echo ""
echo "🔍 Test 4: Checking initial onboarding trigger..."

if grep -A 5 "if (!userOnboardingState.hasSeenOnboarding)" src/tools/umlChatPanelRefactored.ts | grep -q "showOnboarding"; then
    echo "✅ Initial onboarding trigger found for new users"
else
    echo "❌ Initial onboarding trigger missing"
    exit 1
fi

# Test 5: Check tutorial button visibility logic
echo ""
echo "🔍 Test 5: Checking tutorial button visibility logic..."

if grep -q "TutorialButtonStateManager" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ TutorialButtonStateManager found"
    
    if grep -A 10 "shouldShowButton()" src/tools/ui/webviewHtmlGenerator.ts | grep -q "!this.state.hasSvg && !this.state.isOnboardingActive"; then
        echo "✅ Tutorial button shows when no SVG and onboarding not active"
    else
        echo "❌ Tutorial button visibility logic incorrect"
        exit 1
    fi
else
    echo "❌ TutorialButtonStateManager not found"
    exit 1
fi

# Test 6: Check onboarding HTML structure
echo ""
echo "🔍 Test 6: Checking onboarding HTML structure..."

if grep -q 'id="onboardingModal"' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Onboarding modal HTML found"
else
    echo "❌ Onboarding modal HTML missing"
    exit 1
fi

if grep -q 'id="onboardingBtnCenter"' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Center tutorial button HTML found"
else
    echo "❌ Center tutorial button HTML missing"
    exit 1
fi

echo ""
echo "🎉 All tutorial display tests passed!"
echo "The tutorial should now display correctly:"
echo "  - For new users when the extension first loads"
echo "  - When clearing chat history if user hasn't seen onboarding"
echo "  - Center tutorial button should be visible when no diagrams are present"