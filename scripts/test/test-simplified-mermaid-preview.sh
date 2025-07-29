#!/bin/bash

# Test script for Simplified Mermaid Preview
# This script verifies that the Mermaid preview shows only the diagram without extra UI elements

set -e

echo "🧪 Testing Simplified Mermaid Preview"
echo "===================================="

# Test case 1: Check if header with title is removed
echo "📋 Checking if header with title is removed..."
if grep -q "📊 Mermaid Diagram Preview" src/tools/uml/mermaidRenderer.ts; then
    echo "❌ Header title still exists"
    exit 1
else
    echo "✅ Header title removed"
fi

# Test case 2: Check if control buttons are removed
echo "📋 Checking if control buttons are removed..."
if grep -q "Copy Code" src/tools/uml/mermaidRenderer.ts; then
    echo "❌ Copy Code button still exists"
    exit 1
else
    echo "✅ Copy Code button removed"
fi

if grep -q "Open in Mermaid Live" src/tools/uml/mermaidRenderer.ts; then
    echo "❌ Open in Mermaid Live button still exists"
    exit 1
else
    echo "✅ Open in Mermaid Live button removed"
fi

if grep -q "Download SVG" src/tools/uml/mermaidRenderer.ts; then
    echo "❌ Download SVG button still exists"
    exit 1
else
    echo "✅ Download SVG button removed"
fi

# Test case 3: Check if code section is removed
echo "📋 Checking if code section is removed..."
if grep -q "📝 Mermaid Code" src/tools/uml/mermaidRenderer.ts; then
    echo "❌ Mermaid Code section still exists"
    exit 1
else
    echo "✅ Mermaid Code section removed"
fi

if grep -q "Toggle Code" src/tools/uml/mermaidRenderer.ts; then
    echo "❌ Toggle Code button still exists"
    exit 1
else
    echo "✅ Toggle Code button removed"
fi

# Test case 4: Check if diagram container still exists
echo "📋 Checking if diagram container still exists..."
if grep -q "diagram-container" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ Diagram container still exists"
else
    echo "❌ Diagram container missing"
    exit 1
fi

# Test case 5: Check if Mermaid library is still included
echo "📋 Checking if Mermaid library is still included..."
if grep -q "mermaid@10.6.1" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ Mermaid library still included"
else
    echo "❌ Mermaid library missing"
    exit 1
fi

# Test case 6: Check if rendering logic is simplified
echo "📋 Checking if rendering logic is simplified..."
if grep -q "copyCode()" src/tools/uml/mermaidRenderer.ts; then
    echo "❌ copyCode function still exists"
    exit 1
else
    echo "✅ copyCode function removed"
fi

if grep -q "openInMermaidLive()" src/tools/uml/mermaidRenderer.ts; then
    echo "❌ openInMermaidLive function still exists"
    exit 1
else
    echo "✅ openInMermaidLive function removed"
fi

if grep -q "downloadSVG()" src/tools/uml/mermaidRenderer.ts; then
    echo "❌ downloadSVG function still exists"
    exit 1
else
    echo "✅ downloadSVG function removed"
fi

if grep -q "toggleCode()" src/tools/uml/mermaidRenderer.ts; then
    echo "❌ toggleCode function still exists"
    exit 1
else
    echo "✅ toggleCode function removed"
fi

# Test case 7: Check if core rendering functions still exist
echo "📋 Checking if core rendering functions still exist..."
if grep -q "initializeMermaid()" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ initializeMermaid function still exists"
else
    echo "❌ initializeMermaid function missing"
    exit 1
fi

if grep -q "renderDiagram()" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ renderDiagram function still exists"
else
    echo "❌ renderDiagram function missing"
    exit 1
fi

# Test case 8: Check if error handling is simplified
echo "📋 Checking if error handling is simplified..."
if grep -q "Debug Info" src/tools/uml/mermaidRenderer.ts; then
    echo "❌ Debug Info still exists"
    exit 1
else
    echo "✅ Debug Info removed"
fi

# Test case 9: Check if title is simplified
echo "📋 Checking if title is simplified..."
if grep -q "Mermaid Diagram" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ Simplified title exists"
else
    echo "❌ Simplified title missing"
    exit 1
fi

# Test case 10: Check if CSS is simplified
echo "📋 Checking if CSS is simplified..."
if grep -q "\.header" src/tools/uml/mermaidRenderer.ts; then
    echo "❌ Header CSS still exists"
    exit 1
else
    echo "✅ Header CSS removed"
fi

if grep -q "\.controls" src/tools/uml/mermaidRenderer.ts; then
    echo "❌ Controls CSS still exists"
    exit 1
else
    echo "✅ Controls CSS removed"
fi

if grep -q "\.code-container" src/tools/uml/mermaidRenderer.ts; then
    echo "❌ Code container CSS still exists"
    exit 1
else
    echo "✅ Code container CSS removed"
fi

echo ""
echo "🎉 All tests passed! Mermaid preview has been simplified."
echo ""
echo "📋 Summary of changes:"
echo "  ✅ Header with title removed"
echo "  ✅ Control buttons removed (Copy Code, Open in Mermaid Live, Download SVG)"
echo "  ✅ Code section removed (Mermaid Code display and Toggle Code button)"
echo "  ✅ Debug logging removed"
echo "  ✅ CSS simplified (removed header, controls, code container styles)"
echo "  ✅ JavaScript functions simplified (removed utility functions)"
echo "  ✅ Core rendering functionality preserved"
echo "  ✅ Error handling simplified"
echo "  ✅ Mermaid library still included"
echo "  ✅ Diagram container preserved"
echo ""
echo "🚀 The Mermaid preview now provides:"
echo "   - Clean, minimal interface"
echo "   - Only the rendered diagram"
echo "   - No distracting UI elements"
echo "   - Focused user experience"
echo "   - Faster loading (less code)"
echo ""
echo "📝 Expected behavior:"
echo "   - Mermaid preview panel shows only the diagram"
echo "   - No header, buttons, or code section"
echo "   - Clean, professional appearance"
echo "   - Direct focus on the diagram content"
echo "   - Simplified error messages"
echo ""
echo "💡 Benefits of simplification:"
echo "   - Cleaner user interface"
echo "   - Less visual clutter"
echo "   - Faster rendering"
echo "   - Better focus on diagram content"
echo "   - More professional appearance"
echo "   - Reduced code complexity" 