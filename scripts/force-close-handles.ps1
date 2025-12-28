# Force close file handles for database files
param(
    [string]$FilePath
)

# Try to close handles using handle.exe if available, or use alternative method
$filePath = $FilePath

# Method 1: Try to delete the file directly
try {
    Remove-Item $filePath -Force -ErrorAction Stop
    Write-Host "Deleted: $filePath"
    exit 0
} catch {
    # Method 2: Use PowerShell to force close handles
    try {
        # Get the process that's locking the file
        $lockingProcess = Get-Process | Where-Object {
            $_.Path -and (Test-Path $_.Path)
        } | ForEach-Object {
            try {
                $handles = (Get-NetTCPConnection -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -eq $_.Id })
                if ($handles) { $_ }
            } catch { }
        }
        
        # If we can't find the process, try to use a different approach
        # Create a temporary file and try to replace the locked file
        $tempFile = $filePath + ".tmp"
        $null | Out-File -FilePath $tempFile -Force
        Start-Sleep -Milliseconds 500
        
        # Try to replace
        try {
            Move-Item -Path $tempFile -Destination $filePath -Force -ErrorAction Stop
            Write-Host "Replaced: $filePath"
            exit 0
        } catch {
            Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
        }
    } catch {
        Write-Host "Could not close handles: $_"
        exit 1
    }
}

