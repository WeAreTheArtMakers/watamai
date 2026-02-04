// Language Manager - Centralized translation system
// Handles UI translations and live content translation

class LanguageManager {
  constructor() {
    this.currentLanguage = 'en';
    this.translations = this.initializeTranslations();
    this.translationCache = new Map(); // Cache for live content translations
  }

  initializeTranslations() {
    return {
      en: {
        // Navigation
        'Dashboard': 'Dashboard',
        'Persona': 'Persona',
        'Skills': 'Skills',
        'Drafts': 'Drafts',
        'New Draft': 'New Draft',
        'Posts': 'Posts',
        'AI Agent': 'AI Agent',
        'Settings': 'Settings',
        'Safe Mode': 'Safe Mode',
        
        // Status
        'Active': 'Active',
        'Inactive': 'Inactive',
        'Mastered': 'Mastered',
        'Learning': 'Learning',
        'Locked': 'Locked',
        'Coming Soon': 'Coming Soon',
        'Checking...': 'Checking...',
        'Never': 'Never',
        
        // Dashboard
        'Agent status and recent activity': 'Agent status and recent activity',
        'Agent Status': 'Agent Status',
        'Ready': 'Ready',
        'Active': 'Active',
        'Inactive': 'Inactive',
        'Agent Stats': 'Agent Stats',
        'Karma': 'Karma',
        'Followers': 'Followers',
        'Following': 'Following',
        'Rate Limits': 'Rate Limits',
        'Posts (last hour)': 'Posts (last hour)',
        'Comments (last hour)': 'Comments (last hour)',
        'Security': 'Security',
        'Sandbox': 'Sandbox',
        'Enabled': 'Enabled',
        'Disabled': 'Disabled',
        'Violations': 'Violations',
        'Recent Activity': 'Recent Activity',
        'No recent activity': 'No recent activity',
        
        // Network
        'Find & Follow Users': 'Find & Follow Users',
        'Search for users and manage your network': 'Search for users and manage your network',
        'Search': 'Search',
        'Your Network': 'Your Network',
        'People who follow you and people you follow': 'People who follow you and people you follow',
        'View Your Network on Moltbook': 'View Your Network on Moltbook',
        'You have': 'You have',
        'followers': 'followers',
        'The Moltbook API doesn\'t provide follower lists yet.': 'The Moltbook API doesn\'t provide follower lists yet.',
        'Visit your profile to see who follows you.': 'Visit your profile to see who follows you.',
        'Open Profile on Moltbook': 'Open Profile on Moltbook',
        
        // Persona
        'Agent Profile & Rewards': 'Agent Profile & Rewards',
        'Customize your agent\'s personality and unlock rate limit bonuses': 'Customize your agent\'s personality and unlock rate limit bonuses',
        'Agent Reputation & Rewards': 'Agent Reputation & Rewards',
        'Build your reputation and unlock better rate limits': 'Build your reputation and unlock better rate limits',
        'KARMA POINTS': 'KARMA POINTS',
        'Level': 'Level',
        'Level 1': 'Level 1',
        'Newcomer': 'Newcomer',
        'Start your journey': 'Start your journey',
        'Your Current Benefits': 'Your Current Benefits',
        'POST LIMIT': 'POST LIMIT',
        '1 per 30min': '1 per 30min',
        'per 30min': 'per 30min',
        'COMMENT LIMIT': 'COMMENT LIMIT',
        '10 per hour': '10 per hour',
        'per hour': 'per hour',
        'PRIORITY': 'PRIORITY',
        'Normal': 'Normal',
        'QUALITY BONUS': 'QUALITY BONUS',
        '+0%': '+0%',
        'Progress to Level 2': 'Progress to Level 2',
        'karma': 'karma',
        'How to Earn Karma': 'How to Earn Karma',
        'Get Upvotes': 'Get Upvotes',
        '+10 karma per post upvote': '+10 karma per post upvote',
        '+5 per comment upvote': '+5 per comment upvote',
        'Help Others': 'Help Others',
        '+2 karma for helpful replies': '+2 karma for helpful replies',
        '+5 for solving problems': '+5 for solving problems',
        'Stay Active': 'Stay Active',
        '+1 karma per day for': '+1 karma per day for',
        'consistent posting': 'consistent posting',
        'Quality Content': 'Quality Content',
        '+15 karma for posts': '+15 karma for posts',
        'marked as "high quality"': 'marked as "high quality"',
        'Agent Personality': 'Agent Personality',
        'Define your agent\'s character, tone, and communication style': 'Define your agent\'s character, tone, and communication style',
        'Basic Info': 'Basic Info',
        'Personality': 'Personality',
        'Expertise': 'Expertise',
        'Communication Style': 'Communication Style',
        'Display Name': 'Display Name',
        'How your agent introduces itself': 'How your agent introduces itself',
        'Agent Bio': 'Agent Bio',
        'Brief description of your agent (used in profiles and introductions)': 'Brief description of your agent (used in profiles and introductions)',
        'Primary Role': 'Primary Role',
        'Save Agent Profile': 'Save Agent Profile',
        'Test Personality': 'Test Personality',
        'Reset to Default': 'Reset to Default',
        'Rate Limit Boost Challenges': 'Rate Limit Boost Challenges',
        'Complete challenges to unlock faster posting and commenting': 'Complete challenges to unlock faster posting and commenting',
        'Quality Creator': 'Quality Creator',
        'Get 5 upvotes on your posts': 'Get 5 upvotes on your posts',
        'Reward: +1 post per hour': 'Reward: +1 post per hour',
        'Community Helper': 'Community Helper',
        'Reply to 10 different posts': 'Reply to 10 different posts',
        'Reward: +5 comments per hour': 'Reward: +5 comments per hour',
        'First Steps': 'First Steps',
        'Complete agent setup': 'Complete agent setup',
        'Reward: Basic posting enabled': 'Reward: Basic posting enabled',
        'Trusted Agent': 'Trusted Agent',
        'Reach 100 karma points': 'Reach 100 karma points',
        'Reward: Priority posting queue': 'Reward: Priority posting queue',
        '1/5': '1/5',
        '3/10': '3/10',
        '0': '0',
        'posts queued': 'posts queued',
        'NEXT POST AVAILABLE': 'NEXT POST AVAILABLE',
        'Due to Moltbook rate limits': 'Due to Moltbook rate limits',
        
        // Skills
        'Technical Skills & Integrations': 'Technical Skills & Integrations',
        'Configure advanced features and external integrations': 'Configure advanced features and external integrations',
        'Moltbook Platform Mastery': 'Moltbook Platform Mastery',
        'Learn and master Moltbook-specific features': 'Learn and master Moltbook-specific features',
        'Basic Posting': 'Basic Posting',
        'Mastered': 'Mastered',
        'Create and publish posts to submolts': 'Create and publish posts to submolts',
        'Comment Engagement': 'Comment Engagement',
        'Learning': 'Learning',
        'Reply to posts and engage in discussions': 'Reply to posts and engage in discussions',
        'Submolt Creation': 'Submolt Creation',
        'Locked': 'Locked',
        'Create and manage your own submolts': 'Create and manage your own submolts',
        'Requires: 500 karma points': 'Requires: 500 karma points',
        'Moderation Tools': 'Moderation Tools',
        'Help moderate communities': 'Help moderate communities',
        'Requires: Trusted Agent status': 'Requires: Trusted Agent status',
        'External Integrations': 'External Integrations',
        'Connect your agent to external services and APIs': 'Connect your agent to external services and APIs',
        'Twitter/X Integration': 'Twitter/X Integration',
        'Cross-post to Twitter and sync engagement': 'Cross-post to Twitter and sync engagement',
        'Coming Soon': 'Coming Soon',
        'Analytics Dashboard': 'Analytics Dashboard',
        'Track performance and engagement metrics': 'Track performance and engagement metrics',
        'Custom AI Models': 'Custom AI Models',
        'Train custom models on your content': 'Train custom models on your content',
        'Mobile Notifications': 'Mobile Notifications',
        'Get notified of important events': 'Get notified of important events',
        'Advanced Configuration': 'Advanced Configuration',
        'Fine-tune your agent\'s technical behavior': 'Fine-tune your agent\'s technical behavior',
        'API Timeout (seconds)': 'API Timeout (seconds)',
        'How long to wait for API responses': 'How long to wait for API responses',
        'Retry Attempts': 'Retry Attempts',
        'Number of times to retry failed requests': 'Number of times to retry failed requests',
        'Log Level': 'Log Level',
        'Enable Performance Metrics': 'Enable Performance Metrics',
        'Collect performance data to improve agent efficiency': 'Collect performance data to improve agent efficiency',
        'Save Configuration': 'Save Configuration',
        'Export Config': 'Export Config',
        'Import Config': 'Import Config',
        
        // Drafts
        'Saved Drafts': 'Saved Drafts',
        'Manage your draft posts': 'Manage your draft posts',
        'Clean Queue': 'Clean Queue',
        'Remove orphaned queue items': 'Remove orphaned queue items',
        'No saved drafts yet. Create one in New Draft!': 'No saved drafts yet. Create one in New Draft!',
        
        // New Draft
        'Create and preview posts before publishing': 'Create and preview posts before publishing',
        'Submolt': 'Submolt',
        'Choose the right submolt for better engagement': 'Choose the right submolt for better engagement',
        'Create New': 'Create New',
        'Topic / Title': 'Topic / Title',
        'Post Content': 'Post Content',
        'Include WATAM CTA': 'Include WATAM CTA',
        
        // Posts
        'Published Posts': 'Published Posts',
        'Track your posts and respond to comments': 'Track your posts and respond to comments',
        'Refresh': 'Refresh',
        'Fix URLs': 'Fix URLs',
        'posts queued': 'posts queued',
        'NEXT POST AVAILABLE': 'NEXT POST AVAILABLE',
        'Due to Moltbook rate limits': 'Due to Moltbook rate limits',
        'View on Moltbook': 'View on Moltbook',
        'views': 'views',
        'comments': 'comments',
        'View Comments': 'View Comments',
        'Quick Reply': 'Quick Reply',
        'Auto-posted': 'Auto-posted',
        
        // AI Agent
        'AI Agent Configuration': 'AI Agent Configuration',
        'Configure AI model for automatic responses': 'Configure AI model for automatic responses',
        'AI Provider': 'AI Provider',
        'Select your AI provider and enter API credentials': 'Select your AI provider and enter API credentials',
        'Ollama runs locally (no API key, unlimited), Groq is fastest cloud option': 'Ollama runs locally (no API key, unlimited), Groq is fastest cloud option',
        'Model': 'Model',
        'Test Connection': 'Test Connection',
        'Auto-Reply Settings': 'Auto-Reply Settings',
        'Configure automatic response behavior': 'Configure automatic response behavior',
        'Enable Auto-Reply': 'Enable Auto-Reply',
        'Agent will automatically respond to posts and comments': 'Agent will automatically respond to posts and comments',
        'Check Interval (minutes)': 'Check Interval (minutes)',
        'How often to check for new posts (minimum 1 minute)': 'How often to check for new posts (minimum 1 minute)',
        'Monitor Submolts': 'Monitor Submolts',
        'Comma-separated list of submolts to monitor (leave empty for all)': 'Comma-separated list of submolts to monitor (leave empty for all)',
        'Reply Keywords': 'Reply Keywords',
        'Only reply to posts containing these keywords (leave empty for all)': 'Only reply to posts containing these keywords (leave empty for all)',
        'Max Replies per Hour': 'Max Replies per Hour',
        'Moltbook limit is 20 comments/hour': 'Moltbook limit is 20 comments/hour',
        'Save Auto-Reply Settings': 'Save Auto-Reply Settings',
        'Advanced AI Settings': 'Advanced AI Settings',
        'Fine-tune AI response quality and behavior': 'Fine-tune AI response quality and behavior',
        'Response Length': 'Response Length',
        'Control how verbose the AI responses should be': 'Control how verbose the AI responses should be',
        'Response Style': 'Response Style',
        'Set the tone and style of AI responses': 'Set the tone and style of AI responses',
        'Creativity Level (Temperature)': 'Creativity Level (Temperature)',
        'Focused': 'Focused',
        'Creative': 'Creative',
        'Lower = more focused and consistent, Higher = more creative and varied': 'Lower = more focused and consistent, Higher = more creative and varied',
        'Use Persona & Skills': 'Use Persona & Skills',
        'Include your persona and skills in AI context (recommended)': 'Include your persona and skills in AI context (recommended)',
        'Avoid Repetitive Responses': 'Avoid Repetitive Responses',
        'AI will try to vary responses to similar posts': 'AI will try to vary responses to similar posts',
        'Save Advanced Settings': 'Save Advanced Settings',
        'AUTO-REPLY:': 'AUTO-REPLY:',
        'Enabled (not running)': 'Enabled (not running)',
        'AI PROVIDER:': 'AI PROVIDER:',
        'Ollama (LOCAL)': 'Ollama (LOCAL)',
        'LOCAL': 'LOCAL',
        'LAST CHECK:': 'LAST CHECK:',
        'Never': 'Never',
        'REPLIES TODAY:': 'REPLIES TODAY:',
        'Start Agent': 'Start Agent',
        'Stop Agent': 'Stop Agent',
        'Test Reply': 'Test Reply',
        'Test Agent Loop': 'Test Agent Loop',
        'Test Heartbeat': 'Test Heartbeat',
        'Debug & Fix Issues': 'Debug & Fix Issues',
        'Send AI Reply to Specific Post': 'Send AI Reply to Specific Post',
        'Enter a Moltbook post URL to send an AI-generated reply': 'Enter a Moltbook post URL to send an AI-generated reply',
        'Post URL': 'Post URL',
        'Example:': 'Example:',
        'Generate & Send Reply': 'Generate & Send Reply',
        'Recent Agent Activity': 'Recent Agent Activity',
        'No activity yet': 'No activity yet',
        
        // Settings
        'Configure your agent and Moltbook connection': 'Configure your agent and Moltbook connection',
        'Moltbook Agent (Legacy)': 'Moltbook Agent (Legacy)',
        'Traditional agent registration with direct API key': 'Traditional agent registration with direct API key',
        'Register your agent with Moltbook to start posting and commenting.': 'Register your agent with Moltbook to start posting and commenting.',
        // Agent Registration
        'Traditional agent registration with direct API key': 'Traditional agent registration with direct API key',
        'Register your agent with Moltbook to start posting and commenting.': 'Register your agent with Moltbook to start posting and commenting.',
        'Registration Limit': 'Registration Limit',
        'Only 1 agent can be registered per IP address per day. If you already have an agent, use "Load from .env" instead.': 'Only 1 agent can be registered per IP address per day. If you already have an agent, use "Load from .env" instead.',
        
        'Agent Name': 'Agent Name',
        'Agent Description (optional)': 'Agent Description (optional)',
        'Register Agent': 'Register Agent',
        'Load from .env': 'Load from .env',
        'Registering...': 'Registering...',
        'Loading...': 'Loading...',
        'Agent registered successfully! Complete the claim process to activate.': 'Agent registered successfully! Complete the claim process to activate.',
        'Claim URL': 'Claim URL',
        'Verification Code': 'Verification Code',
        'Open': 'Open',
        'Copy': 'Copy',
        'Steps to complete claim:': 'Steps to complete claim:',
        'Click "Open" to visit the claim URL in your browser': 'Click "Open" to visit the claim URL in your browser',
        'Log in to your Moltbook account': 'Log in to your Moltbook account',
        'Enter the verification code': 'Enter the verification code',
        'Complete any required steps (e.g., tweet verification)': 'Complete any required steps (e.g., tweet verification)',
        'Return here and click "I completed claim"': 'Return here and click "I completed claim"',
        'I completed claim': 'I completed claim',
        'Checking...': 'Checking...',
        'Check Status': 'Check Status',
        'Agent Name:': 'Agent Name:',
        'API Key:': 'API Key:',
        'Registered:': 'Registered:',
        'Agent is active and ready to use!': 'Agent is active and ready to use!',
        'Claim not completed. Visit the claim URL above and complete verification on Moltbook.': 'Claim not completed. Visit the claim URL above and complete verification on Moltbook.',
        'Cannot connect to Moltbook. This is usually a temporary server issue. Check moltbook.com to see if the site is working, then try again.': 'Cannot connect to Moltbook. This is usually a temporary server issue. Check moltbook.com to see if the site is working, then try again.',
        'Moltbook server error. This is temporary - your agent is likely still valid. Try again later.': 'Moltbook server error. This is temporary - your agent is likely still valid. Try again later.',
        'Agent verification failed. If this persists, you may need to re-register your agent.': 'Agent verification failed. If this persists, you may need to re-register your agent.',
        'No agent found in .env file. Please check your .env configuration.': 'No agent found in .env file. Please check your .env configuration.',
        'Failed to load agent:': 'Failed to load agent:',
        
        // AI Config - Model Dropdown
        'Loading models...': 'Loading models...',
        'Select Model': 'Select Model',
        'Installed Models': 'Installed Models',
        'No models found. Run: ollama pull llama3.2': 'No models found. Run: ollama pull llama3.2',
        'No models available': 'No models available',
        'Error loading models': 'Error loading models',
        
        // New Draft Page
        'New Draft': 'New Draft',
        'Create and preview posts before publishing': 'Create and preview posts before publishing',
        'Search submolts...': 'Search submolts...',
        'Choose the right submolt for better engagement': 'Choose the right submolt for better engagement',
        'Create New': 'Create New',
        'Topic / Title': 'Topic / Title',
        'Enter post title': 'Enter post title',
        'Post Content': 'Post Content',
        'Write your post content here...': 'Write your post content here...',
        'Include WATAM CTA': 'Include WATAM CTA',
        'Add "Learn more at wearetheartmakers.com" to the end of your post': 'Add "Learn more at wearetheartmakers.com" to the end of your post',
        'Save Draft': 'Save Draft',
        'Preview': 'Preview',
        'Publish to Moltbook': 'Publish to Moltbook',
        'Copy as Markdown': 'Copy as Markdown',
        
        // Skills Page
        'Learn and master Moltbook-specific features': 'Learn and master Moltbook-specific features',
        'Basic Posting': 'Basic Posting',
        'Comment Engagement': 'Comment Engagement',
        'Submolt Creation': 'Submolt Creation',
        'Moderation Tools': 'Moderation Tools',
        'Create and publish posts to submolts': 'Create and publish posts to submolts',
        'Reply to posts and engage in discussions': 'Reply to posts and engage in discussions',
        'Create and manage your own submolts': 'Create and manage your own submolts',
        'Help moderate communities': 'Help moderate communities',
        'Requires: 500 karma points': 'Requires: 500 karma points',
        'Requires: Trusted Agent status': 'Requires: Trusted Agent status',
        'Fine-tune your agent\'s technical behavior and integrations': 'Fine-tune your agent\'s technical behavior and integrations',
        'External Integrations': 'External Integrations',
        'Connect your agent to external services and APIs': 'Connect your agent to external services and APIs',
        'Twitter/X Integration': 'Twitter/X Integration',
        'Cross-post to Twitter and sync engagement': 'Cross-post to Twitter and sync engagement',
        'Analytics Dashboard': 'Analytics Dashboard',
        'Track performance and engagement metrics': 'Track performance and engagement metrics',
        'Custom AI Models': 'Custom AI Models',
        'Train custom models on your content': 'Train custom models on your content',
        'Mobile Notifications': 'Mobile Notifications',
        'Get notified of important events': 'Get notified of important events',
        'Technical Settings': 'Technical Settings',
        
        'Agent loaded from .env file successfully!': 'Agent loaded from .env file successfully!',
        'Re-fetch skill.md': 'Re-fetch skill.md',
        'Fetching...': 'Fetching...',
        'skill.md fetched and cached successfully!': 'skill.md fetched and cached successfully!',
        'Failed to fetch skill.md': 'Failed to fetch skill.md',
        'Reset Agent': 'Reset Agent',
        'Are you sure you want to COMPLETELY RESET the agent?': 'Are you sure you want to COMPLETELY RESET the agent?',
        'This will delete:': 'This will delete:',
        '- Agent registration and API key': '- Agent registration and API key',
        '- All configuration settings': '- All configuration settings',
        '- AI provider settings': '- AI provider settings',
        '- Auto-reply settings': '- Auto-reply settings',
        '- All drafts and queue': '- All drafts and queue',
        'You will need to register a new agent and reconfigure everything.': 'You will need to register a new agent and reconfigure everything.',
        'Agent completely reset! Please restart the application and register a new agent.': 'Agent completely reset! Please restart the application and register a new agent.',
        'Rate Limits': 'Rate Limits',
        'Max Posts per Hour': 'Max Posts per Hour',
        'Max Comments per Hour': 'Max Comments per Hour',
        'Save Rate Limits': 'Save Rate Limits',
        'Rate limits saved successfully': 'Rate limits saved successfully',
        'Failed to save rate limits': 'Failed to save rate limits',
        'Rate limit: Wait': 'Rate limit: Wait',
        'minutes': 'minutes',
        'Rate limit exceeded. Please wait before posting again.': 'Rate limit exceeded. Please wait before posting again.',
        'Rate limit exceeded. Please wait before commenting again.': 'Rate limit exceeded. Please wait before commenting again.',
        
        // Moltbook Connection Errors
        'Cannot connect to Moltbook - Server might be down': 'Cannot connect to Moltbook - Server might be down',
        'Moltbook server is very slow - Please try again later': 'Moltbook server is very slow - Please try again later',
        'Cannot reach Moltbook - Check your internet connection': 'Cannot reach Moltbook - Check your internet connection',
        'Moltbook Error:': 'Moltbook Error:',
        'Failed to load agent stats - Check console for details': 'Failed to load agent stats - Check console for details',
        'Connection Error': 'Connection Error',
        'Active': 'Active',
        'Error': 'Error',
        'Moltbook Identity System': 'Moltbook Identity System',
        'Advanced token-based authentication with reputation tracking': 'Advanced token-based authentication with reputation tracking',
        'Current Status: This feature is in development.': 'Current Status: This feature is in development.',
        'Agent Status:': 'Agent Status:',
        'Identity Token:': 'Identity Token:',
        'No token': 'No token',
        'Current Auth:': 'Current Auth:',
        'API Key (Twitter verified)': 'API Key (Twitter verified)',
        'Generate Identity Token': 'Generate Identity Token',
        'Test Token': 'Test Token',
        'About Identity System': 'About Identity System',
        'The Moltbook Identity System will provide:': 'The Moltbook Identity System will provide:',
        'Secure Tokens: Time-limited authentication tokens': 'Secure Tokens: Time-limited authentication tokens',
        'Reputation Tracking: Agent karma and trust scores': 'Reputation Tracking: Agent karma and trust scores',
        'Cross-Service Auth: Use your Moltbook identity elsewhere': 'Cross-Service Auth: Use your Moltbook identity elsewhere',
        'Enhanced Security: Granular permission controls': 'Enhanced Security: Granular permission controls',
        'Share Token': 'Share Token',
        'Service Verifies': 'Service Verifies',
        'Get Profile': 'Get Profile',
        'Benefits': 'Benefits',
        'Secure': 'Secure',
        'Never share your API key': 'Never share your API key',
        'Temporary': 'Temporary',
        'Tokens expire in 1 hour': 'Tokens expire in 1 hour',
        'Reputation': 'Reputation',
        'Services get your karma score and verified status': 'Services get your karma score and verified status',
        'Owner Info': 'Owner Info',
        'Includes your X/Twitter handle and verification': 'Includes your X/Twitter handle and verification',
        
        // Buttons
        'Save': 'Save',
        'Cancel': 'Cancel',
        'Delete': 'Delete',
        'Edit': 'Edit',
        'Close': 'Close',
        'Publish': 'Publish',
        'Preview': 'Preview',
        'Publish Post': 'Publish Post',
        'Save Draft': 'Save Draft',
        'Load Draft': 'Load Draft',
        'Copy': 'Copy',
        
        // Notifications
        'Loading...': 'Loading...',
        'Post published successfully!': 'Post published successfully!',
        'Failed to publish': 'Failed to publish',
        'Draft saved': 'Draft saved',
        'Failed to save draft': 'Failed to save draft',
        'Copied to clipboard': 'Copied to clipboard',
        'Publishing post...': 'Publishing post...',
        'Please click Preview first to see your post before publishing': 'Please click Preview first to see your post before publishing',
        'Please select a submolt': 'Please select a submolt',
        'Please enter both title and content': 'Please enter both title and content',
        
        // Time
        'minutes ago': 'minutes ago',
        'hours ago': 'hours ago',
        'days ago': 'days ago',
        'just now': 'just now',
      },
      tr: {
        // Navigation
        'Dashboard': 'Gösterge Paneli',
        'Persona': 'Kişilik',
        'Skills': 'Yetenekler',
        'Drafts': 'Taslaklar',
        'New Draft': 'Yeni Taslak',
        'Posts': 'Gönderiler',
        'AI Agent': 'AI Ajan',
        'Settings': 'Ayarlar',
        'Safe Mode': 'Güvenli Mod',
        
        // Status
        'Active': 'Aktif',
        'Inactive': 'Pasif',
        'Mastered': 'Ustalaşıldı',
        'Learning': 'Öğreniliyor',
        'Locked': 'Kilitli',
        'Coming Soon': 'Yakında',
        'Checking...': 'Kontrol ediliyor...',
        'Never': 'Hiç',
        
        // Dashboard
        'Agent status and recent activity': 'Ajan durumu ve son aktiviteler',
        'Agent Status': 'Ajan Durumu',
        'Ready': 'Hazır',
        'Active': 'Aktif',
        'Inactive': 'Pasif',
        'Agent Stats': 'Ajan İstatistikleri',
        'Karma': 'Karma',
        'Followers': 'Takipçiler',
        'Following': 'Takip Edilenler',
        'Rate Limits': 'Hız Limitleri',
        'Posts (last hour)': 'Gönderiler (son saat)',
        'Comments (last hour)': 'Yorumlar (son saat)',
        'Security': 'Güvenlik',
        'Sandbox': 'Korumalı Alan',
        'Enabled': 'Etkin',
        'Disabled': 'Devre Dışı',
        'Violations': 'İhlaller',
        'Recent Activity': 'Son Aktiviteler',
        'No recent activity': 'Son aktivite yok',
        
        // Network
        'Find & Follow Users': 'Kullanıcı Bul & Takip Et',
        'Search for users and manage your network': 'Kullanıcı ara ve ağını yönet',
        'Search': 'Ara',
        'Your Network': 'Ağın',
        'People who follow you and people you follow': 'Seni takip edenler ve senin takip ettiklerin',
        'View Your Network on Moltbook': 'Moltbook\'ta Ağını Görüntüle',
        'You have': 'Toplam',
        'followers': 'takipçin var',
        'The Moltbook API doesn\'t provide follower lists yet.': 'Moltbook API henüz takipçi listesi sağlamıyor.',
        'Visit your profile to see who follows you.': 'Kimin seni takip ettiğini görmek için profilini ziyaret et.',
        'Open Profile on Moltbook': 'Moltbook\'ta Profili Aç',
        
        // Persona
        'Agent Profile & Rewards': 'Ajan Profili & Ödüller',
        'Customize your agent\'s personality and unlock rate limit bonuses': 'Ajanının kişiliğini özelleştir ve hız limiti bonuslarının kilidini aç',
        'Agent Reputation & Rewards': 'Ajan İtibarı & Ödüller',
        'Build your reputation and unlock better rate limits': 'İtibarını oluştur ve daha iyi hız limitlerinin kilidini aç',
        'KARMA POINTS': 'KARMA PUANLARI',
        'Level': 'Seviye',
        'Level 1': 'Seviye 1',
        'Newcomer': 'Yeni Gelen',
        'Start your journey': 'Yolculuğuna başla',
        'Your Current Benefits': 'Mevcut Avantajların',
        'POST LIMIT': 'GÖNDERİ LİMİTİ',
        '1 per 30min': '30 dakikada 1',
        'per 30min': '30 dakikada',
        'COMMENT LIMIT': 'YORUM LİMİTİ',
        '10 per hour': 'Saatte 10',
        'per hour': 'saatte',
        'PRIORITY': 'ÖNCELİK',
        'Normal': 'Normal',
        'QUALITY BONUS': 'KALİTE BONUSU',
        '+0%': '+0%',
        'Progress to Level 2': 'Seviye 2\'ye İlerleme',
        'karma': 'karma',
        'How to Earn Karma': 'Karma Nasıl Kazanılır',
        'Get Upvotes': 'Beğeni Al',
        '+10 karma per post upvote': 'Gönderi beğenisi başına +10 karma',
        '+5 per comment upvote': 'Yorum beğenisi başına +5',
        'Help Others': 'Başkalarına Yardım Et',
        '+2 karma for helpful replies': 'Yardımcı yanıtlar için +2 karma',
        '+5 for solving problems': 'Sorun çözmek için +5',
        'Stay Active': 'Aktif Kal',
        '+1 karma per day for': 'Günlük +1 karma',
        'consistent posting': 'düzenli gönderi için',
        'Quality Content': 'Kaliteli İçerik',
        '+15 karma for posts': 'Gönderiler için +15 karma',
        'marked as "high quality"': '"yüksek kalite" olarak işaretlenen',
        'Agent Personality': 'Ajan Kişiliği',
        'Define your agent\'s character, tone, and communication style': 'Ajanının karakterini, tonunu ve iletişim tarzını tanımla',
        'Basic Info': 'Temel Bilgiler',
        'Personality': 'Kişilik',
        'Expertise': 'Uzmanlık',
        'Communication Style': 'İletişim Tarzı',
        'Display Name': 'Görünen Ad',
        'How your agent introduces itself': 'Ajanın kendini nasıl tanıttığı',
        'Agent Bio': 'Ajan Biyografisi',
        'Brief description of your agent (used in profiles and introductions)': 'Ajanının kısa açıklaması (profillerde ve tanıtımlarda kullanılır)',
        'Primary Role': 'Birincil Rol',
        'Save Agent Profile': 'Ajan Profilini Kaydet',
        'Test Personality': 'Kişiliği Test Et',
        'Reset to Default': 'Varsayılana Sıfırla',
        'Rate Limit Boost Challenges': 'Hız Limiti Artırma Görevleri',
        'Complete challenges to unlock faster posting and commenting': 'Daha hızlı gönderi ve yorum için görevleri tamamla',
        'Quality Creator': 'Kaliteli İçerik Üreticisi',
        'Get 5 upvotes on your posts': 'Gönderilerinde 5 beğeni al',
        'Reward: +1 post per hour': 'Ödül: Saatte +1 gönderi',
        'Community Helper': 'Topluluk Yardımcısı',
        'Reply to 10 different posts': '10 farklı gönderiye yanıt ver',
        'Reward: +5 comments per hour': 'Ödül: Saatte +5 yorum',
        'First Steps': 'İlk Adımlar',
        'Complete agent setup': 'Ajan kurulumunu tamamla',
        'Reward: Basic posting enabled': 'Ödül: Temel gönderi etkin',
        'Trusted Agent': 'Güvenilir Ajan',
        'Reach 100 karma points': '100 karma puanına ulaş',
        'Reward: Priority posting queue': 'Ödül: Öncelikli gönderi kuyruğu',
        '1/5': '1/5',
        '3/10': '3/10',
        '0': '0',
        'posts queued': 'gönderi kuyrukta',
        'NEXT POST AVAILABLE': 'SONRAKİ GÖNDERİ MÜSAİT',
        'Due to Moltbook rate limits': 'Moltbook hız limitleri nedeniyle',
        
        // Skills
        'Technical Skills & Integrations': 'Teknik Yetenekler & Entegrasyonlar',
        'Configure advanced features and external integrations': 'Gelişmiş özellikleri ve harici entegrasyonları yapılandır',
        'Moltbook Platform Mastery': 'Moltbook Platform Ustalığı',
        'Learn and master Moltbook-specific features': 'Moltbook\'a özgü özellikleri öğren ve ustalaş',
        'Basic Posting': 'Temel Gönderi',
        'Mastered': 'Ustalaşıldı',
        'Create and publish posts to submolts': 'Submolt\'lara gönderi oluştur ve yayınla',
        'Comment Engagement': 'Yorum Etkileşimi',
        'Learning': 'Öğreniliyor',
        'Reply to posts and engage in discussions': 'Gönderilere yanıt ver ve tartışmalara katıl',
        'Submolt Creation': 'Submolt Oluşturma',
        'Locked': 'Kilitli',
        'Create and manage your own submolts': 'Kendi submolt\'larını oluştur ve yönet',
        'Requires: 500 karma points': 'Gerekli: 500 karma puanı',
        'Moderation Tools': 'Moderasyon Araçları',
        'Help moderate communities': 'Toplulukları yönetmeye yardım et',
        'Requires: Trusted Agent status': 'Gerekli: Güvenilir Ajan statüsü',
        'External Integrations': 'Harici Entegrasyonlar',
        'Connect your agent to external services and APIs': 'Ajanını harici servislere ve API\'lere bağla',
        'Twitter/X Integration': 'Twitter/X Entegrasyonu',
        'Cross-post to Twitter and sync engagement': 'Twitter\'a çapraz gönderi yap ve etkileşimi senkronize et',
        'Coming Soon': 'Yakında',
        'Analytics Dashboard': 'Analitik Paneli',
        'Track performance and engagement metrics': 'Performans ve etkileşim metriklerini takip et',
        'Custom AI Models': 'Özel AI Modelleri',
        'Train custom models on your content': 'İçeriğin üzerinde özel modeller eğit',
        'Mobile Notifications': 'Mobil Bildirimler',
        'Get notified of important events': 'Önemli olaylardan haberdar ol',
        'Advanced Configuration': 'Gelişmiş Yapılandırma',
        'Fine-tune your agent\'s technical behavior': 'Ajanının teknik davranışını ince ayarla',
        'API Timeout (seconds)': 'API Zaman Aşımı (saniye)',
        'How long to wait for API responses': 'API yanıtları için ne kadar beklenecek',
        'Retry Attempts': 'Yeniden Deneme Sayısı',
        'Number of times to retry failed requests': 'Başarısız istekleri yeniden deneme sayısı',
        'Log Level': 'Log Seviyesi',
        'Enable Performance Metrics': 'Performans Metriklerini Etkinleştir',
        'Collect performance data to improve agent efficiency': 'Ajan verimliliğini artırmak için performans verisi topla',
        'Save Configuration': 'Yapılandırmayı Kaydet',
        'Export Config': 'Yapılandırmayı Dışa Aktar',
        'Import Config': 'Yapılandırmayı İçe Aktar',
        
        // Drafts
        'Saved Drafts': 'Kaydedilmiş Taslaklar',
        'Manage your draft posts': 'Taslak gönderilerini yönet',
        'Clean Queue': 'Kuyruğu Temizle',
        'Remove orphaned queue items': 'Yetim kuyruk öğelerini kaldır',
        'No saved drafts yet. Create one in New Draft!': 'Henüz kaydedilmiş taslak yok. Yeni Taslak\'ta bir tane oluştur!',
        
        // New Draft
        'Create and preview posts before publishing': 'Yayınlamadan önce gönderi oluştur ve önizle',
        'Submolt': 'Submolt',
        'Choose the right submolt for better engagement': 'Daha iyi etkileşim için doğru submolt\'u seç',
        'Create New': 'Yeni Oluştur',
        'Topic / Title': 'Konu / Başlık',
        'Post Content': 'Gönderi İçeriği',
        'Include WATAM CTA': 'WATAM CTA Ekle',
        
        // Posts
        'Published Posts': 'Yayınlanmış Gönderiler',
        'Track your posts and respond to comments': 'Gönderilerini takip et ve yorumlara yanıt ver',
        'Refresh': 'Yenile',
        'Fix URLs': 'URL\'leri Düzelt',
        'posts queued': 'gönderi kuyrukta',
        'NEXT POST AVAILABLE': 'SONRAKİ GÖNDERİ MÜSAİT',
        'Due to Moltbook rate limits': 'Moltbook hız limitleri nedeniyle',
        'View on Moltbook': 'Moltbook\'ta Görüntüle',
        'views': 'görüntülenme',
        'comments': 'yorum',
        'View Comments': 'Yorumları Görüntüle',
        'Quick Reply': 'Hızlı Yanıt',
        'Auto-posted': 'Otomatik yayınlandı',
        
        // AI Agent
        'AI Agent Configuration': 'AI Ajan Yapılandırması',
        'Configure AI model for automatic responses': 'Otomatik yanıtlar için AI modelini yapılandır',
        'AI Provider': 'AI Sağlayıcı',
        'Select your AI provider and enter API credentials': 'AI sağlayıcını seç ve API kimlik bilgilerini gir',
        'Ollama runs locally (no API key, unlimited), Groq is fastest cloud option': 'Ollama yerel çalışır (API anahtarı yok, sınırsız), Groq en hızlı bulut seçeneği',
        'Model': 'Model',
        'Test Connection': 'Bağlantıyı Test Et',
        'Auto-Reply Settings': 'Otomatik Yanıt Ayarları',
        'Configure automatic response behavior': 'Otomatik yanıt davranışını yapılandır',
        'Enable Auto-Reply': 'Otomatik Yanıtı Etkinleştir',
        'Agent will automatically respond to posts and comments': 'Ajan gönderilere ve yorumlara otomatik yanıt verecek',
        'Check Interval (minutes)': 'Kontrol Aralığı (dakika)',
        'How often to check for new posts (minimum 1 minute)': 'Yeni gönderileri ne sıklıkla kontrol edeceği (minimum 1 dakika)',
        'Monitor Submolts': 'İzlenecek Submolt\'lar',
        'Comma-separated list of submolts to monitor (leave empty for all)': 'İzlenecek submolt\'ların virgülle ayrılmış listesi (tümü için boş bırak)',
        'Reply Keywords': 'Yanıt Anahtar Kelimeleri',
        'Only reply to posts containing these keywords (leave empty for all)': 'Sadece bu anahtar kelimeleri içeren gönderilere yanıt ver (tümü için boş bırak)',
        'Max Replies per Hour': 'Saatte Maksimum Yanıt',
        'Moltbook limit is 20 comments/hour': 'Moltbook limiti saatte 20 yorum',
        'Save Auto-Reply Settings': 'Otomatik Yanıt Ayarlarını Kaydet',
        'Advanced AI Settings': 'Gelişmiş AI Ayarları',
        'Fine-tune AI response quality and behavior': 'AI yanıt kalitesini ve davranışını ince ayarla',
        'Response Length': 'Yanıt Uzunluğu',
        'Control how verbose the AI responses should be': 'AI yanıtlarının ne kadar ayrıntılı olacağını kontrol et',
        'Response Style': 'Yanıt Tarzı',
        'Set the tone and style of AI responses': 'AI yanıtlarının tonunu ve tarzını ayarla',
        'Creativity Level (Temperature)': 'Yaratıcılık Seviyesi (Sıcaklık)',
        'Focused': 'Odaklanmış',
        'Creative': 'Yaratıcı',
        'Lower = more focused and consistent, Higher = more creative and varied': 'Düşük = daha odaklı ve tutarlı, Yüksek = daha yaratıcı ve çeşitli',
        'Use Persona & Skills': 'Kişilik & Yetenekleri Kullan',
        'Include your persona and skills in AI context (recommended)': 'Kişiliğini ve yeteneklerini AI bağlamına dahil et (önerilen)',
        'Avoid Repetitive Responses': 'Tekrarlayan Yanıtlardan Kaçın',
        'AI will try to vary responses to similar posts': 'AI benzer gönderilere farklı yanıtlar vermeye çalışacak',
        'Save Advanced Settings': 'Gelişmiş Ayarları Kaydet',
        'AUTO-REPLY:': 'OTOMATİK YANIT:',
        'Enabled (not running)': 'Etkin (çalışmıyor)',
        'AI PROVIDER:': 'AI SAĞLAYICI:',
        'Ollama (LOCAL)': 'Ollama (YEREL)',
        'LOCAL': 'YEREL',
        'LAST CHECK:': 'SON KONTROL:',
        'Never': 'Hiç',
        'REPLIES TODAY:': 'BUGÜNKÜ YANITLAR:',
        'Start Agent': 'Ajanı Başlat',
        'Stop Agent': 'Ajanı Durdur',
        'Test Reply': 'Yanıtı Test Et',
        'Test Agent Loop': 'Ajan Döngüsünü Test Et',
        'Test Heartbeat': 'Heartbeat\'i Test Et',
        'Debug & Fix Issues': 'Hata Ayıkla & Sorunları Düzelt',
        'Send AI Reply to Specific Post': 'Belirli Gönderiye AI Yanıtı Gönder',
        'Enter a Moltbook post URL to send an AI-generated reply': 'AI tarafından oluşturulan yanıt göndermek için Moltbook gönderi URL\'si gir',
        'Post URL': 'Gönderi URL\'si',
        'Example:': 'Örnek:',
        'Generate & Send Reply': 'Yanıt Oluştur & Gönder',
        'Recent Agent Activity': 'Son Ajan Aktivitesi',
        'No activity yet': 'Henüz aktivite yok',
        
        // Settings
        'Configure your agent and Moltbook connection': 'Ajanını ve Moltbook bağlantısını yapılandır',
        'Moltbook Agent (Legacy)': 'Moltbook Ajanı (Eski)',
        'Traditional agent registration with direct API key': 'Doğrudan API anahtarı ile geleneksel ajan kaydı',
        'Register your agent with Moltbook to start posting and commenting.': 'Gönderi ve yorum yapmaya başlamak için ajanını Moltbook\'a kaydet.',
        // Agent Registration
        'Traditional agent registration with direct API key': 'Doğrudan API anahtarı ile geleneksel ajan kaydı',
        'Register your agent with Moltbook to start posting and commenting.': 'Gönderi ve yorum yapmaya başlamak için ajanını Moltbook\'a kaydet.',
        'Registration Limit': 'Kayıt Sınırı',
        'Only 1 agent can be registered per IP address per day. If you already have an agent, use "Load from .env" instead.': 'Her IP adresinden günde sadece 1 ajan kaydedilebilir. Zaten bir ajanınız varsa, ".env\'den Yükle" seçeneğini kullanın.',
        
        'Agent Name': 'Ajan Adı',
        'Agent Description (optional)': 'Ajan Açıklaması (opsiyonel)',
        'Register Agent': 'Ajanı Kaydet',
        'Load from .env': '.env\'den Yükle',
        'Registering...': 'Kaydediliyor...',
        'Loading...': 'Yükleniyor...',
        'Agent registered successfully! Complete the claim process to activate.': 'Ajan başarıyla kaydedildi! Aktifleştirmek için claim işlemini tamamla.',
        'Claim URL': 'Claim URL\'si',
        'Verification Code': 'Doğrulama Kodu',
        'Open': 'Aç',
        'Copy': 'Kopyala',
        'Steps to complete claim:': 'Claim işlemini tamamlama adımları:',
        'Click "Open" to visit the claim URL in your browser': 'Tarayıcında claim URL\'sini ziyaret etmek için "Aç"a tıkla',
        'Log in to your Moltbook account': 'Moltbook hesabına giriş yap',
        'Enter the verification code': 'Doğrulama kodunu gir',
        'Complete any required steps (e.g., tweet verification)': 'Gerekli adımları tamamla (örn. tweet doğrulaması)',
        'Return here and click "I completed claim"': 'Buraya dön ve "Claim\'i tamamladım"a tıkla',
        'I completed claim': 'Claim\'i tamamladım',
        'Checking...': 'Kontrol ediliyor...',
        'Check Status': 'Durumu Kontrol Et',
        'Agent Name:': 'Ajan Adı:',
        'API Key:': 'API Anahtarı:',
        'Registered:': 'Kayıt Tarihi:',
        'Agent is active and ready to use!': 'Ajan aktif ve kullanıma hazır!',
        'Claim not completed. Visit the claim URL above and complete verification on Moltbook.': 'Claim tamamlanmadı. Yukarıdaki claim URL\'sini ziyaret et ve Moltbook\'ta doğrulamayı tamamla.',
        'Cannot connect to Moltbook. This is usually a temporary server issue. Check moltbook.com to see if the site is working, then try again.': 'Moltbook\'a bağlanılamıyor. Bu genellikle geçici bir sunucu sorunudur. moltbook.com\'un çalışıp çalışmadığını kontrol et, sonra tekrar dene.',
        'Moltbook server error. This is temporary - your agent is likely still valid. Try again later.': 'Moltbook sunucu hatası. Bu geçici - ajanın muhtemelen hala geçerli. Daha sonra tekrar dene.',
        'Agent verification failed. If this persists, you may need to re-register your agent.': 'Ajan doğrulaması başarısız. Bu devam ederse, ajanını yeniden kaydetmen gerekebilir.',
        'No agent found in .env file. Please check your .env configuration.': '.env dosyasında ajan bulunamadı. Lütfen .env yapılandırmanı kontrol et.',
        'Failed to load agent:': 'Ajan yüklenemedi:',
        
        // AI Config - Model Dropdown
        'Loading models...': 'Modeller yükleniyor...',
        'Select Model': 'Model Seçin',
        'Installed Models': 'Yüklü Modeller',
        'No models found. Run: ollama pull llama3.2': 'Model bulunamadı. Çalıştırın: ollama pull llama3.2',
        'No models available': 'Kullanılabilir model yok',
        'Error loading models': 'Modeller yüklenirken hata',
        
        // New Draft Page
        'New Draft': 'Yeni Taslak',
        'Create and preview posts before publishing': 'Yayınlamadan önce gönderi oluşturun ve önizleyin',
        'Search submolts...': 'Submolt ara...',
        'Choose the right submolt for better engagement': 'Daha iyi etkileşim için doğru submolt\'u seçin',
        'Create New': 'Yeni Oluştur',
        'Topic / Title': 'Konu / Başlık',
        'Enter post title': 'Gönderi başlığını girin',
        'Post Content': 'Gönderi İçeriği',
        'Write your post content here...': 'Gönderi içeriğinizi buraya yazın...',
        'Include WATAM CTA': 'WATAM CTA Ekle',
        'Add "Learn more at wearetheartmakers.com" to the end of your post': 'Gönderinizin sonuna "wearetheartmakers.com\'da daha fazla bilgi edinin" ekleyin',
        'Save Draft': 'Taslağı Kaydet',
        'Preview': 'Önizleme',
        'Publish to Moltbook': 'Moltbook\'a Yayınla',
        'Copy as Markdown': 'Markdown Olarak Kopyala',
        
        // Skills Page
        'Learn and master Moltbook-specific features': 'Moltbook\'a özgü özellikleri öğren ve ustalaş',
        'Basic Posting': 'Temel Gönderi',
        'Comment Engagement': 'Yorum Etkileşimi',
        'Submolt Creation': 'Submolt Oluşturma',
        'Moderation Tools': 'Moderasyon Araçları',
        'Create and publish posts to submolts': 'Submolt\'lara gönderi oluştur ve yayınla',
        'Reply to posts and engage in discussions': 'Gönderilere yanıt ver ve tartışmalara katıl',
        'Create and manage your own submolts': 'Kendi submolt\'larını oluştur ve yönet',
        'Help moderate communities': 'Toplulukları yönetmeye yardım et',
        'Requires: 500 karma points': 'Gerekli: 500 karma puanı',
        'Requires: Trusted Agent status': 'Gerekli: Güvenilir Ajan statüsü',
        'Fine-tune your agent\'s technical behavior and integrations': 'Ajanının teknik davranışını ve entegrasyonlarını ayarla',
        'External Integrations': 'Harici Entegrasyonlar',
        'Connect your agent to external services and APIs': 'Ajanını harici servislere ve API\'lere bağla',
        'Twitter/X Integration': 'Twitter/X Entegrasyonu',
        'Cross-post to Twitter and sync engagement': 'Twitter\'a çapraz gönderi yap ve etkileşimi senkronize et',
        'Analytics Dashboard': 'Analitik Paneli',
        'Track performance and engagement metrics': 'Performans ve etkileşim metriklerini takip et',
        'Custom AI Models': 'Özel AI Modelleri',
        'Train custom models on your content': 'İçeriğin üzerinde özel modeller eğit',
        'Mobile Notifications': 'Mobil Bildirimler',
        'Get notified of important events': 'Önemli olaylardan haberdar ol',
        'Technical Settings': 'Teknik Ayarlar',
        
        'Agent loaded from .env file successfully!': 'Ajan .env dosyasından başarıyla yüklendi!',
        'Re-fetch skill.md': 'skill.md\'yi yeniden getir',
        'Fetching...': 'Getiriliyor...',
        'skill.md fetched and cached successfully!': 'skill.md başarıyla getirildi ve önbelleğe alındı!',
        'Failed to fetch skill.md': 'skill.md getirilemedi',
        'Reset Agent': 'Ajanı Sıfırla',
        'Are you sure you want to COMPLETELY RESET the agent?': 'Ajanı TAMAMEN SIFIRLAMAK istediğinden emin misin?',
        'This will delete:': 'Bu şunları silecek:',
        '- Agent registration and API key': '- Ajan kaydı ve API anahtarı',
        '- All configuration settings': '- Tüm yapılandırma ayarları',
        '- AI provider settings': '- AI sağlayıcı ayarları',
        '- Auto-reply settings': '- Otomatik yanıt ayarları',
        '- All drafts and queue': '- Tüm taslaklar ve kuyruk',
        'You will need to register a new agent and reconfigure everything.': 'Yeni bir ajan kaydetmen ve her şeyi yeniden yapılandırman gerekecek.',
        'Agent completely reset! Please restart the application and register a new agent.': 'Ajan tamamen sıfırlandı! Lütfen uygulamayı yeniden başlat ve yeni bir ajan kaydet.',
        'Rate Limits': 'Hız Limitleri',
        'Max Posts per Hour': 'Saatte Maksimum Gönderi',
        'Max Comments per Hour': 'Saatte Maksimum Yorum',
        'Save Rate Limits': 'Hız Limitlerini Kaydet',
        'Rate limits saved successfully': 'Hız limitleri başarıyla kaydedildi',
        'Failed to save rate limits': 'Hız limitleri kaydedilemedi',
        'Rate limit: Wait': 'Hız limiti: Bekle',
        'minutes': 'dakika',
        'Rate limit exceeded. Please wait before posting again.': 'Hız limiti aşıldı. Lütfen tekrar gönderi yapmadan önce bekle.',
        'Rate limit exceeded. Please wait before commenting again.': 'Hız limiti aşıldı. Lütfen tekrar yorum yapmadan önce bekle.',
        
        // Moltbook Connection Errors
        'Cannot connect to Moltbook - Server might be down': 'Moltbook\'a bağlanılamıyor - Sunucu çökmüş olabilir',
        'Moltbook server is very slow - Please try again later': 'Moltbook sunucusu çok yavaş - Lütfen daha sonra tekrar dene',
        'Cannot reach Moltbook - Check your internet connection': 'Moltbook\'a erişilemiyor - İnternet bağlantını kontrol et',
        'Moltbook Error:': 'Moltbook Hatası:',
        'Failed to load agent stats - Check console for details': 'Ajan istatistikleri yüklenemedi - Detaylar için konsolu kontrol et',
        'Connection Error': 'Bağlantı Hatası',
        'Active': 'Aktif',
        'Error': 'Hata',
        'Moltbook Identity System': 'Moltbook Kimlik Sistemi',
        'Advanced token-based authentication with reputation tracking': 'İtibar takibi ile gelişmiş token tabanlı kimlik doğrulama',
        'Current Status: This feature is in development.': 'Mevcut Durum: Bu özellik geliştirme aşamasında.',
        'Agent Status:': 'Ajan Durumu:',
        'Identity Token:': 'Kimlik Token\'ı:',
        'No token': 'Token yok',
        'Current Auth:': 'Mevcut Kimlik Doğrulama:',
        'API Key (Twitter verified)': 'API Anahtarı (Twitter doğrulandı)',
        'Generate Identity Token': 'Kimlik Token\'ı Oluştur',
        'Test Token': 'Token\'ı Test Et',
        'About Identity System': 'Kimlik Sistemi Hakkında',
        'The Moltbook Identity System will provide:': 'Moltbook Kimlik Sistemi şunları sağlayacak:',
        'Secure Tokens: Time-limited authentication tokens': 'Güvenli Token\'lar: Zaman sınırlı kimlik doğrulama token\'ları',
        'Reputation Tracking: Agent karma and trust scores': 'İtibar Takibi: Ajan karma ve güven puanları',
        'Cross-Service Auth: Use your Moltbook identity elsewhere': 'Çapraz Servis Kimlik Doğrulama: Moltbook kimliğini başka yerlerde kullan',
        'Enhanced Security: Granular permission controls': 'Gelişmiş Güvenlik: Ayrıntılı izin kontrolleri',
        'Share Token': 'Token\'ı Paylaş',
        'Service Verifies': 'Servis Doğrular',
        'Get Profile': 'Profil Al',
        'Benefits': 'Faydalar',
        'Secure': 'Güvenli',
        'Never share your API key': 'API anahtarını asla paylaşma',
        'Temporary': 'Geçici',
        'Tokens expire in 1 hour': 'Token\'lar 1 saatte sona erer',
        'Reputation': 'İtibar',
        'Services get your karma score and verified status': 'Servisler karma puanını ve doğrulanmış durumunu alır',
        'Owner Info': 'Sahip Bilgisi',
        'Includes your X/Twitter handle and verification': 'X/Twitter kullanıcı adını ve doğrulamayı içerir',
        
        // Buttons
        'Save': 'Kaydet',
        'Cancel': 'İptal',
        'Delete': 'Sil',
        'Edit': 'Düzenle',
        'Close': 'Kapat',
        'Publish': 'Yayınla',
        'Preview': 'Önizle',
        'Publish Post': 'Gönderiyi Yayınla',
        'Save Draft': 'Taslağı Kaydet',
        'Load Draft': 'Taslağı Yükle',
        'Copy': 'Kopyala',
        
        // Notifications
        'Loading...': 'Yükleniyor...',
        'Post published successfully!': 'Gönderi başarıyla yayınlandı!',
        'Failed to publish': 'Yayınlama başarısız',
        'Draft saved': 'Taslak kaydedildi',
        'Failed to save draft': 'Taslak kaydedilemedi',
        'Copied to clipboard': 'Panoya kopyalandı',
        'Publishing post...': 'Gönderi yayınlanıyor...',
        'Please click Preview first to see your post before publishing': 'Lütfen yayınlamadan önce Önizle\'ye tıklayın',
        'Please select a submolt': 'Lütfen bir submolt seçin',
        'Please enter both title and content': 'Lütfen hem başlık hem de içerik girin',
        
        // AI Agent
        'AI Provider': 'AI Sağlayıcı',
        'API Key': 'API Anahtarı',
        'Model': 'Model',
        'Auto Reply': 'Otomatik Yanıt',
        'Enable': 'Etkinleştir',
        'Disable': 'Devre Dışı Bırak',
        
        // Stats
        'Karma': 'Karma',
        'Followers': 'Takipçiler',
        'Following': 'Takip Edilenler',
        'Posts': 'Gönderiler',
        'Comments': 'Yorumlar',
        'Upvotes': 'Beğeniler',
        
        // Time
        'minutes ago': 'dakika önce',
        'hours ago': 'saat önce',
        'days ago': 'gün önce',
        'just now': 'şimdi',
      }
    };
  }

  // Get translation for a key
  t(key) {
    const translation = this.translations[this.currentLanguage][key];
    if (!translation) {
      // Silently return original key if no translation found
      return key;
    }
    return translation;
  }

  // Change language
  setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLanguage = lang;
      this.translateUI();
      this.saveLanguagePreference(lang);
      console.log('[LanguageManager] Language changed to:', lang);
    }
  }

  // Get current language
  getLanguage() {
    return this.currentLanguage;
  }

  // Translate all UI elements
  translateUI() {
    console.log('[LanguageManager] ========================================');
    console.log('[LanguageManager] Starting FULL UI translation to:', this.currentLanguage);
    
    // CRITICAL: Don't reload page - just restore original text from data attributes
    if (this.currentLanguage === 'en') {
      console.log('[LanguageManager] English selected, restoring original text...');
      this.restoreOriginalText();
      console.log('[LanguageManager] ✅ Original text restored');
      console.log('[LanguageManager] ========================================');
      return;
    }
    
    // Translate everything
    this.translateAllElements();
    
    console.log('[LanguageManager] ✅ UI translation completed');
    console.log('[LanguageManager] ========================================');
  }
  
  // Restore original English text without reloading page
  restoreOriginalText() {
    console.log('[LanguageManager] Restoring original English text...');
    let restoredCount = 0;
    
    // Restore all elements with data-original-text attribute
    document.querySelectorAll('[data-original-text]').forEach(el => {
      const originalText = el.getAttribute('data-original-text');
      if (originalText) {
        // Check if it's a button or has specific structure
        if (el.tagName === 'BUTTON' || el.classList.contains('btn') || el.classList.contains('tab-btn')) {
          // Preserve emoji/icon at start
          const currentText = el.textContent.trim();
          const emojiMatch = currentText.match(/^([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[📊🤖📚📝✍️📮⚙️🔍👥💬✅❌🚀⏹️💾🧪🔄])\s*/u);
          const emoji = emojiMatch ? emojiMatch[0] : '';
          el.textContent = emoji + originalText;
        } else {
          el.textContent = originalText;
        }
        restoredCount++;
      }
    });
    
    // Restore placeholders
    document.querySelectorAll('input[data-original-placeholder], textarea[data-original-placeholder]').forEach(input => {
      const originalPlaceholder = input.getAttribute('data-original-placeholder');
      if (originalPlaceholder) {
        input.setAttribute('placeholder', originalPlaceholder);
        restoredCount++;
      }
    });
    
    console.log('[LanguageManager] ✓ Restored', restoredCount, 'elements to English');
  }
  
  // Translate all elements in the page (UI ONLY - NOT post content)
  translateAllElements() {
    console.log('[LanguageManager] Translating UI elements only (NOT posts)...');
    let translatedCount = 0;
    
    // Get all text nodes
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Skip script, style, and input elements
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          const tagName = parent.tagName;
          if (tagName === 'SCRIPT' || tagName === 'STYLE' || 
              tagName === 'INPUT' || tagName === 'TEXTAREA' ||
              tagName === 'SELECT' || tagName === 'OPTION') {
            return NodeFilter.FILTER_REJECT;
          }
          
          // CRITICAL: Skip post content areas - DO NOT auto-translate posts!
          // Posts should only be translated when user clicks translate button
          if (parent.closest('.post-body') || 
              parent.closest('.post-header h4') ||
              parent.closest('.post-card') ||
              parent.closest('.comment-body') ||
              parent.closest('.draft-body') ||
              parent.closest('#draftBody') ||
              parent.closest('#previewBody') ||
              parent.closest('#previewTitle')) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Only accept nodes with text
          const text = node.textContent.trim();
          if (text.length > 0 && text.length < 500) {
            return NodeFilter.FILTER_ACCEPT;
          }
          
          return NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    const nodesToTranslate = [];
    let node;
    while (node = walker.nextNode()) {
      nodesToTranslate.push(node);
    }
    
    console.log('[LanguageManager] Found', nodesToTranslate.length, 'UI text nodes (posts excluded)');
    
    // Translate each node
    nodesToTranslate.forEach(node => {
      const originalText = node.textContent;
      const trimmedText = originalText.trim();
      
      if (trimmedText) {
        const translated = this.t(trimmedText);
        if (translated && translated !== trimmedText) {
          // Preserve whitespace
          const leadingSpace = originalText.match(/^\s*/)[0];
          const trailingSpace = originalText.match(/\s*$/)[0];
          node.textContent = leadingSpace + translated + trailingSpace;
          translatedCount++;
        }
      }
    });
    
    // Also translate placeholders
    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(input => {
      const placeholder = input.getAttribute('placeholder');
      if (placeholder) {
        const translated = this.t(placeholder);
        if (translated && translated !== placeholder) {
          input.setAttribute('placeholder', translated);
          translatedCount++;
        }
      }
    });
    
    console.log('[LanguageManager] ✓ Translated', translatedCount, 'UI elements (posts NOT included)');
  }
  
  // Aggressively translate all text nodes in the document (UI ONLY - NOT posts)
  translateAllTextNodes() {
    console.log('[LanguageManager] Starting UI text node translation (posts excluded)...');
    
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Skip script and style tags
          if (node.parentElement.tagName === 'SCRIPT' || 
              node.parentElement.tagName === 'STYLE') {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Skip if parent is an input or textarea
          if (node.parentElement.tagName === 'INPUT' || 
              node.parentElement.tagName === 'TEXTAREA') {
            return NodeFilter.FILTER_REJECT;
          }
          
          // CRITICAL: Skip post content areas - DO NOT auto-translate posts!
          const parent = node.parentElement;
          if (parent.closest('.post-body') || 
              parent.closest('.post-header h4') ||
              parent.closest('.post-card') ||
              parent.closest('.comment-body') ||
              parent.closest('.draft-body') ||
              parent.closest('#draftBody') ||
              parent.closest('#previewBody') ||
              parent.closest('#previewTitle')) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Only accept nodes with actual text content
          const text = node.textContent.trim();
          if (text.length > 0 && text.length < 200) {
            return NodeFilter.FILTER_ACCEPT;
          }
          
          return NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    const nodesToTranslate = [];
    let node;
    while (node = walker.nextNode()) {
      nodesToTranslate.push(node);
    }
    
    console.log('[LanguageManager] Found', nodesToTranslate.length, 'UI text nodes (posts excluded)');
    
    let translatedCount = 0;
    nodesToTranslate.forEach(node => {
      const originalText = node.textContent;
      const trimmedText = originalText.trim();
      
      // Save original text to parent element if not already saved
      if (!node.parentElement.hasAttribute('data-original-text')) {
        node.parentElement.setAttribute('data-original-text', trimmedText);
      }
      
      if (trimmedText) {
        const translated = this.t(trimmedText);
        if (translated !== trimmedText) {
          // Preserve whitespace structure
          const leadingSpace = originalText.match(/^\s*/)[0];
          const trailingSpace = originalText.match(/\s*$/)[0];
          node.textContent = leadingSpace + translated + trailingSpace;
          translatedCount++;
          console.log('[LanguageManager] ✓ Translated:', trimmedText, '→', translated);
        }
      }
    });
    
    console.log('[LanguageManager] ✓ Translated', translatedCount, 'UI text nodes (posts NOT included)');
  }
  
  translateSpecificElements() {
    // Translate all text content in specific containers
    const selectors = [
      '.card-title',
      '.section-title',
      '.info-text',
      '.hint-text',
      '.status-text',
      '.metric-label',
      '.tab-label',
      '.form-label',
      '.help-text'
    ];
    
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (el.children.length > 0) return;
        
        const text = el.textContent.trim();
        if (text) {
          const translated = this.t(text);
          if (translated !== text) {
            el.textContent = translated;
          }
        }
      });
    });
    
    // Translate stat labels specifically
    document.querySelectorAll('.stat .label').forEach(label => {
      const text = label.textContent.trim();
      if (text) {
        const translated = this.t(text);
        if (translated !== text) {
          label.textContent = translated;
        }
      }
    });
    
    // Translate small helper texts
    document.querySelectorAll('small').forEach(small => {
      if (small.children.length > 0) return;
      
      const text = small.textContent.trim();
      if (text) {
        const translated = this.t(text);
        if (translated !== text) {
          small.textContent = translated;
        }
      }
    });
    
    // Translate empty state messages
    document.querySelectorAll('.empty-state').forEach(el => {
      const text = el.textContent.trim();
      if (text) {
        const translated = this.t(text);
        if (translated !== text) {
          el.textContent = translated;
        }
      }
    });
  }

  translateNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      // Get all child nodes
      const childNodes = Array.from(item.childNodes);
      
      // Find text nodes (skip icon span)
      childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
          const text = node.textContent.trim();
          const translated = this.t(text);
          if (translated !== text) {
            node.textContent = '\n          ' + translated + '\n        ';
          }
        }
      });
    });
  }

  translatePageHeaders() {
    // Translate h2 headers
    document.querySelectorAll('h2, h3, h4').forEach(header => {
      // Skip if header has emoji or icon at start
      const text = header.textContent.trim();
      
      // Extract emoji/icon if present
      const emojiMatch = text.match(/^([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}])\s*/u);
      const emoji = emojiMatch ? emojiMatch[0] : '';
      const textWithoutEmoji = emoji ? text.substring(emoji.length).trim() : text;
      
      const translated = this.t(textWithoutEmoji);
      if (translated !== textWithoutEmoji) {
        header.textContent = emoji + translated;
      }
    });

    // Translate paragraph descriptions
    document.querySelectorAll('p').forEach(p => {
      // Skip if paragraph has child elements (like links, spans)
      if (p.children.length > 0) return;
      
      const text = p.textContent.trim();
      if (text) {
        const translated = this.t(text);
        if (translated !== text) {
          p.textContent = translated;
        }
      }
    });
    
    // Translate card descriptions specifically
    document.querySelectorAll('.card-description').forEach(el => {
      const text = el.textContent.trim();
      if (text) {
        const translated = this.t(text);
        if (translated !== text) {
          el.textContent = translated;
        }
      }
    });
  }

  translateButtons() {
    console.log('[LanguageManager] Translating buttons...');
    let count = 0;
    
    document.querySelectorAll('button, .btn, .tab-btn').forEach(button => {
      // Skip if button has data-no-translate attribute
      if (button.hasAttribute('data-no-translate')) return;
      
      // Save original text if not already saved
      if (!button.hasAttribute('data-original-text')) {
        const originalText = button.textContent.trim();
        // Extract emoji/icon if present at start
        const emojiMatch = originalText.match(/^([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[📊🤖📚📝✍️📮⚙️🔍👥💬✅❌🚀⏹️💾🧪🔄])\s*/u);
        const emoji = emojiMatch ? emojiMatch[0] : '';
        const textWithoutEmoji = emoji ? originalText.substring(emoji.length).trim() : originalText;
        button.setAttribute('data-original-text', textWithoutEmoji);
      }
      
      // Get original text
      const originalText = button.getAttribute('data-original-text');
      if (!originalText) return;
      
      // Extract emoji/icon if present at start of current text
      const currentText = button.textContent.trim();
      const emojiMatch = currentText.match(/^([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[📊🤖📚📝✍️📮⚙️🔍👥💬✅❌🚀⏹️💾🧪🔄])\s*/u);
      const emoji = emojiMatch ? emojiMatch[0] : '';
      
      if (originalText) {
        const translated = this.t(originalText);
        if (translated !== originalText) {
          button.textContent = emoji + translated;
          count++;
          console.log('[LanguageManager] ✓ Button:', originalText, '→', translated);
        } else {
          // No translation found, use original
          button.textContent = emoji + originalText;
        }
      }
    });
    
    console.log('[LanguageManager] ✓ Translated', count, 'buttons');
  }

  translateLabels() {
    document.querySelectorAll('label').forEach(label => {
      // Skip if label contains only a switch/checkbox
      if (label.querySelector('.switch') || label.querySelector('input[type="checkbox"]')) return;
      
      // Skip if label has complex children
      if (label.children.length > 1) return;
      
      const text = label.textContent.trim();
      if (text) {
        const translated = this.t(text);
        if (translated !== text) {
          label.textContent = translated;
        }
      }
    });
  }

  translatePlaceholders() {
    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(input => {
      // Save original placeholder if not already saved
      if (!input.hasAttribute('data-original-placeholder')) {
        input.setAttribute('data-original-placeholder', input.getAttribute('placeholder'));
      }
      
      const originalPlaceholder = input.getAttribute('data-original-placeholder');
      if (originalPlaceholder) {
        const translated = this.t(originalPlaceholder);
        if (translated !== originalPlaceholder) {
          input.setAttribute('placeholder', translated);
        }
      }
    });
  }
  
  translateDivs() {
    // Translate divs with specific classes that contain text
    const divSelectors = [
      '.status-indicator span',
      '.level-badge',
      '.level-title',
      '.level-description',
      '.benefit-label',
      '.benefit-value',
      '.tip-title',
      '.tip-description',
      '.challenge-title',
      '.challenge-description',
      '.challenge-reward',
      '.skill-name',
      '.skill-level',
      '.skill-description',
      '.unlock-requirement',
      '.progress-label',
      '.progress-value'
    ];
    
    divSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        // Skip if element has children (except text nodes)
        if (el.children.length > 0) return;
        
        const text = el.textContent.trim();
        if (text) {
          const translated = this.t(text);
          if (translated !== text) {
            el.textContent = translated;
          }
        }
      });
    });
  }
  
  translateSpans() {
    // Translate specific span elements
    document.querySelectorAll('span').forEach(span => {
      // Skip if span has children or is inside a button/nav
      if (span.children.length > 0) return;
      if (span.closest('button') || span.closest('.nav-item')) return;
      if (span.classList.contains('icon')) return;
      if (span.classList.contains('slider')) return;
      
      const text = span.textContent.trim();
      if (text && text.length > 0 && text.length < 100) {
        const translated = this.t(text);
        if (translated !== text) {
          span.textContent = translated;
        }
      }
    });
  }

  // Translate live content (posts, comments) using AI
  async translateLiveContent(text, targetLang = null) {
    const lang = targetLang || this.currentLanguage;
    
    // Don't translate if already in target language or if English
    if (lang === 'en') return text;
    
    // CRITICAL: Check if AI provider is configured before attempting translation
    try {
      const config = await window.electronAPI.getConfig();
      
      if (!config.aiProvider) {
        console.error('[LanguageManager] ❌ No AI provider configured - cannot translate');
        throw new Error('AI sağlayıcısı seçilmedi. Lütfen AI Config sayfasından bir sağlayıcı seçin.');
      }
      
      // Ollama doesn't need API key, but others do
      if (config.aiProvider !== 'ollama' && !config.aiApiKey) {
        console.error('[LanguageManager] ❌ No API key configured - cannot translate');
        throw new Error('API anahtarı girilmedi. Lütfen AI Config sayfasından API anahtarınızı girin.');
      }
      
      console.log('[LanguageManager] ✓ AI provider configured:', config.aiProvider);
    } catch (error) {
      console.error('[LanguageManager] ❌ AI configuration check failed:', error);
      // Show user-friendly error
      if (window.showNotification) {
        window.showNotification(error.message || 'Çeviri için AI sağlayıcısı yapılandırılmalı', 'error');
      }
      return text; // Return original text
    }
    
    // Check cache first
    const cacheKey = `${text}_${lang}`;
    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey);
    }

    try {
      const result = await window.electronAPI.translateText({
        text: text,
        targetLanguage: lang
      });

      if (result.success) {
        // Cache the translation
        this.translationCache.set(cacheKey, result.translation);
        return result.translation;
      } else {
        console.error('[LanguageManager] Translation failed:', result.error);
        return text; // Return original text on error
      }
    } catch (error) {
      console.error('[LanguageManager] Translation error:', error);
      return text;
    }
  }
  
  // Translate a single post (called when user clicks translate button)
  async translatePost(postId) {
    if (this.currentLanguage === 'en') {
      console.log('[LanguageManager] English selected, no translation needed');
      return;
    }
    
    console.log('[LanguageManager] Translating post:', postId);
    
    const postCard = document.querySelector(`[data-id="${postId}"]`);
    if (!postCard) {
      console.error('[LanguageManager] Post card not found:', postId);
      return;
    }
    
    // Add loading state
    postCard.classList.add('translating');
    
    // Find title and body
    const titleElement = postCard.querySelector('.post-header h4');
    const bodyElement = postCard.querySelector('.post-body');
    const translateBtn = postCard.querySelector('.translate-post-btn');
    
    if (translateBtn) {
      translateBtn.textContent = '⏳ Çevriliyor...';
      translateBtn.disabled = true;
    }
    
    try {
      // Translate title
      if (titleElement) {
        const originalTitle = titleElement.getAttribute('data-original') || titleElement.textContent;
        if (!titleElement.hasAttribute('data-original')) {
          titleElement.setAttribute('data-original', originalTitle);
        }
        
        const translatedTitle = await this.translateLiveContent(originalTitle);
        titleElement.textContent = translatedTitle;
      }
      
      // Translate body
      if (bodyElement) {
        const isExpanded = bodyElement.classList.contains('expanded');
        const originalBody = bodyElement.getAttribute('data-original') || 
                           (isExpanded ? bodyElement.getAttribute('data-full').replace(/\\n/g, '\n') : bodyElement.textContent);
        
        if (!bodyElement.hasAttribute('data-original')) {
          bodyElement.setAttribute('data-original', originalBody);
        }
        
        const translatedBody = await this.translateLiveContent(originalBody);
        
        if (isExpanded) {
          bodyElement.textContent = translatedBody;
        } else {
          bodyElement.textContent = translatedBody.substring(0, 200) + (translatedBody.length > 200 ? '...' : '');
        }
        
        // Update data-full with translated text
        bodyElement.setAttribute('data-full', translatedBody.replace(/\n/g, '\\n'));
      }
      
      // Update button
      if (translateBtn) {
        translateBtn.textContent = '✓ Çevrildi';
        translateBtn.classList.add('translated');
      }
      
      console.log('[LanguageManager] ✓ Post translated:', postId);
    } catch (error) {
      console.error('[LanguageManager] Failed to translate post:', error);
      
      // Show user-friendly error message
      if (window.showNotification) {
        const errorMsg = error.message || 'Çeviri başarısız oldu';
        window.showNotification('❌ ' + errorMsg, 'error');
      }
      
      if (translateBtn) {
        translateBtn.textContent = '🌐 Çevir';
        translateBtn.disabled = false;
        translateBtn.classList.remove('translated');
      }
    } finally {
      postCard.classList.remove('translating');
    }
  }
  
  // Translate a single comment
  async translateComment(commentId) {
    if (this.currentLanguage === 'en') {
      console.log('[LanguageManager] English selected, no translation needed');
      return;
    }
    
    console.log('[LanguageManager] Translating comment:', commentId);
    
    const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
    if (!commentElement) {
      console.error('[LanguageManager] Comment not found:', commentId);
      return;
    }
    
    const bodyElement = commentElement.querySelector('.comment-body');
    const translateBtn = commentElement.querySelector('.translate-comment-btn');
    
    if (!bodyElement) return;
    
    if (translateBtn) {
      translateBtn.textContent = '⏳ Çevriliyor...';
      translateBtn.disabled = true;
    }
    
    commentElement.classList.add('translating');
    
    try {
      const originalBody = bodyElement.getAttribute('data-original') || bodyElement.textContent;
      if (!bodyElement.hasAttribute('data-original')) {
        bodyElement.setAttribute('data-original', originalBody);
      }
      
      const translatedBody = await this.translateLiveContent(originalBody);
      bodyElement.textContent = translatedBody;
      
      if (translateBtn) {
        translateBtn.textContent = '✓ Çevrildi';
        translateBtn.classList.add('translated');
      }
      
      console.log('[LanguageManager] ✓ Comment translated:', commentId);
    } catch (error) {
      console.error('[LanguageManager] Failed to translate comment:', error);
      
      // Show user-friendly error message
      if (window.showNotification) {
        const errorMsg = error.message || 'Çeviri başarısız oldu';
        window.showNotification('❌ ' + errorMsg, 'error');
      }
      
      if (translateBtn) {
        translateBtn.textContent = '🌐 Çevir';
        translateBtn.disabled = false;
        translateBtn.classList.remove('translated');
      }
    } finally {
      commentElement.classList.remove('translating');
    }
  }
  
  // Translate all posts in the Posts page (REMOVED - now manual only)
  async translatePosts() {
    // This method is no longer used - posts are translated manually via button
    console.log('[LanguageManager] Auto-translation disabled - use translate buttons');
  }

  // Clear translation cache
  clearCache() {
    this.translationCache.clear();
    console.log('[LanguageManager] Translation cache cleared');
  }
  
  // Save all original English text on page load
  saveAllOriginalText() {
    console.log('[LanguageManager] Saving all original English text...');
    let savedCount = 0;
    
    // Save button text
    document.querySelectorAll('button, .btn, .tab-btn').forEach(button => {
      if (!button.hasAttribute('data-original-text') && !button.hasAttribute('data-no-translate')) {
        const originalText = button.textContent.trim();
        // Extract emoji/icon if present at start
        const emojiMatch = originalText.match(/^([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[📊🤖📚📝✍️📮⚙️🔍👥💬✅❌🚀⏹️💾🧪🔄])\s*/u);
        const emoji = emojiMatch ? emojiMatch[0] : '';
        const textWithoutEmoji = emoji ? originalText.substring(emoji.length).trim() : originalText;
        if (textWithoutEmoji) {
          button.setAttribute('data-original-text', textWithoutEmoji);
          savedCount++;
        }
      }
    });
    
    // Save placeholder text
    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(input => {
      if (!input.hasAttribute('data-original-placeholder')) {
        const placeholder = input.getAttribute('placeholder');
        if (placeholder) {
          input.setAttribute('data-original-placeholder', placeholder);
          savedCount++;
        }
      }
    });
    
    // Save all text nodes
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Skip script, style, input, textarea
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          const tagName = parent.tagName;
          if (tagName === 'SCRIPT' || tagName === 'STYLE' || 
              tagName === 'INPUT' || tagName === 'TEXTAREA' ||
              tagName === 'SELECT' || tagName === 'OPTION') {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Skip post content areas
          if (parent.closest('.post-body') || 
              parent.closest('.post-header h4') ||
              parent.closest('.post-card') ||
              parent.closest('.comment-body') ||
              parent.closest('.draft-body') ||
              parent.closest('#draftBody') ||
              parent.closest('#previewBody') ||
              parent.closest('#previewTitle')) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Only accept nodes with text
          const text = node.textContent.trim();
          if (text.length > 0 && text.length < 500) {
            return NodeFilter.FILTER_ACCEPT;
          }
          
          return NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    let node;
    while (node = walker.nextNode()) {
      const parent = node.parentElement;
      if (parent && !parent.hasAttribute('data-original-text')) {
        const originalText = node.textContent.trim();
        if (originalText) {
          parent.setAttribute('data-original-text', originalText);
          savedCount++;
        }
      }
    }
    
    console.log('[LanguageManager] ✅ Saved', savedCount, 'original English texts');
  }

  // Save language preference to localStorage
  saveLanguagePreference(lang) {
    try {
      localStorage.setItem('watam_language', lang);
    } catch (error) {
      console.error('[LanguageManager] Failed to save language preference:', error);
    }
  }

  // Load language preference from localStorage
  loadLanguagePreference() {
    try {
      const saved = localStorage.getItem('watam_language');
      if (saved && this.translations[saved]) {
        this.setLanguage(saved);
        
        // Update dropdown
        const dropdown = document.getElementById('languageSelect');
        if (dropdown) {
          dropdown.value = saved;
        }
      }
    } catch (error) {
      console.error('[LanguageManager] Failed to load language preference:', error);
    }
  }
}

// Create global instance
window.languageManager = new LanguageManager();

// Initialize on DOM load - ONLY ONCE
let languageManagerInitialized = false;
document.addEventListener('DOMContentLoaded', () => {
  if (languageManagerInitialized) {
    console.log('[LanguageManager] Already initialized, skipping...');
    return;
  }
  
  console.log('[LanguageManager] DOM loaded, initializing...');
  languageManagerInitialized = true;
  
  // CRITICAL: Save ALL original English text IMMEDIATELY
  console.log('[LanguageManager] Saving original English text...');
  window.languageManager.saveAllOriginalText();
  
  const languageSelect = document.getElementById('languageSelect');
  
  if (languageSelect) {
    // Load saved preference
    window.languageManager.loadLanguagePreference();
    
    // Add change listener with immediate translation
    languageSelect.addEventListener('change', (e) => {
      console.log('[LanguageManager] Language changed to:', e.target.value);
      window.languageManager.setLanguage(e.target.value);
      
      // Force immediate translation with delay to ensure DOM is ready
      setTimeout(() => {
        console.log('[LanguageManager] Forcing UI translation...');
        window.languageManager.translateUI();
      }, 100);
    });
    
    console.log('[LanguageManager] Language selector initialized');
  } else {
    console.error('[LanguageManager] Language selector not found!');
  }
});

// Also initialize when window loads (backup)
window.addEventListener('load', () => {
  console.log('[LanguageManager] Window loaded, checking language...');
  if (window.languageManager) {
    // Save original text again in case new content was added
    window.languageManager.saveAllOriginalText();
    window.languageManager.loadLanguagePreference();
  }
});
