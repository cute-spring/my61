// Core data structures and interfaces for AI Intelligent Scoring System
// AI智能评分系统核心数据结构与接口

export interface ScoringRubric {
  id: string;
  name: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  categories: ScoringCategory[];
  totalWeight: number;
  metadata: {
    author?: string;
    department?: string;
    tags?: string[];
    isTemplate?: boolean;
    targetScenarios?: string[];
  };
}

export interface ScoringCategory {
  id: string;
  name: string;
  description: string;
  weight: number; // 0-1
  criteria: ScoringCriterion[];
}

export interface ScoringCriterion {
  id: string;
  name: string;
  description: string;
  scoringLevels: ScoringLevel[];
  examples?: string[];
  weight?: number; // 可选，如果不提供则平均分配
}

export interface ScoringLevel {
  level: number; // 1-5
  name: string;
  description: string;
  guidance: string;
  scoreRange?: [number, number]; // 分数范围
}

export interface EvaluationResult {
  id: string;
  rubricId: string;
  rubricName: string;
  textContent: string;
  timestamp: string;
  overallScore: number;
  overallScoreNormalized: number; // 0-1
  categoryResults: CategoryResult[];
  criterionResults: CriterionResult[];
  feedback: EvaluationFeedback;
  confidence: number; // 0-1
  metadata: EvaluationMetadata;
}

export interface CategoryResult {
  categoryId: string;
  categoryName: string;
  score: number;
  scoreNormalized: number;
  weight: number;
  weightedScore: number;
  feedback: string;
  criterionResults: CriterionResult[];
}

export interface CriterionResult {
  criterionId: string;
  criterionName: string;
  score: number;
  scoreNormalized: number;
  reasoning: string;
  evidence: string[];
  confidence: number;
  level?: ScoringLevel;
}

export interface EvaluationFeedback {
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  nextSteps?: string[];
}

export interface EvaluationMetadata {
  evaluationTime: number;
  modelUsed: string;
  tokenCount?: number;
  textLength: number;
  evaluationType: 'full' | 'quick' | 'custom';
  retryCount: number;
  errorCount: number;
}

// AI Engine interfaces
export interface EvaluationRequest {
  rubric: ScoringRubric;
  textContent: string;
  options?: EvaluationOptions;
}

export interface EvaluationOptions {
  includeDetailedReasoning?: boolean;
  includeEvidence?: boolean;
  temperature?: number;
  maxTokens?: number;
  customPrompt?: string;
}

export interface AIPromptTemplate {
  systemPrompt: string;
  userPromptTemplate: string;
  outputFormat: JSONSchema;
  examples?: PromptExample[];
}

export interface PromptExample {
  input: string;
  output: any;
  explanation?: string;
}

export interface JSONSchema {
  type: string;
  properties: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
}

// Rubric Manager interfaces
export interface RubricManager {
  createRubric(rubric: Omit<ScoringRubric, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScoringRubric>;
  updateRubric(id: string, updates: Partial<ScoringRubric>): Promise<ScoringRubric>;
  deleteRubric(id: string): Promise<boolean>;
  getRubric(id: string): Promise<ScoringRubric | null>;
  listRubrics(): Promise<ScoringRubric[]>;
  duplicateRubric(id: string, newName?: string): Promise<ScoringRubric>;
  validateRubric(rubric: ScoringRubric): ValidationResult;
  exportRubric(id: string): Promise<string>;
  importRubric(data: string): Promise<ScoringRubric>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score?: number; // 评分卡质量分数
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// Analytics interfaces
export interface RubricAnalytics {
  rubricId: string;
  usageCount: number;
  averageScore: number;
  scoreDistribution: { [key: number]: number };
  categoryPerformance: { [categoryId: string]: number };
  commonStrengths: string[];
  commonWeaknesses: string[];
  lastUsed: string;
  evaluationTrend: 'improving' | 'declining' | 'stable';
}

export interface EvaluationAnalytics {
  totalEvaluations: number;
  averageEvaluationTime: number;
  averageConfidence: number;
  topRubrics: { rubricId: string; count: number }[];
  scoreDistribution: { [key: number]: number };
  monthlyTrends: { month: string; count: number; avgScore: number }[];
}

// UI interfaces
export interface EvaluationPanelOptions {
  showDetailedResults?: boolean;
  showConfidence?: boolean;
  showMetadata?: boolean;
  allowExport?: boolean;
  allowFeedback?: boolean;
}

export interface RubricEditorOptions {
  allowCustomLevels?: boolean;
  showValidation?: boolean;
  suggestImprovements?: boolean;
}

// Event interfaces
export interface EvaluationEvent {
  type: 'evaluation_started' | 'evaluation_completed' | 'evaluation_failed';
  rubricId: string;
  textLength: number;
  timestamp: string;
  metadata?: any;
}

export interface RubricEvent {
  type: 'rubric_created' | 'rubric_updated' | 'rubric_deleted' | 'rubric_used';
  rubricId: string;
  timestamp: string;
  metadata?: any;
}

// Error handling
export interface EvaluationError {
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
  timestamp: string;
}

export class ScoringSystemError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = 'ScoringSystemError';
  }
}

// Utility types
export type RubricTemplate = Omit<ScoringRubric, 'id' | 'createdAt' | 'updatedAt'>;

export interface ScoringLevelPreset {
  name: string;
  levels: ScoringLevel[];
  description: string;
}

export interface CategoryPreset {
  name: string;
  description: string;
  criteria: Omit<ScoringCriterion, 'id'>[];
}