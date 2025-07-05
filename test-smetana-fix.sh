#!/bin/bash

# Test script to validate PlantUML Smetana configuration
echo "Testing PlantUML Smetana layout engine..."

# Find the PlantUML JAR path
PLANTUML_JAR="/Users/gavinzhang/Library/Application Support/Code/User/globalStorage/undefined_publisher.nondevtaskkiller/plantuml.jar"

if [ ! -f "$PLANTUML_JAR" ]; then
    echo "❌ PlantUML JAR not found at: $PLANTUML_JAR"
    exit 1
fi

echo "✅ PlantUML JAR found"

# Test Java availability
if ! command -v java &> /dev/null; then
    echo "❌ Java not found in PATH"
    exit 1
fi

echo "✅ Java is available"

# Test PlantUML with DOT engine (default)
echo "🧪 Testing DOT engine..."
DOT_OUTPUT=$(echo "@startuml
Alice -> Bob: Hello with DOT
@enduml" | java -jar "$PLANTUML_JAR" -pipe -tsvg 2>&1)

if [[ $DOT_OUTPUT == *"<svg"* ]]; then
    echo "✅ DOT engine works"
else
    echo "⚠️  DOT engine issue: $DOT_OUTPUT"
fi

# Test PlantUML with Smetana engine
echo "🧪 Testing Smetana engine..."
SMETANA_OUTPUT=$(echo "@startuml
Alice -> Bob: Hello with Smetana
@enduml" | java -jar "$PLANTUML_JAR" -Playout=smetana -pipe -tsvg 2>&1)

if [[ $SMETANA_OUTPUT == *"<svg"* ]]; then
    echo "✅ Smetana engine works"
    echo "📏 SVG size: $(echo "$SMETANA_OUTPUT" | wc -c) characters"
else
    echo "❌ Smetana engine failed: $SMETANA_OUTPUT"
fi

# Test parameter order used by our extension
echo "🧪 Testing extension parameter order..."
EXTENSION_OUTPUT=$(echo "@startuml
class TestClass {
  +field: String
  +method(): void
}
@enduml" | java -Dplantuml.include.path=/tmp -jar "$PLANTUML_JAR" -Playout=smetana -pipeimageindex 0 -charset utf-8 -pipe -tsvg 2>&1)

if [[ $EXTENSION_OUTPUT == *"<svg"* ]]; then
    echo "✅ Extension parameter order works with Smetana"
else
    echo "❌ Extension parameter order failed: $EXTENSION_OUTPUT"
fi

echo "🎯 Testing complete!"
