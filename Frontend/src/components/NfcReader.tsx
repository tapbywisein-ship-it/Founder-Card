import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Nfc, AlertTriangle, Loader2, QrCode } from 'lucide-react';

interface NfcReaderProps {
  /** Called with the URL or text payload of the first NFC tag scanned. */
  onResult: (value: string) => void;
  /** Optional callback when user wants to switch to QR fallback (iOS/unsupported). */
  onSwitchToQr?: () => void;
}

interface NDEFRecordLike {
  recordType: string;
  data?: ArrayBuffer | DataView;
  encoding?: string;
}

interface NDEFMessageLike {
  records: NDEFRecordLike[];
}

interface NDEFReadingEventLike extends Event {
  message: NDEFMessageLike;
}

interface NDEFReaderLike {
  scan: (opts?: { signal?: AbortSignal }) => Promise<void>;
  addEventListener: (type: 'reading' | 'readingerror', listener: (ev: Event) => void) => void;
  removeEventListener: (type: 'reading' | 'readingerror', listener: (ev: Event) => void) => void;
}

const isWebNFCSupported = () =>
  typeof window !== 'undefined' && 'NDEFReader' in window;

const isIOS = () =>
  typeof navigator !== 'undefined' &&
  /iPad|iPhone|iPod/.test(navigator.userAgent ?? '');

const decodeRecord = (rec: NDEFRecordLike): string | null => {
  if (!rec.data) return null;
  const buf = rec.data instanceof DataView ? rec.data.buffer : rec.data;
  const decoder = new TextDecoder(rec.encoding ?? 'utf-8');
  const text = decoder.decode(buf);
  if (rec.recordType === 'text') {
    // First 1+1 bytes are status + lang code; strip them when present.
    return text.replace(/^[\x00-\x1F].{0,5}/, '');
  }
  return text;
};

/**
 * Scan a physical NFC tag and surface its decoded payload.
 *
 * Web NFC (NDEFReader) is supported on Chrome for Android only. iOS Safari
 * has no API access — we render an explicit fallback explaining "use QR".
 */
export const NfcReader = ({ onResult, onSwitchToQr }: NfcReaderProps) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const supported = isWebNFCSupported();
  const ios = isIOS();

  const start = async () => {
    if (!supported) return;
    setError(null);
    setDone(null);
    setScanning(true);

    const NDEFReaderCtor = (window as unknown as {
      NDEFReader: new () => NDEFReaderLike;
    }).NDEFReader;
    const reader = new NDEFReaderCtor();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const onReading = (raw: Event) => {
      const ev = raw as NDEFReadingEventLike;
      for (const rec of ev.message.records) {
        const v = decodeRecord(rec);
        if (v) {
          setDone(v);
          setScanning(false);
          ctrl.abort();
          onResult(v);
          return;
        }
      }
    };
    const onReadingError = () => {
      setError('Could not read tag — try again');
    };

    reader.addEventListener('reading', onReading);
    reader.addEventListener('readingerror', onReadingError);

    try {
      await reader.scan({ signal: ctrl.signal });
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      if (e.name !== 'AbortError') {
        setError(e.message || 'NFC scan failed');
      }
      setScanning(false);
    }
  };

  if (!supported) {
    return (
      <div className="rounded-card border border-border bg-card p-5 text-center space-y-3">
        <AlertTriangle className="mx-auto h-7 w-7 text-amber-500" />
        <div>
          <h4 className="text-base font-semibold text-foreground">
            {ios ? 'NFC not supported on iOS' : 'Web NFC unavailable'}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            {ios
              ? "iOS doesn't let websites read NFC tags. Your TapByWisein card still works — use the QR scanner to connect."
              : "Your browser doesn't support Web NFC. Open this page in Chrome on Android, or scan the QR code instead."}
          </p>
        </div>
        {onSwitchToQr && (
          <Button onClick={onSwitchToQr} className="w-full">
            <QrCode className="mr-2 h-4 w-4" /> Switch to QR scanner
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-card border border-border bg-card p-6 text-center">
        <Nfc
          className={`mx-auto mb-3 h-10 w-10 ${
            scanning ? 'animate-pulse text-primary' : 'text-muted-foreground'
          }`}
        />
        <p className="text-sm text-foreground">
          {scanning
            ? 'Hold a TapByWisein card near your phone…'
            : done
              ? 'Tag read — connecting…'
              : 'Tap "Start" then bring another phone or sticker close.'}
        </p>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
      {!scanning && (
        <Button onClick={start} className="w-full">
          <Nfc className="mr-2 h-4 w-4" /> Start NFC scan
        </Button>
      )}
      {scanning && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            abortRef.current?.abort();
            setScanning(false);
          }}
        >
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cancel
        </Button>
      )}
    </div>
  );
};
