import sharp from 'sharp';
import prisma from '@config/database';
import { NotFoundError } from '@utils/errors';

const W = 1200;
const H = 630;

const escapeXml = (s: string) =>
  s.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '"':
        return '&quot;';
      default:
        return '&apos;';
    }
  });

/** Truncate to N chars, appending an ellipsis if cropped. */
const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

const cardSvg = (opts: {
  name: string;
  subtitle: string;
  fkScore: number;
  level: number;
  isFounder: boolean;
}): string => {
  const { name, subtitle, fkScore, level, isFounder } = opts;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0F172A"/>
        <stop offset="100%" stop-color="#1E293B"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>

    <text x="80" y="120" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="800" font-size="48" fill="#FACC15">FK</text>
    <text x="160" y="120" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="500" font-size="28" fill="#94A3B8">TapByWisein card</text>

    <text x="80" y="320" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="800" font-size="84" fill="#FFFFFF">${escapeXml(trunc(name, 28))}</text>
    <text x="80" y="385" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="400" font-size="36" fill="#CBD5E1">${escapeXml(trunc(subtitle, 60))}</text>

    <g transform="translate(80 480)">
      <rect x="0" y="0" rx="20" ry="20" width="280" height="80" fill="#1E293B" stroke="#334155"/>
      <text x="24" y="34" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="500" font-size="18" fill="#94A3B8">FK SCORE</text>
      <text x="24" y="68" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="700" font-size="40" fill="#FACC15">${fkScore}</text>
      <text x="170" y="68" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="500" font-size="24" fill="#94A3B8">L${level}</text>
    </g>

    ${
      isFounder
        ? `<g transform="translate(380 480)">
             <rect x="0" y="0" rx="20" ry="20" width="280" height="80" fill="#FACC15"/>
             <text x="140" y="50" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="700" font-size="22" fill="#0F172A">Founder Card · Active</text>
           </g>`
        : ''
    }

    <text x="${W - 80}" y="${H - 40}" text-anchor="end" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="500" font-size="22" fill="#64748B">Scan · Tap · Connect</text>
  </svg>`;
};

const eventSvg = (opts: {
  title: string;
  startDate: Date;
  city: string | null;
  organizerName: string;
}): string => {
  const { title, startDate, city, organizerName } = opts;
  const dateStr = startDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const subtitle = [dateStr, city].filter(Boolean).join(' · ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0F172A"/>
        <stop offset="100%" stop-color="#312E81"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>

    <text x="80" y="120" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="800" font-size="48" fill="#FACC15">FK</text>
    <text x="160" y="120" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="500" font-size="28" fill="#94A3B8">Event on TapByWisein</text>

    <text x="80" y="300" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="800" font-size="76" fill="#FFFFFF">${escapeXml(trunc(title, 32))}</text>
    <text x="80" y="370" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="500" font-size="38" fill="#CBD5E1">${escapeXml(trunc(subtitle, 60))}</text>

    <text x="80" y="490" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="400" font-size="28" fill="#94A3B8">Hosted by ${escapeXml(trunc(organizerName, 36))}</text>

    <text x="${W - 80}" y="${H - 40}" text-anchor="end" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="500" font-size="22" fill="#64748B">Network at events</text>
  </svg>`;
};

export class OgService {
  /** Generate a 1200×630 PNG for a public FounderCard slug. */
  async cardPng(slug: string): Promise<Buffer> {
    const card = await prisma.founderCard.findUnique({
      where: { publicSlug: slug },
      include: {
        user: {
          include: {
            profile: { select: { firstName: true, lastName: true, position: true, company: true } },
            gamification: { select: { fkScore: true, level: true } },
          },
        },
      },
    });
    if (!card || !card.user || !card.user.isActive) throw new NotFoundError('Founder Card');

    const p = card.user.profile;
    const name = p ? `${p.firstName} ${p.lastName}`.trim() : 'Founder';
    const subtitle = [p?.position, p?.company].filter(Boolean).join(' · ') || 'TapByWisein member';

    const svg = cardSvg({
      name,
      subtitle,
      fkScore: card.user.gamification?.fkScore ?? 0,
      level: card.user.gamification?.level ?? 1,
      isFounder: card.status === 'ACTIVE',
    });
    return sharp(Buffer.from(svg)).png().toBuffer();
  }

  /** Generate a 1200×630 PNG for an event id. */
  async eventPng(eventId: string): Promise<Buffer> {
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      include: {
        organizer: {
          include: { profile: { select: { firstName: true, lastName: true, company: true } } },
        },
      },
    });
    if (!event) throw new NotFoundError('Event');

    const p = event.organizer.profile;
    const organizerName = p
      ? p.company || `${p.firstName} ${p.lastName}`.trim()
      : event.organizer.email;

    const svg = eventSvg({
      title: event.title,
      startDate: event.startDate,
      city: event.city,
      organizerName,
    });
    return sharp(Buffer.from(svg)).png().toBuffer();
  }

  /** Plain-string subtitle for HTML meta tags. */
  async cardMeta(slug: string) {
    const card = await prisma.founderCard.findUnique({
      where: { publicSlug: slug },
      include: {
        user: {
          include: {
            profile: {
              select: { firstName: true, lastName: true, position: true, company: true, bio: true },
            },
          },
        },
      },
    });
    if (!card || !card.user || !card.user.isActive) throw new NotFoundError('Founder Card');
    const p = card.user.profile;
    const name = p ? `${p.firstName} ${p.lastName}`.trim() : 'Founder';
    const subtitle = [p?.position, p?.company].filter(Boolean).join(' · ') || 'TapByWisein member';
    return {
      title: `${name} · TapByWisein`,
      description: p?.bio?.slice(0, 200) ?? `${subtitle} on TapByWisein.`,
    };
  }

  /**
   * Schema.org Event JSON-LD for Google rich results. Returns a JSON string or
   * null when the event isn't found.
   */
  async eventJsonLd(eventId: string, pageUrl: string): Promise<string | null> {
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: {
        title: true,
        description: true,
        startDate: true,
        endDate: true,
        city: true,
        country: true,
        address: true,
        locationType: true,
        ticketPrice: true,
        organizer: {
          select: { profile: { select: { firstName: true, lastName: true, company: true } } },
        },
      },
    });
    if (!event) return null;
    const organizerName = event.organizer?.profile
      ? `${event.organizer.profile.firstName} ${event.organizer.profile.lastName}`.trim()
      : 'TapByWisein';
    const ld: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: event.title,
      description: event.description?.slice(0, 500),
      startDate: event.startDate.toISOString(),
      endDate: event.endDate.toISOString(),
      eventAttendanceMode:
        event.locationType === 'VIRTUAL'
          ? 'https://schema.org/OnlineEventAttendanceMode'
          : 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      url: pageUrl,
      location:
        event.locationType === 'VIRTUAL'
          ? { '@type': 'VirtualLocation', url: pageUrl }
          : {
              '@type': 'Place',
              name: [event.address, event.city, event.country].filter(Boolean).join(', ') || 'TBD',
              address:
                [event.address, event.city, event.country].filter(Boolean).join(', ') || undefined,
            },
      organizer: { '@type': 'Organization', name: organizerName },
    };
    return JSON.stringify(ld);
  }

  async eventMeta(eventId: string) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: { title: true, description: true, startDate: true, city: true },
    });
    if (!event) throw new NotFoundError('Event');
    const dateStr = event.startDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return {
      title: `${event.title} · TapByWisein`,
      description:
        event.description.slice(0, 200) || `${dateStr}${event.city ? ` · ${event.city}` : ''}`,
    };
  }
}

export default new OgService();
