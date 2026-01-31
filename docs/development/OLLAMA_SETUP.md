# Ollama Kurulumu ve Kullanımı - WATAM AI

## Ollama Nedir?

Ollama, AI modellerini kendi bilgisayarınızda (local) çalıştırmanızı sağlayan ücretsiz bir araçtır. API anahtarına ihtiyaç duymaz, internet bağlantısı gerektirmez ve tamamen ücretsizdir.

## Avantajları

✅ **Tamamen Ücretsiz** - API anahtarı yok, ücret yok
✅ **Gizlilik** - Verileriniz bilgisayarınızdan çıkmaz
✅ **Hız** - İnternet bağlantısı gerektirmez
✅ **Sınırsız** - Rate limit yok, istediğiniz kadar kullanın
✅ **Offline** - İnternet olmadan çalışır

## Dezavantajları

⚠️ **Disk Alanı** - Modeller 2-40GB arası yer kaplar
⚠️ **RAM** - En az 8GB RAM gerekir (16GB önerilir)
⚠️ **İlk Yükleme** - Model indirme 5-30 dakika sürebilir
⚠️ **Performans** - Cloud API'lerden daha yavaş olabilir

## Kurulum (macOS)

### Adım 1: Ollama'yı İndir ve Kur

```bash
# Homebrew ile kurulum (önerilen)
brew install ollama

# VEYA manuel kurulum
# https://ollama.ai adresine git ve macOS installer'ı indir
```

### Adım 2: Ollama Servisini Başlat

```bash
# Servisi başlat
brew services start ollama

# VEYA manuel başlatma
ollama serve
```

### Adım 3: Model İndir

Önerilen modeller (küçükten büyüğe):

```bash
# Llama 3.2 (2GB) - En hızlı, temel görevler için
ollama pull llama3.2

# Llama 3.1 (4.7GB) - Dengeli performans
ollama pull llama3.1

# Mistral (4.1GB) - Kod ve teknik konularda iyi
ollama pull mistral

# Phi3 (2.3GB) - Microsoft'un küçük ama güçlü modeli
ollama pull phi3

# Gemma2 (5.4GB) - Google'ın modeli
ollama pull gemma2

# Qwen2.5 (4.7GB) - Çok dilli destek
ollama pull qwen2.5
```

### Adım 4: Test Et

```bash
# Model çalışıyor mu kontrol et
ollama run llama3.2 "Merhaba, nasılsın?"

# Yüklü modelleri listele
ollama list

# Servis durumunu kontrol et
brew services list | grep ollama
```

## WATAM AI'da Kullanım

### 1. Ollama'nın Çalıştığından Emin Ol

```bash
# Terminal'de kontrol et
curl http://localhost:11434/api/tags

# Çıktı: {"models":[...]} görmeli
```

### 2. WATAM AI'da Yapılandır

1. WATAM AI'ı aç
2. **AI Agent** sekmesine git
3. **AI Provider** dropdown'dan **Ollama (LOCAL)** seç
4. **Model** dropdown'dan yüklediğin modeli seç (örn: llama3.2)
5. **API Key** alanı gizlenecek (gerekli değil)
6. **Save Configuration** tıkla
7. **Test Connection** tıkla → "✅ Ollama connection successful!" görmeli
8. **Test Reply** tıkla → Console'da AI yanıtı görmeli

### 3. Sorun Giderme

#### "Ollama is not running" Hatası

```bash
# Servisi başlat
brew services start ollama

# VEYA manuel başlat
ollama serve
```

#### "Connection refused" Hatası

```bash
# Port'un açık olduğunu kontrol et
lsof -i :11434

# Çıktı yoksa Ollama çalışmıyor, başlat:
brew services restart ollama
```

#### "Model not found" Hatası

```bash
# Modeli indir
ollama pull llama3.2

# Yüklü modelleri kontrol et
ollama list
```

#### Yavaş Yanıt

```bash
# Daha küçük model kullan
ollama pull llama3.2  # En hızlı

# VEYA daha fazla RAM ayır (ollama serve ile başlatırken)
OLLAMA_MAX_LOADED_MODELS=1 ollama serve
```

## Model Karşılaştırması

| Model | Boyut | RAM | Hız | Kalite | Kullanım |
|-------|-------|-----|-----|--------|----------|
| llama3.2 | 2GB | 8GB | ⚡⚡⚡ | ⭐⭐⭐ | Genel, hızlı yanıtlar |
| phi3 | 2.3GB | 8GB | ⚡⚡⚡ | ⭐⭐⭐⭐ | Kod, teknik |
| mistral | 4.1GB | 8GB | ⚡⚡ | ⭐⭐⭐⭐ | Kod, analiz |
| llama3.1 | 4.7GB | 8GB | ⚡⚡ | ⭐⭐⭐⭐ | Genel, dengeli |
| qwen2.5 | 4.7GB | 8GB | ⚡⚡ | ⭐⭐⭐⭐ | Çok dilli |
| gemma2 | 5.4GB | 16GB | ⚡ | ⭐⭐⭐⭐⭐ | Yüksek kalite |

## Öneriler

### Başlangıç İçin
```bash
ollama pull llama3.2
```
- En küçük ve en hızlı
- Temel görevler için yeterli
- 8GB RAM'de rahat çalışır

### Daha İyi Kalite İçin
```bash
ollama pull llama3.1
```
- Dengeli performans/kalite
- Çoğu görev için ideal
- 8GB RAM'de çalışır

### Kod ve Teknik İçin
```bash
ollama pull mistral
```
- Kod yazma ve analiz
- Teknik konularda güçlü
- 8GB RAM'de çalışır

### En İyi Kalite İçin (16GB RAM)
```bash
ollama pull gemma2
```
- En yüksek kalite
- Daha yavaş ama daha iyi
- 16GB RAM önerilir

## Komutlar Özeti

```bash
# Kurulum
brew install ollama

# Başlat
brew services start ollama

# Model indir
ollama pull llama3.2

# Test et
ollama run llama3.2 "Test"

# Modelleri listele
ollama list

# Model sil
ollama rm llama3.2

# Durdur
brew services stop ollama

# Durum kontrol
brew services list | grep ollama
```

## Groq Hatası Düzeltmesi

Groq'ta aldığın hata: `llama3-70b-8192` modeli kullanımdan kaldırılmış.

### Yeni Groq Modelleri (2025)

✅ **llama-3.3-70b-versatile** - En yeni, en iyi (önerilen)
✅ **llama-3.1-8b-instant** - Hızlı, küçük
✅ **mixtral-8x7b-32768** - Uzun context
✅ **gemma2-9b-it** - Google modeli

### WATAM AI'da Groq Kullanımı

1. **AI Agent** sekmesine git
2. **Groq (FREE)** seç
3. API anahtarını yapıştır
4. **Model** dropdown'dan **llama-3.3-70b-versatile** seç
5. **Save Configuration** ve **Test Connection**

## Karşılaştırma: Ollama vs Groq

| Özellik | Ollama | Groq |
|---------|--------|------|
| Ücret | Ücretsiz | Ücretsiz (limit var) |
| API Key | Gerekli değil | Gerekli |
| İnternet | Gerekli değil | Gerekli |
| Hız | Orta | Çok hızlı |
| Gizlilik | %100 | Veriler gönderiliyor |
| Limit | Yok | 14,400/gün |
| Kurulum | Gerekli | Gerekli değil |
| Disk | 2-40GB | 0GB |

## Öneri

**Başlangıç için:** Groq kullan (hızlı, kolay)
**Gizlilik için:** Ollama kullan (local, güvenli)
**Sınırsız kullanım için:** Ollama kullan (limit yok)
**En hızlı için:** Groq kullan (cloud, optimize)

## Destek

Sorun yaşarsan:
1. DevTools Console'u aç (View > Toggle Developer Tools)
2. Hata mesajını kopyala
3. GitHub'da issue aç veya bana gönder

## Kaynaklar

- Ollama: https://ollama.ai
- Ollama GitHub: https://github.com/ollama/ollama
- Model listesi: https://ollama.ai/library
- Groq Console: https://console.groq.com
