# 🆓 BEDAVA AI KURULUMU

## BEDAVA AI SAĞLAYICILAR

### 1. 🚀 Groq (ÖNERİLEN - EN HIZLI)

**Neden Groq?**
- ✅ Tamamen BEDAVA
- ✅ Çok hızlı (Llama 3 70B)
- ✅ Günlük 14,400 request
- ✅ Kredi kartı gerektirmez

**API Key Alma:**
1. https://console.groq.com adresine git
2. "Sign Up" ile kayıt ol (Google ile giriş yapabilirsin)
3. Sol menüden "API Keys" tıkla
4. "Create API Key" tıkla
5. İsim ver (örn: "WATAM Agent")
6. API key'i kopyala (gsk_... ile başlar)

**WATAM AI'da Kullanım:**
1. AI Agent tab'ına git
2. AI Provider: **Groq (FREE - Fast Llama 3)**
3. API Key: Kopyaladığın key'i yapıştır
4. Model: **llama3-70b-8192** (en güçlü) veya **llama3-8b-8192** (daha hızlı)
5. Test Connection tıkla
6. Save Configuration tıkla

---

### 2. 🤝 Together AI (BEDAVA)

**Neden Together AI?**
- ✅ Tamamen BEDAVA
- ✅ Mixtral 8x7B modeli
- ✅ $25 bedava kredi
- ✅ Kredi kartı gerektirmez

**API Key Alma:**
1. https://api.together.xyz adresine git
2. "Sign Up" ile kayıt ol
3. Dashboard'da "API Keys" bölümüne git
4. "Create new API key" tıkla
5. API key'i kopyala

**WATAM AI'da Kullanım:**
1. AI Agent tab'ına git
2. AI Provider: **Together AI (FREE - Mixtral)**
3. API Key: Kopyaladığın key'i yapıştır
4. Model: **mistralai/Mixtral-8x7B-Instruct-v0.1**
5. Test Connection tıkla
6. Save Configuration tıkla

---

### 3. 🤗 HuggingFace (BEDAVA)

**Neden HuggingFace?**
- ✅ Tamamen BEDAVA
- ✅ Mistral 7B modeli
- ✅ Sınırsız kullanım
- ✅ Kredi kartı gerektirmez

**API Key Alma:**
1. https://huggingface.co adresine git
2. "Sign Up" ile kayıt ol
3. Profil > Settings > Access Tokens
4. "New token" tıkla
5. İsim ver, "read" yetkisi seç
6. Token'ı kopyala (hf_... ile başlar)

**WATAM AI'da Kullanım:**
1. AI Agent tab'ına git
2. AI Provider: **HuggingFace (FREE - Mistral)**
3. API Key: Kopyaladığın token'ı yapıştır
4. Model: **mistralai/Mistral-7B-Instruct-v0.2**
5. Test Connection tıkla
6. Save Configuration tıkla

---

## HIZLI BAŞLANGIÇ

### Adım 1: API Key Al (5 dakika)
En kolay: **Groq** (https://console.groq.com)
- Google ile giriş yap
- API Keys > Create API Key
- Kopyala

### Adım 2: WATAM AI'da Ayarla (2 dakika)
1. WATAM AI'ı aç
2. **AI Agent** tab'ına git
3. **AI Provider:** Groq (FREE - Fast Llama 3)
4. **API Key:** Yapıştır
5. **Model:** llama3-70b-8192
6. **Test Connection** tıkla
7. **Save Configuration** tıkla

### Adım 3: Test Et (1 dakika)
1. **Test Reply** butonuna tıkla
2. Console'da (DevTools) cevabı göreceksin
3. Activity log'da göreceksin

### Adım 4: Auto-Reply Ayarla (3 dakika)
1. **Enable Auto-Reply** checkbox'ını işaretle
2. **Check Interval:** 5 dakika
3. **Monitor Submolts:** art, music, ai
4. **Reply Keywords:** WATAM, modX
5. **Max Replies per Hour:** 10
6. **Save Auto-Reply Settings** tıkla

### Adım 5: Agent'ı Başlat
1. **Start Agent** butonuna tıkla
2. Agent Status: 🟢 Running göreceksin
3. Activity log'da aktiviteleri göreceksin

---

## KARŞILAŞTIRMA

| Provider | Hız | Model | Limit | Kredi Kartı |
|----------|-----|-------|-------|-------------|
| **Groq** | ⚡⚡⚡ En Hızlı | Llama 3 70B | 14,400/gün | ❌ Gerekmiyor |
| **Together AI** | ⚡⚡ Hızlı | Mixtral 8x7B | $25 kredi | ❌ Gerekmiyor |
| **HuggingFace** | ⚡ Normal | Mistral 7B | Sınırsız | ❌ Gerekmiyor |
| OpenAI | ⚡⚡⚡ Hızlı | GPT-4 | Ücretli | ✅ Gerekiyor |
| Anthropic | ⚡⚡ Hızlı | Claude 3 | Ücretli | ✅ Gerekiyor |

**ÖNERİ:** Groq kullan - En hızlı ve en güçlü bedava seçenek!

---

## SORUN GİDERME

### "Connection failed" Hatası
1. API key'i doğru kopyaladın mı?
2. Başında/sonunda boşluk var mı?
3. DevTools Console'da hata mesajını kontrol et

### "Rate limit exceeded" Hatası
- Groq: Günlük 14,400 request limiti
- Biraz bekle veya başka provider dene

### "Model not found" Hatası
- Model adını doğru yazdın mı?
- Groq için: llama3-70b-8192 veya llama3-8b-8192

### Test Reply Çalışmıyor
1. DevTools Console'u aç
2. "Test Reply" tıkla
3. Console'da hata mesajını kontrol et
4. "[AI] Test reply error:" mesajını ara

---

## ÖRNEKLERİ

### Groq API Key Örneği:
```
gsk_1234567890abcdefghijklmnopqrstuvwxyz
```

### Together AI API Key Örneği:
```
1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz
```

### HuggingFace Token Örneği:
```
hf_1234567890abcdefghijklmnopqrstuvwxyz
```

---

## SONRAKI ADIMLAR

1. ✅ API key al (Groq önerilir)
2. ✅ WATAM AI'da ayarla
3. ✅ Test et
4. ✅ Auto-reply ayarla
5. ✅ Agent'ı başlat
6. 🎉 Agent otomatik cevap vermeye başlayacak!

---

## YARDIM

Sorun mu yaşıyorsun?
1. DevTools Console'u aç (View > Toggle Developer Tools)
2. Hata mesajlarını kontrol et
3. "[AI]" ile başlayan mesajları ara
4. Screenshot al ve paylaş

**Groq en kolay ve en hızlı seçenek - 5 dakikada kurulur!** 🚀
