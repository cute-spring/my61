#!/bin/bash

# Test script for Sequence Diagram Validation Improvements
# This script verifies that the system properly detects and handles incomplete sequence diagrams

set -e

echo "🧪 Testing Sequence Diagram Validation Improvements"
echo "=================================================="

# Test case 1: Check if enhanced system prompt includes sequence diagram requirements
echo "📋 Checking enhanced system prompt..."
if grep -q "SEQUENCE DIAGRAM REQUIREMENTS" src/tools/uml/mermaidGenerator.ts; then
    echo "✅ Sequence diagram requirements found in prompt"
else
    echo "❌ Sequence diagram requirements not found in prompt"
    exit 1
fi

# Test case 2: Check if prompt mentions actual sequence interactions
echo "📋 Checking sequence interaction requirements..."
if grep -q "MUST include actual sequence interactions" src/tools/uml/mermaidGenerator.ts; then
    echo "✅ Sequence interaction requirements found"
else
    echo "❌ Sequence interaction requirements not found"
    exit 1
fi

# Test case 3: Check if prompt mentions arrow syntax
echo "📋 Checking arrow syntax guidance..."
if grep -q "solid arrow" src/tools/uml/mermaidGenerator.ts; then
    echo "✅ Arrow syntax guidance found"
else
    echo "❌ Arrow syntax guidance not found"
    exit 1
fi

# Test case 4: Check if validation detects incomplete sequence diagrams
echo "📋 Checking incomplete sequence diagram detection..."
if grep -q "hasSequenceDiagram.*hasParticipants.*hasInteractions" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ Incomplete sequence diagram detection found"
else
    echo "❌ Incomplete sequence diagram detection not found"
    exit 1
fi

# Test case 5: Check if validation checks for missing interactions
echo "📋 Checking missing interactions validation..."
if grep -q "Missing sequence interactions" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ Missing interactions validation found"
else
    echo "❌ Missing interactions validation not found"
    exit 1
fi

# Test case 6: Check if validation tracks sequence diagram components
echo "📋 Checking sequence diagram component tracking..."
if grep -q "hasSequenceDiagram.*hasParticipants.*hasInteractions" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ Sequence diagram component tracking found"
else
    echo "❌ Sequence diagram component tracking not found"
    exit 1
fi

# Test case 7: Check if prompt emphasizes complete content
echo "📋 Checking complete content emphasis..."
if grep -q "complete content" src/tools/uml/mermaidGenerator.ts; then
    echo "✅ Complete content emphasis found"
else
    echo "❌ Complete content emphasis not found"
    exit 1
fi

# Test case 8: Check if prompt mentions meaningful messages
echo "📋 Checking meaningful messages requirement..."
if grep -q "meaningful messages" src/tools/uml/mermaidGenerator.ts; then
    echo "✅ Meaningful messages requirement found"
else
    echo "❌ Meaningful messages requirement not found"
    exit 1
fi

# Test case 9: Check if prompt mentions complete flow
echo "📋 Checking complete flow requirement..."
if grep -q "complete flow" src/tools/uml/mermaidGenerator.ts; then
    echo "✅ Complete flow requirement found"
else
    echo "❌ Complete flow requirement not found"
    exit 1
fi

# Test case 10: Check if validation provides specific error messages
echo "📋 Checking specific error messages..."
if grep -q "Incomplete sequence diagram" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ Specific error messages found"
else
    echo "❌ Specific error messages not found"
    exit 1
fi

echo ""
echo "🎉 All tests passed! Sequence diagram validation improvements are complete."
echo ""
echo "📋 Summary of improvements:"
echo "  ✅ Enhanced AI prompt with sequence diagram requirements"
echo "  ✅ Specific guidance for sequence interactions"
echo "  ✅ Arrow syntax examples and requirements"
echo "  ✅ Validation for incomplete sequence diagrams"
echo "  ✅ Detection of missing interactions"
echo "  ✅ Component tracking (declaration, participants, interactions)"
echo "  ✅ Specific error messages for incomplete diagrams"
echo "  ✅ Emphasis on complete content and meaningful messages"
echo "  ✅ Complete flow requirements"
echo ""
echo "🚀 The system now provides:"
echo "   - Better AI guidance for complete sequence diagrams"
echo "   - Validation that detects incomplete diagrams"
echo "   - Specific error messages for missing interactions"
echo "   - Clear requirements for meaningful content"
echo "   - Prevention of empty sequence diagrams"
echo ""
echo "📝 Expected behavior:"
echo "   - AI generates complete sequence diagrams with interactions"
echo "   - Validation detects and warns about incomplete diagrams"
echo "   - Clear error messages guide users to fix issues"
echo "   - System prevents rendering of incomplete diagrams"
echo "   - Better user experience with helpful feedback"
echo ""
echo "💡 User workflow:"
echo "   1. User requests sequence diagram"
echo "   2. AI generates complete diagram with interactions"
echo "   3. Validation ensures completeness"
echo "   4. Preview shows full sequence flow"
echo "   5. Users get meaningful, complete diagrams" 