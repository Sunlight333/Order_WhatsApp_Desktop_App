const fs = require('fs');
const path = require('path');

/**
 * Electron-builder beforePack hook
 * Removes database files from source directories before packaging
 */
function deleteDatabaseFiles(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }
  
  try {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const filePath = path.join(dir, file);
      try {
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          deleteDatabaseFiles(filePath);
        } else if (/database\.db/.test(file)) {
          try {
            fs.unlinkSync(filePath);
            console.log('✓ Deleted database file before pack:', filePath);
          } catch (err) {
            // Ignore errors for locked files
            if (err.code !== 'EBUSY' && err.code !== 'EPERM') {
              console.warn('⚠ Could not delete:', filePath, err.message);
            }
          }
        }
      } catch (err) {
        // Ignore errors
      }
    });
  } catch (err) {
    // Ignore errors
  }
}

module.exports = async function beforePack(context) {
  console.log('Cleaning database files before packaging...');
  
  // Use process.cwd() as fallback if projectDir is not available
  const projectDir = context.projectDir || process.cwd();
  
  // Delete database files from node_modules
  const nodeModulesPath = path.join(projectDir, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    deleteDatabaseFiles(nodeModulesPath);
  }
  
  // Delete database files from backend/prisma
  const backendPrismaPath = path.join(projectDir, 'backend', 'prisma');
  if (fs.existsSync(backendPrismaPath)) {
    deleteDatabaseFiles(backendPrismaPath);
  }
  
  console.log('✓ Database files cleaned before pack');
};

