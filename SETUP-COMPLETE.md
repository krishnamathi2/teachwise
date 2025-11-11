# 🚀 TeachWise AI Desktop App - Quick Start Guide

## ✅ Setup Complete!

Your project is now configured as an Electron desktop application.

## 🎯 Next Steps

### 1. Test in Development Mode

Run the app to verify everything works:

```bash
npm run electron-dev
```

Or double-click `start-dev.bat`

This will:
- ✅ Start backend server on port 3003
- ✅ Start Next.js dev server on port 3000  
- ✅ Open the Electron desktop window

**Expected behavior:** A desktop window should open showing your TeachWise AI application.

---

### 2. Build Production Installer

Once testing works, create an installer:

```bash
# Build for Windows
npm run build-win
```

The installer will be created in the `dist/` folder:
- `TeachWise AI Setup 1.0.0.exe` (Windows installer)

---

## 🎨 Customize Your App

### Change App Icon

Replace `electron/icon.png` with your custom 512x512 PNG icon, then rebuild.

### Change App Name/Info

Edit `package.json`:
```json
{
  "name": "teachwise-mvp",
  "version": "1.0.0",
  "description": "Your description here",
  "author": "Your name",
  "build": {
    "productName": "Your App Name"
  }
}
```

---

## 🐛 Troubleshooting

### ❌ "Port 3000 or 3003 already in use"

**Solution:** Stop any running dev servers:
```bash
# Kill Node processes
taskkill /F /IM node.exe
```

### ❌ "Cannot find module 'electron'"

**Solution:** Reinstall dependencies:
```bash
npm install
```

### ❌ Electron window opens but shows blank/error

**Solution:** Check that backend and frontend started successfully. Look for:
```
Backend server is ready
Frontend server is ready
```

If missing, manually start servers first:
```bash
# Terminal 1
cd backend && node index.js

# Terminal 2  
cd frontend && npm run dev

# Terminal 3
npm run electron
```

### ❌ Build fails with "Cannot find module"

**Solution:** Ensure all dependencies are installed:
```bash
cd frontend && npm install
cd ../backend && npm install
cd .. && npm install
```

---

## 📦 Distribution Checklist

Before sharing your app:

- [ ] Test `npm run electron-dev` works
- [ ] Replace `electron/icon.png` with real icon
- [ ] Update app name/version in `package.json`
- [ ] Verify all `.env` files are configured
- [ ] Run `npm run build-win` successfully
- [ ] Test the generated installer in `dist/`
- [ ] (Optional) Code sign the installer to avoid Windows SmartScreen warnings

---

## 🎓 Commands Reference

| Command | Purpose |
|---------|---------|
| `npm run electron-dev` | Launch app in development mode |
| `npm run build-win` | Build Windows installer (.exe) |
| `npm run build-mac` | Build macOS installer (.dmg) |
| `npm run build-linux` | Build Linux installer (.AppImage) |
| `npm run dev` | Run backend + frontend only (no Electron) |

---

## 📝 What Changed?

New files added:
- `electron/main.js` - Electron main process
- `electron/preload.js` - Security bridge
- `electron/icon.png` - App icon placeholder
- `start-dev.bat` - Quick launcher
- `ELECTRON-README.md` - Full documentation

Modified files:
- `package.json` - Added Electron dependencies and build config
- `frontend/next.config.js` - Added standalone output mode

---

## ✨ Success!

You now have a fully functional desktop application! 

**Try it now:**
```bash
npm run electron-dev
```

See `ELECTRON-README.md` for complete documentation.
