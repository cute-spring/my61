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
        if (process.stdout) {
            process.stdout.on("data", (data: Buffer) => stdout.push(data));
        }
        if (process.stderr) {
            process.stderr.on("data", (data: Buffer) => stderr.push(data));
        }
        process.on("error", (err) => {
            console.error('PlantUML process error:', err);
            reject(err);
        });
        process.on("close", (code) => {
            const stderrOutput = Buffer.concat(stderr).toString();
            if (code === 0) {
                const out = Buffer.concat(stdout);
                if (savePath) { fs.writeFileSync(savePath, out); }
                
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
    constructor(private getJarPath: () => string) {}
    limitConcurrency(): boolean {
        return true;
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

                let proc = childProcess.spawn(config.java, params);
                processes.push(proc);

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

    let disposable = vscode.commands.registerCommand('extension.previewAntUML', async () => {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active editor.");
            return;
        }

        let document = editor.document;
        let plantUMLText = document.getText();
        let diagram = {
            parentUri: document.uri,
            dir: path.dirname(document.uri.fsPath),
            pageCount: 1,
            content: plantUMLText,
            path: document.uri.fsPath,
            name: path.basename(document.uri.fsPath)
        };

        const panel = vscode.window.createWebviewPanel(
            'plantUMLPreview',
            'PlantUML Preview',
            vscode.ViewColumn.Two,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        panel.webview.html = getWebviewContent(plantUMLText);

        panel.webview.onDidReceiveMessage(async message => {
            if (message.command === 'render') {
                let format = "svg";
                let tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plantuml-'));
                let savePath = path.join(tempDir, "preview.svg");

                try {
                    // Use the text from the webview if provided
                    if (message.plantumlText) {
                        diagram.content = message.plantumlText;
                    }
                    let task = localRender.render(diagram, format, savePath);
                    let buffers = await task.promise;

                    if (buffers && buffers.length > 0) {
                        let svgContent = buffers[0].toString('utf-8');
                        panel.webview.postMessage({ command: 'updatePreview', svgContent: svgContent });
                    }
                } catch (err: any) {
                    let errorMsg = err && err.stack ? err.stack : (err && err.message ? err.message : JSON.stringify(err));
                    vscode.window.showErrorMessage(`Failed to render PlantUML diagram: ${errorMsg}`);
                }
            }
        }, undefined, context.subscriptions);
    });

    context.subscriptions.push(disposable);
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
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
            }
            #preview {
                margin-top: 20px;
                border: 1px solid #ccc;
                padding: 10px;
                background-color: #f9f9f9;
            }
        </style>
    </head>
    <body>
        <textarea id="plantumlText" rows="10" cols="50" style="width: 100%; height: 200px; margin-top: 20px;">${plantUMLText}</textarea>
        <button id="renderButton" style="margin-top: 10px;">Render Diagram</button>
        <div id="preview"></div>

        <script>
            const vscode = acquireVsCodeApi();

            document.getElementById('renderButton').addEventListener('click', () => {
                const plantumlText = document.getElementById('plantumlText').value;
                vscode.postMessage({ command: 'render', plantumlText: plantumlText });
            });

            window.addEventListener('message', event => {
                const message = event.data;
                if (message.command === 'updatePreview') {
                    document.getElementById('preview').innerHTML = \`<svg>\${message.svgContent}</svg>\`;
                }
            });
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
