import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { founderCardService } from '@/services/founderCard.service';
import { Nfc, Loader2 } from 'lucide-react';

interface NfcProvisionerProps {
  cardUrl: string;
}

interface NDEFReaderLike {
  write: (msg: string | { records: Array<{ recordType: string; data: string }> }) => Promise<void>;
}

const isWebNFCSupported = () => typeof window !== 'undefined' && 'NDEFReader' in window;
const isIOS = () =>
  typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent ?? '');

/**
 * Write the user's public card URL to a blank NFC sticker.
 *
 * Web NFC's `NDEFReader.write()` is Android-Chrome only. On iOS we render a
 * "use a Shortcut to write the URL" hint instead — the URL itself works on
 * iOS lock-screen NFC reads even without app code.
 */
export const NfcProvisioner = ({ cardUrl }: NfcProvisionerProps) => {
  const [busy, setBusy] = useState(false);
  const supported = isWebNFCSupported();

  if (!supported) {
    return (
      <p className="text-xs text-muted-foreground">
        {isIOS()
          ? 'iOS doesn’t expose Web NFC for writing. Use the iOS Shortcuts app to write your card URL to a sticker — iOS will read it from the lock screen.'
          : 'Use Chrome on Android to write your card URL to a blank NFC sticker.'}
      </p>
    );
  }

  const provision = async () => {
    setBusy(true);
    try {
      const NDEFReaderCtor = (window as unknown as {
        NDEFReader: new () => NDEFReaderLike;
      }).NDEFReader;
      const writer = new NDEFReaderCtor();
      // Write a single URL record. Browsers prompt the user once for permission.
      await writer.write({ records: [{ recordType: 'url', data: cardUrl }] });

      // The "tag id" we store is the URL itself — uniqueness is enforced by
      // the URL slug, and we mainly want to mark "user has a provisioned tag."
      await founderCardService.provisionNfc(cardUrl);
      toast.success('NFC tag provisioned. Tap another phone to share your card.');
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      toast.error(e.name === 'NotAllowedError' ? 'NFC permission denied' : e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button onClick={provision} disabled={busy} variant="outline" className="w-full">
        {busy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Nfc className="mr-2 h-4 w-4" />
        )}
        {busy ? 'Hold a blank tag close…' : 'Write my card to an NFC sticker'}
      </Button>
      <p className="text-xs text-muted-foreground">
        Press the button, then hold a blank NTAG sticker against your phone.
      </p>
    </div>
  );
};
