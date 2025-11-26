# Config File Location

The `config.json` file is stored in Electron's user data directory. The exact location depends on your operating system:

## Windows
```
C:\Users\{YourUsername}\AppData\Roaming\order-whatsapp-desktop-app\config.json
```

**Quick access:**
- Press `Win + R`
- Type: `%APPDATA%\order-whatsapp-desktop-app`
- Press Enter
- Look for `config.json` in that folder

## macOS
```
~/Library/Application Support/order-whatsapp-desktop-app/config.json
```

**Quick access:**
1. Open Finder
2. Press `Cmd + Shift + G`
3. Type: `~/Library/Application Support/order-whatsapp-desktop-app`
4. Press Enter
5. Look for `config.json`

## Linux
```
~/.config/order-whatsapp-desktop-app/config.json
```

**Quick access:**
- Open terminal and run:
```bash
cat ~/.config/order-whatsapp-desktop-app/config.json
```

## Alternative: Check from the App

You can also check the exact location by:
1. Opening the app's developer console (if available)
2. The path is logged when the config is loaded/saved
3. Or check the Electron app's logs

## Note

If you're running in development mode, the app name might be slightly different. Check the folder name in your AppData/Application Support/.config directory.

