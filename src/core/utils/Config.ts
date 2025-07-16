/**
 * Configuration utility for managing application settings
 */

export interface IConfigValue {
    value: any;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description?: string;
    defaultValue?: any;
    validator?: (value: any) => boolean;
}

export interface IConfigSection {
    [key: string]: IConfigValue;
}

export interface IConfiguration {
    [section: string]: IConfigSection;
}

export class Config {
    private static instance: Config;
    private config: IConfiguration = {};
    private listeners: Map<string, ((key: string, value: any) => void)[]> = new Map();

    private constructor() {
        this.initializeDefaultConfig();
    }

    public static getInstance(): Config {
        if (!Config.instance) {
            Config.instance = new Config();
        }
        return Config.instance;
    }

    private initializeDefaultConfig(): void {
        this.config = {
            app: {
                version: {
                    value: '1.0.0',
                    type: 'string',
                    description: 'Application version'
                },
                debugMode: {
                    value: false,
                    type: 'boolean',
                    description: 'Enable debug mode'
                },
                logLevel: {
                    value: 'info',
                    type: 'string',
                    description: 'Logging level',
                    validator: (value) => ['debug', 'info', 'warn', 'error'].includes(value)
                }
            },
            ui: {
                theme: {
                    value: 'light',
                    type: 'string',
                    description: 'UI theme',
                    validator: (value) => ['light', 'dark', 'auto'].includes(value)
                },
                language: {
                    value: 'en',
                    type: 'string',
                    description: 'Interface language'
                },
                compactMode: {
                    value: false,
                    type: 'boolean',
                    description: 'Enable compact UI mode'
                },
                autoSave: {
                    value: true,
                    type: 'boolean',
                    description: 'Auto-save diagrams'
                }
            },
            ai: {
                defaultModel: {
                    value: 'copilot',
                    type: 'string',
                    description: 'Default AI model'
                },
                maxTokens: {
                    value: 2000,
                    type: 'number',
                    description: 'Maximum tokens for AI responses',
                    validator: (value) => value > 0 && value <= 8000
                },
                temperature: {
                    value: 0.7,
                    type: 'number',
                    description: 'AI response creativity',
                    validator: (value) => value >= 0 && value <= 1
                }
            },
            diagram: {
                defaultEngine: {
                    value: 'plantuml',
                    type: 'string',
                    description: 'Default diagram engine'
                },
                defaultType: {
                    value: 'sequence',
                    type: 'string',
                    description: 'Default diagram type'
                },
                autoRender: {
                    value: true,
                    type: 'boolean',
                    description: 'Auto-render diagrams'
                },
                showGrid: {
                    value: false,
                    type: 'boolean',
                    description: 'Show grid in diagram editor'
                }
            },
            analytics: {
                enabled: {
                    value: true,
                    type: 'boolean',
                    description: 'Enable analytics'
                },
                trackUsage: {
                    value: true,
                    type: 'boolean',
                    description: 'Track usage statistics'
                },
                trackErrors: {
                    value: true,
                    type: 'boolean',
                    description: 'Track error reports'
                }
            }
        };
    }

    public get<T>(key: string, defaultValue?: T): T {
        const [section, property] = this.parseKey(key);
        
        if (!this.config[section] || !this.config[section][property]) {
            if (defaultValue !== undefined) {
                return defaultValue;
            }
            throw new Error(`Configuration key not found: ${key}`);
        }

        const configValue = this.config[section][property];
        return configValue.value as T;
    }

    public set(key: string, value: any): void {
        const [section, property] = this.parseKey(key);
        
        if (!this.config[section]) {
            this.config[section] = {};
        }

        if (!this.config[section][property]) {
            throw new Error(`Configuration key not found: ${key}`);
        }

        const configValue = this.config[section][property];
        
        // Validate type
        if (typeof value !== configValue.type && configValue.type !== 'object' && configValue.type !== 'array') {
            throw new Error(`Invalid type for ${key}. Expected ${configValue.type}, got ${typeof value}`);
        }

        // Validate value if validator exists
        if (configValue.validator && !configValue.validator(value)) {
            throw new Error(`Invalid value for ${key}: ${value}`);
        }

        const oldValue = configValue.value;
        configValue.value = value;

        // Notify listeners
        this.notifyListeners(key, value, oldValue);
    }

    public has(key: string): boolean {
        const [section, property] = this.parseKey(key);
        return !!(this.config[section] && this.config[section][property]);
    }

    public getAll(): IConfiguration {
        return JSON.parse(JSON.stringify(this.config));
    }

    public getSection(section: string): IConfigSection | undefined {
        return this.config[section] ? { ...this.config[section] } : undefined;
    }

    public reset(key?: string): void {
        if (key) {
            const [section, property] = this.parseKey(key);
            if (this.config[section] && this.config[section][property]) {
                const configValue = this.config[section][property];
                if (configValue.defaultValue !== undefined) {
                    this.set(key, configValue.defaultValue);
                }
            }
        } else {
            this.initializeDefaultConfig();
        }
    }

    public subscribe(key: string, callback: (key: string, value: any) => void): () => void {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        
        this.listeners.get(key)!.push(callback);
        
        return () => {
            const keyListeners = this.listeners.get(key);
            if (keyListeners) {
                const index = keyListeners.indexOf(callback);
                if (index > -1) {
                    keyListeners.splice(index, 1);
                }
            }
        };
    }

    public export(): string {
        const exportData: Record<string, any> = {};
        
        Object.keys(this.config).forEach(section => {
            exportData[section] = {};
            Object.keys(this.config[section]).forEach(property => {
                exportData[section][property] = this.config[section][property].value;
            });
        });
        
        return JSON.stringify(exportData, null, 2);
    }

    public import(configData: string): void {
        try {
            const data = JSON.parse(configData);
            
            Object.keys(data).forEach(section => {
                if (data[section] && typeof data[section] === 'object') {
                    Object.keys(data[section]).forEach(property => {
                        const key = `${section}.${property}`;
                        if (this.has(key)) {
                            this.set(key, data[section][property]);
                        }
                    });
                }
            });
        } catch (error) {
            throw new Error(`Failed to import configuration: ${error}`);
        }
    }

    public getSchema(): IConfiguration {
        return JSON.parse(JSON.stringify(this.config));
    }

    private parseKey(key: string): [string, string] {
        const parts = key.split('.');
        if (parts.length !== 2) {
            throw new Error(`Invalid configuration key format: ${key}. Expected 'section.property'`);
        }
        return [parts[0], parts[1]];
    }

    private notifyListeners(key: string, newValue: any, oldValue: any): void {
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            keyListeners.forEach(callback => {
                try {
                    callback(key, newValue);
                } catch (error) {
                    console.error(`Error in config listener for ${key}:`, error);
                }
            });
        }
    }
} 