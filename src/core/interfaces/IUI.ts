/**
 * Core UI interfaces
 * These interfaces define the contract for UI components and panels
 */

import { IApplicationState } from './IStateManager';

/**
 * UI Panel interface
 */
export interface IUIPanel {
    /**
     * Panel identifier
     */
    readonly id: string;
    
    /**
     * Panel title
     */
    readonly title: string;
    
    /**
     * Panel type
     */
    readonly type: 'chat' | 'preview' | 'settings' | 'analytics';
    
    /**
     * Initialize the panel
     */
    initialize(): Promise<void>;
    
    /**
     * Show the panel
     */
    show(): void;
    
    /**
     * Hide the panel
     */
    hide(): void;
    
    /**
     * Update panel content
     */
    update(state: IApplicationState): void;
    
    /**
     * Dispose panel resources
     */
    dispose(): void;
}

/**
 * UI Component interface
 */
export interface IUIComponent {
    /**
     * Component identifier
     */
    readonly id: string;
    
    /**
     * Component type
     */
    readonly type: string;
    
    /**
     * Initialize the component
     */
    initialize(): Promise<void>;
    
    /**
     * Render the component
     */
    render(): string;
    
    /**
     * Update component state
     */
    update(data: any): void;
    
    /**
     * Handle user interaction
     */
    handleInteraction(event: IUIEvent): void;
    
    /**
     * Dispose component resources
     */
    dispose(): void;
}

/**
 * UI Event interface
 */
export interface IUIEvent {
    /**
     * Event type
     */
    type: string;
    
    /**
     * Event target
     */
    target: string;
    
    /**
     * Event data
     */
    data?: any;
    
    /**
     * Event timestamp
     */
    timestamp: number;
}

/**
 * UI Manager interface
 */
export interface IUIManager {
    /**
     * Register a panel
     */
    registerPanel(panel: IUIPanel): void;
    
    /**
     * Unregister a panel
     */
    unregisterPanel(panelId: string): void;
    
    /**
     * Get panel by ID
     */
    getPanel(panelId: string): IUIPanel | undefined;
    
    /**
     * Get all panels
     */
    getAllPanels(): IUIPanel[];
    
    /**
     * Show panel
     */
    showPanel(panelId: string): void;
    
    /**
     * Hide panel
     */
    hidePanel(panelId: string): void;
    
    /**
     * Update all panels with current state
     */
    updatePanels(state: IApplicationState): void;
    
    /**
     * Register a component
     */
    registerComponent(component: IUIComponent): void;
    
    /**
     * Unregister a component
     */
    unregisterComponent(componentId: string): void;
    
    /**
     * Get component by ID
     */
    getComponent(componentId: string): IUIComponent | undefined;
    
    /**
     * Handle UI event
     */
    handleEvent(event: IUIEvent): void;
}

/**
 * Webview interface
 */
export interface IWebview {
    /**
     * Webview identifier
     */
    readonly id: string;
    
    /**
     * Initialize webview
     */
    initialize(): Promise<void>;
    
    /**
     * Show webview
     */
    show(): void;
    
    /**
     * Hide webview
     */
    hide(): void;
    
    /**
     * Update webview content
     */
    updateContent(html: string): void;
    
    /**
     * Send message to webview
     */
    postMessage(message: any): void;
    
    /**
     * Set message handler
     */
    onMessage(handler: (message: any) => void): void;
    
    /**
     * Dispose webview
     */
    dispose(): void;
}

/**
 * Theme interface
 */
export interface ITheme {
    /**
     * Theme identifier
     */
    readonly id: string;
    
    /**
     * Theme name
     */
    readonly name: string;
    
    /**
     * Theme type
     */
    readonly type: 'light' | 'dark' | 'auto';
    
    /**
     * Get CSS variables
     */
    getCSSVariables(): Record<string, string>;
    
    /**
     * Get color scheme
     */
    getColorScheme(): IColorScheme;
}

/**
 * Color scheme interface
 */
export interface IColorScheme {
    /**
     * Primary colors
     */
    primary: {
        main: string;
        light: string;
        dark: string;
        contrast: string;
    };
    
    /**
     * Secondary colors
     */
    secondary: {
        main: string;
        light: string;
        dark: string;
        contrast: string;
    };
    
    /**
     * Background colors
     */
    background: {
        default: string;
        paper: string;
        elevated: string;
    };
    
    /**
     * Text colors
     */
    text: {
        primary: string;
        secondary: string;
        disabled: string;
    };
    
    /**
     * Status colors
     */
    status: {
        success: string;
        warning: string;
        error: string;
        info: string;
    };
} 