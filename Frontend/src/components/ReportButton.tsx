import { useState } from 'react';
import { Flag, MoreHorizontal, Ban } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ReportDialog } from '@/components/ReportDialog';
import { useBlockUser } from '@/hooks/useBlocks';
import type { ReportTargetType } from '@/services/reports.service';

interface ReportButtonProps {
  targetType: ReportTargetType;
  targetId: string;
  targetLabel?: string;
  /** When set (USER targets), adds a "Block user" action to the menu. */
  blockUserId?: string;
  /** Tailwind class for the trigger button (e.g. "h-8 w-8"). */
  triggerClass?: string;
}

/**
 * Small "•••" trigger that opens a dropdown with "Report" (→ ReportDialog) and,
 * optionally, "Block user" (→ confirm → block). Drop into any user/event card.
 */
export const ReportButton = ({
  targetType,
  targetId,
  targetLabel,
  blockUserId,
  triggerClass = '',
}: ReportButtonProps) => {
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const blockMutation = useBlockUser();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={`inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground ${triggerClass || 'h-8 w-8'}`}
          aria-label="More actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setReportOpen(true);
            }}
            className="text-rose-600 dark:text-rose-400"
          >
            <Flag className="mr-2 h-4 w-4" />
            Report {targetType.toLowerCase()}
          </DropdownMenuItem>
          {blockUserId && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setBlockOpen(true);
              }}
              className="text-rose-600 dark:text-rose-400"
            >
              <Ban className="mr-2 h-4 w-4" />
              Block user
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType={targetType}
        targetId={targetId}
        targetLabel={targetLabel}
      />

      {blockUserId && (
        <AlertDialog open={blockOpen} onOpenChange={setBlockOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Block {targetLabel ?? 'this user'}?</AlertDialogTitle>
              <AlertDialogDescription>
                They won't be able to message you or send connection requests, and your existing
                connection will be removed. You can unblock them later from settings.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => blockMutation.mutate(blockUserId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Block
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};
