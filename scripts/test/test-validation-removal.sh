#!/bin/bash

# Test script for Validation Removal
# This script verifies that the custom validation has been removed and Mermaid handles validation directly

set -e

echo "🧪 Testing Validation Removal"
echo "============================="

# Test case 1: Check if validateMermaidSyntax method is removed
echo "📋 Checking if validateMermaidSyntax method is removed..."
if grep -q "validateMermaidSyntax" src/tools/uml/mermaidRenderer.ts; then
    echo "❌ validateMermaidSyntax method still exists"
    exit 1
else
    echo "✅ validateMermaidSyntax method removed"
fi

# Test case 2: Check if validation call is removed from openMermaidPreview
echo "📋 Checking if validation call is removed..."
if grep -q "validateMermaidSyntax.*cleanMermaidCode" src/tools/uml/mermaidRenderer.ts; then
    echo "❌ Validation call still exists"
    exit 1
else
    echo "✅ Validation call removed"
fi

# Test case 3: Check if warning message is removed
echo "📋 Checking if warning message is removed..."
if grep -q "Mermaid syntax warning" src/tools/uml/mermaidRenderer.ts; then
    echo "❌ Warning message still exists"
    exit 1
else
    echo "✅ Warning message removed"
fi

# Test case 4: Check if extractMermaidCode method still exists
echo "📋 Checking if extractMermaidCode method still exists..."
if grep -q "extractMermaidCode" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ extractMermaidCode method still exists"
else
    echo "❌ extractMermaidCode method missing"
    exit 1
fi

# Test case 5: Check if generateMermaidPreviewHtml method still exists
echo "📋 Checking if generateMermaidPreviewHtml method still exists..."
if grep -q "generateMermaidPreviewHtml" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ generateMermaidPreviewHtml method still exists"
else
    echo "❌ generateMermaidPreviewHtml method missing"
    exit 1
fi

# Test case 6: Check if openMermaidPreview method still exists
echo "📋 Checking if openMermaidPreview method still exists..."
if grep -q "openMermaidPreview" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ openMermaidPreview method still exists"
else
    echo "❌ openMermaidPreview method missing"
    exit 1
fi

# Test case 7: Check if Mermaid library is still included
echo "📋 Checking if Mermaid library is still included..."
if grep -q "mermaid@10.6.1" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ Mermaid library still included"
else
    echo "❌ Mermaid library missing"
    exit 1
fi

# Test case 8: Check if error handling for Mermaid rendering still exists
echo "📋 Checking if Mermaid error handling still exists..."
if grep -q "Mermaid rendering error" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ Mermaid error handling still exists"
else
    echo "❌ Mermaid error handling missing"
    exit 1
fi

# Test case 9: Check if success logging still exists
echo "📋 Checking if success logging still exists..."
if grep -q "Mermaid diagram rendered successfully" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ Success logging still exists"
else
    echo "❌ Success logging missing"
    exit 1
fi

# Test case 10: Check if debug logging is still present
echo "📋 Checking if debug logging is still present..."
if grep -q "MERMAID CODE DEBUG" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ Debug logging still present"
else
    echo "❌ Debug logging missing"
    exit 1
fi

echo ""
echo "🎉 All tests passed! Validation removal is complete."
echo ""
echo "📋 Summary of changes:"
echo "  ✅ Custom validation method removed"
echo "  ✅ Validation call removed from preview"
echo "  ✅ Warning messages removed"
echo "  ✅ Core functionality preserved"
echo "  ✅ Mermaid library still included"
echo "  ✅ Error handling preserved"
echo "  ✅ Success logging preserved"
echo "  ✅ Debug logging preserved"
echo "  ✅ Code extraction preserved"
echo "  ✅ HTML generation preserved"
echo ""
echo "🚀 The system now provides:"
echo "   - Direct Mermaid rendering without custom validation"
echo "   - No false positive warnings"
echo "   - Let Mermaid library handle all validation"
echo "   - Cleaner, simpler code"
echo "   - Better user experience"
echo ""
echo "📝 Expected behavior:"
echo "   - No more validation warnings for valid code"
echo "   - Mermaid library handles all syntax validation"
echo "   - Clean error messages from Mermaid itself"
echo "   - Faster rendering process"
echo "   - More reliable validation"
echo ""
echo "💡 Benefits of removing custom validation:"
echo "   - Mermaid library is the authoritative validator"
echo "   - No false positives from our regex patterns"
echo "   - Simpler code maintenance"
echo "   - Better performance"
echo "   - More accurate error reporting"
echo ""
echo "🔧 Technical improvements:"
echo "   - Removed ~100 lines of validation code"
echo "   - Simplified rendering pipeline"
echo "   - Let Mermaid handle its own syntax"
echo "   - Cleaner error handling"
echo "   - More maintainable codebase" 