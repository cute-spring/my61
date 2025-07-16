import { IStateManager, IApplicationState, IStateChangeEvent } from '../interfaces/IStateManager';
import { DiagramType } from '../../tools/uml/types';

export class StateManager implements IStateManager {
    private static instance: StateManager;
    private state: IApplicationState;
    private listeners: ((state: IApplicationState) => void)[] = [];

    private constructor() {
        this.state = {
            chat: {
                messages: [],
                currentInput: '',
                isProcessing: false,
                selectedDiagramType: 'sequence',
                lastUsedDiagramType: 'sequence'
            },
            diagram: {
                currentCode: '',
                currentType: 'sequence',
                currentSVG: '',
                isLoading: false,
                metadata: {
                    generatedAt: Date.now(),
                    generationTime: 0,
                    validationStatus: 'valid'
                }
            },
            ui: {
                isChatExpanded: true,
                isOnboardingActive: false,
                onboardingStep: 0,
                isTutorialVisible: false,
                zoomLevel: 1,
                panelLayout: 0.5
            },
            preferences: {
                preferredAIModel: 'copilot',
                preferredDiagramEngine: 'plantuml',
                autoSave: true,
                autoExport: false,
                theme: 'light',
                language: 'en'
            },
            settings: {
                version: '1.0.0',
                lastUpdateCheck: Date.now(),
                showWelcome: true,
                showAnalytics: true,
                debugMode: false
            }
        };
    }

    public static getInstance(): StateManager {
        if (!StateManager.instance) {
            StateManager.instance = new StateManager();
        }
        return StateManager.instance;
    }

    public getState(): IApplicationState {
        return { ...this.state };
    }

    public updateState(updates: Partial<IApplicationState>): void {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...updates };
        
        // Notify listeners of state changes
        this.notifyListeners();
    }

    public subscribe(callback: (state: IApplicationState) => void): () => void {
        this.listeners.push(callback);
        
        // Return unsubscribe function
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    public async saveState(): Promise<void> {
        try {
            // TODO: Implement persistent storage
            console.log('Saving state to persistent storage...');
        } catch (error) {
            console.error('Failed to save state:', error);
        }
    }

    public async loadState(): Promise<void> {
        try {
            // TODO: Implement persistent storage loading
            console.log('Loading state from persistent storage...');
        } catch (error) {
            console.error('Failed to load state:', error);
        }
    }

    public resetState(): void {
        this.state = {
            chat: {
                messages: [],
                currentInput: '',
                isProcessing: false,
                selectedDiagramType: 'sequence',
                lastUsedDiagramType: 'sequence'
            },
            diagram: {
                currentCode: '',
                currentType: 'sequence',
                currentSVG: '',
                isLoading: false,
                metadata: {
                    generatedAt: Date.now(),
                    generationTime: 0,
                    validationStatus: 'valid'
                }
            },
            ui: {
                isChatExpanded: true,
                isOnboardingActive: false,
                onboardingStep: 0,
                isTutorialVisible: false,
                zoomLevel: 1,
                panelLayout: 0.5
            },
            preferences: {
                preferredAIModel: 'copilot',
                preferredDiagramEngine: 'plantuml',
                autoSave: true,
                autoExport: false,
                theme: 'light',
                language: 'en'
            },
            settings: {
                version: '1.0.0',
                lastUpdateCheck: Date.now(),
                showWelcome: true,
                showAnalytics: true,
                debugMode: false
            }
        };
        
        this.notifyListeners();
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => {
            try {
                listener(this.state);
            } catch (error) {
                console.error('Error in state change listener:', error);
            }
        });
    }

    // Convenience methods for common state operations
    public setCurrentDiagramType(type: DiagramType): void {
        this.updateState({
            chat: { ...this.state.chat, selectedDiagramType: type },
            diagram: { ...this.state.diagram, currentType: type }
        });
    }

    public setCurrentCode(code: string): void {
        this.updateState({
            diagram: { ...this.state.diagram, currentCode: code }
        });
    }

    public setProcessing(isProcessing: boolean): void {
        this.updateState({
            chat: { ...this.state.chat, isProcessing }
        });
    }

    public addMessage(message: any): void {
        const messages = [...this.state.chat.messages, message];
        this.updateState({
            chat: { ...this.state.chat, messages }
        });
    }

    public setCurrentInput(input: string): void {
        this.updateState({
            chat: { ...this.state.chat, currentInput: input }
        });
    }

    public setDiagramError(error: string | undefined): void {
        this.updateState({
            diagram: { ...this.state.diagram, error }
        });
    }

    public setDiagramLoading(isLoading: boolean): void {
        this.updateState({
            diagram: { ...this.state.diagram, isLoading }
        });
    }
} 