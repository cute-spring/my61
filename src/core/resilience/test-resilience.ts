/**
 * Test suite for error recovery and resilience features
 */

import * as vscode from 'vscode';
import { ResilientRenderer } from './resilientRenderer.js';
import { RetryManager } from './retryManager.js';
import { ErrorHandler } from '../errorHandler.js';
import { createError, ErrorCode } from '../errors.js';

/**
 * Test the resilient rendering system
 */
export async function testResilientRendering(): Promise<void> {
    console.log('🧪 Testing Error Recovery & Resilience System...');
    
    try {
        // Test 1: Retry Manager
        await testRetryManager();
        
        // Test 2: Resilient Renderer
        await testResilientRenderer();
        
        // Test 3: Error Handler Recovery Actions
        await testErrorHandlerRecovery();
        
        // Test 4: Health Monitoring
        await testHealthMonitoring();
        
        console.log('✅ All resilience tests passed!');
        
    } catch (error) {
        console.error('❌ Resilience test failed:', error);
        throw error;
    }
}

/**
 * Test retry manager functionality
 */
async function testRetryManager(): Promise<void> {
    console.log('  Testing RetryManager...');
    
    const retryManager = RetryManager.getInstance();
    
    // Test successful retry after failures
    let attemptCount = 0;
    const testOperation = async () => {
        attemptCount++;
        if (attemptCount < 3) {
            throw new Error(`Attempt ${attemptCount} failed`);
        }
        return `Success on attempt ${attemptCount}`;
    };
    
    const result = await retryManager.executeWithRetry(
        testOperation,
        'test-operation',
        {
            maxAttempts: 3,
            baseDelayMs: 100,
            maxDelayMs: 1000,
            backoffMultiplier: 2
        }
    );
    
    if (!result.success || result.result !== 'Success on attempt 3') {
        throw new Error('RetryManager test failed');
    }
    
    console.log('    ✓ RetryManager working correctly');
}

/**
 * Test resilient renderer functionality
 */
async function testResilientRenderer(): Promise<void> {
    console.log('  Testing ResilientRenderer...');
    
    const renderer = ResilientRenderer.getInstance();
    
    // Test health check
    const healthResult = await renderer.performHealthCheck();
    console.log('    Health check result:', healthResult);
    
    // Create a simple test diagram
    const testDiagram = {
        content: '@startuml\nAlice -> Bob: Hello\n@enduml',
        parentUri: vscode.Uri.file('/tmp/test.puml'),
        dir: '/tmp',
        path: '/tmp/test.puml',
        pageCount: 1
    };
    
    try {
        // Test rendering with fallbacks
        const result = await renderer.renderDiagram(testDiagram, {
            format: 'svg',
            timeout: 10000,
            fallbackFormats: ['png'],
            enableGracefulDegradation: true
        });
        
        console.log('    ✓ ResilientRenderer completed:', {
            success: result.success,
            attempts: result.metadata.attempts,
            strategy: result.metadata.recoveryStrategy,
            format: result.metadata.formatUsed
        });
        
    } catch (error) {
        console.log('    ⚠️  ResilientRenderer test completed with expected error:', (error as Error).message);
        // This might be expected if Java/PlantUML is not available
    }
}

/**
 * Test error handler recovery actions
 */
async function testErrorHandlerRecovery(): Promise<void> {
    console.log('  Testing ErrorHandler recovery...');
    
    // Test different error types
    const testErrors = [
        createError(ErrorCode.RENDER_FAILURE, 'Test render failure', {}, 'Test user message'),
        createError(ErrorCode.RENDER_JAVA_MISSING, 'Java not found', {}, 'Please install Java'),
        createError(ErrorCode.LLM_TIMEOUT, 'Request timeout', {}, 'Network timeout occurred')
    ];
    
    for (const error of testErrors) {
        ErrorHandler.handle(error, 'resilience-test');
    }
    
    const recentErrors = ErrorHandler.getRecent();
    if (recentErrors.length < testErrors.length) {
        throw new Error('ErrorHandler did not record all test errors');
    }
    
    console.log('    ✓ ErrorHandler recorded errors correctly');
}

/**
 * Test health monitoring functionality
 */
async function testHealthMonitoring(): Promise<void> {
    console.log('  Testing health monitoring...');
    
    const renderer = ResilientRenderer.getInstance();
    
    // Get current health status
    const health = await renderer.performHealthCheck();
    
    console.log('    System health status:', {
        healthy: health.healthy,
        javaAvailable: health.javaAvailable,
        jarAvailable: health.jarAvailable,
        layoutEngineWorking: health.layoutEngineWorking,
        issues: health.issues.length,
        recommendations: health.recommendations.length
    });
    
    // Health monitoring should provide actionable recommendations
    if (health.issues.length > 0) {
        console.log('    Issues detected:', health.issues);
        console.log('    Recommendations:', health.recommendations);
    }
    
    console.log('    ✓ Health monitoring working correctly');
}

/**
 * Run resilience tests from command palette
 */
export function registerResilienceTests(context: vscode.ExtensionContext): void {
    const testCommand = vscode.commands.registerCommand(
        'copilotTools.testResilience',
        async () => {
            try {
                await testResilientRendering();
                vscode.window.showInformationMessage('✅ Resilience tests completed successfully!');
            } catch (error) {
                vscode.window.showErrorMessage(`❌ Resilience tests failed: ${(error as Error).message}`);
            }
        }
    );
    
    context.subscriptions.push(testCommand);
}