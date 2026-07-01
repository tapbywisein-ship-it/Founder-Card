import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PortalLayout } from '@/components/PortalLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { useAppStore } from '@/store/appStore';
import { useMyCard } from '@/hooks/useFounderCard';
import { useMyProfile } from '@/hooks/useProfile';
import { useActiveEventId } from '@/lib/useActiveEvent';
import { connectionsService } from '@/services/connections.service';
import { QrScanner } from '@/components/QrScanner';
import { NfcReader } from '@/components/NfcReader';
import { NfcProvisioner } from '@/components/NfcProvisioner';
import { Scan, QrCode, Nfc, Sparkles, UserPlus } from 'lucide-react';

const ConnectPage = () => {
  const [mode, setMode] = useState<'scan' | 'show' | 'nfc'>('show');
  const user = useAppStore((s) => s.user);
  const { data: card } = useMyCard();
  const { data: profileData } = useMyProfile();
  const activeEventId = useActiveEventId();
  const navigate = useNavigate();

  const profile = profileData?.profile;
  const fullName = profile ? `${profile.firstName} ${profile.lastName}` : user?.name ?? '';

  // The QR encodes the public-card URL. Anyone scanning it (TapByWisein app or a
  // generic QR reader) lands on the same /c/:slug page.
  const cardSlug = (card as { publicSlug?: string | null } | undefined)?.publicSlug;
  const cardUrl = cardSlug
    ? `${window.location.origin}/c/${cardSlug}`
    : `${window.location.origin}/card/${user?.id ?? ''}`;

  const connect = useMutation({
    mutationFn: async (qrData: string) =>
      connectionsService.connectViaScan({
        qrData,
        eventId: activeEventId ?? undefined,
        method: 'QR',
      }),
    onSuccess: (res) => {
      toast.success('Saved to your network');
      const otherId =
        res.data.requesterId === user?.id ? res.data.receiverId : res.data.requesterId;
      navigate(`/card/${otherId}`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not connect');
    },
  });

  return (
    <PortalLayout>
      <div className="space-y-6 pb-24 md:pb-8">
        <h1 className="text-3xl font-semibold text-foreground">Connect</h1>

        {/* Mode tabs */}
        <div className="flex gap-1 p-1 bg-card border border-border rounded-card shadow-card-xs rounded-xl">
          {([
            { key: 'show', label: 'My QR', icon: QrCode },
            { key: 'scan', label: 'Scan', icon: Scan },
            { key: 'nfc', label: 'NFC', icon: Nfc },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                mode === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {mode === 'show' && (
          <Surface className="text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-semibold">
                {fullName[0] ?? 'U'}
              </div>
              <div className="text-left">
                <p className="text-lg font-semibold text-foreground">{fullName}</p>
                <p className="text-xs text-muted-foreground">{profileData?.email}</p>
              </div>
            </div>

            <div className="bg-foreground p-5 rounded-2xl inline-block mb-6">
              <QRCodeSVG
                value={cardUrl}
                size={200}
                bgColor="#E8E0D0"
                fgColor="#0D0D0D"
                level="M"
              />
            </div>

            {card?.status === 'ACTIVE' && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">TapByWisein Card Active</span>
              </div>
            )}

            <p className="text-xs text-muted-foreground mb-4">
              Others can scan this to view your card and connect.
            </p>
            <Button
              size="sm"
              onClick={() => {
                if (navigator.share) {
                  navigator
                    .share({ title: `Connect with ${fullName} on TapByWisein`, url: cardUrl })
                    .catch(() => {});
                } else {
                  navigator.clipboard?.writeText(cardUrl).then(
                    () => toast.success('Card URL copied'),
                    () => toast.error('Copy failed'),
                  );
                }
              }}
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Share Card
            </Button>

            {card?.status === 'ACTIVE' && (
              <div className="mt-6 border-t border-border pt-4 text-left">
                <p className="mb-2 text-sm font-semibold text-foreground">Provision an NFC sticker</p>
                <NfcProvisioner cardUrl={cardUrl} />
              </div>
            )}
          </Surface>
        )}

        {mode === 'scan' && (
          <Surface>
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-foreground">Scan a card</h3>
              <p className="text-xs text-muted-foreground">
                Point your camera at another person's TapByWisein QR code.
                {activeEventId && ' This scan will be tagged to this event.'}
              </p>
            </div>
            <QrScanner
              onResult={(value) => {
                if (!connect.isPending) connect.mutate(value);
              }}
            />
          </Surface>
        )}

        {mode === 'nfc' && (
          <Surface>
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-foreground">Tap to connect</h3>
              <p className="text-xs text-muted-foreground">
                Bring two TapByWisein-enabled phones close to exchange cards.
                {activeEventId && ' This tap will be tagged to this event.'}
              </p>
            </div>
            <NfcReader
              onSwitchToQr={() => setMode('scan')}
              onResult={(value) => {
                if (!connect.isPending) {
                  // NFC payload is a URL/text. The backend's connectViaScan
                  // unifies QR/NFC parsing, so we just pass it through with method tag.
                  connectionsService
                    .connectViaScan({
                      qrData: value,
                      eventId: activeEventId ?? undefined,
                      method: 'NFC',
                    })
                    .then((res) => {
                      toast.success('Saved to your network');
                      const otherId =
                        res.data.requesterId === user?.id
                          ? res.data.receiverId
                          : res.data.requesterId;
                      navigate(`/card/${otherId}`);
                    })
                    .catch((err) => {
                      toast.error(err instanceof Error ? err.message : 'Could not connect');
                    });
                }
              }}
            />
          </Surface>
        )}

        {/* Stats */}
        <Surface>
          <h3 className="text-sm font-medium text-foreground mb-3">Your Profile Stats</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Profile views', value: '' },
              { label: 'QR scans', value: '' },
              { label: 'Connections', value: '' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </Surface>
      </div>
    </PortalLayout>
  );
};

export default ConnectPage;
