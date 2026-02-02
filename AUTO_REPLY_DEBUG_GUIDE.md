# Auto-Reply Debug Guide

## İki Sorun Tespit Edildi

### 1. Followers/Following Yanlış (0 gösteriyor)
**Beklenen**: 3 followers, 1 following
**Görünen**: 0 followers, 0 following

**Çözüm**: API'den daha fazla field deniyoruz (profile, user objelerini de kontrol ediyoruz)

### 2. Auto-Reply Çalışmıyor
**Durum**: Agent loop çalışıyor ama otomatik cevap vermiyor
**Sebep**: Muhtemelen filtreleme çok katı veya feed boş

## Terminal Loglarını Kontrol Et

Uygulamayı terminalden çalıştır ve şu logları ara:

### 1. Agent Status Check
```
[Moltbook] 🔍 Checking profile/user object for followers/following:
[Moltbook]   - Profile Data: { ... }
[Moltbook] 🎯 Final Values After Fallbacks:
[Moltbook]   - Karma: 51
[Moltbook]   - Followers: 3
[Moltbook]   - Following: 1
```

**Eğer hala 0 gösteriyorsa**:
- "Profile Data" loguna bak
- Hangi field'lar var?
- Buraya yapıştır, düzeltelim

### 2. Agent Loop Check
```
[AI] ========================================
[AI] 🤖 AGENT LOOP STARTING - Checking feed...
[AI] ========================================
[AI] 📋 Agent config: { ... }
```

**Kontrol edilecekler**:
- `autoReply: true` olmalı
- `provider: 'groq'` veya 'ollama' olmalı
- `submolts: 'general, music, art, finance'` gibi bir şey olmalı

### 3. Feed Fetch Check
```
[Feed] 📡 Fetching feed from: https://www.moltbook.com/api/v1/feed
[Feed] ✅ Feed parsed successfully
[Feed] 📊 Feed structure: { hasPosts: true, postsCount: 10 }
```

**Eğer feed boşsa**:
- `postsCount: 0` gösterir
- Bu normal olabilir (yeni post yok)

### 4. Filter Check
```
[AI] 🏷️ Filtering by submolts: [ 'general', 'music', 'art', 'finance' ]
[AI] Filtered by submolts: 5 / 10 posts
[AI] 🔍 Filtering by keywords: [ 'watam-agent', 'watam', 'modx' ]
[AI] Filtered by keywords: 2 / 5 posts
```

**Eğer filtreleme sonrası 0 post kalıyorsa**:
- Submolt filtresi çok katı
- Keyword filtresi çok katı
- Feed'deki postlar filtrelere uymuyor

### 5. Reply Attempt Check
```
[AI] 🎯 Found 2 new posts to potentially reply to
[AI] 🎯 Attempting to reply to post: { id: '...', title: '...' }
[AI] 🧠 Generating AI reply...
[AI] ✅ Reply generated successfully
[AI] 📤 Posting reply to Moltbook...
[AI] ✅ Reply posted successfully!
```

**Eğer bu logları görmüyorsan**:
- Agent loop çalışmıyor
- Veya filtreleme sonrası post kalmıyor
- Veya rate limit aktif

## Hızlı Test

### Test 1: Agent Loop Çalışıyor mu?
1. AI Config tab'ına git
2. "Test Agent Loop" butonuna tıkla
3. Terminal'de `[AI] 🤖 AGENT LOOP STARTING` logunu ara

### Test 2: Feed Geliyor mu?
1. Terminal'de `[Feed] 📊 Feed structure` logunu ara
2. `postsCount` kaç?
3. Eğer 0 ise, feed boş (normal olabilir)

### Test 3: Filtreler Çok Katı mı?
1. AI Config'de "Monitor Submolts" alanını **boşalt** (tüm submoltları izle)
2. "Reply Keywords" alanını **boşalt** (tüm postlara cevap ver)
3. "Save Auto-Reply Settings" tıkla
4. "Stop Agent" sonra "Start Agent" tıkla
5. 1-2 dakika bekle
6. Terminal'de `[AI] 🎯 Found X new posts` logunu ara

### Test 4: Manuel Reply Çalışıyor mu?
1. Dashboard'a git
2. Bir post bul
3. "🎯 Send AI Reply to Specific Post" butonuna tıkla
4. Eğer bu çalışıyorsa, sorun filtrelerde

## Yaygın Sorunlar

### Sorun: "No posts match filters"
**Çözüm**: Filtreleri gevşet veya kaldır
- Monitor Submolts: Boş bırak veya daha fazla submolt ekle
- Reply Keywords: Boş bırak veya daha az keyword kullan

### Sorun: "Rate limited"
**Çözüm**: Bekle
- Moltbook: 1 comment per 20 seconds
- Agent: Max 10 replies per hour (ayarlanabilir)
- Log'da "Next reply allowed in X minutes" gösterir

### Sorun: "Agent not active"
**Çözüm**: Agent claim'i tamamla
1. Settings tab'ına git
2. "Claim URL" ve "Verification Code" bul
3. Claim URL'i aç
4. Tüm adımları tamamla
5. "Check Status" tıkla
6. Status "active" olmalı

### Sorun: "No AI provider configured"
**Çözüm**: AI Config'i tamamla
1. AI Config tab'ına git
2. AI Provider seç (Groq veya Ollama)
3. API Key gir (Ollama için gerekli değil)
4. Model seç
5. "Test Connection" tıkla
6. "Save Configuration" tıkla

## Beklenen Davranış

### Auto-Reply Nasıl Çalışır?

1. **Agent Loop Başlatılır**: "Start Agent" butonuna tıkla
2. **Heartbeat Sistemi**: Her 4 saatte bir Moltbook'u kontrol eder
3. **Hızlı Kontroller**: Her X dakikada bir feed'i kontrol eder (ayarlanabilir)
4. **Filtreleme**: Submolt ve keyword filtrelerine göre postları filtreler
5. **Mention Önceliği**: @watam-agent mention'ları en önce cevaplar
6. **Rate Limit**: Saatte max 10 cevap (ayarlanabilir)
7. **AI Reply**: Groq veya Ollama ile cevap üretir
8. **Post Reply**: Moltbook'a cevabı gönderir
9. **Log**: "Recent Agent Activity" bölümünde gösterir

### Neden Otomatik Cevap Vermiyor?

**Olası Sebepler**:
1. ✅ Agent loop çalışıyor AMA feed boş
2. ✅ Agent loop çalışıyor AMA filtreler çok katı
3. ✅ Agent loop çalışıyor AMA rate limit aktif
4. ✅ Agent loop çalışıyor AMA agent status "active" değil
5. ✅ Agent loop çalışıyor AMA AI provider yapılandırılmamış
6. ❌ Agent loop hiç çalışmıyor (bu durumda "Start Agent" tıkla)

## Terminal Log Örnekleri

### Başarılı Auto-Reply
```
[AI] ========================================
[AI] 🤖 AGENT LOOP STARTING - Checking feed...
[AI] ========================================
[AI] ✅ Updated last check time
[AI] 📋 Agent config: { provider: 'groq', model: 'llama-3.3-70b-versatile' }
[Feed] 📡 Fetching feed from: https://www.moltbook.com/api/v1/feed
[Feed] ✅ Feed parsed successfully
[Feed] 📊 Feed structure: { hasPosts: true, postsCount: 15 }
[AI] 📊 Fetched 15 posts from feed
[AI] 🏷️ Filtering by submolts: [ 'general', 'music', 'art', 'finance' ]
[AI] Filtered by submolts: 8 / 15 posts
[AI] 🔍 No keyword filter specified - considering all posts
[AI] ✅ Found 8 posts matching filters
[AI] 📝 Already replied to 5 posts
[AI] 🎯 Found 3 new posts to potentially reply to
[AI] 🎯 Attempting to reply to post: { id: '123', title: 'Great music discussion' }
[AI] 🧠 Generating AI reply...
[AI] ✅ Reply generated: "Thanks for sharing! I love..."
[AI] 📤 Posting reply to Moltbook...
[AI] ✅ Reply posted successfully!
[AI] 📊 Stats: Replies this hour: 1/10, Today: 1
```

### Başarısız Auto-Reply (Filtreler)
```
[AI] ========================================
[AI] 🤖 AGENT LOOP STARTING - Checking feed...
[AI] ========================================
[Feed] ✅ Feed parsed successfully
[Feed] 📊 Feed structure: { hasPosts: true, postsCount: 20 }
[AI] 📊 Fetched 20 posts from feed
[AI] 🏷️ Filtering by submolts: [ 'crypto', 'blockchain' ]
[AI] Filtered by submolts: 0 / 20 posts
[AI] 🔍 No posts match specified submolts. Available submolts in feed:
[AI] Available submolts: [ 'general', 'music', 'art', 'finance', 'technology' ]
[AI] 💡 TIP: Update your submolt filter in AI Config to match available submolts
```

## Sonraki Adımlar

1. **Terminal'i aç** ve uygulamayı çalıştır
2. **"Start Agent" tıkla** (AI Config tab)
3. **1-2 dakika bekle** (ilk kontrol için)
4. **Terminal loglarını kontrol et** (yukarıdaki örneklere bak)
5. **Logları buraya yapıştır** - birlikte analiz edelim

## Düzeltmeler Yapıldı

### 1. Followers/Following Extraction ✅
- `profile` ve `user` objelerini de kontrol ediyoruz
- Daha fazla field deniyoruz
- Daha detaylı log eklendi

### 2. Agent Loop Logging ✅
- Zaten çok detaylı log var
- Her adım loglanıyor
- Hata durumları açıklanıyor

## Version
v1.3.2 - Auto-Reply Debug Guide

## Status
✅ NO SYNTAX ERRORS
⏳ WAITING FOR TERMINAL LOGS TO DEBUG FURTHER
