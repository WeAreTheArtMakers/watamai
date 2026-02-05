# Cache and Loop Fix - Final Solution

## Problem
Değişiklikler yaptık ama loop devam ediyor çünkü:
1. Electron cache'lenmiş dosyaları kullanıyor
2. Renderer dosyaları (ai-config.js, app.js) güncellenmiş versiyonları yüklemiyor

## Root Cause
- Electron varsayılan olarak JavaScript dosyalarını cache'liyor
- Browser cache nedeniyle eski kod çalışmaya devam ediyor
- Loop fix'leri yüklenmemiş

## Solution

### 1. Cache Buster - index.html
```html
<!-- Önce -->
<script src="ai-config.js"></script>
<script src="app.js"></script>

<!-- Sonra -->
<script src="ai-config.js?v=2.0.1"></script>
<script src="app.js?v=2.0.1"></script>
```

### 2. Electron Cache Clear - main.js
```javascript
// createWindow() fonksiyonunda:
webPreferences: {
  cache: false,  // Disable cache
}

// Ve sayfa yüklenmeden önce:
mainWindow.webContents.session.clearCache().then(() => {
  mainWindow.loadFile('index.html');
});
```

## Değişiklikler

### `electron/renderer/index.html`
- Tüm script tag'lerine `?v=2.0.1` cache buster eklendi

### `electron/main.js`
- `webPreferences.cache: false` eklendi
- `clearCache()` çağrısı eklendi

## Test Adımları

1. **Uygulamayı tamamen kapat**
   ```bash
   # Ctrl+C ile kapat
   ```

2. **Electron cache'ini manuel temizle** (opsiyonel)
   ```bash
   rm -rf ~/Library/Application\ Support/watamai-desktop/
   ```

3. **Uygulamayı yeniden başlat**
   ```bash
   cd electron
   npm start
   ```

4. **Kontrol et:**
   - Console'da "Cache cleared successfully" mesajını gör
   - "Ollama models found" mesajı 1 dakikada bir görünmeli (her saniye değil)
   - "Fetching submolts" mesajı 5 dakikada bir görünmeli (her saniye değil)

## Expected Behavior

### Önce (Loop)
```
[AI] Ollama models found: [...]
[AI] Ollama models found: [...]  // Her saniye
[AI] Ollama models found: [...]
[Submolts] Fetching submolts...
[Submolts] Fetching submolts...  // Her saniye
[Submolts] Fetching submolts...
```

### Sonra (Fixed)
```
[App] Cache cleared successfully
[AI] Loading Ollama models...
[AI] Loaded Ollama models: [...]
[Submolts] Loading submolts...
[Submolts] ✅ Loaded 100 submolts

// 1 dakika sonra:
[AI] Loading Ollama models...

// 5 dakika sonra:
[Submolts] Loading submolts...
```

## Files Changed
1. `electron/renderer/index.html` - Cache buster eklendi
2. `electron/main.js` - Cache clearing eklendi
3. `electron/renderer/ai-config.js` - Cache ve guard eklendi (önceki fix)
4. `electron/renderer/app.js` - Cache eklendi (önceki fix)

## Notes
- Cache buster version'ı her major fix'te artırılmalı
- Production build'de cache enable edilebilir (development'ta disable)
- Hard reload: Cmd+Shift+R (Mac) veya Ctrl+Shift+R (Windows)
