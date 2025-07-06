# Extension Testing and Debug Scripts

This directory contains utility scripts for testing and debugging the VS Code extension.

## 📁 Directory Structure

### `/test/` - Testing Scripts
Scripts for testing various extension features and functionality:

- **Analytics Testing**:
  - `test-analytics-system.sh` - Test analytics data collection and dashboard
  - `test-dashboard-reset.sh` - Test analytics dashboard reset functionality
  - `test-reset-functionality.sh` - Test reset features

- **PlantUML Testing**:
  - `test-plantuml-download.sh/.ps1/.bat` - Test PlantUML JAR download across platforms
  - `test-dot-autodetection.sh` - Test DOT/Graphviz auto-detection
  - `test-layout-engine-detection.sh` - Test layout engine detection
  - `test-smetana-fix.sh` - Test Smetana layout engine fixes

- **UI Testing**:
  - `test-zoom-controls.html` - Test zoom controls for UML diagrams

### `/debug/` - Debug Scripts
Scripts for debugging and development:

- `debug-analytics-data.js` - Debug analytics data storage and retrieval
- `debug-analytics-events.sh` - Debug analytics event tracking
- `debug-reset-button.sh` - Debug reset button functionality

## 🚀 Usage

### Running Test Scripts

**Linux/macOS:**
```bash
cd scripts/test
chmod +x *.sh
./test-analytics-system.sh
```

**Windows (PowerShell):**
```powershell
cd scripts\test
.\test-plantuml-download.ps1
```

**Windows (Batch):**
```cmd
cd scripts\test
test-plantuml-download.bat
```

### Running Debug Scripts

```bash
cd scripts/debug
chmod +x *.sh
./debug-analytics-events.sh
```

## 📝 Notes

- These scripts are for development and testing purposes only
- Make sure the extension is installed and activated before running tests
- Some scripts may require additional dependencies (Node.js, PowerShell, etc.)
- Test scripts help validate extension functionality across different platforms
- Debug scripts provide insights into internal extension state and behavior

## ⚠️ Caution

- Debug scripts may modify extension state or settings
- Always backup important data before running debug scripts
- Test scripts are safe to run and won't affect production data
