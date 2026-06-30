import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  CalendarSearch,
  Contact,
  Trophy,
  Users,
  Share2,
  Copy,
} from 'lucide-react';
import { downloadVCard } from '@/lib/vcard';
import type { PublicCard } from '@/services/founderCard.service';

interface CardActionRowProps {
  card: PublicCard;
  cardUrl: string;
  /** Hide the destructive / personal-graph buttons on anon /c/:slug renders. */
  showPersonal: boolean;
}

const Item = ({
  icon: Icon,
  label,
  onClick,
  href,
}: {
  icon: typeof Users;
  label: string;
  onClick?: () => void;
  href?: string;
}) => {
  const cls =
    'flex flex-col items-center justify-center gap-1 rounded-card border border-border bg-card/40 px-3 py-2.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5';
  if (href) {
    return (
      <a href={href} className={cls}>
        <Icon className="h-4 w-4 text-primary" />
        <span>{label}</span>
      </a>
    );
  }
  return (
    <button onClick={onClick} className={cls}>
      <Icon className="h-4 w-4 text-primary" />
      <span>{label}</span>
    </button>
  );
};

/**
 * Quick-actions strip below the card hero: People I met, FK history,
 * Find at events, Save contact (vCard), Share. Folds the four "lives on
 * other pages" features into a single row so the card page is the hub.
 */
export const CardActionRow = ({ card, cardUrl, showPersonal }: CardActionRowProps) => {
  const navigate = useNavigate();
  const profile = card.user.profile;
  const name = profile ? `${profile.firstName} ${profile.lastName}`.trim() : card.user.email;

  const saveContact = () => {
    if (!profile) {
      toast.error("Can't export — profile is empty");
      return;
    }
    downloadVCard({
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: card.user.email,
      position: profile.position,
      company: profile.company,
      bio: profile.bio,
      website: profile.website,
      linkedin: profile.linkedin,
      twitter: profile.twitter,
      avatarUrl: profile.avatar,
      cardUrl,
    });
    toast.success(`${name} saved to your contacts`);
  };

  const shareOrCopy = async () => {
    if (!cardUrl) return;
    if (navigator.share) {
      navigator
        .share({ title: `${name}${name} on TapByWisein`, url: cardUrl })
        .catch(() => {});
      return;
    }
    try {
      await navigator.clipboard.writeText(cardUrl);
      toast.success('Card URL copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
      {showPersonal && (
        <Item icon={Users} label="People I met" onClick={() => navigate('/people-i-met')} />
      )}
      {showPersonal && (
        <Item icon={Trophy} label="FK history" onClick={() => navigate('/gamification')} />
      )}
      <Item
        icon={CalendarSearch}
        label="Find at events"
        onClick={() => navigate(`/events?withUser=${card.userId}`)}
      />
      <Item icon={Contact} label="Save contact" onClick={saveContact} />
      <Item icon={Share2} label="Share" onClick={shareOrCopy} />
      {!showPersonal && (
        <Item
          icon={Copy}
          label="Copy URL"
          onClick={() => {
            navigator.clipboard?.writeText(cardUrl).then(
              () => toast.success('Card URL copied'),
              () => toast.error('Copy failed'),
            );
          }}
        />
      )}
    </div>
  );
};
