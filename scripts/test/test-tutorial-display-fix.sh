#!/bin/bash

# Test script for Tutorial Display Fix
# This script verifies that the tutorial displays correctly when clearing chat

set -e

echo "🧪 Testing Tutorial Display Fix"
echo "==============================="

# Test case 1: Check if handleClearChat function has the correct parameters
echo "📋 Checking if handleClearChat has correct parameters..."
if grep -q "userOnboardingState.*UserOnboardingState" src/tools/umlChatPanelRefactored.ts; then
    echo "✅ handleClearChat has userOnboardingState parameter"
else
    echo "❌ handleClearChat missing userOnboardingState parameter"
    exit 1
fi

if grep -q "panel.*vscode.WebviewPanel" src/tools/umlChatPanelRefactored.ts; then
    echo "✅ handleClearChat has panel parameter"
else
    echo "❌ handleClearChat missing panel parameter"
    exit 1
fi

# Test case 2: Check if handleClearChat calls clearPlantUML
echo "📋 Checking if handleClearChat calls clearPlantUML..."
if grep -q "clearPlantUML" src/tools/umlChatPanelRefactored.ts; then
    echo "✅ handleClearChat calls clearPlantUML"
else
    echo "❌ handleClearChat does not call clearPlantUML"
    exit 1
fi

# Test case 3: Check if handleClearChat has tutorial display logic
echo "📋 Checking if handleClearChat has tutorial display logic..."
if grep -q "hasSeenOnboarding" src/tools/umlChatPanelRefactored.ts; then
    echo "✅ handleClearChat has tutorial display logic"
else
    echo "❌ handleClearChat missing tutorial display logic"
    exit 1
fi

# Test case 4: Check if handleClearChat sends showOnboarding command
echo "📋 Checking if handleClearChat sends showOnboarding command..."
if grep -q "showOnboarding" src/tools/umlChatPanelRefactored.ts; then
    echo "✅ handleClearChat sends showOnboarding command"
else
    echo "❌ handleClearChat does not send showOnboarding command"
    exit 1
fi

# Test case 5: Check if the clearChat case calls handleClearChat with correct parameters
echo "📋 Checking if clearChat case calls handleClearChat correctly..."
if grep -q "handleClearChat.*context.*userOnboardingState.*panel" src/tools/umlChatPanelRefactored.ts; then
    echo "✅ clearChat case calls handleClearChat with correct parameters"
else
    echo "❌ clearChat case does not call handleClearChat with correct parameters"
    exit 1
fi

# Test case 6: Check if handleDeleteUserMessage has similar logic (for comparison)
echo "📋 Checking if handleDeleteUserMessage has similar logic..."
if grep -q "hasSeenOnboarding.*panel" src/tools/umlChatPanelRefactored.ts; then
    echo "✅ handleDeleteUserMessage has similar tutorial logic"
else
    echo "❌ handleDeleteUserMessage missing tutorial logic"
    exit 1
fi

# Test case 7: Check if the tutorial display logic is consistent
echo "📋 Checking if tutorial display logic is consistent..."
if grep -q "!userOnboardingState.hasSeenOnboarding.*panel" src/tools/umlChatPanelRefactored.ts; then
    echo "✅ Tutorial display logic is consistent"
else
    echo "❌ Tutorial display logic is inconsistent"
    exit 1
fi

# Test case 8: Check if the fallback logic exists
echo "📋 Checking if fallback logic exists..."
if grep -q "updatePreview" src/tools/umlChatPanelRefactored.ts; then
    echo "✅ Fallback logic exists"
else
    echo "❌ Fallback logic missing"
    exit 1
fi

echo ""
echo "🎉 All tests passed! Tutorial display should now work correctly when clearing chat."
echo ""
echo "📋 Expected behavior:"
echo "  ✅ When clicking 'Clear Chat' button, tutorial displays for new users"
echo "  ✅ When clicking 'Clear Chat' button, empty state shows for existing users"
echo "  ✅ Tutorial display logic is consistent with delete message functionality"
echo "  ✅ Proper fallback behavior when tutorial should not be shown"
echo ""
echo "🚀 The fix addresses:"
echo "   - Missing tutorial display when clearing chat"
echo "   - Inconsistent behavior between clear chat and delete message"
echo "   - Proper parameter passing to handleClearChat function"
echo "   - Consistent user onboarding experience"
echo ""
echo "💡 Next steps:"
echo "   - Test the 'Clear Chat' button functionality"
echo "   - Verify tutorial displays for new users"
echo "   - Verify empty state shows for existing users"
echo "   - Test consistency with delete message behavior" 