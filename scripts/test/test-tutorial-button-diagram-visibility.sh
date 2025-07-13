#!/bin/bash

# Test script for Tutorial Button Diagram Visibility
# Tests that the center tutorial button is visible when no diagram is rendered
# and hidden when a diagram is rendered

echo "🧪 Testing Tutorial Button Diagram Visibility..."
echo "================================================"

# Test 1: Button visible when no diagram
echo "Test 1: Button should be visible when no diagram is rendered"
echo "- Open UML Chat Designer"
echo "- Check that blue 'Tutorial Guide' button is visible in center of right panel"
echo "- Button should be positioned over empty SVG area"

# Test 2: Button hidden when diagram is rendered  
echo ""
echo "Test 2: Button should be hidden when diagram is rendered"
echo "- In UML Chat Designer, send a request: 'Create a simple class diagram for a User class'"
echo "- Wait for AI to generate and render the diagram"
echo "- Check that blue 'Tutorial Guide' button is no longer visible"
echo "- Button should be hidden behind/under the rendered diagram"

# Test 3: Button visible again when diagram is cleared
echo ""
echo "Test 3: Button should be visible again when diagram is cleared"
echo "- Click 'Clear Chat' button to remove all chat history and diagrams"
echo "- Check that blue 'Tutorial Guide' button becomes visible again"
echo "- Button should appear in center of empty SVG area"

# Test 4: Button behavior with multiple diagrams
echo ""
echo "Test 4: Button behavior with multiple diagrams"
echo "- Send another request: 'Create a sequence diagram for login process'"
echo "- Check that button remains hidden when new diagram is rendered"
echo "- Click on previous bot message to render old diagram"
echo "- Check that button stays hidden when switching between diagrams"

# Test 5: Button behavior with onboarding modal
echo ""
echo "Test 5: Button behavior with onboarding modal"
echo "- Clear chat to show button again"
echo "- Click the visible 'Tutorial Guide' button to open onboarding"
echo "- Check that button is hidden while onboarding modal is open"
echo "- Close onboarding modal"
echo "- Check that button becomes visible again (since no diagram is rendered)"

# Test 6: Button behavior with error states
echo ""
echo "Test 6: Button behavior with error states"
echo "- Send a request that might cause an error or invalid diagram"
echo "- Check button visibility when diagram rendering fails"
echo "- Button should be visible if no valid SVG content is rendered"

echo ""
echo "Expected Results:"
echo "✅ Button visible when SVG area is empty"
echo "✅ Button hidden when diagram is rendered"
echo "✅ Button hidden when onboarding modal is active"
echo "✅ Button visible again when chat is cleared"
echo "✅ Button remains hidden when switching between rendered diagrams"
echo "✅ Button visible when diagram rendering fails"

echo ""
echo "Debug Console Messages to Look For:"
echo "- 'Showing center tutorial button - no diagram rendered'"
echo "- 'Hiding center tutorial button - diagram is rendered'"
echo "- 'checkEmptyState called: { hasSvg: true/false, ... }'"

echo ""
echo "Manual Test Instructions:"
echo "1. Open VS Code"
echo "2. Run command: 'UML Chat Designer'"
echo "3. Follow the test steps above"
echo "4. Check console (F12) for debug messages"
echo "5. Verify button visibility matches expected behavior"

echo ""
echo "🎯 Success Criteria:"
echo "- Button is only visible when no diagram is rendered"
echo "- Button is hidden whenever a diagram is displayed"
echo "- Button visibility updates correctly on content changes"
echo "- Console logs show correct state transitions" 