# 升级变更展示系统设计文档

## 概述

升级变更展示系统是一个类似 MacBook 新功能介绍的交互式引导系统，用于向用户展示系统升级后的新功能、改进和修复。该系统具有以下特点：

- **交互式展示**：类似 MacBook 新功能介绍的弹窗体验
- **版本管理**：自动跟踪用户已查看的版本
- **分类展示**：按功能、改进、修复、破坏性变更分类
- **示例体验**：提供"试一试"功能让用户立即体验新功能
- **状态持久化**：记录用户的查看状态，避免重复展示

## 系统架构

### 1. 数据结构

```typescript
// 变更类型
export const CHANGE_TYPES = {
    FEATURE: 'feature',      // 新功能
    IMPROVEMENT: 'improvement', // 改进
    FIX: 'fix',             // 修复
    BREAKING: 'breaking'    // 破坏性变更
};

// 变更分类
export const CHANGE_CATEGORIES = {
    UI: 'ui',               // 用户界面
    FUNCTIONALITY: 'functionality', // 功能
    PERFORMANCE: 'performance',     // 性能
    BUGFIX: 'bugfix'        // 错误修复
};

// 变更项
interface ChangeItem {
    type: typeof CHANGE_TYPES[keyof typeof CHANGE_TYPES];
    category: typeof CHANGE_CATEGORIES[keyof typeof CHANGE_CATEGORIES];
    title: string;
    description: string;
    icon?: string;
    example?: string;
}

// 版本变更
interface VersionChange {
    version: string;
    releaseDate: string;
    changes: ChangeItem[];
    isMajorUpdate: boolean;
    requiresOnboarding: boolean;
}

// 用户状态
interface UserOnboardingState {
    lastSeenVersion: string;
    hasSeenOnboarding: boolean;
    hasSeenWhatsNew: boolean;
    onboardingCompletedAt?: number;
    whatsNewCompletedAt?: number;
}
```

### 2. 版本变更记录

在 `src/tools/uml/constants.ts` 中维护版本变更记录：

```typescript
export const VERSION_CHANGES: VersionChange[] = [
    {
        version: '1.2.0',
        releaseDate: '2024-01-15',
        isMajorUpdate: true,
        requiresOnboarding: true,
        changes: [
            {
                type: CHANGE_TYPES.FEATURE,
                category: CHANGE_CATEGORIES.FUNCTIONALITY,
                title: '新增交互式新手引导',
                description: '类似 MacBook 新功能介绍的交互式引导体验',
                icon: '✨',
                example: '点击右上角✨按钮体验新手引导'
            },
            // ... 更多变更
        ]
    }
];
```

## 功能特性

### 1. 自动检测升级

- 系统启动时自动检查是否有新版本
- 比较用户上次查看的版本与最新版本
- 如有新版本且用户未查看过，自动显示升级变更弹窗

### 2. 交互式展示

- **弹窗设计**：居中弹窗，半透明遮罩，聚焦用户注意力
- **分类展示**：按变更类型使用不同颜色和图标
- **分步浏览**：支持上一步/下一步导航
- **示例体验**：提供"试一试"按钮，自动填充示例到输入框

### 3. 状态管理

- **本地存储**：使用 VS Code 的 `globalState` 存储用户状态
- **持久化**：记录用户查看状态，避免重复展示
- **版本跟踪**：记录用户最后查看的版本号

### 4. 用户体验

- **可跳过**：用户可选择跳过查看
- **可重新访问**：右上角🚀按钮可随时重新查看
- **多语言支持**：支持中英文内容
- **响应式设计**：适配不同窗口大小

## 使用方法

### 1. 添加新版本变更

在 `src/tools/uml/constants.ts` 中的 `VERSION_CHANGES` 数组开头添加新版本：

```typescript
export const VERSION_CHANGES: VersionChange[] = [
    {
        version: '1.3.0',  // 新版本号
        releaseDate: '2024-02-01',
        isMajorUpdate: true,
        requiresOnboarding: true,
        changes: [
            {
                type: CHANGE_TYPES.FEATURE,
                category: CHANGE_CATEGORIES.FUNCTIONALITY,
                title: '新功能标题',
                description: '新功能详细描述',
                icon: '🎉',
                example: '示例用法或体验方式'
            }
        ]
    },
    // ... 现有版本
];
```

### 2. 变更类型说明

- **FEATURE**：新功能，绿色边框，适合展示重大新功能
- **IMPROVEMENT**：改进，蓝色边框，适合展示功能优化
- **FIX**：修复，黄色边框，适合展示问题修复
- **BREAKING**：破坏性变更，红色边框，适合展示不兼容的变更

### 3. 变更分类说明

- **UI**：用户界面相关变更
- **FUNCTIONALITY**：功能相关变更
- **PERFORMANCE**：性能相关变更
- **BUGFIX**：错误修复相关变更

## 技术实现

### 1. 前端实现

- **弹窗结构**：HTML + CSS 实现弹窗和遮罩
- **交互逻辑**：JavaScript 处理按钮点击和状态切换
- **样式设计**：响应式设计，支持不同屏幕尺寸

### 2. 后端实现

- **状态管理**：使用 VS Code ExtensionContext 的 globalState
- **消息处理**：处理前端发送的状态更新消息
- **版本检查**：自动检查版本差异

### 3. 数据流

```
用户打开工具 → 检查版本差异 → 显示升级变更弹窗 → 用户交互 → 更新状态 → 保存到本地存储
```

## 最佳实践

### 1. 变更内容编写

- **标题简洁**：用一句话概括变更内容
- **描述详细**：说明变更的具体内容和价值
- **示例实用**：提供可立即体验的示例
- **图标合适**：选择能代表变更内容的图标

### 2. 版本管理

- **语义化版本**：使用语义化版本号（如 1.2.0）
- **时间记录**：记录发布日期
- **重要性标记**：标记是否为重大更新
- **引导需求**：标记是否需要新手引导

### 3. 用户体验

- **内容精简**：每次更新不要超过 5 个变更
- **分类清晰**：按类型和分类组织变更
- **示例丰富**：为重要功能提供体验示例
- **可跳过性**：允许用户跳过查看

## 扩展功能

### 1. 多语言支持

可以扩展支持多语言变更说明：

```typescript
interface ChangeItem {
    title: {
        zh: string;
        en: string;
    };
    description: {
        zh: string;
        en: string;
    };
    // ...
}
```

### 2. 变更统计

可以添加变更统计功能：

```typescript
interface ChangeStats {
    totalChanges: number;
    features: number;
    improvements: number;
    fixes: number;
    breaking: number;
}
```

### 3. 用户反馈

可以添加用户反馈功能：

```typescript
interface UserFeedback {
    version: string;
    rating: number;
    comment?: string;
    timestamp: number;
}
```

## 总结

升级变更展示系统为用户提供了优雅的新功能介绍体验，通过交互式引导帮助用户快速了解系统升级内容，提升用户对新功能的认知和使用积极性。系统设计灵活，易于扩展，为后续功能迭代提供了良好的基础。 