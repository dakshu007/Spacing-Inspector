import type { MetadataRoute } from 'next';
import { SITE_URL } from './content';

export const dynamic = 'force-static';

// Search engines and AI assistants (for AI Overviews, ChatGPT, Claude,
// Perplexity, Gemini, DeepSeek and others) are all welcome to read the site.
const AI_AGENTS = [
  'Googlebot',
  'Google-Extended',
  'GoogleOther',
  'Bingbot',
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'DeepSeekBot',
  'Applebot',
  'Applebot-Extended',
  'meta-externalagent',
  'Amazonbot',
  'DuckAssistBot',
  'MistralAI-User',
  'cohere-ai',
  'YouBot',
  'CCBot'
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }, ...AI_AGENTS.map((userAgent) => ({ userAgent, allow: '/' }))],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL
  };
}
