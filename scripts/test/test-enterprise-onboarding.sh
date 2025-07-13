#!/bin/bash

# 企业级新手指南优化测试脚本
# 测试新的专业、高端、大气的新手指南设计

echo "🎯 开始测试企业级新手指南优化..."
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

# 检查企业级设计元素
echo "🎨 检查企业级设计元素..."

# 检查渐变背景
if grep -q "linear-gradient.*rgba(0, 0, 0, 0.8)" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 企业级渐变背景存在"
else
    echo "❌ 企业级渐变背景缺失"
fi

# 检查毛玻璃效果
if grep -q "backdrop-filter: blur(30px)" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 高级毛玻璃效果存在"
else
    echo "❌ 高级毛玻璃效果缺失"
fi

# 检查企业级标题
if grep -q "Enterprise-Grade AI-Powered UML Design Platform" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 企业级标题存在"
else
    echo "❌ 企业级标题缺失"
fi

# 检查专业内容
if grep -q "Transform Complex Requirements into Professional UML Diagrams" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 专业内容描述存在"
else
    echo "❌ 专业内容描述缺失"
fi

# 检查企业级场景
if grep -q "Enterprise-scale e-commerce platform architecture" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 企业级场景存在"
else
    echo "❌ 企业级场景缺失"
fi

# 检查高级动画效果
if grep -q "cubic-bezier(0.4, 0, 0.2, 1)" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 高级动画曲线存在"
else
    echo "❌ 高级动画曲线缺失"
fi

# 检查脉冲动画
if grep -q "@keyframes pulse" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 脉冲动画效果存在"
else
    echo "❌ 脉冲动画效果缺失"
fi

# 检查旋转动画
if grep -q "@keyframes rotate" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 旋转动画效果存在"
else
    echo "❌ 旋转动画效果缺失"
fi

# 检查企业级按钮样式
if grep -q "padding: 16px 32px" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 企业级按钮样式存在"
else
    echo "❌ 企业级按钮样式缺失"
fi

# 检查高级阴影效果
if grep -q "0 32px 64px rgba(0, 0, 0, 0.2)" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 高级阴影效果存在"
else
    echo "❌ 高级阴影效果缺失"
fi

# 检查企业级词汇
echo "📝 检查企业级词汇使用..."
enterprise_terms=(
    "Enterprise-Grade"
    "Professional"
    "Comprehensive"
    "Architecture"
    "Microservices"
    "Authentication"
    "Compliance"
    "Integration"
    "Optimization"
    "Collaboration"
)

for term in "${enterprise_terms[@]}"; do
    if grep -q "$term" src/tools/ui/webviewHtmlGenerator.ts; then
        echo "✅ '$term' 词汇使用正确"
    else
        echo "⚠️  '$term' 词汇未找到"
    fi
done

# 检查响应式设计
echo "📱 检查响应式设计..."
if grep -q "@media.*max-width.*768px" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 移动端响应式设计存在"
else
    echo "❌ 移动端响应式设计缺失"
fi

if grep -q "@media.*min-width.*1200px" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 大屏幕优化存在"
else
    echo "❌ 大屏幕优化缺失"
fi

# 检查无障碍设计
echo "♿ 检查无障碍设计..."
if grep -q "aria-label" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ ARIA标签存在"
else
    echo "❌ ARIA标签缺失"
fi

# 检查性能优化
echo "⚡ 检查性能优化..."
if grep -q "transform.*translateY" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ GPU加速动画存在"
else
    echo "❌ GPU加速动画缺失"
fi

if grep -q "will-change" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ 性能优化属性存在"
else
    echo "⚠️  性能优化属性未找到"
fi

echo ""
echo "🎉 企业级新手指南优化测试完成！"
echo "=================================="
echo ""
echo "📊 优化总结："
echo "• 🎨 企业级视觉设计 (渐变背景、毛玻璃效果)"
echo "• 📝 专业内容表述 (企业级词汇、技术术语)"
echo "• ⚡ 高级动画效果 (脉冲、旋转、缓动曲线)"
echo "• 🎯 企业级场景 (微服务、认证、合规)"
echo "• 📱 响应式布局 (移动端、大屏幕优化)"
echo "• ♿ 无障碍设计 (ARIA标签、键盘导航)"
echo "• 🔧 性能优化 (GPU加速、硬件渲染)"
echo ""
echo "💡 使用建议："
echo "1. 清除用户状态测试首次使用自动显示"
echo "2. 点击右上角✨按钮体验企业级引导"
echo "3. 测试各种企业级场景的点击交互"
echo "4. 验证移动端的响应式效果"
echo "5. 检查动画和过渡效果的流畅性"
echo "6. 测试键盘导航和无障碍功能"
echo ""
echo "🎯 下一步："
echo "• 收集企业用户反馈"
echo "• 优化动画性能"
echo "• 添加更多企业场景"
echo "• 支持多语言本地化"
echo "• 集成企业级功能" 