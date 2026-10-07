import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { ContactService } from '../services/contact.service';

export class ContactController {
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await ContactService.listContacts(req.user!.id, {
        search: req.query.search as string,
        status: req.query.status as string,
        groupId: req.query.groupId as string,
        tagId: req.query.tagId as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const contact = await ContactService.getContactById(req.user!.id, req.params.id);
      if (!contact) {
        res.status(404).json({ error: 'Contato não encontrado' });
        return;
      }
      res.json(contact);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const contact = await ContactService.updateContact(req.user!.id, req.params.id, req.body);
      res.json(contact);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      await ContactService.deleteContact(req.user!.id, req.params.id);
      res.json({ success: true, message: 'Contato excluído com sucesso' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteAll(req: AuthenticatedRequest, res: Response) {
    try {
      const { pin } = req.body;
      const result = await ContactService.deleteAllContacts(req.user!.id, pin);
      res.json({
        message: `${result.count} contatos apagados com sucesso!`,
        ...result
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async previewFilter(req: AuthenticatedRequest, res: Response) {
    try {
      const { rawContacts, filters, destinationGroupId } = req.body;
      const preview = await ContactService.previewFiltering(
        req.user!.id,
        rawContacts,
        filters,
        destinationGroupId
      );
      res.json(preview);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async collect(req: AuthenticatedRequest, res: Response) {
    try {
      const { groupName, waGroupId, destinationGroupId, segment, tagName, filters, rawContacts } = req.body;
      const result = await ContactService.saveCollectedContacts(
        req.user!.id,
        groupName,
        rawContacts,
        filters,
        waGroupId,
        destinationGroupId,
        segment,
        tagName
      );
      res.status(201).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
