import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { GroupService } from '../services/group.service';

export class GroupController {
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const groups = await GroupService.listGroups(req.user!.id);
      res.json(groups);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const group = await GroupService.getGroupById(req.user!.id, req.params.id);
      if (!group) {
        res.status(404).json({ error: 'Grupo não encontrado' });
        return;
      }
      res.json(group);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const group = await GroupService.createGroup(req.user!.id, req.body);
      res.status(201).json(group);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      await GroupService.deleteGroup(req.user!.id, req.params.id);
      res.json({ success: true, message: 'Grupo excluído com sucesso' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
