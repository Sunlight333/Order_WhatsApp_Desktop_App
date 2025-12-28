# Replace locked database files with empty files
param(
    [string]$FilePath
)

if (-not (Test-Path $FilePath)) {
    exit 0
}

# Try to delete the file first
try {
    Remove-Item $FilePath -Force -ErrorAction Stop
    Write-Host "Deleted: $FilePath"
    exit 0
} catch {
    # If deletion fails, try to replace with empty file
    try {
        # Create an empty file with the same name
        $null | Out-File -FilePath $FilePath -Force -ErrorAction Stop
        Write-Host "Replaced with empty file: $FilePath"
        exit 0
    } catch {
        Write-Host "Could not replace: $FilePath - $_"
        exit 1
    }
}

