import prisma from '@config/database';
import { env } from '@config/env';

// Public marketing pages only — auth-gated (/discover) and auth (/login,
// /register) pages don't belong in the sitemap.
const STATIC_ROUTES = ['/', '/pricing', '/terms', '/privacy'];

const escapeXml = (s: string): string =>
  s.replace(/[<>&'"]/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c === "'" ? '&apos;' : '&quot;'
  );

export class SeoService {
  /** XML sitemap of public routes + PUBLISHED public events (by slug). */
  async generateSitemap(): Promise<string> {
    const base = env.FRONTEND_URL.replace(/\/$/, '');

    const [events, cards, communities] = await Promise.all([
      prisma.event.findMany({
        where: { status: 'PUBLISHED', deletedAt: null, visibility: 'PUBLIC' },
        select: { id: true, slug: true, updatedAt: true },
        orderBy: { startDate: 'desc' },
        take: 5000,
      }),
      // Public Tap Cards: live (ACTIVE) cards that have a shareable slug.
      prisma.founderCard.findMany({
        where: { status: 'ACTIVE', publicSlug: { not: null } },
        select: { publicSlug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 5000,
      }),
      // Public communities — their /community/:slug pages are indexable.
      prisma.community.findMany({
        where: { isPublic: true, deletedAt: null },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 5000,
      }),
    ]);

    const urls: { loc: string; lastmod?: string }[] = [
      ...STATIC_ROUTES.map((r) => ({ loc: `${base}${r}` })),
      ...events.map((e) => ({
        loc: `${base}/e/${escapeXml(e.slug ?? e.id)}`,
        lastmod: e.updatedAt.toISOString(),
      })),
      ...cards.map((c) => ({
        loc: `${base}/c/${escapeXml(c.publicSlug as string)}`,
        lastmod: c.updatedAt.toISOString(),
      })),
      ...communities.map((c) => ({
        loc: `${base}/community/${escapeXml(c.slug)}`,
        lastmod: c.updatedAt.toISOString(),
      })),
    ];

    const body = urls
      .map(
        (u) =>
          `  <url><loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
  }
}

export default new SeoService();
