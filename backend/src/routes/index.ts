import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validation.middleware';
import {
  contactCreateSchema,
  contactUpdateSchema,
  groupCreateSchema,
  tagCreateSchema,
  campaignCreateSchema,
  batchContactUpdateSchema,
  exportConfigSchema,
  settingsUpdateSchema,
  collectContactsSchema
} from '@grupoleads/shared';

import { AuthController } from '../controllers/auth.controller';
import { ContactController } from '../controllers/contact.controller';
import { GroupController } from '../controllers/group.controller';
import { TagController } from '../controllers/tag.controller';
import { CampaignController } from '../controllers/campaign.controller';
import { BatchController } from '../controllers/batch.controller';
import { CollectionController } from '../controllers/collection.controller';
import { ImportExportController } from '../controllers/importExport.controller';
import { DashboardController } from '../controllers/dashboard.controller';
import { SettingsController } from '../controllers/settings.controller';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

// Rotas públicas de autenticação
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.get('/auth/me', authMiddleware, AuthController.me);

// Todas as rotas seguintes são protegidas por autenticação multi-usuário
router.use(authMiddleware);

// Gestão de Perfil & Administradores
router.put('/auth/profile', AuthController.updateProfile);
router.get('/admin/users', AuthController.listUsers);
router.post('/admin/users', AuthController.createAdminUser);
router.delete('/admin/users/:id', AuthController.deleteUser);

// Contatos & CRM
router.get('/contacts', ContactController.list);
router.get('/contacts/:id', ContactController.getById);
router.put('/contacts/:id', validateBody(contactUpdateSchema), ContactController.update);
router.delete('/contacts/:id', ContactController.delete);
router.post('/contacts/delete-all', ContactController.deleteAll);
router.delete('/contacts', ContactController.deleteAll);
router.post('/contacts/preview', ContactController.previewFilter);
router.post('/contacts/collect', validateBody(collectContactsSchema), ContactController.collect);

// Grupos
router.get('/groups', GroupController.list);
router.get('/groups/:id', GroupController.getById);
router.post('/groups', validateBody(groupCreateSchema), GroupController.create);
router.put('/groups/:id', GroupController.update);
router.delete('/groups/:id', GroupController.delete);

// Tags
router.get('/tags', TagController.list);
router.post('/tags', validateBody(tagCreateSchema), TagController.create);
router.delete('/tags/:id', TagController.delete);

// Campanhas
router.get('/campaigns', CampaignController.list);
router.get('/campaigns/:id', CampaignController.getById);
router.post('/campaigns', validateBody(campaignCreateSchema), CampaignController.create);
router.put('/campaigns/:id/status', CampaignController.updateStatus);
router.delete('/campaigns/:id', CampaignController.delete);

// Lotes & Execução Manual
router.get('/batches/active', BatchController.getActive);
router.get('/batches/all', BatchController.getAll);
router.post('/batches/selected', BatchController.getSelected);
router.get('/batches/list', BatchController.listBatches);
router.get('/batches/next', BatchController.getNextBatch);
router.get('/batches/:id', BatchController.getById);
router.put('/batches/contacts/:contactId', validateBody(batchContactUpdateSchema), BatchController.updateContactStatus);
router.post('/batches/:id/bulk', BatchController.bulkUpdate);
router.delete('/batches/contacts/:contactId', BatchController.removeContact);

// Histórico de Coletas
router.get('/collections', CollectionController.list);
router.get('/collections/:id', CollectionController.getById);

// Importação & Exportação
router.post('/exports', validateBody(exportConfigSchema), ImportExportController.export);
router.post('/imports/preview', upload.single('file'), ImportExportController.previewImport);
router.post('/imports/confirm', ImportExportController.confirmImport);

// Dashboard & Métricas
router.get('/dashboard/stats', DashboardController.getStats);

// Configurações & Modo Demonstração
router.get('/settings', SettingsController.getSettings);
router.put('/settings', validateBody(settingsUpdateSchema), SettingsController.updateSettings);
router.post('/settings/demo', SettingsController.triggerDemoMode);

export default router;
