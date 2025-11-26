# Quick Start Guide - Testing Electron Without Building

## 🚀 Run Electron in Development Mode

To test the Electron application **without building**, simply run:

```bash
npm run dev
```

This single command will:
1. ✅ Start the backend server (port 3000)
2. ✅ Start the frontend dev server (port 5173)  
3. ✅ Wait for both servers to be ready
4. ✅ Launch Electron with TypeScript support (no build needed!)

## 📋 What Happens

The setup uses:
- **`electron-main.js`** - JavaScript entry point that loads TypeScript using `tsx`
- **`electron/main.ts`** - TypeScript main process (runs directly without compilation)
- **`electron/preload.js`** - Preload script (JavaScript, already provided)

## 🔧 Manual Testing (If Needed)

If you want to test components separately:

```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend  
npm run dev:frontend

# Terminal 3: Electron (wait for servers to start first)
npm run dev:electron
```

## ✅ Prerequisites

1. All dependencies installed:
   ```bash
   npm install
   ```

2. Dependencies should include:
   - `tsx` - For running TypeScript directly
   - `electron` - The Electron framework
   - `cross-env` - For environment variables

## 🎯 Features in Dev Mode

When running in development:
- ✅ TypeScript files run without compilation
- ✅ DevTools automatically open
- ✅ Hot reload for frontend changes
- ✅ Backend runs with file watching
- ✅ Menu bar visible for debugging

## 📝 Notes

- Electron window loads from `http://localhost:5173`
- Backend server runs inside Electron (port 3000)
- Changes to `electron/main.ts` require restarting Electron
- Changes to frontend React files hot-reload automatically

## 🐛 Troubleshooting

**If Electron won't start:**
1. Check that backend and frontend servers are running
2. Verify ports 3000 and 5173 are available
3. Check console for error messages

**If TypeScript errors occur:**
1. Ensure `tsx` is installed: `npm list tsx`
2. Verify `electron-main.js` exists in root directory
3. Check that `electron/main.ts` has no syntax errors

That's it! No build step needed - just run `npm run dev` and start testing! 🎉
