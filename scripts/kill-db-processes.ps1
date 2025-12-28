# Script to kill processes that might be locking database files
# This will close Node.js processes that are not part of Cursor IDE

Write-Host 'Searching for processes that might be locking database files...'

# Get all Node.js processes
$nodeProcesses = Get-Process -Name 'node' -ErrorAction SilentlyContinue

$killedCount = 0
foreach ($proc in $nodeProcesses) {
    # Skip Cursor's Node.js processes
    if ($proc.Path -like '*cursor*' -or $proc.Path -like '*Cursor*') {
        Write-Host "Skipping Cursor process: PID $($proc.Id)"
        continue
    }
    
    # Check if process path contains our project directory
    $processPath = $proc.Path
    if ($processPath -and ($processPath -like '*Order WhatsApp*' -or $processPath -like '*order-whatsapp*' -or $processPath -like '*Workana*')) {
        Write-Host "Found project-related process: PID $($proc.Id) - $processPath"
        try {
            Stop-Process -Id $proc.Id -Force -ErrorAction Stop
            Write-Host "  Killed process $($proc.Id)"
            $killedCount++
        } catch {
            Write-Host "  Could not kill process $($proc.Id): $_"
        }
    }
}

# Also check for Electron processes
$electronProcesses = Get-Process -Name 'electron' -ErrorAction SilentlyContinue
foreach ($proc in $electronProcesses) {
    Write-Host "Found Electron process: PID $($proc.Id)"
    try {
        Stop-Process -Id $proc.Id -Force -ErrorAction Stop
        Write-Host "  Killed Electron process $($proc.Id)"
        $killedCount++
    } catch {
        Write-Host "  Could not kill Electron process $($proc.Id): $_"
    }
}

if ($killedCount -eq 0) {
    Write-Host 'No processes were killed. You may need to manually close:'
    Write-Host '  - The Electron app if it is running'
    Write-Host '  - Prisma Studio (npm run prisma:studio)'
    Write-Host '  - Any Node.js processes related to the project'
} else {
    Write-Host ''
    Write-Host "Killed $killedCount process(es)"
    Write-Host 'Waiting 2 seconds for file handles to be released...'
    Start-Sleep -Seconds 2
}
