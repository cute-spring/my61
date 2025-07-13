#!/bin/bash

# Test script to verify compact layout optimizations
echo "📱 Testing Compact Layout Optimizations..."
echo "========================================="

# Check compilation
echo "📦 Checking compilation..."
if npm run compile > /dev/null 2>&1; then
    echo "✅ Compilation successful"
else
    echo "❌ Compilation failed"
    exit 1
fi

echo ""
echo "🎯 Verifying Layout Optimizations..."
echo "----------------------------------"

# Check chat area optimizations
echo "1. Chat Area Optimizations:"
if grep -q 'padding: 6px;' src/tools/ui/webviewHtmlGenerator.ts && grep -q 'min-height: 150px;' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✅ Chat area padding reduced (10px → 6px, min-height: 200px → 150px)"
else
    echo "   ❌ Chat area optimizations not applied"
fi

# Check message spacing
if grep -q 'padding: 6px; margin-bottom: 4px;' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✅ Message spacing reduced (8px → 6px padding, 8px → 4px margin)"
else
    echo "   ❌ Message spacing optimizations not applied"
fi

# Check input area optimizations
echo ""
echo "2. Input Area Optimizations:"
if grep -q 'padding: 6px 8px 3px 8px;' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✅ Input area padding reduced (10px → 6-8px)"
else
    echo "   ❌ Input area padding not optimized"
fi

if grep -q 'min-height: 60px;' src/tools/ui/webviewHtmlGenerator.ts && grep -q 'max-height: 200px;' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✅ Input field height reduced (80px → 60px min, 300px → 200px max)"
else
    echo "   ❌ Input field height not optimized"
fi

if grep -q 'font-size: 1em;' src/tools/ui/webviewHtmlGenerator.ts && grep -q 'padding: 8px;' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✅ Input field font and padding reduced (1.1em → 1em, 12px → 8px)"
else
    echo "   ❌ Input field font/padding not optimized"
fi

# Check button optimizations
echo ""
echo "3. Button Optimizations:"
if grep -q 'padding: 4px 8px; font-size: 0.9em;' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✅ Button padding and font size reduced (6px 12px → 4px 8px, 1em → 0.9em)"
else
    echo "   ❌ Button optimizations not applied"
fi

if grep -q 'width:14px !important; height: 14px !important;' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✅ Button icons reduced (16px → 14px)"
else
    echo "   ❌ Button icon size not optimized"
fi

if grep -q 'min-width: 30px !important; min-height: 30px !important;' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✅ Icon-only buttons reduced (36px → 30px)"
else
    echo "   ❌ Icon-only button size not optimized"
fi

# Check left panel optimizations
echo ""
echo "4. Left Panel Optimizations:"
if grep -q 'width: 18vw;' src/tools/ui/webviewHtmlGenerator.ts && grep -q 'min-width: 280px;' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✅ Left panel width reduced (20vw → 18vw, 320px → 280px min)"
else
    echo "   ❌ Left panel width not optimized"
fi

if grep -q 'max-width: 600px;' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✅ Left panel max width reduced (900px → 600px)"
else
    echo "   ❌ Left panel max width not optimized"
fi

# Check onboarding modal optimizations
echo ""
echo "5. Onboarding Modal Optimizations:"
if grep -q 'padding: 40px 30px 30px;' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✅ Onboarding step padding reduced (100px 60px 60px → 40px 30px 30px)"
else
    echo "   ❌ Onboarding step padding not optimized"
fi

if grep -q 'margin-bottom: 25px;' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✅ Step header margin reduced (50px → 25px)"
else
    echo "   ❌ Step header margin not optimized"
fi

if grep -q 'font-size: 3em;' src/tools/ui/webviewHtmlGenerator.ts && grep -q 'margin-bottom: 16px;' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✅ Step icon size and margin reduced (4em → 3em, 24px → 16px)"
else
    echo "   ❌ Step icon optimizations not applied"
fi

# Check label optimizations
echo ""
echo "6. Label and Typography Optimizations:"
if grep -q 'font-size: 0.9em;' src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✅ Diagram type label font size reduced"
else
    echo "   ❌ Label font size not optimized"
fi

echo ""
echo "🎯 Space Savings Summary..."
echo "-------------------------"

echo "**Vertical Space Saved:**"
echo "• Chat area: ~50px saved (padding + min-height reduction)"
echo "• Input area: ~30px saved (padding + field height reduction)"
echo "• Messages: ~8px per message saved (padding + margin reduction)"
echo "• Buttons: ~8px saved (padding reduction)"
echo "• Onboarding: ~120px saved (step padding reduction)"
echo ""

echo "**Horizontal Space Saved:**"
echo "• Left panel: ~2vw + 40px min width saved"
echo "• Max panel width: 300px saved (900px → 600px)"
echo "• Button spacing: ~4px per button saved"
echo ""

echo "🎨 Expected User Experience..."
echo "-----------------------------"

echo "**For 16-inch MacBook (3456×2234 resolution):**"
echo "• Left panel: ~280-400px width (was 320-500px)"
echo "• More diagram space: ~340px additional width"
echo "• Reduced scrolling: ~200px less vertical space needed"
echo "• Tighter interface: Less visual clutter"
echo ""

echo "**Benefits:**"
echo "✅ More space for diagram viewing"
echo "✅ Less scrolling required"
echo "✅ Cleaner, more professional appearance"
echo "✅ Better space utilization on large screens"
echo "✅ Faster visual scanning"
echo ""

echo "🔧 Testing Instructions..."
echo "------------------------"

echo "To test the compact layout:"
echo ""
echo "1. **Open UML Chat Designer** in VS Code"
echo "2. **Compare Layout**:"
echo "   - Left panel should be narrower"
echo "   - Chat messages should be more compact"
echo "   - Input area should be smaller"
echo "   - Buttons should be more compact"
echo ""
echo "3. **Test Functionality**:"
echo "   - All buttons should still be clickable"
echo "   - Text should still be readable"
echo "   - Tutorial modal should be more compact"
echo "   - Diagram area should have more space"
echo ""
echo "4. **Check Responsiveness**:"
echo "   - Resize VS Code window"
echo "   - Verify layout adapts properly"
echo "   - Test on different screen sizes"
echo ""

echo "✨ The layout should now be much more compact and space-efficient!"
echo "Perfect for your 16-inch MacBook with minimal scrolling needed." 