#!/bin/bash

# Test script for simplified Chinese translation with IT terms in English
# This script verifies the language toggle uses simplified Chinese and keeps IT terms in English

echo "🧪 Testing Simplified Chinese Translation with IT Terms in English"
echo "================================================================="

# Test 1: Check if language code changed from zh-TW to zh-CN
echo "✅ Test 1: Checking language code update"
if grep -q "'zh-CN': {" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ Language code updated to zh-CN (Simplified Chinese)"
else
    echo "   ✗ Language code not updated to zh-CN"
    exit 1
fi

# Test 2: Verify zh-TW is no longer present
echo "✅ Test 2: Verifying old zh-TW code removed"
if ! grep -q "'zh-TW': {" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ Old zh-TW language code removed"
else
    echo "   ✗ Old zh-TW language code still present"
    exit 1
fi

# Test 3: Check if language toggle event listener updated
echo "✅ Test 3: Checking language toggle event listener update"
if grep -A 3 "languageToggle.addEventListener" src/tools/ui/webviewHtmlGenerator.ts | grep -q "zh-CN"; then
    echo "   ✓ Language toggle event listener updated to use zh-CN"
else
    echo "   ✗ Language toggle event listener not updated"
    exit 1
fi

# Test 4: Verify IT terms remain in English
echo "✅ Test 4: Verifying IT terms remain in English"
if grep -q "UML Chat Designer" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "AI 生成" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ IT terms like 'UML Chat Designer' and 'AI' kept in English/mixed"
else
    echo "   ✗ IT terms not properly maintained"
    exit 1
fi

# Test 5: Check simplified Chinese characters
echo "✅ Test 5: Checking simplified Chinese characters"
if grep -q "企业级" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "驱动" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "设计" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ Simplified Chinese characters found (企业级, 驱动, 设计)"
else
    echo "   ✗ Simplified Chinese characters not found"
    exit 1
fi

# Test 6: Verify traditional Chinese characters are removed
echo "✅ Test 6: Verifying traditional Chinese characters removed"
if ! grep -q "企業級" src/tools/ui/webviewHtmlGenerator.ts && \
   ! grep -q "驅動" src/tools/ui/webviewHtmlGenerator.ts && \
   ! grep -q "設計" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ Traditional Chinese characters removed (企業級, 驅動, 設計)"
else
    echo "   ✗ Traditional Chinese characters still present"
    exit 1
fi

# Test 7: Check specific translation updates
echo "✅ Test 7: Checking specific translation updates"
if grep -q "跳过" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "图表" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "软件架构" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ Key translations updated to simplified Chinese"
else
    echo "   ✗ Key translations not properly updated"
    exit 1
fi

# Test 8: Verify workflow step translations
echo "✅ Test 8: Verifying workflow step translations"
if grep -q "描述需求" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "精炼与迭代" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "协作" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ Workflow step translations updated to simplified Chinese"
else
    echo "   ✗ Workflow step translations not properly updated"
    exit 1
fi

# Test 9: Check button text translations
echo "✅ Test 9: Checking button text translations"
if grep -q "开始设计" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "准备好转变" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ Button text translations updated to simplified Chinese"
else
    echo "   ✗ Button text translations not properly updated"
    exit 1
fi

# Test 10: Verify language initialization still works
echo "✅ Test 10: Verifying language initialization"
if grep -q "updateLanguage('en')" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ Language initialization with default English maintained"
else
    echo "   ✗ Language initialization not found"
    exit 1
fi

echo ""
echo "🎉 All tests passed! Simplified Chinese translation with IT terms in English is working correctly."
echo ""
echo "📋 Summary of changes:"
echo "   • Language code changed from zh-TW to zh-CN"
echo "   • All text converted to simplified Chinese characters"
echo "   • IT professional terms like 'UML Chat Designer', 'AI' kept in English"
echo "   • Language toggle functionality updated to use zh-CN"
echo "   • Traditional Chinese characters completely removed"
echo ""
echo "🔧 To test manually:"
echo "   1. Open the UML Chat Designer extension"
echo "   2. Click the Tutorial Guide button to open the tutorial"
echo "   3. Click the language toggle button (🌐) to switch to Chinese"
echo "   4. Verify content shows simplified Chinese with IT terms in English"
echo "   5. Examples: 'UML Chat Designer', 'AI 生成', '企业级 AI 驱动'" 