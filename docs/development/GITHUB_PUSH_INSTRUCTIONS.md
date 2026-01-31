# GitHub'a Yükleme Talimatları

## Durum ✅

- ✅ Git repository başlatıldı
- ✅ v1.0.0 commit yapıldı
- ✅ v1.1.0 (Desktop App) commit yapıldı
- ✅ v1.1.0 tag oluşturuldu
- ⏳ GitHub'a push bekleniyor

## Adımlar

### 1. GitHub Personal Access Token Oluştur

1. GitHub'da: Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token (classic)" tıkla
3. Scope'lar seç:
   - ✅ repo (tüm alt seçenekler)
   - ✅ workflow
4. Token'ı kopyala (bir daha gösterilmeyecek!)

### 2. Git Credential Ayarla

```bash
# Token'ı kullanarak push
git push -u origin main

# Kullanıcı adı: GitHub kullanıcı adınız
# Şifre: Personal Access Token (yukarıda oluşturduğunuz)
```

VEYA

```bash
# Token'ı URL'ye ekleyerek
git remote set-url origin https://YOUR_TOKEN@github.com/WeAreTheArtMakers/watamai.git
git push -u origin main
```

### 3. Tag'leri Push Et

```bash
git push origin v1.1.0
```

VEYA tüm tag'leri:

```bash
git push --tags
```

## Alternatif: SSH Kullan

Eğer SSH key'iniz varsa:

```bash
git remote set-url origin git@github.com:WeAreTheArtMakers/watamai.git
git push -u origin main
git push --tags
```

## Push Sonrası

### 1. GitHub'da Release Oluştur

1. Repository'ye git: https://github.com/WeAreTheArtMakers/watamai
2. Releases → "Create a new release"
3. Tag seç: `v1.1.0`
4. Title: `WATAM AI v1.1.0 - Desktop App`
5. Description:

```markdown
# 🎨 WATAM AI v1.1.0 - Desktop App

Desktop application with modern UI!

## ✨ New Features

### Desktop App
- 🖥️ **Electron-based desktop application**
- 🎨 **Modern dark theme UI**
- 📊 **Dashboard** - Real-time stats and monitoring
- ✍️ **Draft Studio** - Create and preview posts
- ⚙️ **Settings** - Configure agent easily
- 📝 **Logs Viewer** - Monitor activity
- 🔒 **Safe Mode Toggle** - Prevent accidental publishing

### Native Builds
- 🍎 **macOS** - Universal binary (Apple Silicon + Intel)
- 🪟 **Windows** - Native installer

## 📥 Downloads

### macOS
- [Download for Apple Silicon (M1/M2/M3)](https://github.com/WeAreTheArtMakers/watamai/releases/download/v1.1.0/WATAM-AI-arm64.dmg)
- [Download for Intel](https://github.com/WeAreTheArtMakers/watamai/releases/download/v1.1.0/WATAM-AI-x64.dmg)

### Windows
- [Download Installer](https://github.com/WeAreTheArtMakers/watamai/releases/download/v1.1.0/WATAM-AI-Setup.exe)

## 🚀 Quick Start

1. Download and install for your platform
2. Open WATAM AI
3. Go to Settings → Add your Moltbook token
4. Start creating posts!

## 📚 Documentation

- [README](https://github.com/WeAreTheArtMakers/watamai/blob/main/README.md)
- [Desktop App Guide](https://github.com/WeAreTheArtMakers/watamai/blob/main/electron/README.md)
- [Quick Start](https://github.com/WeAreTheArtMakers/watamai/blob/main/QUICKSTART.md)

## 🔒 Security

- Sandbox security enabled
- Safe Mode by default
- Confirmation required for publishing
- No financial advice policy

## 📝 Changelog

See [CHANGELOG.md](https://github.com/WeAreTheArtMakers/watamai/blob/main/CHANGELOG.md)

---

**Built with ❤️ by WeAreTheArtMakers**
```

6. **Assets ekle** (build sonrası):
   - `WATAM-AI-arm64.dmg`
   - `WATAM-AI-x64.dmg`
   - `WATAM-AI-Setup.exe`

7. "Publish release" tıkla

### 2. Build Desktop App

Desktop app'i build etmek için:

```bash
cd electron
npm install
npm run build:all
```

Build dosyaları `electron/dist/` klasöründe olacak.

## Özet

```bash
# 1. Push to GitHub
git push -u origin main
git push --tags

# 2. Build desktop app
cd electron
npm install
npm run build:all

# 3. GitHub'da release oluştur ve build dosyalarını ekle
```

## Sorun Giderme

### "Authentication failed"

Personal Access Token kullanın (yukarıda açıklandı).

### "Repository not found"

Repository'nin oluşturulduğundan emin olun:
https://github.com/WeAreTheArtMakers/watamai

### "Permission denied"

Token'ın `repo` scope'una sahip olduğundan emin olun.

---

**Hazır! GitHub'a push yapabilirsiniz.** 🚀
