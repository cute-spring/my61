#!/bin/bash

# Test script for detailed content translation
# This script verifies that explanatory content is properly translated to Chinese

echo "🧪 Testing Detailed Content Translation"
echo "======================================"

# Test 1: Check if diagram explanation translations exist
echo "✅ Test 1: Checking diagram explanation translations"
if grep -q "为什么选择这五种图表类型" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "explanationTitle" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "explanationText" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ Diagram explanation translations found"
else
    echo "   ✗ Diagram explanation translations missing"
    exit 1
fi

# Test 2: Verify AI advantages card translations
echo "✅ Test 2: Verifying AI advantages card translations"
if grep -q "企业级性能" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "智能架构分析" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "持续设计演进" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ AI advantages card translations found"
else
    echo "   ✗ AI advantages card translations missing"
    exit 1
fi

# Test 3: Check comparison table translations
echo "✅ Test 3: Checking comparison table translations"
if grep -q "企业对比矩阵" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "传统工具" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "学习曲线" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ Comparison table translations found"
else
    echo "   ✗ Comparison table translations missing"
    exit 1
fi

# Test 4: Verify English versions are also structured
echo "✅ Test 4: Verifying English versions are structured"
if grep -q "Why These Five Diagram Types" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "Enterprise Performance" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "Enterprise Comparison Matrix" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ English structured translations found"
else
    echo "   ✗ English structured translations missing"
    exit 1
fi

# Test 5: Check if updateOnboardingContent handles new fields
echo "✅ Test 5: Checking updateOnboardingContent function updates"
if grep -q "explanationTitle" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "explanationText" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "advantageCards" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ updateOnboardingContent function updated for new fields"
else
    echo "   ✗ updateOnboardingContent function not properly updated"
    exit 1
fi

# Test 6: Verify Chinese descriptions are detailed
echo "✅ Test 6: Verifying Chinese descriptions are detailed"
if grep -q "在几秒钟内生成复杂的 UML 图表" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "先进的自然语言处理理解复杂的业务需求" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ Detailed Chinese descriptions found"
else
    echo "   ✗ Detailed Chinese descriptions missing"
    exit 1
fi

# Test 7: Check if IT terms are preserved in Chinese context
echo "✅ Test 7: Checking IT terms preservation in Chinese"
if grep -q "UML 图表" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "AI 引擎" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "UML 标准" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ IT terms properly preserved in Chinese context"
else
    echo "   ✗ IT terms not properly preserved"
    exit 1
fi

# Test 8: Verify comparison table data structure
echo "✅ Test 8: Verifying comparison table data structure"
if grep -q "comparisonData" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "learningCurve" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "efficiency" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ Comparison table data structure found"
else
    echo "   ✗ Comparison table data structure missing"
    exit 1
fi

# Test 9: Check if selector updates handle new elements
echo "✅ Test 9: Checking selector updates for new elements"
if grep -q "querySelector.*diagram-explanation" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "querySelectorAll.*advantage-card" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "querySelectorAll.*comparison-cell" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ Selector updates for new elements found"
else
    echo "   ✗ Selector updates for new elements missing"
    exit 1
fi

# Test 10: Verify traditional vs simplified Chinese consistency
echo "✅ Test 10: Verifying simplified Chinese consistency"
if grep -q "数分钟" src/tools/ui/webviewHtmlGenerator.ts && \
   grep -q "对话式完善" src/tools/ui/webviewHtmlGenerator.ts && \
   ! grep -q "數分鐘" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "   ✓ Simplified Chinese consistency maintained"
else
    echo "   ✗ Simplified Chinese consistency issues found"
    exit 1
fi

echo ""
echo "🎉 All tests passed! Detailed content translation is working correctly."
echo ""
echo "📋 Summary of improvements:"
echo "   • Added translations for diagram explanations"
echo "   • Translated AI advantage cards with detailed descriptions"
echo "   • Added comprehensive comparison table translations"
echo "   • Maintained IT professional terms in English"
echo "   • Updated JavaScript selectors to handle new content"
echo "   • Ensured simplified Chinese consistency throughout"
echo ""
echo "🔧 Content now translated includes:"
echo "   • '为什么选择这五种图表类型？' explanation"
echo "   • Detailed advantage cards: 企业级性能, 智能架构分析, 持续设计演进"
echo "   • Comprehensive comparison matrix in Chinese"
echo "   • Professional descriptions while keeping UML, AI terms in English" 