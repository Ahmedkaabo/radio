# 🔧 Fix yt-dlp Installation Error

## ❌ **Error**: `spawn yt-dlp ENOENT`

This means the `yt-dlp` binary is not installed on your system. The `yt-dlp-wrap` npm package is just a wrapper - you need the actual binary.

---

## 🛠️ **Quick Fix Options**

### **Option 1: Install yt-dlp Binary (Recommended for Local Development)**

#### **macOS:**
```bash
# Using Homebrew (easiest)
brew install yt-dlp

# Or using pip
pip3 install yt-dlp

# Verify installation
yt-dlp --version
```

#### **Linux/Ubuntu:**
```bash
# Using apt
sudo apt update
sudo apt install yt-dlp

# Or using pip
pip3 install yt-dlp

# Verify installation
yt-dlp --version
```

#### **Windows:**
```bash
# Using winget
winget install yt-dlp

# Or download from GitHub releases
# https://github.com/yt-dlp/yt-dlp/releases

# Verify installation
yt-dlp --version
```

---

### **Option 2: Bundle yt-dlp with Your App (Production Ready)**

For production deployments, it's better to bundle `yt-dlp` with your app:

#### **Install yt-dlp-exec Package:**
```bash
npm install yt-dlp-exec
```

This package includes the yt-dlp binary and works across platforms.

---

---

## ✅ **FIXED! Updated Your Code**

I've updated your conversion API to use `python3 -m yt_dlp` directly, which works with your existing Python installation.

### **What I Changed:**
1. **Removed `yt-dlp-wrap` dependency** - No longer needed
2. **Updated API to use direct command execution** - More reliable
3. **Added proper error handling** - Better debugging
4. **Added timeout protection** - Prevents hanging processes

### **The Fix Works Because:**
- ✅ **yt-dlp is already installed** via pip3
- ✅ **python3 -m yt_dlp** works on your system  
- ✅ **No additional dependencies** needed
- ✅ **Cross-platform compatible**

---

## 🧪 **Test It Now**

1. **Start your app**: `npm run dev`
2. **Login as admin** (passcode: 1234)
3. **Add a YouTube URL** - Should work now!
4. **Watch the conversion status** - No more ENOENT error

---

## 🚀 **For Production Deployment**

### **Ensure yt-dlp is Available:**

#### **Vercel/Netlify:**
Add this to your build command:
```bash
pip install yt-dlp && npm run build
```

#### **Docker:**
```dockerfile
RUN pip install yt-dlp
```

#### **Railway/Render:**
Add to requirements.txt or use buildpacks with Python support.

---

## 🔍 **If You Still Get Errors**

1. **Check Python is available**:
   ```bash
   python3 --version
   ```

2. **Verify yt-dlp works**:
   ```bash
   python3 -m yt_dlp --version
   ```

3. **Test with a URL**:
   ```bash
   python3 -m yt_dlp --extract-audio --audio-format mp3 "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
   ```

**Your fix is ready! The error should be gone now.** 🎉