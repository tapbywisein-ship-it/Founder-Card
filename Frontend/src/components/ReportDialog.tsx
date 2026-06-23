import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  reportsService,
  type ReportCategory,
  type ReportTargetType,
} from '@/services/reports.service';
import { Flag } from 'lucide-react';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
  /** Friendly label for the target — e.g. "Sam Hill" or "PyData NYC". */
  targetLabel?: string;
}

const CATEGORIES: Array<{ value: ReportCategory; label: string }> = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'IMPERSONATION', label: 'Impersonation' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate content' },
  { value: 'OTHER', label: 'Something else' },
];

export const ReportDialog = ({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetLabel,
}: ReportDialogProps) => {
  const [category, setCategory] = useState<ReportCategory>('SPAM');
  const [reason, setReason] = useState('');

  const submit = useMutation({
    mutationFn: () =>
      reportsService.fileReport({ targetType, targetId, category, reason: reason.trim() }),
    onSuccess: () => {
      toast.success('Report submitted — our team will review.');
      setReason('');
      onOpenChange(false);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Could not submit report'),
  });

  const targetWord = targetType.toLowerCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Report {targetWord}
          </DialogTitle>
          <DialogDescription>
            {targetLabel ? `Report "${targetLabel}".` : `Flag this ${targetWord} for review.`}{' '}
            Reports are confidential — the user you report will not see your identity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Category</label>
            <Select value={category} onValueChange={(v) => setCategory(v as ReportCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              Tell us what happened
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Please be specific — minimum 8 characters."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => submit.mutate()}
              disabled={reason.trim().length < 8 || submit.isPending}
            >
              {submit.isPending ? 'Submitting…' : 'Submit report'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
