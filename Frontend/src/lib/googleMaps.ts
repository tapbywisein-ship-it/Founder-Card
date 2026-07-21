// Loads the Google Maps JS API once, on demand, without an npm dependency.
// Uses the modern async bootstrap (`importLibrary`) so we pull only the
// `places` and `maps` libraries when the location picker first mounts.
//
// ponytail: `any`-typed SDK surface instead of pulling @types/google.maps.
// Add the types package if the picker grows and stricter typing pays off.

const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export const hasGoogleMapsKey = !!KEY;

let bootstrapped = false;

/**
 * Resolves once `window.google.maps.importLibrary` is available.
 * Uses Google's official inline bootstrap, which defines `importLibrary`
 * synchronously (each library then lazy-loads on first import). This avoids
 * the `loading=async` race where a plain script `onload` fires before
 * `importLibrary` exists.
 */
export function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only load in the browser'));
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.google?.maps?.importLibrary) return Promise.resolve();
  if (!KEY) return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not set'));

  if (!bootstrapped) {
    bootstrapped = true;
    // Google's documented bootstrap loader (minified), keyed for weekly channel.
    /* eslint-disable */
    ((g: any) => {
      let h: any, a: any, k: any, p = 'The Google Maps JavaScript API', c = 'google', l = 'importLibrary',
        q = '__ib__', m = document, b: any = window;
      b = b[c] || (b[c] = {});
      const d = b.maps || (b.maps = {}), r = new Set<string>(), e = new URLSearchParams(),
        u = () => h || (h = new Promise(async (f, n) => {
          a = m.createElement('script');
          e.set('libraries', [...r] + '');
          for (k in g) e.set(k.replace(/[A-Z]/g, (t: string) => '_' + t[0].toLowerCase()), g[k]);
          e.set('callback', c + '.maps.' + q);
          a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
          d[q] = f;
          a.onerror = () => (h = n(Error(p + ' could not load.')));
          a.nonce = (m.querySelector('script[nonce]') as any)?.nonce || '';
          m.head.append(a);
        }));
      d[l] ? console.warn(p + ' only loads once. Ignoring:', g)
        : (d[l] = (f: string, ...n: any[]) => r.add(f) && u().then(() => d[l](f, ...n)));
    })({ key: KEY, v: 'weekly' });
    /* eslint-enable */
  }

  return w.google?.maps?.importLibrary
    ? Promise.resolve()
    : Promise.reject(new Error('Failed to bootstrap Google Maps'));
}

/** Directions link to a place — opens the Google Maps app/site with navigation. */
export function mapsDirectionsUrl(lat: number, lng: number, placeId?: string | null): string {
  const base = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  return placeId ? `${base}&destination_place_id=${encodeURIComponent(placeId)}` : base;
}
