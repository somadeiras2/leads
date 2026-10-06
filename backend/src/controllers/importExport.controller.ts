import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { ImportExportService } from '../services/importExport.service';

export class ImportExportController {
  static async export(req: AuthenticatedRequest, res: Response) {
    try {
      const { buffer, fileName, mimeType } = await ImportExportService.exportContacts(
        req.user!.id,
        req.body
      );

      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', mimeType);
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async previewImport(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Nenhum arquivo enviado para importação' });
        return;
      }

      const preview = await ImportExportService.previewImport(req.user!.id, req.file.buffer);
      res.json(preview);
    } catch (error: any) {
      res.status(400).json({ error: 'Erro ao analisar arquivo: ' + error.message });
    }
  }

  static async confirmImport(req: AuthenticatedRequest, res: Response) {
    try {
      const { rows } = req.body;
      if (!rows || !Array.isArray(rows)) {
        res.status(400).json({ error: 'Lista de contatos inválida' });
        return;
      }

      const result = await ImportExportService.confirmImport(req.user!.id, rows);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
