import * as vscode from "vscode";
import * as fs from "fs";
import * as childProcess from "child_process";
import * as path from "path";
import * as os from "os";
import { PlantUMLDownloader } from './utils/plantUMLDownloader';

// --- Inlined config, common, tools ---

let extensionRoot: string | undefined;
let resolvedPlantumlJarPath: string | undefined;
let extensionContext: vscode.ExtensionContext | undefined;

const config = {
    java: "java",
    jar: () => {
        // Use the resolved JAR path if available
        if (resolvedPlantumlJarPath) { return resolvedPlantumlJarPath; }
        
        // If we have extension context, use its global storage
        if (extensionContext) {
            return PlantUMLDownloader.getDefaultJarPath(extensionContext);
        }
        
        // fallback: try to use extensionRoot or __dirname (legacy)
        const base = extensionRoot || __dirname;
        return path.join(base, "plantuml-mit-1.2025.3.jar");
    },
    includepaths: (_parentUri: vscode.Uri) => [],
    diagramsRoot: (_parentUri: vscode.Uri) => null,
    commandArgs: (_parentUri: vscode.Uri) => {
        const workspaceConfig = vscode.workspace.getConfiguration('plantuml');
         const layoutEngine = workspaceConfig.get<string>('layoutEngine', 'dot');
         const dotPath = workspaceConfig.get<string>('dotPath');
        
        const args: string[] = [];
        
        // Add high resolution support for both PNG and SVG exports
        args.push('-DPLANTUML_LIMIT_SIZE=16384');
        
        // Add SVG-specific quality settings
        args.push('-Psvg.fontsize=14');
        args.push('-Psvg.minlen=2');
        
        // Add layout engine pragma - Smetana uses a different syntax
        if (layoutEngine === 'smetana') {
            // Use -P flag for Smetana layout engine
            args.push('-Playout=smetana');
            console.log('Using Smetana layout engine');
        } else {
            console.log('Using DOT layout engine');
        }
        
        // Add DOT path if specified and using dot engine
        if (layoutEngine === 'dot' && dotPath) {
            args.push(`-DGRAPHVIZ_DOT=${dotPath}`);
            console.log(`Using custom DOT path: ${dotPath}`);
        }
        
        console.log('PlantUML command args:', args);
        return args;
    },
    jarArgs: (_parentUri: vscode.Uri) => []
};

function localize(_id: number, _defaultValue: any, ...args: any[]): string {
    // Simple fallback with more detailed error information
    if (args && args.length > 1) {
        const diagramName = args[0] || 'diagram';
        const errorDetail = args[1] || 'unknown error';
        return `PlantUML rendering failed for ${diagramName}: ${errorDetail}`;
    }
    return "PlantUML rendering error - check console for details";
}

function addFileIndex(filePath: string, index: number, pageCount: number): string {
    if (pageCount <= 1) { return filePath; }
    const ext = path.extname(filePath);
    const base = filePath.slice(0, -ext.length);
    return `${base}_${index + 1}${ext}`;
}

// --- Inlined processWrapper ---

function processWrapper(process: childProcess.ChildProcess, savePath?: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        let stdout: Buffer[] = [];
        let stderr: Buffer[] = [];
        let isResolved = false;
        
        // Set up timeout to prevent hanging processes
        const timeout = setTimeout(() => {
            if (!isResolved) {
                console.warn('PlantUML process timeout, killing process');
                try {
                    process.kill('SIGTERM');
                    // Force kill after 2 seconds if SIGTERM doesn't work
                    setTimeout(() => {
                        if (!process.killed) {
                            process.kill('SIGKILL');
                        }
                    }, 2000);
                } catch (error) {
                    console.error('Error killing PlantUML process:', error);
                }
                isResolved = true;
                reject(new Error('PlantUML process timeout after 30 seconds'));
            }
        }, 30000); // 30 second timeout
        
        // Clean up function
        const cleanup = () => {
            if (timeout) {
                clearTimeout(timeout);
            }
        };
        
        if (process.stdout) {
            process.stdout.on("data", (data: Buffer) => stdout.push(data));
        }
        if (process.stderr) {
            process.stderr.on("data", (data: Buffer) => stderr.push(data));
        }
        process.on("error", (err) => {
            console.error('PlantUML process error:', err);
            if (!isResolved) {
                isResolved = true;
                cleanup();
                reject(err);
            }
        });
        process.on("close", (code) => {
            if (isResolved) {
                return; // Already resolved/rejected
            }
            
            isResolved = true;
            cleanup();
            
            const stderrOutput = Buffer.concat(stderr).toString();
            if (code === 0) {
                const out = Buffer.concat(stdout);
                if (savePath) { 
                    try {
                        fs.writeFileSync(savePath, out);
                    } catch (writeError) {
                        console.error('Error writing PlantUML output to file:', writeError);
                        reject(writeError);
                        return;
                    }
                }
                
                // Log information about which layout engine was actually used
                const config = vscode.workspace.getConfiguration('plantuml');
                 const configuredEngine = config.get<string>('layoutEngine', 'dot');
                
                // Analyze stderr for engine indicators
                let actualEngineUsed = 'unknown';
                if (stderrOutput.includes('smetana') || stderrOutput.toLowerCase().includes('smetana')) {
                    actualEngineUsed = 'smetana';
                } else if (stderrOutput.includes('dot') || stderrOutput.includes('graphviz')) {
                    actualEngineUsed = 'dot';
                } else if (stderrOutput.includes('Cannot find Graphviz') || stderrOutput.includes('dot command not found')) {
                    actualEngineUsed = 'smetana'; // Fallback occurred
                    console.warn('PlantUML: DOT not found, likely fell back to Smetana');
                }
                
                // Store verification result for status bar
                if (actualEngineUsed !== 'unknown') {
                    const isMatching = actualEngineUsed === configuredEngine;
                    console.log(`PlantUML rendering: configured=${configuredEngine}, actual=${actualEngineUsed}, matching=${isMatching}`);
                    
                    // Store the result globally for status bar access
                    (global as any).plantUMLLastVerification = {
                        actualEngine: actualEngineUsed,
                        configuredEngine,
                        isMatching,
                        timestamp: Date.now()
                    };
                }
                
                resolve(out);
            } else {
                console.error(`PlantUML process exited with code ${code}`);
                console.error('PlantUML stderr:', stderrOutput);
                
                // Even on failure, try to extract engine information
                if (stderrOutput.includes('Cannot find Graphviz') || stderrOutput.includes('dot command not found')) {
                    console.warn('PlantUML: DOT configuration issue detected');
                    (global as any).plantUMLLastVerification = {
                        actualEngine: 'unknown', // Could be smetana fallback
                        configuredEngine: vscode.workspace.getConfiguration('plantuml').get<string>('layoutEngine', 'dot'),
                        isMatching: false,
                        timestamp: Date.now()
                    };
                }
                
                reject({ error: stderrOutput || `Process exited with code ${code}` });
            }
        });
    });
}

// --- Main LocalRender class ---

class LocalRender {
    private activeProcesses: Set<childProcess.ChildProcess> = new Set();
    private readonly maxConcurrentProcesses = 3;
    
    constructor(private getJarPath: () => string) {}
    
    limitConcurrency(): boolean {
        return this.activeProcesses.size >= this.maxConcurrentProcesses;
    }
    
    /**
     * Clean up all active processes
     */
    cleanup(): void {
        console.log(`Cleaning up ${this.activeProcesses.size} active PlantUML processes`);
        for (const process of this.activeProcesses) {
            try {
                if (!process.killed) {
                    process.kill('SIGTERM');
                    // Force kill after 2 seconds if needed
                    setTimeout(() => {
                        if (!process.killed) {
                            process.kill('SIGKILL');
                        }
                    }, 2000);
                }
            } catch (error) {
                console.error('Error killing process during cleanup:', error);
            }
        }
        this.activeProcesses.clear();
    }
    
    /**
     * Register a process for tracking
     */
    private registerProcess(process: childProcess.ChildProcess): void {
        this.activeProcesses.add(process);
        
        // Auto-cleanup when process exits
        process.on('exit', () => {
            this.activeProcesses.delete(process);
        });
        
        process.on('error', () => {
            this.activeProcesses.delete(process);
        });
    }

    formats(): string[] {
        return ["png", "svg", "eps", "pdf", "vdx", "xmi", "scxml", "html", "txt", "utxt", "latex", "latex:nopreamble"];
    }

    render(diagram: any, format: string, savePath?: string): { processes: childProcess.ChildProcess[], promise: Promise<Buffer[]> } {
        return this.createTask(diagram, "-pipe", savePath, format);
    }

    getMapData(diagram: any, savePath?: string): { processes: childProcess.ChildProcess[], promise: Promise<Buffer[]> } {
        return this.createTask(diagram, "-pipemap", savePath);
    }

    private createTask(diagram: any, taskType: string, savePath?: string, format?: string): { processes: childProcess.ChildProcess[], promise: Promise<Buffer[]> } {
        // Validate configuration first
        const configError = validatePlantUMLConfig();
        if (configError) {
            return { processes: [], promise: Promise.reject(new Error(configError)) };
        }
        
        const jarPath = this.getJarPath();
        
        // Enhanced Java detection and validation
        const javaValidation = this.validateJavaInstallation();
        if (!javaValidation.isValid) {
            return { processes: [], promise: Promise.reject(new Error(javaValidation.errorMessage)) };
        }

        // Check if JAR exists, if not attempt automatic download
        if (!fs.existsSync(jarPath)) {
            console.log(`PlantUML JAR not found at ${jarPath}, attempting automatic download...`);
            const downloadPromise = PlantUMLDownloader.ensurePlantUMLExists(jarPath).then(success => {
                if (!success) {
                    throw new Error(`PlantUML JAR not found at: ${jarPath} and automatic download failed. Please install manually or use the PlantUML extension.`);
                }
                console.log('PlantUML JAR downloaded successfully, proceeding with rendering...');
                // After successful download, create a new task and return its promise
                const renderTask = this.executeRenderTask(diagram, taskType, savePath, format);
                return renderTask.promise;
            });
            
            return { processes: [], promise: downloadPromise };
        }

        // JAR exists, proceed directly
        return this.executeRenderTask(diagram, taskType, savePath, format);
    }

    private executeRenderTask(diagram: any, taskType: string, savePath?: string, format?: string): { processes: childProcess.ChildProcess[], promise: Promise<Buffer[]> } {
        const jarPath = this.getJarPath();
        let processes: childProcess.ChildProcess[] = [];
        let buffers: Buffer[] = [];
        let cancelled = false;

        let pms = [...Array(diagram.pageCount).keys()].reduce<Promise<void>>((pChain, index) => {
            return pChain.then(() => {
                // Get workspace configuration for PlantUML settings
                const workspaceConfig = vscode.workspace.getConfiguration();
                
                // Enhanced command-line parameters for better SVG quality
                const javaArgs = [
                    '-Djava.awt.headless=true',
                    '-DPLANTUML_LIMIT_SIZE=8192',
                    '-Dfile.encoding=UTF-8',
                    '-Duser.language=en',
                    '-Duser.country=US'
                ];

                // Add Java heap size configuration
                const heapSize = workspaceConfig.get<string>('java.heapSize', '1024m');
                javaArgs.push(`-Xmx${heapSize}`);

                // SVG-specific quality settings from configuration
                const svgFontSize = workspaceConfig.get<number>('svg.fontsize', 14);
                const svgMinLen = workspaceConfig.get<number>('svg.minlen', 1);
                const svgDpi = workspaceConfig.get<number>('svg.dpi', 96);
                
                const svgQualityArgs = [
                    `-Dsvg.fontsize=${svgFontSize}`,
                    `-Dsvg.minlen=${svgMinLen}`,
                    `-Dplantuml.svg.minlen=${svgMinLen}`,
                    `-Dplantuml.dpi=${svgDpi}`
                ];

                // Layout engine configuration
                const layoutEngine = this.getLayoutEngine();
                const layoutArgs = [];
                if (layoutEngine === 'dot') {
                    const dotPath = this.getDotPath();
                    if (dotPath) {
                        layoutArgs.push(`-Dgraphviz.dot=${dotPath}`);
                    }
                } else {
                    // Force Smetana for pure Java rendering
                    layoutArgs.push('-Dsmetana=true');
                }

                // Add user-defined JAR arguments
                const userJarArgs = workspaceConfig.get<string[]>('jarArgs', []);
                
                let params = [...javaArgs, ...svgQualityArgs, ...layoutArgs, ...userJarArgs];

                params.push('-jar', jarPath);

                // Add layout engine args after JAR but before other options
                params.push(...config.commandArgs(diagram.parentUri));

                // Add user-defined command arguments from workspace configuration
                const userCommandArgs = workspaceConfig.get<string[]>('commandArgs', []);
                params.push(...userCommandArgs);

                params.push(
                    "-pipeimageindex",
                    `${index}`,
                    '-charset',
                    'utf-8',
                    taskType
                );

                if (format) { params.push("-t" + format); }
                if (diagram.path) { params.push("-filename", path.basename(diagram.path)); }

                let includePath = diagram.dir;
                let ws = vscode.workspace.getWorkspaceFolder(diagram.parentUri);
                let folderPaths = config.includepaths(diagram.parentUri);
                for (let folderPath of folderPaths) {
                    if (!folderPath) { continue; }
                    includePath += path.delimiter + (path.isAbsolute(folderPath) ? folderPath : path.join(ws?.uri.fsPath ?? "", folderPath));
                }

                let diagramsRoot = config.diagramsRoot(diagram.parentUri) as vscode.Uri | null;
                if (diagramsRoot) {
                    includePath += path.delimiter + diagramsRoot.fsPath;
                }

                params.unshift('-Dplantuml.include.path=' + includePath);
                params.push(...config.jarArgs(diagram.parentUri));

                console.log('PlantUML execution command:', config.java, params.join(' '));
                console.log('PlantUML diagram content preview:', diagram.content.substring(0, 100) + '...');

                // Check concurrency limits before spawning
                if (this.limitConcurrency()) {
                    console.warn('PlantUML concurrency limit reached, rejecting request');
                    throw new Error('PlantUML rendering queue is full. Please try again later.');
                }
                
                let proc = childProcess.spawn(config.java, params);
                processes.push(proc);
                this.registerProcess(proc);

                if (proc.killed) {
                    cancelled = true;
                    return Promise.resolve();
                }

                proc.stdin.write(diagram.content);
                proc.stdin.end();

                let savePath2 = savePath ? addFileIndex(savePath, index, diagram.pageCount) : undefined;
                return processWrapper(proc, savePath2).then(stdout => {
                    if (!cancelled) {
                        buffers.push(stdout);
                    }
                }, (err: any) => Promise.reject(new Error(localize(10, null, diagram.name, err.error))));
            });
        }, Promise.resolve());

        return {
            processes: processes,
            promise: new Promise<Buffer[]>((resolve, reject) => {
                pms.then(() => resolve(buffers)).catch((err: any) => reject(err));
            })
        };
    }

    private getLayoutEngine(): string {
        const workspaceConfig = vscode.workspace.getConfiguration('plantuml');
         const configuredEngine = workspaceConfig.get<string>('layoutEngine', 'smetana');
        
        // Auto-detect and fallback logic
        if (configuredEngine === 'dot') {
            const dotPath = this.getDotPath();
            if (!dotPath || !fs.existsSync(dotPath)) {
                console.log('DOT executable not found, falling back to Smetana');
                return 'smetana';
            }
        }
        
        return configuredEngine;
    }

    private getDotPath(): string | null {
        const workspaceConfig = vscode.workspace.getConfiguration('plantuml');
         const configuredPath = workspaceConfig.get<string>('dotPath');
        
        if (configuredPath) {
            return configuredPath;
        }
        
        // Try common DOT installation paths
        const commonPaths = [
            '/usr/bin/dot',
            '/usr/local/bin/dot',
            '/opt/homebrew/bin/dot',
            'C:\\Program Files\\Graphviz\\bin\\dot.exe',
            'C:\\Program Files (x86)\\Graphviz\\bin\\dot.exe'
        ];
        
        for (const dotPath of commonPaths) {
            if (fs.existsSync(dotPath)) {
                return dotPath;
            }
        }
        
        return null;
    }

    private validateJavaInstallation(): { isValid: boolean; errorMessage?: string; javaVersion?: string } {
        try {
            const result = childProcess.spawnSync(config.java, ['-version'], { 
                encoding: 'utf8',
                timeout: 5000 // 5 second timeout
            });
            
            if (result.error) {
                const error = result.error as any; // SpawnSyncError has code property
                if (error.code === 'ENOENT') {
                    return {
                        isValid: false,
                        errorMessage: `Java executable not found at '${config.java}'. Please install Java 8 or higher and ensure it's in your PATH, or configure the correct path in PlantUML settings.`
                    };
                } else if (error.code === 'ETIMEDOUT') {
                    return {
                        isValid: false,
                        errorMessage: 'Java executable timed out during version check. Please check your Java installation.'
                    };
                } else {
                    return {
                        isValid: false,
                        errorMessage: `Failed to execute Java: ${error.message}. Please check your Java installation and PATH configuration.`
                    };
                }
            }
            
            // Parse Java version from stderr (Java outputs version info to stderr)
            const versionOutput = result.stderr || result.stdout || '';
            const versionMatch = versionOutput.match(/version "([^"]+)"/i) || versionOutput.match(/openjdk ([\d\.]+)/);
            
            if (versionMatch) {
                const javaVersion = versionMatch[1];
                const majorVersion = this.extractMajorJavaVersion(javaVersion);
                
                if (majorVersion < 8) {
                    return {
                        isValid: false,
                        errorMessage: `Java ${javaVersion} detected, but PlantUML requires Java 8 or higher. Please upgrade your Java installation.`,
                        javaVersion
                    };
                }
                
                console.log(`Java ${javaVersion} detected and validated for PlantUML rendering.`);
                return {
                    isValid: true,
                    javaVersion
                };
            } else {
                return {
                    isValid: false,
                    errorMessage: 'Could not determine Java version. Please ensure you have Java 8 or higher installed.'
                };
            }
            
        } catch (error) {
            return {
                isValid: false,
                errorMessage: `Java validation failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your Java installation.`
            };
        }
    }

    private extractMajorJavaVersion(versionString: string): number {
        // Handle different Java version formats:
        // Java 8: "1.8.0_XXX" -> 8
        // Java 9+: "11.0.X", "17.0.X" -> 11, 17
        const parts = versionString.split('.');
        if (parts.length >= 2 && parts[0] === '1') {
            // Java 8 format: 1.8.x
            return parseInt(parts[1], 10);
        } else {
            // Java 9+ format: 11.x, 17.x
            return parseInt(parts[0], 10);
        }
    }
}

let localRender: LocalRender;

// --- VSCode extension activation ---

export function activate(context: vscode.ExtensionContext, plantumlJarPathFromMain?: string) {
    extensionRoot = context.extensionPath;
    extensionContext = context;
    resolvedPlantumlJarPath = plantumlJarPathFromMain;
    localRender = new LocalRender(() => config.jar());


}

export function deactivate() {}

function getWebviewContent(plantUMLText: string): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PlantUML Preview</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                height: 100vh;
                background-color: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
                overflow: hidden;
            }
            
            .editor-section {
                flex: 0 0 auto;
                padding: 16px;
                border-bottom: 1px solid var(--vscode-panel-border);
                background-color: var(--vscode-panel-background);
            }
            
            #plantumlText {
                width: 100%;
                height: 120px;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                font-size: 13px;
                background-color: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border: 1px solid var(--vscode-input-border);
                border-radius: 4px;
                padding: 8px;
                resize: vertical;
                outline: none;
            }
            
            #renderButton {
                margin-top: 12px;
                padding: 8px 16px;
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                transition: background-color 0.2s;
            }
            
            #renderButton:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            
            .preview-container {
                flex: 1;
                position: relative;
                overflow: hidden;
                background-color: var(--vscode-editor-background);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            #preview {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                overflow: hidden;
            }
            
            #preview svg {
                max-width: 100%;
                max-height: 100%;
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                transform-origin: center center;
            }
            
            /* Enterprise-Grade Zoom Controls */
            .zoom-controls {
                position: absolute !important;
                bottom: 24px !important;
                right: 24px !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 8px !important;
                z-index: 1000 !important;
                pointer-events: auto !important;
                user-select: none !important;
                background: transparent !important;
                animation: zoomControlsAppear 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
            }
            
            @keyframes zoomControlsAppear {
                from {
                    opacity: 0;
                    transform: translateY(20px) scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            
            .zoom-btn {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.8)) !important;
                border: 1px solid rgba(0, 122, 204, 0.2) !important;
                border-radius: 10px !important;
                padding: 0 !important;
                cursor: pointer !important;
                color: #007acc !important;
                box-shadow: 
                    0 2px 8px rgba(0, 122, 204, 0.08),
                    0 1px 4px rgba(0, 0, 0, 0.04),
                    inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                width: 40px !important;
                height: 40px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                backdrop-filter: blur(12px) !important;
                outline: none !important;
                font-size: 0 !important;
            }
            
            .zoom-btn svg {
                width: 16px !important;
                height: 16px !important;
                transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
            }
            
            .zoom-btn:hover {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.95)) !important;
                border-color: rgba(0, 122, 204, 0.4) !important;
                color: #005fa3 !important;
                transform: translateY(-2px) !important;
                box-shadow: 
                    0 6px 20px rgba(0, 122, 204, 0.15),
                    0 3px 10px rgba(0, 0, 0, 0.08),
                    inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
            }
            
            .zoom-btn:hover svg {
                transform: scale(1.15) !important;
            }
            
            .zoom-btn:active {
                transform: translateY(-1px) !important;
                box-shadow: 
                    0 3px 12px rgba(0, 122, 204, 0.12),
                    0 2px 6px rgba(0, 0, 0, 0.06) !important;
            }
            
            .zoom-btn:active svg {
                transform: scale(0.9) !important;
            }
            
            .zoom-btn:disabled {
                opacity: 0.5 !important;
                cursor: not-allowed !important;
                transform: none !important;
            }
        </style>
    </head>
    <body>
        <div class="editor-section">
            <textarea id="plantumlText" placeholder="Enter your PlantUML code here...">${plantUMLText}</textarea>
            <button id="renderButton">Render Diagram</button>
        </div>
        
        <div class="preview-container">
            <div id="preview"></div>
            
            <!-- Zoom Controls -->
            <div class="zoom-controls">
                <button class="zoom-btn zoom-in" id="zoomInBtn" title="Zoom In (Ctrl + +)" aria-label="Zoom In">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        <line x1="11" y1="8" x2="11" y2="14"/>
                        <line x1="8" y1="11" x2="14" y2="11"/>
                    </svg>
                </button>
                <button class="zoom-btn zoom-out" id="zoomOutBtn" title="Zoom Out (Ctrl + -)" aria-label="Zoom Out">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        <line x1="8" y1="11" x2="14" y2="11"/>
                    </svg>
                </button>
                <button class="zoom-btn zoom-reset" id="zoomResetBtn" title="Reset Zoom (Ctrl + 0)" aria-label="Reset Zoom">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                    </svg>
                </button>
            </div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            let currentZoom = 1.0;
            const minZoom = 0.1;
            const maxZoom = 5.0;
            const zoomStep = 0.2;
            
            // Get DOM elements
            const renderButton = document.getElementById('renderButton');
            const plantumlTextArea = document.getElementById('plantumlText');
            const previewDiv = document.getElementById('preview');
            const zoomInBtn = document.getElementById('zoomInBtn');
            const zoomOutBtn = document.getElementById('zoomOutBtn');
            const zoomResetBtn = document.getElementById('zoomResetBtn');
            
            // Render button functionality
            renderButton.addEventListener('click', () => {
                const plantumlText = plantumlTextArea.value;
                vscode.postMessage({ command: 'render', plantumlText: plantumlText });
            });
            
            // Zoom functionality
            function updateZoomButtons() {
                zoomInBtn.disabled = currentZoom >= maxZoom;
                zoomOutBtn.disabled = currentZoom <= minZoom;
                zoomResetBtn.disabled = Math.abs(currentZoom - 1.0) < 0.01;
            }
            
            function applyZoom(newZoom) {
                currentZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
                const svgElement = previewDiv.querySelector('svg');
                if (svgElement) {
                    svgElement.style.transform = \`scale(\${currentZoom})\`;
                }
                updateZoomButtons();
            }
            
            // Zoom controls event listeners
            zoomInBtn.addEventListener('click', () => {
                applyZoom(currentZoom + zoomStep);
            });
            
            zoomOutBtn.addEventListener('click', () => {
                applyZoom(currentZoom - zoomStep);
            });
            
            zoomResetBtn.addEventListener('click', () => {
                applyZoom(1.0);
            });
            
            // Keyboard shortcuts
            document.addEventListener('keydown', (event) => {
                if (event.ctrlKey || event.metaKey) {
                    switch(event.key) {
                        case '+':
                        case '=':
                            event.preventDefault();
                            if (!zoomInBtn.disabled) zoomInBtn.click();
                            break;
                        case '-':
                            event.preventDefault();
                            if (!zoomOutBtn.disabled) zoomOutBtn.click();
                            break;
                        case '0':
                            event.preventDefault();
                            if (!zoomResetBtn.disabled) zoomResetBtn.click();
                            break;
                    }
                }
            });
            
            // Mouse wheel zoom
            previewDiv.addEventListener('wheel', (event) => {
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
                    applyZoom(currentZoom * zoomFactor);
                }
            });
            
            // Handle messages from extension
            window.addEventListener('message', event => {
                const message = event.data;
                if (message.command === 'updatePreview') {
                    previewDiv.innerHTML = \`<svg>\${message.svgContent}</svg>\`;
                    // Reset zoom when new content is loaded
                    currentZoom = 1.0;
                    updateZoomButtons();
                }
            });
            
            // Initialize zoom buttons
            updateZoomButtons();
        </script>
    </body>
    </html>
    `;
}

export { localRender };

// Configuration validation helper
function validatePlantUMLConfig(): string | null {
    const workspaceConfig = vscode.workspace.getConfiguration('plantuml');
     const layoutEngine = workspaceConfig.get<string>('layoutEngine', 'dot');
     const dotPath = workspaceConfig.get<string>('dotPath');
    
    console.log(`PlantUML Configuration - Layout Engine: ${layoutEngine}, DOT Path: ${dotPath || 'auto-detect'}`);
    
    if (layoutEngine === 'smetana') {
        console.log('✅ Using Smetana layout engine - no external dependencies required');
        return null; // No validation needed for Smetana
    }
    
    if (layoutEngine === 'dot') {
        if (dotPath && !fs.existsSync(dotPath)) {
            return `DOT executable not found at specified path: ${dotPath}`;
        }
        console.log('✅ Using DOT layout engine');
        return null;
    }
    
    return `Unknown layout engine: ${layoutEngine}`;
}
