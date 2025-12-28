# PowerShell script to clear Windows icon cache
# This helps refresh the taskbar icon after rebuilding the Electron app

Write-Host "Clearing Windows icon cache..." -ForegroundColor Yellow

# Stop Explorer to clear icon cache
Write-Host "Stopping Explorer process..." -ForegroundColor Cyan
taskkill /f /im explorer.exe

# Clear icon cache database
$iconCachePath = "$env:LOCALAPPDATA\IconCache.db"
if (Test-Path $iconCachePath) {
    Write-Host "Removing IconCache.db..." -ForegroundColor Cyan
    Remove-Item -Path $iconCachePath -Force -ErrorAction SilentlyContinue
}

# Clear thumbnail cache
$thumbCachePath = "$env:LOCALAPPDATA\Microsoft\Windows\Explorer"
if (Test-Path $thumbCachePath) {
    Write-Host "Clearing thumbnail cache..." -ForegroundColor Cyan
    Get-ChildItem -Path $thumbCachePath -Filter "thumbcache_*.db" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
}

# Clear icon cache in AppData
$appDataIconCache = "$env:APPDATA\Microsoft\Windows\Recent\IconCache.db"
if (Test-Path $appDataIconCache) {
    Write-Host "Removing AppData IconCache.db..." -ForegroundColor Cyan
    Remove-Item -Path $appDataIconCache -Force -ErrorAction SilentlyContinue
}

# Restart Explorer
Write-Host "Restarting Explorer..." -ForegroundColor Cyan
Start-Process explorer.exe

Write-Host "`nIcon cache cleared! The taskbar icon should update after rebuilding the app." -ForegroundColor Green
Write-Host "Note: You may need to rebuild the Electron app for the changes to take effect." -ForegroundColor Yellow
Write-Host "Run: npm run build:electron" -ForegroundColor Yellow

