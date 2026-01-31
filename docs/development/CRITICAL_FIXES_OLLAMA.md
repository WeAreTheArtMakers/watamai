# Critical Ollama Fixes - v1.2.0

## 🐛 Düzeltilen Sorunlar

### 1. initAIConfig Sonsuz Döngü ✅
**Sorun**: Console'da sürekli "Calling initAIConfig..." mesajları
**Neden**: Her sayfa değişiminde `loadAIConfig()` çağrılıyor ve `initAIConfig()` tekrar başlatılıyordu
**Çözüm**: 
```javascript
let aiConfigInitialized = false;

async function loadAIConfig() {
  if (aiConfigInitialized) {
    console.log('[AI] Already initialized, skipping...');
    return;
  }
  // ... init code
  aiConfigInitialized = true;
}
```

### 2. DevTools Otomatik Açılma ✅
**Sorun**: Uygulama her açıldığında DevTools açılıyordu
**Neden**: `mainWindow.webContents.openDevTools()` production'da da çalışıyordu
**Çözüm**: DevTools açma kodu yoruma alındı (production'da kapalı)

### 3. Ollama Model İsimleri ✅
**Sorun**: Modeller `:latest` tag'i ile geliyordu (örn: `gemma:latest`, `modAI:latest`)
**Neden**: Ollama API model isimlerini tag ile döndürüyor
**Çözüm**:
```javascript
const models = parsed.models.map(m => {
  const name = m.name || m.model || '';
  return name.split(':')[0]; // Remove :latest tag
}).filter(name => name);
```

### 4. Ollama Bağlantı Hataları ✅
**Sorun**: "Ollama is not running" hatası alınıyordu
**Neden**: 
- Timeout çok kısa (3-5 saniye)
- Hata mesajları yeterince detaylı değildi
- Model tag'leri düzgün işlenmiyordu

**Çözüm**:
- Test timeout: 10 saniye
- Generate timeout: 60 saniye
- Detaylı hata loglama
- Model isimlerinden tag'ler temizlendi

## 🚀 Yeni Build

```
electron/dist/WATAM AI-1.2.0-arm64.dmg  (89MB)
electron/dist/WATAM AI-1.2.0.dmg        (94MB)
```

## 📋 Test Adımları

### 1. Ollama Durumunu Kontrol Et

```bash
# Ollama çalışıyor mu?
brew services list | grep ollama

# Çıktı: ollama started ... (yeşil)
```

### 2. Modelleri Kontrol Et

```bash
# Kurulu modelleri listele
ollama list

# Çıktı örneği:
# NAME              ID              SIZE      MODIFIED
# gemma:latest      abc123...       5.4 GB    2 days ago
# modAI:latest      def456...       4.1 GB    1 week ago
# llama3.2:latest   ghi789...       2.0 GB    3 days ago
```

### 3. API'yi Test Et

```bash
# Ollama API'yi test et
curl http://localhost:11434/api/tags

# Çıktı: {"models":[{"name":"gemma:latest",...}]}
```

### 4. WATAM AI'da Test Et

1. **Yeni DMG'yi kur**
2. **Uygulamayı aç** → DevTools otomatik açılmamalı
3. **AI Agent sekmesine git**
4. **Ollama seç**
5. **Model dropdown'a bak** → Kurulu modeller görünmeli (tag'siz):
   - gemma
   - modAI
   - llama3.2
6. **Model seç** (örn: gemma)
7. **Save Configuration**
8. **Test Connection** → "✅ Ollama connection successful! (LOCAL - gemma)"
9. **Test Reply** → Console'da yanıt görmeli

### 5. Console Kontrolü

**Önceki (Hatalı)**:
```
Calling initAIConfig...
[AI] Initializing AI config page...
[AI] Loading Ollama models...
[AI] Ollama not running, using default models
Loading AI config page...
Calling initAIConfig...
[AI] Initializing AI config page...
... (sonsuz döngü)
```

**Şimdi (Düzeltilmiş)**:
```
Loading AI config page...
Calling initAIConfig...
[AI] Initializing AI config page...
[AI] Loading Ollama models...
[AI] Ollama models found: ["gemma", "modAI", "llama3.2"]
```

## 🔧 Teknik Detaylar

### Model İsmi Temizleme

**Önceki**:
```javascript
const models = parsed.models.map(m => m.name);
// Sonuç: ["gemma:latest", "modAI:latest", "llama3.2:latest"]
```

**Şimdi**:
```javascript
const models = parsed.models.map(m => {
  const name = m.name || m.model || '';
  return name.split(':')[0];
}).filter(name => name);
// Sonuç: ["gemma", "modAI", "llama3.2"]
```

### Timeout Ayarları

| İşlem | Önceki | Şimdi | Neden |
|-------|--------|-------|-------|
| Model Listesi | 3 saniye | 3 saniye | Hızlı olmalı |
| Test Connection | 5 saniye | 10 saniye | Model yükleme süresi |
| Generate Reply | 30 saniye | 60 saniye | Büyük modeller yavaş |

### Hata Loglama

**Önceki**:
```javascript
req.on('error', (error) => {
  console.log('[AI] Ollama not running:', error.message);
  resolve([]);
});
```

**Şimdi**:
```javascript
req.on('error', (error) => {
  console.log('[AI] Ollama connection error:', error.code, error.message);
  resolve([]);
});
```

## 🎯 Beklenen Davranış

### Ollama Çalışıyorsa:
1. Uygulama açılır (DevTools kapalı)
2. AI Agent sekmesine gidilir
3. Ollama seçilir
4. Model dropdown'da kurulu modeller görünür (tag'siz)
5. Model seçilir
6. Test Connection başarılı olur
7. Test Reply yanıt üretir

### Ollama Çalışmıyorsa:
1. Model dropdown'da varsayılan modeller görünür
2. Test Connection "Ollama is not running" hatası verir
3. Console'da detaylı hata mesajı görünür

## 🐛 Sorun Giderme

### "Ollama not running" Hatası

```bash
# 1. Ollama durumunu kontrol et
brew services list | grep ollama

# 2. Çalışmıyorsa başlat
brew services start ollama

# 3. Birkaç saniye bekle
sleep 3

# 4. API'yi test et
curl http://localhost:11434/api/tags

# 5. WATAM AI'ı yeniden başlat
```

### Modeller Görünmüyor

```bash
# 1. Modelleri listele
ollama list

# 2. Model yoksa indir
ollama pull llama3.2

# 3. WATAM AI'ı yeniden başlat
# 4. AI Agent sekmesine git
# 5. Ollama seç → Modeller görünmeli
```

### Console'da Sonsuz Döngü

- Yeni DMG'yi kur
- Eski cache'i temizle: `~/Library/Application Support/watamai-desktop/`
- Uygulamayı yeniden başlat

### DevTools Açılıyor

- Yeni DMG'yi kur
- Production build'de DevTools kapalı olmalı
- Eğer hala açılıyorsa: View > Toggle Developer Tools ile kapat

## 📝 Değiştirilen Dosyalar

1. **electron/renderer/app.js**
   - `aiConfigInitialized` flag eklendi
   - Sonsuz döngü önlendi

2. **electron/main.js**
   - DevTools otomatik açma yoruma alındı
   - `getOllamaModels()` model isimlerinden tag'leri temizliyor
   - `testOllama()` timeout 10 saniyeye çıkarıldı
   - `generateOllama()` timeout 60 saniyeye çıkarıldı
   - Detaylı hata loglama eklendi

## ✅ Kontrol Listesi

Test etmeden önce:
- [ ] Ollama kurulu mu? (`brew list | grep ollama`)
- [ ] Ollama çalışıyor mu? (`brew services list | grep ollama`)
- [ ] En az bir model kurulu mu? (`ollama list`)
- [ ] API çalışıyor mu? (`curl http://localhost:11434/api/tags`)

Test sırasında:
- [ ] DevTools otomatik açılmıyor mu?
- [ ] Console'da sonsuz döngü yok mu?
- [ ] Ollama seçildiğinde modeller görünüyor mu?
- [ ] Model isimleri tag'siz mi? (gemma, modAI, llama3.2)
- [ ] Test Connection başarılı mı?
- [ ] Test Reply yanıt üretiyor mu?

## 🎉 Sonuç

Tüm kritik sorunlar düzeltildi:
- ✅ Sonsuz döngü düzeltildi
- ✅ DevTools kapatıldı
- ✅ Ollama model isimleri düzeltildi
- ✅ Bağlantı hataları düzeltildi
- ✅ Timeout'lar optimize edildi

Yeni DMG'yi kur ve test et! 🚀
