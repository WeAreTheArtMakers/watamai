export type Emotion = 'frustrated' | 'excited' | 'confused' | 'neutral' | 'angry';

export interface EmotionDetection {
  emotion: Emotion;
  confidence: number;
}

const emotionKeywords: Record<Emotion, string[]> = {
  frustrated: ['frustrating', 'frustrated', 'annoying', 'broken', 'not working', 'stuck', 'ugh'],
  excited: ['excited', 'amazing', 'awesome', 'love', 'great', 'fantastic'],
  confused: ['confused', 'don\'t understand', 'how do', 'what is', 'help'],
  angry: ['angry', 'terrible', 'worst', 'hate', 'stupid', 'ridiculous'],
  neutral: [],
};

export function detectEmotion(text: string): EmotionDetection {
  const lowerText = text.toLowerCase();

  for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return {
          emotion: emotion as Emotion,
          confidence: 0.7,
        };
      }
    }
  }

  return { emotion: 'neutral', confidence: 0.5 };
}

export function getMirrorResponse(emotion: Emotion): string {
  const responses: Record<Emotion, string[]> = {
    frustrated: [
      'That sounds frustrating.',
      'I can see why that would be annoying.',
      'That must be frustrating to deal with.',
    ],
    excited: [
      'That sounds exciting!',
      'I can feel your enthusiasm!',
      'That\'s great to hear!',
    ],
    confused: [
      'Let me help clarify.',
      'I can help break this down.',
      'Good question, let me explain.',
    ],
    angry: [
      'I understand you\'re upset.',
      'That sounds really frustrating.',
      'I hear you.',
    ],
    neutral: ['', '', ''],
  };

  const options = responses[emotion];
  return options[Math.floor(Math.random() * options.length)];
}

export function shouldDeEscalate(text: string): boolean {
  const toxicPatterns = [
    /you('re| are) (stupid|dumb|idiot)/i,
    /shut up/i,
    /go to hell/i,
    /f[*u]ck (you|off)/i,
  ];

  return toxicPatterns.some((pattern) => pattern.test(text));
}

export function getDeEscalationResponse(): string {
  return "I'm here to help, but let's keep things respectful. If you have a specific question, I'm happy to assist.";
}

export function getExitResponse(): string {
  return "I think it's best if I step back from this conversation. Wishing you well.";
}
