import * as vscode from "vscode";
import * as fs from "fs";
import * as childProcess from "child_process";
import * as path from "path";
import * as os from "os";

// --- Inlined config, common, tools ---

let extensionRoot: string | undefined;

const config = {
    java: "java",
    jar: (parentUri: vscode.Uri) => {
        // Use extensionRoot if available, fallback to __dirname
        const base = extensionRoot || __dirname;
        return path.join(base, "plantuml-mit-1.2025.3.jar");
    },
    includepaths: (_parentUri: vscode.Uri) => [],
    diagramsRoot: (_parentUri: vscode.Uri) => null,
    commandArgs: (_parentUri: vscode.Uri) => [],
    jarArgs: (_parentUri: vscode.Uri) => [],
};

function localize(_id: number, _defaultValue: any, ...args: any[]): string {
    // Simple fallback
    return "PlantUML rendering error";
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
        process.on("error", reject);
        process.on("close", (code) => {
            if (code === 0) {
                const out = Buffer.concat(stdout);
                if (savePath) { fs.writeFileSync(savePath, out); }
                resolve(out);
            } else {
                reject({ error: Buffer.concat(stderr).toString() });
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
        const jarPath = config.jar(diagram.parentUri);
        let javaExists = true;
        try {
            childProcess.spawnSync(config.java, ['-version']);
        } catch (e) {
            javaExists = false;
        }
        if (!javaExists) {
            return { processes: [], promise: Promise.reject(new Error('Java executable not found in PATH.')) };
        }
        if (!fs.existsSync(jarPath)) {
            return { processes: [], promise: Promise.reject(new Error(`PlantUML JAR not found at: ${jarPath}`)) };
        }

        let processes: childProcess.ChildProcess[] = [];
        let buffers: Buffer[] = [];
        let cancelled = false;

        let pms = [...Array(diagram.pageCount).keys()].reduce<Promise<void>>((pChain, index) => {
            return pChain.then(() => {
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

                let diagramsRoot = config.diagramsRoot(diagram.parentUri) as vscode.Uri | null;
                if (diagramsRoot) {
                    includePath += path.delimiter + diagramsRoot.fsPath;
                }

                params.unshift('-Dplantuml.include.path=' + includePath);
                params.unshift(...config.commandArgs(diagram.parentUri));
                params.push(...config.jarArgs(diagram.parentUri));

                let proc = childProcess.spawn(config.java, params);
                processes.push(proc);

                if (proc.killed) {
                    cancelled = true;
                    return Promise.resolve();
                }

                proc.stdin.write(diagram.content);
                proc.stdin.end();

                let savePath2 = savePath ? addFileIndex(savePath, index, diagram.pageCount) : "";
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
}

const localRender = new LocalRender();

// --- VSCode extension activation ---

export function activate(context: vscode.ExtensionContext) {
    extensionRoot = context.extensionPath;

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
