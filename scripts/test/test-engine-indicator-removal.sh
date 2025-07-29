#!/bin/bash

# Test script for Engine Indicator Removal
# This script verifies that the engine indicator has been completely removed

set -e

echo "🧪 Testing Engine Indicator Removal"
echo "==================================="

# Test case 1: Check if engine indicator HTML element is removed
echo "📋 Checking if engine indicator HTML element is removed..."
if grep -q "engineIndicator" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "❌ engineIndicator HTML element still exists"
    exit 1
else
    echo "✅ engineIndicator HTML element has been removed"
fi

# Test case 2: Check if engine indicator CSS is removed
echo "📋 Checking if engine indicator CSS is removed..."
if grep -q "engine-indicator" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "❌ engine-indicator CSS still exists"
    exit 1
else
    echo "✅ engine-indicator CSS has been removed"
fi

# Test case 3: Check if engine indicator JavaScript logic is removed
echo "📋 Checking if engine indicator JavaScript logic is removed..."
if grep -q "engineLabel.textContent" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "❌ engineLabel.textContent logic still exists"
    exit 1
else
    echo "✅ engineLabel.textContent logic has been removed"
fi

# Test case 4: Check if engine indicator display logic is removed
echo "📋 Checking if engine indicator display logic is removed..."
if grep -q "engineIndicator.style.display" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "❌ engineIndicator.style.display logic still exists"
    exit 1
else
    echo "✅ engineIndicator.style.display logic has been removed"
fi

# Test case 5: Check if the unified panel still works without engine indicator
echo "📋 Checking if unified panel still works..."
if grep -q "showMermaid" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ showMermaid functionality still exists"
else
    echo "❌ showMermaid functionality missing"
    exit 1
fi

if grep -q "showPlantUML" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ showPlantUML functionality still exists"
else
    echo "❌ showPlantUML functionality missing"
    exit 1
fi

# Test case 6: Check if the diagram containers still exist
echo "📋 Checking if diagram containers still exist..."
if grep -q "plantUMLContainer" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ plantUMLContainer still exists"
else
    echo "❌ plantUMLContainer missing"
    exit 1
fi

if grep -q "mermaidContainer" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ mermaidContainer still exists"
else
    echo "❌ mermaidContainer missing"
    exit 1
fi

# Test case 7: Check if zoom controls still exist
echo "📋 Checking if zoom controls still exist..."
if grep -q "zoom-controls" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ zoom controls still exist"
else
    echo "❌ zoom controls missing"
    exit 1
fi

# Test case 8: Check if the unified panel structure is intact
echo "📋 Checking if unified panel structure is intact..."
if grep -q "unifiedDiagramPanel" src/tools/ui/webviewHtmlGenerator.ts; then
    echo "✅ unifiedDiagramPanel structure still exists"
else
    echo "❌ unifiedDiagramPanel structure missing"
    exit 1
fi

echo ""
echo "🎉 All tests passed! Engine indicator has been completely removed."
echo ""
echo "📋 Expected behavior:"
echo "  ✅ No 'PlantUML' or 'Mermaid' indicator at top right of panel"
echo "  ✅ Clean, uncluttered diagram display area"
echo "  ✅ Unified panel still switches between PlantUML and Mermaid correctly"
echo "  ✅ Zoom controls still work properly"
echo "  ✅ All other functionality remains intact"
echo ""
echo "🚀 The removal addresses:"
echo "   - Cleaner, more professional UI appearance"
echo "   - Less visual clutter in the diagram area"
echo "   - Simplified user interface"
echo "   - Maintained all core functionality"
echo ""
echo "💡 Next steps:"
echo "   - Test the unified panel functionality"
echo "   - Verify PlantUML and Mermaid diagrams display correctly"
echo "   - Confirm zoom controls still work"
echo "   - Check that the UI looks cleaner without the indicator" 