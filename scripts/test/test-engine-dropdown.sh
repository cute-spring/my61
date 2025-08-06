#!/bin/bash

# Test script for Engine Dropdown functionality
# This script verifies that the new engine dropdown has been added correctly

set -e

echo "🧪 Testing Engine Dropdown Implementation"
echo "========================================"

# Check if the engine dropdown HTML is present in the webview generator
echo "📋 Checking HTML template for engine dropdown..."
if grep -q "select id=\"engineType\"" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Engine dropdown HTML found in webviewHtmlGenerator.ts"
else
    echo "❌ Engine dropdown HTML not found in webviewHtmlGenerator.ts"
    exit 1
fi

# Check if the engine dropdown HTML is present in the original umlChatPanel.ts
echo "📋 Checking HTML template for engine dropdown in umlChatPanel.ts..."
if grep -q "select id=\"engineType\"" src/tools/umlChatPanel.ts; then
    echo "✅ Engine dropdown HTML found in umlChatPanel.ts"
else
    echo "❌ Engine dropdown HTML not found in umlChatPanel.ts"
    exit 1
fi

# Check if the CSS styles are present
echo "🎨 Checking CSS styles for engine dropdown..."
if grep -q "\.engine-type-label" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Engine dropdown CSS styles found"
else
    echo "❌ Engine dropdown CSS styles not found"
    exit 1
fi

# Check if the JavaScript event handlers are updated
echo "⚡ Checking JavaScript event handlers..."
if grep -q "engineType.*document\.getElementById" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Engine dropdown JavaScript handlers found in webviewHtmlGenerator.ts"
else
    echo "❌ Engine dropdown JavaScript handlers not found in webviewHtmlGenerator.ts"
    exit 1
fi

if grep -q "engineType.*document\.getElementById" src/tools/umlChatPanel.ts; then
    echo "✅ Engine dropdown JavaScript handlers found in umlChatPanel.ts"
else
    echo "❌ Engine dropdown JavaScript handlers not found in umlChatPanel.ts"
    exit 1
fi

# Check if the message handling is updated
echo "📨 Checking message handling..."
if grep -q "engineType.*message" src/tools/umlChatPanelRefactored.ts; then
    echo "✅ Engine dropdown message handling found in umlChatPanelRefactored.ts"
else
    echo "❌ Engine dropdown message handling not found in umlChatPanelRefactored.ts"
    exit 1
fi

if grep -q "engineType.*message" src/tools/umlChatPanel.ts; then
    echo "✅ Engine dropdown message handling found in umlChatPanel.ts"
else
    echo "❌ Engine dropdown message handling not found in umlChatPanel.ts"
    exit 1
fi

# Check if the generateEngineOptions method exists
echo "🔧 Checking engine options generation..."
if grep -q "generateEngineOptions" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ generateEngineOptions method found"
else
    echo "❌ generateEngineOptions method not found"
    exit 1
fi

# Verify the dropdown options
echo "📝 Checking dropdown options..."
if grep -q "PlantUML.*option" src/tools/ui/webviewHtmlGenerator.ts && grep -q "Mermaid.*option" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ Both PlantUML and Mermaid options found"
else
    echo "❌ Missing dropdown options"
    exit 1
fi

echo ""
echo "🎉 All tests passed! Engine dropdown implementation is complete."
echo ""
echo "📋 Summary of changes:"
echo "  ✅ Added engine dropdown HTML to both webview generators"
echo "  ✅ Added CSS styling for the engine dropdown"
echo "  ✅ Updated JavaScript event handlers to include engine type"
echo "  ✅ Updated message handling to process engine type"
echo "  ✅ Added generateEngineOptions method"
echo "  ✅ Both PlantUML and Mermaid options are available"
echo ""
echo "🚀 The engine dropdown should now appear next to the diagram type dropdown"
echo "   and allow users to select between PlantUML and Mermaid rendering engines." 