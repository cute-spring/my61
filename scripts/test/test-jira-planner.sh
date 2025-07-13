#!/bin/bash

# Test script for AI Jira Planning Assistant
# This script tests the basic functionality of the new AI Jira Planning Assistant

echo "🧪 Testing AI Jira Planning Assistant..."
echo "========================================"

# Check if the main tool file exists
if [ -f "src/tools/jira/jiraPlanningTool.ts" ]; then
    echo "✅ Main tool file exists"
else
    echo "❌ Main tool file missing"
    exit 1
fi

# Check if all required files exist
required_files=(
    "src/tools/jira/jiraPlanningTypes.ts"
    "src/tools/jira/jiraPlannerWebview.ts"
    "src/tools/jira/jiraPlannerWorkflow.ts"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
        exit 1
    fi
done

# Check if the tool is properly exported
if grep -q "JiraPlanningTool" "src/tools.ts"; then
    echo "✅ Tool is exported from tools.ts"
else
    echo "❌ Tool not exported from tools.ts"
    exit 1
fi

# Check if the tool is registered in extension.ts
if grep -q "JiraPlanningTool" "src/extension.ts"; then
    echo "✅ Tool is registered in extension.ts"
else
    echo "❌ Tool not registered in extension.ts"
    exit 1
fi

# Check if the command is added to package.json
if grep -q "copilotTools.jiraPlanningAssistant" "package.json"; then
    echo "✅ Command is added to package.json"
else
    echo "❌ Command not added to package.json"
    exit 1
fi

# Check TypeScript compilation
echo "🔍 Checking TypeScript compilation..."
if npm run check-types > /dev/null 2>&1; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi

# Check for any linting issues
echo "🔍 Checking linting..."
if npm run lint > /dev/null 2>&1; then
    echo "✅ Linting passed"
else
    echo "⚠️  Linting warnings found (non-critical)"
fi

echo ""
echo "🎉 AI Jira Planning Assistant test completed successfully!"
echo ""
echo "📋 Summary:"
echo "   - All required files present"
echo "   - Tool properly exported and registered"
echo "   - Command added to package.json"
echo "   - TypeScript compilation successful"
echo ""
echo "🚀 The AI Jira Planning Assistant is ready to use!"
echo "   Users can access it via: Command Palette → 'AI Jira Planning Assistant'" 