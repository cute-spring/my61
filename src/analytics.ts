import * as vscode from 'vscode';

/**
 * Usage Analytics System
 * Tracks user interactions with extension features for insights and improvements
 * 
 * Performance Optimizations:
 * - Backend sync uses batching and throttling to avoid performance impact
 * - Sync operations are async and non-blocking
 * - Local tracking is immediate, backend sync is delayed/batched
 * - Maximum batch size and time delay configurable
 */

export interface UsageMetrics {
    featureName: string;
    functionName?: string; // New: specific function within a feature
    timestamp: number;
    userId?: string;
    sessionId: string;
    metadata?: Record<string, any>;
}

export class UsageAnalytics {
    private static instance: UsageAnalytics;
    private context: vscode.ExtensionContext;
    private sessionId: string;
    private isEnabled: boolean = true;
    private pendingSyncQueue: Array<{ featureName: string; functionName?: string; timestamp: number }> = [];
    private syncTimeout: NodeJS.Timeout | undefined;
    private readonly SYNC_DELAY_MS = 5000; // 5 seconds delay for batching
    private readonly MAX_BATCH_SIZE = 10; // Max items in a batch

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.sessionId = this.generateSessionId();
        this.loadSettings();
    }

    public static initialize(context: vscode.ExtensionContext): UsageAnalytics {
        if (!UsageAnalytics.instance) {
            UsageAnalytics.instance = new UsageAnalytics(context);
            // Start auto-sync after initialization
            setTimeout(() => {
                UsageAnalytics.instance.startAutoSync();
            }, 10000); // Start auto-sync after 10 seconds
        }
        return UsageAnalytics.instance;
    }

    public static getInstance(): UsageAnalytics {
        if (!UsageAnalytics.instance) {
            throw new Error('UsageAnalytics not initialized. Call initialize() first.');
        }
        return UsageAnalytics.instance;
    }

    /**
     * Track feature usage - Call this at the beginning of each feature function
     * @param featureName Unique identifier for the feature
     * @param metadata Optional additional data about the usage
     */
    public trackFeatureUsage(featureName: string, metadata?: Record<string, any>): void;
    public trackFeatureUsage(featureName: string, functionName: string, metadata?: Record<string, any>): void;
    public trackFeatureUsage(featureName: string, functionNameOrMetadata?: string | Record<string, any>, metadata?: Record<string, any>): void {
        if (!this.isEnabled) {
            return;
        }

        let functionName: string | undefined;
        let actualMetadata: Record<string, any> | undefined;

        // Handle overloaded parameters
        if (typeof functionNameOrMetadata === 'string') {
            functionName = functionNameOrMetadata;
            actualMetadata = metadata;
        } else {
            actualMetadata = functionNameOrMetadata;
        }

        try {
            const metrics: UsageMetrics = {
                featureName,
                functionName,
                timestamp: Date.now(),
                sessionId: this.sessionId,
                metadata: actualMetadata
            };

            // Store metrics locally
            this.storeMetrics(metrics);

            // Log for development (can be removed in production)
            const config = vscode.workspace.getConfiguration('copilotTools.analytics');
            const detailedLogging = config.get<boolean>('detailedLogging', false);
            
            if (detailedLogging) {
                const logKey = functionName ? `${featureName}.${functionName}` : featureName;
                console.log(`📊 Function used: ${logKey}`, actualMetadata);
            }

            // Increment feature and function counters
            this.incrementFeatureCounter(featureName);
            if (functionName) {
                this.incrementFunctionCounter(featureName, functionName);
            }

            // Queue for async backend sync (batched and throttled)
            this.queueForBackendSync(featureName, functionName);

        } catch (error) {
            console.error('Error tracking feature usage:', error);
        }
    }

    /**
     * Get usage statistics for all features
     */
    public getUsageStats(): Record<string, number> {
        try {
            return this.context.globalState.get('usageStats', {});
        } catch (error) {
            console.error('Error getting usage stats:', error);
            return {};
        }
    }

    /**
     * Get function-level usage statistics
     */
    public getFunctionUsageStats(): Record<string, Record<string, number>> {
        try {
            return this.context.globalState.get('functionStats', {});
        } catch (error) {
            console.error('Error getting function usage stats:', error);
            return {};
        }
    }

    /**
     * Get combined usage statistics with function breakdown
     */
    public getCombinedUsageStats(): { 
        features: Record<string, number>;
        functions: Record<string, Record<string, number>>;
        topFunctions: Array<{ feature: string; function: string; count: number; key: string }>;
    } {
        const features = this.getUsageStats();
        const functions = this.getFunctionUsageStats();
        
        // Create a flat list of top functions across all features
        const topFunctions: Array<{ feature: string; function: string; count: number; key: string }> = [];
        
        for (const [feature, functionCounts] of Object.entries(functions)) {
            for (const [functionName, count] of Object.entries(functionCounts)) {
                topFunctions.push({
                    feature,
                    function: functionName,
                    count,
                    key: `${feature}.${functionName}`
                });
            }
        }
        
        // Sort by usage count (descending)
        topFunctions.sort((a, b) => b.count - a.count);
        
        return {
            features,
            functions,
            topFunctions: topFunctions.slice(0, 20) // Top 20 functions
        };
    }

    /**
     * Get detailed metrics for a specific time period
     */
    public getDetailedMetrics(days: number = 30): UsageMetrics[] {
        try {
            const allMetrics = this.context.globalState.get<UsageMetrics[]>('detailedMetrics', []);
            const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
            return allMetrics.filter(metric => metric.timestamp > cutoffTime);
        } catch (error) {
            console.error('Error getting detailed metrics:', error);
            return [];
        }
    }

    /**
     * Reset all usage statistics
     */
    public async resetStats(): Promise<void> {
        try {
            await this.context.globalState.update('usageStats', {});
            await this.context.globalState.update('functionStats', {});
            await this.context.globalState.update('detailedMetrics', []);
            await this.context.globalState.update('unsyncedMetrics', []);
            // Also clear the user ID so it can be regenerated with current GitHub session
            await this.context.globalState.update('analyticsUserId', undefined);
            console.log('📊 Usage statistics reset (including user ID for regeneration)');
        } catch (error) {
            console.error('Error resetting stats:', error);
            throw error; // Re-throw so caller knows it failed
        }
    }

    /**
     * Verify reset worked by checking if all data is cleared
     */
    public verifyReset(): { isReset: boolean; details: any } {
        const usageStats = this.getUsageStats();
        const functionStats = this.getFunctionUsageStats();
        const detailedMetrics = this.getDetailedMetrics(30);
        const unsyncedMetrics = this.context.globalState.get<any[]>('unsyncedMetrics', []);
        const userId = this.context.globalState.get<string>('analyticsUserId');

        const isReset = (
            Object.keys(usageStats).length === 0 &&
            Object.keys(functionStats).length === 0 &&
            detailedMetrics.length === 0 &&
            unsyncedMetrics.length === 0 &&
            !userId
        );

        return {
            isReset,
            details: {
                usageStatsEmpty: Object.keys(usageStats).length === 0,
                functionStatsEmpty: Object.keys(functionStats).length === 0,
                detailedMetricsEmpty: detailedMetrics.length === 0,
                unsyncedMetricsEmpty: unsyncedMetrics.length === 0,
                userIdCleared: !userId,
                usageStats,
                functionStats,
                detailedMetricsCount: detailedMetrics.length,
                unsyncedMetricsCount: unsyncedMetrics.length,
                userId
            }
        };
    }

    /**
     * Sync analytics data with server
     */
    public async syncWithServer(): Promise<{ success: boolean; message: string }> {
        if (!this.isEnabled) {
            return { success: false, message: 'Analytics is disabled' };
        }

        try {
            trackUsage('analytics.sync.attempt');
            
            // Get unsynced metrics
            const unsyncedMetrics = this.getUnsyncedMetrics();
            if (unsyncedMetrics.length === 0) {
                return { success: true, message: 'No data to sync' };
            }

            // Prepare data for server
            const syncData = {
                userId: await this.getUserId(),
                sessionId: this.sessionId,
                extensionVersion: this.context.extension?.packageJSON?.version || 'unknown',
                metrics: unsyncedMetrics,
                timestamp: new Date().toISOString()
            };

            // Send to server (mock implementation)
            const result = await this.sendToServer(syncData);
            
            if (result.success) {
                // Mark metrics as synced
                await this.markMetricsAsSynced(unsyncedMetrics);
                trackUsage('analytics.sync.success', { count: unsyncedMetrics.length });
                return { success: true, message: `Synced ${unsyncedMetrics.length} events` };
            } else {
                trackUsage('analytics.sync.failure', { error: result.error });
                return { success: false, message: result.error || 'Sync failed' };
            }

        } catch (error) {
            console.error('Error syncing analytics:', error);
            trackUsage('analytics.sync.error', { error: String(error) });
            return { success: false, message: `Sync error: ${error}` };
        }
    }

    /**
     * Get unsynced metrics that need to be sent to server
     */
    private getUnsyncedMetrics(): UsageMetrics[] {
        try {
            return this.context.globalState.get<UsageMetrics[]>('unsyncedMetrics', []);
        } catch (error) {
            console.error('Error getting unsynced metrics:', error);
            return [];
        }
    }

    /**
     * Mock server API call - replace this with your actual API endpoint
     */
    private async sendToServer(data: any): Promise<{ success: boolean; error?: string }> {
        // Record sync attempt
        await this.context.globalState.update('lastSyncAttempt', new Date().toISOString());
        
        // TODO: Replace this mock implementation with actual API call
        
        // Mock API endpoint (replace with your actual endpoint)
        const API_ENDPOINT = 'https://api.yourcompany.com/analytics/collect';
        
        try {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

            // Mock implementation - replace with actual HTTP request
            const mockSuccess = Math.random() > 0.1; // 90% success rate for testing
            
            if (mockSuccess) {
                console.log('📊 [MOCK] Analytics data sent to server:', {
                    endpoint: API_ENDPOINT,
                    dataSize: JSON.stringify(data).length,
                    eventCount: data.metrics.length
                });
                return { success: true };
            } else {
                return { success: false, error: 'Mock server error' };
            }

            /* 
            // TODO: Replace mock implementation with actual API call like this:
            
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await this.getApiToken()}`,
                    'X-Extension-Version': data.extensionVersion
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const result = await response.json();
                return { success: true };
            } else {
                const errorText = await response.text();
                return { success: false, error: `HTTP ${response.status}: ${errorText}` };
            }
            */

        } catch (error) {
            return { success: false, error: String(error) };
        }
    }

    /**
     * Mark metrics as synced (remove from unsynced queue)
     */
    private async markMetricsAsSynced(syncedMetrics: UsageMetrics[]): Promise<void> {
        try {
            const unsyncedMetrics = this.getUnsyncedMetrics();
            const syncedTimestamps = new Set(syncedMetrics.map(m => m.timestamp));
            
            // Remove synced metrics from unsynced queue
            const remainingUnsynced = unsyncedMetrics.filter(m => !syncedTimestamps.has(m.timestamp));
            
            await this.context.globalState.update('unsyncedMetrics', remainingUnsynced);
        } catch (error) {
            console.error('Error marking metrics as synced:', error);
        }
    }

    /**
     * Get or generate a unique user ID for analytics
     * Prefers GitHub Copilot account ID if available
     */
    private async getUserId(): Promise<string> {
        try {
            // First try to get GitHub Copilot user ID
            const copilotUserId = await this.getCopilotUserId();
            if (copilotUserId) {
                // Store the copilot user ID for consistency
                await this.context.globalState.update('analyticsUserId', copilotUserId);
                return copilotUserId;
            }

            // Fall back to stored user ID
            let userId = this.context.globalState.get<string>('analyticsUserId');
            if (!userId) {
                // Generate a new anonymous user ID as last resort
                userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
                await this.context.globalState.update('analyticsUserId', userId);
            }
            return userId;
        } catch (error) {
            console.error('Error getting user ID:', error);
            return 'unknown';
        }
    }

    /**
     * Attempt to get GitHub Copilot user ID from authentication
     */
    private async getCopilotUserId(): Promise<string | null> {
        try {
            // Try to get GitHub authentication session (used by Copilot)
            const session = await vscode.authentication.getSession('github', [], { 
                silent: true 
            });

            if (session?.account?.id) {
                // Use GitHub account ID with copilot prefix for clarity
                return `copilot_${session.account.id}`;
            }

            return null;
        } catch (error) {
            // Silent failure - user might not be signed in to GitHub/Copilot
            console.debug('Could not retrieve GitHub Copilot user ID:', error);
            return null;
        }
    }

    /**
     * Auto-sync with server periodically
     */
    public startAutoSync(): void {
        if (!this.isEnabled) {
            return;
        }

        // Sync every 5 minutes (configurable)
        const syncInterval = 5 * 60 * 1000; // 5 minutes
        
        setInterval(async () => {
            const unsyncedCount = this.getUnsyncedMetrics().length;
            if (unsyncedCount > 0) {
                console.log(`📊 Auto-syncing ${unsyncedCount} analytics events...`);
                const result = await this.syncWithServer();
                if (result.success) {
                    console.log('📊 Auto-sync successful:', result.message);
                } else {
                    console.log('📊 Auto-sync failed:', result.message);
                }
            }
        }, syncInterval);
    }



    /**
     * Enable or disable usage tracking
     */
    public setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
        
        // Update both global state and VS Code settings
        this.context.globalState.update('analyticsEnabled', enabled);
        
        // Update VS Code settings
        try {
            const config = vscode.workspace.getConfiguration('copilotTools.analytics');
            config.update('enabled', enabled, vscode.ConfigurationTarget.Global);
        } catch (error) {
            console.error('Error updating analytics settings:', error);
        }
    }

    /**
     * Check if analytics is enabled
     */
    public isAnalyticsEnabled(): boolean {
        return this.isEnabled;
    }

    /**
     * Get sync status information
     */
    public getSyncStatus(): { unsyncedCount: number; lastSyncAttempt?: string; userId: string } {
        try {
            const unsyncedCount = this.getUnsyncedMetrics().length;
            const lastSyncAttempt = this.context.globalState.get<string>('lastSyncAttempt');
            const userId = this.context.globalState.get<string>('analyticsUserId', 'not-generated');
            
            return {
                unsyncedCount,
                lastSyncAttempt,
                userId
            };
        } catch (error) {
            console.error('Error getting sync status:', error);
            return {
                unsyncedCount: 0,
                userId: 'error'
            };
        }
    }

    /**
     * Export usage data for analysis
     */
    public exportUsageData(): string {
        try {
            const combinedStats = this.getCombinedUsageStats();
            const detailedMetrics = this.getDetailedMetrics(90); // Last 90 days
            
            const exportData = {
                exportDate: new Date().toISOString(),
                sessionId: this.sessionId,
                summary: {
                    featureUsage: combinedStats.features,
                    functionUsage: combinedStats.functions,
                    topFunctions: combinedStats.topFunctions
                },
                detailedMetrics: detailedMetrics.map(metric => ({
                    ...metric,
                    timestamp: new Date(metric.timestamp).toISOString()
                }))
            };

            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            console.error('Error exporting usage data:', error);
            return '{}';
        }
    }

    private loadSettings(): void {
        try {
            // Check VS Code settings first
            const config = vscode.workspace.getConfiguration('copilotTools.analytics');
            const settingsEnabled = config.get<boolean>('enabled', true);
            
            // Fall back to global state if needed
            const stateEnabled = this.context.globalState.get('analyticsEnabled', true);
            
            // Use VS Code settings as the source of truth
            this.isEnabled = settingsEnabled;
            
            // Sync global state with settings
            if (stateEnabled !== settingsEnabled) {
                this.context.globalState.update('analyticsEnabled', settingsEnabled);
            }
        } catch (error) {
            console.error('Error loading analytics settings:', error);
            this.isEnabled = true; // Default to enabled
        }
    }

    private storeMetrics(metrics: UsageMetrics): void {
        try {
            // Store detailed metrics (keep last 1000 entries)
            const existing = this.context.globalState.get<UsageMetrics[]>('detailedMetrics', []);
            existing.push(metrics);
            
            // Keep only last 1000 entries to prevent storage bloat
            if (existing.length > 1000) {
                existing.splice(0, existing.length - 1000);
            }
            
            this.context.globalState.update('detailedMetrics', existing);

            // Also store in unsynced queue for server sync
            const unsynced = this.context.globalState.get<UsageMetrics[]>('unsyncedMetrics', []);
            unsynced.push(metrics);
            this.context.globalState.update('unsyncedMetrics', unsynced);
            
        } catch (error) {
            console.error('Error storing metrics:', error);
        }
    }

    private incrementFeatureCounter(featureName: string): void {
        try {
            const stats = this.getUsageStats();
            stats[featureName] = (stats[featureName] || 0) + 1;
            this.context.globalState.update('usageStats', stats);
        } catch (error) {
            console.error('Error incrementing feature counter:', error);
        }
    }

    private incrementFunctionCounter(featureName: string, functionName: string): void {
        try {
            const functionStats = this.getFunctionUsageStats();
            if (!functionStats[featureName]) {
                functionStats[featureName] = {};
            }
            functionStats[featureName][functionName] = (functionStats[featureName][functionName] || 0) + 1;
            this.context.globalState.update('functionStats', functionStats);
        } catch (error) {
            console.error('Error incrementing function counter:', error);
        }
    }

    /**
     * Queue usage data for async backend sync with batching and throttling
     */
    private queueForBackendSync(featureName: string, functionName?: string): void {
        try {
            // Add to pending queue
            this.pendingSyncQueue.push({
                featureName,
                functionName,
                timestamp: Date.now()
            });

            // If we hit the max batch size, flush immediately
            if (this.pendingSyncQueue.length >= this.MAX_BATCH_SIZE) {
                this.flushPendingSync();
                return;
            }

            // Clear existing timeout and set new one for batching
            if (this.syncTimeout) {
                clearTimeout(this.syncTimeout);
            }

            this.syncTimeout = setTimeout(() => {
                this.flushPendingSync();
            }, this.SYNC_DELAY_MS);

        } catch (error) {
            console.error('Error queuing backend sync:', error);
        }
    }

    /**
     * Flush pending sync queue to backend (async, non-blocking)
     */
    private async flushPendingSync(): Promise<void> {
        if (this.pendingSyncQueue.length === 0) {
            return;
        }

        // Clear timeout
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
            this.syncTimeout = undefined;
        }

        // Copy and clear the queue
        const batchToSync = [...this.pendingSyncQueue];
        this.pendingSyncQueue = [];

        // Process batch asynchronously without blocking
        setImmediate(async () => {
            try {
                const userId = await this.getUserId();
                
                // Group by feature+function for deduplication
                const syncMap = new Map<string, number>();
                
                for (const item of batchToSync) {
                    const key = item.functionName ? `${item.featureName}.${item.functionName}` : item.featureName;
                    syncMap.set(key, (syncMap.get(key) || 0) + 1);
                }

                // Send batched calls to backend
                const syncPromises = Array.from(syncMap.entries()).map(async ([funcName, count]) => {
                    for (let i = 0; i < count; i++) {
                        try {
                            await countCall(funcName, userId);
                        } catch (error) {
                            console.warn(`Failed to sync ${funcName} to backend:`, error);
                        }
                    }
                });

                // Execute all syncs in parallel (fire and forget)
                Promise.allSettled(syncPromises).then(results => {
                    const failures = results.filter(r => r.status === 'rejected');
                    if (failures.length > 0) {
                        console.warn(`${failures.length} backend sync operations failed out of ${results.length}`);
                    }
                }).catch(error => {
                    console.error('Error in batch sync completion:', error);
                });

            } catch (error) {
                console.error('Error in flushPendingSync:', error);
            }
        });
    }

    /**
     * Force immediate sync of all pending data (e.g., on extension deactivation)
     */
    public async forceSyncPending(): Promise<void> {
        return this.flushPendingSync();
    }

    /**
     * Sync usage data to backend API
     * @deprecated Use queueForBackendSync instead for better performance
     * @param featureName The feature name
     * @param functionName Optional function name
     */
    private async syncToBackend(featureName: string, functionName?: string): Promise<void> {
        try {
            // Get user ID for backend tracking
            const userId = await this.getUserId();
            
            // Construct function name for backend
            const funcName = functionName ? `${featureName}.${functionName}` : featureName;
            
            // Call the backend API (placeholder)
            await countCall(funcName, userId);
        } catch (error) {
            console.error('Error syncing to backend:', error);
            // Don't throw - backend sync failure shouldn't break local tracking
        }
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

/**
 * Convenience function to track feature usage
 * Call this at the beginning of each feature function
 */
export function trackUsage(featureName: string, metadata?: Record<string, any>): void;
export function trackUsage(featureName: string, functionName: string, metadata?: Record<string, any>): void;
export function trackUsage(featureName: string, functionNameOrMetadata?: string | Record<string, any>, metadata?: Record<string, any>): void {
    try {
        const analytics = UsageAnalytics.getInstance();
        if (typeof functionNameOrMetadata === 'string') {
            analytics.trackFeatureUsage(featureName, functionNameOrMetadata, metadata);
        } else {
            analytics.trackFeatureUsage(featureName, functionNameOrMetadata);
        }
    } catch (error) {
        // Silently fail if analytics not initialized
        console.warn('Analytics not initialized for feature:', featureName);
    }
}

/**
 * Track feature usage with automatic error handling
 * Use this for critical features where you want to ensure tracking
 */
export function trackUsageSafe(featureName: string, metadata?: Record<string, any>): void;
export function trackUsageSafe(featureName: string, functionName: string, metadata?: Record<string, any>): void;
export function trackUsageSafe(featureName: string, functionNameOrMetadata?: string | Record<string, any>, metadata?: Record<string, any>): void {
    try {
        if (typeof functionNameOrMetadata === 'string') {
            trackUsage(featureName, functionNameOrMetadata, metadata);
        } else {
            trackUsage(featureName, functionNameOrMetadata);
        }
    } catch (error) {
        // Completely silent - no logging to avoid noise
    }
}

/**
 * Call backend API to sync function usage count
 * This is a placeholder function for integrating with your backend system
 * @param funcName The name of the function being called
 * @param userId The user identifier
 */
export async function countCall(funcName: string, userId: string): Promise<void> {
    // TODO: Implement actual backend API call
    // Example implementation would make an HTTP request to your backend:
    /*
    try {
        const response = await fetch('https://your-backend-api.com/analytics/count', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiToken}`
            },
            body: JSON.stringify({
                functionName: funcName,
                userId: userId,
                timestamp: Date.now()
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Backend count updated:', result);
    } catch (error) {
        console.error('Failed to sync count to backend:', error);
    }
    */
    
    // Placeholder: Log the call for now
    console.log(`📊 Backend API call placeholder - Function: ${funcName}, User: ${userId}`);
}
