#!/bin/bash

# PlantUML Auto-Download Test Script
# This script helps test the automatic PlantUML JAR download functionality

echo "🧪 PlantUML Auto-Download Test Script"
echo "====================================="

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    STORAGE_PATH="$HOME/Library/Application Support/Code/User/globalStorage/undefined_publisher.nondevtaskkiller"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    STORAGE_PATH="$HOME/.config/Code/User/globalStorage/undefined_publisher.nondevtaskkiller"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    STORAGE_PATH="$APPDATA/Code/User/globalStorage/undefined_publisher.nondevtaskkiller"
else
    echo "❌ Unsupported OS: $OSTYPE"
    exit 1
fi

JAR_FILE="$STORAGE_PATH/plantuml.jar"

echo "📁 Storage Path: $STORAGE_PATH"
echo "📄 JAR File: $JAR_FILE"
echo ""

# Check if JAR exists
if [ -f "$JAR_FILE" ]; then
    echo "✅ JAR file found!"
    echo "📊 File size: $(ls -lh "$JAR_FILE" | awk '{print $5}')"
    echo "📅 Modified: $(ls -l "$JAR_FILE" | awk '{print $6, $7, $8}')"
    echo ""
    
    read -p "❓ Do you want to delete it to test auto-download? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -f "$JAR_FILE"
        if [ $? -eq 0 ]; then
            echo "🗑️  JAR file deleted successfully!"
            echo ""
            echo "🔄 Next Steps:"
            echo "1. Restart VS Code completely"
            echo "2. Open UML Chat Designer"
            echo "3. Send any UML requirement"
            echo "4. Watch for download progress notification"
            echo ""
            echo "📋 Test message you can use:"
            echo '"Create a class diagram for a simple e-commerce system with User, Product, and Order classes"'
        else
            echo "❌ Failed to delete JAR file"
            exit 1
        fi
    else
        echo "ℹ️  JAR file kept. No changes made."
    fi
else
    echo "❌ JAR file not found at expected location"
    echo "   This means automatic download should trigger on next use!"
    echo ""
    echo "🔄 To test:"
    echo "1. Open VS Code"
    echo "2. Open UML Chat Designer"
    echo "3. Send any UML requirement"
    echo "4. Watch for download progress notification"
fi

echo ""
echo "🏁 Test script completed!"
