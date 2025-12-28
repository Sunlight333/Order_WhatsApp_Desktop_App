const fs = require('fs');
const path = require('path');

/**
 * Electron-builder afterSign hook
 * This runs after signing but before creating the installer
 * We'll use this to ensure database files are excluded
 */
module.exports = async function afterSign(context) {
  const { appOutDir } = context;
  console.log('Final cleanup before installer creation...');
  
  // Final attempt to remove database files
  const prismaDir = path.join(appOutDir, 'resources', 'node_modules', 'order-app-backend', 'prisma');
  const dbFiles = [
    path.join(prismaDir, 'database.db'),
    path.join(prismaDir, 'database.db-shm'),
    path.join(prismaDir, 'database.db-wal'),
  ];
  
  // Try to delete files one more time
  for (const dbFile of dbFiles) {
    if (fs.existsSync(dbFile)) {
      try {
        fs.unlinkSync(dbFile);
        console.log('✓ Final cleanup deleted:', dbFile);
      } catch (err) {
        // If still locked, create a .7z exclusion file
        console.warn('⚠ File still locked in afterSign:', dbFile);
      }
    }
  }
  
  // If prisma directory still exists and has locked files, try to remove it
  if (fs.existsSync(prismaDir)) {
    try {
      const files = fs.readdirSync(prismaDir);
      const hasDbFiles = files.some(f => /database\.db/.test(f));
      if (hasDbFiles) {
        // Try to remove the entire directory
        fs.rmSync(prismaDir, { recursive: true, force: true });
        console.log('✓ Removed prisma directory in afterSign');
      }
    } catch (err) {
      console.warn('⚠ Could not remove prisma directory in afterSign:', err.message);
    }
  }
};

