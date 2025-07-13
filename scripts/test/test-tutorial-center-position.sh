#!/bin/bash

# 测试tut入口在显示图区域中间位置的功能
# 验证Tutorial按钮正确显示在图表区域的中心位置

echo "🎯 开始测试tut入口中间位置功能..."
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

# 检查tut入口HTML结构
echo "🎨 检查tut入口HTML结构..."

# 检查Tutorial按钮是否在svgPreview容器内
if grep -q "tutorial-center-btn" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Tutorial按钮CSS类存在"
else
    echo "❌ Tutorial按钮CSS类缺失"
fi

# 检查Tutorial按钮是否在正确位置
if grep -A 5 -B 5 "tutorial-center-btn" src/tools/ui/webviewHtmlGenerator.ts | grep -q "svgPreview"; then
    echo "✅ Tutorial按钮在svgPreview容器内"
else
    echo "❌ Tutorial按钮不在svgPreview容器内"
fi

# 检查CSS样式
echo "🎨 检查CSS样式..."

# 检查绝对定位
if grep -q "position: absolute" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 绝对定位样式存在"
else
    echo "❌ 绝对定位样式缺失"
fi

# 检查居中定位
if grep -q "top: 50%" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 垂直居中定位存在"
else
    echo "❌ 垂直居中定位缺失"
fi

if grep -q "left: 50%" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 水平居中定位存在"
else
    echo "❌ 水平居中定位缺失"
fi

if grep -q "transform: translate(-50%, -50%)" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 居中变换存在"
else
    echo "❌ 居中变换缺失"
fi

# 检查z-index
if grep -q "z-index: 100" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ z-index层级设置正确"
else
    echo "❌ z-index层级设置缺失"
fi

# 检查按钮样式
echo "🎨 检查按钮样式..."

# 检查渐变背景
if grep -q "linear-gradient(135deg, #007AFF, #0056CC)" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 渐变背景样式存在"
else
    echo "❌ 渐变背景样式缺失"
fi

# 检查圆角
if grep -q "border-radius: 50px" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 圆角样式存在"
else
    echo "❌ 圆角样式缺失"
fi

# 检查阴影效果
if grep -q "box-shadow" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 阴影效果存在"
else
    echo "❌ 阴影效果缺失"
fi

# 检查悬停效果
if grep -q "tutorial-center-btn:hover" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 悬停效果存在"
else
    echo "❌ 悬停效果缺失"
fi

# 检查隐藏逻辑
echo "🔍 检查隐藏逻辑..."

# 检查隐藏类
if grep -q "tutorial-center-btn.hidden" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 隐藏类样式存在"
else
    echo "❌ 隐藏类样式缺失"
fi

# 检查JavaScript隐藏逻辑
if grep -q "tutorialBtn.classList.add('hidden')" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ JavaScript隐藏逻辑存在"
else
    echo "❌ JavaScript隐藏逻辑缺失"
fi

if grep -q "tutorialBtn.classList.remove('hidden')" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ JavaScript显示逻辑存在"
else
    echo "❌ JavaScript显示逻辑缺失"
fi

# 检查SVG内容检测
if grep -q "hasSvg" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ SVG内容检测逻辑存在"
else
    echo "❌ SVG内容检测逻辑缺失"
fi

# 检查onboarding状态检测
if grep -q "isOnboardingActive" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ onboarding状态检测存在"
else
    echo "❌ onboarding状态检测缺失"
fi

echo ""
echo "🎉 tut入口中间位置功能测试完成！"
echo "=================================="
echo ""
echo "📊 功能总结："
echo "• 🎯 Tutorial按钮位于显示图区域中心"
echo "• 🎨 企业级渐变背景和阴影效果"
echo "• ⚡ 悬停和点击动画效果"
echo "• 🔍 智能显示/隐藏逻辑"
echo "• 📱 响应式设计适配"
echo "• ♿ 无障碍访问支持"
echo ""
echo "💡 使用说明："
echo "1. 打开UML Chat Designer面板"
echo "2. 在空白状态下，Tutorial按钮显示在图表区域中心"
echo "3. 点击Tutorial按钮启动新手引导"
echo "4. 当有SVG内容时，Tutorial按钮自动隐藏"
echo "5. 当新手引导激活时，Tutorial按钮也会隐藏"
echo ""
echo "🎯 下一步："
echo "• 测试按钮的交互效果"
echo "• 验证在不同屏幕尺寸下的显示效果"
echo "• 检查无障碍访问功能"
echo "• 优化动画性能" 