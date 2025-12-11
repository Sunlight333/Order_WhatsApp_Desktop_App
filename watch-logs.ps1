# Real-time log monitor for Order WhatsApp Desktop App
$logDir = "$env:APPDATA\order-whatsapp-desktop-app\logs"

Write-Host "=== Order WhatsApp Desktop App - Log Monitor ===" -ForegroundColor Green
Write-Host "Monitoring directory: $logDir" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Cyan

# Find the latest log file
$latestLog = Get-ChildItem -Path $logDir -ErrorAction SilentlyContinue | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 1

if (-not $latestLog) {
    Write-Host "No log files found. Waiting for app to start..." -ForegroundColor Red
    # Wait for log file to appear
    $timeout = 30
    $elapsed = 0
    while ($elapsed -lt $timeout) {
        Start-Sleep -Seconds 1
        $elapsed++
        $latestLog = Get-ChildItem -Path $logDir -ErrorAction SilentlyContinue | 
            Sort-Object LastWriteTime -Descending | 
            Select-Object -First 1
        if ($latestLog) { break }
        Write-Host "." -NoNewline -ForegroundColor Yellow
    }
    Write-Host ""
}

if ($latestLog) {
    Write-Host "`n=== Monitoring: $($latestLog.Name) ===" -ForegroundColor Green
    Write-Host "=== Started at: $(Get-Date) ===`n" -ForegroundColor Yellow
    
    # Show last 20 lines
    Write-Host "--- Recent Log Entries ---" -ForegroundColor Cyan
    Get-Content $latestLog.FullName -Tail 20 -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host $_
    }
    Write-Host "`n--- Live Updates (new entries will appear below) ---`n" -ForegroundColor Cyan
    
    # Watch for new entries
    $lastSize = (Get-Item $latestLog.FullName).Length
    while ($true) {
        Start-Sleep -Milliseconds 500
        $currentSize = (Get-Item $latestLog.FullName).Length
        if ($currentSize -gt $lastSize) {
            # New content added
            $newContent = Get-Content $latestLog.FullName -Tail 5 -ErrorAction SilentlyContinue
            $newContent | ForEach-Object {
                Write-Host $_ -ForegroundColor White
            }
            $lastSize = $currentSize
        }
    }
} else {
    Write-Host "Could not find log file after waiting. Please start the app first." -ForegroundColor Red
    exit 1
}

