import { IUIManager, IUIPanel, IUIComponent, IUIEvent } from '../interfaces/IUI';
import { IApplicationState } from '../interfaces/IStateManager';

export class UIManager implements IUIManager {
    private static instance: UIManager;
    private panels: Map<string, IUIPanel> = new Map();
    private components: Map<string, IUIComponent> = new Map();
    private eventHandlers: Map<string, (event: IUIEvent) => void> = new Map();

    private constructor() {}

    public static getInstance(): UIManager {
        if (!UIManager.instance) {
            UIManager.instance = new UIManager();
        }
        return UIManager.instance;
    }

    public registerPanel(panel: IUIPanel): void {
        this.panels.set(panel.id, panel);
        console.log(`[UIManager] Registered panel: ${panel.title} (${panel.id})`);
    }

    public unregisterPanel(panelId: string): void {
        const panel = this.panels.get(panelId);
        if (panel) {
            panel.dispose();
            this.panels.delete(panelId);
            console.log(`[UIManager] Unregistered panel: ${panel.title} (${panelId})`);
        }
    }

    public getPanel(panelId: string): IUIPanel | undefined {
        return this.panels.get(panelId);
    }

    public getAllPanels(): IUIPanel[] {
        return Array.from(this.panels.values());
    }

    public showPanel(panelId: string): void {
        const panel = this.panels.get(panelId);
        if (panel) {
            panel.show();
            console.log(`[UIManager] Showed panel: ${panel.title} (${panelId})`);
        } else {
            console.warn(`[UIManager] Panel not found: ${panelId}`);
        }
    }

    public hidePanel(panelId: string): void {
        const panel = this.panels.get(panelId);
        if (panel) {
            panel.hide();
            console.log(`[UIManager] Hid panel: ${panel.title} (${panelId})`);
        } else {
            console.warn(`[UIManager] Panel not found: ${panelId}`);
        }
    }

    public updatePanels(state: IApplicationState): void {
        this.panels.forEach(panel => {
            try {
                panel.update(state);
            } catch (error) {
                console.error(`[UIManager] Error updating panel ${panel.id}:`, error);
            }
        });
    }

    public registerComponent(component: IUIComponent): void {
        this.components.set(component.id, component);
        console.log(`[UIManager] Registered component: ${component.type} (${component.id})`);
    }

    public unregisterComponent(componentId: string): void {
        const component = this.components.get(componentId);
        if (component) {
            component.dispose();
            this.components.delete(componentId);
            console.log(`[UIManager] Unregistered component: ${component.type} (${componentId})`);
        }
    }

    public getComponent(componentId: string): IUIComponent | undefined {
        return this.components.get(componentId);
    }

    public handleEvent(event: IUIEvent): void {
        // Handle component-specific events
        const component = this.components.get(event.target);
        if (component) {
            try {
                component.handleInteraction(event);
            } catch (error) {
                console.error(`[UIManager] Error handling event for component ${event.target}:`, error);
            }
        }

        // Handle global event handlers
        const handler = this.eventHandlers.get(event.type);
        if (handler) {
            try {
                handler(event);
            } catch (error) {
                console.error(`[UIManager] Error in global event handler for ${event.type}:`, error);
            }
        }
    }

    public addEventHandler(eventType: string, handler: (event: IUIEvent) => void): void {
        this.eventHandlers.set(eventType, handler);
    }

    public removeEventHandler(eventType: string): void {
        this.eventHandlers.delete(eventType);
    }

    public getPanelStats(): {
        totalPanels: number;
        visiblePanels: number;
        panelTypes: Map<string, number>;
    } {
        const panelTypes = new Map<string, number>();
        let visiblePanels = 0;

        this.panels.forEach(panel => {
            const count = panelTypes.get(panel.type) || 0;
            panelTypes.set(panel.type, count + 1);
            // Note: We can't determine visibility without additional state tracking
        });

        return {
            totalPanels: this.panels.size,
            visiblePanels,
            panelTypes
        };
    }

    public getComponentStats(): {
        totalComponents: number;
        componentTypes: Map<string, number>;
    } {
        const componentTypes = new Map<string, number>();

        this.components.forEach(component => {
            const count = componentTypes.get(component.type) || 0;
            componentTypes.set(component.type, count + 1);
        });

        return {
            totalComponents: this.components.size,
            componentTypes
        };
    }

    public dispose(): void {
        // Dispose all panels
        this.panels.forEach(panel => {
            try {
                panel.dispose();
            } catch (error) {
                console.error(`[UIManager] Error disposing panel ${panel.id}:`, error);
            }
        });
        this.panels.clear();

        // Dispose all components
        this.components.forEach(component => {
            try {
                component.dispose();
            } catch (error) {
                console.error(`[UIManager] Error disposing component ${component.id}:`, error);
            }
        });
        this.components.clear();

        // Clear event handlers
        this.eventHandlers.clear();

        console.log('[UIManager] Disposed all UI resources');
    }
} 