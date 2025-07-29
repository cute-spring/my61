# Mermaid Code Extraction Improvements

## Problem Identified

The Mermaid renderer was receiving the full bot response text including markdown code blocks (```mermaid ... ```), but it should only receive the pure Mermaid code for rendering. This was causing the diagrams to not display properly.

## Solution Implemented

### 1. Enhanced Code Extraction

#### **Improved Regex Patterns**
- **Mermaid-specific**: `/```mermaid\s*([\s\S]*?)\s*```/i` (case-insensitive)
- **Fallback**: `/```\s*([\s\S]*?)\s*```/` (any code block)
- **Flexible matching**: Handles various markdown formatting styles

#### **Debug Logging**
- **Input logging**: Shows what text is being processed
- **Extraction logging**: Shows what code was extracted
- **Fallback logging**: Indicates when no code blocks are found

### 2. Fallback Display System

#### **When Mermaid Library Fails**
- **Code display**: Shows the extracted Mermaid code in a readable format
- **HTML escaping**: Safely displays code with proper escaping
- **User-friendly**: Clear indication that library is unavailable

#### **Fallback SVG Structure**
```svg
<svg width="600" height="400">
  <rect width="100%" height="100%" fill="#f8f9fa"/>
  <text>Mermaid Code (Library Not Available)</text>
  <foreignObject>
    <div style="font-family: monospace; white-space: pre-wrap;">
      <!-- Escaped Mermaid code here -->
    </div>
  </foreignObject>
</svg>
```

### 3. Improved Error Handling

#### **Multiple Import Strategies**
- **Dynamic import**: `await import('mermaid')` (primary)
- **Require fallback**: `require('mermaid')` (secondary)
- **Graceful degradation**: Falls back to code display if both fail

#### **Error Categories**
- **Library unavailable**: Shows code display
- **Rendering errors**: Shows specific error messages
- **Extraction failures**: Shows setup instructions

### 4. Enhanced User Experience

#### **Visual Feedback**
- **Success**: Normal diagram rendering
- **Library failure**: Code display with explanation
- **Extraction failure**: Setup instructions

#### **Debug Information**
- **Console logs**: Help developers troubleshoot issues
- **Error messages**: Clear indication of what went wrong
- **Code visibility**: Users can see the generated code even if rendering fails

## Technical Implementation

### 1. **Code Extraction Method**
```typescript
private extractMermaidCode(response: string): string {
    console.log('Extracting Mermaid code from:', response.substring(0, 200) + '...');
    
    // Try to find Mermaid code block with more flexible matching
    const mermaidMatch = response.match(/```mermaid\s*([\s\S]*?)\s*```/i);
    if (mermaidMatch && mermaidMatch[1]) {
        const extracted = mermaidMatch[1].trim();
        console.log('Extracted Mermaid code:', extracted.substring(0, 100) + '...');
        return extracted;
    }
    
    // Try to find any code block
    const codeBlockMatch = response.match(/```\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
        const extracted = codeBlockMatch[1].trim();
        console.log('Extracted code block:', extracted.substring(0, 100) + '...');
        return extracted;
    }
    
    // If no code blocks found, assume the entire response is Mermaid code
    console.log('No code blocks found, using entire response');
    return response.trim();
}
```

### 2. **Fallback Display Method**
```typescript
private createMermaidCodeFallback(mermaidCode: string): string {
    const cleanCode = this.extractMermaidCode(mermaidCode);
    const escapedCode = cleanCode
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    
    return `<svg>...</svg>`; // SVG with escaped code display
}
```

### 3. **Enhanced Error Handling**
```typescript
async renderToSVG(mermaidCode: string): Promise<string> {
    if (!this.isInitialized) {
        try {
            await this.initialize();
        } catch (error) {
            console.error('Failed to initialize Mermaid renderer:', error);
            return this.createMermaidCodeFallback(mermaidCode);
        }
    }
    
    try {
        const cleanMermaidCode = this.extractMermaidCode(mermaidCode);
        const { svg } = await this.mermaid.render('mermaid-diagram', cleanMermaidCode);
        return this.postProcessSVG(svg);
    } catch (err: any) {
        const errorMessage = err.message || String(err);
        console.error('Mermaid rendering error:', errorMessage);
        
        // If Mermaid library is not available, show the code as text
        if (errorMessage.includes('mermaid') || errorMessage.includes('Mermaid')) {
            return this.createMermaidCodeFallback(mermaidCode);
        }
        
        return this.createErrorSVG(errorMessage);
    }
}
```

## Benefits

### 1. **Reliability**
- **Robust extraction**: Handles various markdown formats
- **Multiple fallbacks**: Graceful degradation when components fail
- **Error recovery**: Continues to provide value even when rendering fails

### 2. **Debugging**
- **Clear logging**: Easy to identify where issues occur
- **Code visibility**: Users can see generated code even if rendering fails
- **Error context**: Specific error messages help with troubleshooting

### 3. **User Experience**
- **Always functional**: System never completely fails
- **Informative feedback**: Users understand what's happening
- **Code access**: Users can copy and use the generated code elsewhere

### 4. **Developer Experience**
- **Easy troubleshooting**: Debug logs show exactly what's happening
- **Flexible implementation**: Multiple strategies for different environments
- **Maintainable code**: Clear separation of concerns

## Testing

### **Automated Tests**
- **Test script**: `scripts/test/test-mermaid-code-extraction.sh`
- **Comprehensive**: Validates all improvements
- **Cross-platform**: Works in different environments

### **Manual Testing**
- **Normal flow**: Mermaid library works, diagrams render
- **Library failure**: Code display shows generated code
- **Extraction failure**: Setup instructions guide users

## Expected Behavior

### **When Everything Works**
1. Bot generates response with ```mermaid code blocks
2. Mermaid renderer extracts pure Mermaid code
3. Mermaid library renders diagram to SVG
4. User sees the rendered diagram

### **When Mermaid Library Fails**
1. Bot generates response with ```mermaid code blocks
2. Mermaid renderer extracts pure Mermaid code
3. Mermaid library fails to load/initialize
4. Fallback display shows the extracted code in readable format
5. User can see and copy the generated code

### **When Extraction Fails**
1. Bot generates response without proper code blocks
2. Mermaid renderer can't extract code
3. Setup instructions guide user to install Mermaid
4. User gets clear guidance on how to proceed

## Conclusion

The Mermaid code extraction improvements ensure that the system is robust and user-friendly. Users will always get value from the system, whether the Mermaid library is available or not. The enhanced debugging capabilities make it easy to identify and resolve issues.

**Key Improvements**:
- ✅ **Better extraction**: Handles various markdown formats
- ✅ **Fallback display**: Shows code when rendering fails
- ✅ **Debug logging**: Easy troubleshooting
- ✅ **Error recovery**: Graceful degradation
- ✅ **User feedback**: Clear indication of system status
- ✅ **Code accessibility**: Users can always see generated code 