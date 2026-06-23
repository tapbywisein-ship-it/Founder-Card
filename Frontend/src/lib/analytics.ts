/**
 * Privacy-first analytics loader. Each vendor (GA4 / Clarity / Meta Pixel /
 * LinkedIn) loads ONLY when (a) its env var is set at build time, AND (b) the
 * user has granted cookie consent. Nothing tracks until both are true, so the
 * app ships GDPR/PDPB-safe and analytics activate by simply setting env IDs.
 *
 * Env (Vite, build-time):
 *   VITE_GA_ID, VITE_CLARITY_ID, VITE_META_PIXEL_ID, VITE_LINKEDIN_PARTNER_ID
 */

const CONSENT_KEY = 'fk-cookie-consent';
type Consent = 'granted' | 'denied' | null;

/* eslint-disable @typescript-eslint/no-explicit-any */
const w = () => window as any;

export function getConsent(): Consent {
  if (typeof window === 'undefined') return null;
  return (localStorage.getItem(CONSENT_KEY) as Consent) ?? null;
}

export function setConsent(value: 'granted' | 'denied'): void {
  localStorage.setItem(CONSENT_KEY, value);
  if (value === 'granted') loadAnalytics();
}

const GA = import.meta.env.VITE_GA_ID as string | undefined;
const CLARITY = import.meta.env.VITE_CLARITY_ID as string | undefined;
const META_PIXEL = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
const LINKEDIN = import.meta.env.VITE_LINKEDIN_PARTNER_ID as string | undefined;

/** True if at least one analytics tool is configured — drives whether the
 *  cookie banner needs to appear at all. */
export const analyticsConfigured = (): boolean =>
  Boolean(GA || CLARITY || META_PIXEL || LINKEDIN);

let loaded = false;

/** Inject configured vendor scripts. Idempotent; no-op without consent. */
export function loadAnalytics(): void {
  if (loaded || typeof document === 'undefined') return;
  if (getConsent() !== 'granted') return;
  loaded = true;

  if (GA) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA}`;
    document.head.appendChild(s);
    w().dataLayer = w().dataLayer || [];
    w().gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      w().dataLayer.push(arguments);
    };
    w().gtag('js', new Date());
    w().gtag('config', GA);
  }

  if (CLARITY) {
    (function (c: any, l: Document, a: string, r: string, i: string) {
      c[a] =
        c[a] ||
        function () {
          // eslint-disable-next-line prefer-rest-params
          (c[a].q = c[a].q || []).push(arguments);
        };
      const t = l.createElement(r) as HTMLScriptElement;
      t.async = true;
      t.src = 'https://www.clarity.ms/tag/' + i;
      const y = l.getElementsByTagName(r)[0];
      y.parentNode?.insertBefore(t, y);
    })(w(), document, 'clarity', 'script', CLARITY);
  }

  if (META_PIXEL) {
    /* eslint-disable */
    (function (f: any, b: Document, e: string, v: string) {
      if (f.fbq) return;
      const n: any = (f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      });
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
      const t = b.createElement(e) as HTMLScriptElement;
      t.async = true; t.src = v;
      const s = b.getElementsByTagName(e)[0];
      s.parentNode?.insertBefore(t, s);
    })(w(), document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    w().fbq('init', META_PIXEL);
    w().fbq('track', 'PageView');
  }

  if (LINKEDIN) {
    w()._linkedin_partner_id = LINKEDIN;
    w()._linkedin_data_partner_ids = w()._linkedin_data_partner_ids || [];
    w()._linkedin_data_partner_ids.push(LINKEDIN);
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
    document.head.appendChild(s);
  }
}

/** Fire a custom event to all loaded providers. No-op without consent. */
export function track(event: string, props?: Record<string, unknown>): void {
  if (getConsent() !== 'granted') return;
  if (w().gtag) w().gtag('event', event, props ?? {});
  if (w().fbq) w().fbq('trackCustom', event, props ?? {});
  if (w().clarity) w().clarity('event', event);
}

export const trackNfcScan = (p?: Record<string, unknown>) => track('nfc_scan', p);
export const trackQrScan = (p?: Record<string, unknown>) => track('qr_scan', p);
export const trackProfileView = (p?: Record<string, unknown>) => track('profile_view', p);
export const trackConnectionMade = (p?: Record<string, unknown>) => track('connection_made', p);
export const trackEventJoin = (p?: Record<string, unknown>) => track('event_join', p);
