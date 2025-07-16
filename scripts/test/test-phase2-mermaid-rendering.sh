#!/bin/bash
# Test script for Phase 2 Mermaid Engine: real rendering, error handling, and fallback

set -e

echo "[Test] Enabling Mermaid engine feature flag..."
cat <<EOT > .vscode/settings.json
{
  "umlChatDesigner.features.mermaidEngine": true
}
EOT

echo "[Test] Compiling extension..."
npm run compile

echo "[Test] Running basic Mermaid rendering test..."
npx ts-node -O '{"module":"Node16","target":"ES2022","lib":["ES2022","dom"]}' -e '
(async () => {
  // Load VS Code mock first
  require("./scripts/test/mock-vscode.js");
  
  // Debug: Check if mock is working
  const vscode = require("vscode");
  console.log("[DEBUG] VS Code mock loaded:", typeof vscode.workspace.getConfiguration);
  
  const { FeatureFlagManager } = require("./src/tools/config/featureFlags");
  const flagManager = FeatureFlagManager.getInstance();
  console.log("[DEBUG] Feature flag status:", flagManager.getFeatureStatus());
  
  const { MermaidEngine } = require("./src/tools/uml/engines/mermaidEngine");
  const engine = new MermaidEngine();
  await engine.initialize();
  const code = "graph TD; A-->B; B-->C; C-->A;";
  const result = await engine.render(code, { format: "svg" });
  if (!result.success || !result.output.includes("<svg")) {
    throw new Error("Mermaid rendering failed or did not produce SVG output");
  }
  console.log("[PASS] Mermaid rendering produced SVG output");

  // Test error handling: invalid code
  const badCode = "not a mermaid diagram";
  const errorResult = await engine.render(badCode, { format: "svg" });
  if (errorResult.success || !errorResult.output.includes("<svg")) {
    throw new Error("Mermaid error handling failed: should fallback to SVG");
  }
  console.log("[PASS] Mermaid error handling fallback works");
})();
'

echo "[Test] Disabling Mermaid engine feature flag..."
cat <<EOT > .vscode/settings.json
{
  "umlChatDesigner.features.mermaidEngine": false
}
EOT

npx ts-node -O '{"module":"Node16","target":"ES2022","lib":["ES2022","dom"]}' -e '
(async () => {
  // Load VS Code mock first
  require("./scripts/test/mock-vscode.js");
  
  const { MermaidEngine } = require("./src/tools/uml/engines/mermaidEngine");
  const engine = new MermaidEngine();
  try {
    await engine.render("graph TD; X-->Y;", { format: "svg" });
  } catch (e) {
    console.log("[PASS] Feature flag disables Mermaid engine as expected");
    process.exit(0);
  }
  throw new Error("Feature flag did not disable Mermaid engine");
})();
'

echo "[ALL TESTS PASSED] Phase 2 Mermaid rendering and error handling are functional." 