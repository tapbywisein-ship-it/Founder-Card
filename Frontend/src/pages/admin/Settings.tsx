import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Mail, Palette, ToggleLeft } from 'lucide-react';
import { usePlatformSettings, useUpdatePlatformSetting } from '@/hooks/useAdmin';
import { toast } from 'sonner';

interface PlatformSetting {
  key: string;
  value: string;
  type: string;
  label?: string;
}

const BRANDING_KEYS = [
  { key: 'platform.name', label: 'Platform name', placeholder: 'Founder Key', type: 'string' },
  { key: 'platform.logoUrl', label: 'Logo URL', placeholder: 'https://…/logo.svg', type: 'string' },
  { key: 'platform.brandColor', label: 'Primary brand colour', placeholder: '#5b8def', type: 'string' },
] as const;

const FEATURE_FLAGS = [
  { key: 'feature.nfc', label: 'NFC tap-to-connect', description: 'Enable NFC card reading on supported devices' },
  { key: 'feature.gamification', label: 'Gamification (FK Score & badges)', description: 'Show leaderboard, badges, and score breakdown' },
  { key: 'feature.publicShare', label: 'Public event sharing', description: 'Allow events to be viewable without sign-in' },
  { key: 'feature.csvImport', label: 'CSV bulk invites', description: 'Organizers can import attendees from a CSV' },
] as const;

const AdminSettingsPage = () => {
  const { data: settings, isLoading } = usePlatformSettings();
  const updateSetting = useUpdatePlatformSetting();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const settingsList = (settings ?? []) as PlatformSetting[];
  const byKey = (k: string) => settingsList.find((s) => s.key === k);

  // Seed draft fields from server values once loaded.
  useEffect(() => {
    if (!settingsList.length) return;
    setDrafts((prev) => {
      const next = { ...prev };
      for (const s of settingsList) {
        if (next[s.key] === undefined) next[s.key] = s.value;
      }
      return next;
    });
  }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveBranding = (key: string, type = 'string') => {
    const value = drafts[key] ?? '';
    updateSetting.mutate({ key, value, type, label: key });
  };

  const toggleFlag = (key: string) => {
    const current = byKey(key)?.value === 'true' || drafts[key] === 'true';
    const next = current ? 'false' : 'true';
    setDrafts((prev) => ({ ...prev, [key]: next }));
    updateSetting.mutate({ key, value: next, type: 'boolean', label: key });
  };

  const isFlagOn = (key: string) => {
    const v = drafts[key] ?? byKey(key)?.value;
    return v === 'true';
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6 pb-12">
        <h1 className="text-3xl font-semibold text-foreground">Platform Settings</h1>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Branding */}
            <Surface>
              <div className="flex items-center gap-2 mb-4">
                <Palette className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold text-foreground">Branding</h2>
              </div>
              <div className="space-y-4">
                {BRANDING_KEYS.map((b) => (
                  <div key={b.key}>
                    <label className="text-sm font-medium text-foreground block mb-1.5">
                      {b.label}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={drafts[b.key] ?? byKey(b.key)?.value ?? ''}
                        onChange={(e) => setDrafts((p) => ({ ...p, [b.key]: e.target.value }))}
                        placeholder={b.placeholder}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveBranding(b.key, b.type)}
                        disabled={updateSetting.isPending}
                      >
                        <Save className="w-3.5 h-3.5 mr-1" /> Save
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Surface>

            {/* Feature flags */}
            <Surface>
              <div className="flex items-center gap-2 mb-4">
                <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold text-foreground">Feature flags</h2>
              </div>
              <div className="space-y-3">
                {FEATURE_FLAGS.map((f) => {
                  const on = isFlagOn(f.key);
                  return (
                    <div
                      key={f.key}
                      className="flex items-start justify-between gap-4 p-3 rounded-xl border border-border bg-card/30"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{f.label}</p>
                        <p className="text-xs text-muted-foreground">{f.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleFlag(f.key)}
                        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                          on ? 'bg-primary/30' : 'bg-muted'
                        }`}
                        aria-pressed={on}
                      >
                        <div
                          className={`w-5 h-5 rounded-full absolute top-0.5 transition-all ${
                            on ? 'right-0.5 bg-primary' : 'left-0.5 bg-muted-foreground'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </Surface>

            {/* Email (Resend) — read-only */}
            <Surface>
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold text-foreground">Email (Resend)</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Email credentials are managed via deployment environment variables
                (<code className="text-primary">RESEND_API_KEY</code>, <code className="text-primary">EMAIL_FROM</code>).
                To change them, update the deploy config and redeploy.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">From address</span>
                  <span className="font-mono text-foreground">env: EMAIL_FROM</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">Provider</span>
                  <span className="font-mono text-foreground">env: RESEND_API_KEY</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={async () => {
                  try {
                    const { apiFetch } = await import('@/services/api');
                    await apiFetch('/admin/settings/email-test', { method: 'POST' });
                    toast.success('Test email sent to your admin address.');
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Could not send test email');
                  }
                }}
              >
                Send test email
              </Button>
            </Surface>

            {/* Raw settings (escape hatch) */}
            {settingsList.length > 0 && (
              <Surface>
                <h2 className="text-base font-semibold text-foreground mb-3">All settings (raw)</h2>
                <div className="space-y-1 text-xs font-mono">
                  {settingsList.map((s) => (
                    <div key={s.key} className="flex justify-between p-2 rounded bg-muted/20 break-all">
                      <span className="text-muted-foreground">{s.key}</span>
                      <span className="text-foreground">{s.value}</span>
                    </div>
                  ))}
                </div>
              </Surface>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminSettingsPage;
