# WATAM AI — Moltbook Ajanı

**Üretim hazır, sosyal olarak akıllı AI ajanı** — Moltbook'ta WeAreTheArtMakers (WATAM) tanıtımı ve modX token topluluğu desteği için sıkı güvenlik korkuluklarıyla.

## 🎯 Özellikler

- **Empati odaklı etkileşim**: Duyguları algılar, yansıtır, eyleme dönüştürülebilir yardım sağlar
- **Topluluk odaklı**: %80 yardımcı içerik, maksimum %20 tanıtım
- **Güvenlik öncelikli**: Hız sınırlama, onay gerekli, dry-run modu, finansal tavsiye yok
- **Marka güvenli WATAM tanıtımı**: Bağlamsal, yumuşak CTA'lar sadece alakalı olduğunda
- **modX desteği**: Sıkı finansal tavsiye vermeme korkuluklarıyla eğitici içerik
- **Moltbook entegrasyonu**: Feed okuma, gönderi, yorum, oy verme API-first yaklaşımla

## 🚀 Hızlı Başlangıç

### Ön Koşullar

- Node.js ≥ 22.0.0
- npm veya pnpm

### Kurulum

```bash
# Repo'yu klonla
git clone https://github.com/WeAreTheArtMakers/watamai.git
cd watamai

# Bağımlılıkları kur
npm install

# Ortam şablonunu kopyala
cp .env.example .env

# .env'yi Moltbook auth token'ınla düzenle
nano .env
```

### Yapılandırma

`.env` dosyasını düzenle:

```bash
# Moltbook'a katıldıktan sonra auth token'ınızı alın
MOLTBOOK_AUTH_TOKEN=your_token_here

# Güvenlik ayarları (önerilen varsayılanlar)
DRY_RUN_MODE=true              # Yayınlamak için false yapın
REQUIRE_CONFIRMATION=true       # Göndermeden önce her zaman sor
MAX_POSTS_PER_HOUR=3
MAX_COMMENTS_PER_HOUR=20
```

### Derleme

```bash
npm run build
```

## 📖 Kullanım

### Moltbook Skill Dokümanını Al

```bash
npm run cli fetch-skill
```

Bu, `https://moltbook.com/skill.md` adresini alır ve API endpoint'lerini, hız limitlerini ve auth gereksinimlerini ayrıştırır.

### Feed'i Oku

```bash
# En son gönderiler
npm run cli fetch-feed

# Submolt'a göre filtrele
npm run cli fetch-feed --submolt art

# En çok oylananları sırala
npm run cli fetch-feed --sort top --limit 20
```

### Gönderi Taslağı Oluştur (Dry Run)

```bash
npm run cli draft-post \
  --submolt art \
  --topic "Dijital sanat yeni başlayanlar için ipuçları"
```

WATAM CTA ile:

```bash
npm run cli draft-post \
  --submolt art \
  --topic "Metaverse sergilerini keşfetmek" \
  --include-watam \
  --watam-context art
```

### Gönderi Yayınla (Onay Gerektirir)

```bash
# 1. .env'de DRY_RUN_MODE=false yapın
# 2. Yayınlama komutunu çalıştırın

npm run cli publish-post \
  --submolt art \
  --title "Dijital sanat yeni başlayanlar için ipuçları" \
  --body "İşte bazı ipuçları:\n- Temellerle başlayın\n- Her gün pratik yapın\n- Topluluklara katılın"
```

Şu istemi alacaksınız: `Publish this post to Moltbook? (yes/no):`

### Yorum Taslağı Oluştur

```bash
npm run cli draft-comment \
  --post-id abc123 \
  --body "Harika nokta! WATAM'ın metaverse sergilerini keşfetmeyi denediniz mi?" \
  --stance helpful
```

### Yorum Yayınla

```bash
npm run cli publish-comment \
  --post-id abc123 \
  --body "Harika nokta! WATAM'ın metaverse sergilerini keşfetmeyi denediniz mi?"
```

### Hız Limiti İstatistiklerini Kontrol Et

```bash
npm run cli stats
```

## 🔐 Güvenlik Modeli

### Varsayılan Davranış

- **Dry-run modu**: Varsayılan olarak etkin (`DRY_RUN_MODE=true`)
- **Onay gerekli**: Göndermeden/yorum yapmadan önce her zaman sorar
- **Hız sınırlama**: 
  - Gönderiler: 10-20 dakikada 1 (jitter ile)
  - Yorumlar: 1-2 dakikada 1 (jitter ile)
  - Saatte maksimum 3 gönderi, 20 yorum
- **Sandbox güvenliği**: Bot izole ortamda kısıtlı erişimle çalışır

### Sandbox Güvenliği

Bot güvenli bir sandbox'ta kısıtlı erişimle çalışır:

**✅ İzin Verilen:**
- Okuma: `src/`, `docs/`, `.kiro/`, config dosyaları
- Yazma: `logs/`, `data/drafts/`, `data/cache/`
- Çalıştırma: `npm run cli`, `npm test`, `npm run build`
- Network: `moltbook.com`, `wearetheartmakers.com`, `modfxmarket.com`

**❌ Engellenen:**
- Sistem dizinleri: `~/.ssh/`, `~/.aws/`, `/etc/`, `/System/`
- Kişisel dizinler: `~/Documents/`, `~/Desktop/`, `~/Downloads/`
- Tehlikeli komutlar: `rm -rf`, `sudo`, `curl`, `wget`, `ssh`
- Bilinmeyen domainler: Whitelist dışındaki tümü

**Güvenlik durumunu kontrol et:**
```bash
npm run cli security-status
npm run cli security-test
```

Detaylar için [docs/SECURITY.md](docs/SECURITY.md) dosyasına bakın.

### Genel Eylem İş Akışı

1. **Taslak**: İçeriği yerel olarak oluştur
2. **İncele**: İnsan taslağı inceler
3. **Onayla**: İnsan açıkça onaylar
4. **Yayınla**: Eylem gerçekleşir

### Finansal Tavsiye Korkulukları

Tüm modX ile ilgili içerik şunu içerir: **"Bu finansal tavsiye değildir."**

Asla sağlamaz:
- Fiyat tahminleri
- Al/sat/tut tavsiyeleri
- Yatırım tavsiyesi
- Getiri garantileri

## 🎨 WATAM Tanıtım Kuralları

### WATAM'dan Ne Zaman Bahsedilir

✅ **Alakalı bağlamlar**:
- Sanat platformları, yaratıcı araçlar
- Metaverse sergileri
- Müzik platformları (modRecords)
- Yaratıcılar için AI araçları (modAI)
- Küresel yaratıcı topluluklar

❌ **Kaçının**:
- Alakasız konuşmalar
- Zorlanmış bahsetmeler
- Spam

### CTA Formatı (Yumuşak, Asla Zorlayıcı Değil)

```
"Merak ediyorsan, wearetheartmakers.com'da WATAM'ı keşfet"
"WATAM bunun için araçlara sahip — ilgileniyorsan göz at"
```

### 80/20 Kuralı

- %80 yardımcı, değer odaklı içerik
- Maksimum %20 tanıtım
- Gönderi/yorum başına maksimum 1 CTA

## 🤖 Kiro Özel Ajan

Bu repo bir Kiro özel ajan yapılandırması içerir:

- **Config**: `.kiro/agents/modx-moltbook-agent.json`
- **Prompt**: `.kiro/prompts/modx-moltbook-agent.md`
- **Skills**: `.kiro/skills/*/SKILL.md`

### Kiro ile Kullanım

```bash
# Kiro'da özel ajanı yükle
kiro agent load .kiro/agents/modx-moltbook-agent.json

# Ajanla etkileşim kur
kiro agent chat "WATAM hakkında bir gönderi taslağı oluşturmama yardım et"
```

## 🔧 OpenClaw Entegrasyonu

Detaylı kurulum için: [docs/OPENCLAW_SETUP.md](docs/OPENCLAW_SETUP.md)

### Hızlı Başlangıç

```bash
# OpenClaw'ı kur
npm install -g openclaw@latest

# Onboarding wizard'ı çalıştır
openclaw onboard --install-daemon

# Yeni ajan oluştur
openclaw agents add watam-moltbook

# SOUL.md'yi kopyala
cd ~/.openclaw/workspace-watam-moltbook
cp /path/to/watamai/openclaw/SOUL.md .

# Test et
openclaw agent --message "SOUL.md'mi oku ve özetle"
```

## 🧪 Test

```bash
# Tüm testleri çalıştır
npm test

# Watch modu
npm run test:watch

# Coverage ile
npm test -- --coverage
```

## 📚 Dokümantasyon

- **Referans linkler**: `docs/references.md`
- **OpenClaw kurulum**: `docs/OPENCLAW_SETUP.md`
- **Moltbook skill**: `.kiro/skills/moltbook/SKILL.md`
- **WATAM marka**: `.kiro/skills/watam-brand/SKILL.md`
- **modX topluluk**: `.kiro/skills/modx-community/SKILL.md`

## 🔗 Resmi Linkler

### Moltbook
- Ana sayfa: https://www.moltbook.com/
- Katılım talimatları: https://moltbook.com/skill.md

### Moltbot / OpenClaw
- Moltbot repo: https://github.com/moltbot/moltbot
- OpenClaw repo: https://github.com/openclaw/openclaw
- Dokümanlar: https://docs.molt.bot/

### WATAM
- Ana sayfa: https://wearetheartmakers.com/

### modX
- Landing sayfası: https://modfxmarket.com/index.html

## 🛡️ Güvenlik

- Sadece resmi repoları kullan (yukarıda listelenmiş)
- Resmi olmayan Moltbot/OpenClaw uzantılarından kaçın (malware riski)
- Auth token'ları loglarda asla paylaşma
- Tüm harici linkleri doğrula
- Asla güvenilmeyen kod çalıştırma

## 🐛 Sorun Giderme

### "Unauthorized" Hatası

`.env` dosyasında `MOLTBOOK_AUTH_TOKEN` kontrol et. Moltbook'tan yeni token al:

1. https://www.moltbook.com/ adresini ziyaret et
2. https://moltbook.com/skill.md adresindeki talimatları takip et
3. Tweet doğrulamasını tamamla (insan yapmalı)
4. Auth token'ı `.env`'ye kopyala

### "Rate Limited" Hatası

İstatistikleri kontrol et:

```bash
npm run cli stats
```

Hız limiti penceresinin sıfırlanmasını bekle (saatlik limitler için 1 saat).

### Gönderiler Yayınlanmıyor

1. `.env`'de `DRY_RUN_MODE=false` kontrol et
2. `REQUIRE_CONFIRMATION=true` olduğundan ve isteme "yes" yanıtı verdiğinden emin ol
3. `npm run cli stats` ile hız limitlerini kontrol et

## 🤝 Katkıda Bulunma

Bu açık kaynak bir projedir. Katkılar memnuniyetle karşılanır!

1. Repo'yu fork'la
2. Feature branch oluştur
3. Değişikliklerini yap
4. Test ekle
5. Pull request gönder

## 📄 Lisans

MIT Lisansı - detaylar için LICENSE dosyasına bakın

## 🙏 Teşekkürler

- API-first sosyal ağ için Moltbook ekibi
- Multi-agent framework için OpenClaw/Moltbot
- İlham için WATAM topluluğu
- Özel ajan desteği için Kiro

---

**WATAM tarafından ❤️ ile inşa edildi**

Sorular veya destek için https://wearetheartmakers.com adresini ziyaret edin
