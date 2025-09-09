import { CopilotClient } from '../../core/llm/copilotClient';
import { LLMClient, LLMRequest, LLMResponse } from '../../core/llm/llmClient';
import {
  EvaluationRequest,
  EvaluationResult,
  EvaluationOptions,
  AIPromptTemplate,
  ScoringRubric,
  EvaluationFeedback,
  CategoryResult,
  CriterionResult,
  EvaluationMetadata,
  ScoringSystemError
} from './types';

export class AIEvaluationEngine {
  private copilotClient: LLMClient;
  private maxRetries = 3;
  private timeout = 30000; // 30 seconds

  constructor() {
    this.copilotClient = new CopilotClient();
  }

  async evaluate(request: EvaluationRequest): Promise<EvaluationResult> {
    const startTime = Date.now();
    let retryCount = 0;
    let errorCount = 0;

    try {
      // 构建提示词
      const prompt = this.buildEvaluationPrompt(request);
      
      // 调用AI模型
      const response = await this.callAIWithRetry(prompt, retryCount);
      
      // 解析响应
      const result = await this.parseEvaluationResponse(response, request);
      
      // 计算评估时间
      const evaluationTime = Date.now() - startTime;
      result.metadata.evaluationTime = evaluationTime;
      result.metadata.retryCount = retryCount;
      result.metadata.errorCount = errorCount;
      
      return result;
    } catch (error) {
      errorCount++;
      throw new ScoringSystemError(
        'EVALUATION_FAILED',
        `Evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { retryCount, errorCount, request },
        false
      );
    }
  }

  private buildEvaluationPrompt(request: EvaluationRequest): LLMRequest {
    const { rubric, textContent, options } = request;
    
    const systemPrompt = this.getSystemPrompt(rubric, options);
    const userPrompt = this.getUserPrompt(rubric, textContent, options);
    
    return {
      system: systemPrompt,
      prompt: userPrompt,
      temperature: options?.temperature || 0.3
    };
  }

  private getSystemPrompt(rubric: ScoringRubric, options?: EvaluationOptions): string {
    const basePrompt = `你是一个专业的评估专家，负责根据给定的评分标准对文本内容进行客观、准确的评估。

## 评分标准
**评分卡名称：** ${rubric.name}
**评分卡描述：** ${rubric.description}

## 评估要求
1. **客观公正：** 基于文本内容进行评估，避免主观偏见
2. **标准一致：** 严格按照评分标准的等级描述进行评分
3. **证据支持：** 为每个评分提供具体的文本证据
4. **建设性：** 提供有价值的反馈和改进建议
5. **逻辑清晰：** 评估结果要有清晰的逻辑结构

## 输出格式
请严格按照以下JSON格式输出评估结果：
\`\`\`json
{
  "categoryResults": [
    {
      "categoryId": "分类ID",
      "categoryName": "分类名称",
      "score": 分数(1-5),
      "feedback": "分类评估反馈",
      "criterionResults": [
        {
          "criterionId": "标准ID",
          "criterionName": "标准名称",
          "score": 分数(1-5),
          "reasoning": "评分理由",
          "evidence": ["文本证据1", "文本证据2"],
          "confidence": 置信度(0-1)
        }
      ]
    }
  ],
  "overallScore": 总分(1-5),
  "confidence": 整体置信度(0-1),
  "feedback": {
    "summary": "总体评价",
    "strengths": ["优势1", "优势2"],
    "improvements": ["改进建议1", "改进建议2"],
    "recommendations": ["推荐行动1", "推荐行动2"]
  }
}
\`\`\`

## 评分等级定义
${this.formatScoringLevels(rubric)}

${options?.customPrompt || ''}

请开始评估：`;

    return basePrompt;
  }

  private getUserPrompt(rubric: ScoringRubric, textContent: string, options?: EvaluationOptions): string {
    return `请根据以下评分标准对提供的文本内容进行评估：

## 待评估文本
${textContent}

## 评分标准详情
${this.formatRubricDetails(rubric)}

${options?.includeDetailedReasoning ? '请提供详细的评分理由和具体的文本证据。' : ''}
${options?.includeEvidence ? '请为每个评分点提供具体的文本证据引用。' : ''}

请按照要求的JSON格式输出评估结果。`;
  }

  private formatScoringLevels(rubric: ScoringRubric): string {
    const levels = new Set<string>();
    
    rubric.categories.forEach(category => {
      category.criteria.forEach(criterion => {
        criterion.scoringLevels.forEach(level => {
          levels.add(`${level.level}分-${level.name}: ${level.description}`);
        });
      });
    });

    return Array.from(levels).join('\n');
  }

  private formatRubricDetails(rubric: ScoringRubric): string {
    let details = '';
    
    rubric.categories.forEach(category => {
      details += `\n### ${category.name} (权重: ${(category.weight * 100).toFixed(1)}%)\n`;
      details += `**描述：** ${category.description}\n\n`;
      
      category.criteria.forEach(criterion => {
        details += `**${criterion.name}：** ${criterion.description}\n`;
        details += `评分等级：\n`;
        
        criterion.scoringLevels.forEach(level => {
          details += `- ${level.level}分(${level.name}): ${level.description}\n`;
        });
        
        details += '\n';
      });
    });
    
    return details;
  }

  private async callAIWithRetry(request: LLMRequest, retryCount: number): Promise<LLMResponse> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // 设置超时
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), this.timeout);
        });
        
        const response = await Promise.race([
          this.copilotClient.send(request),
          timeoutPromise
        ]);
        
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        retryCount++;
        
        // 如果是最后一次尝试，抛出错误
        if (attempt === this.maxRetries) {
          throw lastError;
        }
        
        // 指数退避
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError || new Error('All retry attempts failed');
  }

  private async parseEvaluationResponse(response: LLMResponse, request: EvaluationRequest): Promise<EvaluationResult> {
    try {
      // 尝试从响应中提取JSON
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }
      
      const data = JSON.parse(jsonMatch[0]);
      
      // 验证数据结构
      this.validateResponseData(data);
      
      // 构建完整的评估结果
      const result: EvaluationResult = {
        id: this.generateId(),
        rubricId: request.rubric.id,
        rubricName: request.rubric.name,
        textContent: request.textContent,
        timestamp: new Date().toISOString(),
        overallScore: data.overallScore,
        overallScoreNormalized: data.overallScore / 5,
        categoryResults: this.processCategoryResults(data.categoryResults, request.rubric),
        criterionResults: this.extractCriterionResults(data.categoryResults),
        feedback: this.processFeedback(data.feedback),
        confidence: data.confidence,
        metadata: {
          evaluationTime: 0, // 将在外部设置
          modelUsed: 'copilot',
          textLength: request.textContent.length,
          evaluationType: request.options ? 'custom' : 'full',
          retryCount: 0,
          errorCount: 0
        }
      };
      
      return result;
    } catch (error) {
      throw new ScoringSystemError(
        'RESPONSE_PARSING_FAILED',
        `Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { response: response.text },
        false
      );
    }
  }

  private validateResponseData(data: any): void {
    const requiredFields = ['categoryResults', 'overallScore', 'confidence', 'feedback'];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    if (!Array.isArray(data.categoryResults)) {
      throw new Error('categoryResults must be an array');
    }
    
    if (typeof data.overallScore !== 'number' || data.overallScore < 1 || data.overallScore > 5) {
      throw new Error('overallScore must be a number between 1 and 5');
    }
    
    if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1) {
      throw new Error('confidence must be a number between 0 and 1');
    }
  }

  private processCategoryResults(categoryResults: any[], rubric: ScoringRubric): CategoryResult[] {
    return categoryResults.map((cr: any) => {
      const category = rubric.categories.find(cat => cat.id === cr.categoryId);
      if (!category) {
        throw new Error(`Category not found: ${cr.categoryId}`);
      }
      
      return {
        categoryId: cr.categoryId,
        categoryName: cr.categoryName,
        score: cr.score,
        scoreNormalized: cr.score / 5,
        weight: category.weight,
        weightedScore: cr.score * category.weight,
        feedback: cr.feedback,
        criterionResults: cr.criterionResults || []
      };
    });
  }

  private extractCriterionResults(categoryResults: any[]): CriterionResult[] {
    const criterionResults: CriterionResult[] = [];
    
    categoryResults.forEach((cr: any) => {
      if (cr.criterionResults) {
        criterionResults.push(...cr.criterionResults);
      }
    });
    
    return criterionResults;
  }

  private processFeedback(feedbackData: any): EvaluationFeedback {
    return {
      summary: feedbackData.summary || '',
      strengths: feedbackData.strengths || [],
      improvements: feedbackData.improvements || [],
      recommendations: feedbackData.recommendations || [],
      nextSteps: feedbackData.nextSteps || []
    };
  }

  private generateId(): string {
    return `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 评估质量控制
  async validateEvaluationQuality(result: EvaluationResult): Promise<{
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // 检查置信度
    if (result.confidence < 0.5) {
      issues.push('评估置信度过低');
      suggestions.push('建议重新评估或调整评分标准');
    }

    // 检查分数分布
    const scores = result.criterionResults.map(cr => cr.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    if (avgScore < 1.5 || avgScore > 4.5) {
      issues.push('分数分布异常，可能存在评估偏差');
      suggestions.push('检查评分标准的适用性');
    }

    // 检查反馈质量
    if (result.feedback.strengths.length === 0) {
      issues.push('未提供优势分析');
      suggestions.push('建议补充优势分析');
    }

    if (result.feedback.improvements.length === 0) {
      issues.push('未提供改进建议');
      suggestions.push('建议补充改进建议');
    }

    // 检查证据支持
    const evidenceCount = result.criterionResults.reduce((sum, cr) => sum + cr.evidence.length, 0);
    if (evidenceCount < result.criterionResults.length * 2) {
      issues.push('证据支持不足');
      suggestions.push('建议为每个评分点提供更多文本证据');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }

  // 批量评估
  async batchEvaluate(requests: EvaluationRequest[]): Promise<EvaluationResult[]> {
    const results: EvaluationResult[] = [];
    
    for (const request of requests) {
      try {
        const result = await this.evaluate(request);
        results.push(result);
      } catch (error) {
        console.error(`Batch evaluation failed for request:`, error);
        // 继续处理其他请求
      }
    }
    
    return results;
  }

  // 获取评估统计
  getEvaluationStatistics(results: EvaluationResult[]): {
    totalCount: number;
    averageScore: number;
    averageConfidence: number;
    scoreDistribution: { [key: number]: number };
    timeStats: { min: number; max: number; average: number };
  } {
    if (results.length === 0) {
      return {
        totalCount: 0,
        averageScore: 0,
        averageConfidence: 0,
        scoreDistribution: {},
        timeStats: { min: 0, max: 0, average: 0 }
      };
    }

    const scores = results.map(r => r.overallScore);
    const confidences = results.map(r => r.confidence);
    const times = results.map(r => r.metadata.evaluationTime);

    const scoreDistribution: { [key: number]: number } = {};
    scores.forEach(score => {
      const roundedScore = Math.round(score);
      scoreDistribution[roundedScore] = (scoreDistribution[roundedScore] || 0) + 1;
    });

    return {
      totalCount: results.length,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      averageConfidence: confidences.reduce((a, b) => a + b, 0) / confidences.length,
      scoreDistribution,
      timeStats: {
        min: Math.min(...times),
        max: Math.max(...times),
        average: times.reduce((a, b) => a + b, 0) / times.length
      }
    };
  }
}