# Real-time log monitor for Order WhatsApp Desktop App
param(
    [int]$RefreshInterval = 2
)

$logDir = "$env:APPDATA\order-whatsapp-desktop-app\logs"

Write-Host "=== Order WhatsApp Desktop App - Real-time Log Monitor ===" -ForegroundColor Green
Write-Host "Monitoring directory: $logDir" -ForegroundColor Yellow
Write-Host "Refresh interval: $RefreshInterval seconds" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Gray

$lastLineCount = 0
$lastLogFile = $null

while ($true) {
    # Find the latest log file
    $latestLog = Get-ChildItem -Path $logDir -ErrorAction SilentlyContinue | 
        Sort-Object LastWriteTime -Descending | 
        Select-Object -First 1

    if ($latestLog) {
        # If log file changed, reset counter
        if ($lastLogFile -ne $latestLog.FullName) {
            $lastLineCount = 0
            $lastLogFile = $latestLog.FullName
            Clear-Host
            Write-Host "=== Monitoring: $($latestLog.Name) ===" -ForegroundColor Green
            Write-Host "=== Started at: $(Get-Date -Format 'HH:mm:ss') ===`n" -ForegroundColor Yellow
        }

        # Read all lines
        $allLines = Get-Content $latestLog.FullName -ErrorAction SilentlyContinue
        
        if ($allLines) {
            $currentLineCount = $allLines.Count
            
            # Show new lines
            if ($currentLineCount -gt $lastLineCount) {
                $newLines = $allLines | Select-Object -Skip $lastLineCount
                foreach ($line in $newLines) {
                    # Color code by log level
                    if ($line -match '\[ERROR\]') {
                        Write-Host $line -ForegroundColor Red
                    } elseif ($line -match '\[WARN\]') {
                        Write-Host $line -ForegroundColor Yellow
                    } elseif ($line -match '\[INFO\].*API Base URL|baseURL|127\.0\.0\.1|localhost|serverAddress') {
                        Write-Host $line -ForegroundColor Cyan
                    } elseif ($line -match '\[INFO\]') {
                        Write-Host $line -ForegroundColor White
                    } else {
                        Write-Host $line
                    }
                }
                $lastLineCount = $currentLineCount
            }
        }
    } else {
        Write-Host "Waiting for log file to appear..." -ForegroundColor Gray
    }

    Start-Sleep -Seconds $RefreshInterval
}

