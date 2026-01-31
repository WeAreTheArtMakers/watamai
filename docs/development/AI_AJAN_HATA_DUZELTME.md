# AI Ajan Hata Düzeltme - v1.2.0

## Sorun
Kullanıcı API anahtarını yapıştırdı ama AI ajanı çalışmıyordu - yapılandırma düzgün kaydedilmiyordu.

## Kök Neden
`electron/main.js` dosyasındaki `save-config` IPC handler'ı tüm AI ile ilgili yapılandırma alanlarını kaçırıyordu. Kullanıcı AI sağlayıcısını ve API anahtarını kaydettiğinde, config dosyasına yazılmıyordu.

## Yapılan Düzeltmeler

### 1. Config Depolama Düzeltildi (electron/main.js)
Hem `get-config` hem de `save-config` handler'larına AI yapılandırma alanları eklendi:
- `aiProvider` - Seçilen AI sağlayıcı (openai, groq, together, huggingface, vb.)
- `aiApiKey` - Sağlayıcı için API anahtarı
- `aiModel` - Seçilen model
- `customEndpoint` - Özel API endpoint (custom sağlayıcı kullanılıyorsa)
- `autoReplyEnabled` - Otomatik yanıt açık/kapalı
- `checkInterval` - Kontrol aralığı (dakika)
- `replySubmolts` - İzlenecek submolt'lar
- `replyKeywords` - Yanıt tetikleyecek anahtar kelimeler
- `maxRepliesPerHour` - Saat başına maksimum yanıt
- `agentRunning` - Ajan çalışma durumu

### 2. Gelişmiş Debug Loglama (electron/renderer/ai-config.js)
`testReply()` fonksiyonuna kapsamlı console loglama eklendi:
- Test Reply tıklandığında mevcut config'i loglar
- Sağlayıcı, API key durumu, model gösterir
- API key uzunluğunu loglar (anahtarı açığa çıkarmadan)
- Detaylı hata mesajları
- Tam response loglama

## Nasıl Test Edilir

### Adım 1: Yeni Build'i Kur
```bash
# Yeni build hazır:
electron/dist/WATAM AI-1.2.0-arm64.dmg  # Apple Silicon için
electron/dist/WATAM AI-1.2.0.dmg        # Intel Mac için
```

### Adım 2: AI Sağlayıcıyı Yapılandır
1. Uygulamayı aç
2. **AI Agent** sekmesine git
3. Bir sağlayıcı seç (örn: **Groq (FREE)**)
4. API anahtarını yapıştır
5. Bir model seç (örn: **llama3-8b-8192**)
6. **Save AI Configuration** butonuna tıkla
7. Şunu ara: "✅ Configuration saved!"

### Adım 3: Bağlantıyı Test Et
1. **Test Connection** butonuna tıkla
2. DevTools'u aç: View > Toggle Developer Tools
3. Console'da `[AI]` ile başlayan mesajları kontrol et
4. Şunu görmelisin: "✅ Connection successful!"

### Adım 4: Yanıt Üretimini Test Et
1. **Test Reply** butonuna tıkla
2. Console'da şunları kontrol et:
   - `[AI] Test Reply button clicked`
   - `[AI] Current config:` - Sağlayıcını ve API key durumunu gösterir
   - `[AI] Calling generateReply...`
   - `=== TEST REPLY ===` - Üretilen yanıtı gösterir
3. Şunu görmelisin: "✅ Test reply generated successfully!"

### Adım 5: Config Kalıcılığını Kontrol Et
1. Uygulamayı tamamen kapat
2. Uygulamayı tekrar aç
3. AI Agent sekmesine git
4. Sağlayıcın ve API anahtarın hala orada olmalı
5. Test Reply'a tekrar tıkla - hemen çalışmalı

## Console'da Aranacak Mesajlar

### Başarılı:
```
[AI] Test Reply button clicked
[AI] Current config: {provider: "groq", hasApiKey: true, model: "llama3-8b-8192", apiKeyLength: 56}
[AI] Calling generateReply...
[AI] Generating reply for: Welcome to WATAM!
[AI] Generated reply: Hey there! Welcome to WATAM...
=== TEST REPLY ===
Hey there! Welcome to WATAM and modX! This community is all about...
=== END TEST REPLY ===
```

### Config Kaydedilmemişse:
```
[AI] Test Reply button clicked
[AI] Current config: {provider: "", hasApiKey: false, model: "", apiKeyLength: 0}
[AI] Missing config: {provider: "", hasKey: false}
```

### API Key Geçersizse:
```
[AI] Test Reply button clicked
[AI] Current config: {provider: "groq", hasApiKey: true, model: "llama3-8b-8192", apiKeyLength: 56}
[AI] Calling generateReply...
[AI] Generation failed: Error: HTTP 401: {"error":"Invalid API key"}
```

## Bedava AI Sağlayıcılar

### Groq (Önerilen - EN HIZLI)
- Website: https://console.groq.com
- Bedava limit: Günde 14,400 istek
- Modeller: llama3-70b-8192, llama3-8b-8192, mixtral-8x7b-32768
- API key formatı: `gsk_...`

### Together AI
- Website: https://api.together.xyz
- Bedava limit: $25 kredi
- Modeller: Mixtral-8x7B, Llama-3-70b, Llama-3-8b
- API key formatı: Uzun alfanumerik string

### HuggingFace
- Website: https://huggingface.co/settings/tokens
- Bedava limit: Sınırsız (rate limited)
- Modeller: Mistral-7B, Meta-Llama-3-8B
- API key formatı: `hf_...`

## Sorun Giderme

### Config Kaydedilmiyor
1. DevTools Console'da hataları kontrol et
2. Şunu ara: `[Main] Config saved:` mesajı
3. Dosyayı kontrol et: `~/Library/Application Support/watamai-desktop/config.json`

### API Key Çalışmıyor
1. API key formatının sağlayıcıyla eşleştiğini doğrula
2. Sağlayıcı dashboard'unda kullanım limitlerini kontrol et
3. Test Reply'dan önce Test Connection'ı dene
4. Console'da HTTP hata kodlarını kontrol et

### Ajan Başlamıyor
1. AI sağlayıcının yapılandırıldığından emin ol
2. Ayarlarda Auto-Reply'ı etkinleştir
3. Console'da `[AI] Agent started` mesajını kontrol et
4. Safe Mode'un kapalı olduğunu doğrula (gerçek gönderi için)

## Sıradaki Adımlar

Test Reply çalıştıktan sonra:
1. Auto-Reply ayarlarını yapılandır
2. Kontrol aralığını ayarla (varsayılan: 5 dakika)
3. İzlenecek submolt'ları ekle (virgülle ayrılmış)
4. Yanıt tetikleyecek anahtar kelimeleri ekle (opsiyonel)
5. Saat başına maksimum yanıtı ayarla (varsayılan: 10)
6. **Start Agent** butonuna tıkla
7. Ajan periyodik olarak feed'i kontrol edip yanıt üretecek

## Değiştirilen Dosyalar
- `electron/main.js` - IPC handler'lara AI config alanları eklendi
- `electron/renderer/ai-config.js` - Gelişmiş debug loglama eklendi
- Build: `electron/dist/WATAM AI-1.2.0-arm64.dmg` (89MB)

## ÖNEMLİ NOTLAR

### DevTools Console Nasıl Açılır
1. Uygulamayı aç
2. Menüden: **View > Toggle Developer Tools**
3. Console sekmesine tıkla
4. Tüm `[AI]` mesajlarını burada göreceksin

### API Key Nereden Alınır

**GROQ (ÖNERİLEN - ÇOK HIZLI):**
1. https://console.groq.com adresine git
2. Ücretsiz hesap oluştur
3. API Keys bölümüne git
4. "Create API Key" tıkla
5. Anahtarı kopyala (gsk_ ile başlar)
6. WATAM AI'da yapıştır

**TOGETHER AI:**
1. https://api.together.xyz adresine git
2. Ücretsiz hesap oluştur ($25 kredi)
3. Settings > API Keys
4. Yeni key oluştur
5. WATAM AI'da yapıştır

**HUGGINGFACE:**
1. https://huggingface.co adresine git
2. Ücretsiz hesap oluştur
3. Settings > Access Tokens
4. "New token" oluştur (Read yetkisi yeterli)
5. Anahtarı kopyala (hf_ ile başlar)
6. WATAM AI'da yapıştır

### Test Adımları (Sırayla)

1. **Yeni DMG'yi kur** → Eski uygulamayı kapat, yeni DMG'yi aç
2. **DevTools'u aç** → View > Toggle Developer Tools
3. **AI Agent sekmesine git** → Sol menüden AI Agent'a tıkla
4. **Sağlayıcı seç** → Groq (FREE) önerilir
5. **API key yapıştır** → Cmd+V ile yapıştır
6. **Model seç** → llama3-8b-8192 önerilir
7. **Save AI Configuration** → Yeşil tik görmeli
8. **Test Connection** → Console'da başarı mesajı görmeli
9. **Test Reply** → Console'da yanıt görmeli
10. **Uygulamayı kapat ve aç** → Ayarlar kalmalı
11. **Test Reply tekrar** → Hemen çalışmalı

### Console'da Ne Görmeli

Başarılı test için Console'da şunları göreceksin:
```
[AI] Test Reply button clicked
[AI] Current config: {provider: "groq", hasApiKey: true, ...}
[AI] Calling generateReply...
[AI] Generating reply for: Welcome to WATAM!
=== TEST REPLY ===
(Burada AI'ın ürettiği yanıt görünecek)
=== END TEST REPLY ===
```

Eğer bunları görmüyorsan, Console'daki hata mesajını bana gönder!
