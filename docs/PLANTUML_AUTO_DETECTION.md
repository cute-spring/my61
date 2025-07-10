# PlantUML Auto-Detection Feature

## Overview

The VS Code extension now automatically detects and configures the best available PlantUML layout engine without requiring user intervention. This provides a seamless out-of-the-box experience while maintaining full manual control for advanced users.

## How It Works

### Automatic Configuration on Extension Activation

1. **DOT Detection First**: The system automatically searches for DOT (Graphviz) executable in common installation locations across Windows, macOS, and Linux
2. **Smart Fallback**: If DOT is not found, the system automatically configures Smetana (pure Java) as the layout engine
3. **Preserve User Settings**: If the user has already manually configured layout settings, auto-detection respects those choices and doesn't override them

### Detection Process

The auto-detection follows this comprehensive validation process to ensure DOT is not only present but actually usable:

1. **Check for existing user configuration** - if found, use those settings
2. **Search for DOT executable**:
   - Search system PATH
   - Check common installation directories
   - Validate file existence and permissions
3. **Validate DOT execution capability**:
   - Test basic execution with `-V` flag
   - Verify it's actually Graphviz DOT (not another tool named 'dot')
   - **Process a complex test diagram** with DOT-specific features (clusters, constraints, hierarchies)
   - Validate that DOT can handle advanced layout features that PlantUML.jar alone cannot render
   - Handle enterprise security restrictions gracefully
4. **Configure DOT** if found and fully functional
5. **Fallback to Smetana** if DOT is not available or cannot be executed

### Enterprise Environment Support

The auto-detection system specifically handles common enterprise restrictions:

- **Execution Policy Restrictions**: Tests complex diagram processing with DOT-specific features that require actual DOT execution
- **Security Software Blocking**: Uses advanced test diagrams that cannot be rendered by PlantUML.jar alone
- **Permission Issues**: Validates execution permissions with comprehensive diagram rendering tests
- **Network Restrictions**: Smetana works entirely offline without external dependencies
- **Complex Layout Validation**: Tests subgraphs, clusters, and layout constraints that specifically require DOT's advanced capabilities

## User Experience

### First-Time Users
- Extension automatically configures the best available option
- Shows a notification about what was configured
- Provides options to test or manually reconfigure

### Existing Users
- Existing manual configurations are preserved
- Can reset to auto-detection at any time
- Can run manual auto-detection for troubleshooting

## Available Commands

| Command | Description |
|---------|-------------|
| `Run PlantUML Auto-Detection` | Manually trigger auto-detection process |
| `Configure PlantUML (Manual Override)` | Access manual configuration options |
| `Test DOT Auto-Detection` | Test the DOT detection system for troubleshooting |

## Manual Override Options

Users can still manually configure their layout engine through:

1. **Auto-Detection Mode**: Run automatic detection
2. **Manual Configuration**: Select specific layout engine and paths
3. **Reset to Auto-Detection**: Clear manual settings and re-run auto-detection

## Benefits

### For End Users
- ✅ **Zero Configuration**: Works out of the box
- ✅ **Best Quality**: Automatically uses DOT when available for better diagrams
- ✅ **Fallback Safety**: Always works with Smetana even without external dependencies
- ✅ **Transparency**: Clear notification about what was configured

### For System Administrators
- ✅ **Predictable Behavior**: Consistent auto-configuration across machines
- ✅ **Manual Override**: Can still enforce specific configurations
- ✅ **Status Visibility**: Status bar shows actual engine in use

## Technical Implementation

### Key Functions

- `autoConfigurePlantUML()`: Main auto-configuration logic
- `runAutoDetection()`: Manual trigger for auto-detection
- `DotPathDetector.detectDotPath()`: Cross-platform DOT detection

### Configuration Settings

- `plantuml.layoutEngine`: Auto-configured to "dot" or "smetana"
- `plantuml.dotPath`: Auto-configured with detected DOT path
- Settings respect existing user values

### Status Indication

- Status bar shows actual engine in use
- Visual distinction between DOT and Smetana
- Warning indicators for configuration mismatches

## Migration from Manual Configuration

Existing users with manual configurations:
- Settings are preserved during upgrade
- Can opt into auto-detection by resetting configuration
- Can test auto-detection without affecting current settings

## Troubleshooting

If auto-detection doesn't work as expected:

1. **Run manual detection test**: `Test DOT Auto-Detection`
2. **Check detection results**: View searched paths and findings
3. **Force re-detection**: `Run PlantUML Auto-Detection`
4. **Manual override**: `Configure PlantUML (Manual Override)`

## Supported Platforms

### Windows
- Program Files installations
- Chocolatey packages
- Scoop installations  
- Windows Registry detection

### macOS
- Homebrew installations
- MacPorts packages
- Standard system directories

### Linux
- System package installations
- Snap packages
- Flatpak applications
- User-local installations

This auto-detection system ensures that PlantUML diagrams work reliably across all supported platforms while maintaining the flexibility for power users to customize their configuration.
