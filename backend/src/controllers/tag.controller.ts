import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/prisma';

export class TagController {
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const tags = await prisma.tag.findMany({
        where: { userId: req.user!.id },
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { contacts: true }
          }
        }
      });
      res.json(tags);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, color } = req.body;
      const tag = await prisma.tag.upsert({
        where: {
          userId_name: {
            userId: req.user!.id,
            name
          }
        },
        create: {
          userId: req.user!.id,
          name,
          color: color || '#3b82f6'
        },
        update: {
          color: color || '#3b82f6'
        }
      });
      res.status(201).json(tag);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      await prisma.tag.delete({
        where: { id: req.params.id, userId: req.user!.id }
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
