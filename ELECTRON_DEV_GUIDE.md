# Electron Development Mode Guide

This guide explains how to test and run the Electron application in development mode **without building**.

## Prerequisites

1. Make sure all dependencies are installed:
   ```bash
   npm install
   ```

2. Ensure `tsx` is installed at the root level (it should be in devDependencies)

## How It Works

The project uses a JavaScript entry point (`electron-main.js`) that:
1. Registers TypeScript support using `tsx/cjs/register`
2. Loads the TypeScript `electron/main.ts` file directly
3. Allows Electron to run TypeScript without compilation

## Running in Development Mode

### Option 1: Run Everything Together (Recommended)

This starts backend, frontend, and Electron all at once:

```bash
npm run dev
```

This command will:
1. Start the backend server on port 3000
2. Start the frontend dev server on port 5173
3. Wait for both servers to be ready
4. Launch Electron with TypeScript support

### Option 2: Run Components Separately

If you prefer more control, you can run each component separately:

**Terminal 1 - Backend:**
```bash
npm run dev:backend
```

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
```

**Terminal 3 - Electron (after servers are running):**
```bash
npm run dev:electron
```

## File Structure

```
.
├── electron-main.js          # JavaScript entry point (loads TypeScript)
├── electron/
│   ├── main.ts               # TypeScript Electron main process
│   ├── preload.ts            # TypeScript preload script
│   └── preload.js            # Compiled preload (used by Electron)
└── package.json              # Scripts and dependencies
```

## How TypeScript Works

1. **Main Process (`electron/main.ts`)**: 
   - Loaded via `electron-main.js` using `tsx/cjs/register`
   - No compilation needed - runs directly

2. **Preload Script (`electron/preload.js`)**: 
   - Must be JavaScript (Electron requirement)
   - We maintain both `preload.ts` (source) and `preload.js` (runtime)
   - Keep them in sync manually or use a build script

## Troubleshooting

### Electron won't start

1. **Check if servers are running:**
   - Backend should be on http://localhost:3000
   - Frontend should be on http://localhost:5173

2. **Check tsx installation:**
   ```bash
   npm list tsx
   ```
   If not found, install it:
   ```bash
   npm install --save-dev tsx
   ```

3. **Clear Electron cache (if issues persist):**
   - Windows: `%APPDATA%\order-whatsapp-desktop-app\`
   - macOS: `~/Library/Application Support/order-whatsapp-desktop-app/`
   - Linux: `~/.config/order-whatsapp-desktop-app/`

### TypeScript errors in Electron

- Make sure `tsx` is installed at root level
- Check that `electron-main.js` can find `tsx/cjs/register`
- Verify TypeScript files don't have syntax errors

### Preload script errors

- Ensure `electron/preload.js` exists
- Keep `preload.ts` and `preload.js` in sync
- Check browser console for preload errors

## Development Features

When running in development mode (`NODE_ENV=development`):
- ✅ DevTools are automatically opened
- ✅ Hot reload for frontend changes
- ✅ Backend server runs with file watching
- ✅ TypeScript files run without compilation
- ✅ Menu bar is visible for debugging

## Production Build

When ready to build for production:

```bash
npm run build
```

This will:
1. Compile backend TypeScript
2. Build frontend assets
3. Package Electron app with electron-builder

## Notes

- The Electron window will load from `http://localhost:5173` in development
- Backend server runs inside Electron process (port 3000)
- Changes to TypeScript files require Electron restart (no hot reload for main process)
- Changes to frontend React files hot-reload automatically
