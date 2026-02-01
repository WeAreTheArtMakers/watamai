# GitHub Release Oluşturma Talimatları

## Adım 1: GitHub'a Git
https://github.com/WeAreTheArtMakers/watamai/releases/new

## Adım 2: Release Bilgilerini Gir

**Tag version**: `v1.3.0`
**Release title**: `WATAM AI v1.3.0 - Tab Navigation Fix & Stability Improvements`

**Description**: (Aşağıdaki metni kopyala)

```markdown
# 🎉 WATAM AI v1.3.0

## What's New

### ✨ Major Features
- **Tab Navigation Fixed**: Persona page tabs now work correctly
- **Version Update**: Updated to v1.3.0 across all UI elements
- **Improved Stability**: Fixed multiple syntax errors and code issues

### 🐛 Bug Fixes
- Fixed tab navigation in Agent Profile & Rewards section
- Removed duplicate code and declarations
- Fixed async/await usage errors
- Improved error handling

## 📦 Downloads

### macOS
- **Intel Macs**: Download `WATAM AI-1.3.0.dmg`
- **Apple Silicon (M1/M2/M3)**: Download `WATAM AI-1.3.0-arm64.dmg`

### Windows
- **Installer**: Download `WATAM AI Setup 1.3.0.exe` (recommended)
- **Portable**: Download `WATAM AI 1.3.0.exe` (no installation)

## 🚀 Quick Start

1. Download the appropriate file for your system
2. Install/Extract the application
3. Launch WATAM AI
4. Configure your Moltbook credentials
5. Start automating!

## ⚠️ Important Notes

- **Not code-signed**: You may see security warnings
- **macOS**: Right-click → Open to bypass Gatekeeper
- **Windows**: Click "More info" → "Run anyway" if SmartScreen appears

## 📝 Full Release Notes

See [RELEASE_v1.3.0.md](https://github.com/WeAreTheArtMakers/watamai/blob/main/RELEASE_v1.3.0.md) for complete details.

---

**Full Changelog**: https://github.com/WeAreTheArtMakers/watamai/compare/v1.2.0...v1.3.0
```

## Adım 3: Dosyaları Yükle

Aşağıdaki dosyaları "Attach binaries" bölümüne sürükle:

### macOS Dosyaları:
- `electron/dist/WATAM AI-1.3.0.dmg` (Intel Mac)
- `electron/dist/WATAM AI-1.3.0-arm64.dmg` (Apple Silicon)
- `electron/dist/WATAM AI-1.3.0-mac.zip` (Intel Mac - alternatif)
- `electron/dist/WATAM AI-1.3.0-arm64-mac.zip` (Apple Silicon - alternatif)

### Windows Dosyaları:
- `electron/dist/WATAM AI Setup 1.3.0.exe` (Installer)
- `electron/dist/WATAM AI 1.3.0.exe` (Portable)

## Adım 4: Yayınla

1. "Set as the latest release" seçeneğini işaretle
2. "Publish release" butonuna tıkla

## Adım 5: Doğrula

Release sayfasını kontrol et:
https://github.com/WeAreTheArtMakers/watamai/releases/tag/v1.3.0

---

## Alternatif: GitHub CLI ile Release Oluşturma

Eğer GitHub CLI yüklüyse, terminal'den şu komutu çalıştır:

```bash
cd /Users/bg/Desktop/watamAI

gh release create v1.3.0 \
  --title "WATAM AI v1.3.0 - Tab Navigation Fix & Stability Improvements" \
  --notes-file RELEASE_v1.3.0.md \
  electron/dist/WATAM\ AI-1.3.0.dmg \
  electron/dist/WATAM\ AI-1.3.0-arm64.dmg \
  electron/dist/WATAM\ AI-1.3.0-mac.zip \
  electron/dist/WATAM\ AI-1.3.0-arm64-mac.zip \
  electron/dist/WATAM\ AI\ Setup\ 1.3.0.exe \
  electron/dist/WATAM\ AI\ 1.3.0.exe
```

Bu komut otomatik olarak release oluşturacak ve tüm dosyaları yükleyecektir.
