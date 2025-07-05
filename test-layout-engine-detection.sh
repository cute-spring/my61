#!/bin/bash

# Test script to verify PlantUML layout engine detection accuracy
# This tests that the status bar shows the ACTUAL engine being used

echo "=== PlantUML Layout Engine Detection Test ==="
echo ""

# Test 1: Smetana configuration
echo "Test 1: Testing Smetana configuration..."
echo "- Setting layoutEngine to 'smetana'"
echo "- Expected: Status should show 'Smetana' and work without DOT"

# Test 2: DOT configuration with DOT available
echo ""
echo "Test 2: Testing DOT configuration with DOT available..."
echo "- Setting layoutEngine to 'dot' (no custom path)"
echo "- Expected: Status should show 'DOT' if graphviz is installed"

# Test 3: DOT configuration without DOT available
echo ""
echo "Test 3: Testing DOT configuration without DOT available..."
echo "- Setting layoutEngine to 'dot' but DOT not found"
echo "- Expected: Status should show 'Smetana (Auto-fallback)' with warning icon"

# Test 4: Custom DOT path
echo ""
echo "Test 4: Testing custom DOT path..."
echo "- Setting layoutEngine to 'dot' with custom path"
echo "- Expected: Status should show 'DOT (Custom)' if path is valid"

echo ""
echo "=== Manual Testing Steps ==="
echo "1. Open VS Code with this extension"
echo "2. Look at the status bar (left side) for PlantUML indicator"
echo "3. Change settings: Ctrl+Alt+P to configure PlantUML"
echo "4. Test with UML Chat Designer to generate diagrams"
echo "5. Watch for status bar updates and console messages"
echo ""
echo "=== Console Verification ==="
echo "Check Developer Console (Help > Toggle Developer Tools) for:"
echo "- 'PlantUML rendering: configured=X, actual=Y, matching=Z'"
echo "- Warning messages about DOT not found"
echo "- Engine fallback notifications"
echo ""
echo "=== Expected Behaviors ==="
echo "✅ Status bar shows ACTUAL engine being used (not just configured)"
echo "✅ Warning icon (⚠️) when configuration doesn't match reality"
echo "✅ Console logs show engine verification results"
echo "✅ Auto-fallback detection when DOT is configured but unavailable"
echo "✅ Real-time updates when diagrams are rendered"
echo ""
echo "Run this test in different environments:"
echo "- Machine with Graphviz installed"
echo "- Machine without Graphviz"  
echo "- Machine with custom DOT path"
echo "- Machine with invalid DOT path"
