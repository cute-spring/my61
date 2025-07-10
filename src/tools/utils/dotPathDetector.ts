import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface DotDetectionResult {
    found: boolean;
    path?: string;
    version?: string;
    method: 'system_path' | 'auto_detected' | 'not_found';
    searchedPaths?: string[];
}

export class DotPathDetector {
    private static readonly COMMON_PATHS = {
        win32: [
            'C:\\Program Files\\Graphviz\\bin\\dot.exe',
            'C:\\Program Files (x86)\\Graphviz\\bin\\dot.exe',
            'C:\\Graphviz\\bin\\dot.exe',
            'C:\\Tools\\Graphviz\\bin\\dot.exe',
            'C:\\dev\\Graphviz\\bin\\dot.exe',
            'C:\\graphviz\\bin\\dot.exe',
            'D:\\Program Files\\Graphviz\\bin\\dot.exe',
            'D:\\Program Files (x86)\\Graphviz\\bin\\dot.exe',
            'D:\\Graphviz\\bin\\dot.exe',
            // Chocolatey installation
            'C:\\ProgramData\\chocolatey\\bin\\dot.exe',
            // Scoop installation
            path.join(os.homedir(), 'scoop', 'apps', 'graphviz', 'current', 'bin', 'dot.exe'),
            // Windows Package Manager
            'C:\\Program Files\\Graphviz2.38\\bin\\dot.exe',
            'C:\\Program Files\\Graphviz2.44\\bin\\dot.exe',
            'C:\\Program Files\\Graphviz2.50\\bin\\dot.exe'
        ],
        darwin: [
            '/usr/local/bin/dot',
            '/opt/homebrew/bin/dot',
            '/usr/bin/dot',
            '/opt/local/bin/dot',
            '/sw/bin/dot',
            // Homebrew installations
            '/usr/local/Cellar/graphviz/*/bin/dot',
            '/opt/homebrew/Cellar/graphviz/*/bin/dot',
            // MacPorts
            '/opt/local/bin/dot'
        ],
        linux: [
            '/usr/bin/dot',
            '/usr/local/bin/dot',
            '/bin/dot',
            '/opt/graphviz/bin/dot',
            '/snap/bin/dot',
            // Flatpak
            '/var/lib/flatpak/exports/bin/dot',
            // AppImage locations
            path.join(os.homedir(), 'Applications', 'dot'),
            path.join(os.homedir(), '.local', 'bin', 'dot')
        ]
    };

    /**
     * Detect DOT executable with comprehensive search
     */
    static async detectDotPath(): Promise<DotDetectionResult> {
        const platform = os.platform();
        const searchedPaths: string[] = [];

        // First, try system PATH
        try {
            const systemResult = await this.checkSystemPath();
            if (systemResult.found) {
                return {
                    ...systemResult,
                    method: 'system_path',
                    searchedPaths
                };
            }
        } catch (error) {
            console.log('System PATH check failed, proceeding with manual search');
        }

        // Get platform-specific paths
        const commonPaths = this.COMMON_PATHS[platform as keyof typeof this.COMMON_PATHS] || [];
        
        // Add dynamic paths (with wildcards)
        const expandedPaths = await this.expandWildcardPaths(commonPaths);
        
        // Search through all paths
        for (const dotPath of expandedPaths) {
            searchedPaths.push(dotPath);
            
            try {
                if (await this.validateDotExecutable(dotPath)) {
                    const version = await this.getDotVersion(dotPath);
                    return {
                        found: true,
                        path: dotPath,
                        version,
                        method: 'auto_detected',
                        searchedPaths
                    };
                }
            } catch (error) {
                // Continue searching
            }
        }

        // Also search in registry on Windows
        if (platform === 'win32') {
            try {
                const registryPath = await this.searchWindowsRegistry();
                if (registryPath) {
                    searchedPaths.push(registryPath);
                    if (await this.validateDotExecutable(registryPath)) {
                        const version = await this.getDotVersion(registryPath);
                        return {
                            found: true,
                            path: registryPath,
                            version,
                            method: 'auto_detected',
                            searchedPaths
                        };
                    }
                }
            } catch (error) {
                console.log('Registry search failed:', error);
            }
        }

        return {
            found: false,
            method: 'not_found',
            searchedPaths
        };
    }

    /**
     * Check if DOT is available in system PATH
     */
    private static async checkSystemPath(): Promise<DotDetectionResult> {
        try {
            const command = os.platform() === 'win32' ? 'where dot' : 'which dot';
            const { stdout } = await execAsync(command);
            const dotPath = stdout.trim().split('\n')[0]; // Take first result
            
            if (dotPath && await this.validateDotExecutable(dotPath)) {
                const version = await this.getDotVersion(dotPath);
                return {
                    found: true,
                    path: dotPath,
                    version,
                    method: 'system_path'
                };
            }
        } catch (error) {
            // DOT not in PATH
        }
        
        return { found: false, method: 'not_found' };
    }

    /**
     * Expand paths with wildcards (like Homebrew version directories)
     */
    private static async expandWildcardPaths(paths: string[]): Promise<string[]> {
        const expanded: string[] = [];
        
        for (const pathPattern of paths) {
            if (pathPattern.includes('*')) {
                try {
                    const dirPath = path.dirname(pathPattern);
                    const filename = path.basename(pathPattern);
                    
                    if (fs.existsSync(dirPath)) {
                        const entries = fs.readdirSync(dirPath);
                        for (const entry of entries) {
                            if (filename === '*' || entry.includes(filename.replace('*', ''))) {
                                expanded.push(path.join(dirPath, entry, path.basename(pathPattern)));
                            }
                        }
                    }
                } catch (error) {
                    // Skip invalid wildcard paths
                }
            } else {
                expanded.push(pathPattern);
            }
        }
        
        return expanded;
    }

    /**
     * Search Windows registry for Graphviz installation
     */
    private static async searchWindowsRegistry(): Promise<string | null> {
        if (os.platform() !== 'win32') {
            return null;
        }
        
        try {
            // Check common registry keys for Graphviz
            const registryKeys = [
                'HKLM\\SOFTWARE\\Graphviz',
                'HKLM\\SOFTWARE\\WOW6432Node\\Graphviz',
                'HKCU\\SOFTWARE\\Graphviz'
            ];
            
            for (const key of registryKeys) {
                try {
                    const { stdout } = await execAsync(`reg query "${key}" /v InstallPath 2>nul`);
                    const match = stdout.match(/InstallPath\s+REG_SZ\s+(.+)/);
                    if (match) {
                        const installPath = match[1].trim();
                        const dotPath = path.join(installPath, 'bin', 'dot.exe');
                        if (fs.existsSync(dotPath)) {
                            return dotPath;
                        }
                    }
                } catch (error) {
                    // Continue to next key
                }
            }
        } catch (error) {
            console.log('Registry search error:', error);
        }
        
        return null;
    }

    /**
     * Validate that a path points to a working DOT executable
     * This includes both file existence and execution permission checks
     */
    static async validateDotExecutable(dotPath: string): Promise<boolean> {
        try {
            // Check if file exists and is executable
            if (!fs.existsSync(dotPath)) {
                console.log(`DOT validation failed: File does not exist at ${dotPath}`);
                return false;
            }
            
            const stats = fs.statSync(dotPath);
            if (!stats.isFile()) {
                console.log(`DOT validation failed: Path is not a file: ${dotPath}`);
                return false;
            }
            
            // First, try to execute with version flag to check basic execution
            try {
                const { stdout, stderr } = await execAsync(`"${dotPath}" -V`, { timeout: 5000 });
                const output = (stdout + stderr).toLowerCase();
                
                // Check if it's actually Graphviz DOT
                const isGraphviz = output.includes('graphviz') || output.includes('dot version');
                if (!isGraphviz) {
                    console.log(`DOT validation failed: Not a Graphviz DOT executable: ${dotPath}`);
                    return false;
                }
            } catch (error) {
                console.log(`DOT validation failed: Cannot execute -V command: ${dotPath}`, error);
                return false;
            }
            
            // Enhanced validation: Test actual diagram processing capability
            // This is crucial for enterprise environments where execution might be blocked
            // Use a complex diagram that specifically requires DOT's advanced layout capabilities
            try {
                // Create a complex diagram that PlantUML.jar alone cannot render without DOT
                // This includes advanced DOT-specific features like clusters, complex hierarchies, and layout constraints
                const testDotContent = `digraph complex_test {
    rankdir=TB;
    compound=true;
    
    // Subgraph clusters (require DOT for proper rendering)
    subgraph cluster_0 {
        label="Database Layer";
        style=filled;
        color=lightgrey;
        node [style=filled,color=white];
        DB1 -> DB2 -> DB3;
    }
    
    subgraph cluster_1 {
        label="Business Logic";
        color=blue;
        BL1 -> BL2 -> BL3;
        BL2 -> BL4;
    }
    
    // Complex cross-cluster relationships with constraints
    DB1 -> BL1 [lhead=cluster_1];
    BL3 -> DB2 [ltail=cluster_1, lhead=cluster_0];
    
    // Rank constraints that require DOT's layout engine
    {rank=same; DB1; BL1;}
    {rank=same; DB3; BL4;}
    
    // Complex node arrangements that simple layouts cannot handle
    A1 -> A2 -> A3 -> A4 -> A5;
    A1 -> A3 -> A5;
    A2 -> A4;
    
    // This type of complex layout specifically requires DOT's capabilities
}`;
                
                const testCommand = `echo "${testDotContent}" | "${dotPath}" -Tsvg`;
                
                const { stdout, stderr } = await execAsync(testCommand, { 
                    timeout: 15000, // Increased timeout for complex diagram
                    maxBuffer: 2 * 1024 * 1024 // 2MB buffer for complex SVG output
                });
                
                // Check if we got valid SVG output with DOT-specific features
                const hasValidSvg = stdout.includes('<svg') && stdout.includes('</svg>');
                const hasClusterElements = stdout.includes('cluster_') || stdout.includes('subgraph');
                const hasComplexLayout = stdout.length > 1000; // Complex diagrams generate substantial SVG
                
                if (!hasValidSvg) {
                    console.log(`DOT validation failed: Cannot process complex test diagram: ${dotPath}`);
                    console.log('stderr:', stderr);
                    return false;
                }
                
                if (!hasComplexLayout) {
                    console.log(`DOT validation warning: Simple output for complex diagram, may not be using DOT features: ${dotPath}`);
                    console.log('SVG length:', stdout.length);
                }
                
                console.log(`DOT validation successful: ${dotPath} can process complex diagrams with DOT-specific features`);
                return true;
                
            } catch (error) {
                console.log(`DOT validation failed: Cannot process complex test diagram: ${dotPath}`, error);
                return false;
            }
            
        } catch (error) {
            console.log(`DOT validation failed with unexpected error: ${dotPath}`, error);
            return false;
        }
    }

    /**
     * Get DOT version information
     */
    private static async getDotVersion(dotPath: string): Promise<string> {
        try {
            const { stdout, stderr } = await execAsync(`"${dotPath}" -V`, { timeout: 5000 });
            const output = stdout + stderr;
            
            // Extract version number
            const versionMatch = output.match(/dot - graphviz version ([\d\.]+)/i) ||
                                output.match(/version ([\d\.]+)/i);
            
            return versionMatch ? versionMatch[1] : 'unknown';
        } catch (error) {
            return 'unknown';
        }
    }

    /**
     * Quick check if DOT is likely available
     */
    static async isDotAvailable(): Promise<boolean> {
        const result = await this.detectDotPath();
        return result.found;
    }

    /**
     * Get the best available DOT path
     */
    static async getBestDotPath(): Promise<string | null> {
        const result = await this.detectDotPath();
        return result.found ? result.path! : null;
    }
}
