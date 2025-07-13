/**
 * Performance Optimization Module for AI Jira Planning Assistant
 * Implements caching, rate limiting, and performance monitoring
 */

import * as vscode from 'vscode';
import { getLLMResponse } from '../../llm';
import { ProcessedRequirement, ProfessionalSuggestion, JiraTicketCollection } from './jiraPlanningTypes';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
    hits: number;
}

interface PerformanceMetrics {
    aiRequestCount: number;
    averageResponseTime: number;
    cacheHitRate: number;
    errorRate: number;
    sessionDuration: number;
}

export class JiraPlannerPerformanceManager {
    private cache = new Map<string, CacheEntry<any>>();
    private rateLimiter = new Map<string, number[]>();
    private metrics: PerformanceMetrics = {
        aiRequestCount: 0,
        averageResponseTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        sessionDuration: 0
    };

    // Cache configuration
    private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
    private readonly MAX_CACHE_SIZE = 100;
    private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
    private readonly RATE_LIMIT_MAX_REQUESTS = 20;

    /**
     * Get cached AI response or fetch new one
     */
    async getCachedAIResponse(
        prompt: string, 
        cacheKey: string,
        bypassCache: boolean = false
    ): Promise<string | null> {
        const startTime = Date.now();

        try {
            // Check cache first (unless bypassed)
            if (!bypassCache) {
                const cached = this.getFromCache<string>(cacheKey);
                if (cached) {
                    this.updateMetrics({ cacheHit: true, responseTime: Date.now() - startTime });
                    return cached;
                }
            }

            // Rate limiting check
            if (!this.checkRateLimit('ai_requests')) {
                throw new Error('Rate limit exceeded. Please wait before making more requests.');
            }

            // Fetch from AI
            const response = await getLLMResponse(prompt);
            
            // Cache the response
            if (response) {
                this.setCache(cacheKey, response);
            }

            this.updateMetrics({ 
                cacheHit: false, 
                responseTime: Date.now() - startTime,
                success: !!response 
            });

            return response || null;
        } catch (error) {
            this.updateMetrics({ 
                cacheHit: false, 
                responseTime: Date.now() - startTime,
                success: false 
            });
            throw error;
        }
    }

    /**
     * Cache requirement processing results
     */
    async getCachedRequirements(
        originalInput: string,
        analysis: string,
        processor: () => Promise<ProcessedRequirement[]>
    ): Promise<ProcessedRequirement[]> {
        const cacheKey = `requirements_${this.hashString(originalInput + analysis)}`;
        
        const cached = this.getFromCache<ProcessedRequirement[]>(cacheKey);
        if (cached) {
            return cached;
        }

        const requirements = await processor();
        this.setCache(cacheKey, requirements);
        return requirements;
    }

    /**
     * Cache suggestion generation results
     */
    async getCachedSuggestions(
        requirements: ProcessedRequirement[],
        generator: () => Promise<ProfessionalSuggestion[]>
    ): Promise<ProfessionalSuggestion[]> {
        const cacheKey = `suggestions_${this.hashString(JSON.stringify(requirements))}`;
        
        const cached = this.getFromCache<ProfessionalSuggestion[]>(cacheKey);
        if (cached) {
            return cached;
        }

        const suggestions = await generator();
        this.setCache(cacheKey, suggestions);
        return suggestions;
    }

    /**
     * Cache ticket generation results
     */
    async getCachedTickets(
        requirements: ProcessedRequirement[],
        appliedSuggestions: string[],
        generator: () => Promise<JiraTicketCollection>
    ): Promise<JiraTicketCollection> {
        const cacheKey = `tickets_${this.hashString(JSON.stringify({ requirements, appliedSuggestions }))}`;
        
        const cached = this.getFromCache<JiraTicketCollection>(cacheKey);
        if (cached) {
            return cached;
        }

        const tickets = await generator();
        this.setCache(cacheKey, tickets);
        return tickets;
    }

    /**
     * Batch AI requests to reduce API calls
     */
    async batchAIRequests(requests: Array<{ prompt: string; cacheKey: string }>): Promise<string[]> {
        const results: string[] = [];
        const uncachedRequests: Array<{ prompt: string; cacheKey: string; index: number }> = [];

        // Check cache for all requests
        requests.forEach((request, index) => {
            const cached = this.getFromCache<string>(request.cacheKey);
            if (cached) {
                results[index] = cached;
            } else {
                uncachedRequests.push({ ...request, index });
            }
        });

        // Batch process uncached requests with delay to respect rate limits
        for (const request of uncachedRequests) {
            try {
                const response = await this.getCachedAIResponse(
                    request.prompt, 
                    request.cacheKey, 
                    false
                );
                results[request.index] = response || '';
                
                // Small delay between requests to avoid overwhelming the API
                await this.delay(100);
            } catch (error) {
                console.error(`Error in batch request ${request.index}:`, error);
                results[request.index] = '';
            }
        }

        return results;
    }

    /**
     * Preload common suggestions based on requirement patterns
     */
    async preloadCommonSuggestions(requirements: ProcessedRequirement[]): Promise<void> {
        const patterns = this.identifyRequirementPatterns(requirements);
        
        const preloadPromises = patterns.map(async (pattern) => {
            const cacheKey = `preload_suggestions_${pattern}`;
            if (!this.getFromCache(cacheKey)) {
                try {
                    const prompt = this.generatePreloadPrompt(pattern);
                    await this.getCachedAIResponse(prompt, cacheKey);
                } catch (error) {
                    console.warn(`Failed to preload suggestions for pattern ${pattern}:`, error);
                }
            }
        });

        await Promise.all(preloadPromises);
    }

    /**
     * Get performance metrics
     */
    getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }

    /**
     * Reset performance metrics
     */
    resetMetrics(): void {
        this.metrics = {
            aiRequestCount: 0,
            averageResponseTime: 0,
            cacheHitRate: 0,
            errorRate: 0,
            sessionDuration: 0
        };
    }

    /**
     * Clean up expired cache entries
     */
    cleanupCache(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (entry.expiresAt < now) {
                this.cache.delete(key);
            }
        }

        // If cache is still too large, remove least recently used entries
        if (this.cache.size > this.MAX_CACHE_SIZE) {
            const entries = Array.from(this.cache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            const toRemove = entries.slice(0, this.cache.size - this.MAX_CACHE_SIZE);
            toRemove.forEach(([key]) => this.cache.delete(key));
        }
    }

    /**
     * Export cache for session persistence
     */
    exportCache(): any {
        const cacheData: any = {};
        for (const [key, entry] of this.cache.entries()) {
            if (entry.expiresAt > Date.now()) {
                cacheData[key] = entry;
            }
        }
        return cacheData;
    }

    /**
     * Import cache from session data
     */
    importCache(cacheData: any): void {
        if (!cacheData) {
            return;
        }
        
        for (const [key, entry] of Object.entries(cacheData)) {
            if (entry && typeof entry === 'object' && 'expiresAt' in entry) {
                const cacheEntry = entry as CacheEntry<any>;
                if (cacheEntry.expiresAt > Date.now()) {
                    this.cache.set(key, cacheEntry);
                }
            }
        }
    }

    // Private helper methods
    private getFromCache<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (entry && entry.expiresAt > Date.now()) {
            entry.hits++;
            entry.timestamp = Date.now();
            return entry.data as T;
        }
        
        if (entry) {
            this.cache.delete(key);
        }
        return null;
    }

    private setCache<T>(key: string, data: T): void {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            expiresAt: Date.now() + this.CACHE_TTL,
            hits: 0
        };
        
        this.cache.set(key, entry);
        this.cleanupCache();
    }

    private checkRateLimit(key: string): boolean {
        const now = Date.now();
        const requests = this.rateLimiter.get(key) || [];
        
        // Remove old requests outside the window
        const recentRequests = requests.filter(time => now - time < this.RATE_LIMIT_WINDOW);
        
        if (recentRequests.length >= this.RATE_LIMIT_MAX_REQUESTS) {
            return false;
        }

        recentRequests.push(now);
        this.rateLimiter.set(key, recentRequests);
        return true;
    }

    private updateMetrics(update: { 
        cacheHit: boolean; 
        responseTime: number; 
        success?: boolean 
    }): void {
        this.metrics.aiRequestCount++;
        
        // Update average response time
        this.metrics.averageResponseTime = (
            (this.metrics.averageResponseTime * (this.metrics.aiRequestCount - 1)) + 
            update.responseTime
        ) / this.metrics.aiRequestCount;
        
        // Update cache hit rate
        const totalRequests = this.metrics.aiRequestCount;
        const cacheHits = update.cacheHit ? 1 : 0;
        this.metrics.cacheHitRate = (
            (this.metrics.cacheHitRate * (totalRequests - 1)) + cacheHits
        ) / totalRequests;
        
        // Update error rate
        if (update.success !== undefined) {
            const errors = update.success ? 0 : 1;
            this.metrics.errorRate = (
                (this.metrics.errorRate * (totalRequests - 1)) + errors
            ) / totalRequests;
        }
    }

    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    private identifyRequirementPatterns(requirements: ProcessedRequirement[]): string[] {
        const patterns: string[] = [];
        
        // Identify common patterns
        const categories = [...new Set(requirements.map(r => r.category))];
        const priorities = [...new Set(requirements.map(r => r.priority))];
        
        patterns.push(...categories.map(c => `category_${c}`));
        patterns.push(...priorities.map(p => `priority_${p}`));
        
        // Identify technology patterns
        const techKeywords = ['auth', 'api', 'database', 'ui', 'security', 'performance'];
        const content = requirements.map(r => r.title + ' ' + r.description).join(' ').toLowerCase();
        
        techKeywords.forEach(keyword => {
            if (content.includes(keyword)) {
                patterns.push(`tech_${keyword}`);
            }
        });
        
        return patterns;
    }

    private generatePreloadPrompt(pattern: string): string {
        const basePrompt = `Generate professional suggestions for projects with ${pattern} requirements. Focus on best practices, common pitfalls, and proven solutions.`;
        return basePrompt;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
} 