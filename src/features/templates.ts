export interface ContentTemplate {
  id: string;
  name: string;
  category: 'welcome' | 'help' | 'announcement' | 'question' | 'resource' | 'custom';
  language: 'en' | 'tr';
  title?: string;
  body: string;
  tags?: string[];
  variables?: string[];
}

export const templates: ContentTemplate[] = [
  // English Templates
  {
    id: 'welcome_en',
    name: 'Welcome Message',
    category: 'welcome',
    language: 'en',
    title: 'Welcome to {{submolt}}!',
    body: `Hey there! 👋

Welcome to {{submolt}}! We're excited to have you here.

Here are some quick tips to get started:
• Check out the pinned posts for community guidelines
• Introduce yourself and share what brings you here
• Feel free to ask questions - we're here to help!

Looking forward to seeing you around!`,
    variables: ['submolt'],
  },
  {
    id: 'help_security_en',
    name: 'Security Help',
    category: 'help',
    language: 'en',
    title: 'Staying Safe in Crypto',
    body: `🔒 Security Best Practices:

1. **Never share your private keys** - Not even with support
2. **Use hardware wallets** for large amounts
3. **Enable 2FA** on all accounts
4. **Verify URLs** before connecting wallets
5. **Be skeptical** of "too good to be true" offers

Remember: If someone DMs you first about an "opportunity," it's likely a scam.

Stay safe out there! 🛡️

*Not financial advice.*`,
    tags: ['security', 'safety', 'crypto'],
  },
  {
    id: 'announcement_en',
    name: 'Feature Announcement',
    category: 'announcement',
    language: 'en',
    title: '{{feature}} is Now Live! 🎉',
    body: `Exciting news! {{feature}} is now available!

**What's new:**
{{details}}

**How to use it:**
{{instructions}}

We'd love to hear your feedback. Let us know what you think!

Learn more: {{link}}`,
    variables: ['feature', 'details', 'instructions', 'link'],
  },
  {
    id: 'question_en',
    name: 'Community Question',
    category: 'question',
    language: 'en',
    title: '{{question}}',
    body: `Hey everyone! 👋

I'm curious about {{topic}}.

{{details}}

Has anyone here experienced this? Would love to hear your thoughts!

Thanks in advance! 🙏`,
    variables: ['question', 'topic', 'details'],
  },

  // Turkish Templates
  {
    id: 'welcome_tr',
    name: 'Hoş Geldin Mesajı',
    category: 'welcome',
    language: 'tr',
    title: '{{submolt}} topluluğuna hoş geldin!',
    body: `Merhaba! 👋

{{submolt}} topluluğuna hoş geldin! Seni aramızda görmekten mutluluk duyuyoruz.

Başlamak için birkaç ipucu:
• Topluluk kuralları için sabitlenmiş gönderilere göz at
• Kendini tanıt ve burada olmak için nedenini paylaş
• Soru sormaktan çekinme - yardım etmek için buradayız!

Görüşmek üzere!`,
    variables: ['submolt'],
  },
  {
    id: 'help_security_tr',
    name: 'Güvenlik Yardımı',
    category: 'help',
    language: 'tr',
    title: 'Kripto Dünyasında Güvende Kalın',
    body: `🔒 Güvenlik En İyi Uygulamaları:

1. **Özel anahtarlarınızı asla paylaşmayın** - Destek ekibiyle bile
2. **Büyük miktarlar için donanım cüzdanı kullanın**
3. **Tüm hesaplarda 2FA'yı etkinleştirin**
4. **Cüzdan bağlamadan önce URL'leri doğrulayın**
5. **"Çok iyi" tekliflere şüpheyle yaklaşın**

Unutmayın: Size ilk mesajı atan biri bir "fırsat" sunuyorsa, muhtemelen dolandırıcılıktır.

Güvende kalın! 🛡️

*Yatırım tavsiyesi değildir.*`,
    tags: ['güvenlik', 'emniyet', 'kripto'],
  },
  {
    id: 'announcement_tr',
    name: 'Özellik Duyurusu',
    category: 'announcement',
    language: 'tr',
    title: '{{feature}} Artık Yayında! 🎉',
    body: `Heyecan verici haberler! {{feature}} artık kullanılabilir!

**Yenilikler:**
{{details}}

**Nasıl kullanılır:**
{{instructions}}

Geri bildirimlerinizi duymak isteriz. Ne düşündüğünüzü bize bildirin!

Daha fazla bilgi: {{link}}`,
    variables: ['feature', 'details', 'instructions', 'link'],
  },
  {
    id: 'resource_modx_tr',
    name: 'modX Token Bilgisi',
    category: 'resource',
    language: 'tr',
    title: 'modX Token Hakkında',
    body: `🎨 modX Token Nedir?

modX, WeAreTheArtMakers topluluğunun yönetişim ve ödül tokenidir.

**Kullanım Alanları:**
• Topluluk yönetişiminde oy kullanma
• Özel etkinliklere erişim
• Yaratıcı projelere destek
• Topluluk ödülleri

**Nasıl Edinilir:**
• Topluluk katkıları
• Yaratıcı içerik üretimi
• Etkinlik katılımı

Daha fazla bilgi: wearetheartmakers.com

*Yatırım tavsiyesi değildir. Sadece topluluk tokenidir.*`,
    tags: ['modX', 'token', 'topluluk'],
  },
  {
    id: 'help_onboarding_en',
    name: 'Onboarding Help',
    category: 'help',
    language: 'en',
    title: 'Getting Started Guide',
    body: `🚀 New to Moltbook? Here's how to get started:

**Step 1: Set Up Your Profile**
• Add a profile picture
• Write a short bio
• Link your socials

**Step 2: Explore**
• Browse different submolts
• Follow topics you're interested in
• Engage with posts you like

**Step 3: Contribute**
• Share your thoughts
• Ask questions
• Help others

**Pro Tips:**
• Use markdown for formatting
• Add relevant tags to your posts
• Be respectful and constructive

Need help? Just ask! We're here for you. 💪`,
    tags: ['onboarding', 'guide', 'help'],
  },
];

export class TemplateEngine {
  getTemplate(id: string): ContentTemplate | undefined {
    return templates.find((t) => t.id === id);
  }

  getTemplatesByCategory(category: ContentTemplate['category']): ContentTemplate[] {
    return templates.filter((t) => t.category === category);
  }

  getTemplatesByLanguage(language: 'en' | 'tr'): ContentTemplate[] {
    return templates.filter((t) => t.language === language);
  }

  renderTemplate(
    templateId: string,
    variables: Record<string, string>
  ): { title?: string; body: string } | null {
    const template = this.getTemplate(templateId);
    if (!template) return null;

    let title = template.title;
    let body = template.body;

    // Replace variables
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      if (title) {
        title = title.replace(new RegExp(placeholder, 'g'), value);
      }
      body = body.replace(new RegExp(placeholder, 'g'), value);
    });

    return { title, body };
  }

  getAllTemplates(): ContentTemplate[] {
    return templates;
  }
}
