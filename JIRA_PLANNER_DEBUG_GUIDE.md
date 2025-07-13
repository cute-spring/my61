# Jira Planning Tool - 调试指南

## 问题描述
用户反馈：输入项目需求后点击"发送"按钮没有任何反应，页面没有变化，也没有任何提示。

## 调试步骤

### 1. 打开开发者工具
1. 在 VS Code 中打开 AI Jira Planning Assistant
2. 在 webview 页面中右键点击 -> "检查元素" 或 "Inspect"
3. 切换到 "Console" 标签页

### 2. 查看调试信息
现在代码中已经添加了详细的调试信息，您应该能看到：

**页面加载时：**
```
Setting up event listeners...
Main input: [HTMLTextAreaElement object]
Send button: [HTMLButtonElement object]
Clear button: [HTMLButtonElement object]
```

**点击发送按钮时：**
```
Send button clicked!
Input text: [您输入的文本]
Sending message with text: [您输入的文本]
postMessage called with command: send_requirement data: {text: "..."}
Sending message to extension: {command: "send_requirement", data: {text: "..."}, sessionId: "..."}
Message sent successfully
```

**扩展端处理时：**
```
handleWebviewMessage called with: {command: "send_requirement", data: {text: "..."}, sessionId: "..."}
Processing command: send_requirement
Handling SEND_REQUIREMENT with data: {text: "..."}
handleRequirementInput called with text: [您的文本]
```

### 3. 可能的问题排查

#### 问题1：按钮事件未绑定
**症状：** 点击按钮后没有看到 "Send button clicked!" 消息
**原因：** DOM 元素未正确找到或事件监听器未正确绑定
**解决方案：** 检查 HTML 元素 ID 是否正确

#### 问题2：消息发送失败
**症状：** 看到 "Send button clicked!" 但没有看到后续的 postMessage 调试信息
**原因：** JavaScript 错误或 vscode API 不可用
**解决方案：** 检查 Console 中的错误信息

#### 问题3：扩展端未收到消息
**症状：** 看到 "Message sent successfully" 但没有看到 "handleWebviewMessage called with"
**原因：** 扩展端消息处理器未正确注册
**解决方案：** 检查 VS Code 扩展是否正确加载

#### 问题4：会话状态问题
**症状：** 看到 "No current session, returning"
**原因：** 会话未正确初始化
**解决方案：** 需要先初始化会话或重新启动工具

### 4. 常见解决方案

#### 解决方案1：重新启动工具
1. 关闭当前的 Jira Planning Assistant 面板
2. 重新运行命令：`Ctrl+Shift+P` -> "AI Jira Planning Assistant"

#### 解决方案2：检查扩展状态
1. 确保扩展已正确编译：`npm run compile`
2. 重新加载 VS Code 窗口：`Ctrl+Shift+P` -> "Developer: Reload Window"

#### 解决方案3：清除缓存
1. 关闭 VS Code
2. 重新打开项目
3. 重新启动 Jira Planning Assistant

### 5. 手动测试步骤

1. **基本功能测试：**
   - 输入文本："构建一个用户认证系统"
   - 点击发送按钮
   - 观察 Console 输出

2. **键盘快捷键测试：**
   - 在文本框中输入文本
   - 按 Enter 键
   - 观察是否触发发送

3. **快速建议测试：**
   - 点击预设的建议按钮（如"用户认证系统"）
   - 观察文本是否填入输入框

### 6. 如果问题仍然存在

请提供以下信息：

1. **Console 输出：** 完整的控制台日志
2. **错误信息：** 任何红色的错误消息
3. **浏览器信息：** VS Code 版本和操作系统
4. **重现步骤：** 详细的操作步骤

### 7. 临时解决方案

如果发送按钮仍然不工作，您可以：

1. **使用键盘快捷键：** 在输入框中按 Enter 键
2. **使用快速建议：** 点击预设的建议按钮
3. **重新启动工具：** 关闭并重新打开 Jira Planning Assistant

## 技术细节

### 消息流程
1. 用户点击发送按钮
2. JavaScript 事件处理器触发
3. 调用 `postMessage()` 发送消息到扩展
4. 扩展的 `handleWebviewMessage()` 接收消息
5. 调用 `handleRequirementInput()` 处理输入
6. 更新会话状态并刷新 webview

### 关键代码位置
- **前端事件处理：** `src/tools/jira/jiraPlannerWebview.ts` 第 710-730 行
- **消息发送：** `src/tools/jira/jiraPlannerWebview.ts` 第 956-966 行
- **后端消息处理：** `src/tools/jira/jiraPlanningTool.ts` 第 152-217 行
- **输入处理：** `src/tools/jira/jiraPlanningTool.ts` 第 554-590 行

---

这个调试版本将帮助我们快速定位问题所在。请按照上述步骤进行测试，并分享 Console 输出结果。 