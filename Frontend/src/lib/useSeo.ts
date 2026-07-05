import { useEffect } from 'react';

const SITE = 'https://www.tapbywisein.com';
const BRAND = 'TapByWisein';

export interface SeoOptions {
  /** Page title (brand is appended automatically). Falls back to the brand. */
  title?: string;
  description?: string;
  /** Absolute URL or a path like '/e/foo' — becomes canonical + og:url. */
  canonical?: string;
  /** Absolute image URL for og:image / twitter:image. */
  image?: string;
  /** og:type — 'website' | 'article' | 'profile'. Default 'website'. */
  type?: string;
  noindex?: boolean;
}

function absolute(url?: string): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return SITE + (url.startsWith('/') ? url : `/${url}`);
}

/** Upsert a <meta>/<link> tag; returns a fn restoring the prior state. */
function upsert(tag: 'meta' | 'link', selector: string, attrs: Record<string, string>): () => void {
  let el = document.head.querySelector<HTMLElement>(selector);
  const created = !el;
  const prev: Record<string, string | null> = {};
  if (!el) {
    el = document.createElement(tag);
    document.head.appendChild(el);
  }
  for (const [k, v] of Object.entries(attrs)) {
    prev[k] = el.getAttribute(k);
    el.setAttribute(k, v);
  }
  return () => {
    if (!el) return;
    if (created) {
      el.remove();
      return;
    }
    for (const [k, v] of Object.entries(prev)) {
      if (v === null) el.removeAttribute(k);
      else el.setAttribute(k, v);
    }
  };
}

/**
 * Per-route SEO for client-rendered SPA pages: sets <title>, description,
 * canonical, and Open Graph / Twitter tags while mounted, restoring the
 * index.html defaults on unmount. Crawlers that execute JS (Googlebot) pick
 * these up; no-JS crawlers are served the prerendered HTML (edge middleware).
 * Consistent with the imperative-head approach used by useJsonLd.
 */
export function useSeo({ title, description, canonical, image, type = 'website', noindex }: SeoOptions): void {
  const url = absolute(canonical);
  const img = absolute(image);

  useEffect(() => {
    const fullTitle = title ? `${title} | ${BRAND}` : BRAND;
    const prevTitle = document.title;
    document.title = fullTitle;

    const restores: Array<() => void> = [];
    const metaName = (name: string, content?: string) => {
      if (content) restores.push(upsert('meta', `meta[name="${name}"]`, { name, content }));
    };
    const metaProp = (property: string, content?: string) => {
      if (content) restores.push(upsert('meta', `meta[property="${property}"]`, { property, content }));
    };

    metaName('description', description);
    if (noindex) metaName('robots', 'noindex, nofollow');
    if (url) restores.push(upsert('link', 'link[rel="canonical"]', { rel: 'canonical', href: url }));
    metaProp('og:title', fullTitle);
    metaProp('og:description', description);
    metaProp('og:url', url);
    metaProp('og:image', img);
    metaProp('og:type', type);
    metaName('twitter:title', fullTitle);
    metaName('twitter:description', description);
    metaName('twitter:image', img);

    return () => {
      document.title = prevTitle;
      for (const restore of restores) restore();
    };
  }, [title, description, url, img, type, noindex]);
}
