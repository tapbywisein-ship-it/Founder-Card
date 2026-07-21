import { useEffect, useRef, useState } from 'react';
import { MapPin, ExternalLink } from 'lucide-react';
import { loadGoogleMaps, hasGoogleMapsKey, mapsDirectionsUrl } from '@/lib/googleMaps';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface PickedLocation {
  /** Venue / display name, e.g. "Google Hyderabad". */
  name: string;
  /** Full formatted address. */
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  latitude: number;
  longitude: number;
  placeId: string;
}

interface Props {
  /** Current coordinates, if a place was already chosen (drives the map preview). */
  latitude?: number | null;
  longitude?: number | null;
  placeId?: string | null;
  onPick: (loc: PickedLocation) => void;
}

/** Reads city/state/country/pincode out of a Place's addressComponents. */
function parseComponents(components: any[]): Pick<PickedLocation, 'city' | 'state' | 'country' | 'pincode'> {
  const out = { city: '', state: '', country: '', pincode: '' };
  for (const c of components ?? []) {
    const types: string[] = c.types ?? [];
    const long = c.longText ?? c.long_name ?? '';
    if (types.includes('postal_code')) out.pincode = long;
    else if (types.includes('country')) out.country = long;
    else if (types.includes('administrative_area_level_1')) out.state = long;
    // Prefer locality; fall back to postal_town / sublocality for places that lack a city.
    else if (types.includes('locality')) out.city = long;
    else if (!out.city && (types.includes('postal_town') || types.includes('sublocality'))) out.city = long;
  }
  return out;
}

/**
 * Google Places venue search with a live map preview.
 * Picking a suggestion fills the parent's address fields and stores
 * coordinates + place id. Clicking the map opens Google Maps directions.
 */
export function LocationPicker({ latitude, longitude, placeId, onPick }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<any>(null);
  const markerObj = useRef<any>(null);
  const [error, setError] = useState<string>('');
  const [ready, setReady] = useState(false);

  // Mount the autocomplete web component once Maps is loaded.
  useEffect(() => {
    if (!hasGoogleMapsKey) {
      setError('Location search is disabled — set VITE_GOOGLE_MAPS_API_KEY.');
      return;
    }
    let cancelled = false;

    loadGoogleMaps()
      .then(async () => {
        if (cancelled || !boxRef.current) return;
        const { PlaceAutocompleteElement } = (await (window as any).google.maps.importLibrary('places')) as any;

        const el: any = new PlaceAutocompleteElement();
        el.style.width = '100%';
        boxRef.current.innerHTML = '';
        boxRef.current.appendChild(el);
        setReady(true);

        el.addEventListener('gmp-select', async ({ placePrediction }: any) => {
          const place = placePrediction.toPlace();
          await place.fetchFields({
            fields: ['displayName', 'formattedAddress', 'location', 'addressComponents', 'id'],
          });
          const lat = place.location?.lat();
          const lng = place.location?.lng();
          if (lat == null || lng == null) return;
          const parts = parseComponents(place.addressComponents ?? []);
          onPick({
            name: place.displayName ?? '',
            address: place.formattedAddress ?? '',
            latitude: lat,
            longitude: lng,
            placeId: place.id ?? '',
            ...parts,
          });
        });
      })
      .catch((e) => !cancelled && setError(e.message || 'Failed to load Google Maps'));

    return () => {
      cancelled = true;
    };
    // onPick is stable enough for this one-time setup; re-running would re-mount the widget.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render / update the map preview whenever coordinates change.
  useEffect(() => {
    if (latitude == null || longitude == null || !mapRef.current) return;
    let cancelled = false;

    loadGoogleMaps()
      .then(async () => {
        if (cancelled || !mapRef.current) return;
        const { Map, Marker } = (await (window as any).google.maps.importLibrary('maps')) as any;
        const pos = { lat: latitude, lng: longitude };

        if (!mapObj.current) {
          mapObj.current = new Map(mapRef.current, {
            center: pos,
            zoom: 15,
            disableDefaultUI: true,
            clickableIcons: false,
          });
          // Any click on the map opens Google Maps navigation in a new tab.
          mapObj.current.addListener('click', () => {
            window.open(mapsDirectionsUrl(latitude, longitude, placeId), '_blank', 'noopener');
          });
        } else {
          mapObj.current.setCenter(pos);
        }

        if (!markerObj.current) {
          markerObj.current = new Marker({ map: mapObj.current, position: pos });
        } else {
          markerObj.current.setPosition(pos);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, placeId]);

  const hasCoords = latitude != null && longitude != null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="w-3.5 h-3.5" />
        <span>Search a venue or address</span>
      </div>
      {/* Google's autocomplete web component mounts here. */}
      <div ref={boxRef} className="gmp-autocomplete w-full [&_gmp-place-autocomplete]:w-full" />
      {!ready && !error && (
        <p className="text-xs text-muted-foreground">Loading location search…</p>
      )}
      {error && <p className="text-xs text-amber-600">{error}</p>}

      {hasCoords && (
        <div className="space-y-1">
          <div
            ref={mapRef}
            role="button"
            tabIndex={0}
            title="Open in Google Maps"
            className="w-full h-44 rounded-xl border border-border overflow-hidden cursor-pointer"
          />
          <a
            href={mapsDirectionsUrl(latitude!, longitude!, placeId)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3" /> Open in Google Maps
          </a>
        </div>
      )}
    </div>
  );
}
