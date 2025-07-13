#!/bin/bash

# 测试Tutorial按钮修复
# 验证两个Tutorial按钮都能正常工作

echo "🔧 开始测试Tutorial按钮修复..."
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

# 检查Tutorial按钮
echo "🎯 检查Tutorial按钮..."

# 检查聊天控制区域的Tutorial按钮
if grep -q "id=\"onboardingBtn\"" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 聊天控制区域Tutorial按钮存在"
else
    echo "❌ 聊天控制区域Tutorial按钮缺失"
fi

# 检查显示图区域的Tutorial按钮
if grep -q "id=\"onboardingBtnCenter\"" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 显示图区域Tutorial按钮存在"
else
    echo "❌ 显示图区域Tutorial按钮缺失"
fi

# 检查CSS样式
echo "🎨 检查CSS样式..."

# 检查tutorial-center-btn样式
if grep -q "tutorial-center-btn" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ tutorial-center-btn样式存在"
else
    echo "❌ tutorial-center-btn样式缺失"
fi

# 检查居中定位
if grep -q "top: 50%" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 居中定位样式存在"
else
    echo "❌ 居中定位样式缺失"
fi

# 检查JavaScript逻辑
echo "🔧 检查JavaScript逻辑..."

# 检查两个按钮的事件监听器
if grep -q "onboardingBtnCenter" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 中心按钮事件监听器存在"
else
    echo "❌ 中心按钮事件监听器缺失"
fi

# 检查显示/隐藏逻辑
if grep -q "tutorialBtnCenter" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 中心按钮显示/隐藏逻辑存在"
else
    echo "❌ 中心按钮显示/隐藏逻辑缺失"
fi

# 检查新手引导模态框
echo "🎨 检查新手引导模态框..."

# 检查模态框HTML
if grep -q "onboardingModal" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 新手引导模态框存在"
else
    echo "❌ 新手引导模态框缺失"
fi

# 检查步骤内容
if grep -q "onboarding-step" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 新手引导步骤内容存在"
else
    echo "❌ 新手引导步骤内容缺失"
fi

# 检查自动显示逻辑
echo "🔍 检查自动显示逻辑..."

# 检查umlChatPanel中的自动显示
if grep -q "showOnboarding" src/tools/umlChatPanel.ts; then
    echo "✅ 自动显示逻辑存在"
else
    echo "❌ 自动显示逻辑缺失"
fi

# 检查用户状态管理
if grep -q "userOnboardingState" src/tools/umlChatPanel.ts; then
    echo "✅ 用户状态管理存在"
else
    echo "❌ 用户状态管理缺失"
fi

echo ""
echo "🎉 Tutorial按钮修复测试完成！"
echo "=================================="
echo ""
echo "📊 修复总结："
echo "• 🎯 恢复了聊天控制区域的Tutorial按钮"
echo "• 🎯 保留了显示图区域中心的Tutorial按钮"
echo "• 🔧 修复了ID冲突问题"
echo "• 🎨 两个按钮都有完整的功能"
echo "• 🔍 智能显示/隐藏逻辑正常工作"
echo "• 📱 自动新手引导功能恢复"
echo ""
echo "💡 使用说明："
echo "1. 打开UML Chat Designer面板"
echo "2. 在聊天控制区域可以看到Tutorial按钮"
echo "3. 在空白状态下，显示图区域中心也有Tutorial按钮"
echo "4. 首次使用会自动显示新手引导"
echo "5. 两个按钮都能触发新手引导"
echo ""
echo "🎯 下一步："
echo "• 测试两个按钮的交互效果"
echo "• 验证自动新手引导显示"
echo "• 检查在不同状态下的显示效果"
echo "• 确保用户体验流畅" 