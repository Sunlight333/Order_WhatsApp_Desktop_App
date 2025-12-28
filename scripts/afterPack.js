const fs = require('fs');
const path = require('path');

/**
 * Electron-builder afterPack hook
 * Removes database files from the packaged app before creating the installer
 */
function deleteDatabaseFiles(dir) {
  try {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        deleteDatabaseFiles(filePath);
      } else if (/database\.db/.test(file)) {
        try {
          // Try to delete the file, but don't fail if it's locked
          fs.unlinkSync(filePath);
          console.log('✓ Deleted database file:', filePath);
        } catch (err) {
          // If file is locked, try to delete related files
          if (err.code === 'EBUSY' || err.code === 'EPERM') {
            console.warn('⚠ Could not delete (locked):', filePath);
            // Try to delete related files
            const relatedFiles = [
              filePath + '-shm',
              filePath + '-wal',
              filePath + '-journal'
            ];
            relatedFiles.forEach(relatedFile => {
              try {
                if (fs.existsSync(relatedFile)) {
                  fs.unlinkSync(relatedFile);
                  console.log('✓ Deleted related file:', relatedFile);
                }
              } catch (e) {
                // Ignore errors for related files
              }
            });
          }
        }
      }
    });
  } catch (err) {
    // Ignore errors (directory might not exist)
  }
}

module.exports = async function afterPack(context) {
  const { appOutDir } = context;
  console.log('Cleaning database files from packaged app...');
  
  // Delete database files from the packaged app
  const resourcesPath = path.join(appOutDir, 'resources');
  if (fs.existsSync(resourcesPath)) {
    deleteDatabaseFiles(resourcesPath);
  }
  
  // Also check the app directory itself
  deleteDatabaseFiles(appOutDir);
  
  // Wait longer and try again for locked files (give time for file handles to be released)
  console.log('Waiting 5 seconds for file handles to be released...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Check if the prisma directory has locked files
  const prismaDir = path.join(resourcesPath, 'node_modules', 'order-app-backend', 'prisma');
  const dbFiles = [
    path.join(prismaDir, 'database.db'),
    path.join(prismaDir, 'database.db-shm'),
    path.join(prismaDir, 'database.db-wal'),
  ];
  
  // Check if any files are still locked
  let hasLockedFiles = false;
  for (const dbFile of dbFiles) {
    if (fs.existsSync(dbFile)) {
      try {
        // Try to delete the file
        fs.unlinkSync(dbFile);
        console.log('✓ Deleted:', dbFile);
      } catch (err) {
        if (err.code === 'EBUSY' || err.code === 'EPERM') {
          hasLockedFiles = true;
          console.warn('⚠ File still locked:', dbFile);
        }
      }
    }
  }
  
  // Retry deletion one more time after waiting
  console.log('Retrying deletion after wait...');
  for (const dbFile of dbFiles) {
    if (fs.existsSync(dbFile)) {
      try {
        fs.unlinkSync(dbFile);
        console.log('✓ Deleted after wait:', dbFile);
        hasLockedFiles = false;
      } catch (err) {
        if (err.code === 'EBUSY' || err.code === 'EPERM') {
          hasLockedFiles = true;
        }
      }
    }
  }
  
  // If files are still locked, use aggressive method to remove them
  if (hasLockedFiles) {
    console.warn('⚠ Files are still locked, using aggressive removal method...');
    const { execSync } = require('child_process');
    const forceCloseScript = path.join(__dirname, 'force-close-handles.ps1');
    
    // Try to force close handles and remove files
    for (const dbFile of dbFiles) {
      if (fs.existsSync(dbFile)) {
        try {
          // Use PowerShell to force close handles
          const psCommand = `powershell -ExecutionPolicy Bypass -File "${forceCloseScript}" -FilePath "${dbFile}"`;
          execSync(psCommand, { stdio: 'pipe', timeout: 10000 });
          console.log('✓ Force removed:', dbFile);
        } catch (err) {
          console.warn('⚠ Could not force remove:', dbFile);
        }
      }
    }
    
    // Final attempt: Create a file list for 7-Zip to exclude these files
    // We'll create a file that 7-Zip can use to exclude these files
    const exclusionListPath = path.join(context.appOutDir, '..', '7z-exclude-list.txt');
    const exclusionList = [
      'resources\\node_modules\\order-app-backend\\prisma\\database.db',
      'resources\\node_modules\\order-app-backend\\prisma\\database.db-shm',
      'resources\\node_modules\\order-app-backend\\prisma\\database.db-wal'
    ].join('\r\n');
    
    try {
      fs.writeFileSync(exclusionListPath, exclusionList, 'utf8');
      console.log('✓ Created 7-Zip exclusion list file');
    } catch (err) {
      console.warn('⚠ Could not create exclusion list:', err.message);
    }
    
    // Also try to remove the directory one more time with a longer wait
    if (fs.existsSync(prismaDir)) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      try {
        fs.rmSync(prismaDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 1000 });
        console.log('✓ Removed prisma directory after retry');
      } catch (finalErr) {
        console.warn('⚠ Could not remove prisma directory after final retry:', finalErr.message);
        console.warn('  The build may fail, but the exclusion list has been created');
      }
    }
  }
  
  console.log('✓ Database files cleaned');
};

