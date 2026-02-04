# Agent Recovery Fix - .env'den Yükleme

## Problem
Cache temizlendikten sonra ajan kaydı kayboldu ve "Register Agent" butonu çalışmıyor.

## Çözüm
Ajan bilgileri `.env` dosyasında güvenli bir şekilde saklanıyor. Sistem otomatik olarak `.env` dosyasından yüklüyor ama kullanıcı arayüzünde bu açık değildi.

## Eklenen Özellik: "Load from .env" Butonu

### Settings Sayfası
```
┌─────────────────────────────────────┐
│  Agent Name: watam-agent            │
│  Description: ...                   │
│                                     │
│  [Register Agent] [Load from .env] │
│  💡 If you already have an agent   │
│     in .env file, click "Load      │
│     from .env"                      │
└─────────────────────────────────────┘
```

### Nasıl Çalışır

1. **Otomatik Yükleme** (Backend)
   - Uygulama başladığında `.env` dosyasını kontrol eder
   - Eğer `MOLTBOOK_API_KEY` ve `MOLTBOOK_AGENT_NAME` varsa otomatik yükler
   - Store'a kaydeder

2. **Manuel Yükleme** (Frontend)
   - Kullanıcı "Load from .env" butonuna tıklar
   - Backend'den ajan bilgilerini çeker
   - UI'ı günceller
   - Status kontrolü yapar

## Değişiklikler

### `electron/renderer/index.html`
```html
<!-- Yeni buton eklendi -->
<button id="loadFromEnvBtn" class="btn btn-secondary">
  Load from .env
</button>
<small>💡 If you already have an agent in .env file...</small>
```

### `electron/renderer/settings.js`

#### Yeni Fonksiyon: `loadAgentFromEnv()`
```javascript
async function loadAgentFromEnv() {
  // 1. Backend'den ajan bilgilerini çek
  const result = await window.electronAPI.moltbookGetAgent();
  
  // 2. UI'ı güncelle
  if (result.success && result.agent) {
    currentAgent = result.agent;
    showAgentRegistered();
    updateAgentDisplay();
    
    // 3. Status kontrolü yap
    await checkStatus();
  }
}
```

#### Event Listener Eklendi
```javascript
const loadFromEnvBtn = document.getElementById('loadFromEnvBtn');
if (loadFromEnvBtn) {
  loadFromEnvBtn.onclick = loadAgentFromEnv;
}
```

#### Module Export Güncellendi
```javascript
window.settingsModule = {
  // ...
  loadAgentFromEnv,  // NEW
  // ...
};
```

## .env Dosyası Formatı

```env
# Moltbook Configuration
MOLTBOOK_BASE_URL=https://www.moltbook.com
MOLTBOOK_API_KEY=moltbook_antenna-AMPEDWfB
MOLTBOOK_AGENT_NAME=watam-agent
MOLTBOOK_VERIFICATION_CODE=antenna-AMPE
```

## Kullanım Talimatları

### Senaryo 1: Cache Temizlendikten Sonra
1. Uygulamayı başlat
2. Settings sayfasına git
3. "Load from .env" butonuna tıkla
4. ✅ Ajan bilgileri yüklenir

### Senaryo 2: Yeni Kurulum
1. `.env` dosyasını düzenle
2. Ajan bilgilerini gir
3. Uygulamayı başlat
4. Settings sayfasına git
5. "Load from .env" butonuna tıkla

### Senaryo 3: Otomatik Yükleme
1. `.env` dosyası doğru yapılandırılmış
2. Uygulamayı başlat
3. ✅ Ajan otomatik yüklenir (backend)
4. Settings sayfasına git
5. ✅ Ajan bilgileri görünür

## Backend Mantığı

### `main.js` - `moltbook-get-agent` Handler
```javascript
ipcMain.handle('moltbook-get-agent', async () => {
  let agent = store.getAgent();
  
  // Store'da yoksa .env'den yükle
  if (!agent && process.env.MOLTBOOK_API_KEY) {
    agent = {
      name: process.env.MOLTBOOK_AGENT_NAME,
      apiKeyObfuscated: obfuscateKey(process.env.MOLTBOOK_API_KEY),
      // ...
      loadedFrom: 'env'
    };
    
    // Store'a kaydet
    store.saveAgent(agent);
  }
  
  return { success: true, agent };
});
```

## Güvenlik

- ✅ API key'ler obfuscate ediliyor
- ✅ Frontend'e sadece masked key gönderiliyor
- ✅ Raw API key hiçbir zaman UI'da gösterilmiyor
- ✅ `.env` dosyası `.gitignore`'da

## Test Checklist

- [x] "Load from .env" butonu görünüyor
- [x] Butona tıklandığında ajan yükleniyor
- [x] UI güncelleniyor
- [x] Status kontrolü çalışıyor
- [x] Hata mesajları kullanıcı dostu
- [x] Cache buster güncellendi (v2.0.4)

## Notlar

- Ajan bilgileri `.env` dosyasında güvenli
- Cache temizlense bile `.env` dosyası etkilenmiyor
- "Load from .env" butonu her zaman kullanılabilir
- Otomatik yükleme backend'de çalışıyor
