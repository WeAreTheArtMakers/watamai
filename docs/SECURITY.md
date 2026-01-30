# Güvenlik Dokümantasyonu

WATAM AI güvenli bir sandbox ortamında çalışır. Bot sadece izin verilen dosya ve dizinlere erişebilir.

## Sandbox Yapılandırması

Güvenlik ayarları `.kiro/security/sandbox.json` dosyasında tanımlanır.

### Güvenlik Özellikleri

#### 1. İzole Workspace
Bot sadece kendi workspace'inde çalışır. Dışarıya çıkamaz.

```json
{
  "security": {
    "enabled": true,
    "strictMode": true,
    "isolatedWorkspace": true
  }
}
```

#### 2. Dosya Erişim Kontrolü

**Okuma İzni:**
```json
{
  "allowedPaths": {
    "read": [
      ".env",
      "src/**/*",
      "docs/**/*",
      ".kiro/**/*"
    ]
  }
}
```

**Yazma İzni:**
```json
{
  "allowedPaths": {
    "write": [
      "logs/**/*",
      "data/drafts/**/*",
      "data/cache/**/*"
    ]
  }
}
```

**Bloke Edilen Dizinler:**
```json
{
  "blockedPaths": {
    "paths": [
      "~/.ssh/**",
      "~/.aws/**",
      "~/Documents/**",
      "~/Desktop/**",
      "../**"
    ]
  }
}
```

#### 3. Komut Kontrolü

**İzin Verilen Komutlar:**
```json
{
  "allowedCommands": {
    "commands": [
      "npm run cli",
      "npm test",
      "npm run build"
    ]
  }
}
```

**Bloke Edilen Komutlar:**
```json
{
  "allowedCommands": {
    "blockedCommands": [
      "rm -rf",
      "sudo",
      "chmod",
      "curl",
      "wget",
      "ssh"
    ]
  }
}
```

#### 4. Network Erişim Kontrolü

**İzin Verilen Domainler:**
```json
{
  "networkAccess": {
    "enabled": true,
    "allowedDomains": [
      "moltbook.com",
      "wearetheartmakers.com",
      "modfxmarket.com"
    ],
    "allowedPorts": [443, 80]
  }
}
```

#### 5. Kaynak Limitleri

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

## Kullanım

### Güvenli Dosya Okuma

```typescript
import { safeReadFile } from './src/security/validator.js';

// İzin verilen dosya
const content = await safeReadFile('src/config.ts');

// İzin verilmeyen dosya - hata fırlatır
try {
  await safeReadFile('~/.ssh/id_rsa');
} catch (error) {
  console.error('Access denied!');
}
```

### Güvenli Dosya Yazma

```typescript
import { safeWriteFile } from './src/security/validator.js';

// İzin verilen dizin
await safeWriteFile('logs/app.log', 'Log entry');

// İzin verilmeyen dizin - hata fırlatır
try {
  await safeWriteFile('~/Documents/secret.txt', 'data');
} catch (error) {
  console.error('Access denied!');
}
```

### Güvenli Komut Çalıştırma

```typescript
import { safeExecuteCommand } from './src/security/validator.js';

// İzin verilen komut
safeExecuteCommand('npm run cli fetch-feed');

// İzin verilmeyen komut - hata fırlatır
try {
  safeExecuteCommand('rm -rf /');
} catch (error) {
  console.error('Access denied!');
}
```

### Güvenli Network Erişimi

```typescript
import { safeNetworkAccess } from './src/security/validator.js';

// İzin verilen domain
safeNetworkAccess('https://moltbook.com/api/feed');

// İzin verilmeyen domain - hata fırlatır
try {
  safeNetworkAccess('https://malicious-site.com');
} catch (error) {
  console.error('Access denied!');
}
```

## Güvenlik Raporu

```typescript
import { getSecurityReport } from './src/security/validator.js';

const report = getSecurityReport();

console.log('Sandbox Status:', report.status);
console.log('Violations:', report.violations);
console.log('Recommendations:', report.recommendations);
```

**Örnek Çıktı:**
```
Sandbox Status: {
  enabled: true,
  strictMode: true,
  violations: 0,
  workspaceRoot: '/Users/user/watamai'
}

Violations: []

Recommendations: []
```

## CLI Komutları

### Güvenlik Durumunu Kontrol Et

```bash
npm run cli security-status
```

### İhlal Loglarını Görüntüle

```bash
npm run cli security-violations
```

### Sandbox'ı Test Et

```bash
npm run cli security-test
```

## İhlal Yönetimi

Bot bir güvenlik ihlali tespit ettiğinde:

1. **Log kaydı**: İhlal `logs/security.log` dosyasına yazılır
2. **Uyarı**: Console'a uyarı mesajı yazdırılır
3. **Engelleme**: İşlem engellenir ve hata fırlatılır
4. **İstatistik**: İhlal sayısı takip edilir

**10'dan fazla ihlal olursa:**
```
🚨 Too many security violations! Bot may be compromised.
```

## Üretim Ortamı İçin Öneriler

### 1. Sandbox'ı Etkinleştir

```json
{
  "security": {
    "enabled": true,
    "strictMode": true
  }
}
```

### 2. Minimum İzinler

Sadece gerekli dosya ve dizinlere erişim ver.

### 3. Network Kısıtlamaları

Sadece güvenilir domainlere erişim izni ver.

### 4. Kaynak Limitleri

CPU ve memory kullanımını sınırla.

### 5. Log Monitoring

Güvenlik loglarını düzenli kontrol et.

### 6. Düzenli Güncelleme

Sandbox yapılandırmasını düzenli gözden geçir.

## Güvenlik Kontrol Listesi

- [ ] Sandbox enabled (`security.enabled: true`)
- [ ] Strict mode enabled (`security.strictMode: true`)
- [ ] Isolated workspace (`security.isolatedWorkspace: true`)
- [ ] Minimum read permissions
- [ ] Minimum write permissions
- [ ] Blocked sensitive directories (~/.ssh, ~/.aws, etc.)
- [ ] Command whitelist configured
- [ ] Network access restricted
- [ ] Resource limits set
- [ ] Logging enabled
- [ ] Regular security audits

## Sorun Giderme

### "Access denied" Hatası

Bot bir dosyaya veya komuta erişmeye çalıştığında bu hatayı alıyorsanız:

1. `.kiro/security/sandbox.json` dosyasını kontrol edin
2. İlgili path'i `allowedPaths` listesine ekleyin
3. Veya komutu `allowedCommands` listesine ekleyin

### Sandbox'ı Geçici Olarak Devre Dışı Bırakma

**⚠️ Sadece geliştirme ortamında!**

```json
{
  "security": {
    "enabled": false
  }
}
```

### Güvenlik Loglarını Temizleme

```bash
rm logs/security.log
```

## Güvenlik İletişimi

Güvenlik açığı bulursanız:

1. **GitHub Issues** kullanmayın (public)
2. Email gönderin: security@wearetheartmakers.com
3. Detaylı açıklama yapın
4. Proof of concept ekleyin (opsiyonel)

---

**Güvenlik önceliğimizdir. Bot'un güvenli çalışması için sandbox sistemini kullanın.** 🔒
