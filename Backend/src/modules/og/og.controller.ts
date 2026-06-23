import { Request, Response } from 'express';
import ogService from './og.service';
import { env } from '@config/env';

const CACHE_HEADER = 'public, max-age=300, s-maxage=900';

const baseUrl = (req: Request) => {
  const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0] ?? req.protocol ?? 'https';
  const host = (req.headers['x-forwarded-host'] as string) ?? req.headers.host ?? '';
  return `${proto}://${host}`;
};

export class OgController {
  async cardImage(req: Request, res: Response): Promise<void> {
    const { slug } = req.params as Record<string, string>;
    const cleanSlug = slug.replace(/\.png$/, '');
    const buf = await ogService.cardPng(cleanSlug);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', CACHE_HEADER);
    res.end(buf);
  }

  async eventImage(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    const cleanId = id.replace(/\.png$/, '');
    const buf = await ogService.eventPng(cleanId);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', CACHE_HEADER);
    res.end(buf);
  }

  /**
   * Crawler-facing HTML for /og/c/:slug. Returns a small HTML page with full
   * OG/Twitter meta tags (so iMessage, WhatsApp, LinkedIn unfurl) and a JS
   * redirect to the SPA route for humans.
   */
  async cardHtml(req: Request, res: Response): Promise<void> {
    const { slug } = req.params as Record<string, string>;
    try {
      const meta = await ogService.cardMeta(slug);
      const imgUrl = `${baseUrl(req)}/api/${env.API_VERSION}/og/card/${encodeURIComponent(slug)}.png`;
      const spaUrl = `${env.FRONTEND_URL}/c/${encodeURIComponent(slug)}`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', CACHE_HEADER);
      res.send(renderCrawlerHtml({ title: meta.title, description: meta.description, imgUrl, redirectUrl: spaUrl }));
    } catch {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(404).send(renderCrawlerHtml({
        title: 'Card not found · Founder Key',
        description: 'This Founder Key card link is no longer valid.',
        imgUrl: `${env.FRONTEND_URL}/og-default.png`,
        redirectUrl: env.FRONTEND_URL,
      }));
    }
  }

  async eventHtml(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    try {
      const meta = await ogService.eventMeta(id);
      const imgUrl = `${baseUrl(req)}/api/${env.API_VERSION}/og/event/${encodeURIComponent(id)}.png`;
      const spaUrl = `${env.FRONTEND_URL}/e/${encodeURIComponent(id)}`;
      const jsonLd = await ogService.eventJsonLd(id, spaUrl);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', CACHE_HEADER);
      res.send(renderCrawlerHtml({ title: meta.title, description: meta.description, imgUrl, redirectUrl: spaUrl, jsonLd: jsonLd ?? undefined }));
    } catch {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(404).send(renderCrawlerHtml({
        title: 'Event not found · Founder Key',
        description: 'This Founder Key event link is no longer valid.',
        imgUrl: `${env.FRONTEND_URL}/og-default.png`,
        redirectUrl: env.FRONTEND_URL,
      }));
    }
  }
}

const escapeHtml = (s: string) =>
  s.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });

function renderCrawlerHtml(opts: {
  title: string;
  description: string;
  imgUrl: string;
  redirectUrl: string;
  jsonLd?: string;
}) {
  const t = escapeHtml(opts.title);
  const d = escapeHtml(opts.description);
  const img = escapeHtml(opts.imgUrl);
  const url = escapeHtml(opts.redirectUrl);
  // JSON-LD is embedded raw inside a script tag; guard against </script> breakout.
  const ld = opts.jsonLd
    ? `<script type="application/ld+json">${opts.jsonLd.replace(/<\//g, '<\\/')}</script>`
    : '';
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${t}</title>
<meta name="description" content="${d}"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="${t}"/>
<meta property="og:description" content="${d}"/>
<meta property="og:image" content="${img}"/>
<meta property="og:url" content="${url}"/>
<meta property="og:site_name" content="FounderKey"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${t}"/>
<meta name="twitter:description" content="${d}"/>
<meta name="twitter:image" content="${img}"/>
<link rel="canonical" href="${url}"/>
${ld}
<meta http-equiv="refresh" content="0; url=${url}"/>
</head><body>
<p>Redirecting to <a href="${url}">${url}</a>…</p>
<script>window.location.replace(${JSON.stringify(opts.redirectUrl)});</script>
</body></html>`;
}

export default new OgController();
