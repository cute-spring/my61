import * as vscode from 'vscode';
import {
  RubricAnalytics,
  EvaluationAnalytics,
  EvaluationResult,
  ScoringRubric,
  RubricEvent,
  EvaluationEvent
} from './types';

export class AnalyticsOptimizer {
  private context: vscode.ExtensionContext;
  private storageKey = 'scoringAnalytics';
  private eventsKey = 'scoringEvents';
  private maxEvents = 1000;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async recordEvaluation(result: EvaluationResult): Promise<void> {
    const analytics = await this.loadAnalytics();
    
    // 更新总体统计
    analytics.totalEvaluations++;
    analytics.averageScore = this.calculateAverageScore(analytics, result.overallScore);
    analytics.averageConfidence = this.calculateAverageConfidence(analytics, result.confidence);
    analytics.averageEvaluationTime = this.calculateAverageTime(analytics, result.metadata.evaluationTime);
    
    // 更新分数分布
    const scoreBucket = Math.round(result.overallScore);
    analytics.scoreDistribution[scoreBucket] = (analytics.scoreDistribution[scoreBucket] || 0) + 1;
    
    // 更新评分卡使用统计
    this.updateRubricUsage(analytics, result.rubricId);
    
    // 更新月度趋势
    this.updateMonthlyTrends(analytics, result);
    
    // 记录事件
    await this.recordEvent({
      type: 'evaluation_completed',
      rubricId: result.rubricId,
      textLength: result.metadata.textLength,
      timestamp: result.timestamp,
      metadata: {
        score: result.overallScore,
        confidence: result.confidence,
        evaluationTime: result.metadata.evaluationTime
      }
    });
    
    await this.saveAnalytics(analytics);
  }

  async recordRubricUsage(rubricId: string, action: RubricEvent['type']): Promise<void> {
    const analytics = await this.loadAnalytics();
    
    if (action === 'rubric_used') {
      this.updateRubricUsage(analytics, rubricId);
    }
    
    await this.recordEvent({
      type: action,
      rubricId,
      timestamp: new Date().toISOString()
    });
    
    await this.saveAnalytics(analytics);
  }

  async getRubricAnalytics(rubricId: string): Promise<RubricAnalytics | null> {
    const analytics = await this.loadAnalytics();
    const rubricStats = analytics.rubricStats[rubricId];
    
    if (!rubricStats) {
      return null;
    }
    
    // 计算趋势
    const trend = this.calculateRubricTrend(rubricStats);
    
    return {
      rubricId,
      usageCount: rubricStats.usageCount,
      averageScore: rubricStats.totalScore / rubricStats.usageCount,
      scoreDistribution: { ...rubricStats.scoreDistribution },
      categoryPerformance: { ...rubricStats.categoryPerformance },
      commonStrengths: this.extractCommonPatterns(rubricStats.strengths),
      commonWeaknesses: this.extractCommonPatterns(rubricStats.weaknesses),
      lastUsed: rubricStats.lastUsed,
      evaluationTrend: trend
    };
  }

  async getEvaluationAnalytics(): Promise<EvaluationAnalytics> {
    const analytics = await this.loadAnalytics();
    
    // 获取热门评分卡
    const topRubrics = Object.entries(analytics.rubricStats)
      .map(([rubricId, stats]: [string, any]) => ({
        rubricId,
        count: stats.usageCount
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      totalEvaluations: analytics.totalEvaluations,
      averageEvaluationTime: analytics.averageEvaluationTime,
      averageConfidence: analytics.averageConfidence,
      topRubrics,
      scoreDistribution: { ...analytics.scoreDistribution },
      monthlyTrends: [...analytics.monthlyTrends]
    };
  }

  async getRubricOptimizationSuggestions(rubricId: string): Promise<{
    suggestions: string[];
    priority: 'high' | 'medium' | 'low';
    rationale: string;
  }> {
    const rubricAnalytics = await this.getRubricAnalytics(rubricId);
    if (!rubricAnalytics) {
      return {
        suggestions: ['无足够数据提供优化建议'],
        priority: 'low',
        rationale: '该评分卡还没有使用记录'
      };
    }

    const suggestions: string[] = [];
    let priority: 'high' | 'medium' | 'low' = 'low';
    const rationale: string[] = [];

    // 分析评分卡使用频率
    if (rubricAnalytics.usageCount < 5) {
      suggestions.push('考虑简化评分卡结构以提高使用率');
      rationale.push('使用频率较低，可能存在复杂度问题');
      priority = 'medium';
    }

    // 分析分数分布
    const scores = Object.entries(rubricAnalytics.scoreDistribution);
    const totalEvaluations = rubricAnalytics.usageCount;
    
    if (scores.length === 1) {
      suggestions.push('评分标准可能过于宽松或严格');
      rationale.push('分数分布过于集中，缺乏区分度');
      priority = 'high';
    }

    // 分析置信度
    if (rubricAnalytics.averageScore < 0.7) {
      suggestions.push('重新审视评分标准的清晰度');
      rationale.push('平均置信度较低，标准可能不够明确');
      priority = 'high';
    }

    // 分析分类表现
    const categoryAverages = Object.values(rubricAnalytics.categoryPerformance);
    const categoryVariance = this.calculateVariance(categoryAverages);
    
    if (categoryVariance > 0.5) {
      suggestions.push('考虑调整各分类的权重分配');
      rationale.push('分类间表现差异较大，权重可能需要优化');
      priority = 'medium';
    }

    // 分析趋势
    if (rubricAnalytics.evaluationTrend === 'declining') {
      suggestions.push('检查评分标准是否仍然适用当前需求');
      rationale.push('评估结果呈下降趋势，可能需要更新标准');
      priority = 'high';
    }

    return {
      suggestions,
      priority,
      rationale: rationale.join('; ')
    };
  }

  async generateScoringSystemReport(): Promise<string> {
    const analytics = await this.getEvaluationAnalytics();
    const events = await this.loadEvents();
    
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalEvaluations: analytics.totalEvaluations,
        averageScore: this.calculateOverallAverageScore(analytics.scoreDistribution),
        averageConfidence: analytics.averageConfidence,
        averageEvaluationTime: analytics.averageEvaluationTime
      },
      usagePatterns: {
        mostUsedRubrics: analytics.topRubrics.slice(0, 5),
        scoreDistribution: analytics.scoreDistribution,
        monthlyTrends: analytics.monthlyTrends.slice(-6) // 最近6个月
      },
      qualityMetrics: {
        highConfidenceEvaluations: this.calculateHighConfidenceRatio(events),
        averageImprovementSuggestions: this.calculateAverageSuggestions(events),
        commonIssues: this.identifyCommonIssues(events)
      },
      recommendations: await this.generateSystemRecommendations(analytics, events)
    };

    return JSON.stringify(report, null, 2);
  }

  private async loadAnalytics(): Promise<any> {
    const defaultAnalytics = {
      totalEvaluations: 0,
      averageScore: 0,
      averageConfidence: 0,
      averageEvaluationTime: 0,
      scoreDistribution: {},
      rubricStats: {},
      monthlyTrends: [],
      lastUpdated: new Date().toISOString()
    };

    return this.context.globalState.get(this.storageKey, defaultAnalytics);
  }

  private async saveAnalytics(analytics: any): Promise<void> {
    analytics.lastUpdated = new Date().toISOString();
    await this.context.globalState.update(this.storageKey, analytics);
  }

  private async loadEvents(): Promise<any[]> {
    return this.context.globalState.get(this.eventsKey, []);
  }

  private async recordEvent(event: RubricEvent | EvaluationEvent): Promise<void> {
    const events = await this.loadEvents();
    
    events.push({
      ...event,
      id: this.generateEventId()
    });

    // 保持事件数量在限制内
    if (events.length > this.maxEvents) {
      events.splice(0, events.length - this.maxEvents);
    }

    await this.context.globalState.update(this.eventsKey, events);
  }

  private calculateAverageScore(analytics: any, newScore: number): number {
    if (analytics.totalEvaluations === 0) {
      return newScore;
    }
    
    const totalScore = analytics.averageScore * analytics.totalEvaluations + newScore;
    return totalScore / (analytics.totalEvaluations + 1);
  }

  private calculateAverageConfidence(analytics: any, newConfidence: number): number {
    if (analytics.totalEvaluations === 0) {
      return newConfidence;
    }
    
    const totalConfidence = analytics.averageConfidence * analytics.totalEvaluations + newConfidence;
    return totalConfidence / (analytics.totalEvaluations + 1);
  }

  private calculateAverageTime(analytics: any, newTime: number): number {
    if (analytics.totalEvaluations === 0) {
      return newTime;
    }
    
    const totalTime = analytics.averageEvaluationTime * analytics.totalEvaluations + newTime;
    return totalTime / (analytics.totalEvaluations + 1);
  }

  private updateRubricUsage(analytics: any, rubricId: string): void {
    if (!analytics.rubricStats[rubricId]) {
      analytics.rubricStats[rubricId] = {
        usageCount: 0,
        totalScore: 0,
        scoreDistribution: {},
        categoryPerformance: {},
        strengths: [],
        weaknesses: [],
        lastUsed: new Date().toISOString()
      };
    }

    const rubricStats = analytics.rubricStats[rubricId];
    rubricStats.usageCount++;
    rubricStats.lastUsed = new Date().toISOString();
  }

  private updateMonthlyTrends(analytics: any, result: EvaluationResult): void {
    const monthKey = this.getMonthKey(result.timestamp);
    let monthData = analytics.monthlyTrends.find((m: any) => m.month === monthKey);
    
    if (!monthData) {
      monthData = {
        month: monthKey,
        count: 0,
        avgScore: 0,
        totalScore: 0
      };
      analytics.monthlyTrends.push(monthData);
    }

    monthData.count++;
    monthData.totalScore += result.overallScore;
    monthData.avgScore = monthData.totalScore / monthData.count;
  }

  private getMonthKey(timestamp: string): string {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private calculateRubricTrend(rubricStats: any): 'improving' | 'declining' | 'stable' {
    // 简化的趋势计算，实际应用中可以使用更复杂的算法
    if (rubricStats.usageCount < 3) {
      return 'stable';
    }

    const recentScores = rubricStats.recentScores || [];
    if (recentScores.length < 3) {
      return 'stable';
    }

    const older = recentScores.slice(0, Math.floor(recentScores.length / 2));
    const newer = recentScores.slice(Math.floor(recentScores.length / 2));
    
    const olderAvg = older.reduce((a: number, b: number) => a + b, 0) / older.length;
    const newerAvg = newer.reduce((a: number, b: number) => a + b, 0) / newer.length;
    
    if (newerAvg > olderAvg + 0.3) {
      return 'improving';
    } else if (newerAvg < olderAvg - 0.3) {
      return 'declining';
    } else {
      return 'stable';
    }
  }

  private extractCommonPatterns(patterns: string[]): string[] {
    const frequency: { [key: string]: number } = {};
    
    patterns.forEach(pattern => {
      const words = pattern.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 2) {
          frequency[word] = (frequency[word] || 0) + 1;
        }
      });
    });

    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateOverallAverageScore(scoreDistribution: { [key: number]: number }): number {
    let totalScore = 0;
    let totalCount = 0;
    
    Object.entries(scoreDistribution).forEach(([score, count]) => {
      totalScore += parseInt(score) * count;
      totalCount += count;
    });
    
    return totalCount > 0 ? totalScore / totalCount : 0;
  }

  private calculateHighConfidenceRatio(events: any[]): number {
    const evaluationEvents = events.filter(e => e.type === 'evaluation_completed');
    if (evaluationEvents.length === 0) return 0;
    
    const highConfidenceEvents = evaluationEvents.filter(e => 
      e.metadata && e.metadata.confidence >= 0.8
    );
    
    return highConfidenceEvents.length / evaluationEvents.length;
  }

  private calculateAverageSuggestions(events: any[]): number {
    const evaluationEvents = events.filter(e => e.type === 'evaluation_completed');
    if (evaluationEvents.length === 0) return 0;
    
    const totalSuggestions = evaluationEvents.reduce((sum, event) => {
      return sum + (event.metadata?.suggestions || 0);
    }, 0);
    
    return totalSuggestions / evaluationEvents.length;
  }

  private identifyCommonIssues(events: any[]): string[] {
    const issues: string[] = [];
    
    // 分析常见的评估问题
    const lowConfidenceEvents = events.filter(e => 
      e.type === 'evaluation_completed' && e.metadata?.confidence < 0.5
    );
    
    if (lowConfidenceEvents.length > events.length * 0.2) {
      issues.push('评估置信度普遍偏低，建议检查评分标准');
    }
    
    const longEvaluationEvents = events.filter(e => 
      e.type === 'evaluation_completed' && e.metadata?.evaluationTime > 30000
    );
    
    if (longEvaluationEvents.length > events.length * 0.3) {
      issues.push('评估时间较长，可能需要优化评分标准');
    }
    
    return issues;
  }

  private async generateSystemRecommendations(analytics: EvaluationAnalytics, events: any[]): Promise<string[]> {
    const recommendations: string[] = [];
    
    // 基于使用模式的建议
    if (analytics.totalEvaluations < 10) {
      recommendations.push('建议增加使用频率以获得更准确的优化建议');
    }
    
    // 基于分数分布的建议
    const avgScore = this.calculateOverallAverageScore(analytics.scoreDistribution);
    if (avgScore > 4.0) {
      recommendations.push('平均分数偏高，建议检查评分标准是否过于宽松');
    } else if (avgScore < 2.5) {
      recommendations.push('平均分数偏低，建议检查评分标准是否过于严格');
    }
    
    // 基于置信度的建议
    if (analytics.averageConfidence < 0.7) {
      recommendations.push('平均置信度偏低，建议改进评分标准的明确性');
    }
    
    // 基于热门评分卡的建议
    if (analytics.topRubrics.length > 0) {
      const mostUsed = analytics.topRubrics[0];
      recommendations.push(`"${mostUsed.rubricId}" 是最常用的评分卡，建议重点优化`);
    }
    
    return recommendations;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 数据清理和维护
  async cleanupOldData(maxAge: number = 90): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);
    
    // 清理旧事件
    const events = await this.loadEvents();
    const filteredEvents = events.filter(event => 
      new Date(event.timestamp) > cutoffDate
    );
    
    if (filteredEvents.length !== events.length) {
      await this.context.globalState.update(this.eventsKey, filteredEvents);
    }
    
    // 清理旧的分析数据
    const analytics = await this.loadAnalytics();
    analytics.monthlyTrends = analytics.monthlyTrends.filter((m: any) => 
      new Date(m.month + '-01') > cutoffDate
    );
    
    await this.saveAnalytics(analytics);
  }

  // 导出分析数据
  async exportAnalytics(): Promise<string> {
    const analytics = await this.loadAnalytics();
    const events = await this.loadEvents();
    
    const exportData = {
      analytics,
      events,
      exportTime: new Date().toISOString(),
      version: '1.0'
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  // 导入分析数据
  async importAnalytics(data: string): Promise<void> {
    try {
      const importedData = JSON.parse(data);
      
      // 验证数据格式
      if (!importedData.analytics || !importedData.events) {
        throw new Error('Invalid analytics data format');
      }
      
      // 合并数据
      const currentAnalytics = await this.loadAnalytics();
      const currentEvents = await this.loadEvents();
      
      // 简单的数据合并策略
      const mergedAnalytics = {
        ...currentAnalytics,
        ...importedData.analytics,
        rubricStats: {
          ...currentAnalytics.rubricStats,
          ...importedData.analytics.rubricStats
        }
      };
      
      const mergedEvents = [...currentEvents, ...importedData.events]
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(-this.maxEvents);
      
      await this.saveAnalytics(mergedAnalytics);
      await this.context.globalState.update(this.eventsKey, mergedEvents);
      
      vscode.window.showInformationMessage('分析数据导入成功');
    } catch (error) {
      throw new Error(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
}