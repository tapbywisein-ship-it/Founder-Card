import { toast } from 'sonner';
import { Share2, Link as LinkIcon, MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ShareMenuProps {
  url: string;
  title?: string;
  text?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm';
}

/** Share-to-chat menu: WhatsApp, Telegram, native share, copy link. */
export const ShareMenu = ({ url, title, text, variant = 'outline', size = 'sm' }: ShareMenuProps) => {
  const shareText = [text ?? title, url].filter(Boolean).join(' ');
  const wa = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const tg = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text ?? title ?? '')}`;

  const nativeShare = () => {
    if (navigator.share) {
      navigator.share({ title, text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size}>
          <Share2 className="mr-1.5 h-4 w-4" /> Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <a href={wa} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={tg} target="_blank" rel="noopener noreferrer">
            <Send className="mr-2 h-4 w-4" /> Telegram
          </a>
        </DropdownMenuItem>
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <DropdownMenuItem onSelect={nativeShare}>
            <Share2 className="mr-2 h-4 w-4" /> More…
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onSelect={() => {
            navigator.clipboard.writeText(url);
            toast.success('Link copied');
          }}
        >
          <LinkIcon className="mr-2 h-4 w-4" /> Copy link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
