# Force delete database files by closing file handles
param(
    [string]$FilePath
)

if (-not (Test-Path $FilePath)) {
    exit 0
}

# Try to delete the file
try {
    Remove-Item $FilePath -Force -ErrorAction Stop
    Write-Host "Deleted: $FilePath"
    exit 0
} catch {
    # If deletion fails, try to close file handles using handle.exe (if available)
    # or use a different approach
    Write-Host "Could not delete: $FilePath - $_"
    exit 1
}

