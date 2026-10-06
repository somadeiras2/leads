import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { CampaignService } from '../services/campaign.service';

export class CampaignController {
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const campaigns = await CampaignService.listCampaigns(req.user!.id);
      res.json(campaigns);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const campaign = await CampaignService.getCampaignById(req.user!.id, req.params.id);
      if (!campaign) {
        res.status(404).json({ error: 'Campanha não encontrada' });
        return;
      }
      res.json(campaign);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const campaign = await CampaignService.createCampaign(req.user!.id, req.body);
      res.status(201).json(campaign);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { status } = req.body;
      const updated = await CampaignService.updateCampaignStatus(req.user!.id, req.params.id, status);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      await CampaignService.deleteCampaign(req.user!.id, req.params.id);
      res.json({ success: true, message: 'Campanha excluída com sucesso' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
