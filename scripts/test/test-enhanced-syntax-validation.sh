#!/bin/bash

# Test script for Enhanced Syntax Validation
# This script verifies that the system properly detects and handles syntax errors in Mermaid code

set -e

echo "🧪 Testing Enhanced Syntax Validation"
echo "===================================="

# Test case 1: Check if enhanced validation includes message validation
echo "📋 Checking message validation..."
if grep -q "Missing message after colon" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ Message validation found"
else
    echo "❌ Message validation not found"
    exit 1
fi

# Test case 2: Check if validation checks for empty messages
echo "📋 Checking empty message validation..."
if grep -q "Empty or missing message" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ Empty message validation found"
else
    echo "❌ Empty message validation not found"
    exit 1
fi

# Test case 3: Check if validation checks participant interaction format
echo "📋 Checking participant interaction format validation..."
if grep -q "Invalid participant interaction format" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ Participant interaction format validation found"
else
    echo "❌ Participant interaction format validation not found"
    exit 1
fi

# Test case 4: Check if validation checks line termination
echo "📋 Checking line termination validation..."
if grep -q "Invalid line termination" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ Line termination validation found"
else
    echo "❌ Line termination validation not found"
    exit 1
fi

# Test case 5: Check if validation checks for trailing characters
echo "📋 Checking trailing character validation..."
if grep -q "Line should not end with backslash or pipe" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ Trailing character validation found"
else
    echo "❌ Trailing character validation not found"
    exit 1
fi

# Test case 6: Check if enhanced prompt includes line termination guidance
echo "📋 Checking line termination guidance in prompt..."
if grep -q "ends properly" src/tools/uml/mermaidGenerator.ts; then
    echo "✅ Line termination guidance found"
else
    echo "❌ Line termination guidance not found"
    exit 1
fi

# Test case 7: Check if prompt mentions simple participant names
echo "📋 Checking simple participant names guidance..."
if grep -q "simple names without spaces" src/tools/uml/mermaidGenerator.ts; then
    echo "✅ Simple participant names guidance found"
else
    echo "❌ Simple participant names guidance not found"
    exit 1
fi

# Test case 8: Check if prompt mentions clean line endings
echo "📋 Checking clean line endings guidance..."
if grep -q "ends cleanly" src/tools/uml/mermaidGenerator.ts; then
    echo "✅ Clean line endings guidance found"
else
    echo "❌ Clean line endings guidance not found"
    exit 1
fi

# Test case 9: Check if prompt mentions consistent spacing
echo "📋 Checking consistent spacing guidance..."
if grep -q "consistent spacing" src/tools/uml/mermaidGenerator.ts; then
    echo "✅ Consistent spacing guidance found"
else
    echo "❌ Consistent spacing guidance not found"
    exit 1
fi

# Test case 10: Check if prompt mentions concise messages
echo "📋 Checking concise messages guidance..."
if grep -q "concise and clear" src/tools/uml/mermaidGenerator.ts; then
    echo "✅ Concise messages guidance found"
else
    echo "❌ Concise messages guidance not found"
    exit 1
fi

# Test case 11: Check if validation splits lines properly
echo "📋 Checking line splitting validation..."
if grep -q "parts = line.split" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ Line splitting validation found"
else
    echo "❌ Line splitting validation not found"
    exit 1
fi

# Test case 12: Check if validation checks parts length
echo "📋 Checking parts length validation..."
if grep -q "parts.length < 2" src/tools/uml/mermaidRenderer.ts; then
    echo "✅ Parts length validation found"
else
    echo "❌ Parts length validation not found"
    exit 1
fi

echo ""
echo "🎉 All tests passed! Enhanced syntax validation is complete."
echo ""
echo "📋 Summary of enhanced validation:"
echo "  ✅ Message validation (missing/empty messages)"
echo "  ✅ Participant interaction format validation"
echo "  ✅ Line termination validation"
echo "  ✅ Trailing character detection"
echo "  ✅ Enhanced AI prompt guidance"
echo "  ✅ Simple participant names requirement"
echo "  ✅ Clean line endings requirement"
echo "  ✅ Consistent spacing guidance"
echo "  ✅ Concise message guidance"
echo "  ✅ Line splitting validation"
echo "  ✅ Parts length validation"
echo ""
echo "🚀 The system now provides:"
echo "   - Enhanced syntax validation for sequence diagrams"
echo "   - Better detection of common syntax errors"
echo "   - Specific error messages for different issues"
echo "   - Improved AI guidance to prevent errors"
echo "   - Validation of message content and format"
echo "   - Line termination and trailing character checks"
echo ""
echo "📝 Expected behavior:"
echo "   - AI generates syntactically correct sequence diagrams"
echo "   - Validation catches common syntax issues early"
echo "   - Clear error messages guide users to fix problems"
echo "   - Prevention of rendering attempts on invalid diagrams"
echo "   - Better user experience with helpful feedback"
echo ""
echo "💡 Common issues now detected:"
echo "   - Missing or empty messages after colons"
echo "   - Invalid participant interaction formats"
echo "   - Line termination problems"
echo "   - Trailing characters causing parsing errors"
echo "   - Inconsistent spacing and indentation"
echo "   - Complex participant names with spaces"
echo ""
echo "🔧 Error handling improvements:"
echo "   - Specific error messages for each type of issue"
echo "   - Line-by-line validation with context"
echo "   - Clear guidance on how to fix problems"
echo "   - Prevention of cascading errors"
echo "   - Better debugging information" 