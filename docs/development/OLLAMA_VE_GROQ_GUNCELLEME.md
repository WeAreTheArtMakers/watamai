# Ollama ve Groq Güncellemesi - v1.2.0

## Yapılan Değişiklikler

### 1. Ollama Desteği Eklendi ✅

**Ollama Nedir?**
- AI modellerini kendi Mac'inde çalıştır
- API anahtarı gerektirmez
- Tamamen ücretsiz ve sınırsız
- Verileriniz bilgisayarınızdan çıkmaz

**Desteklenen Modeller:**
- llama3.2 (2GB) - Hızlı
- llama3.1 (4.7GB) - Dengeli
- mistral (4.1GB) - Kod için iyi
- phi3 (2.3GB) - Microsoft
- gemma2 (5.4GB) - Google
- qwen2.5 (4.7GB) - Çok dilli

### 2. Groq Modelleri Güncellendi ✅

**Eski (Kullanımdan Kaldırıldı):**
- ❌ llama3-70b-8192
- ❌ llama3-8b-8192

**Yeni (2025):**
- ✅ llama-3.3-70b-versatile (en yeni, önerilen)
- ✅ llama-3.1-8b-instant (hızlı)
- ✅ mixtral-8x7b-32768 (uzun context)
- ✅ gemma2-9b-it (Google)

### 3. API Key Opsiyonel Yapıldı

- Ollama için API key gerekmez
- API key alanı Ollama seçildiğinde gizlenir
- Test ve generate fonksiyonları Ollama'yı destekler

## Yeni Build

```
electron/dist/WATAM AI-1.2.0-arm64.dmg  (89MB)
electron/dist/WATAM AI-1.2.0.dmg        (94MB)
```

## Hızlı Başlangıç

### Seçenek 1: Ollama (Local, Ücretsiz)

```bash
# 1. Ollama'yı kur
brew install ollama

# 2. Başlat
brew services start ollama

# 3. Model indir (llama3.2 önerilir - en hızlı)
ollama pull llama3.2

# 4. Test et
ollama run llama3.2 "Merhaba"
```

**WATAM AI'da:**
1. AI Agent sekmesine git
2. **Ollama (LOCAL)** seç
3. Model seç: **llama3.2**
4. Save Configuration (API key gerekmez!)
5. Test Connection → Başarılı olmalı
6. Test Reply → Console'da yanıt görmeli

### Seçenek 2: Groq (Cloud, Ücretsiz)

```bash
# 1. API key al
# https://console.groq.com adresine git
# Ücretsiz hesap oluştur
# API key oluştur
```

**WATAM AI'da:**
1. AI Agent sekmesine git
2. **Groq (FREE)** seç
3. API key yapıştır
4. Model seç: **llama-3.3-70b-versatile**
5. Save Configuration
6. Test Connection → Başarılı olmalı
7. Test Reply → Console'da yanıt görmeli

## Groq Hatası Çözümü

**Aldığın Hata:**
```
❌ Connection failed: HTTP 400: {"error":{"message":"The model `llama3-70b-8192` has been decommissioned..."}}
```

**Çözüm:**
1. Yeni DMG'yi kur
2. AI Agent sekmesine git
3. Model dropdown'dan **llama-3.3-70b-versatile** seç
4. Save Configuration
5. Test Connection → Artık çalışmalı!

## Karşılaştırma

| Özellik | Ollama | Groq |
|---------|--------|------|
| **Ücret** | Ücretsiz | Ücretsiz |
| **API Key** | ❌ Gerekli değil | ✅ Gerekli |
| **İnternet** | ❌ Gerekli değil | ✅ Gerekli |
| **Kurulum** | Gerekli (5 dk) | Gerekli değil |
| **Hız** | Orta (local) | Çok hızlı (cloud) |
| **Gizlilik** | %100 (local) | Veriler gönderiliyor |
| **Limit** | Yok | 14,400/gün |
| **Disk** | 2-40GB | 0GB |
| **RAM** | 8GB+ | 0GB |

## Hangi Birini Seçmeli?

### Ollama Kullan Eğer:
- ✅ Gizlilik önemliyse
- ✅ Sınırsız kullanım istiyorsan
- ✅ İnternet bağlantısı yoksa
- ✅ API key almak istemiyorsan
- ✅ Disk alanın varsa (2-40GB)

### Groq Kullan Eğer:
- ✅ En hızlı yanıtı istiyorsan
- ✅ Kurulum yapmak istemiyorsan
- ✅ Disk alanın yoksa
- ✅ Günde 14,400 istek yeterliyse

## Test Adımları

### 1. Yeni DMG'yi Kur
```bash
# Eski uygulamayı kapat
# Yeni DMG'yi aç ve kur
```

### 2. DevTools'u Aç
```
View > Toggle Developer Tools
```

### 3. Ollama Test (Opsiyonel)

**Terminal'de:**
```bash
brew install ollama
brew services start ollama
ollama pull llama3.2
ollama run llama3.2 "Test"
```

**WATAM AI'da:**
1. AI Agent → Ollama (LOCAL)
2. Model: llama3.2
3. Save Configuration
4. Test Connection
5. Test Reply

### 4. Groq Test

**WATAM AI'da:**
1. AI Agent → Groq (FREE)
2. API key yapıştır
3. Model: llama-3.3-70b-versatile
4. Save Configuration
5. Test Connection
6. Test Reply

## Console'da Göreceklerin

### Ollama Başarılı:
```
[AI] Testing connection: ollama llama3.2
[AI] Ollama response: 200 {"message":{"content":"test successful"}}
✅ Ollama connection successful! (LOCAL - llama3.2)
```

### Groq Başarılı:
```
[AI] Testing connection: groq llama-3.3-70b-versatile
[AI] Groq response: 200 {"choices":[{"message":{"content":"test successful"}}]}
✅ Groq connection successful! (FREE)
```

### Ollama Çalışmıyorsa:
```
❌ Connection failed: Ollama is not running. Please start Ollama first: brew services start ollama
```

**Çözüm:**
```bash
brew services start ollama
```

## Sorun Giderme

### Ollama "Connection refused"
```bash
# Servisi kontrol et
brew services list | grep ollama

# Başlat
brew services start ollama

# Test et
curl http://localhost:11434/api/tags
```

### Groq "Model decommissioned"
- Yeni DMG'yi kur
- Model dropdown'dan yeni model seç
- llama-3.3-70b-versatile önerilir

### "API key not configured" (Ollama için)
- Ollama seçildiğinde API key gerekmez
- Eğer hata alıyorsan, yeni DMG'yi kur

## Değiştirilen Dosyalar

1. **electron/renderer/ai-config.js**
   - Ollama provider eklendi
   - Groq modelleri güncellendi
   - API key Ollama için opsiyonel yapıldı

2. **electron/renderer/index.html**
   - Ollama dropdown'a eklendi
   - "Local (No API Key Needed)" grubu eklendi

3. **electron/main.js**
   - testOllama() fonksiyonu eklendi
   - generateOllama() fonksiyonu eklendi
   - testGroq() modeli güncellendi (llama-3.1-8b-instant)
   - generateGroq() modeli güncellendi

## Detaylı Dökümanlar

- **OLLAMA_SETUP.md** - Ollama kurulum ve kullanım rehberi
- **AI_AGENT_DEBUG.md** - AI Agent debug rehberi (İngilizce)
- **AI_AJAN_HATA_DUZELTME.md** - AI Agent debug rehberi (Türkçe)
- **FREE_AI_SETUP.md** - Ücretsiz AI sağlayıcılar rehberi

## Sonraki Adımlar

1. ✅ Yeni DMG'yi kur
2. ✅ DevTools'u aç
3. ✅ Ollama veya Groq seç
4. ✅ Test Connection
5. ✅ Test Reply
6. ✅ Console'da sonuçları kontrol et
7. ✅ Başarılıysa Auto-Reply'ı yapılandır
8. ✅ Start Agent

## Destek

Sorun yaşarsan:
1. DevTools Console'u aç
2. Hata mesajını kopyala
3. Hangi provider kullandığını belirt (Ollama/Groq)
4. Bana gönder

Ollama için:
```bash
# Durum bilgisi
brew services list | grep ollama
ollama list
curl http://localhost:11434/api/tags
```

Groq için:
- API key'in doğru olduğundan emin ol
- Model adının doğru olduğunu kontrol et
- Console'daki tam hata mesajını gönder
