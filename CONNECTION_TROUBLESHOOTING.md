# 🚨 TeachWise Connection Issue - Quick Fix Guide

## The Problem
You're seeing a "Connection Issue" error that says "Unable to check trial status. Please refresh the page."

## 🔧 Immediate Solutions (Try in order):

### 1. **Refresh the Page**
- Simply click the "Refresh Page" button or press `Ctrl+F5` (or `Cmd+R` on Mac)
- This resolves most temporary connection issues

### 2. **Check Your Internet Connection**
- Make sure you have a stable internet connection
- Try visiting other websites to confirm connectivity

### 3. **Clear Browser Cache**
- Press `Ctrl+Shift+Delete` (or `Cmd+Shift+Delete` on Mac)
- Select "All time" and clear cache/cookies
- Restart your browser

### 4. **Try a Different Browser**
- Test with Chrome, Firefox, Safari, or Edge
- This helps identify browser-specific issues

### 5. **Check if Backend is Running** (For developers)
- If you're running this locally, ensure the backend server is running on port 3003
- Run `npm run dev-backend` or check if `http://localhost:3003` responds

## 🔍 Use the Diagnostic Tool
1. Click "Show Diagnostics" button on the error screen
2. Click "Run Diagnostics" to see detailed connection information
3. Look for specific error messages and follow the suggestions

## 📱 The Error Details

### What's Happening
- The frontend (what you see) can't communicate with the backend (server)
- This prevents checking your trial status and credits
- The app cannot function without this connection

### Why It Happens
- **Server Issues**: Backend service might be down or overloaded
- **Network Issues**: Your internet connection or firewall blocking requests
- **Browser Issues**: Cache, cookies, or browser extensions interfering
- **Configuration Issues**: Environment variables or routing problems

## 🚀 For Developers

### Environment Setup
Make sure these are configured in `frontend/.env.local`:
```env
NEXT_PUBLIC_BACKEND=http://localhost:3003
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

### Backend Setup
1. Ensure backend is running: `cd backend && npm run dev`
2. Check backend health: visit `http://localhost:3003/health`
3. Test trial endpoint: `http://localhost:3003/trial-status?email=test@example.com`

### Common Fixes
1. **Port conflicts**: Make sure port 3003 isn't used by another service
2. **CORS issues**: Backend should allow frontend origin
3. **Environment variables**: Check all required env vars are set
4. **Dependencies**: Run `npm install` in both frontend and backend directories

## 📞 Still Need Help?

### Check Server Logs
- Look at browser console (F12 → Console tab)
- Check backend logs for error messages
- Note any specific error codes or messages

### Report the Issue
If the problem persists, please report:
1. What browser you're using
2. Your operating system
3. Any error messages from the diagnostic tool
4. Whether you're accessing locally or via the deployed URL

---

**Most connection issues are resolved by refreshing the page or clearing browser cache. Try those first!** 🎯