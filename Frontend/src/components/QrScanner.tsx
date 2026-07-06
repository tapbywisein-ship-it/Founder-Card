import { useEffect, useState } from 'react';
import { Scanner, setZXingModuleOverrides, type IDetectedBarcode } from '@yudiel/react-qr-scanner';
// Bundle the ZXing decoder WASM from our own origin (Vite emits it as a hashed
// asset) instead of the library's default runtime fetch from the jsDelivr CDN.
import zxingWasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, CameraOff, Keyboard } from 'lucide-react';

// Point the decoder at the self-hosted WASM. On browsers without a native
// BarcodeDetector (most desktops), the library MUST load this WASM to decode; a
// slow/blocked CDN made the camera run but never decode, with no error surfaced.
// Serving it same-origin makes scanning work reliably on every device/network.
setZXingModuleOverrides({
  locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? zxingWasmUrl : prefix + path),
});

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
  const [active, setActive] = useState(!manualOnly);
  const [showManual, setShowManual] = useState(manualOnly);
  const [permError, setPermError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const [seen, setSeen] = useState<string | null>(null);

  useEffect(() => {
    if (manualOnly) {
      setActive(false);
      setShowManual(true);
    }
  }, [manualOnly]);

  const handleDetect = (codes: IDetectedBarcode[]) => {
    if (!codes.length) return;
    const value = codes[0].rawValue;
    if (!value || value === seen) return;
    setSeen(value);
    onResult(value);
  };

  const handleError = (err: unknown) => {
    const e = err instanceof Error ? err : new Error(String(err));
    if (e.name === 'NotAllowedError') {
      setPermError('Camera permission denied. Use manual entry below.');
    } else if (e.name === 'NotFoundError') {
      setPermError('No camera found on this device.');
    } else {
      setPermError(e.message);
    }
    setActive(false);
    setShowManual(true);
    onError?.(e);
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
        <div className="aspect-square overflow-hidden rounded-card border border-border bg-black">
          <Scanner
            onScan={handleDetect}
            onError={handleError}
            formats={['qr_code']}
            constraints={{ facingMode: 'environment' }}
            styles={{ container: { width: '100%', height: '100%' } }}
          />
        </div>
      )}

      {permError && (
        <div className="rounded-card border border-border bg-card p-4 text-center">
          <CameraOff className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm text-foreground">{permError}</p>
        </div>
      )}

      {!active && !showManual && (
        <Button onClick={() => setActive(true)} variant="outline" className="w-full">
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
            {!manualOnly && (
              <Button
                variant="outline"
                onClick={() => {
                  setShowManual(false);
                  setPermError(null);
                  setActive(true);
                }}
              >
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
