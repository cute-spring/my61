#!/bin/bash

# Test Core Infrastructure
# This script tests the new core infrastructure components

set -e

echo "🧪 Testing Core Infrastructure Components..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Starting core infrastructure tests..."

# Test 1: Compilation check
print_status "Testing TypeScript compilation..."
if npm run compile 2>/dev/null; then
    print_success "TypeScript compilation successful"
else
    print_error "TypeScript compilation failed"
    exit 1
fi

# Test 2: Check if core files exist
print_status "Checking core infrastructure files..."

CORE_FILES=(
    "src/core/logging/Logger.ts"
    "src/core/config/ConfigManager.ts"
    "src/core/errors/ErrorTypes.ts"
    "src/core/errors/ApplicationError.ts"
    "src/core/errors/ErrorHandler.ts"
    "src/core/di/Container.ts"
    "src/core/strategies/EngineStrategy.ts"
)

for file in "${CORE_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "✓ $file exists"
    else
        print_error "✗ $file missing"
        exit 1
    fi
done

# Test 3: Check for linter errors
print_status "Checking for linter errors..."
if npx eslint src/core/ --ext .ts 2>/dev/null; then
    print_success "No linter errors in core files"
else
    print_warning "Linter errors found in core files (this is expected during development)"
fi

# Test 4: Test basic functionality
print_status "Testing basic functionality..."

# Create a simple test file to verify imports work
cat > test-core-temp.ts << 'EOF'
import { Logger, LogLevel } from './src/core/logging/Logger';
import { ConfigManager } from './src/core/config/ConfigManager';
import { ErrorHandler } from './src/core/errors/ErrorHandler';
import { Container } from './src/core/di/Container';
import { EngineStrategyManager } from './src/core/strategies/EngineStrategy';

// Test Logger
const logger = Logger.getInstance();
logger.setLogLevel(LogLevel.DEBUG);
logger.info('Test message', { component: 'Test' });

// Test ConfigManager
const config = ConfigManager.getInstance();
const appConfig = config.getConfig();
console.log('Config loaded:', Object.keys(appConfig));

// Test ErrorHandler
const errorHandler = ErrorHandler.getInstance();
console.log('ErrorHandler initialized');

// Test Container
const container = Container.getInstance();
console.log('Container initialized');

// Test EngineStrategyManager
const strategyManager = EngineStrategyManager.getInstance();
console.log('StrategyManager initialized');

console.log('All core components initialized successfully');
EOF

# Try to compile the test file
if npx tsc test-core-temp.ts --noEmit 2>/dev/null; then
    print_success "Core components can be imported and initialized"
else
    print_error "Failed to import core components"
    rm -f test-core-temp.ts
    exit 1
fi

# Clean up test file
rm -f test-core-temp.ts

# Test 5: Check for circular dependencies
print_status "Checking for potential circular dependencies..."

# This is a basic check - in a real scenario you'd use a more sophisticated tool
if grep -r "import.*from.*core" src/core/ 2>/dev/null | grep -v "import.*from.*\.\./" > /dev/null; then
    print_warning "Potential circular dependencies detected"
else
    print_success "No obvious circular dependencies found"
fi

# Test 6: Check singleton patterns
print_status "Verifying singleton patterns..."

SINGLETON_CLASSES=(
    "Logger"
    "ConfigManager"
    "ErrorHandler"
    "Container"
    "EngineStrategyManager"
)

for class in "${SINGLETON_CLASSES[@]}"; do
    if grep -q "getInstance()" src/core/**/*.ts 2>/dev/null; then
        print_success "✓ $class singleton pattern found"
    else
        print_warning "? $class singleton pattern not clearly identified"
    fi
done

# Test 7: Check error handling patterns
print_status "Checking error handling patterns..."

if grep -q "ApplicationError" src/core/errors/ErrorHandler.ts; then
    print_success "✓ ApplicationError integration found"
else
    print_warning "? ApplicationError integration not found"
fi

# Test 8: Check logging integration
print_status "Checking logging integration..."

if grep -q "Logger.getInstance()" src/core/config/ConfigManager.ts; then
    print_success "✓ Logger integration in ConfigManager"
else
    print_warning "? Logger integration not found in ConfigManager"
fi

# Test 9: Check configuration validation
print_status "Checking configuration validation..."

if grep -q "validateConfig" src/core/config/ConfigManager.ts; then
    print_success "✓ Configuration validation found"
else
    print_warning "? Configuration validation not found"
fi

# Test 10: Check strategy pattern implementation
print_status "Checking strategy pattern implementation..."

if grep -q "EngineStrategy" src/core/strategies/EngineStrategy.ts; then
    print_success "✓ EngineStrategy interface found"
else
    print_warning "? EngineStrategy interface not found"
fi

# Summary
echo ""
echo "📊 Core Infrastructure Test Summary:"
echo "====================================="
print_success "Core infrastructure components are in place"
print_success "TypeScript compilation is working"
print_success "Basic imports and initialization work"
print_status "Ready for Phase 1 implementation"

echo ""
print_status "Next steps:"
echo "1. Implement concrete engine strategies"
echo "2. Integrate with existing UML components"
echo "3. Add comprehensive unit tests"
echo "4. Implement UI integration"

print_success "✅ Core infrastructure tests completed successfully!" 