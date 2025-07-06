import * as vscode from 'vscode';
import { UsageAnalytics } from '../../analytics';

/**
 * Analytics Dashboard Webview
 * Displays usage statistics and provides data management options
 */
export class AnalyticsDashboard {
    private static instance: AnalyticsDashboard | undefined;
    private panel: vscode.WebviewPanel | undefined;
    private context: vscode.ExtensionContext;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public static getInstance(context: vscode.ExtensionContext): AnalyticsDashboard {
        if (!AnalyticsDashboard.instance) {
            AnalyticsDashboard.instance = new AnalyticsDashboard(context);
        }
        return AnalyticsDashboard.instance;
    }

    public async show(): Promise<void> {
        const columnToShowIn = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (this.panel) {
            // If we already have a panel, show it in the target column
            this.panel.reveal(columnToShowIn);
            this.updateContent();
            return;
        }

        // Create and show a new webview panel
        this.panel = vscode.window.createWebviewPanel(
            'analyticsPanel',
            'Usage Analytics Dashboard',
            columnToShowIn || vscode.ViewColumn.One,
            {
                // Enable scripts in the webview
                enableScripts: true,
                // And restrict the webview to only loading content from our extension's `media` directory.
                localResourceRoots: []
            }
        );

        // Set the webview's HTML content
        this.updateContent();

        // Handle messages from the webview
        this.panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'export':
                        this.exportData();
                        return;
                    case 'refresh':
                        this.updateContent();
                        return;
                    case 'toggleAnalytics':
                        this.toggleAnalytics(message.enabled);
                        return;
                    case 'syncNow':
                        this.syncNow();
                        return;
                }
            },
            undefined,
            this.context.subscriptions
        );

        // Handle disposal
        this.panel.onDidDispose(
            () => {
                this.panel = undefined;
            },
            null,
            this.context.subscriptions
        );
    }

    private updateContent(): void {
        if (!this.panel) {
            return;
        }

        const analytics = UsageAnalytics.getInstance();
        const combinedStats = analytics.getCombinedUsageStats();
        const detailedMetrics = analytics.getDetailedMetrics(30); // Last 30 days
        const isEnabled = analytics.isAnalyticsEnabled();

        this.panel.webview.html = this.getWebviewContent(combinedStats, detailedMetrics, isEnabled);
    }

    private getWebviewContent(
        combinedStats: { 
            features: Record<string, number>; 
            functions: Record<string, Record<string, number>>; 
            topFunctions: Array<{ feature: string; function: string; count: number; key: string }>;
        }, 
        detailedMetrics: any[], 
        isEnabled: boolean
    ): string {
        const analytics = UsageAnalytics.getInstance();
        const syncStatus = analytics.getSyncStatus();
        const stats = combinedStats.features;
        const totalUsage = Object.values(stats).reduce((sum, count) => sum + count, 0);
        const featuresUsed = Object.keys(stats).length;
        
        // Calculate usage over time (last 7 days)
        const now = Date.now();
        const daysData = Array.from({length: 7}, (_, i) => {
            const dayStart = now - (6 - i) * 24 * 60 * 60 * 1000;
            const dayEnd = dayStart + 24 * 60 * 60 * 1000;
            const dayCount = detailedMetrics.filter(m => 
                m.timestamp >= dayStart && m.timestamp < dayEnd
            ).length;
            return {
                day: new Date(dayStart).toLocaleDateString('en-US', { weekday: 'short' }),
                count: dayCount
            };
        });

        // Calculate max height for proper scaling (timeline container is 100px, leave 20px for label)
        const maxBarHeight = 80;
        const maxCount = Math.max(...daysData.map(d => d.count), 1);
        
        const timelineData = daysData.map(d => {
            const height = d.count === 0 ? 2 : Math.max((d.count / maxCount) * maxBarHeight, 2);
            return `<div class="timeline-day">
                <div class="timeline-bar" style="height: ${height}px" title="${d.count} uses"></div>
                <span class="timeline-label">${d.day}</span>
            </div>`;
        }).join('');

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
            <meta http-equiv="Pragma" content="no-cache">
            <meta http-equiv="Expires" content="0">
            <title>Usage Analytics Dashboard</title>
            <!-- Cache buster: ${Date.now()} -->
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                    padding: 20px;
                    margin: 0;
                    line-height: 1.6;
                }
                
                .container {
                    max-width: 800px;
                    margin: 0 auto;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                
                .status-indicator {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: bold;
                    margin-left: 10px;
                }
                
                .status-enabled {
                    background-color: var(--vscode-testing-iconPassed);
                    color: white;
                }
                
                .status-disabled {
                    background-color: var(--vscode-testing-iconFailed);
                    color: white;
                }
                
                .stats-overview {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }
                
                .stat-card {
                    background: var(--vscode-panel-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 8px;
                    padding: 20px;
                    text-align: center;
                }
                
                .stat-value {
                    font-size: 2.5em;
                    font-weight: bold;
                    color: var(--vscode-charts-blue);
                    margin-bottom: 5px;
                }
                
                .stat-label {
                    color: var(--vscode-descriptionForeground);
                    font-size: 0.9em;
                }
                
                .section {
                    margin-bottom: 30px;
                }
                
                .section-title {
                    font-size: 1.3em;
                    font-weight: bold;
                    margin-bottom: 15px;
                    color: var(--vscode-titleBar-activeForeground);
                }
                
                .usage-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                
                .usage-table th,
                .usage-table td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                
                .usage-table th {
                    background: var(--vscode-panel-background);
                    font-weight: bold;
                }
                
                .usage-bar {
                    width: 100px;
                    height: 8px;
                    background: var(--vscode-panel-border);
                    border-radius: 4px;
                    overflow: hidden;
                }
                
                .usage-fill {
                    height: 100%;
                    background: var(--vscode-charts-blue);
                    transition: width 0.3s ease;
                }
                
                .timeline {
                    display: flex;
                    justify-content: space-between;
                    align-items: end;
                    height: 100px;
                    margin: 20px 0;
                    padding: 0 10px;
                }
                
                .timeline-day {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    flex: 1;
                }
                
                .timeline-bar {
                    background: var(--vscode-charts-green);
                    width: 20px;
                    margin-bottom: 5px;
                    border-radius: 2px;
                    transition: height 0.3s ease;
                }
                
                .timeline-label {
                    font-size: 0.8em;
                    color: var(--vscode-descriptionForeground);
                }
                
                .buttons {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                    margin-top: 20px;
                }
                
                .button {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 10px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.9em;
                    transition: background-color 0.2s;
                }
                
                .button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                
                .button.secondary {
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                }
                
                .button.secondary:hover {
                    background: var(--vscode-button-secondaryHoverBackground);
                }
                
                .toggle-container {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 20px;
                }
                
                .toggle {
                    position: relative;
                    display: inline-block;
                    width: 40px;
                    height: 20px;
                }
                
                .toggle input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: var(--vscode-panel-border);
                    transition: .4s;
                    border-radius: 20px;
                }
                
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 16px;
                    width: 16px;
                    left: 2px;
                    bottom: 2px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                }
                
                input:checked + .slider {
                    background-color: var(--vscode-charts-blue);
                }
                
                input:checked + .slider:before {
                    transform: translateX(20px);
                }
                
                .sync-card .stat-value.pending {
                    color: var(--vscode-charts-orange);
                }
                
                .sync-card .stat-value.synced {
                    color: var(--vscode-charts-green);
                }
                
                .sync-time {
                    font-size: 0.8em;
                    color: var(--vscode-descriptionForeground);
                    margin-top: 4px;
                }
                
                .sync-info {
                    background: var(--vscode-panel-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 20px;
                }
                
                .sync-info p {
                    margin: 8px 0;
                }
                
                .sync-button {
                    margin-top: 12px;
                    background: var(--vscode-charts-blue) !important;
                }
                
                .sync-button:disabled {
                    background: var(--vscode-panel-border) !important;
                    color: var(--vscode-descriptionForeground) !important;
                    cursor: not-allowed;
                }
                
                .function-breakdown .feature-header td {
                    background: var(--vscode-panel-background);
                    border-top: 2px solid var(--vscode-panel-border);
                    font-weight: bold;
                }
                
                .function-breakdown tr:not(.feature-header) td:first-child {
                    color: var(--vscode-descriptionForeground);
                    font-family: monospace;
                    font-size: 0.9em;
                }
                
                .empty-state {
                    text-align: center;
                    color: var(--vscode-descriptionForeground);
                    padding: 40px;
                }
                
                .features-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    margin-top: 15px;
                }
                
                .feature-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px 16px;
                    background: var(--vscode-panel-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 6px;
                    transition: background-color 0.2s ease;
                }
                
                .feature-item:hover {
                    background: var(--vscode-list-hoverBackground);
                }
                
                .feature-icon {
                    font-size: 1.2em;
                    min-width: 20px;
                }
                
                .feature-name {
                    flex: 1;
                    font-weight: 500;
                }
                
                .feature-count {
                    font-size: 0.9em;
                    font-weight: 600;
                    color: var(--vscode-charts-blue);
                }
                
                .feature-used {
                    border-color: var(--vscode-charts-green);
                }
                
                .feature-used .feature-count {
                    color: var(--vscode-charts-green);
                }
                
                .feature-unused .feature-count {
                    color: var(--vscode-descriptionForeground);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📊 Usage Analytics Dashboard</h1>
                    <span class="status-indicator ${isEnabled ? 'status-enabled' : 'status-disabled'}">
                        ${isEnabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                </div>
                
                <div class="toggle-container">
                    <label for="analytics-toggle">Analytics Tracking:</label>
                    <label class="toggle">
                        <input type="checkbox" id="analytics-toggle" ${isEnabled ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                
                ${totalUsage > 0 ? `
                <div class="stats-overview">
                    <div class="stat-card">
                        <div class="stat-value">${totalUsage}</div>
                        <div class="stat-label">Total Uses</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${featuresUsed}</div>
                        <div class="stat-label">Features Used</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${detailedMetrics.length}</div>
                        <div class="stat-label">Events (30 days)</div>
                    </div>
                    <div class="stat-card sync-card">
                        <div class="stat-value ${syncStatus.unsyncedCount > 0 ? 'pending' : 'synced'}">${syncStatus.unsyncedCount}</div>
                        <div class="stat-label">Unsynced Events</div>
                        ${syncStatus.lastSyncAttempt ? `<div class="sync-time">Last sync: ${new Date(syncStatus.lastSyncAttempt).toLocaleString()}</div>` : ''}
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">🔄 Server Sync Status</div>
                    <div class="sync-info">
                        <p><strong>User ID:</strong> ${this.escapeHtml(syncStatus.userId)}</p>
                        <p><strong>Unsynced Events:</strong> ${syncStatus.unsyncedCount}</p>
                        ${syncStatus.lastSyncAttempt ? `<p><strong>Last Sync:</strong> ${new Date(syncStatus.lastSyncAttempt).toLocaleString()}</p>` : '<p><strong>Status:</strong> Never synced</p>'}
                        <button class="button sync-button" onclick="syncNow()" ${syncStatus.unsyncedCount === 0 ? 'disabled' : ''}>
                            🔄 Sync Now${syncStatus.unsyncedCount > 0 ? ` (${syncStatus.unsyncedCount} events)` : ''}
                        </button>
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">🏆 Top Features</div>
                    <div class="features-grid">
                        <div class="feature-item ${stats['email'] ? 'feature-used' : 'feature-unused'}">
                            <span class="feature-icon">🎯</span>
                            <span class="feature-name">Refine Email</span>
                            <span class="feature-count">${stats['email'] || 0} uses</span>
                        </div>
                        <div class="feature-item ${stats['translate'] ? 'feature-used' : 'feature-unused'}">
                            <span class="feature-icon">🌏</span>
                            <span class="feature-name">Translate Text</span>
                            <span class="feature-count">${stats['translate'] || 0} uses</span>
                        </div>
                        <div class="feature-item ${stats['jira'] ? 'feature-used' : 'feature-unused'}">
                            <span class="feature-icon">📋</span>
                            <span class="feature-name">Refine Jira</span>
                            <span class="feature-count">${stats['jira'] || 0} uses</span>
                        </div>
                        <div class="feature-item ${stats['plantuml'] || stats['uml'] ? 'feature-used' : 'feature-unused'}">
                            <span class="feature-icon">📊</span>
                            <span class="feature-name">Preview UML</span>
                            <span class="feature-count">${(stats['plantuml'] || 0) + (stats['uml'] || 0)} uses</span>
                        </div>
                        <div class="feature-item ${stats['uml.chatPanel'] ? 'feature-used' : 'feature-unused'}">
                            <span class="feature-icon">🤖</span>
                            <span class="feature-name">UML Designer</span>
                            <span class="feature-count">${stats['uml.chatPanel'] || 0} uses</span>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">📈 Usage Over Time (Last 7 Days)</div>
                    <div class="timeline">
                        ${timelineData}
                    </div>
                </div>
                ` : `
                <div class="empty-state">
                    <h3>No Usage Data Yet</h3>
                    <p>Start using extension features to see analytics here!</p>
                </div>
                `}
                
                <div class="buttons">
                    <button class="button" onclick="refresh()">🔄 Refresh</button>
                    <button class="button secondary" onclick="exportData()">📤 Export Data</button>
                </div>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                function refresh() {
                    vscode.postMessage({ command: 'refresh' });
                }
                
                function exportData() {
                    vscode.postMessage({ command: 'export' });
                }
                
                function syncNow() {
                    vscode.postMessage({ command: 'syncNow' });
                }
                
                document.getElementById('analytics-toggle').addEventListener('change', function(e) {
                    vscode.postMessage({ 
                        command: 'toggleAnalytics', 
                        enabled: e.target.checked 
                    });
                });

                // Listen for messages from the extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    console.log('Webview received message:', message);
                    
                    // No message handling needed currently
                });
            </script>
        </body>
        </html>`;
    }

    private async exportData(): Promise<void> {
        try {
            const analytics = UsageAnalytics.getInstance();
            const data = analytics.exportUsageData();
            
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(`analytics-export-${new Date().toISOString().split('T')[0]}.json`),
                filters: {
                    'JSON Files': ['json']
                }
            });
            
            if (uri) {
                await vscode.workspace.fs.writeFile(uri, Buffer.from(data, 'utf8'));
                vscode.window.showInformationMessage(`Analytics data exported to ${uri.fsPath}`);
            }
        } catch (error) {
            console.error('Error exporting analytics data:', error);
            vscode.window.showErrorMessage('Failed to export analytics data');
        }
    }

    private async toggleAnalytics(enabled: boolean): Promise<void> {
        try {
            const analytics = UsageAnalytics.getInstance();
            analytics.setEnabled(enabled);
            
            // Update VS Code settings
            const config = vscode.workspace.getConfiguration('copilotTools.analytics');
            await config.update('enabled', enabled, vscode.ConfigurationTarget.Global);
            
            this.updateContent();
            vscode.window.showInformationMessage(
                `Analytics ${enabled ? 'enabled' : 'disabled'}`
            );
        } catch (error) {
            console.error('Error toggling analytics:', error);
            vscode.window.showErrorMessage('Failed to update analytics setting');
        }
    }

    private async syncNow(): Promise<void> {
        try {
            const analytics = UsageAnalytics.getInstance();
            const result = await analytics.syncWithServer();
            
            if (result.success) {
                vscode.window.showInformationMessage(`Analytics sync successful: ${result.message}`);
            } else {
                vscode.window.showWarningMessage(`Analytics sync failed: ${result.message}`);
            }
            
            // Refresh dashboard to show updated sync status
            this.updateContent();
        } catch (error) {
            console.error('Error syncing analytics:', error);
            vscode.window.showErrorMessage('Failed to sync analytics data');
        }
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Force recreate the webview panel to ensure fresh content
     */
    private recreateWebview(): void {
        const currentColumn = this.panel?.viewColumn;
        
        // Dispose current panel
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }
        
        // Show a new panel
        this.show();
    }
}
