# UML Chat Designer Refactoring Plan

## 🎯 目标
创建一个更易维护、扩展和测试的架构，支持：
- 多图表引擎支持（PlantUML, Mermaid, 等）
- 多AI模型支持（Copilot, OpenAI, 等）
- 插件化架构
- 更好的测试覆盖
- 更清晰的代码组织

## 🏗️ 新架构设计

### 1. **核心架构层**

```
src/
├── core/                          # 核心架构
│   ├── interfaces/                # 接口定义
│   │   ├── IDiagramEngine.ts     # 图表引擎接口
│   │   ├── IAIModel.ts           # AI模型接口
│   │   ├── IMessageHandler.ts    # 消息处理接口
│   │   └── IStateManager.ts      # 状态管理接口
│   ├── managers/                  # 管理器
│   │   ├── EngineManager.ts      # 引擎管理器
│   │   ├── ModelManager.ts       # AI模型管理器
│   │   ├── StateManager.ts       # 状态管理器
│   │   └── MessageManager.ts     # 消息管理器
│   └── factories/                 # 工厂模式
│       ├── EngineFactory.ts      # 引擎工厂
│       └── ModelFactory.ts       # 模型工厂
```

### 2. **引擎层**

```
src/
├── engines/                       # 图表引擎实现
│   ├── base/
│   │   └── BaseDiagramEngine.ts  # 基础引擎类
│   ├── plantuml/
│   │   ├── PlantUMLEngine.ts     # PlantUML引擎
│   │   └── PlantUMLRenderer.ts   # PlantUML渲染器
│   ├── mermaid/
│   │   ├── MermaidEngine.ts      # Mermaid引擎
│   │   └── MermaidRenderer.ts    # Mermaid渲染器
│   └── index.ts                  # 引擎导出
```

### 3. **AI模型层**

```
src/
├── ai/                           # AI模型实现
│   ├── base/
│   │   └── BaseAIModel.ts       # 基础AI模型类
│   ├── copilot/
│   │   └── CopilotModel.ts      # Copilot模型
│   ├── openai/
│   │   └── OpenAIModel.ts       # OpenAI模型
│   └── index.ts                 # AI模型导出
```

### 4. **UI层重构**

```
src/
├── ui/                          # UI组件
│   ├── components/              # 可复用组件
│   │   ├── ChatPanel.ts        # 聊天面板组件
│   │   ├── DiagramViewer.ts    # 图表查看器组件
│   │   ├── InputArea.ts        # 输入区域组件
│   │   └── OnboardingModal.ts  # 引导模态框组件
│   ├── handlers/               # 事件处理器
│   │   ├── MessageHandler.ts   # 消息处理器
│   │   ├── ZoomHandler.ts      # 缩放处理器
│   │   └── ExportHandler.ts    # 导出处理器
│   └── webview/               # Webview相关
│       ├── WebviewManager.ts   # Webview管理器
│       └── HtmlGenerator.ts    # HTML生成器
```

### 5. **服务层**

```
src/
├── services/                   # 业务服务
│   ├── ChatService.ts         # 聊天服务
│   ├── DiagramService.ts      # 图表服务
│   ├── ExportService.ts       # 导出服务
│   ├── ImportService.ts       # 导入服务
│   └── AnalyticsService.ts    # 分析服务
```

### 6. **工具层**

```
src/
├── utils/                     # 工具函数
│   ├── validators/           # 验证器
│   │   ├── InputValidator.ts
│   │   └── DiagramValidator.ts
│   ├── formatters/           # 格式化器
│   │   ├── PromptFormatter.ts
│   │   └── ResponseFormatter.ts
│   └── helpers/              # 辅助函数
│       ├── ErrorHandler.ts
│       ├── Logger.ts
│       └── Debouncer.ts
```

## 🔄 重构步骤

### 阶段1：接口定义和基础架构
1. 定义核心接口（IDiagramEngine, IAIModel等）
2. 创建基础抽象类
3. 实现工厂模式

### 阶段2：引擎层重构
1. 重构PlantUML引擎为插件化架构
2. 添加Mermaid引擎支持
3. 实现引擎管理器

### 阶段3：AI模型层重构
1. 抽象AI模型接口
2. 重构Copilot模型实现
3. 添加其他AI模型支持

### 阶段4：UI层重构
1. 组件化UI元素
2. 分离事件处理逻辑
3. 实现状态管理

### 阶段5：服务层实现
1. 实现业务服务
2. 添加依赖注入
3. 完善错误处理

## 🎯 重构收益

### 1. **可扩展性**
- 轻松添加新的图表引擎
- 支持多种AI模型
- 插件化架构

### 2. **可维护性**
- 清晰的职责分离
- 更好的代码组织
- 减少代码重复

### 3. **可测试性**
- 依赖注入支持
- 接口抽象
- 单元测试友好

### 4. **性能优化**
- 懒加载支持
- 更好的内存管理
- 异步处理优化

## 📋 实施计划

### 第1周：基础架构
- [ ] 定义核心接口
- [ ] 创建基础抽象类
- [ ] 实现工厂模式

### 第2周：引擎层
- [ ] 重构PlantUML引擎
- [ ] 添加Mermaid引擎
- [ ] 实现引擎管理器

### 第3周：AI模型层
- [ ] 抽象AI模型接口
- [ ] 重构Copilot实现
- [ ] 添加模型管理器

### 第4周：UI层
- [ ] 组件化UI
- [ ] 分离事件处理
- [ ] 实现状态管理

### 第5周：测试和优化
- [ ] 添加单元测试
- [ ] 性能优化
- [ ] 文档完善

## 🚀 下一步行动

1. **立即开始**：创建接口定义和基础架构
2. **渐进式重构**：保持向后兼容
3. **持续测试**：确保功能不中断
4. **文档更新**：同步更新文档

这个重构计划将显著提升代码质量、可维护性和扩展性。 