const fs = require('fs');
const path = require('path');

/**
 * Generate icon files for electron-builder
 * Copies logo.png to build/icon.png
 * electron-builder will automatically convert PNG to ICO for Windows
 */

function generateIcon() {
  const buildDir = path.join(__dirname, '../build');
  const logoPath = path.join(__dirname, '../frontend/public/assets/images/logo.png');
  const iconPngPath = path.join(buildDir, 'icon.png');

  // Ensure build directory exists
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  // Copy PNG to build directory
  if (fs.existsSync(logoPath)) {
    fs.copyFileSync(logoPath, iconPngPath);
    console.log('✓ Copied logo.png to build/icon.png');
    console.log('  electron-builder will convert this to ICO for Windows');
  } else {
    console.error('✗ logo.png not found at:', logoPath);
    process.exit(1);
  }
}

generateIcon();



