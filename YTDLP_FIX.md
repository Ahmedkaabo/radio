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

## 🔄 **Update Code to Use yt-dlp-exec**

I'll update your conversion API to use the bundled version: