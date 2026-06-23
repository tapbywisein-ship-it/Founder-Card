import prisma from '@config/database';
import { env } from '@config/env';

const STATIC_ROUTES = ['/', '/discover', '/login', '/register'];

const escapeXml = (s: string): string =>
  s.replace(/[<>&'"]/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c === "'" ? '&apos;' : '&quot;'
  );

export class SeoService {
  /** XML sitemap of public routes + PUBLISHED public events (by slug). */
  async generateSitemap(): Promise<string> {
    const base = env.FRONTEND_URL.replace(/\/$/, '');

    const events = await prisma.event.findMany({
      where: { status: 'PUBLISHED', deletedAt: null, visibility: 'PUBLIC' },
      select: { id: true, slug: true, updatedAt: true },
      orderBy: { startDate: 'desc' },
      take: 5000,
    });

    const urls: { loc: string; lastmod?: string }[] = [
      ...STATIC_ROUTES.map((r) => ({ loc: `${base}${r}` })),
      ...events.map((e) => ({
        loc: `${base}/e/${escapeXml(e.slug ?? e.id)}`,
        lastmod: e.updatedAt.toISOString(),
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
