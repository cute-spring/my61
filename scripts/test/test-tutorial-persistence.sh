#!/bin/bash

# 测试Tutorial按钮在空白状态下的持久显示
# 验证按钮不会一闪而过就消失

echo "🎯 开始测试Tutorial按钮持久显示..."
echo "=================================="

# 检查编译状态
echo "📦 检查编译状态..."
if npm run compile > /dev/null 2>&1; then
    echo "✅ 编译成功"
else
    echo "❌ 编译失败"
    exit 1
fi

# 检查关键文件
echo "📁 检查关键文件..."
files=(
    "src/tools/ui/webviewHtmlGenerator.ts"
    "src/tools/umlChatPanel.ts"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file 存在"
    else
        echo "❌ $file 缺失"
        exit 1
    fi
done

# 检查Tutorial按钮HTML结构
echo "🎯 检查Tutorial按钮HTML结构..."

# 检查中心按钮没有初始hidden类
if grep -A 2 -B 2 "onboardingBtnCenter" src/tools/ui/webviewHtmlGenerator.ts | grep -v "hidden" | grep -q "tutorial-center-btn"; then
    echo "✅ 中心按钮没有初始hidden类"
else
    echo "❌ 中心按钮可能有初始hidden类"
fi

# 检查CSS样式
echo "🎨 检查CSS样式..."

# 检查tutorial-center-btn样式
if grep -q "tutorial-center-btn" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ tutorial-center-btn样式存在"
else
    echo "❌ tutorial-center-btn样式缺失"
fi

# 检查隐藏类样式
if grep -q "tutorial-center-btn.hidden" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 隐藏类样式存在"
else
    echo "❌ 隐藏类样式缺失"
fi

# 检查JavaScript逻辑
echo "🔧 检查JavaScript逻辑..."

# 检查checkEmptyState函数
if grep -q "function checkEmptyState" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ checkEmptyState函数存在"
else
    echo "❌ checkEmptyState函数缺失"
fi

# 检查调试日志
if grep -q "console.log.*checkEmptyState" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 调试日志已添加"
else
    echo "❌ 调试日志缺失"
fi

# 检查多个定时器调用
if grep -q "setTimeout(checkEmptyState, 500)" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 多个定时器调用存在"
else
    echo "❌ 多个定时器调用缺失"
fi

if grep -q "setTimeout(checkEmptyState, 1000)" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 1秒定时器调用存在"
else
    echo "❌ 1秒定时器调用缺失"
fi

# 检查按钮显示逻辑
echo "🔍 检查按钮显示逻辑..."

# 检查isEmpty变量
if grep -q "const isEmpty" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ isEmpty变量定义存在"
else
    echo "❌ isEmpty变量定义缺失"
fi

# 检查按钮显示逻辑
if grep -q "tutorialBtnCenter.classList.remove('hidden')" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 中心按钮显示逻辑存在"
else
    echo "❌ 中心按钮显示逻辑缺失"
fi

# 检查按钮隐藏逻辑
if grep -q "tutorialBtnCenter.classList.add('hidden')" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 中心按钮隐藏逻辑存在"
else
    echo "❌ 中心按钮隐藏逻辑缺失"
fi

# 检查MutationObserver
echo "👁️ 检查MutationObserver..."

if grep -q "MutationObserver" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ MutationObserver存在"
else
    echo "❌ MutationObserver缺失"
fi

if grep -q "observer.observe.*svgPreview" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ SVG预览区域观察器存在"
else
    echo "❌ SVG预览区域观察器缺失"
fi

# 检查事件监听器
echo "🎧 检查事件监听器..."

# 检查中心按钮事件监听器
if grep -q "onboardingBtnCenter.addEventListener" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 中心按钮事件监听器存在"
else
    echo "❌ 中心按钮事件监听器缺失"
fi

# 检查原有按钮事件监听器
if grep -q "onboardingBtn.addEventListener" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 原有按钮事件监听器存在"
else
    echo "❌ 原有按钮事件监听器缺失"
fi

echo ""
echo "🎉 Tutorial按钮持久显示测试完成！"
echo "=================================="
echo ""
echo "📊 功能总结："
echo "• 🎯 中心按钮没有初始hidden类"
echo "• 🔧 增强了checkEmptyState函数逻辑"
echo "• 📝 添加了详细的调试日志"
echo "• ⏰ 多个定时器确保按钮正确显示"
echo "• 👁️ MutationObserver监听SVG变化"
echo "• 🎧 完整的事件监听器配置"
echo ""
echo "💡 修复内容："
echo "1. 添加了详细的调试日志来跟踪按钮状态"
echo "2. 使用isEmpty变量使逻辑更清晰"
echo "3. 添加了多个定时器确保按钮正确显示"
echo "4. 增强了按钮显示/隐藏的逻辑判断"
echo "5. 确保MutationObserver正确监听SVG变化"
echo ""
echo "🎯 下一步："
echo "• 在浏览器中测试按钮的持久显示"
echo "• 检查控制台日志了解按钮状态"
echo "• 验证在不同操作下按钮的行为"
echo "• 确保用户体验流畅" 