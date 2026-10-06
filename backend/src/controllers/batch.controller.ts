import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { BatchService } from '../services/batch.service';

export class BatchController {
  static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const batch = await BatchService.getBatchById(req.user!.id, req.params.id);
      if (!batch) {
        res.status(404).json({ error: 'Lote não encontrado' });
        return;
      }
      res.json(batch);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateContactStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { status, notes } = req.body;
      const updated = await BatchService.updateBatchContactStatus(
        req.user!.id,
        req.params.contactId,
        status,
        notes
      );
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async bulkUpdate(req: AuthenticatedRequest, res: Response) {
    try {
      const { items } = req.body;
      const result = await BatchService.bulkUpdateBatchContacts(
        req.user!.id,
        req.params.id,
        items
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async removeContact(req: AuthenticatedRequest, res: Response) {
    try {
      await BatchService.removeContactFromBatch(req.user!.id, req.params.contactId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getNextBatch(req: AuthenticatedRequest, res: Response) {
    try {
      const { campaignId, currentBatchNumber } = req.query;
      const nextBatch = await BatchService.getNextPendingBatch(
        req.user!.id,
        campaignId as string,
        parseInt(currentBatchNumber as string, 10)
      );
      res.json(nextBatch);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getActive(req: AuthenticatedRequest, res: Response) {
    try {
      const activeBatch = await BatchService.getActiveBatch(req.user!.id);
      res.json(activeBatch);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
