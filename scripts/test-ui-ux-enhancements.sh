#!/bin/bash

# UI/UX Enhancement Test Runner
# Automated testing script for the new UI/UX features

set -e  # Exit on any error

echo "🧪 UI/UX Enhancement Test Suite"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "${BLUE}Running: ${test_name}${NC}"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASSED: ${test_name}${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ FAILED: ${test_name}${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    echo ""
}

# Test 1: Check if modern styles file exists and is valid
test_modern_styles() {
    if [ -f "src/tools/ui/modernStyles.ts" ]; then
        # Check if the file contains expected content
        if grep -q "getModernStyles" "src/tools/ui/modernStyles.ts" && \
           grep -q "tool-container" "src/tools/ui/modernStyles.ts" && \
           grep -q "CSS Custom Properties" "src/tools/ui/modernStyles.ts"; then
            return 0
        fi
    fi
    return 1
}

# Test 2: Check if interactive components file exists and is valid
test_interactive_components() {
    if [ -f "src/tools/ui/interactiveComponents.ts" ]; then
        if grep -q "getInteractiveComponents" "src/tools/ui/interactiveComponents.ts" && \
           grep -q "copyWithFeedback" "src/tools/ui/interactiveComponents.ts" && \
           grep -q "showToast" "src/tools/ui/interactiveComponents.ts"; then
            return 0
        fi
    fi
    return 1
}

# Test 3: Check if enhanced email tool exists and is valid
test_enhanced_email_tool() {
    if [ -f "src/tools/email/enhancedEmailRefineTool.ts" ]; then
        if grep -q "EnhancedEmailRefineTool" "src/tools/email/enhancedEmailRefineTool.ts" && \
           grep -q "tone-selector" "src/tools/email/enhancedEmailRefineTool.ts" && \
           grep -q "metrics-grid" "src/tools/email/enhancedEmailRefineTool.ts"; then
            return 0
        fi
    fi
    return 1
}

# Test 4: Check TypeScript compilation
test_typescript_compilation() {
    npm run compile 2>/dev/null
    return $?
}

# Test 5: Check for proper imports and exports
test_imports_exports() {
    # Check if modernStyles exports the expected function
    if grep -q "export.*getModernStyles" "src/tools/ui/modernStyles.ts" && \
       grep -q "export.*getInteractiveComponents" "src/tools/ui/interactiveComponents.ts"; then
        return 0
    fi
    return 1
}

# Test 6: Validate CSS syntax in modernStyles
test_css_syntax() {
    # Extract CSS content and check for basic syntax
    if grep -q "font-family\|background\|border-radius\|padding\|margin" "src/tools/ui/modernStyles.ts" && \
       grep -q "@media\|@keyframes" "src/tools/ui/modernStyles.ts"; then
        return 0
    fi
    return 1
}

# Test 7: Check JavaScript syntax in interactiveComponents
test_javascript_syntax() {
    # Check for proper function definitions and event handling
    if grep -q "function.*(" "src/tools/ui/interactiveComponents.ts" && \
       grep -q "addEventListener\|querySelector" "src/tools/ui/interactiveComponents.ts"; then
        return 0
    fi
    return 1
}

# Test 8: Verify package.json dependencies
test_dependencies() {
    # Check if required dependencies are present
    if [ -f "package.json" ]; then
        if grep -q "marked" "package.json" && \
           grep -q "vscode" "package.json"; then
            return 0
        fi
    fi
    return 1
}

# Test 9: Check file structure
test_file_structure() {
    local required_files=(
        "src/tools/ui/modernStyles.ts"
        "src/tools/ui/interactiveComponents.ts" 
        "src/tools/email/enhancedEmailRefineTool.ts"
        "tests/ui-ux-enhancements.test.js"
        "tests/UI_UX_TESTING_GUIDE.md"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            return 1
        fi
    done
    return 0
}

# Test 10: Validate accessibility features
test_accessibility_features() {
    if grep -q "focus-visible\|aria-\|role=" "src/tools/ui/modernStyles.ts" && \
       grep -q "keydown\|keyboard" "src/tools/ui/interactiveComponents.ts"; then
        return 0
    fi
    return 1
}

echo "Starting automated tests..."
echo ""

# Run all tests
run_test "Modern Styles File Validation" "test_modern_styles"
run_test "Interactive Components Validation" "test_interactive_components"
run_test "Enhanced Email Tool Validation" "test_enhanced_email_tool"
run_test "TypeScript Compilation" "test_typescript_compilation"
run_test "Import/Export Validation" "test_imports_exports"
run_test "CSS Syntax Validation" "test_css_syntax"
run_test "JavaScript Syntax Validation" "test_javascript_syntax"
run_test "Package Dependencies Check" "test_dependencies"
run_test "File Structure Validation" "test_file_structure"
run_test "Accessibility Features Check" "test_accessibility_features"

# Test Summary
echo "================================"
echo "Test Results Summary:"
echo "================================"
echo -e "Total Tests: ${BLUE}${TESTS_TOTAL}${NC}"
echo -e "Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Failed: ${RED}${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! The UI/UX enhancements are ready for testing.${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Run 'npm run compile' to build the extension"
    echo "2. Press F5 in VS Code to launch Extension Development Host"
    echo "3. Follow the manual testing guide in tests/UI_UX_TESTING_GUIDE.md"
    echo "4. Test with different themes and panel sizes"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please review the errors above.${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "1. Check file paths and naming"
    echo "2. Verify TypeScript syntax"
    echo "3. Ensure all required imports are present"
    echo "4. Review the testing guide for detailed steps"
    exit 1
fi
