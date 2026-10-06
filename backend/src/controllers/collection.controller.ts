import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/prisma';

export class CollectionController {
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const collections = await prisma.collection.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        include: {
          group: { select: { id: true, name: true } }
        }
      });
      res.json(collections);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const collection = await prisma.collection.findFirst({
        where: { id: req.params.id, userId: req.user!.id },
        include: {
          group: true,
          items: true
        }
      });
      if (!collection) {
        res.status(404).json({ error: 'Histórico de coleta não encontrado' });
        return;
      }
      res.json(collection);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
