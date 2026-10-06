import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/prisma';
import { DemoService } from '../services/demo.service';

export class SettingsController {
  static async getSettings(req: AuthenticatedRequest, res: Response) {
    try {
      let settings = await prisma.settings.findUnique({
        where: { userId: req.user!.id }
      });

      if (!settings) {
        settings = await prisma.settings.create({
          data: {
            userId: req.user!.id,
            ignoreFirstN: 100,
            ignoreAdmins: true,
            ignoreDuplicates: true,
            ignoreAlreadyRegistered: true,
            ignoreAlreadyInDestination: true,
            ignoreWithoutIdentifier: true,
            defaultBatchSize: 50,
            demoModeActive: false
          }
        });
      }

      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateSettings(req: AuthenticatedRequest, res: Response) {
    try {
      const settings = await prisma.settings.upsert({
        where: { userId: req.user!.id },
        create: {
          userId: req.user!.id,
          ...req.body
        },
        update: req.body
      });
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async triggerDemoMode(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await DemoService.seedDemoData(req.user!.id);
      res.json({
        message: 'Modo Demonstração ativado com sucesso! 500 contatos, 5 grupos, 3 campanhas e 10 lotes foram gerados.',
        result
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Erro ao gerar dados demo: ' + error.message });
    }
  }
}
