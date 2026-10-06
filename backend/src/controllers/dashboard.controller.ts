import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { StatsService } from '../services/stats.service';

export class DashboardController {
  static async getStats(req: AuthenticatedRequest, res: Response) {
    try {
      const stats = await StatsService.getDashboardStats(req.user!.id);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
