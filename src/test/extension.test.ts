import * as assert from 'assert';
import * as vscode from 'vscode';
import { MermaidEngine } from '../tools/uml/engines/mermaidEngine';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  // Setup: Enable Mermaid engine for tests
  suiteSetup(async () => {
    await vscode.workspace.getConfiguration('umlChatDesigner').update('features.mermaidEngine', true, vscode.ConfigurationTarget.Global);
  });

  // Cleanup: Disable Mermaid engine after tests
  suiteTeardown(async () => {
    await vscode.workspace.getConfiguration('umlChatDesigner').update('features.mermaidEngine', false, vscode.ConfigurationTarget.Global);
  });

  test('Mermaid Engine Initialization', async () => {
    const engine = new MermaidEngine();
    await engine.initialize();
    assert.ok(engine, 'MermaidEngine should be created');
  });

  test('Mermaid Engine Rendering', async () => {
    const engine = new MermaidEngine();
    await engine.initialize();
    
    const code = "graph TD; A-->B; B-->C; C-->A;";
    const result = await engine.render(code, { format: "svg" });
    
    console.log('[DEBUG] Rendering result:', {
      success: result.success,
      outputLength: result.output ? result.output.length : 0,
      outputPreview: typeof result.output === 'string' ? result.output.substring(0, 200) : 'Buffer or undefined',
      metadata: result.metadata
    });
    
    assert.ok(result.success, 'Rendering should succeed');
    assert.ok(result.output.includes('<svg'), 'Output should contain SVG');
    assert.ok(result.metadata.engineUsed === 'mermaid', 'Should use mermaid engine');
  });

  test('Mermaid Engine Error Handling', async () => {
    const engine = new MermaidEngine();
    await engine.initialize();
    
    const badCode = "not a mermaid diagram";
    const result = await engine.render(badCode, { format: "svg" });
    
    // Should fallback to error SVG
    assert.ok(!result.success, 'Should fail with invalid code');
    assert.ok(result.output.includes('<svg'), 'Should still produce SVG fallback');
  });

  test('Mermaid Engine Feature Flag', async () => {
    // Test with feature flag disabled
    const originalValue = vscode.workspace.getConfiguration('umlChatDesigner').get('features.mermaidEngine');
    
    try {
      // Disable the feature
      await vscode.workspace.getConfiguration('umlChatDesigner').update('features.mermaidEngine', false, vscode.ConfigurationTarget.Global);
      
      const engine = new MermaidEngine();
      try {
        await engine.initialize();
        assert.fail('Should throw error when feature is disabled');
      } catch (error) {
        assert.ok((error as Error).message.includes('disabled'), 'Should throw disabled error');
      }
    } finally {
      // Restore original value
      await vscode.workspace.getConfiguration('umlChatDesigner').update('features.mermaidEngine', originalValue, vscode.ConfigurationTarget.Global);
    }
  });
});
