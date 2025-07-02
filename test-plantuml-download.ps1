# PlantUML Auto-Download Test Script for Windows PowerShell
# This script helps test the automatic PlantUML JAR download functionality

Write-Host "🧪 PlantUML Auto-Download Test Script (PowerShell)" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

$StoragePath = "$env:APPDATA\Code\User\globalStorage\undefined_publisher.nondevtaskkiller"
$JarFile = "$StoragePath\plantuml.jar"

Write-Host "📁 Storage Path: $StoragePath"
Write-Host "📄 JAR File: $JarFile"
Write-Host ""

# Check if JAR exists
if (Test-Path $JarFile) {
    Write-Host "✅ JAR file found!" -ForegroundColor Green
    $FileInfo = Get-Item $JarFile
    Write-Host "📊 File size: $([math]::Round($FileInfo.Length / 1MB, 2)) MB ($($FileInfo.Length) bytes)"
    Write-Host "📅 Modified: $($FileInfo.LastWriteTime)"
    Write-Host ""
    
    $DeleteChoice = Read-Host "❓ Do you want to delete it to test auto-download? (y/N)"
    if ($DeleteChoice -eq 'y' -or $DeleteChoice -eq 'Y') {
        try {
            Remove-Item $JarFile -Force
            Write-Host "🗑️  JAR file deleted successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "🔄 Next Steps:" -ForegroundColor Yellow
            Write-Host "1. Restart VS Code completely"
            Write-Host "2. Open UML Chat Designer"
            Write-Host "3. Send any UML requirement"
            Write-Host "4. Watch for download progress notification"
            Write-Host ""
            Write-Host "📋 Test message you can use:" -ForegroundColor Cyan
            Write-Host "`"Create a class diagram for a simple e-commerce system with User, Product, and Order classes`""
        } catch {
            Write-Host "❌ Failed to delete JAR file: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "ℹ️  JAR file kept. No changes made." -ForegroundColor Blue
    }
} else {
    Write-Host "❌ JAR file not found at expected location" -ForegroundColor Red
    Write-Host "   This means automatic download should trigger on next use!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🔄 To test:" -ForegroundColor Yellow
    Write-Host "1. Open VS Code"
    Write-Host "2. Open UML Chat Designer"
    Write-Host "3. Send any UML requirement"
    Write-Host "4. Watch for download progress notification"
}

Write-Host ""
Write-Host "🏁 Test script completed!" -ForegroundColor Green
Read-Host "Press Enter to exit"
