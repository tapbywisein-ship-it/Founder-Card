import { Prisma } from '@prisma/client';
import prisma from '@config/database';
import { NotFoundError } from '@utils/errors';
import type { CreateCommunityDto, UpdateCommunityDto } from './communities.validation';

const PUBLIC_ORGANIZER_SELECT = {
  id: true,
  username: true,
  profile: { select: { firstName: true, lastName: true, avatar: true, company: true } },
} as const;

const COUNTS = { _count: { select: { members: true, events: true } } } as const;

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'community'
  );
}

type WithCounts = { _count: { members: number; events: number } };
const withCounts = <T extends WithCounts>({ _count, ...rest }: T) => ({
  ...rest,
  memberCount: _count.members,
  eventCount: _count.events,
});

class CommunitiesService {
  async create(organizerId: string, dto: CreateCommunityDto) {
    let slug = slugify(dto.name);
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.community.findUnique({ where: { slug }, select: { id: true } });
      if (!exists) break;
      slug = `${slugify(dto.name)}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const community = await prisma.community.create({
      data: {
        organizerId,
        name: dto.name,
        slug,
        description: dto.description || null,
        avatar: dto.avatar || null,
        coverImage: dto.coverImage || null,
        category: dto.category || null,
        isPublic: dto.isPublic ?? true,
      },
    });

    // The organizer is the first member (moderator) of their own community.
    await prisma.communityMember
      .create({ data: { communityId: community.id, userId: organizerId, role: 'MODERATOR' } })
      .catch(() => {});

    return community;
  }

  async update(id: string, organizerId: string, dto: UpdateCommunityDto) {
    const community = await prisma.community.findFirst({
      where: { id, organizerId, deletedAt: null },
      select: { id: true },
    });
    if (!community) throw new NotFoundError('Community');

    return prisma.community.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description || null } : {}),
        ...(dto.avatar !== undefined ? { avatar: dto.avatar || null } : {}),
        ...(dto.coverImage !== undefined ? { coverImage: dto.coverImage || null } : {}),
        ...(dto.category !== undefined ? { category: dto.category || null } : {}),
        ...(dto.isPublic !== undefined ? { isPublic: dto.isPublic } : {}),
      },
    });
  }

  /** Communities the organizer owns, with member + event counts. */
  async listMine(organizerId: string) {
    const rows = await prisma.community.findMany({
      where: { organizerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: COUNTS,
    });
    return rows.map(withCounts);
  }

  /**
   * Browse/discover public communities (newest first) so attendees can find and
   * join them. Includes counts + owner, and `isMember` for the viewer so the UI
   * can show Join vs Joined. Anonymous callers get everything except membership.
   */
  async listPublic(viewerId?: string, q?: string, category?: string) {
    const where: Prisma.CommunityWhereInput = {
      isPublic: true,
      deletedAt: null,
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const rows = await prisma.community.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { ...COUNTS, organizer: { select: PUBLIC_ORGANIZER_SELECT } },
    });

    let memberSet = new Set<string>();
    if (viewerId && rows.length > 0) {
      const mships = await prisma.communityMember.findMany({
        where: { userId: viewerId, communityId: { in: rows.map((r) => r.id) } },
        select: { communityId: true },
      });
      memberSet = new Set(mships.map((m) => m.communityId));
    }

    return rows.map((r) => ({ ...withCounts(r), isMember: memberSet.has(r.id) }));
  }

  /** Communities the user follows. */
  async listFollowing(userId: string) {
    const memberships = await prisma.communityMember.findMany({
      where: { userId, community: { deletedAt: null } },
      orderBy: { createdAt: 'desc' },
      include: {
        community: { include: { ...COUNTS, organizer: { select: PUBLIC_ORGANIZER_SELECT } } },
      },
    });
    return memberships.map((m) => withCounts(m.community));
  }

  /** Public community page — details + its events + the viewer's membership. */
  async getBySlug(slug: string, viewerId?: string) {
    const community = await prisma.community.findFirst({
      where: { slug, deletedAt: null },
      include: { ...COUNTS, organizer: { select: PUBLIC_ORGANIZER_SELECT } },
    });
    if (!community) throw new NotFoundError('Community');
    const isOwner = viewerId === community.organizerId;
    if (!community.isPublic && !isOwner) throw new NotFoundError('Community');

    const events = await prisma.event.findMany({
      where: { communityId: community.id, deletedAt: null, status: { not: 'DRAFT' } },
      orderBy: { startDate: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        slug: true,
        startDate: true,
        endDate: true,
        city: true,
        locationType: true,
        coverImage: true,
        theme: true,
        status: true,
      },
    });

    let isMember = false;
    if (viewerId) {
      const m = await prisma.communityMember.findUnique({
        where: { communityId_userId: { communityId: community.id, userId: viewerId } },
        select: { id: true },
      });
      isMember = !!m;
    }

    return { community: withCounts(community), events, isMember, isOwner };
  }

  async join(communityId: string, userId: string) {
    const community = await prisma.community.findFirst({
      where: { id: communityId, deletedAt: null },
      select: { id: true },
    });
    if (!community) throw new NotFoundError('Community');
    await prisma.communityMember.upsert({
      where: { communityId_userId: { communityId, userId } },
      create: { communityId, userId },
      update: {},
    });
    return { joined: true };
  }

  async leave(communityId: string, userId: string) {
    await prisma.communityMember.deleteMany({ where: { communityId, userId } });
    return { joined: false };
  }
}

export default new CommunitiesService();
