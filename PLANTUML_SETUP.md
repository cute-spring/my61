# PlantUML Setup Guide

## Quick Setup for UML Diagram Rendering

The UML Chat Designer feature requires PlantUML to render visual diagrams. The extension now includes **automatic PlantUML JAR download** with progress indication!

## Automatic Setup (New!)

When you first use the UML Chat Designer:

1. **Java Check**: The extension verifies Java is installed
2. **JAR Download**: If PlantUML JAR is missing, it automatically downloads from the official source
3. **Progress Display**: Shows download progress with percentage and file size
4. **Ready to Use**: Once downloaded, diagrams render immediately

**Requirements for Automatic Setup:**
- Java 8 or higher installed and in your PATH
- Internet connection for initial download
- VS Code permission to download files

## Manual Setup Options

### Option 1: Install PlantUML Extension (Alternative)

1. Open VS Code Extensions (Ctrl+Shift+X / Cmd+Shift+X)
2. Search for "PlantUML" by jebbs
3. Install the extension
4. It will automatically handle Java and PlantUML JAR setup

### Option 2: Manual JAR Setup (Advanced)

#### Step 1: Install Java
- **Download**: https://adoptium.net/ (Java 8 or higher)
- **Verify**: Open terminal and run `java -version`

#### Step 2: Download PlantUML JAR (Optional)
- **Download**: https://plantuml.com/download
- **Configure**: Set path in VS Code settings: `plantuml.jarPath`

## What Happens During First Use

1. **You send a UML requirement** in the Chat Designer
2. Extension checks for Java → ✅ Java found
3. Extension checks for PlantUML JAR → ❌ JAR not found
4. **Automatic download starts** with progress notification:
   ```
   Downloading PlantUML JAR
   45% (2.3 MB/5.1 MB)
   ```
5. Download completes → ✅ JAR ready
6. **Diagram renders successfully** 🎉

## Troubleshooting

### "Java executable not found"
- **Install Java**: Download from https://adoptium.net/
- **Verify Installation**: Run `java -version` in terminal/command prompt
- **Windows**: Ensure Java is in your system PATH (installer usually handles this)
- **Windows Alternative**: Try `java.exe -version` if `java -version` doesn't work
- **Restart VS Code** after Java installation

### "Download failed" or "Automatic download failed"
- **Check Internet Connection**: Ensure you can access https://github.com
- **Windows Firewall**: Check if Windows Defender or antivirus is blocking the download
- **Corporate Network**: Check if corporate firewall/proxy is blocking downloads
- **Manual Download**: Download PlantUML JAR manually and set `plantuml.jarPath` in settings
- **Use PlantUML Extension**: Install the official PlantUML extension as alternative
- **PowerShell Execution Policy**: On Windows, ensure PowerShell can run scripts if needed

### "PlantUML JAR not found" (after successful download)
- **Restart VS Code**: Sometimes required after first download
- **Check Permissions**: Ensure VS Code can write to its global storage directory
- **Windows**: Check if antivirus software quarantined the downloaded JAR
- **Manual Path**: Set custom path in settings if automatic storage location has issues

### Windows-Specific Issues

**Antivirus Software:**
- Some antivirus programs may flag downloaded JAR files as suspicious
- Add the VS Code global storage folder to your antivirus exclusions:
  `%APPDATA%\Code\User\globalStorage\undefined_publisher.nondevtaskkiller\`

**PowerShell Execution Policy:**
- If using PowerShell test scripts, you may need to allow script execution:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

**Path Issues:**
- Ensure Java is properly installed and in your system PATH
- Test with both `java -version` and `java.exe -version`
- If Java is installed but not in PATH, add it manually or reinstall Java

### Still having issues?
- Try installing the PlantUML extension (Option 1)
- Check VS Code Output panel for detailed error messages
- Ensure you have write permissions in the extension directory

## What Works Without PlantUML

Even without PlantUML setup, you can still:
- ✅ Chat about UML concepts and get expert advice
- ✅ Generate PlantUML code that you can copy/paste
- ✅ Get explanations of UML diagrams and best practices
- ✅ Use all other extension features (Email Refine, Translate, etc.)

You'll just see a setup instruction message instead of rendered diagrams until PlantUML is configured.

## Testing Automatic Download

### How to Remove Downloaded JAR for Testing

To test the automatic download functionality, you can remove the downloaded JAR file:

1. **Find VS Code Global Storage Location:**
   - **macOS**: `~/Library/Application Support/Code/User/globalStorage/undefined_publisher.nondevtaskkiller/`
   - **Windows**: `%APPDATA%\Code\User\globalStorage\undefined_publisher.nondevtaskkiller\`
   - **Linux**: `~/.config/Code/User/globalStorage/undefined_publisher.nondevtaskkiller/`

2. **Delete the JAR File:**
   ```bash
   # macOS/Linux
   rm -f ~/Library/Application\ Support/Code/User/globalStorage/undefined_publisher.nondevtaskkiller/plantuml.jar
   
   # Or navigate to the folder and delete manually
   open ~/Library/Application\ Support/Code/User/globalStorage/undefined_publisher.nondevtaskkiller/
   ```

3. **Alternative: Use Test Scripts**
   - **macOS/Linux**: Run `./test-plantuml-download.sh`
   - **Windows CMD**: Run `test-plantuml-download.bat`
   - **Windows PowerShell**: Run `.\test-plantuml-download.ps1`
   - These scripts will guide you through the testing process

4. **Alternative: Use VS Code Developer Tools**
   - Open VS Code
   - Press `Ctrl+Shift+P` (Cmd+Shift+P on Mac)
   - Type "Developer: Reload Window" and run it
   - This ensures any cached references are cleared

### Verify Automatic Download Works

1. **Restart VS Code** (important!)
2. **Open UML Chat Designer** (`Ctrl+Shift+P` → "UML Chat Designer")
3. **Send any UML requirement**, for example:
   ```
   Create a class diagram for a simple library management system with Book, Author, and Library classes
   ```
4. **Watch for the download notification:**
   ```
   🔄 Downloading PlantUML JAR
   Progress: 25% (1.2 MB/4.8 MB)
   ```
5. **Verify successful rendering** after download completes

### Quick Test Commands

```bash
# macOS/Linux - Remove JAR and test
rm -f ~/Library/Application\ Support/Code/User/globalStorage/undefined_publisher.nondevtaskkiller/plantuml.jar && echo "JAR removed, restart VS Code to test auto-download"

# Check if JAR exists (macOS/Linux)
ls -la ~/Library/Application\ Support/Code/User/globalStorage/undefined_publisher.nondevtaskkiller/

# Linux alternative path
ls -la ~/.config/Code/User/globalStorage/undefined_publisher.nondevtaskkiller/
```

```cmd
REM Windows - Remove JAR and test (Command Prompt)
del "%APPDATA%\Code\User\globalStorage\undefined_publisher.nondevtaskkiller\plantuml.jar" && echo JAR removed, restart VS Code to test auto-download

REM Check if JAR exists (Windows)
dir "%APPDATA%\Code\User\globalStorage\undefined_publisher.nondevtaskkiller\"
```

```powershell
# Windows PowerShell - Remove JAR and test
Remove-Item "$env:APPDATA\Code\User\globalStorage\undefined_publisher.nondevtaskkiller\plantuml.jar" -ErrorAction SilentlyContinue; Write-Host "JAR removed, restart VS Code to test auto-download"

# Check if JAR exists (PowerShell)
Get-ChildItem "$env:APPDATA\Code\User\globalStorage\undefined_publisher.nondevtaskkiller\"
```
