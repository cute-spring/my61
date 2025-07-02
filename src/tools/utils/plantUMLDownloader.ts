/**
 * PlantUML JAR Download Utility
 * Handles automatic downloading of PlantUML JAR when not found locally
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

export class PlantUMLDownloader {
    private static readonly PLANTUML_DOWNLOAD_URL = 'https://github.com/plantuml/plantuml/releases/latest/download/plantuml.jar';
    private static readonly PLANTUML_JAR_NAME = 'plantuml.jar';

    /**
     * Download PlantUML JAR if not exists, with progress reporting
     */
    static async ensurePlantUMLExists(jarPath: string): Promise<boolean> {
        if (fs.existsSync(jarPath)) {
            return true;
        }

        const downloadDir = path.dirname(jarPath);
        
        // Ensure download directory exists
        if (!fs.existsSync(downloadDir)) {
            try {
                fs.mkdirSync(downloadDir, { recursive: true });
            } catch (error) {
                console.error('Failed to create download directory:', error);
                return false;
            }
        }

        try {
            await this.downloadWithProgress(jarPath);
            return fs.existsSync(jarPath);
        } catch (error) {
            console.error('Failed to download PlantUML JAR:', error);
            return false;
        }
    }

    /**
     * Download PlantUML JAR with progress indication
     */
    private static async downloadWithProgress(jarPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const tempPath = jarPath + '.tmp';
            const file = fs.createWriteStream(tempPath);
            
            // Show progress notification
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Downloading PlantUML JAR",
                cancellable: false
            }, async (progress) => {
                return new Promise<void>((progressResolve, progressReject) => {
                    const request = https.get(this.PLANTUML_DOWNLOAD_URL, (response) => {
                        if (response.statusCode !== 200) {
                            progressReject(new Error(`Download failed with status ${response.statusCode}`));
                            return;
                        }

                        const totalSize = parseInt(response.headers['content-length'] || '0', 10);
                        let downloadedSize = 0;

                        response.on('data', (chunk) => {
                            downloadedSize += chunk.length;
                            if (totalSize > 0) {
                                const percentage = Math.round((downloadedSize / totalSize) * 100);
                                progress.report({ 
                                    increment: chunk.length / totalSize * 100,
                                    message: `${percentage}% (${this.formatBytes(downloadedSize)}/${this.formatBytes(totalSize)})`
                                });
                            } else {
                                progress.report({ 
                                    message: `Downloaded ${this.formatBytes(downloadedSize)}`
                                });
                            }
                        });

                        response.pipe(file);

                        response.on('end', () => {
                            file.close((err) => {
                                if (err) {
                                    progressReject(err);
                                } else {
                                    // Move temp file to final location
                                    try {
                                        fs.renameSync(tempPath, jarPath);
                                        progressResolve();
                                        resolve();
                                    } catch (renameErr) {
                                        progressReject(renameErr);
                                        reject(renameErr);
                                    }
                                }
                            });
                        });
                    });

                    request.on('error', (err) => {
                        fs.unlink(tempPath, () => {});
                        progressReject(err);
                        reject(err);
                    });

                    request.setTimeout(30000, () => {
                        request.destroy();
                        fs.unlink(tempPath, () => {});
                        const timeoutError = new Error('Download timeout');
                        progressReject(timeoutError);
                        reject(timeoutError);
                    });
                });
            });
        });
    }

    /**
     * Format bytes for human-readable display
     */
    private static formatBytes(bytes: number): string {
        if (bytes === 0) {
            return '0 Bytes';
        }
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get the extension's storage path for PlantUML JAR
     */
    static getDefaultJarPath(context: vscode.ExtensionContext): string {
        return path.join(context.globalStorageUri.fsPath, this.PLANTUML_JAR_NAME);
    }
}
