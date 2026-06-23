import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, FileText, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  organizerService,
  type CsvImportResult,
} from '@/services/organizer.service';

interface CsvImportDialogProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Two-step CSV attendee import: drag-drop → server-side dry-run preview →
 * confirm to commit. The dry-run is a single round-trip (no client-side parse)
 * so the preview matches exactly what the commit will do.
 */
export const CsvImportDialog = ({ eventId, open, onOpenChange }: CsvImportDialogProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const qc = useQueryClient();

  const dryRun = useMutation({
    mutationFn: (f: File) => organizerService.importAttendees(eventId, f, true),
    onSuccess: (res) => setPreview(res.data),
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Could not parse CSV'),
  });

  const commit = useMutation({
    mutationFn: (f: File) => organizerService.importAttendees(eventId, f, false),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['organizer', 'event-guests', eventId] });
      toast.success(
        `${res.data.summary.createdRegistrations ?? res.data.summary.validRows} attendees imported`
      );
      reset();
      onOpenChange(false);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Import failed'),
  });

  const reset = () => {
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(null);
    dryRun.mutate(f);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import attendees from CSV</DialogTitle>
          <DialogDescription>
            Required column: <code>email</code>. Optional: <code>firstName</code>,{' '}
            <code>lastName</code>, <code>company</code>, <code>role</code>{' '}
            (VIP / SPEAKER / STAFF / SPONSOR / ATTENDEE).
          </DialogDescription>
        </DialogHeader>

        {!file && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed p-10 text-center transition-colors ${
              dragOver ? 'border-primary bg-primary/5' : 'border-border'
            }`}
          >
            <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Drag a .csv here or click to choose
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Up to 500 rows · 2 MB</p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        )}

        {file && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-card border border-border bg-secondary/40 px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                {file.name}
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {dryRun.isPending && (
              <p className="text-sm text-muted-foreground">Parsing…</p>
            )}

            {preview && (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="Valid" value={preview.summary.validRows} good />
                  <Stat label="Invalid" value={preview.summary.invalidRows} warn={preview.summary.invalidRows > 0} />
                  <Stat label="Duplicates" value={preview.summary.duplicateCount} warn={preview.summary.duplicateCount > 0} />
                </div>

                {preview.valid && preview.valid.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-card border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="px-3 py-1.5 text-left">Email</th>
                          <th className="px-3 py-1.5 text-left">Name</th>
                          <th className="px-3 py-1.5 text-left">Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.valid.slice(0, 50).map((r) => (
                          <tr key={r.rowNumber} className="border-t border-border">
                            <td className="px-3 py-1.5">{r.email}</td>
                            <td className="px-3 py-1.5">
                              {[r.firstName, r.lastName].filter(Boolean).join(' ')}
                            </td>
                            <td className="px-3 py-1.5">{r.eventRole ?? 'ATTENDEE'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {preview.valid.length > 50 && (
                      <p className="px-3 py-1.5 text-xs text-muted-foreground">
                        + {preview.valid.length - 50} more
                      </p>
                    )}
                  </div>
                )}

                {preview.invalid.length > 0 && (
                  <details className="rounded-card border border-amber-500/30 bg-amber-500/5 p-2 text-xs">
                    <summary className="cursor-pointer text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="mr-1 inline h-3 w-3" />
                      {preview.invalid.length} row{preview.invalid.length === 1 ? '' : 's'} skipped
                    </summary>
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      {preview.invalid.slice(0, 20).map((e, i) => (
                        <li key={i}>
                          Row {e.rowNumber}: {e.reason}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={reset}>
                    Choose another file
                  </Button>
                  <Button
                    onClick={() => commit.mutate(file)}
                    disabled={preview.summary.validRows === 0 || commit.isPending}
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    {commit.isPending
                      ? 'Importing…'
                      : `Import ${preview.summary.willCreateRegistrations ?? preview.summary.validRows} attendees`}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const Stat = ({
  label,
  value,
  good,
  warn,
}: {
  label: string;
  value: number;
  good?: boolean;
  warn?: boolean;
}) => (
  <div
    className={`rounded-card border px-3 py-2 ${
      good
        ? 'border-emerald-500/30 bg-emerald-500/5'
        : warn
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-border bg-card'
    }`}
  >
    <p className="text-2xl font-semibold tabular-nums">{value}</p>
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
  </div>
);
