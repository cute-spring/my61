@echo off
REM PlantUML Auto-Download Test Script for Windows
REM This script helps test the automatic PlantUML JAR download functionality

echo 🧪 PlantUML Auto-Download Test Script (Windows)
echo =============================================
echo.

set "STORAGE_PATH=%APPDATA%\Code\User\globalStorage\undefined_publisher.nondevtaskkiller"
set "JAR_FILE=%STORAGE_PATH%\plantuml.jar"

echo 📁 Storage Path: %STORAGE_PATH%
echo 📄 JAR File: %JAR_FILE%
echo.

REM Check if JAR exists
if exist "%JAR_FILE%" (
    echo ✅ JAR file found!
    for %%I in ("%JAR_FILE%") do echo 📊 File size: %%~zI bytes
    for %%I in ("%JAR_FILE%") do echo 📅 Modified: %%~tI
    echo.
    
    set /p "DELETE_CHOICE=❓ Do you want to delete it to test auto-download? (y/N): "
    if /i "!DELETE_CHOICE!"=="y" (
        del "%JAR_FILE%" 2>nul
        if !ERRORLEVEL! equ 0 (
            echo 🗑️  JAR file deleted successfully!
            echo.
            echo 🔄 Next Steps:
            echo 1. Restart VS Code completely
            echo 2. Open UML Chat Designer
            echo 3. Send any UML requirement
            echo 4. Watch for download progress notification
            echo.
            echo 📋 Test message you can use:
            echo "Create a class diagram for a simple e-commerce system with User, Product, and Order classes"
        ) else (
            echo ❌ Failed to delete JAR file
        )
    ) else (
        echo ℹ️  JAR file kept. No changes made.
    )
) else (
    echo ❌ JAR file not found at expected location
    echo    This means automatic download should trigger on next use!
    echo.
    echo 🔄 To test:
    echo 1. Open VS Code
    echo 2. Open UML Chat Designer
    echo 3. Send any UML requirement
    echo 4. Watch for download progress notification
)

echo.
echo 🏁 Test script completed!
pause
