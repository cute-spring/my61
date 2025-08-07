/**
 * UML Generator - Handles communication with Copilot API to generate PlantUML diagrams
 */

import * as vscode from 'vscode';
import { selectCopilotLLMModel } from '../../llm';
import { DiagramType, UMLGenerationRequest, UMLGenerationResponse } from './types';

export class UMLGenerator {
    /**
     * Generate PlantUML diagram from user requirement
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
            const chatResponse = await model.sendRequest(prompt, {}, token);
            
            const responseText = await this.extractResponseText(chatResponse);
            const extractedDiagramType = this.extractDiagramType(responseText);
            
            return {
                plantUML: responseText,
                diagramType: extractedDiagramType,
                explanation: this.extractExplanation(responseText)
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
            ? `Generate a PlantUML ${diagramType} diagram.`
            : 'Generate the most appropriate UML diagram for the requirement.';

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
        let plantuml = '';
        for await (const fragment of chatResponse.text) {
            plantuml += fragment;
        }
        return plantuml;
    }

    /**
     * Get system prompt for UML generation
     * Focused on diagram types with significant AI-driven comparative advantages
     */
    private getSystemPrompt(typeInstruction: string): string {
        return `You are an expert software architect and technical writer specializing in AI-driven rapid diagram generation.
First, briefly explain the user's system, question, or process in 2-3 sentences.
Then, output the corresponding PlantUML code (and only valid PlantUML code) for the described system or process.
If the user provides an update, modify the previous diagram and explanation accordingly.
${typeInstruction}

IMPORTANT: You MUST always include the diagram type in your response. Format your response EXACTLY as follows:

Explanation:
<your explanation here>

Diagram Type: <EXACTLY one of: activity, sequence, usecase, class, component>

@startuml
<PlantUML code here>
@enduml`;
    }

    /**
     * Extract diagram type from LLM response
     * Focused on diagram types with significant AI-driven comparative advantages
     */
    extractDiagramType(response: string): DiagramType {
        const diagramTypeMatch = response.match(/Diagram Type:\s*([^\n\r]+)/i);
        if (!diagramTypeMatch?.[1]) {
            console.warn('LLM did not provide a valid diagram type');
            return '';
        }

        const type = diagramTypeMatch[1].trim().toLowerCase();
        const typeMap: Record<string, DiagramType> = {
            'activity': 'activity',
            'sequence': 'sequence', 
            'usecase': 'usecase',
            'use case': 'usecase',
            'class': 'class',
            'component': 'component'
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
     * Generate a smart filename using AI based on chat content
     */
    async generateSmartFilename(
        userMessages: string[], 
        diagramType?: DiagramType
    ): Promise<string> {
        if (userMessages.length === 0) {
            return 'uml-chat-session';
        }

        const prompt = this.buildFilenamePrompt(userMessages, diagramType);
        
        try {
            const model = await selectCopilotLLMModel();
            
            if (!model) {
                throw new Error('No Copilot model available for filename generation.');
            }

            const token = new vscode.CancellationTokenSource().token;
            const chatResponse = await model.sendRequest(prompt, {}, token);
            
            const responseText = await this.extractResponseText(chatResponse);
            const filename = this.extractFilename(responseText);
            
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
        
        const systemPrompt = `You are an expert at creating descriptive, professional filenames for UML diagram sessions.

Based on the user's requirements and conversation, generate a concise, descriptive filename that captures the essence of the design.

Requirements:
- Use only lowercase letters, numbers, and hyphens
- Keep it under 50 characters
- Make it descriptive but concise
- Include the diagram type if relevant
- Avoid special characters except hyphens
- Make it suitable for file systems

Context:
${typeContext}

User Requirements:
${context}

Generate ONLY the filename, nothing else. Example format: "user-authentication-system-sequence"`;

        return [
            vscode.LanguageModelChatMessage.User(systemPrompt)
        ];
    }

    /**
     * Extract filename from AI response
     */
    private extractFilename(response: string): string {
        // Clean the response to extract just the filename
        const cleanResponse = response.trim()
            .replace(/^["']|["']$/g, '') // Remove quotes
            .replace(/[^a-zA-Z0-9-]/g, '-') // Replace special chars with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
            .toLowerCase();

        return cleanResponse || '';
    }

    /**
     * Generate fallback filename when AI generation fails
     */
    private generateFallbackFilename(userMessages: string[], diagramType?: DiagramType): string {
        const primaryMessage = userMessages[0] || '';
        
        // Extract meaningful words
        const words = primaryMessage.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => 
                word.length > 2 && 
                !['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(word)
            )
            .slice(0, 3);

        const baseName = words.join('-') || 'uml';
        const typeSuffix = diagramType ? `-${diagramType}` : '';
        
        return `${baseName}${typeSuffix}`;
    }
}
