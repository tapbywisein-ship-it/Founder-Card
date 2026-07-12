import { Request, Response } from 'express';
import founderCardsService from './founder-cards.service';
import { sendSuccess, sendCreated, sendPaginated } from '@utils/response';
import { ApplyCardDto } from './founder-cards.validation';

export class FounderCardsController {
  async applyForCard(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const dto = req.body as ApplyCardDto;
    const card = await founderCardsService.applyForCard(userId, dto);
    sendCreated(res, card, 'Founder Card application submitted successfully');
  }

  async getMyCard(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const card = await founderCardsService.getMyCard(userId);
    sendSuccess(res, card, 'Founder Card retrieved');
  }

  async getCardAnalytics(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const analytics = await founderCardsService.getCardAnalytics(userId);
    sendSuccess(res, analytics, 'Card analytics retrieved');
  }

  async listBlocks(req: Request, res: Response): Promise<void> {
    const blocks = await founderCardsService.listBlocks(req.user!.userId);
    sendSuccess(res, blocks, 'Card blocks');
  }

  async createBlock(req: Request, res: Response): Promise<void> {
    const { type, label, url } = req.body as { type?: string; label: string; url: string };
    const block = await founderCardsService.createBlock(req.user!.userId, { type, label, url });
    sendSuccess(res, block, 'Block added');
  }

  async updateBlock(req: Request, res: Response): Promise<void> {
    const { blockId } = req.params as Record<string, string>;
    const { type, label, url } = req.body as { type?: string; label?: string; url?: string };
    const block = await founderCardsService.updateBlock(req.user!.userId, blockId, {
      type,
      label,
      url,
    });
    sendSuccess(res, block, 'Block updated');
  }

  async deleteBlock(req: Request, res: Response): Promise<void> {
    const { blockId } = req.params as Record<string, string>;
    await founderCardsService.deleteBlock(req.user!.userId, blockId);
    sendSuccess(res, null, 'Block deleted');
  }

  /** Public: a visitor leaves their details on someone's card. */
  async captureLead(req: Request, res: Response): Promise<void> {
    const { userId } = req.params as Record<string, string>;
    const { name, email, message } = req.body as { name: string; email: string; message?: string };
    const result = await founderCardsService.captureLead(userId, { name, email, message });
    sendSuccess(res, result, 'Thanks — your details were shared');
  }

  /** Owner: list leads captured from their card. */
  async listLeads(req: Request, res: Response): Promise<void> {
    const leads = await founderCardsService.listLeads(req.user!.userId);
    sendSuccess(res, leads, 'Card leads');
  }

  async generateQR(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const card = await founderCardsService.generateQR(userId);
    sendSuccess(res, card, 'QR code generated');
  }

  async approveCard(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const card = await founderCardsService.approveCard(id, adminId);
    sendSuccess(res, card, 'Founder Card approved');
  }

  async rejectCard(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const { reason } = req.body as { reason?: string };
    const card = await founderCardsService.rejectCard(id, adminId, reason);
    sendSuccess(res, card, 'Founder Card application rejected');
  }

  async deactivateCard(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const card = await founderCardsService.deactivateCard(id, adminId);
    sendSuccess(res, card, 'Founder Card deactivated');
  }

  async reactivateCard(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const card = await founderCardsService.reactivateCard(id, adminId);
    sendSuccess(res, card, 'Founder Card reactivated');
  }

  async listPendingCards(req: Request, res: Response): Promise<void> {
    const { page, limit } = req.query as { page?: string; limit?: string };
    const result = await founderCardsService.listPendingCards(
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined
    );
    sendPaginated(res, result.cards, result.pagination, 'Pending cards retrieved');
  }

  async getAllCards(req: Request, res: Response): Promise<void> {
    const { page, limit, status } = req.query as { page?: string; limit?: string; status?: string };
    const result = await founderCardsService.getAllCards(
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      status
    );
    sendPaginated(res, result.cards, result.pagination, 'Founder cards retrieved');
  }

  async getCardByQR(req: Request, res: Response): Promise<void> {
    const { qrData } = req.params as Record<string, string>;
    const user = await founderCardsService.getCardByQR(qrData);
    sendSuccess(res, user, 'Profile retrieved via QR');
  }

  async getPublicCardBySlug(req: Request, res: Response): Promise<void> {
    const { slug } = req.params as Record<string, string>;
    const card = await founderCardsService.getPublicCardBySlug(slug, req.user?.userId);
    sendSuccess(res, card, 'Public card retrieved');
  }

  /** "Save contact" — serves the card as a downloadable .vcf file. */
  async getVCardBySlug(req: Request, res: Response): Promise<void> {
    const { slug } = req.params as Record<string, string>;
    const vcf = await founderCardsService.getVCardBySlug(slug, req.user?.userId);
    res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="contact.vcf"');
    // Content now varies by viewer (contact gate) — must not be shared-cached.
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(vcf);
  }

  /** Endorse one of a connection's listed skills. */
  async endorseSkill(req: Request, res: Response): Promise<void> {
    const endorserId = req.user!.userId;
    const { userId } = req.params as Record<string, string>;
    const { skill } = req.body as { skill: string };
    const summary = await founderCardsService.endorseSkill(endorserId, userId, skill);
    sendSuccess(res, summary, 'Skill endorsed');
  }

  /** Withdraw an endorsement. */
  async unendorseSkill(req: Request, res: Response): Promise<void> {
    const endorserId = req.user!.userId;
    const { userId } = req.params as Record<string, string>;
    const { skill } = req.body as { skill: string };
    const summary = await founderCardsService.unendorseSkill(endorserId, userId, skill);
    sendSuccess(res, summary, 'Endorsement removed');
  }

  async getPublicCardByUserId(req: Request, res: Response): Promise<void> {
    const { userId } = req.params as Record<string, string>;
    const card = await founderCardsService.getPublicCardByUserId(userId, req.user?.userId);
    sendSuccess(res, card, 'Public card retrieved');
  }

  async getPublicCardByUsername(req: Request, res: Response): Promise<void> {
    const { username } = req.params as Record<string, string>;
    const card = await founderCardsService.getPublicCardByUsername(username, req.user?.userId);
    sendSuccess(res, card, 'Public card retrieved');
  }

  async provisionNfc(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { nfcTagId } = req.body as { nfcTagId: string };
    const card = await founderCardsService.provisionNfc(userId, nfcTagId);
    sendSuccess(res, card, 'NFC tag linked to your card');
  }

  async adminProvisionNfc(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const { nfcTagId } = req.body as { nfcTagId: string };
    const card = await founderCardsService.provisionNfcByCardId(id, nfcTagId);
    sendSuccess(res, card, 'NFC tag assigned to card');
  }
}

export default new FounderCardsController();
