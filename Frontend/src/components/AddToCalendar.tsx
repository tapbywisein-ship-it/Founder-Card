import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { googleCalendarUrl, downloadIcs, type CalendarEvent } from '@/lib/calendar';

interface AddToCalendarProps {
  event: CalendarEvent;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm';
}

export const AddToCalendar = ({ event, variant = 'outline', size = 'sm' }: AddToCalendarProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant={variant} size={size}>
        <CalendarPlus className="mr-1.5 h-4 w-4" /> Add to calendar
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-48">
      <DropdownMenuItem asChild>
        <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer">
          Google Calendar
        </a>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => downloadIcs(event)}>
        Apple Calendar (.ics)
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => downloadIcs(event)}>
        Outlook / other (.ics)
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);
