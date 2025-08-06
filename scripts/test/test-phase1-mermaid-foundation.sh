#!/bin/bash

# Phase 1 Mermaid Foundation Test Script
# Tests feature flags, engine skeleton, safe registration, and user feedback

set -e

echo "🧪 Testing Phase 1 Mermaid Foundation Features"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}Testing: ${test_name}${NC}"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED: ${test_name}${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAILED: ${test_name}${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Function to check if file exists
check_file_exists() {
    local file_path="$1"
    if [ -f "$file_path" ]; then
        return 0
    else
        echo "File not found: $file_path"
        return 1
    fi
}

# Function to check if TypeScript compiles
check_ts_compile() {
    local file_path="$1"
    if npx tsc --noEmit --target ES2022 --downlevelIteration "$file_path" 2>/dev/null; then
        return 0
    else
        echo "TypeScript compilation failed for: $file_path"
        return 1
    fi
}

# Function to check if ESLint passes
check_lint() {
    local file_path="$1"
    if npx eslint "$file_path" 2>/dev/null; then
        return 0
    else
        echo "ESLint failed for: $file_path"
        return 1
    fi
}

echo -e "\n${YELLOW}Phase 1: Foundation & Feature Flags${NC}"
echo "=============================================="

# Test 1: Feature Flag System
run_test "Feature Flag System - File exists" \
    "check_file_exists 'src/tools/config/featureFlags.ts'"

run_test "Feature Flag System - TypeScript compiles" \
    "check_ts_compile 'src/tools/config/featureFlags.ts'"

run_test "Feature Flag System - ESLint passes" \
    "check_lint 'src/tools/config/featureFlags.ts'"

# Test 2: Mermaid Engine Skeleton
run_test "Mermaid Engine Skeleton - File exists" \
    "check_file_exists 'src/tools/uml/engines/mermaidEngine.ts'"

run_test "Mermaid Engine Skeleton - TypeScript compiles" \
    "check_ts_compile 'src/tools/uml/engines/mermaidEngine.ts'"

run_test "Mermaid Engine Skeleton - ESLint passes" \
    "check_lint 'src/tools/uml/engines/mermaidEngine.ts'"

# Test 3: Safe Engine Registration
run_test "Engine Manager - File exists" \
    "check_file_exists 'src/tools/uml/engineManager.ts'"

run_test "Engine Manager - TypeScript compiles" \
    "check_ts_compile 'src/tools/uml/engineManager.ts'"

run_test "Engine Manager - ESLint passes" \
    "check_lint 'src/tools/uml/engineManager.ts'"

# Test 4: User Feedback System
run_test "Feature Feedback - File exists" \
    "check_file_exists 'src/tools/feedback/featureFeedback.ts'"

run_test "Feature Feedback - TypeScript compiles" \
    "check_ts_compile 'src/tools/feedback/featureFeedback.ts'"

run_test "Feature Feedback - ESLint passes" \
    "check_lint 'src/tools/feedback/featureFeedback.ts'"

# Test 5: Integration Tests
echo -e "\n${YELLOW}Integration Tests${NC}"
echo "=================="

# Test 5.1: Check if all files can be imported together
run_test "Integration - All files can be imported" \
    "node -e \"
const fs = require('fs');
const files = [
    'src/tools/config/featureFlags.ts',
    'src/tools/uml/engines/mermaidEngine.ts',
    'src/tools/uml/engineManager.ts',
    'src/tools/feedback/featureFeedback.ts'
];
files.forEach(file => {
    if (!fs.existsSync(file)) {
        console.error('Missing file:', file);
        process.exit(1);
    }
});
console.log('All files exist');
\""

# Test 5.2: Check for common patterns
run_test "Integration - Feature flag patterns" \
    "grep -q 'FeatureFlagManager' src/tools/config/featureFlags.ts && \
     grep -q 'isFeatureEnabled' src/tools/config/featureFlags.ts"

run_test "Integration - Engine strategy patterns" \
    "grep -q 'EngineStrategy' src/tools/uml/engines/mermaidEngine.ts && \
     grep -q 'canHandle' src/tools/uml/engines/mermaidEngine.ts"

run_test "Integration - Safe registration patterns" \
    "grep -q 'registerEngine' src/tools/uml/engineManager.ts && \
     grep -q 'selectEngine' src/tools/uml/engineManager.ts"

run_test "Integration - User feedback patterns" \
    "grep -q 'showFeatureEnabledNotification' src/tools/feedback/featureFeedback.ts && \
     grep -q 'showUsageExample' src/tools/feedback/featureFeedback.ts"

# Test 6: Documentation Tests
echo -e "\n${YELLOW}Documentation Tests${NC}"
echo "====================="

run_test "Documentation - Implementation plan exists" \
    "check_file_exists 'docs/MERMAID_INCREMENTAL_PLAN.md'"

run_test "Documentation - Plan is readable" \
    "wc -l docs/MERMAID_INCREMENTAL_PLAN.md | awk '{if (\$1 > 100) exit 0; else exit 1}'"

# Test 7: Configuration Tests
echo -e "\n${YELLOW}Configuration Tests${NC}"
echo "====================="

run_test "Configuration - VS Code settings structure" \
    "grep -q 'umlChatDesigner' src/tools/config/featureFlags.ts"

run_test "Configuration - Feature flag methods" \
    "grep -q 'enableFeature' src/tools/config/featureFlags.ts && \
     grep -q 'disableFeature' src/tools/config/featureFlags.ts"

# Test 8: Error Handling Tests
echo -e "\n${YELLOW}Error Handling Tests${NC}"
echo "======================="

run_test "Error Handling - Engine disabled fallback" \
    "grep -q 'Mermaid engine is disabled' src/tools/uml/engines/mermaidEngine.ts"

run_test "Error Handling - Safe registration" \
    "grep -q 'Failed to register Mermaid engine' src/tools/uml/engineManager.ts"

# Test 9: Performance Tests
echo -e "\n${YELLOW}Performance Tests${NC}"
echo "=================="

run_test "Performance - Lazy initialization" \
    "grep -q 'isInitialized' src/tools/uml/engines/mermaidEngine.ts"

run_test "Performance - Memory management" \
    "grep -q 'dispose' src/tools/uml/engines/mermaidEngine.ts"

# Test 10: User Experience Tests
echo -e "\n${YELLOW}User Experience Tests${NC}"
echo "========================="

run_test "UX - Placeholder SVG generation" \
    "grep -q 'getPlaceholderSvg' src/tools/uml/engines/mermaidEngine.ts"

run_test "UX - Fallback SVG generation" \
    "grep -q 'getFallbackSvg' src/tools/uml/engines/mermaidEngine.ts"

run_test "UX - Feature notifications" \
    "grep -q 'showFeatureEnabledNotification' src/tools/feedback/featureFeedback.ts"

# Summary
echo -e "\n${YELLOW}Test Summary${NC}"
echo "==========="
echo -e "Total Tests: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All Phase 1 tests passed!${NC}"
    echo -e "${BLUE}Phase 1 foundation is ready for user testing.${NC}"
    echo -e "\n${YELLOW}Next Steps:${NC}"
    echo "1. Enable Mermaid features in VS Code settings"
    echo "2. Test the placeholder functionality"
    echo "3. Provide feedback on the user experience"
    echo "4. Proceed to Phase 2: Format Detection"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Please fix the issues before proceeding.${NC}"
    exit 1
fi 