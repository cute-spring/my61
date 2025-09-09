import * as vscode from 'vscode';
import { ICopilotTool } from '../../extension';
import { ScoringRubricManager } from './rubricManager';
import { AIEvaluationEngine } from './aiEngine';
import { EvaluationResult, ScoringRubric, EvaluationOptions } from './types';
import { AnalyticsOptimizer } from './analyticsOptimizer';
import { UsageAnalytics, trackUsage } from '../../analytics';

export class AIScoringTool implements ICopilotTool {
  command = 'copilotTools.evaluateWithAI';
  title = 'AI智能评分系统';
  
  private rubricManager: ScoringRubricManager;
  private aiEngine: AIEvaluationEngine;
  private analyticsOptimizer: AnalyticsOptimizer;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.rubricManager = new ScoringRubricManager(context);
    this.aiEngine = new AIEvaluationEngine();
    this.analyticsOptimizer = new AnalyticsOptimizer(context);
  }

  isEnabled(settings: vscode.WorkspaceConfiguration): boolean {
    return settings.get<boolean>('features.aiScoring', true);
  }

  async handleInput(editor: vscode.TextEditor, selection: vscode.Selection, settings: vscode.WorkspaceConfiguration): Promise<void> {
    trackUsage('aiScoring', 'evaluate');
    
    try {
      const selectedText = editor.document.getText(selection);
      
      if (!selectedText || selectedText.trim().length === 0) {
        vscode.window.showErrorMessage('请先选择要评估的文本内容');
        return;
      }

      // 获取或选择评分卡
      const rubric = await this.selectOrCreateRubric();
      if (!rubric) {
        return;
      }

      // 显示进度指示器
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "AI正在评估中...",
        cancellable: true
      }, async (progress, token) => {
        try {
          // 执行评估
          const result = await this.performEvaluation(selectedText, rubric, progress, token);
          
          // 显示结果
          await this.showEvaluationResult(result);
          
          // 记录使用统计
          await this.analyticsOptimizer.recordEvaluation(result);
          
        } catch (error) {
          if (token.isCancellationRequested) {
            vscode.window.showInformationMessage('评估已取消');
          } else {
            vscode.window.showErrorMessage(`评估失败: ${error instanceof Error ? error.message : '未知错误'}`);
          }
        }
      });

    } catch (error) {
      vscode.window.showErrorMessage(`操作失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  private async selectOrCreateRubric(): Promise<ScoringRubric | null> {
    const rubrics = await this.rubricManager.listRubrics();
    
    const options = [
      {
        label: '📝 创建新评分卡',
        description: '创建新的评分标准',
        value: 'create'
      },
      ...rubrics.map(rubric => ({
        label: `📋 ${rubric.name}`,
        description: rubric.description,
        detail: `最后更新: ${new Date(rubric.updatedAt).toLocaleDateString()}`,
        value: rubric.id
      }))
    ];

    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: '选择评分卡或创建新的评分卡',
      title: 'AI智能评分系统'
    });

    if (!selected) {
      return null;
    }

    if (selected.value === 'create') {
      return await this.createNewRubric();
    } else {
      return await this.rubricManager.getRubric(selected.value);
    }
  }

  private async createNewRubric(): Promise<ScoringRubric | null> {
    // 简化的评分卡创建流程
    const name = await vscode.window.showInputBox({
      placeHolder: '输入评分卡名称',
      title: '创建评分卡',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return '请输入评分卡名称';
        }
        return null;
      }
    });

    if (!name) {
      return null;
    }

    const description = await vscode.window.showInputBox({
      placeHolder: '输入评分卡描述',
      title: '创建评分卡'
    });

    if (!description) {
      return null;
    }

    // 使用模板创建评分卡
    const template = await this.selectRubricTemplate();
    if (!template) {
      return null;
    }

    try {
      const rubric = await this.rubricManager.createRubric({
        name,
        description,
        categories: template.categories,
        version: '1.0.0',
        totalWeight: 1.0,
        metadata: {
          author: '用户',
          isTemplate: false
        }
      });

      vscode.window.showInformationMessage(`评分卡"${name}"创建成功！`);
      return rubric;
    } catch (error) {
      vscode.window.showErrorMessage(`创建评分卡失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return null;
    }
  }

  private async selectRubricTemplate(): Promise<any> {
    const templates = [
      {
        label: '通用项目评估',
        description: '适用于一般项目成果评估',
        value: 'general'
      },
      {
        label: '代码质量评估',
        description: '适用于代码质量和技术实现评估',
        value: 'code'
      },
      {
        label: '文档质量评估',
        description: '适用于技术文档和文案评估',
        value: 'document'
      },
      {
        label: '团队协作评估',
        description: '适用于团队合作和沟通评估',
        value: 'team'
      }
    ];

    const selected = await vscode.window.showQuickPick(templates, {
      placeHolder: '选择评分卡模板',
      title: '选择模板'
    });

    if (!selected) {
      return null;
    }

    return this.getTemplateData(selected.value);
  }

  private getTemplateData(templateType: string): any {
    const templates = {
      general: {
        categories: [
          {
            id: 'cat1',
            name: '目标达成',
            description: '项目目标的完成情况',
            weight: 0.4,
            criteria: [
              {
                id: 'crit1',
                name: '目标完成度',
                description: '项目目标的完成程度',
                scoringLevels: [
                  { level: 1, name: '未完成', description: '主要目标未完成', guidance: '需要重新规划' },
                  { level: 2, name: '部分完成', description: '部分目标完成', guidance: '需要加快进度' },
                  { level: 3, name: '基本完成', description: '主要目标完成', guidance: '有改进空间' },
                  { level: 4, name: '良好完成', description: '目标良好完成', guidance: '细节可优化' },
                  { level: 5, name: '卓越完成', description: '目标卓越完成', guidance: '可作为榜样' }
                ]
              }
            ]
          },
          {
            id: 'cat2',
            name: '质量水平',
            description: '项目成果的质量',
            weight: 0.3,
            criteria: [
              {
                id: 'crit2',
                name: '成果质量',
                description: '项目成果的质量水平',
                scoringLevels: [
                  { level: 1, name: '质量差', description: '质量不达标', guidance: '需要大幅改进' },
                  { level: 2, name: '质量一般', description: '质量基本达标', guidance: '需要提升' },
                  { level: 3, name: '质量良好', description: '质量良好', guidance: '可进一步优化' },
                  { level: 4, name: '质量优秀', description: '质量优秀', guidance: '细节可完善' },
                  { level: 5, name: '质量卓越', description: '质量卓越', guidance: '可作为标杆' }
                ]
              }
            ]
          },
          {
            id: 'cat3',
            name: '创新价值',
            description: '项目的创新性和价值',
            weight: 0.3,
            criteria: [
              {
                id: 'crit3',
                name: '创新性',
                description: '项目的创新程度',
                scoringLevels: [
                  { level: 1, name: '无创新', description: '缺乏创新', guidance: '需要创新思维' },
                  { level: 2, name: '微创新', description: '有小创新', guidance: '可进一步创新' },
                  { level: 3, name: '中等创新', description: '有一定创新', guidance: '创新性良好' },
                  { level: 4, name: '高创新', description: '创新性高', guidance: '创新突出' },
                  { level: 5, name: '突破创新', description: '突破性创新', guidance: '创新典范' }
                ]
              }
            ]
          }
        ]
      },
      code: {
        categories: [
          {
            id: 'cat1',
            name: '代码质量',
            description: '代码的整体质量',
            weight: 0.5,
            criteria: [
              {
                id: 'crit1',
                name: '代码结构',
                description: '代码的结构和组织',
                scoringLevels: [
                  { level: 1, name: '结构混乱', description: '代码结构混乱', guidance: '需要重构' },
                  { level: 2, name: '结构一般', description: '代码结构一般', guidance: '需要优化' },
                  { level: 3, name: '结构良好', description: '代码结构良好', guidance: '可进一步优化' },
                  { level: 4, name: '结构优秀', description: '代码结构优秀', guidance: '细节可完善' },
                  { level: 5, name: '结构卓越', description: '代码结构卓越', guidance: '可作为标杆' }
                ]
              }
            ]
          },
          {
            id: 'cat2',
            name: '可维护性',
            description: '代码的可维护性',
            weight: 0.3,
            criteria: [
              {
                id: 'crit2',
                name: '可读性',
                description: '代码的可读性',
                scoringLevels: [
                  { level: 1, name: '难读', description: '代码难以理解', guidance: '需要改善可读性' },
                  { level: 2, name: '可读性一般', description: '代码可读性一般', guidance: '需要提升' },
                  { level: 3, name: '可读性良好', description: '代码可读性良好', guidance: '可进一步优化' },
                  { level: 4, name: '可读性优秀', description: '代码可读性优秀', guidance: '细节可完善' },
                  { level: 5, name: '可读性卓越', description: '代码可读性卓越', guidance: '可作为标杆' }
                ]
              }
            ]
          },
          {
            id: 'cat3',
            name: '性能表现',
            description: '代码的性能表现',
            weight: 0.2,
            criteria: [
              {
                id: 'crit3',
                name: '性能效率',
                description: '代码的性能效率',
                scoringLevels: [
                  { level: 1, name: '性能差', description: '性能很差', guidance: '需要大幅优化' },
                  { level: 2, name: '性能一般', description: '性能一般', guidance: '需要优化' },
                  { level: 3, name: '性能良好', description: '性能良好', guidance: '可进一步优化' },
                  { level: 4, name: '性能优秀', description: '性能优秀', guidance: '细节可完善' },
                  { level: 5, name: '性能卓越', description: '性能卓越', guidance: '可作为标杆' }
                ]
              }
            ]
          }
        ]
      },
      document: {
        categories: [
          {
            id: 'cat1',
            name: '内容质量',
            description: '文档内容的质量',
            weight: 0.4,
            criteria: [
              {
                id: 'crit1',
                name: '内容准确性',
                description: '内容的准确性和正确性',
                scoringLevels: [
                  { level: 1, name: '不准确', description: '内容不准确', guidance: '需要修正' },
                  { level: 2, name: '基本准确', description: '内容基本准确', guidance: '需要完善' },
                  { level: 3, name: '准确', description: '内容准确', guidance: '可进一步优化' },
                  { level: 4, name: '很准确', description: '内容很准确', guidance: '细节可完善' },
                  { level: 5, name: '非常准确', description: '内容非常准确', guidance: '可作为标杆' }
                ]
              }
            ]
          },
          {
            id: 'cat2',
            name: '结构清晰',
            description: '文档结构的清晰度',
            weight: 0.3,
            criteria: [
              {
                id: 'crit2',
                name: '逻辑结构',
                description: '文档的逻辑结构',
                scoringLevels: [
                  { level: 1, name: '混乱', description: '结构混乱', guidance: '需要重组' },
                  { level: 2, name: '一般', description: '结构一般', guidance: '需要优化' },
                  { level: 3, name: '清晰', description: '结构清晰', guidance: '可进一步优化' },
                  { level: 4, name: '很清晰', description: '结构很清晰', guidance: '细节可完善' },
                  { level: 5, name: '非常清晰', description: '结构非常清晰', guidance: '可作为标杆' }
                ]
              }
            ]
          },
          {
            id: 'cat3',
            name: '表达效果',
            description: '文档的表达效果',
            weight: 0.3,
            criteria: [
              {
                id: 'crit3',
                name: '语言表达',
                description: '语言的表达效果',
                scoringLevels: [
                  { level: 1, name: '表达差', description: '表达效果差', guidance: '需要改进' },
                  { level: 2, name: '表达一般', description: '表达效果一般', guidance: '需要提升' },
                  { level: 3, name: '表达良好', description: '表达效果良好', guidance: '可进一步优化' },
                  { level: 4, name: '表达优秀', description: '表达效果优秀', guidance: '细节可完善' },
                  { level: 5, name: '表达卓越', description: '表达效果卓越', guidance: '可作为标杆' }
                ]
              }
            ]
          }
        ]
      },
      team: {
        categories: [
          {
            id: 'cat1',
            name: '协作能力',
            description: '团队协作能力',
            weight: 0.4,
            criteria: [
              {
                id: 'crit1',
                name: '团队配合',
                description: '团队成员的配合程度',
                scoringLevels: [
                  { level: 1, name: '配合差', description: '团队配合差', guidance: '需要改善' },
                  { level: 2, name: '配合一般', description: '团队配合一般', guidance: '需要提升' },
                  { level: 3, name: '配合良好', description: '团队配合良好', guidance: '可进一步优化' },
                  { level: 4, name: '配合优秀', description: '团队配合优秀', guidance: '细节可完善' },
                  { level: 5, name: '配合卓越', description: '团队配合卓越', guidance: '可作为标杆' }
                ]
              }
            ]
          },
          {
            id: 'cat2',
            name: '沟通效果',
            description: '沟通的有效性',
            weight: 0.3,
            criteria: [
              {
                id: 'crit2',
                name: '沟通质量',
                description: '沟通的质量和效果',
                scoringLevels: [
                  { level: 1, name: '沟通差', description: '沟通效果差', guidance: '需要改善' },
                  { level: 2, name: '沟通一般', description: '沟通效果一般', guidance: '需要提升' },
                  { level: 3, name: '沟通良好', description: '沟通效果良好', guidance: '可进一步优化' },
                  { level: 4, name: '沟通优秀', description: '沟通效果优秀', guidance: '细节可完善' },
                  { level: 5, name: '沟通卓越', description: '沟通效果卓越', guidance: '可作为标杆' }
                ]
              }
            ]
          },
          {
            id: 'cat3',
            name: '问题解决',
            description: '问题解决能力',
            weight: 0.3,
            criteria: [
              {
                id: 'crit3',
                name: '解决效率',
                description: '解决问题的效率',
                scoringLevels: [
                  { level: 1, name: '效率低', description: '解决问题效率低', guidance: '需要提升' },
                  { level: 2, name: '效率一般', description: '解决问题效率一般', guidance: '需要提升' },
                  { level: 3, name: '效率良好', description: '解决问题效率良好', guidance: '可进一步优化' },
                  { level: 4, name: '效率优秀', description: '解决问题效率优秀', guidance: '细节可完善' },
                  { level: 5, name: '效率卓越', description: '解决问题效率卓越', guidance: '可作为标杆' }
                ]
              }
            ]
          }
        ]
      }
    };

    return templates[templateType as keyof typeof templates];
  }

  private async performEvaluation(
    text: string,
    rubric: ScoringRubric,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken
  ): Promise<EvaluationResult> {
    progress.report({ message: "正在分析文本内容..." });
    
    const request = {
      rubric,
      textContent: text,
      options: {
        includeDetailedReasoning: true,
        includeEvidence: true,
        temperature: 0.3
      } as EvaluationOptions
    };

    if (token.isCancellationRequested) {
      throw new Error('Evaluation cancelled');
    }

    progress.report({ message: "正在调用AI模型进行评估..." });
    
    const result = await this.aiEngine.evaluate(request);

    if (token.isCancellationRequested) {
      throw new Error('Evaluation cancelled');
    }

    progress.report({ message: "正在验证评估结果..." });
    
    // 验证评估质量
    const qualityCheck = await this.aiEngine.validateEvaluationQuality(result);
    if (!qualityCheck.isValid) {
      console.warn('Evaluation quality issues:', qualityCheck.issues);
    }

    return result;
  }

  private async showEvaluationResult(result: EvaluationResult): Promise<void> {
    // 创建结果展示面板
    const panel = vscode.window.createWebviewPanel(
      'aiScoringResult',
      `AI评分结果 - ${result.rubricName}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: []
      }
    );

    const html = this.generateResultHtml(result);
    panel.webview.html = html;

    // 处理面板消息
    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'exportResult':
          await this.exportEvaluationResult(result);
          break;
        case 'saveFeedback':
          await this.saveUserFeedback(result, message.feedback);
          break;
        case 'viewRubric':
          await this.showRubricDetails(result.rubricId);
          break;
        case 'reevaluate':
          await this.reevaluateContent(result);
          break;
      }
    });
  }

  private generateResultHtml(result: EvaluationResult): string {
    const confidenceColor = result.confidence >= 0.8 ? '#4CAF50' : 
                           result.confidence >= 0.6 ? '#FF9800' : '#F44336';
    
    const scoreColor = result.overallScore >= 4 ? '#4CAF50' :
                      result.overallScore >= 3 ? '#FF9800' : '#F44336';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI评分结果</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        .header {
            border-bottom: 2px solid var(--vscode-editor-lineHighlightBorder);
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .score-card {
            background: var(--vscode-editor-selectionBackground);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            text-align: center;
        }
        .overall-score {
            font-size: 48px;
            font-weight: bold;
            color: ${scoreColor};
            margin-bottom: 10px;
        }
        .confidence {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            background-color: ${confidenceColor};
            color: white;
            font-size: 12px;
            margin-bottom: 10px;
        }
        .section {
            margin-bottom: 25px;
        }
        .section h3 {
            color: var(--vscode-editor-foreground);
            border-bottom: 1px solid var(--vscode-editor-lineHighlightBorder);
            padding-bottom: 5px;
            margin-bottom: 15px;
        }
        .category-result {
            background: var(--vscode-textBlockQuote-background);
            border-left: 4px solid ${scoreColor};
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 4px;
        }
        .category-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .category-name {
            font-weight: bold;
            font-size: 16px;
        }
        .category-score {
            font-size: 18px;
            font-weight: bold;
            color: ${scoreColor};
        }
        .feedback-section {
            background: var(--vscode-badge-background);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
        }
        .feedback-item {
            margin-bottom: 10px;
        }
        .feedback-item strong {
            color: var(--vscode-editor-foreground);
        }
        .action-buttons {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
        }
        .btn-primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .btn-primary:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .btn-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        .metadata {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid var(--vscode-editor-lineHighlightBorder);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 AI智能评分结果</h1>
        <p><strong>评分卡：</strong>${result.rubricName}</p>
        <p><strong>评估时间：</strong>${new Date(result.timestamp).toLocaleString()}</p>
    </div>

    <div class="score-card">
        <div class="overall-score">${result.overallScore.toFixed(1)}</div>
        <div class="confidence">置信度: ${(result.confidence * 100).toFixed(0)}%</div>
        <p>总体评分</p>
    </div>

    <div class="section">
        <h3>📊 分类评分详情</h3>
        ${result.categoryResults.map(category => `
            <div class="category-result">
                <div class="category-header">
                    <span class="category-name">${category.categoryName}</span>
                    <span class="category-score">${category.score.toFixed(1)}/5.0</span>
                </div>
                <p><strong>权重：</strong>${(category.weight * 100).toFixed(1)}%</p>
                <p><strong>加权得分：</strong>${category.weightedScore.toFixed(2)}</p>
                <p><strong>反馈：</strong>${category.feedback}</p>
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h3>💬 评估反馈</h3>
        <div class="feedback-section">
            <div class="feedback-item">
                <strong>📝 总体评价：</strong>
                <p>${result.feedback.summary}</p>
            </div>
            <div class="feedback-item">
                <strong>✅ 主要优势：</strong>
                <ul>
                    ${result.feedback.strengths.map(strength => `<li>${strength}</li>`).join('')}
                </ul>
            </div>
            <div class="feedback-item">
                <strong>🔧 改进建议：</strong>
                <ul>
                    ${result.feedback.improvements.map(improvement => `<li>${improvement}</li>`).join('')}
                </ul>
            </div>
            <div class="feedback-item">
                <strong>🎯 行动推荐：</strong>
                <ul>
                    ${result.feedback.recommendations.map(recommendation => `<li>${recommendation}</li>`).join('')}
                </ul>
            </div>
        </div>
    </div>

    <div class="action-buttons">
        <button class="btn btn-primary" onclick="exportResult()">📤 导出结果</button>
        <button class="btn btn-secondary" onclick="viewRubric()">📋 查看评分卡</button>
        <button class="btn btn-secondary" onclick="reevaluate()">🔄 重新评估</button>
    </div>

    <div class="metadata">
        <p><strong>评估用时：</strong>${result.metadata.evaluationTime}ms</p>
        <p><strong>使用的模型：</strong>${result.metadata.modelUsed}</p>
        <p><strong>文本长度：</strong>${result.metadata.textLength} 字符</p>
    </div>

    <script>
        function exportResult() {
            vscode.postMessage({ command: 'exportResult' });
        }
        function viewRubric() {
            vscode.postMessage({ command: 'viewRubric' });
        }
        function reevaluate() {
            vscode.postMessage({ command: 'reevaluate' });
        }
    </script>
</body>
</html>
    `;
  }

  private async exportEvaluationResult(result: EvaluationResult): Promise<void> {
    const exportData = {
      result,
      exportTime: new Date().toISOString(),
      version: '1.0'
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    
    const uri = await vscode.window.showSaveDialog({
      filters: {
        'JSON': ['json'],
        'All Files': ['*']
      },
      defaultUri: vscode.Uri.file(`ai-scoring-result-${Date.now()}.json`)
    });

    if (uri) {
      try {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(jsonString, 'utf8'));
        vscode.window.showInformationMessage('评估结果已导出');
      } catch (error) {
        vscode.window.showErrorMessage('导出失败: ' + error);
      }
    }
  }

  private async saveUserFeedback(result: EvaluationResult, feedback: string): Promise<void> {
    // 保存用户反馈以改进系统
    console.log('User feedback:', feedback);
    vscode.window.showInformationMessage('感谢您的反馈！');
  }

  private async showRubricDetails(rubricId: string): Promise<void> {
    const rubric = await this.rubricManager.getRubric(rubricId);
    if (rubric) {
      const panel = vscode.window.createWebviewPanel(
        'rubricDetails',
        `评分卡详情 - ${rubric.name}`,
        vscode.ViewColumn.Beside,
        { enableScripts: true }
      );
      
      panel.webview.html = this.generateRubricHtml(rubric);
    }
  }

  private generateRubricHtml(rubric: ScoringRubric): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>评分卡详情</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; }
        .header { border-bottom: 2px solid #ccc; padding-bottom: 15px; margin-bottom: 20px; }
        .category { margin-bottom: 25px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
        .category h3 { color: #333; margin-top: 0; }
        .criterion { margin-bottom: 15px; padding: 10px; background: #f9f9f9; border-radius: 4px; }
        .scoring-level { margin-bottom: 8px; padding: 8px; background: #fff; border-left: 3px solid #007acc; }
        .level-header { font-weight: bold; color: #007acc; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${rubric.name}</h1>
        <p>${rubric.description}</p>
        <p><strong>版本：</strong>${rubric.version}</p>
        <p><strong>创建时间：</strong>${new Date(rubric.createdAt).toLocaleString()}</p>
    </div>
    
    ${rubric.categories.map(category => `
        <div class="category">
            <h3>${category.name} (权重: ${(category.weight * 100).toFixed(1)}%)</h3>
            <p>${category.description}</p>
            
            ${category.criteria.map(criterion => `
                <div class="criterion">
                    <h4>${criterion.name}</h4>
                    <p>${criterion.description}</p>
                    
                    ${criterion.scoringLevels.map(level => `
                        <div class="scoring-level">
                            <div class="level-header">${level.level}分 - ${level.name}</div>
                            <p>${level.description}</p>
                            <small><em>${level.guidance}</em></small>
                        </div>
                    `).join('')}
                </div>
            `).join('')}
        </div>
    `).join('')}
</body>
</html>
    `;
  }

  private async reevaluateContent(result: EvaluationResult): Promise<void> {
    // 重新评估逻辑
    vscode.window.showInformationMessage('重新评估功能开发中...');
  }

  getSettingsSchema(): { [key: string]: any } {
    return {
      'copilotTools.features.aiScoring': {
        type: 'boolean',
        default: true,
        description: 'Enable/disable AI Scoring tool'
      },
      'copilotTools.scoring.defaultRubricId': {
        type: 'string',
        description: 'Default rubric ID for quick evaluation'
      },
      'copilotTools.scoring.autoSaveResults': {
        type: 'boolean',
        default: true,
        description: 'Automatically save evaluation results'
      },
      'copilotTools.scoring.showConfidence': {
        type: 'boolean',
        default: true,
        description: 'Show confidence scores in evaluation results'
      },
      'copilotTools.scoring.enableAnalytics': {
        type: 'boolean',
        default: true,
        description: 'Enable usage analytics for scoring system'
      }
    };
  }

  dispose(): void {
    // 清理资源
  }
}