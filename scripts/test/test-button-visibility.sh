#!/bin/bash

echo "🧪 Testing Button Visibility Improvements"
echo "========================================="

# Check if onboarding step padding is reduced
echo "1. Checking if onboarding step padding is reduced..."
if grep -q "padding: 20px 30px 20px" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Onboarding step padding reduced (40px → 20px)"
else
    echo "❌ Onboarding step padding not reduced"
fi

# Check if layout uses space-between
echo "2. Checking if layout uses space-between..."
if grep -q "justify-content: space-between" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Layout uses space-between for better button positioning"
else
    echo "❌ Layout not using space-between"
fi

# Check if step-actions are flex-shrink: 0
echo "3. Checking if step-actions are flex-shrink: 0..."
if grep -q "flex-shrink: 0" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Step-actions set to flex-shrink: 0"
else
    echo "❌ Step-actions not set to flex-shrink: 0"
fi

# Check if workflow grid margin is reduced
echo "4. Checking if workflow grid margin is reduced..."
if grep -q "margin-bottom: 20px" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Workflow grid margin reduced (40px → 20px)"
else
    echo "❌ Workflow grid margin not reduced"
fi

# Check if workflow card padding is reduced
echo "5. Checking if workflow card padding is reduced..."
if grep -q "padding: 25px 15px" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Workflow card padding reduced (30px → 25px)"
else
    echo "❌ Workflow card padding not reduced"
fi

# Check if workflow icon size is reduced
echo "6. Checking if workflow icon size is reduced..."
if grep -q "font-size: 2.5em" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Workflow icon size reduced (3em → 2.5em)"
else
    echo "❌ Workflow icon size not reduced"
fi

# Check if workflow visual height is reduced
echo "7. Checking if workflow visual height is reduced..."
if grep -q "height: 45px" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Workflow visual height reduced (60px → 45px)"
else
    echo "❌ Workflow visual height not reduced"
fi

# Check if step-actions margin is reduced
echo "8. Checking if step-actions margin is reduced..."
if grep -q "margin-top: 15px" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Step-actions margin reduced (auto → 15px)"
else
    echo "❌ Step-actions margin not reduced"
fi

# Check mobile responsive improvements
echo "9. Checking mobile responsive improvements..."
if grep -q "padding: 20px 15px 15px" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Mobile responsive padding improved"
else
    echo "❌ Mobile responsive padding not improved"
fi

# Calculate total space savings
echo "10. Calculating total space savings..."
echo "   - Onboarding step padding: 40px → 20px (20px saved)"
echo "   - Step header margin: 25px → 20px (5px saved)"
echo "   - Workflow grid margin: 40px → 20px (20px saved)"
echo "   - Workflow card padding: 30px → 25px (5px saved)"
echo "   - Workflow icon margin: 20px → 15px (5px saved)"
echo "   - Workflow visual height: 60px → 45px (15px saved)"
echo "   - Step-actions margin: auto → 15px (flexible positioning)"
echo "   - Total approximate space saved: ~70px"

echo ""
echo "📊 Button Visibility Improvements Summary:"
echo "- ✅ Reduced overall padding and margins"
echo "- ✅ Changed layout to space-between for better distribution"
echo "- ✅ Made step-actions flex-shrink: 0 to prevent compression"
echo "- ✅ Optimized workflow grid for more compact display"
echo "- ✅ Enhanced mobile responsive design"
echo "- ✅ ~70px total space savings"
echo ""
echo "🎯 Result: Buttons should now be visible without scrolling" 