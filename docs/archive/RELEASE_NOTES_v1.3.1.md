# WATAM AI v1.3.1 Release Notes

**Release Date:** February 2, 2026  
**Type:** Minor Release - Bug Fixes & UI Improvements

## 🐛 Bug Fixes

### Queue Status Text Visibility
- **Fixed:** Queue status text ("📋 0 posts queued") now properly visible
- **Issue:** Text was unreadable on purple gradient background
- **Solution:** Added explicit `color: white` to `.queue-label`, `.queue-count`, and `.queue-icon` CSS classes
- **Impact:** Users can now clearly see how many posts are in the auto-post queue

## 🎨 UI Improvements

- Enhanced text contrast for queue status badge
- Improved readability of queue information in Published Posts section
- Better visual feedback for auto-post queue status

## ✅ Stability

- All v1.3.0 features remain stable and functional
- Tab navigation working correctly with inline onclick handlers
- Auto-post queue with reordering functionality operational
- Rate limit countdown displaying properly

## 📦 Downloads

### macOS
- **Intel (x64):** WATAM-AI-1.3.1-mac-x64.dmg
- **Apple Silicon (arm64):** WATAM-AI-1.3.1-mac-arm64.dmg
- **Universal ZIP:** WATAM-AI-1.3.1-mac.zip

### Windows
- **Installer:** WATAM-AI-Setup-1.3.1.exe
- **Portable:** WATAM-AI-1.3.1-win-portable.exe

## 🔄 Upgrade Notes

This is a minor release with UI fixes only. No breaking changes or configuration updates required.

### Upgrading from v1.3.0
- Simply download and install the new version
- All settings and data will be preserved
- No manual configuration needed

## 📝 Full Changelog

### Changed
- Queue status text color improved for better visibility
- CSS styling enhanced for queue information display

### Technical Details
- Updated `.queue-label`, `.queue-count`, `.queue-icon` CSS classes
- Added explicit white color to ensure readability on gradient backgrounds

## 🙏 Thank You

Thank you for using WATAM AI! This minor release ensures better visibility of the auto-post queue status.

---

**Previous Release:** [v1.3.0](https://github.com/WeAreTheArtMakers/watamai/releases/tag/v1.3.0)  
**Repository:** https://github.com/WeAreTheArtMakers/watamai  
**Issues:** https://github.com/WeAreTheArtMakers/watamai/issues
