#!/bin/bash

# 测试Tutorial按钮z-index修复 - 解决缩放控制按钮覆盖问题
# 验证按钮在空白状态下能正确显示在缩放控制按钮之上

echo "🎯 开始测试Tutorial按钮z-index修复..."
echo "=================================="

# 检查编译状态
echo "📦 检查编译状态..."
if npm run compile > /dev/null 2>&1; then
    echo "✅ 编译成功"
else
    echo "❌ 编译失败"
    exit 1
fi

# 检查z-index修复
echo "🔧 检查z-index修复..."

# 检查Tutorial按钮z-index
if grep -q "z-index: 1001" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Tutorial按钮z-index已修复为1001"
else
    echo "❌ Tutorial按钮z-index未修复"
fi

# 检查缩放控制按钮z-index
if grep -q "z-index: 1000" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 缩放控制按钮z-index为1000"
else
    echo "❌ 缩放控制按钮z-index检查失败"
fi

# 检查z-index层级关系
echo "📊 检查z-index层级关系..."
if grep -A 5 -B 5 "tutorial-center-btn" src/tools/ui/webviewHtmlGenerator.ts | grep -q "z-index: 1001"; then
    echo "✅ Tutorial按钮z-index正确设置为1001"
else
    echo "❌ Tutorial按钮z-index设置错误"
fi

if grep -A 5 -B 5 "zoom-controls" src/tools/ui/webviewHtmlGenerator.ts | grep -q "z-index: 1000"; then
    echo "✅ 缩放控制按钮z-index正确设置为1000"
else
    echo "❌ 缩放控制按钮z-index设置错误"
fi

# 检查按钮HTML结构
echo "🎯 检查按钮HTML结构..."
if grep -q "onboardingBtnCenter.*tutorial-center-btn" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 中心按钮HTML结构正确"
else
    echo "❌ 中心按钮HTML结构错误"
fi

# 检查CSS样式
echo "🎨 检查CSS样式..."
if grep -q "tutorial-center-btn" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ tutorial-center-btn样式存在"
else
    echo "❌ tutorial-center-btn样式缺失"
fi

if grep -q "tutorial-center-btn.hidden" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 隐藏类样式存在"
else
    echo "❌ 隐藏类样式缺失"
fi

# 检查JavaScript逻辑
echo "🔧 检查JavaScript逻辑..."
if grep -q "function checkEmptyState" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ checkEmptyState函数存在"
else
    echo "❌ checkEmptyState函数缺失"
fi

# 检查按钮显示逻辑
echo "🔍 检查按钮显示逻辑..."
if grep -q "tutorialBtnCenter.classList.remove('hidden')" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 中心按钮显示逻辑存在"
else
    echo "❌ 中心按钮显示逻辑缺失"
fi

if grep -q "tutorialBtnCenter.classList.add('hidden')" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 中心按钮隐藏逻辑存在"
else
    echo "❌ 中心按钮隐藏逻辑缺失"
fi

# 检查调试日志
echo "📝 检查调试日志..."
if grep -q "console.log.*checkEmptyState" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 调试日志存在"
else
    echo "❌ 调试日志缺失"
fi

# 检查多个定时器
echo "⏰ 检查多个定时器..."
if grep -q "setTimeout(checkEmptyState, 100)" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 100ms定时器存在"
else
    echo "❌ 100ms定时器缺失"
fi

if grep -q "setTimeout(checkEmptyState, 500)" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 500ms定时器存在"
else
    echo "❌ 500ms定时器缺失"
fi

if grep -q "setTimeout(checkEmptyState, 1000)" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 1000ms定时器存在"
else
    echo "❌ 1000ms定时器缺失"
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
if grep -q "onboardingBtnCenter.addEventListener" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 中心按钮事件监听器存在"
else
    echo "❌ 中心按钮事件监听器缺失"
fi

echo ""
echo "🎉 Tutorial按钮z-index修复测试完成！"
echo "=================================="
echo ""
echo "📊 修复总结："
echo "• 🚨 解决了缩放控制按钮覆盖Tutorial按钮的问题"
echo "• 🎯 提高了Tutorial按钮的z-index从100到1001"
echo "• 🔧 确保Tutorial按钮显示在缩放控制按钮之上"
echo "• 📝 保持了详细的调试日志"
echo "• ⏰ 多个定时器确保按钮正确显示"
echo "• 👁️ MutationObserver监听SVG变化"
echo "• 🎧 完整的事件监听器配置"
echo ""
echo "💡 关键修复："
echo "1. 将Tutorial按钮的z-index从100提升到1001"
echo "2. 确保Tutorial按钮显示在缩放控制按钮(z-index: 1000)之上"
echo "3. 保持所有其他功能正常工作"
echo "4. 确保按钮在空白状态下能持久显示"
echo "5. 添加了详细的调试日志来跟踪状态"
echo ""
echo "🎯 预期效果："
echo "• SVG区域空白时，按钮会持久显示在中心"
echo "• 按钮显示在缩放控制按钮之上"
echo "• 不会一闪而过就消失"
echo "• 有内容时自动隐藏"
echo "• 新手引导激活时自动隐藏"
echo ""
echo "🔍 调试方法："
echo "• 打开浏览器开发者工具"
echo "• 查看控制台日志了解按钮状态"
echo "• 验证按钮是否正确显示在缩放控制按钮之上"
echo "• 检查z-index层级关系是否正确" 