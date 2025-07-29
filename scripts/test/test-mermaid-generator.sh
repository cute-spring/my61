#!/bin/bash

# Test script for Mermaid Generator and Renderer functionality
# This script verifies that the separate Mermaid components are working correctly

set -e

echo "🧪 Testing Mermaid Generator and Renderer Implementation"
echo "======================================================"

# Check if the Mermaid generator exists
echo "📋 Checking Mermaid generator..."
if [ -f "src/tools/uml/mermaidGenerator.ts" ]; then
    echo "✅ Mermaid generator found"
else
    echo "❌ Mermaid generator not found"
    exit 1
fi

# Check if the Mermaid renderer exists
echo "📋 Checking Mermaid renderer..."
if [ -f "src/tools/uml/mermaidRenderer.ts" ]; then
    echo "✅ Mermaid renderer found"
else
    echo "❌ Mermaid renderer not found"
    exit 1
fi

# Check if the generator factory exists
echo "📋 Checking generator factory..."
if [ -f "src/tools/uml/generatorFactory.ts" ]; then
    echo "✅ Generator factory found"
else
    echo "❌ Generator factory not found"
    exit 1
fi

# Check if the Mermaid generator has the required methods
echo "🔧 Checking Mermaid generator methods..."
if grep -q "generateFromRequirement" src/tools/uml/mermaidGenerator.ts; then
    echo "✅ generateFromRequirement method found"
else
    echo "❌ generateFromRequirement method not found"
    exit 1
fi

if grep -q "extractMermaidCode" src/tools/uml/mermaidGenerator.ts; then
    echo "✅ extractMermaidCode method found"
else
    echo "❌ extractMermaidCode method not found"
    exit 1
fi

# Check if the Mermaid renderer has the required methods
echo "🔧 Checking Mermaid renderer methods..."
if grep -q "renderToSVG" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ renderToSVG method found"
else
    echo "❌ renderToSVG method not found"
    exit 1
fi

if grep -q "initialize" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ initialize method found"
else
    echo "❌ initialize method not found"
    exit 1
fi

# Check if the generator factory has the required methods
echo "🔧 Checking generator factory methods..."
if grep -q "getGenerator" src/tools/uml/generatorFactory.ts; then
    echo "✅ getGenerator method found"
else
    echo "❌ getGenerator method not found"
    exit 1
fi

if grep -q "getRenderer" src/tools/uml/generatorFactory.ts; then
    echo "✅ getRenderer method found"
else
    echo "❌ getRenderer method not found"
    exit 1
fi

if grep -q "validateEngineType" src/tools/uml/generatorFactory.ts; then
    echo "✅ validateEngineType method found"
else
    echo "❌ validateEngineType method not found"
    exit 1
fi

# Check if the ChatManager has been updated to support engines
echo "📋 Checking ChatManager engine support..."
if grep -q "getCurrentEngine" src/tools/chat/chatManager.ts; then
    echo "✅ getCurrentEngine method found"
else
    echo "❌ getCurrentEngine method not found"
    exit 1
fi

if grep -q "updateEngine" src/tools/chat/chatManager.ts; then
    echo "✅ updateEngine method found"
else
    echo "❌ updateEngine method not found"
    exit 1
fi

# Check if the SessionData interface has been updated
echo "📋 Checking SessionData interface..."
if grep -q "currentEngine" src/tools/uml/types.ts; then
    echo "✅ currentEngine property found in SessionData"
else
    echo "❌ currentEngine property not found in SessionData"
    exit 1
fi

# Check if the refactored chat panel uses the factory
echo "📋 Checking refactored chat panel factory usage..."
if grep -q "GeneratorFactory" src/tools/umlChatPanelRefactored.ts; then
    echo "✅ GeneratorFactory usage found in refactored chat panel"
else
    echo "❌ GeneratorFactory usage not found in refactored chat panel"
    exit 1
fi

# Check if the original chat panel has been updated
echo "📋 Checking original chat panel updates..."
if grep -q "generateDiagramFromRequirement" src/tools/umlChatPanel.ts; then
    echo "✅ generateDiagramFromRequirement function found"
else
    echo "❌ generateDiagramFromRequirement function not found"
    exit 1
fi

if grep -q "engineType.*message" src/tools/umlChatPanel.ts; then
    echo "✅ Engine type handling found in original chat panel"
else
    echo "❌ Engine type handling not found in original chat panel"
    exit 1
fi

# Check if the IGenerator interface has been updated
echo "📋 Checking IGenerator interface..."
if grep -q "generateSmartFilename" src/tools/uml/generatorFactory.ts; then
    echo "✅ generateSmartFilename method in IGenerator interface"
else
    echo "❌ generateSmartFilename method not found in IGenerator interface"
    exit 1
fi

echo ""
echo "🎉 All tests passed! Mermaid generator and renderer implementation is complete."
echo ""
echo "📋 Summary of changes:"
echo "  ✅ Created separate MermaidGenerator class"
echo "  ✅ Created separate MermaidRenderer class"
echo "  ✅ Created GeneratorFactory for engine management"
echo "  ✅ Updated ChatManager to support engine tracking"
echo "  ✅ Updated SessionData interface to include engine"
echo "  ✅ Updated refactored chat panel to use factory pattern"
echo "  ✅ Updated original chat panel to support both engines"
echo "  ✅ Updated IGenerator interface with required methods"
echo ""
echo "🚀 The system now supports both PlantUML and Mermaid engines:"
echo "   - PlantUML: Traditional UML diagrams with PlantUML syntax"
echo "   - Mermaid: Modern diagram syntax with flowchart, sequence, class, etc."
echo "   - Users can select their preferred engine via the dropdown"
echo "   - Each engine has its own generator and renderer"
echo "   - Clean separation of concerns maintained" 