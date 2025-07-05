#!/bin/bash

# Test script for DOT auto-detection functionality
echo "=== DOT Auto-Detection Test ==="
echo ""

# Test common DOT installation locations
echo "Testing common DOT installation paths..."

# Function to test if a path exists
test_path() {
    local path="$1"
    if [ -f "$path" ]; then
        echo "✅ Found: $path"
        # Test if it's actually DOT
        if "$path" -V 2>&1 | grep -i "graphviz\|dot version" > /dev/null; then
            echo "   ✅ Verified as working DOT executable"
        else
            echo "   ❌ File exists but is not DOT"
        fi
    else
        echo "❌ Not found: $path"
    fi
}

# Test system PATH
echo ""
echo "1. Testing system PATH..."
if command -v dot > /dev/null 2>&1; then
    DOT_PATH=$(which dot)
    echo "✅ DOT found in PATH: $DOT_PATH"
    dot -V 2>&1 | head -1
else
    echo "❌ DOT not found in system PATH"
fi

# Test Windows paths (if on Windows/WSL)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo ""
    echo "2. Testing Windows common paths..."
    test_path "C:/Program Files/Graphviz/bin/dot.exe"
    test_path "C:/Program Files (x86)/Graphviz/bin/dot.exe"
    test_path "C:/Graphviz/bin/dot.exe"
    test_path "C:/ProgramData/chocolatey/bin/dot.exe"
fi

# Test macOS paths
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo ""
    echo "2. Testing macOS common paths..."
    test_path "/usr/local/bin/dot"
    test_path "/opt/homebrew/bin/dot"
    test_path "/usr/bin/dot"
    test_path "/opt/local/bin/dot"
    
    # Test Homebrew Cellar (with version wildcards)
    echo ""
    echo "Testing Homebrew Cellar directories..."
    for cellar_path in /usr/local/Cellar/graphviz/*/bin/dot /opt/homebrew/Cellar/graphviz/*/bin/dot; do
        if [ -f "$cellar_path" ]; then
            echo "✅ Found Homebrew installation: $cellar_path"
        fi
    done
fi

# Test Linux paths
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo ""
    echo "2. Testing Linux common paths..."
    test_path "/usr/bin/dot"
    test_path "/usr/local/bin/dot"
    test_path "/bin/dot"
    test_path "/opt/graphviz/bin/dot"
    test_path "/snap/bin/dot"
fi

echo ""
echo "=== VS Code Extension Test ==="
echo "To test in VS Code:"
echo "1. Open this extension in VS Code"
echo "2. Press Ctrl+Alt+P to configure PlantUML"
echo "3. Select 'DOT (Graphviz)'"
echo "4. Extension should automatically detect DOT installations"
echo "5. Check console for detection results"

echo ""
echo "=== Manual Detection Test ==="
echo "You can also test the TypeScript detection directly:"
echo "1. Open Developer Tools in VS Code (Help > Toggle Developer Tools)"
echo "2. In console, run:"
echo "   const detector = require('./dist/tools/utils/dotPathDetector.js');"
echo "   detector.DotPathDetector.detectDotPath().then(console.log);"

echo ""
echo "Expected output format:"
echo "{"
echo "  found: true/false,"
echo "  path: '/path/to/dot',"
echo "  version: '2.44.1',"
echo "  method: 'system_path'|'auto_detected'|'not_found',"
echo "  searchedPaths: ['/path1', '/path2', ...]"
echo "}"
