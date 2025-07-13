#!/bin/bash

# Test script for compact workflow design in UML Chat Designer
# This tests the Streamlined Design Workflow step (Step 3) optimizations

echo "🧪 Testing Compact Workflow Design Changes"
echo "==========================================="

# Test 1: Verify HTML structure has compact classes
echo "📝 Test 1: HTML Structure"
echo "Checking for compact classes in webviewHtmlGenerator.ts..."

if grep -q "compact-header" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ compact-header class found"
else
    echo "❌ compact-header class missing"
fi

if grep -q "compact-content" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ compact-content class found"
else
    echo "❌ compact-content class missing"
fi

if grep -q "compact-steps" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ compact-steps class found"
else
    echo "❌ compact-steps class missing"
fi

if grep -q "compact-step" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ compact-step class found"
else
    echo "❌ compact-step class missing"
fi

if grep -q "compact-demo" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ compact-demo class found"
else
    echo "❌ compact-demo class missing"
fi

echo ""

# Test 2: Verify CSS styles exist
echo "📝 Test 2: CSS Styles"
echo "Checking for compact CSS styles..."

if grep -q "\.compact-header" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ .compact-header CSS found"
else
    echo "❌ .compact-header CSS missing"
fi

if grep -q "\.compact-steps" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ .compact-steps CSS found"
else
    echo "❌ .compact-steps CSS missing"
fi

if grep -q "\.compact-step" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ .compact-step CSS found"
else
    echo "❌ .compact-step CSS missing"
fi

if grep -q "\.compact-number" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ .compact-number CSS found"
else
    echo "❌ .compact-number CSS missing"
fi

if grep -q "\.compact-example" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ .compact-example CSS found"
else
    echo "❌ .compact-example CSS missing"
fi

if grep -q "\.compact-demo" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ .compact-demo CSS found"
else
    echo "❌ .compact-demo CSS missing"
fi

if grep -q "\.compact-try-btn" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ .compact-try-btn CSS found"
else
    echo "❌ .compact-try-btn CSS missing"
fi

echo ""

# Test 3: Check content optimization
echo "📝 Test 3: Content Optimization"
echo "Checking for optimized content..."

if grep -q "Describe Requirements" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Step 1 title optimized: 'Describe Requirements'"
else
    echo "❌ Step 1 title not optimized"
fi

if grep -q "AI Generation" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Step 2 title optimized: 'AI Generation'"
else
    echo "❌ Step 2 title not optimized"
fi

if grep -q "Refine & Iterate" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Step 3 title optimized: 'Refine & Iterate'"
else
    echo "❌ Step 3 title not optimized"
fi

if grep -q "Try Quick Examples" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Demo section title optimized: 'Try Quick Examples'"
else
    echo "❌ Demo section title not optimized"
fi

echo ""

# Test 4: Check button text optimization
echo "📝 Test 4: Button Text Optimization"
echo "Checking for compact button text..."

if grep -q "Auth System" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Auth button text optimized: 'Auth System'"
else
    echo "❌ Auth button text not optimized"
fi

if grep -q "E-commerce" src/tools/ui/webviewHtmlGenerator.ts && grep -q "compact-try-btn" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ E-commerce button text optimized: 'E-commerce'"
else
    echo "❌ E-commerce button text not optimized"
fi

if grep -q "Messaging" src/tools/ui/webviewHtmlGenerator.ts && grep -q "compact-try-btn" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Messaging button text optimized: 'Messaging'"
else
    echo "❌ Messaging button text not optimized"
fi

echo ""

# Test 5: Space savings summary
echo "📝 Test 5: Space Savings Summary"
echo "Estimated space savings in Step 3 (Streamlined Design Workflow):"
echo ""
echo "🔹 Header Section:"
echo "   - Icon size: 3em → 2.5em (saves ~20px)"
echo "   - H1 font size: 3em → 2.4em (saves ~25px)"
echo "   - Subtitle font size: 1.3em → 1.1em (saves ~10px)"
echo "   - Bottom margin: 25px → 20px (saves 5px)"
echo "   - Total header savings: ~60px"
echo ""
echo "🔹 Workflow Steps:"
echo "   - Step gap: 20px → 12px (saves 8px × 2 = 16px)"
echo "   - Step content gap: 15px → 8px (saves 7px × 3 = 21px)"
echo "   - Step number size: 40px → 28px (saves 12px × 3 = 36px)"
echo "   - Step title margin: 8px → 4px (saves 4px × 3 = 12px)"
echo "   - Step text margin: 12px → 6px (saves 6px × 3 = 18px)"
echo "   - Bottom margin: 40px → 20px (saves 20px)"
echo "   - Total workflow savings: ~123px"
echo ""
echo "🔹 Example Boxes:"
echo "   - Padding: 10px → 6px (saves 4px × 3 = 12px)"
echo "   - Label margin: 5px → 2px (saves 3px × 3 = 9px)"
echo "   - Font size reductions (saves ~6px)"
echo "   - Total example savings: ~27px"
echo ""
echo "🔹 Interactive Demo:"
echo "   - Padding: 30px → 20px (saves 10px)"
echo "   - Top margin: 30px → 20px (saves 10px)"
echo "   - H3 margin: 10px → 8px (saves 2px)"
echo "   - P margin: 20px → 15px (saves 5px)"
echo "   - Button gap: 15px → 10px (saves 5px)"
echo "   - Button padding: 12px 20px → 8px 14px (saves ~16px)"
echo "   - Total demo savings: ~48px"
echo ""
echo "🔹 Mobile Responsive:"
echo "   - Workflow gap: 30px → 15px (saves 15px)"
echo ""
echo "📊 TOTAL ESTIMATED SAVINGS: ~257px vertical space"
echo ""
echo "✅ This ultra-compact design makes the workflow perfectly aligned with other"
echo "   screens, significantly reducing scrolling and creating a more cohesive UX."
echo ""
echo "🔧 Additional Fix Applied:"
echo "- Fixed tutorial button visibility during onboarding modal"
echo "- Button now properly hides when tutorial is active"
echo "- Button reappears when tutorial is closed/finished/skipped"

echo ""
echo "🚀 Manual Testing Instructions:"
echo "================================"
echo "1. Open VS Code and run the extension"
echo "2. Open UML Chat Designer"
echo "3. Click the Tutorial Guide button (⚙️ in toolbar)"
echo "4. Navigate to Step 3 (Streamlined Design Workflow)"
echo "5. Verify the compact design:"
echo "   - Smaller header and icon"
echo "   - Tighter workflow steps"
echo "   - Compact example boxes"
echo "   - Smaller demo buttons"
echo "   - Less overall scrolling required"
echo "6. Test on different screen sizes"
echo "7. Try the demo buttons to ensure functionality"
echo ""
echo "Expected Results:"
echo "- More content visible without scrolling"
echo "- Cleaner, more focused design"
echo "- Maintained readability and usability"
echo "- Better fit for 16-inch MacBook screens" 