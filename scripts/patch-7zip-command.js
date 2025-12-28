const fs = require('fs');
const path = require('path');

/**
 * Patch electron-builder's 7-Zip command to exclude database files
 * This modifies the 7-Zip command before it's executed
 */
module.exports = function patch7ZipCommand() {
  // Find the 7-Zip executable path
  const sevenZipPath = path.join(__dirname, '..', 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');
  
  // The actual patching would need to happen in electron-builder's code
  // Since we can't modify that directly, we'll create a wrapper script
  // that adds exclusion parameters to the 7-Zip command
  
  console.log('Patching 7-Zip command to exclude database files...');
  
  // Create a wrapper script that will be used instead of 7za.exe
  const wrapperScript = path.join(__dirname, '7za-wrapper.ps1');
  const wrapperContent = `# 7-Zip wrapper to exclude database files
param(
    [string[]]$Arguments
)

$exePath = "${sevenZipPath.replace(/\\/g, '/')}"
$newArgs = @()

# Add exclusion parameters for database files
$newArgs += "-xr!*database.db"
$newArgs += "-xr!*database.db-shm"
$newArgs += "-xr!*database.db-wal"
$newArgs += "-xr!*database.db-journal"
$newArgs += "-xr!*order-app-backend/prisma/database.db*"

# Add original arguments
$newArgs += $Arguments

# Execute 7-Zip with modified arguments
& $exePath $newArgs
exit $LASTEXITCODE
`;

  fs.writeFileSync(wrapperScript, wrapperContent, 'utf8');
  console.log('✓ Created 7-Zip wrapper script');
};

