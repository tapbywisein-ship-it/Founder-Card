import { useParams, useNavigate } from 'react-router-dom';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useDeleteEvent } from '@/hooks/useOrganizer';
import { useEventContext } from '@/components/OrganizerEventLayout';
import { toast } from 'sonner';
import { Pencil, Copy, Trash2, Download, Zap, Loader2, Ban } from 'lucide-react';
import { useState } from 'react';
import { organizerService } from '@/services/organizer.service';
import { useQueryClient } from '@tanstack/react-query';
import { EventQuestionsEditor } from '@/components/EventQuestionsEditor';
import { EventSpeakersAgendaEditor } from '@/components/EventSpeakersAgendaEditor';
import { CohostsEditor } from '@/components/CohostsEditor';

const MoreTab = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { event, isLoading: contextLoading } = useEventContext();
  const deleteMutation = useDeleteEvent();
  const queryClient = useQueryClient();
  const [duplicating, setDuplicating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const isDraft = event?.status === 'DRAFT';

  const handleDelete = async () => {
    if (!id) return;
    await deleteMutation.mutateAsync(id);
    navigate('/organizer/dashboard');
  };

  const handleCancel = async () => {
    if (!id || cancelling) return;
    setCancelling(true);
    try {
      await organizerService.cancelEvent(id);
      await queryClient.invalidateQueries({ queryKey: ['organizer', 'events'] });
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event cancelled. Attendees notified and paid tickets refunded');
      navigate('/organizer/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not cancel event');
    } finally {
      setCancelling(false);
    }
  };

  const handleDuplicate = async () => {
    if (!id || duplicating) return;
    setDuplicating(true);
    try {
      const { data } = await organizerService.duplicateEvent(id);
      await queryClient.invalidateQueries({ queryKey: ['organizer', 'events'] });
      toast.success('Event duplicated as draft');
      navigate(`/organizer/events/${data.id}/manage`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not duplicate event');
    } finally {
      setDuplicating(false);
    }
  };

  const handleExportCsv = async () => {
    if (!id || exporting) return;
    setExporting(true);
    try {
      await organizerService.exportAttendeesCsv(id);
      toast.success('CSV download started');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not export attendees');
    } finally {
      setExporting(false);
    }
  };

  if (contextLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-muted/40 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg">
      <Surface>
        <h2 className="text-base font-semibold text-foreground mb-4">Event Actions</h2>

        <div className="space-y-2">
          {/* Edit event */}
          <button
            type="button"
            onClick={() => navigate(`/organizer/events/${id}/manage`)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:bg-muted/40 transition-colors text-left group"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
              <Pencil className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Edit Event</p>
              <p className="text-xs text-muted-foreground">Update event details, dates, and settings</p>
            </div>
          </button>

          {/* Duplicate event */}
          <button
            type="button"
            onClick={handleDuplicate}
            disabled={duplicating}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:bg-muted/40 transition-colors text-left group disabled:opacity-60"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
              {duplicating ? <Loader2 className="w-4 h-4 text-primary animate-spin" /> : <Copy className="w-4 h-4 text-primary" />}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Duplicate Event</p>
              <p className="text-xs text-muted-foreground">Create a draft copy with speakers, agenda &amp; questions</p>
            </div>
          </button>

          {/* Export attendee CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:bg-muted/40 transition-colors text-left group disabled:opacity-60"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
              {exporting ? <Loader2 className="w-4 h-4 text-primary animate-spin" /> : <Download className="w-4 h-4 text-primary" />}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Export Attendees (CSV)</p>
              <p className="text-xs text-muted-foreground">Download the full guest list as a spreadsheet</p>
            </div>
          </button>
        </div>
      </Surface>

      {/* Phase 5 — registration questions */}
      {id && <EventQuestionsEditor eventId={id} />}

      {/* Phase 5 — speakers + agenda */}
      {id && <EventSpeakersAgendaEditor eventId={id} />}

      {/* Phase 5 — co-hosts */}
      {id && <CohostsEditor eventId={id} />}

      {/* Danger zone */}
      <Surface className="border-red-500/20">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-red-400" />
          <h2 className="text-base font-semibold text-red-400">Danger Zone</h2>
        </div>

        <div className="space-y-2">
          {/* Cancel event — for published/active events (notifies + refunds) */}
          {!isDraft && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/20 hover:bg-red-500/10 transition-colors text-left group"
                >
                  <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                    {cancelling ? <Loader2 className="w-4 h-4 text-red-400 animate-spin" /> : <Ban className="w-4 h-4 text-red-400" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-400">Cancel Event</p>
                    <p className="text-xs text-muted-foreground">Notify all attendees and refund paid tickets</p>
                  </div>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this event?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Every registered attendee will be emailed and notified, and all paid tickets
                    will be refunded to their original payment method. The event will be marked
                    Cancelled. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep event</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {cancelling ? 'Cancelling…' : 'Cancel Event'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Delete event — drafts only */}
          {isDraft && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/20 hover:bg-red-500/10 transition-colors text-left group"
                >
                  <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-400">Delete Draft</p>
                    <p className="text-xs text-muted-foreground">Permanently remove this draft event</p>
                  </div>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the draft. Published events can't be deleted: cancel
                    them instead so attendees are notified and refunded.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep draft</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {deleteMutation.isPending ? 'Deleting…' : 'Delete Draft'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </Surface>
    </div>
  );
};

export default MoreTab;
