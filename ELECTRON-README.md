# TeachWise AI - Desktop Application

A professional teaching assistant application built with Next.js, Node.js backend, and packaged as a desktop app with Electron.

## 🚀 Quick Start

### Development Mode

Run the app in development mode with hot reload:

```bash
npm install
npm run electron-dev
```

This will:
1. Start the backend server on port 3003
2. Start the Next.js dev server on port 3000
3. Launch the Electron window

### Production Build

Build installers for your platform:

```bash
# Install dependencies
npm install

# Build for Windows (creates .exe installer)
npm run build-win

# Build for macOS (creates .dmg)
npm run build-mac

# Build for Linux (creates .AppImage)
npm run build-linux
```

The installer will be in the `dist/` folder.

## 📦 What's Included

- **Frontend**: Next.js 12 with React 18, dark theme UI
- **Backend**: Express.js server with Supabase, Nodemailer, Razorpay
- **Desktop**: Electron wrapper with embedded backend

## 🛠️ Project Structure

```
teachwise-mvp/
├── electron/          # Electron main process
│   ├── main.js       # Main process entry
│   ├── preload.js    # Preload script
│   └── icon.png      # App icon (replace with 512x512 PNG)
├── frontend/         # Next.js frontend
├── backend/          # Express backend
└── package.json      # Root package with Electron config
```

## 🔧 Configuration

### Backend Environment Variables

Create `backend/.env` with:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
JWT_SECRET=your_jwt_secret
GMAIL_USER=your_gmail
GMAIL_APP_PASSWORD=your_app_password
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

### Frontend Environment Variables

Create `frontend/.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

## 📝 Available Scripts

- `npm run dev` - Run backend + frontend in development
- `npm run electron-dev` - Launch Electron in development mode
- `npm run build` - Build installer for current platform
- `npm run build-win` - Build Windows installer (.exe)
- `npm run build-mac` - Build macOS installer (.dmg)
- `npm run build-linux` - Build Linux installer (.AppImage)

## 🎨 Customization

### Change App Icon

Replace `electron/icon.png` with your own 512x512 PNG icon.

### App Metadata

Edit `package.json` > `build` section to change:
- App name
- App ID
- Author
- Description

## 🐛 Troubleshooting

### Port Already in Use

If ports 3000 or 3003 are busy:
1. Close other dev servers
2. Change ports in `electron/main.js`

### Build Fails

- Ensure Node.js 16+ is installed
- Run `npm install` in root, frontend, and backend folders
- Check all `.env` files are configured

### App Won't Start

- Check console for error messages
- Verify backend dependencies are installed: `cd backend && npm install`
- Verify frontend dependencies: `cd frontend && npm install`

## 📦 Distribution

After building, installers are in `dist/`:
- Windows: `TeachWise AI Setup X.X.X.exe`
- macOS: `TeachWise AI-X.X.X.dmg`
- Linux: `TeachWise AI-X.X.X.AppImage`

Share these installers with users. The app is self-contained with the backend embedded.

## 🔒 Security Notes

- In production, the backend runs on localhost only (not exposed to network)
- Environment variables are read from files in the packaged app
- Consider code signing for Windows/macOS to avoid security warnings

## 📄 License

Private/Proprietary - All rights reserved
