import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import {
  ScoringRubric,
  RubricManager,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ScoringLevelPreset,
  CategoryPreset
} from './types';

export class ScoringRubricManager implements RubricManager {
  private context: vscode.ExtensionContext;
  private storageKey = 'scoringRubrics';
  private presetsKey = 'scoringPresets';

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async createRubric(rubricData: Omit<ScoringRubric, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScoringRubric> {
    const rubric: ScoringRubric = {
      ...rubricData,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalWeight: this.calculateTotalWeight(rubricData.categories)
    };

    // 验证评分卡
    const validation = this.validateRubric(rubric);
    if (!validation.isValid) {
      throw new Error(`Invalid rubric: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // 保存评分卡
    await this.saveRubric(rubric);
    
    return rubric;
  }

  async updateRubric(id: string, updates: Partial<ScoringRubric>): Promise<ScoringRubric> {
    const existingRubric = await this.getRubric(id);
    if (!existingRubric) {
      throw new Error(`Rubric with id ${id} not found`);
    }

    const updatedRubric: ScoringRubric = {
      ...existingRubric,
      ...updates,
      id, // 确保 ID 不变
      updatedAt: new Date().toISOString()
    };

    // 如果更新了分类，重新计算总权重
    if (updates.categories) {
      updatedRubric.totalWeight = this.calculateTotalWeight(updates.categories);
    }

    // 验证更新后的评分卡
    const validation = this.validateRubric(updatedRubric);
    if (!validation.isValid) {
      throw new Error(`Invalid rubric update: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    await this.saveRubric(updatedRubric);
    return updatedRubric;
  }

  async deleteRubric(id: string): Promise<boolean> {
    const rubrics = await this.loadRubrics();
    const index = rubrics.findIndex(r => r.id === id);
    
    if (index === -1) {
      return false;
    }

    rubrics.splice(index, 1);
    await this.saveRubrics(rubrics);
    return true;
  }

  async getRubric(id: string): Promise<ScoringRubric | null> {
    const rubrics = await this.loadRubrics();
    return rubrics.find(r => r.id === id) || null;
  }

  async listRubrics(): Promise<ScoringRubric[]> {
    const rubrics = await this.loadRubrics();
    return rubrics.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async duplicateRubric(id: string, newName?: string): Promise<ScoringRubric> {
    const originalRubric = await this.getRubric(id);
    if (!originalRubric) {
      throw new Error(`Rubric with id ${id} not found`);
    }

    const duplicatedData = {
      ...originalRubric,
      name: newName || `${originalRubric.name} (副本)`,
      metadata: {
        ...originalRubric.metadata,
        isTemplate: false
      }
    };

    // 删除 ID 和时间戳，让 createRubric 重新生成
    delete (duplicatedData as any).id;
    delete (duplicatedData as any).createdAt;
    delete (duplicatedData as any).updatedAt;

    return await this.createRubric(duplicatedData);
  }

  validateRubric(rubric: ScoringRubric): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 基本信息验证
    if (!rubric.name || rubric.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: '评分卡名称不能为空',
        severity: 'error'
      });
    }

    if (!rubric.description || rubric.description.trim().length === 0) {
      errors.push({
        field: 'description',
        message: '评分卡描述不能为空',
        severity: 'error'
      });
    }

    // 分类验证
    if (!rubric.categories || rubric.categories.length === 0) {
      errors.push({
        field: 'categories',
        message: '至少需要一个评分分类',
        severity: 'error'
      });
    }

    // 权重验证
    const totalWeight = this.calculateTotalWeight(rubric.categories);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      errors.push({
        field: 'categories',
        message: `所有分类权重总和必须为1.0，当前为${totalWeight.toFixed(2)}`,
        severity: 'error'
      });
    }

    // 分类详细验证
    rubric.categories.forEach((category, categoryIndex) => {
      if (!category.name || category.name.trim().length === 0) {
        errors.push({
          field: `categories[${categoryIndex}].name`,
          message: `分类${categoryIndex + 1}的名称不能为空`,
          severity: 'error'
        });
      }

      if (category.weight <= 0 || category.weight > 1) {
        errors.push({
          field: `categories[${categoryIndex}].weight`,
          message: `分类${categoryIndex + 1}的权重必须在0到1之间`,
          severity: 'error'
        });
      }

      if (!category.criteria || category.criteria.length === 0) {
        errors.push({
          field: `categories[${categoryIndex}].criteria`,
          message: `分类"${category.name}"至少需要一个评分标准`,
          severity: 'error'
        });
      }

      // 标准详细验证
      category.criteria.forEach((criterion, criterionIndex) => {
        if (!criterion.name || criterion.name.trim().length === 0) {
          errors.push({
            field: `categories[${categoryIndex}].criteria[${criterionIndex}].name`,
            message: `分类"${category.name}"的标准${criterionIndex + 1}的名称不能为空`,
            severity: 'error'
          });
        }

        if (!criterion.scoringLevels || criterion.scoringLevels.length === 0) {
          errors.push({
            field: `categories[${categoryIndex}].criteria[${criterionIndex}].scoringLevels`,
            message: `标准"${criterion.name}"至少需要一个评分等级`,
            severity: 'error'
          });
        }

        // 评分等级验证
        criterion.scoringLevels.forEach((level, levelIndex) => {
          if (level.level < 1 || level.level > 5) {
            errors.push({
              field: `categories[${categoryIndex}].criteria[${criterionIndex}].scoringLevels[${levelIndex}].level`,
              message: `标准"${criterion.name}"的等级${levelIndex + 1}的分值必须在1-5之间`,
              severity: 'error'
            });
          }

          if (!level.name || level.name.trim().length === 0) {
            errors.push({
              field: `categories[${categoryIndex}].criteria[${criterionIndex}].scoringLevels[${levelIndex}].name`,
              message: `标准"${criterion.name}"的等级${levelIndex + 1}的名称不能为空`,
              severity: 'error'
            });
          }

          if (!level.description || level.description.trim().length === 0) {
            errors.push({
              field: `categories[${categoryIndex}].criteria[${criterionIndex}].scoringLevels[${levelIndex}].description`,
              message: `标准"${criterion.name}"的等级${levelIndex + 1}的描述不能为空`,
              severity: 'error'
            });
          }
        });
      });
    });

    // 质量检查警告
    if (rubric.categories.length > 10) {
      warnings.push({
        field: 'categories',
        message: '分类数量过多，可能影响评分效率',
        suggestion: '考虑合并相关分类或创建更简洁的评分卡'
      });
    }

    const totalCriteria = rubric.categories.reduce((sum, cat) => sum + cat.criteria.length, 0);
    if (totalCriteria > 20) {
      warnings.push({
        field: 'criteria',
        message: '评分标准数量过多，可能影响评分效率',
        suggestion: '考虑精简标准或分组评估'
      });
    }

    // 计算质量分数
    const qualityScore = this.calculateQualityScore(errors, warnings, totalCriteria);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: qualityScore
    };
  }

  async exportRubric(id: string): Promise<string> {
    const rubric = await this.getRubric(id);
    if (!rubric) {
      throw new Error(`Rubric with id ${id} not found`);
    }

    return JSON.stringify(rubric, null, 2);
  }

  async importRubric(data: string): Promise<ScoringRubric> {
    try {
      const rubricData = JSON.parse(data);
      
      // 验证导入的数据结构
      const requiredFields = ['name', 'description', 'categories'];
      for (const field of requiredFields) {
        if (!rubricData[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // 清理可能存在的旧数据
      delete rubricData.id;
      delete rubricData.createdAt;
      delete rubricData.updatedAt;

      return await this.createRubric(rubricData);
    } catch (error) {
      throw new Error(`Failed to import rubric: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }
  }

  // 预设模板管理
  async getLevelPresets(): Promise<ScoringLevelPreset[]> {
    const presets = this.context.globalState.get<ScoringLevelPreset[]>(this.presetsKey, []);
    
    // 如果没有预设，创建默认预设
    if (presets.length === 0) {
      const defaultPresets = this.createDefaultLevelPresets();
      await this.context.globalState.update(this.presetsKey, defaultPresets);
      return defaultPresets;
    }
    
    return presets;
  }

  async getCategoryPresets(): Promise<CategoryPreset[]> {
    // 返回一些默认的分类预设
    return this.createDefaultCategoryPresets();
  }

  // 辅助方法
  private async loadRubrics(): Promise<ScoringRubric[]> {
    return this.context.globalState.get<ScoringRubric[]>(this.storageKey, []);
  }

  private async saveRubrics(rubrics: ScoringRubric[]): Promise<void> {
    await this.context.globalState.update(this.storageKey, rubrics);
  }

  private async saveRubric(rubric: ScoringRubric): Promise<void> {
    const rubrics = await this.loadRubrics();
    const existingIndex = rubrics.findIndex(r => r.id === rubric.id);
    
    if (existingIndex >= 0) {
      rubrics[existingIndex] = rubric;
    } else {
      rubrics.push(rubric);
    }
    
    await this.saveRubrics(rubrics);
  }

  private calculateTotalWeight(categories: any[]): number {
    return categories.reduce((sum, category) => sum + (category.weight || 0), 0);
  }

  private calculateQualityScore(errors: ValidationError[], warnings: ValidationWarning[], totalCriteria: number): number {
    let score = 100;
    
    // 根据错误数量扣分
    score -= errors.length * 20;
    
    // 根据警告数量扣分
    score -= warnings.length * 10;
    
    // 根据标准数量调整
    if (totalCriteria < 3) score -= 15; // 标准太少
    if (totalCriteria > 15) score -= 10; // 标准太多
    
    return Math.max(0, Math.min(100, score));
  }

  private createDefaultLevelPresets(): ScoringLevelPreset[] {
    return [
      {
        name: '标准5分制',
        description: '1-5分标准评分制',
        levels: [
          { level: 1, name: '不合格', description: '未达到基本要求', guidance: '需要大幅改进' },
          { level: 2, name: '需改进', description: '部分达到要求', guidance: '需要明显改进' },
          { level: 3, name: '一般', description: '基本达到要求', guidance: '有小幅改进空间' },
          { level: 4, name: '良好', description: '较好地达到要求', guidance: '有细微改进空间' },
          { level: 5, name: '优秀', description: '完全达到并超越要求', guidance: '作为优秀案例' }
        ]
      },
      {
        name: '简化3分制',
        description: '1-3分简化评分制',
        levels: [
          { level: 1, name: '需要改进', description: '未达到期望', guidance: '需要重点改进' },
          { level: 2, name: '符合要求', description: '达到基本期望', guidance: '可以进一步优化' },
          { level: 3, name: '超出期望', description: '超越基本期望', guidance: '可作为榜样' }
        ]
      }
    ];
  }

  private createDefaultCategoryPresets(): CategoryPreset[] {
    return [
      {
        name: '项目评估',
        description: '适用于项目成果评估',
        criteria: [
          {
            name: '技术实现',
            description: '技术方案的合理性和实现质量',
            scoringLevels: [
              { level: 1, name: '不合理', description: '技术方案存在严重问题', guidance: '需要重新设计' },
              { level: 2, name: '基本合理', description: '技术方案基本可行', guidance: '需要优化' },
              { level: 3, name: '良好', description: '技术方案合理', guidance: '有改进空间' },
              { level: 4, name: '优秀', description: '技术方案优秀', guidance: '细节可优化' },
              { level: 5, name: '卓越', description: '技术方案卓越', guidance: '可作为标杆' }
            ]
          },
          {
            name: '业务价值',
            description: '项目对业务的贡献和价值',
            scoringLevels: [
              { level: 1, name: '低价值', description: '业务价值很低', guidance: '需重新评估' },
              { level: 2, name: '一般价值', description: '有一定业务价值', guidance: '需提升价值' },
              { level: 3, name: '良好价值', description: '业务价值良好', guidance: '可进一步提升' },
              { level: 4, name: '高价值', description: '业务价值很高', guidance: '价值突出' },
              { level: 5, name: '极高价值', description: '业务价值极高', guidance: '价值典范' }
            ]
          }
        ]
      }
    ];
  }
}