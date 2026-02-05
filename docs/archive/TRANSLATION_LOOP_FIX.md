# Translation Loop Fix - Çeviri Döngüsü Düzeltmesi

## Problem / Sorun
1. **Çeviri Loop'u**: Sistem loop'a giriyordu ve AI sağlayıcı seçilmeden otomatik olarak tüm postları çevirmeye çalışıyordu
2. **Ollama Models Loop**: Sürekli Ollama modellerini listeliyordu (her saniye)
3. **Submolts Loop**: Sürekli submolt listesini çekiyordu (her saniye)

## Root Cause / Kök Neden
1. **Çeviri**: `language-manager.js` içindeki `translateAllElements()` ve `translateAllTextNodes()` fonksiyonları post içeriklerini de çeviriyordu
2. **Ollama Loop**: `ai-config.js` dosyasında cache olmadan sürekli Ollama modelleri çekiliyordu
3. **Submolts Loop**: `app.js` dosyasında cache olmadan sürekli submolt listesi çekiliyordu

## Solution / Çözüm

### 1. UI Çevirisi vs Post Çevirisi Ayrımı
- **UI Çevirisi**: Sadece arayüz metinleri (butonlar, başlıklar, menüler) otomatik çevrilir
- **Post Çevirisi**: Kullanıcı manuel olarak "🌐 Çevir" butonuna basmalı

### 2. Ollama Models Cache
```javascript
let ollamaModelsCache = null;
let ollamaModelsLastFetch = 0;
const OLLAMA_CACHE_DURATION = 60000; // 1 minute cache
```

### 3. Submolts Cache
```javascript
let submoltsLastFetch = 0;
const SUBMOLTS_CACHE_DURATION = 300000; // 5 minutes cache
```

### 4. AI Config Auto-Init Guard
```javascript
let aiConfigAutoInitialized = false;
// Prevents multiple initializations
```

## Değişiklikler

### `language-manager.js`
- `translateAllElements()` - Post içerikleri hariç tutuldu
- `translateAllTextNodes()` - Post içerikleri hariç tutuldu
- `translateLiveContent()` - AI sağlayıcı kontrolü eklendi
- `translatePost()` - Hata mesajları iyileştirildi
- `translateComment()` - Hata mesajları iyileştirildi

### `ai-config.js`
- `loadOllamaModels()` - 1 dakika cache eklendi
- `DOMContentLoaded` - Tekrar başlatma koruması eklendi

### `app.js`
- `loadSubmolts()` - 5 dakika cache eklendi
- Cache timestamp güncelleme eklendi

## Test Checklist
- [x] Dil değiştirildiğinde sadece UI çevriliyor
- [x] Postlar otomatik çevrilmiyor
- [x] "🌐 Çevir" butonu AI sağlayıcı kontrolü yapıyor
- [x] Ollama modelleri 1 dakikada bir çekiliyor (loop yok)
- [x] Submoltlar 5 dakikada bir çekiliyor (loop yok)
- [x] AI Config sayfası tekrar tekrar başlatılmıyor
- [x] Hata mesajları kullanıcı dostu

## Files Changed
- `electron/renderer/language-manager.js`
- `electron/renderer/ai-config.js`
- `electron/renderer/app.js`

## Performance Improvements
- Ollama models: ∞ requests/sec → 1 request/min (60x improvement)
- Submolts: ∞ requests/sec → 1 request/5min (300x improvement)
- AI Config init: Multiple → Once per page load
- Translation: All content → UI only (manual for posts)

