/**
 * Mermaid Generator - Handles communication with Copilot API to generate Mermaid diagrams
 */

import * as vscode from 'vscode';
import { selectCopilotLLMModel } from '../../llm';
import { DiagramType, UMLGenerationRequest, UMLGenerationResponse } from './types';

export class MermaidGenerator {
    /**
     * Generate Mermaid diagram from user requirement
     */
    async generateFromRequirement(
        requirement: string, 
        history: string[], 
        diagramType?: DiagramType
    ): Promise<UMLGenerationResponse> {
        const prompt = this.buildPrompt(requirement, history, diagramType);
        
        try {
            const model = await selectCopilotLLMModel();
            
            if (!model) {
                throw new Error('No Copilot model available.');
            }

            const token = new vscode.CancellationTokenSource().token;
            const startIso = new Date().toISOString();
            const start = Date.now();
            let firstByte: number | undefined;
            const chatResponse = await model.sendRequest(prompt, {}, token);
            let responseText = '';
            for await (const fragment of chatResponse.text) {
                if (firstByte === undefined) { firstByte = Date.now() - start; }
                responseText += fragment;
            }
            const end = Date.now();
            const totalMs = end - start;
            const promptChars = prompt.reduce((acc, m) => acc + (m.content?.length || 0), 0);
            const responseChars = responseText.length;
            const responseLines = responseText.split(/\r?\n/).length;
            // Mermaid code block detection
            const mermaidBlockMatch = responseText.match(/```mermaid[\s\S]*?```/i);
            const diagramBlock = mermaidBlockMatch ? mermaidBlockMatch[0] : undefined;
            const diagramLines = diagramBlock ? diagramBlock.split(/\r?\n/).length : undefined;
            const stats = {
                engine: 'mermaid',
                modelId: (model as any).id || (model as any).name,
                startTimestamp: startIso,
                endTimestamp: new Date().toISOString(),
                firstByteMs: firstByte,
                waitingMs: firstByte,
                totalMs,
                generationMs: firstByte !== undefined && firstByte !== null ? totalMs - firstByte : undefined,
                promptChars,
                responseChars,
                responseLines,
                diagramLines,
                diagramSizeChars: diagramBlock?.length,
                promptMessages: prompt.length,
                historyDepth: prompt.length - 2,
                timestamp: startIso,
                diagramType: undefined as DiagramType | undefined
            };
            const extractedDiagramType = this.extractDiagramType(responseText);
            stats.diagramType = extractedDiagramType;
            return {
                plantUML: responseText, // Keep the same interface for compatibility
                diagramType: extractedDiagramType,
                explanation: this.extractExplanation(responseText),
                stats
            };
        } catch (err: any) {
            throw new Error(`Copilot API error: ${err.message || String(err)}`);
        }
    }

    /**
     * Build prompt messages for Copilot API
     */
    private buildPrompt(
        requirement: string, 
        history: string[], 
        diagramType?: DiagramType
    ): vscode.LanguageModelChatMessage[] {
        const typeInstruction = diagramType && diagramType.trim() !== '' 
            ? `Generate a Mermaid ${diagramType} diagram.`
            : 'Generate the most appropriate Mermaid diagram for the requirement.';

        return [
            vscode.LanguageModelChatMessage.User(this.getSystemPrompt(typeInstruction)),
            ...history.map(msg => vscode.LanguageModelChatMessage.User(msg)),
            vscode.LanguageModelChatMessage.User(requirement)
        ];
    }

    /**
     * Extract response text from Copilot API stream
     */
    private async extractResponseText(chatResponse: any): Promise<string> {
        let mermaid = '';
        for await (const fragment of chatResponse.text) {
            mermaid += fragment;
        }
        return mermaid;
    }

    /**
     * Get system prompt for Mermaid generation
     */
    private getSystemPrompt(typeInstruction: string): string {
        return `You are an expert software architect and technical writer specializing in AI-driven rapid Mermaid diagram generation.

First, briefly explain the user's system, question, or process in 2-3 sentences.
Then, output the corresponding Mermaid code (and only valid Mermaid code) for the described system or process.
If the user provides an update, modify the previous diagram and explanation accordingly.

${typeInstruction}

CRITICAL MERMAID SYNTAX RULES:
- For sequence diagrams: 
  * Start with 'sequenceDiagram'
  * Define participants with 'participant <Name>' (use simple names without spaces)
  * MUST include actual sequence interactions using arrows (->>, -->, -x, etc.)
  * Each interaction should have a message: 'Participant1->>Participant2: Message'
  * Do NOT leave sequence diagrams empty after participant definitions
  * Ensure each line ends cleanly without trailing characters
  * Use consistent spacing and indentation
  * Example of correct syntax:
    sequenceDiagram
        participant User
        participant AuthService
        participant PaymentGateway
        
        User->>AuthService: Submit credentials
        AuthService->>User: Authentication success
        User->>PaymentGateway: Initiate payment
- For flowcharts: Use proper node syntax and arrow connections
- For class diagrams: Use proper class syntax with attributes and methods
- Always use valid Mermaid syntax - no custom or invalid symbols
- Ensure all lines are properly terminated
- Use consistent indentation and spacing

SEQUENCE DIAGRAM REQUIREMENTS:
- ALWAYS include actual sequence interactions after defining participants
- Use proper arrow syntax: ->> (solid arrow), --> (dotted arrow), -x (crossed arrow)
- Each line should show an interaction between participants
- Include meaningful messages for each interaction
- Show the complete flow from start to finish
- Ensure each interaction line ends properly (no trailing characters)
- Use simple participant names without spaces or special characters
- Keep messages concise and clear
- NEVER use complex participant names with spaces in sequence interactions
- Use exact participant names as defined in participant statements
- Ensure proper spacing around arrows and colons

IMPORTANT: You MUST always include the diagram type in your response. Format your response EXACTLY as follows:

Explanation:
<your explanation here>

Diagram Type: <EXACTLY one of: flowchart, sequence, class, state, gantt, pie>

\`\`\`mermaid
<Valid Mermaid code here - ensure proper syntax and complete content>
\`\`\``;
    }

    /**
     * Extract diagram type from LLM response
     * Focused on Mermaid diagram types
     */
    extractDiagramType(response: string): DiagramType {
        const diagramTypeMatch = response.match(/Diagram Type:\s*([^\n\r]+)/i);
        if (!diagramTypeMatch?.[1]) {
            console.warn('LLM did not provide a valid diagram type');
            return '';
        }

        const type = diagramTypeMatch[1].trim().toLowerCase();
        const typeMap: Record<string, DiagramType> = {
            'flowchart': 'activity', // Map Mermaid flowchart to PlantUML activity
            'sequence': 'sequence', 
            'class': 'class',
            'state': 'activity', // Map Mermaid state to PlantUML activity
            'gantt': 'activity', // Map Mermaid gantt to PlantUML activity
            'pie': 'activity' // Map Mermaid pie to PlantUML activity
        };

        for (const [key, value] of Object.entries(typeMap)) {
            if (type === key || type.includes(key)) {
                return value;
            }
        }

        return '';
    }

    /**
     * Extract explanation from LLM response
     */
    private extractExplanation(response: string): string {
        const explanationMatch = response.match(/Explanation:\s*(.*?)(?:\n\nDiagram Type:|$)/s);
        return explanationMatch?.[1]?.trim() || '';
    }

    /**
     * Extract Mermaid code from response
     */
    extractMermaidCode(response: string): string {
        const mermaidMatch = response.match(/```mermaid\s*([\s\S]*?)\s*```/);
        if (mermaidMatch && mermaidMatch[1]) {
            return mermaidMatch[1].trim();
        }
        
        // Fallback: try to find any code block
        const codeBlockMatch = response.match(/```\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
            return codeBlockMatch[1].trim();
        }
        
        return '';
    }

    /**
     * Generate a smart filename using AI based on chat content
     */
    async generateSmartFilename(
        userMessages: string[], 
        diagramType?: DiagramType
    ): Promise<string> {
        if (userMessages.length === 0) {
            return 'mermaid-chat-session';
        }

        const prompt = this.buildFilenamePrompt(userMessages, diagramType);
        
        try {
            const model = await selectCopilotLLMModel();
            
            if (!model) {
                throw new Error('No Copilot model available for filename generation.');
            }

            const token = new vscode.CancellationTokenSource().token;
            const chatResponse = await model.sendRequest(prompt, {}, token);
            
            let filename = '';
            for await (const fragment of chatResponse.text) {
                filename += fragment;
            }
            
            // Clean up the filename
            filename = filename.trim().toLowerCase()
                .replace(/[^a-z0-9-]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            
            return filename || this.generateFallbackFilename(userMessages, diagramType);
        } catch (err: any) {
            console.warn('AI filename generation failed, using fallback:', err.message);
            return this.generateFallbackFilename(userMessages, diagramType);
        }
    }

    /**
     * Build prompt for filename generation
     */
    private buildFilenamePrompt(
        userMessages: string[], 
        diagramType?: DiagramType
    ): vscode.LanguageModelChatMessage[] {
        const context = userMessages.join('\n');
        const typeContext = diagramType ? `The diagram type is: ${diagramType}` : 'The diagram type is not specified';
        
        const systemPrompt = `You are an expert at creating descriptive, professional filenames for Mermaid diagram sessions.

Based on the user's requirements and conversation, generate a concise, descriptive filename that captures the essence of the design.

Requirements:
- Use only lowercase letters, numbers, and hyphens
- Keep it under 50 characters
- Make it descriptive but concise
- Include the diagram type if relevant
- Avoid special characters except hyphens
- Make it suitable for file systems
- Prefix with 'mermaid-' to indicate Mermaid diagrams

Context:
${typeContext}

User Requirements:
${context}`;

        return [
            vscode.LanguageModelChatMessage.User(systemPrompt)
        ];
    }

    /**
     * Generate fallback filename
     */
    private generateFallbackFilename(userMessages: string[], diagramType?: DiagramType): string {
        const firstMessage = userMessages[0] || '';
        const words = firstMessage.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .split(/\s+/)
            .slice(0, 3);
        
        const baseName = words.join('-') || 'mermaid-diagram';
        const typeSuffix = diagramType ? `-${diagramType}` : '';
        
        return `mermaid-${baseName}${typeSuffix}`;
    }
}