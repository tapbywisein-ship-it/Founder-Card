import { Building2, Ticket, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Surface } from '@/components/Surface';

export type RoleChoice = 'organizer' | 'attendee';

interface RoleChoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired when the user picks a path. */
  onChoose: (role: RoleChoice) => void;
  /** Hide the close (X) and block escape/outside dismissal — mandatory gate. */
  locked?: boolean;
}

const OPTIONS: {
  role: RoleChoice;
  icon: typeof Building2;
  title: string;
  description: string;
}[] = [
  {
    role: 'organizer',
    icon: Building2,
    title: 'Organize events',
    description: 'Create & publish events, sell tickets, and manage attendees.',
  },
  {
    role: 'attendee',
    icon: Ticket,
    title: 'Attend events',
    description: 'Discover events, RSVP, and connect with your Tap Card.',
  },
];

/**
 * Role fork shown when a signed-out visitor lands on the create-event gate.
 * Picking a path hands off to <SignInModal> with the matching role intent.
 */
export const RoleChoiceModal = ({ open, onOpenChange, onChoose, locked = false }: RoleChoiceModalProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      className="sm:max-w-md"
      hideClose={locked}
      onEscapeKeyDown={locked ? (e) => e.preventDefault() : undefined}
      onPointerDownOutside={locked ? (e) => e.preventDefault() : undefined}
    >
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold">How do you want to use TapByWisein?</DialogTitle>
        <DialogDescription>Pick a path to continue — you can always switch later.</DialogDescription>
      </DialogHeader>

      <div className="mt-2 space-y-3">
        {OPTIONS.map(({ role, icon: Icon, title, description }) => (
          <Surface
            key={role}
            hover
            role="button"
            tabIndex={0}
            onClick={() => onChoose(role)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onChoose(role);
              }
            }}
            className="flex cursor-pointer items-center gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">{title}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </Surface>
        ))}
      </div>
    </DialogContent>
  </Dialog>
);
