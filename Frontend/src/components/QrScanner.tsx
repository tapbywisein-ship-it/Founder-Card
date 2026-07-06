import { useEffect, useState } from 'react';
import { Scanner, setZXingModuleOverrides, type IDetectedBarcode } from '@yudiel/react-qr-scanner';
// Bundle the ZXing decoder WASM from our own origin (Vite emits it as a hashed
// asset) instead of the library's default runtime fetch from the jsDelivr CDN.
import zxingWasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, CameraOff, Keyboard, Loader2 } from 'lucide-react';

// Point the decoder at the self-hosted WASM. On browsers without a native
// BarcodeDetector (all desktops AND iOS Safari), the library MUST load this WASM
// to decode; a slow/blocked CDN made the camera run but never decode, with no
// error surfaced. Serving it same-origin makes decoding work on every network.
setZXingModuleOverrides({
  locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? zxingWasmUrl : prefix + path),
});

// In-app browsers (links opened inside WhatsApp / Instagram / LinkedIn / Gmail
// etc.) route through WKWebView or SFSafariViewController, which on iOS SILENTLY
// deny getUserMedia — the camera never starts and no error is thrown, so the
// user just sees a black box. Detect these and steer the user to real Safari.
const IN_APP_BROWSER =
  /(FBAN|FBAV|FB_IAB|Instagram|Line\/|LinkedInApp|Snapchat|Pinterest|MicroMessenger|TikTok|musical_ly|GSA\/|WhatsApp|Telegram)/i;
const isInAppBrowser = () =>
  typeof navigator !== 'undefined' && IN_APP_BROWSER.test(navigator.userAgent);

interface QrScannerProps {
  /**
   * Called once on each unique decoded value. The wrapper debounces duplicate
   * decodes (most cameras fire many times for the same code) so the parent only
   * sees the first match.
   */
  onResult: (value: string) => void;
  /** Called if the scanner errors (e.g. camera permission denied). */
  onError?: (err: Error) => void;
  /** Hide the camera UI; only shows the manual-entry fallback. */
  manualOnly?: boolean;
}

/**
 * Camera QR scanner with sensible permission UX and a paste-the-URL fallback
 * for browsers/devices where camera access fails. The library wraps native
 * BarcodeDetector where present, ZXing-WASM elsewhere — no manual lib check
 * needed.
 */
export const QrScanner = ({ onResult, onError, manualOnly = false }: QrScannerProps) => {
  const inApp = isInAppBrowser();
  const [active, setActive] = useState(!manualOnly && !inApp);
  const [showManual, setShowManual] = useState(manualOnly || inApp);
  const [permError, setPermError] = useState<string | null>(
    inApp
      ? "This in-app browser can't open the camera. Tap the ••• menu and choose “Open in Safari” (or Chrome), then try Scan again — or enter the card link below."
      : null,
  );
  const [manual, setManual] = useState('');
  const [seen, setSeen] = useState<string | null>(null);
  // The camera can take a moment to start (and can stall silently on iOS). Show
  // a "starting" overlay immediately and a troubleshooting nudge if it hangs,
  // so the user never faces a mute black box with no feedback.
  const [starting, setStarting] = useState(false);
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    if (manualOnly) {
      setActive(false);
      setShowManual(true);
    }
  }, [manualOnly]);

  // Watchdog: when the camera is meant to be running, flag it as stalled if we
  // haven't seen a successful decode or a thrown error within a few seconds.
  useEffect(() => {
    if (!active || permError) {
      setStarting(false);
      setStalled(false);
      return;
    }
    setStarting(true);
    setStalled(false);
    const stopStarting = setTimeout(() => setStarting(false), 2500);
    const flagStalled = setTimeout(() => setStalled(true), 6000);
    return () => {
      clearTimeout(stopStarting);
      clearTimeout(flagStalled);
    };
  }, [active, permError]);

  const handleDetect = (codes: IDetectedBarcode[]) => {
    if (!codes.length) return;
    const value = codes[0].rawValue;
    if (!value || value === seen) return;
    setSeen(value);
    onResult(value);
  };

  const handleError = (err: unknown) => {
    const e = err instanceof Error ? err : new Error(String(err));
    if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
      setPermError('Camera permission was blocked. Allow camera access in your browser settings, or enter the card link below.');
    } else if (e.name === 'NotFoundError' || e.name === 'OverconstrainedError') {
      setPermError('No usable camera was found on this device. Enter the card link below instead.');
    } else if (e.name === 'NotReadableError') {
      setPermError('The camera is in use by another app. Close it and try again, or enter the card link below.');
    } else {
      setPermError(`${e.message || 'The camera could not start.'} You can enter the card link below instead.`);
    }
    setActive(false);
    setShowManual(true);
    onError?.(e);
  };

  const startCamera = () => {
    setPermError(null);
    setSeen(null);
    setShowManual(false);
    setActive(true);
  };

  const submitManual = () => {
    const v = manual.trim();
    if (!v) return;
    onResult(v);
    setManual('');
  };

  return (
    <div className="space-y-3">
      {active && !permError && (
        <div className="relative aspect-square overflow-hidden rounded-card border border-border bg-black">
          <Scanner
            onScan={handleDetect}
            onError={handleError}
            formats={['qr_code']}
            constraints={{ facingMode: 'environment' }}
            styles={{ container: { width: '100%', height: '100%' } }}
          />
          {starting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white pointer-events-none">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-xs">Starting camera…</p>
            </div>
          )}
        </div>
      )}

      {active && !permError && stalled && (
        <p className="text-center text-xs text-muted-foreground">
          Camera not showing? Make sure you allowed camera access (and that you're in Safari or Chrome,
          not an in-app browser). You can also enter the card link manually below.
        </p>
      )}

      {permError && (
        <div className="rounded-card border border-border bg-card p-4 text-center">
          <CameraOff className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm text-foreground">{permError}</p>
        </div>
      )}

      {!active && !showManual && (
        <Button onClick={startCamera} variant="outline" className="w-full">
          <Camera className="mr-2 h-4 w-4" /> Start camera
        </Button>
      )}

      {showManual ? (
        <div className="space-y-2">
          <Input
            placeholder="Paste a card URL or slug"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitManual()}
          />
          <div className="flex gap-2">
            <Button onClick={submitManual} disabled={!manual.trim()} className="flex-1">
              Connect
            </Button>
            {!manualOnly && !inApp && (
              <Button variant="outline" onClick={startCamera} title="Try the camera again">
                <Camera className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        <Button variant="ghost" onClick={() => setShowManual(true)} className="w-full text-xs">
          <Keyboard className="mr-2 h-3.5 w-3.5" /> Enter manually
        </Button>
      )}
    </div>
  );
};
