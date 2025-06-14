import * as vscode from "vscode";
import * as fs from "fs";
import * as childProcess from "child_process";
import * as path from "path";
import * as os from "os";

// --- Inlined config, common, tools ---

const findPlantUMLJar = () => {
    // Try dist, out, and src/tools
    const candidates = [
        path.join(__dirname, '..', '..', 'plantuml.jar'), // dist/ or out/
        path.join(__dirname, '..', 'tools', 'plantuml.jar'), // src/tools/ if running from src
        path.join(__dirname, 'plantuml.jar'),
        path.join(__dirname, '..', '..', 'src', 'tools', 'plantuml.jar'), // fallback for dev
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return null;
};

const config = {
    java: "java",
    jar: (_parentUri: vscode.Uri) => {
        const jarPath = findPlantUMLJar();
        if (!jarPath) { throw new Error('PlantUML JAR not found'); }
        return jarPath;
    },
    includepaths: (_parentUri: vscode.Uri) => [],
    diagramsRoot: (_parentUri: vscode.Uri) => null,
    commandArgs: (_parentUri: vscode.Uri) => [],
    jarArgs: (_parentUri: vscode.Uri) => [],
};

function localize(_id: number, defaultValue: any, ...args: any[]): string {
    // Show the actual error if provided
    if (args && args.length > 0 && args[0]) {
        return String(args[0]);
    }
    return defaultValue || "PlantUML rendering error";
}

function addFileIndex(filePath: string, index: number, pageCount: number): string {
    if (pageCount <= 1) { return filePath; }
    const ext = path.extname(filePath);
    const base = filePath.slice(0, -ext.length);
    return `${base}_${index + 1}${ext}`;
}

// --- Inlined processWrapper ---

function processWrapper(process: childProcess.ChildProcess, savePath: string): Promise<Buffer> {
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
            reject({ error: `Process error: ${err && err.message ? err.message : err}` });
        });
        process.on("close", (code) => {
            if (code === 0) {
                const out = Buffer.concat(stdout);
                if (savePath) { fs.writeFileSync(savePath, out); }
                resolve(out);
            } else {
                const errorMsg = Buffer.concat(stderr).toString() || `PlantUML process exited with code ${code}`;
                reject({ error: errorMsg });
            }
        });
    });
}

// --- Main LocalRender class ---

class LocalRender {
    limitConcurrency(): boolean {
        return true;
    }

    formats(): string[] {
        return ["png", "svg", "eps", "pdf", "vdx", "xmi", "scxml", "html", "txt", "utxt", "latex", "latex:nopreamble"];
    }

    render(diagram: any, format: string, savePath: string): { processes: childProcess.ChildProcess[], promise: Promise<Buffer[]> } {
        return this.createTask(diagram, "-pipe", savePath, format);
    }

    getMapData(diagram: any, savePath: string): { processes: childProcess.ChildProcess[], promise: Promise<Buffer[]> } {
        return this.createTask(diagram, "-pipemap", savePath);
    }

    private createTask(diagram: any, taskType: string, savePath: string, format?: string): { processes: childProcess.ChildProcess[], promise: Promise<Buffer[]> } {
        if (!config.java || !fs.existsSync(config.jar(diagram.parentUri))) {
            return { processes: [], promise: Promise.reject(new Error('PlantUML JAR not found or Java not configured')) };
        }

        let processes: childProcess.ChildProcess[] = [];
        let buffers: Buffer[] = [];

        // Use for...of with async/await to handle promises sequentially
        const runTasks = async () => {
            for (let index = 0; index < diagram.pageCount; index++) {
                let params = [
                    '-Djava.awt.headless=true',
                    '-jar',
                    config.jar(diagram.parentUri),
                    "-pipeimageindex",
                    `${index}`,
                    '-charset',
                    'utf-8',
                    taskType
                ];

                if (format) { params.push("-t" + format); }
                if (diagram.path) { params.push("-filename", path.basename(diagram.path)); }

                let includePath = diagram.dir;
                let ws = vscode.workspace.getWorkspaceFolder(diagram.parentUri);
                let folderPaths = config.includepaths(diagram.parentUri);
                for (let folderPath of folderPaths) {
                    if (!folderPath) { continue; }
                    includePath += path.delimiter + (path.isAbsolute(folderPath) ? folderPath : path.join(ws?.uri.fsPath ?? "", folderPath));
                }

                let diagramsRoot = config.diagramsRoot(diagram.parentUri);
                if (diagramsRoot && (diagramsRoot as vscode.Uri).fsPath) {
                    includePath += path.delimiter + (diagramsRoot as vscode.Uri).fsPath;
                }

                params.unshift('-Dplantuml.include.path=' + includePath);
                params.unshift(...config.commandArgs(diagram.parentUri));
                params.push(...config.jarArgs(diagram.parentUri));

                let proc = childProcess.spawn(config.java, params);
                processes.push(proc);

                if (proc.killed) {
                    buffers = [];
                    return;
                }

                proc.stdin.write(diagram.content);
                proc.stdin.end();

                let savePath2 = savePath ? addFileIndex(savePath, index, diagram.pageCount) : "";
                try {
                    let stdout = await processWrapper(proc, savePath2);
                    buffers.push(stdout);
                } catch (err: any) {
                    // Pass through the actual error message
                    throw new Error(err && err.error ? err.error : JSON.stringify(err));
                }
            }
        };

        return {
            processes: processes,
            promise: (async () => {
                try {
                    await runTasks();
                    return buffers;
                } catch (err) {
                    throw err;
                }
            })()
        };
    }
}

export const localRender = new LocalRender();

// --- VSCode extension activation ---

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('copilotTools.previewAntUML', async () => {
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

        panel.webview.html = getWebviewContent(plantUMLText, panel);

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
                    vscode.window.showErrorMessage(`Failed to render PlantUML diagram: ${err.message}`);
                }
            }
        }, undefined, context.subscriptions);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}

function getWebviewContent(plantUMLText: string, panel?: vscode.WebviewPanel): string {
    // Get URIs for JS and CSS
    let jsUri = panel ? panel.webview.asWebviewUri(vscode.Uri.file(path.join(__dirname, 'ui/js/plantumlPreview.js'))) : '';
    let cssUri = panel ? panel.webview.asWebviewUri(vscode.Uri.file(path.join(__dirname, 'ui/css/plantumlPreview.css'))) : '';
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PlantUML Preview</title>
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; script-src 'self' vscode-resource:; style-src 'self' vscode-resource:;">
        <link rel="stylesheet" href="${cssUri}">
    </head>
    <body>
        <textarea id="plantumlText" rows="10" cols="50" style="width: 100%; height: 200px; margin-top: 20px;">${plantUMLText}</textarea>
        <button id="renderButton" style="margin-top: 10px;">Render Diagram</button>
        <div id="preview"></div>
        <script src="${jsUri}"></script>
    </body>
    </html>
    `;
}
