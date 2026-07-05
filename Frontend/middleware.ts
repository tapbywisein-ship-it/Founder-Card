// Vercel Edge Middleware — dynamic rendering for crawlers.
//
// Public event (/e/:id) and card (/c/:slug) pages are client-rendered, so
// crawlers and social unfurlers see an empty SPA shell. This middleware detects
// bot user-agents on those routes and serves the backend's prerendered HTML
// (full <title>/description/canonical/OG/JSON-LD + visible content) instead.
// Humans always fall through to the SPA. This is Google-sanctioned "dynamic
// rendering", not cloaking — the bot HTML reflects the same content users see.

export const config = {
  matcher: ['/e/:path*', '/c/:path*'],
};

const BACKEND = 'https://founder-card.onrender.com';

// Search engines + social unfurlers. Kept broad; humans never match.
const BOT_UA =
  /(googlebot|google-inspectiontool|bingbot|slurp|duckduckbot|baiduspider|yandex(bot)?|sogou|exabot|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|slack-imgproxy|telegrambot|whatsapp|discordbot|applebot|pinterest(bot)?|redditbot|embedly|quora link preview|skypeuripreview|nuzzel|bitlybot|vkshare|w3c_validator)/i;

export default async function middleware(request: Request): Promise<Response | undefined> {
  const ua = request.headers.get('user-agent') ?? '';
  if (!BOT_UA.test(ua)) return; // human → SPA

  const { pathname } = new URL(request.url);
  const eMatch = pathname.match(/^\/e\/([^/]+)\/?$/);
  const cMatch = pathname.match(/^\/c\/([^/]+)\/?$/);

  let target: string | null = null;
  if (eMatch) target = `${BACKEND}/og/e/${encodeURIComponent(eMatch[1])}`;
  else if (cMatch) target = `${BACKEND}/og/c/${encodeURIComponent(cMatch[1])}`;
  if (!target) return;

  try {
    // Cap the wait so a cold Render backend never hangs the crawler — on
    // timeout/error we fall through to the SPA (no worse than today).
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(target, {
      headers: { 'user-agent': ua, accept: 'text/html' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok && res.status !== 404) return; // fall through on backend error
    const html = await res.text();
    return new Response(html, {
      status: res.status,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300, s-maxage=900',
        'x-prerender': '1',
      },
    });
  } catch {
    return; // timeout / network error → SPA
  }
}
