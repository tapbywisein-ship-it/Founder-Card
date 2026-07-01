import { Request, Response } from 'express';
import prisma from '@config/database';
import adminService from './admin.service';
import authService from '@modules/auth/auth.service';
import { sendEmail, inviteClaimEmail } from '@utils/email';
import { NotFoundError } from '@utils/errors';
import { sendSuccess, sendPaginated } from '@utils/response';
import { UpdateUserDto, BanUserDto } from './admin.validation';

export class AdminController {
  async getDashboard(req: Request, res: Response): Promise<void> {
    const stats = await adminService.getDashboardStats();
    sendSuccess(res, stats, 'Dashboard stats retrieved');
  }

  async getUsers(req: Request, res: Response): Promise<void> {
    const { role, tier, isActive, search, page, limit } = req.query as {
      role?: string;
      tier?: string;
      isActive?: string;
      search?: string;
      page?: string;
      limit?: string;
    };

    const result = await adminService.getUsers(
      {
        role,
        tier,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        search,
      },
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined
    );
    sendPaginated(res, result.users, result.pagination, 'Users retrieved');
  }

  async getUserDetail(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    const user = await adminService.getUserDetail(id);
    sendSuccess(res, user, 'User retrieved');
  }

  async updateUser(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    const dto = req.body as UpdateUserDto;
    const user = await adminService.updateUser(id, dto, req.user!.userId);
    sendSuccess(res, user, 'User updated');
  }

  async deleteUser(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    await adminService.deleteUser(id, req.user!.userId);
    sendSuccess(res, null, 'User deleted');
  }

  async banUser(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    const dto = req.body as BanUserDto;
    const result = await adminService.banUser(id, dto.reason, req.user!.userId);
    sendSuccess(res, result, 'User banned');
  }

  async updateUserRole(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    const { role } = req.body as { role: 'ATTENDEE' | 'ORGANIZER' | 'ADMIN' };
    const user = await adminService.updateUserRole(id, role, req.user!.userId);
    sendSuccess(res, user, 'User role updated');
  }

  async setUserStatus(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    const { isActive } = req.body as { isActive: boolean };
    const result = await adminService.setUserStatus(id, Boolean(isActive), req.user!.userId);
    sendSuccess(res, result, isActive ? 'User reactivated' : 'User suspended');
  }

  async getEvents(req: Request, res: Response): Promise<void> {
    const { status, organizerId, search, page, limit } = req.query as {
      status?: string;
      organizerId?: string;
      search?: string;
      page?: string;
      limit?: string;
    };

    const result = await adminService.getEvents(
      { status, organizerId, search },
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined
    );
    sendPaginated(res, result.events, result.pagination, 'Events retrieved');
  }

  async updateEvent(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    const event = await adminService.updateEvent(id, req.body as Record<string, unknown>);
    sendSuccess(res, event, 'Event updated');
  }

  async deleteEvent(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    await adminService.deleteEvent(id);
    sendSuccess(res, null, 'Event deleted');
  }

  async getAnalytics(req: Request, res: Response): Promise<void> {
    const { startDate, endDate, period } = req.query as {
      startDate?: string;
      endDate?: string;
      period?: string;
    };

    const analytics = await adminService.getAnalytics({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      period,
    });
    sendSuccess(res, analytics, 'Analytics retrieved');
  }

  async getSettings(req: Request, res: Response): Promise<void> {
    const settings = await adminService.getSettings();
    sendSuccess(res, settings, 'Settings retrieved');
  }

  async updateSetting(req: Request, res: Response): Promise<void> {
    const { key } = req.params as Record<string, string>;
    const { value, type, label } = req.body as { value: string; type?: string; label?: string };
    const setting = await adminService.updateSetting(key, value, type, label);
    sendSuccess(res, setting, 'Setting updated');
  }

  async sendTestEmail(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    // Look up the admin's email + first name from their profile.
    const admin = await adminService.getUserDetail(userId).catch(() => null);
    const profile = (admin as { profile?: { firstName?: string } } | null)?.profile;
    const email = (admin as { email?: string } | null)?.email;
    if (!email) {
      res.status(400).json({ success: false, message: 'Admin email not found' });
      return;
    }
    const result = await adminService.sendTestEmail(email, profile?.firstName ?? 'Admin');
    sendSuccess(res, result, 'Test email queued');
  }

  async getPermissions(req: Request, res: Response): Promise<void> {
    const permissions = await adminService.getPermissions();
    sendSuccess(res, permissions, 'Permissions retrieved');
  }

  async updatePermission(req: Request, res: Response): Promise<void> {
    const { role, resource, actions } = req.body as {
      role: string;
      resource: string;
      actions: string[];
    };
    const result = await adminService.updatePermission(role, resource, actions);
    sendSuccess(res, result, 'Permission updated');
  }

  async getAuditLogs(req: Request, res: Response): Promise<void> {
    const { action, userId, resource, page, limit } = req.query as {
      action?: string;
      userId?: string;
      resource?: string;
      page?: string;
      limit?: string;
    };

    const result = await adminService.getAuditLogs(
      { action, userId, resource },
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined
    );
    sendPaginated(res, result.logs, result.pagination, 'Audit logs retrieved');
  }

  async getHealth(req: Request, res: Response): Promise<void> {
    const health = await adminService.getPlatformHealth();
    sendSuccess(res, health, 'Platform health retrieved');
  }

  async getRevenue(req: Request, res: Response): Promise<void> {
    const { page, limit, search } = req.query as { page?: string; limit?: string; search?: string };
    const result = await adminService.getRevenue({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
    sendPaginated(res, result.items, result.meta, 'Revenue retrieved');
  }

  async dispatchOrder(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    const { trackingId, trackingProvider, nfcTagId } = req.body as {
      trackingId: string;
      trackingProvider: string;
      nfcTagId?: string;
    };
    if (!trackingId?.trim() || !trackingProvider?.trim()) {
      res.status(400).json({ message: 'trackingId and trackingProvider are required' });
      return;
    }
    const result = await adminService.dispatchOrder(id, { trackingId, trackingProvider, nfcTagId });
    sendSuccess(res, result, 'Order dispatched successfully');
  }

  async markOrderDelivered(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    const result = await adminService.markOrderDelivered(id);
    sendSuccess(res, result, 'Order marked as delivered');
  }

  async resendDispatchEmail(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    const result = await adminService.resendDispatchEmail(id);
    sendSuccess(res, result, `Dispatch email re-sent to ${result.recipient}`);
  }

  async getUserActivity(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    const data = await adminService.getUserActivity(id);
    sendSuccess(res, data, 'User activity retrieved');
  }

  async resendInvite(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    const user = await prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
    if (!user) throw new NotFoundError('User');

    const claimUrl = await authService.generateClaimToken(id);
    const name = user.profile
      ? `${user.profile.firstName} ${user.profile.lastName}`.trim()
      : user.email;
    await sendEmail(
      user.email,
      'Your Founder Key invite — claim your account',
      inviteClaimEmail(name, claimUrl, 'Founder Key')
    );
    sendSuccess(res, { sent: true }, 'Invite re-sent');
  }
}

export default new AdminController();
