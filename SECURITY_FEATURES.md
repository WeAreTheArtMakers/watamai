# 🔒 Güvenlik Özellikleri

WATAM AI, güvenli bir sandbox ortamında çalışır ve bilgisayarınızın sadece belirli dosya ve uygulamalarına erişebilir.

## ✅ Neler Yapılabilir?

### Dosya Okuma
- ✅ Proje dosyaları (`src/`, `docs/`, `.kiro/`)
- ✅ Konfigürasyon dosyaları (`.env`, `package.json`)
- ✅ Dokümantasyon (`README.md`, `QUICKSTART.md`)

### Dosya Yazma
- ✅ Log dosyaları (`logs/`)
- ✅ Taslak içerik (`data/drafts/`)
- ✅ Cache dosyaları (`data/cache/`)

### Komut Çalıştırma
- ✅ `npm run cli` (bot komutları)
- ✅ `npm test` (testler)
- ✅ `npm run build` (derleme)

### Network Erişimi
- ✅ `moltbook.com` (Moltbook API)
- ✅ `wearetheartmakers.com` (WATAM)
- ✅ `modfxmarket.com` (modX)
- ✅ `github.com` (kod repository)

## ❌ Neler Engellenmiş?

### Sistem Dosyaları
- ❌ `~/.ssh/` (SSH anahtarları)
- ❌ `~/.aws/` (AWS credentials)
- ❌ `/etc/` (sistem konfigürasyonu)
- ❌ `/System/` (macOS sistem dosyaları)
- ❌ `/Library/` (sistem kütüphaneleri)

### Kişisel Dosyalar
- ❌ `~/Documents/` (dökümanlar)
- ❌ `~/Desktop/` (masaüstü)
- ❌ `~/Downloads/` (indirilenler)
- ❌ `~/Pictures/` (resimler)
- ❌ Proje dışındaki tüm dizinler

### Tehlikeli Komutlar
- ❌ `rm -rf` (dosya silme)
- ❌ `sudo` (yönetici erişimi)
- ❌ `chmod` (izin değiştirme)
- ❌ `curl` / `wget` (serbest download)
- ❌ `ssh` / `scp` (uzak bağlantı)

### Network Kısıtlamaları
- ❌ Whitelist dışındaki tüm domainler
- ❌ Bilinmeyen IP adresleri
- ❌ 80/443 dışındaki portlar

## 🛡️ Güvenlik Katmanları

### 1. Sandbox İzolasyonu
Bot kendi workspace'inde çalışır, dışarı çıkamaz.

```
✅ /Users/user/watamai/src/config.ts
❌ /Users/user/Documents/secret.txt
```

### 2. Path Validasyonu
Her dosya erişimi kontrol edilir.

```typescript
// İzin verilen
await safeReadFile('src/config.ts');

// Engellenen - hata fırlatır
await safeReadFile('~/.ssh/id_rsa');
```

### 3. Komut Whitelisting
Sadece güvenli komutlar çalıştırılabilir.

```typescript
// İzin verilen
safeExecuteCommand('npm run cli fetch-feed');

// Engellenen - hata fırlatır
safeExecuteCommand('rm -rf /');
```

### 4. Network Filtering
Sadece güvenilir domainlere erişim.

```typescript
// İzin verilen
safeNetworkAccess('https://moltbook.com/api/feed');

// Engellenen - hata fırlatır
safeNetworkAccess('https://malicious-site.com');
```

### 5. İhlal Takibi
Tüm güvenlik ihlalleri loglanır.

```bash
npm run cli security-violations
```

## 🔍 Güvenlik Kontrolü

### Durum Kontrolü
```bash
npm run cli security-status
```

**Çıktı:**
```
=== Security Status ===

Sandbox: 🔒 Enabled
Strict Mode: ✅ Yes
Violations: 0
Workspace: /Users/user/watamai

======================
```

### Güvenlik Testi
```bash
npm run cli security-test
```

**Çıktı:**
```
=== Testing Sandbox Security ===

Testing read permissions...
  src/config.ts: ✅
  ~/.ssh/id_rsa: ✅ (blocked)

Testing write permissions...
  logs/test.log: ✅
  ~/Documents/test.txt: ✅ (blocked)

Testing command permissions...
  npm run cli: ✅
  rm -rf /: ✅ (blocked)

Testing network permissions...
  moltbook.com: ✅
  malicious.com: ✅ (blocked)

================================
✅ Security tests completed
```

### İhlal Logları
```bash
npm run cli security-violations
```

**Çıktı:**
```
=== Security Violations ===

1. [read-outside-workspace] ~/.ssh/id_rsa
   Time: 2026-01-31T01:00:00.000Z

2. [execute-blocked] rm -rf /
   Time: 2026-01-31T01:00:05.000Z

===========================
```

## ⚙️ Yapılandırma

Güvenlik ayarları `.kiro/security/sandbox.json` dosyasında:

```json
{
  "security": {
    "enabled": true,
    "strictMode": true,
    "isolatedWorkspace": true
  }
}
```

### Geliştirme Ortamı
Geliştirme sırasında sandbox'ı geçici olarak devre dışı bırakabilirsiniz:

```json
{
  "security": {
    "enabled": false
  }
}
```

**⚠️ Uyarı:** Üretim ortamında mutlaka `enabled: true` olmalı!

### Özel İzinler Ekleme

Yeni bir dizine okuma izni vermek için:

```json
{
  "allowedPaths": {
    "read": [
      "src/*",
      "custom-dir/*"  // Yeni eklenen
    ]
  }
}
```

## 📊 Kaynak Limitleri

Bot kaynak kullanımı da sınırlıdır:

```json
{
  "resourceLimits": {
    "maxMemoryMB": 512,
    "maxCPUPercent": 50,
    "maxFileSize": "10MB",
    "maxConcurrentRequests": 5,
    "requestTimeout": 30000
  }
}
```

## 🚨 İhlal Yönetimi

### Otomatik Uyarılar

10'dan fazla ihlal tespit edilirse:
```
⚠️ Too many security violations! Bot may be compromised.
```

### Log Dosyası

Tüm ihlaller `logs/security.log` dosyasına yazılır:

```
[2026-01-31 01:00:00] WARN: Security violation: read-outside-workspace
  Path: ~/.ssh/id_rsa
  
[2026-01-31 01:00:05] WARN: Security violation: execute-blocked
  Command: rm -rf /
```

## 🎯 Kullanım Örnekleri

### Güvenli Dosya Okuma

```typescript
import { safeReadFile } from './src/security/validator.js';

try {
  const config = await safeReadFile('src/config.ts');
  console.log('✅ File read successfully');
} catch (error) {
  console.error('❌ Access denied:', error.message);
}
```

### Güvenli Dosya Yazma

```typescript
import { safeWriteFile } from './src/security/validator.js';

try {
  await safeWriteFile('logs/app.log', 'Log entry');
  console.log('✅ File written successfully');
} catch (error) {
  console.error('❌ Access denied:', error.message);
}
```

### Güvenli Komut Çalıştırma

```typescript
import { safeExecuteCommand } from './src/security/validator.js';

try {
  safeExecuteCommand('npm run cli fetch-feed');
  console.log('✅ Command allowed');
} catch (error) {
  console.error('❌ Access denied:', error.message);
}
```

## 📚 Daha Fazla Bilgi

- **Detaylı dokümantasyon**: [docs/SECURITY.md](docs/SECURITY.md)
- **Sandbox konfigürasyonu**: [.kiro/security/sandbox.json](.kiro/security/sandbox.json)
- **Validator kodu**: [src/security/validator.ts](src/security/validator.ts)
- **Sandbox implementasyonu**: [src/security/sandbox.ts](src/security/sandbox.ts)

## ✅ Güvenlik Kontrol Listesi

Üretim ortamına geçmeden önce:

- [ ] Sandbox enabled (`security.enabled: true`)
- [ ] Strict mode enabled (`security.strictMode: true`)
- [ ] Isolated workspace (`security.isolatedWorkspace: true`)
- [ ] Minimum read permissions
- [ ] Minimum write permissions
- [ ] Sensitive directories blocked
- [ ] Command whitelist configured
- [ ] Network access restricted
- [ ] Resource limits set
- [ ] Logging enabled
- [ ] Security tests passing

```bash
npm run cli security-test
npm run cli security-status
```

---

**Bot'unuz güvenli bir sandbox'ta çalışıyor. Bilgisayarınızın sadece izin verilen kısımlarına erişebilir.** 🔒✅
