# TeachWise AI - Desktop Application

A powerful AI-powered teaching assistant desktop application built with Electron, Next.js, and Express. Generate lesson plans, quizzes, presentations, and more with AI.

![TeachWise AI](https://via.placeholder.com/800x400?text=TeachWise+AI+Desktop)

## ✨ Features

- 🎓 **AI Lesson Plans** - Generate comprehensive lesson plans instantly
- ❓ **Smart Quizzes** - Create customized quizzes with multiple question types  
- 📊 **Presentations** - Auto-generate educational presentations
- 💳 **Credit System** - Flexible credit-based pricing model
- 🎨 **Modern Dark Theme** - Professional Filmora-inspired UI
- 🖥️ **Desktop App** - Native Windows, macOS, and Linux support
- 📱 **PWA Support** - Also works as a Progressive Web App

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/teachwise-mvp.git
cd teachwise-mvp
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

**Backend** (`backend/.env`):
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
OPENAI_API_KEY=your_openai_api_key
ADMIN_JWT_SECRET=your_jwt_secret
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_BACKEND_URL=http://localhost:3003
```

### Development

Run in development mode:
```bash
# Start backend and frontend (web version)
npm run dev

# Start Electron desktop app
npm run electron-dev
```

### Building Desktop App

Build installers for different platforms:
```bash
# Build for Windows
npm run build-win

# Build for macOS  
npm run build-mac

# Build for Linux
npm run build-linux
```

Installers will be created in the `dist/` folder.

## 📱 Installing as Mobile App

### iOS (Safari)
1. Open the app in Safari
2. Tap the "Share" button
3. Select "Add to Home Screen"
4. Tap "Add"

### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home screen"
4. Tap "Add"

### Desktop (Chrome/Edge)
1. Look for the install icon in the address bar
2. Click "Install TeachWise AI"
3. Follow the prompts

## 🎨 Design Features

- **Hero Landing Page**: Beautiful gradient background with floating animations
- **Modal Authentication**: Smooth login/signup experience
- **Mobile-First Design**: Touch-optimized buttons and inputs
- **PWA Install Prompt**: Smart app installation suggestions
- **Responsive Layout**: Adapts to all screen sizes

## 📁 Project Structure

```
teachwise-mvp/
├── frontend/
│   ├── components/
│   │   ├── AuthGate.jsx      # Main auth component with hero design
│   │   ├── Generator.jsx     # AI content generation
│   │   └── ThemeToggle.jsx   # Dark mode toggle
│   ├── pages/
│   │   ├── index.js          # Main app entry point
│   │   └── api/              # API routes
│   ├── public/
│   │   ├── manifest.json     # PWA configuration
│   │   ├── sw.js             # Service worker
│   │   ├── logo.svg          # App logo
│   │   └── favicon.svg       # Favicon
│   └── styles/
│       └── globals.css       # App styling
└── backend/
    ├── index.js              # Express server
    └── package.json          # Dependencies
```

## 🔧 PWA Configuration

The app includes complete PWA setup:

- **Service Worker**: Caches resources for offline use
- **Web App Manifest**: Defines app metadata and icons
- **Install Prompts**: Smart installation suggestions
- **Background Sync**: Sync data when connection returns
- **Push Notifications**: (Ready for implementation)

## 🎯 Mobile Optimizations

- **Touch Targets**: Minimum 44px for accessibility
- **Viewport Handling**: Proper mobile viewport configuration
- **iOS Safari Fixes**: Handles unique iOS browser behaviors
- **Dynamic Viewport Heights**: Uses `dvh` for modern mobile browsers
- **Touch Feedback**: Visual feedback for touch interactions
- **Zoom Prevention**: Prevents accidental zooming on form inputs

## 🎨 Creating App Icons

To generate proper app icons:

1. Open `frontend/icon-generator.html` in your browser
2. Download all generated icon sizes
3. Place them in `frontend/public/icons/` directory
4. Update paths in `manifest.json` if needed

Required icon sizes: 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

## 🚀 Deployment

For production deployment:

1. **Build the frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Vercel/Netlify**
   - Connect your GitHub repository
   - Set environment variables
   - Deploy automatically

3. **Deploy backend**
   - Use Heroku, Railway, or similar service
   - Update frontend environment variables with production API URL

## 🔒 Security Features

- **Environment Variables**: Secure API key storage
- **Input Validation**: Real-time form validation
- **Rate Limiting**: (Backend implementation)
- **CORS Configuration**: Proper cross-origin setup

## 📊 Performance

- **Lighthouse Score**: Optimized for 90+ scores
- **Bundle Size**: Minimized JavaScript bundles
- **Image Optimization**: SVG icons for crisp display
- **Caching Strategy**: Smart service worker caching

## 🐛 Troubleshooting

### Common Issues

1. **Install prompt not showing**: Ensure HTTPS in production
2. **Service worker errors**: Check browser console for details
3. **Icons not loading**: Verify icon paths in manifest.json
4. **Backend connection**: Ensure backend is running on port 3003

### Development Tips

- Use browser DevTools "Application" tab for PWA debugging
- Test on actual mobile devices for best results
- Use "Network" tab to verify offline functionality
- Check "Console" for service worker logs

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on mobile devices
5. Submit a pull request

---

**Happy Teaching with TeachWise AI! 🎓📱**""    # or open README and type one space + save
