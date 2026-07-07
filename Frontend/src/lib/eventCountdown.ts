/**
 * "Days left to register" for an event. Prefers the explicit
 * registrationDeadline; falls back to the event start date when the organizer
 * didn't set one. Shared by the Events and Discover cards so the countdown
 * reads identically everywhere.
 */
export function registrationCountdown(startDate: string, registrationDeadline?: string | null) {
  const deadline = registrationDeadline ? new Date(registrationDeadline) : new Date(startDate);
  const days = Math.ceil((deadline.getTime() - Date.now()) / 86_400_000);
  const closed = days < 0;
  const label = days > 1 ? `${days} days left` : days === 1 ? '1 day left' : days === 0 ? 'Last day' : 'Ended';
  const urgent = days >= 0 && days <= 3;
  return { days, closed, label, urgent };
}
