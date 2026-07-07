import { Prisma } from '@prisma/client';
import prisma from '@config/database';
import { NotFoundError, BadRequestError, ForbiddenError } from '@utils/errors';
import { parsePaginationQuery, buildPaginationMeta } from '@utils/pagination';
import notificationsService from '@modules/notifications/notifications.service';
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

  /**
   * Invite users to a public community — sends each an in-app notification
   * (deep-linking to the community page) rather than a DM. Silently skips
   * anyone already a member. Capped to keep a single request cheap.
   */
  async invite(communityId: string, inviterId: string, userIds: string[]) {
    const community = await prisma.community.findFirst({
      where: { id: communityId, deletedAt: null },
      select: { id: true, name: true, slug: true, isPublic: true },
    });
    if (!community) throw new NotFoundError('Community');
    if (!community.isPublic) throw new BadRequestError('This community is private');

    const targets = [...new Set(userIds)].filter((id) => id && id !== inviterId).slice(0, 50);
    if (targets.length === 0) return { invited: 0 };

    // Don't notify people who already joined.
    const members = await prisma.communityMember.findMany({
      where: { communityId, userId: { in: targets } },
      select: { userId: true },
    });
    const memberSet = new Set(members.map((m) => m.userId));
    const toNotify = targets.filter((id) => !memberSet.has(id));

    const inviter = await prisma.user.findUnique({
      where: { id: inviterId },
      select: { profile: { select: { firstName: true, lastName: true } } },
    });
    const inviterName = inviter?.profile
      ? `${inviter.profile.firstName} ${inviter.profile.lastName}`.trim()
      : 'Someone';

    await Promise.all(
      toNotify.map((userId) =>
        notificationsService
          .createNotification(
            userId,
            'SYSTEM',
            'Community invite',
            `${inviterName} invited you to join ${community.name}`,
            { communityId: community.id, communitySlug: community.slug }
          )
          .catch(() => {})
      )
    );

    return { invited: toNotify.length };
  }

  // ── Community feed: posts, comments, announcements ──────────────────────────

  private readonly AUTHOR_SELECT = {
    id: true,
    profile: { select: { firstName: true, lastName: true, avatar: true, company: true, position: true } },
  } as const;

  /**
   * Viewer's standing in a community: 'owner' | 'moderator' | 'member' | null.
   * Owners moderate implicitly (they're auto-added as MODERATOR on create, but
   * legacy communities may predate that).
   */
  private async membershipRole(
    communityId: string,
    userId: string
  ): Promise<'owner' | 'moderator' | 'member' | null> {
    const community = await prisma.community.findFirst({
      where: { id: communityId, deletedAt: null },
      select: { organizerId: true },
    });
    if (!community) throw new NotFoundError('Community');
    if (community.organizerId === userId) return 'owner';
    const m = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
      select: { role: true },
    });
    if (!m) return null;
    return m.role === 'MODERATOR' ? 'moderator' : 'member';
  }

  /** Feed: pinned posts first, then newest. Readable by anyone who can see the community. */
  async listPosts(communityId: string, viewerId: string | undefined, page?: number, limit?: number) {
    const community = await prisma.community.findFirst({
      where: { id: communityId, deletedAt: null },
      select: { isPublic: true, organizerId: true },
    });
    if (!community) throw new NotFoundError('Community');
    if (!community.isPublic) {
      // Private community feeds are member/owner-only.
      const role = viewerId ? await this.membershipRole(communityId, viewerId) : null;
      if (!role) throw new NotFoundError('Community');
    }

    const pagination = parsePaginationQuery({ page, limit });
    const where = { communityId, deletedAt: null };
    const [posts, total] = await Promise.all([
      prisma.communityPost.findMany({
        where,
        include: {
          author: { select: this.AUTHOR_SELECT },
          _count: { select: { comments: true } },
        },
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.communityPost.count({ where }),
    ]);

    return {
      posts: posts.map(({ _count, ...p }) => ({ ...p, commentCount: _count.comments })),
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  /** Members post to the feed; only the owner/moderators may pin. */
  async createPost(
    communityId: string,
    authorId: string,
    input: { body: string; imageUrl?: string; pinned?: boolean }
  ) {
    const body = input.body?.trim();
    if (!body) throw new BadRequestError('Post cannot be empty');
    if (body.length > 4000) throw new BadRequestError('Post is too long (max 4000 chars)');

    const role = await this.membershipRole(communityId, authorId);
    if (!role) throw new ForbiddenError('Join this community to post');
    const canModerate = role === 'owner' || role === 'moderator';

    return prisma.communityPost.create({
      data: {
        communityId,
        authorId,
        body,
        imageUrl: input.imageUrl || null,
        pinned: canModerate ? !!input.pinned : false,
      },
      include: { author: { select: this.AUTHOR_SELECT } },
    });
  }

  /**
   * Announcement: an owner/moderator post that is pinned and notifies every
   * member (batched like invite). Returns the post.
   */
  async announce(communityId: string, authorId: string, body: string) {
    const role = await this.membershipRole(communityId, authorId);
    if (role !== 'owner' && role !== 'moderator') {
      throw new ForbiddenError('Only the organizer or moderators can post announcements');
    }

    const community = await prisma.community.findFirst({
      where: { id: communityId, deletedAt: null },
      select: { name: true, slug: true },
    });
    if (!community) throw new NotFoundError('Community');

    const trimmed = body?.trim();
    if (!trimmed) throw new BadRequestError('Announcement cannot be empty');

    const post = await prisma.communityPost.create({
      data: { communityId, authorId, body: trimmed, pinned: true, isAnnouncement: true },
      include: { author: { select: this.AUTHOR_SELECT } },
    });

    // Fan out to members (excluding the author). Best-effort; capped batch.
    const members = await prisma.communityMember.findMany({
      where: { communityId, userId: { not: authorId } },
      select: { userId: true },
      take: 2000,
    });
    if (members.length > 0) {
      await notificationsService
        .sendBulkNotification(
          members.map((m) => m.userId),
          'SYSTEM',
          `${community.name}: announcement`,
          trimmed.length > 140 ? `${trimmed.slice(0, 140)}…` : trimmed,
          { communityId, communitySlug: community.slug, postId: post.id }
        )
        .catch(() => {});
    }

    return post;
  }

  /** Author deletes their own post; owner/moderators delete any (soft delete). */
  async deletePost(communityId: string, postId: string, userId: string): Promise<void> {
    const post = await prisma.communityPost.findFirst({
      where: { id: postId, communityId, deletedAt: null },
      select: { authorId: true },
    });
    if (!post) throw new NotFoundError('Post');
    if (post.authorId !== userId) {
      const role = await this.membershipRole(communityId, userId);
      if (role !== 'owner' && role !== 'moderator') {
        throw new ForbiddenError('You can only delete your own posts');
      }
    }
    await prisma.communityPost.update({ where: { id: postId }, data: { deletedAt: new Date() } });
  }

  async listComments(postId: string, page?: number, limit?: number) {
    const post = await prisma.communityPost.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true },
    });
    if (!post) throw new NotFoundError('Post');
    const pagination = parsePaginationQuery({ page, limit });
    const [comments, total] = await Promise.all([
      prisma.communityPostComment.findMany({
        where: { postId },
        include: { author: { select: this.AUTHOR_SELECT } },
        orderBy: { createdAt: 'asc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.communityPostComment.count({ where: { postId } }),
    ]);
    return { comments, pagination: buildPaginationMeta(total, pagination.page, pagination.limit) };
  }

  async addComment(postId: string, authorId: string, body: string) {
    const trimmed = body?.trim();
    if (!trimmed) throw new BadRequestError('Comment cannot be empty');
    if (trimmed.length > 2000) throw new BadRequestError('Comment is too long (max 2000 chars)');

    const post = await prisma.communityPost.findFirst({
      where: { id: postId, deletedAt: null },
      select: { communityId: true },
    });
    if (!post) throw new NotFoundError('Post');
    const role = await this.membershipRole(post.communityId, authorId);
    if (!role) throw new ForbiddenError('Join this community to comment');

    return prisma.communityPostComment.create({
      data: { postId, authorId, body: trimmed },
      include: { author: { select: this.AUTHOR_SELECT } },
    });
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await prisma.communityPostComment.findUnique({
      where: { id: commentId },
      select: { authorId: true, post: { select: { communityId: true } } },
    });
    if (!comment) throw new NotFoundError('Comment');
    if (comment.authorId !== userId) {
      const role = await this.membershipRole(comment.post.communityId, userId);
      if (role !== 'owner' && role !== 'moderator') {
        throw new ForbiddenError('You can only delete your own comments');
      }
    }
    await prisma.communityPostComment.delete({ where: { id: commentId } });
  }
}

export default new CommunitiesService();
