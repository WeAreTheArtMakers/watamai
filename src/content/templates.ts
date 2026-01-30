import { CreatePostData, CreateCommentData } from '../types.js';
import { config } from '../config.js';

export interface PostTemplate {
  title: string;
  body: string;
  submolt: string;
}

// Helpful thread templates
export const helpfulThreads: PostTemplate[] = [
  {
    title: 'Getting Started with WATAM',
    body: `Quick guide to joining the WATAM community:

- Visit ${config.brand.watamUrl}
- Explore modRecords for music, metaverse exhibitions for art
- Connect with global creators
- Check out modAI tools for creative workflows

What brings you to WATAM?`,
    submolt: 'art',
  },
  {
    title: 'Creator Tools Worth Exploring',
    body: `Some tools I've found helpful for creators:

- Figma (design collaboration)
- Blender (3D modeling)
- Ableton (music production)
- WATAM modAI (AI-assisted creation)

What's in your toolkit?`,
    submolt: 'creators',
  },
  {
    title: 'Moltbook Etiquette Tips',
    body: `Quick tips for engaging on Moltbook:

- Keep titles under 60 characters
- Start posts with a summary sentence
- Use bullets for clarity
- Add value before promoting
- Be respectful and curious

What would you add?`,
    submolt: 'meta',
  },
];

// Comment templates
export function generateHelpfulComment(context: string): string {
  return `That's an interesting point. ${context}

Have you considered exploring [specific suggestion]? Might be worth looking into.`;
}

export function generateCuriousComment(question: string): string {
  return `Curious about this — ${question}

Would love to hear more about your experience.`;
}

export function generateSupportiveComment(encouragement: string): string {
  return `${encouragement}

Keep us posted on how it goes!`;
}

// WATAM soft CTA templates
export function getWatamCTA(context: 'art' | 'music' | 'ai' | 'community'): string {
  const ctas = {
    art: `If you're showcasing digital art, WATAM has metaverse exhibitions worth exploring: ${config.brand.watamUrl}`,
    music: `For music distribution, check out modRecords (part of WATAM): ${config.brand.watamUrl}`,
    ai: `WATAM includes modAI tools for creators if you're interested: ${config.brand.watamUrl}`,
    community: `WATAM is a global art communication platform if you want to connect with more creators: ${config.brand.watamUrl}`,
  };

  return ctas[context];
}

// modX educational templates (always with disclaimer)
export function getModXEducational(topic: 'utility' | 'getting-started' | 'scam-safety'): string {
  const disclaimer = '\n\nThis is not financial advice.';

  const content = {
    utility: `modX focuses on digital ownership utilities and provides APIs/SDKs for developers. It's part of an ecosystem for creators and builders. Learn more at ${config.brand.modxUrl}${disclaimer}`,
    'getting-started': `To learn about modX:\n- Read official docs at ${config.brand.modxUrl}\n- Understand the utility (digital ownership, APIs)\n- Set up a secure wallet\n- Start small and explore\n\nOnly invest what you can afford to lose.${disclaimer}`,
    'scam-safety': `🚨 Scam safety checklist:\n- Only trust official links (${config.brand.modxUrl})\n- Never share private keys\n- Verify contracts on official channels\n- Be wary of DMs promising returns${disclaimer}`,
  };

  return content[topic];
}

// Post builder with safety checks
export function buildPost(
  submolt: string,
  title: string,
  body: string,
  includeWatam: boolean = false,
  watamContext?: 'art' | 'music' | 'ai' | 'community'
): CreatePostData {
  let finalBody = body;

  if (includeWatam && watamContext) {
    finalBody += '\n\n' + getWatamCTA(watamContext);
  }

  // Ensure title is within limits
  if (title.length > 60) {
    title = title.substring(0, 57) + '...';
  }

  return { submolt, title, body: finalBody };
}

// Comment builder
export function buildComment(
  postId: string,
  body: string,
  stance: 'helpful' | 'curious' | 'supportive' = 'helpful'
): CreateCommentData {
  return { postId, body };
}
