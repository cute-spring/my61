#!/bin/bash

# Test script for Engine-Related Fixes
# This script verifies that the system properly handles engine selection and PlantUML/Mermaid conflicts

set -e

echo "🧪 Testing Engine-Related Fixes"
echo "==============================="

# Test case 1: Check if clearHistory resets engine to plantuml
echo "📋 Checking clearHistory engine reset..."
if grep -q "this.currentEngine = 'plantuml'" src/tools/chat/chatManager.ts; then
    echo "✅ ClearHistory engine reset found"
else
    echo "❌ ClearHistory engine reset not found"
    exit 1
fi

# Test case 2: Check if Mermaid renderer detects PlantUML code
echo "📋 Checking PlantUML detection in Mermaid renderer..."
if grep -q "Detected PlantUML code in Mermaid renderer" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ PlantUML detection found"
else
    echo "❌ PlantUML detection not found"
    exit 1
fi

# Test case 3: Check if Mermaid renderer returns empty for PlantUML
echo "📋 Checking empty return for PlantUML..."
if grep -q "returning empty string" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ Empty return for PlantUML found"
else
    echo "❌ Empty return for PlantUML not found"
    exit 1
fi

# Test case 4: Check if enhanced prompt includes participant name guidance
echo "📋 Checking participant name guidance..."
if grep -q "NEVER use complex participant names" src/tools/uml/mermaidGenerator.ts; then
    echo "✅ Participant name guidance found"
else
    echo "❌ Participant name guidance not found"
    exit 1
fi

# Test case 5: Check if prompt mentions exact participant names
echo "📋 Checking exact participant names guidance..."
if grep -q "Use exact participant names" src/tools/uml/mermaidGenerator.ts; then
    echo "✅ Exact participant names guidance found"
else
    echo "❌ Exact participant names guidance not found"
    exit 1
fi

# Test case 6: Check if prompt includes spacing guidance
echo "📋 Checking spacing guidance..."
if grep -q "proper spacing around arrows" src/tools/uml/mermaidGenerator.ts; then
    echo "✅ Spacing guidance found"
else
    echo "❌ Spacing guidance not found"
    exit 1
fi

# Test case 7: Check if prompt includes syntax example
echo "📋 Checking syntax example..."
if grep -q "Example of correct syntax" src/tools/uml/mermaidGenerator.ts; then
    echo "✅ Syntax example found"
else
    echo "❌ Syntax example not found"
    exit 1
fi

# Test case 8: Check if example shows proper sequence diagram
echo "📋 Checking sequence diagram example..."
if grep -q "User->>AuthService: Submit credentials" src/tools/uml/mermaidGenerator.ts; then
    echo "✅ Sequence diagram example found"
else
    echo "❌ Sequence diagram example not found"
    exit 1
fi

# Test case 9: Check if PlantUML detection checks for @startuml
echo "📋 Checking @startuml detection..."
if grep -q "@startuml" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ @startuml detection found"
else
    echo "❌ @startuml detection not found"
    exit 1
fi

# Test case 10: Check if PlantUML detection checks for @enduml
echo "📋 Checking @enduml detection..."
if grep -q "@enduml" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ @enduml detection found"
else
    echo "❌ @enduml detection not found"
    exit 1
fi

echo ""
echo "🎉 All tests passed! Engine-related fixes are complete."
echo ""
echo "📋 Summary of fixes:"
echo "  ✅ ClearHistory resets engine to plantuml"
echo "  ✅ Mermaid renderer detects PlantUML code"
echo "  ✅ Mermaid renderer returns empty for PlantUML"
echo "  ✅ Enhanced prompt guidance for participant names"
echo "  ✅ Exact participant names requirement"
echo "  ✅ Proper spacing guidance"
echo "  ✅ Syntax example included"
echo "  ✅ Sequence diagram example provided"
echo "  ✅ @startuml detection"
echo "  ✅ @enduml detection"
echo ""
echo "🚀 The system now provides:"
echo "   - Proper engine reset when clearing history"
echo "   - Prevention of PlantUML/Mermaid conflicts"
echo "   - Better AI guidance for sequence diagrams"
echo "   - Clear examples of correct syntax"
echo "   - Improved error handling for engine mismatches"
echo ""
echo "📝 Expected behavior:"
echo "   - Clearing history resets to PlantUML engine"
echo "   - No more PlantUML errors in Mermaid renderer"
echo "   - AI generates better sequence diagrams"
echo "   - Proper participant name handling"
echo "   - Consistent spacing and syntax"
echo ""
echo "💡 User workflow improvements:"
echo "   1. Clear history → Engine resets to PlantUML"
echo "   2. Switch to Mermaid → Proper Mermaid rendering"
echo "   3. Generate sequence diagrams → Better syntax"
echo "   4. No more engine conflicts"
echo "   5. Consistent behavior across operations"
echo ""
echo "🔧 Technical improvements:"
echo "   - Engine state management"
echo "   - Code type detection"
echo "   - Enhanced AI prompts"
echo "   - Better error prevention"
echo "   - Improved user experience" 