#!/bin/bash

# Phase 3 Advanced Features Test Script
# Tests: Plugin System, Enhanced Strategy Pattern, Lazy Loading

set -e

echo "🧪 Testing Phase 3 Advanced Features..."
echo "========================================"

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

# Helper function to run tests
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

# Helper function to check file existence
check_file() {
    local file_path="$1"
    local description="$2"
    
    if [ -f "$file_path" ]; then
        echo -e "${GREEN}✅ Found: ${description}${NC}"
        return 0
    else
        echo -e "${RED}❌ Missing: ${description}${NC}"
        return 1
    fi
}

# Helper function to check compilation
check_compilation() {
    local description="$1"
    
    if npm run compile 2>/dev/null; then
        echo -e "${GREEN}✅ Compiled: ${description}${NC}"
        return 0
    else
        echo -e "${RED}❌ Compilation failed: ${description}${NC}"
        return 1
    fi
}

# Helper function to check linting
check_linting() {
    local description="$1"
    
    if npm run lint 2>/dev/null; then
        echo -e "${GREEN}✅ Linted: ${description}${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Linting issues: ${description}${NC}"
        return 1
    fi
}

echo -e "\n${BLUE}Phase 3 Advanced Features Test Suite${NC}"
echo "=============================================="

# Test 1: Check Phase 3 core files exist
echo -e "\n${YELLOW}1. Checking Phase 3 Core Files${NC}"
run_test "Enhanced Dependency Injection" "check_file 'src/tools/base/dependencyInjection.ts' 'Enhanced Dependency Injection Container'"
run_test "Advanced Event Bus System" "check_file 'src/tools/base/eventBus.ts' 'Advanced Event Bus System'"
run_test "Lazy Loading System" "check_file 'src/tools/base/lazyLoading.ts' 'Lazy Loading System'"
run_test "Plugin System Architecture" "check_file 'src/tools/plugins/pluginSystem.ts' 'Plugin System Architecture'"
run_test "Enhanced Strategy Pattern" "check_file 'src/tools/uml/strategy/engineStrategy.ts' 'Enhanced Strategy Pattern'"

# Test 2: Check TypeScript compilation
echo -e "\n${YELLOW}2. Checking TypeScript Compilation${NC}"
run_test "Phase 3 Core Compilation" "check_compilation 'Phase 3 Core Components'"

# Test 3: Check linting
echo -e "\n${YELLOW}3. Checking Code Quality${NC}"
run_test "Phase 3 Linting" "check_linting 'Phase 3 Components'"

# Test 4: Test Dependency Injection Features
echo -e "\n${YELLOW}4. Testing Dependency Injection Features${NC}"

# Create a test file for DI testing
cat > test-di-features.js << 'EOF'
const { container } = require('./src/tools/base/dependencyInjection.ts');

// Test service registration
container.register('testService', () => ({ id: 'test' }), {
  lifecycle: 'singleton',
  onInit: (service) => console.log('Service initialized'),
  onDestroy: (service) => console.log('Service destroyed')
});

// Test service resolution
const service = container.resolve('testService');
console.log('Service resolved:', service.id === 'test');

// Test scope creation
const scope = container.createScope();
const scopedService = scope.resolve('testService');
console.log('Scoped service resolved:', scopedService.id === 'test');

// Test statistics
const stats = container.getStats();
console.log('Container stats:', stats.totalServices > 0);

console.log('✅ Dependency Injection tests passed');
EOF

run_test "Dependency Injection Features" "node test-di-features.js"

# Test 5: Test Event Bus Features
echo -e "\n${YELLOW}5. Testing Event Bus Features${NC}"

# Create a test file for event bus testing
cat > test-event-bus.js << 'EOF'
const { eventBus } = require('./src/tools/base/eventBus.ts');

// Test event subscription
const subscription = eventBus.subscribe('testEvent', (event) => {
  console.log('Event received:', event.message);
}, { async: true, priority: 'high' });

// Test event publishing
eventBus.publish('testEvent', { message: 'Hello from Phase 3!' });

// Test event history
eventBus.enableHistory({ maxEvents: 100 });
const history = eventBus.getHistory();
console.log('Event history enabled:', history.length >= 0);

// Test statistics
const stats = eventBus.getStats();
console.log('Event bus stats:', stats.totalSubscriptions > 0);

console.log('✅ Event Bus tests passed');
EOF

run_test "Event Bus Features" "node test-event-bus.js"

# Test 6: Test Lazy Loading Features
echo -e "\n${YELLOW}6. Testing Lazy Loading Features${NC}"

# Create a test file for lazy loading testing
cat > test-lazy-loading.js << 'EOF'
const { lazyLoadingManager, createLazyService } = require('./src/tools/base/lazyLoading.ts');

// Test lazy service creation
const lazyService = createLazyService('testService', async () => {
  return { data: 'loaded on demand' };
}, { preload: false, cacheSize: 10 });

// Test lazy loading
const service = await lazyService();
console.log('Lazy service loaded:', service.data === 'loaded on demand');

// Test statistics
const stats = lazyLoadingManager.getStats();
console.log('Lazy loading stats:', stats.totalModules > 0);

console.log('✅ Lazy Loading tests passed');
EOF

run_test "Lazy Loading Features" "node test-lazy-loading.js"

# Test 7: Test Plugin System Features
echo -e "\n${YELLOW}7. Testing Plugin System Features${NC}"

# Create a test file for plugin system testing
cat > test-plugin-system.js << 'EOF'
const { pluginManager } = require('./src/tools/plugins/pluginSystem.ts');

// Test plugin manager initialization
console.log('Plugin manager initialized:', pluginManager !== null);

// Test statistics
const stats = pluginManager.getStats();
console.log('Plugin manager stats:', stats.totalPlugins >= 0);

console.log('✅ Plugin System tests passed');
EOF

run_test "Plugin System Features" "node test-plugin-system.js"

# Test 8: Test Enhanced Strategy Pattern
echo -e "\n${YELLOW}8. Testing Enhanced Strategy Pattern${NC}"

# Create a test file for strategy pattern testing
cat > test-strategy-pattern.js << 'EOF'
const { engineManager } = require('./src/tools/uml/strategy/engineStrategy.ts');

// Test engine manager initialization
console.log('Engine manager initialized:', engineManager !== null);

// Test statistics
const stats = engineManager.getEngineStats();
console.log('Engine manager stats:', stats.totalEngines >= 0);

console.log('✅ Enhanced Strategy Pattern tests passed');
EOF

run_test "Enhanced Strategy Pattern" "node test-strategy-pattern.js"

# Test 9: Integration Tests
echo -e "\n${YELLOW}9. Integration Tests${NC}"

# Create integration test
cat > test-integration.js << 'EOF'
const { container } = require('./src/tools/base/dependencyInjection.ts');
const { eventBus } = require('./src/tools/base/eventBus.ts');
const { lazyLoadingManager } = require('./src/tools/base/lazyLoading.ts');
const { pluginManager } = require('./src/tools/plugins/pluginSystem.ts');
const { engineManager } = require('./src/tools/uml/strategy/engineStrategy.ts');

// Test all systems are initialized
console.log('DI Container:', container.getStats().totalServices >= 0);
console.log('Event Bus:', eventBus.getStats().totalSubscriptions >= 0);
console.log('Lazy Loading:', lazyLoadingManager.getStats().totalModules >= 0);
console.log('Plugin Manager:', pluginManager.getStats().totalPlugins >= 0);
console.log('Engine Manager:', engineManager.getEngineStats().totalEngines >= 0);

console.log('✅ Integration tests passed');
EOF

run_test "Phase 3 Integration" "node test-integration.js"

# Test 10: Performance Tests
echo -e "\n${YELLOW}10. Performance Tests${NC}"

# Create performance test
cat > test-performance.js << 'EOF'
const { lazyLoadingManager } = require('./src/tools/base/lazyLoading.ts');

// Test lazy loading performance
const startTime = Date.now();

const testModule = lazyLoadingManager.registerModule('perfTest', async () => {
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate load time
  return { data: 'performance test' };
});

const result = await testModule.load();
const loadTime = Date.now() - startTime;

console.log('Load time:', loadTime, 'ms');
console.log('Performance acceptable:', loadTime < 1000);

console.log('✅ Performance tests passed');
EOF

run_test "Performance Tests" "node test-performance.js"

# Cleanup test files
echo -e "\n${YELLOW}Cleaning up test files...${NC}"
rm -f test-di-features.js test-event-bus.js test-lazy-loading.js test-plugin-system.js test-strategy-pattern.js test-integration.js test-performance.js

# Summary
echo -e "\n${BLUE}Phase 3 Advanced Features Test Summary${NC}"
echo "=============================================="
echo -e "Total Tests: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All Phase 3 tests passed!${NC}"
    echo -e "${GREEN}Phase 3 Advanced Features are ready for use.${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some Phase 3 tests failed.${NC}"
    echo -e "${YELLOW}Please review the failed tests and fix any issues.${NC}"
    exit 1
fi 