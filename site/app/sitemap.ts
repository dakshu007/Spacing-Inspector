import type { MetadataRoute } from 'next';
import { SITE_URL } from './content';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, lastModified: new Date('2026-10-18'), changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date('2026-10-18'), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/llms.txt`, lastModified: new Date('2026-10-18'), changeFrequency: 'monthly', priority: 0.5 }
  ];
}
