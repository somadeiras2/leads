import { z } from 'zod';
import { CONTACT_STATUSES, BATCH_CONTACT_STATUSES, CAMPAIGN_STATUSES } from '../constants';

export const phoneRegex = /^\+?[1-9]\d{6,14}$/;

export const contactCreateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(150),
  phone: z.string().min(7, 'Telefone inválido').max(25),
  identifier: z.string().optional().nullable(),
  status: z.enum(CONTACT_STATUSES).default('NOVO'),
  notes: z.string().max(1000).optional().nullable(),
  groupIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional()
});

export const contactUpdateSchema = contactCreateSchema.partial();

export const groupCreateSchema = z.object({
  name: z.string().min(1, 'Nome do grupo é obrigatório').max(150),
  waGroupId: z.string().optional().nullable(),
  description: z.string().max(500).optional().nullable()
});

export const tagCreateSchema = z.object({
  name: z.string().min(1, 'Nome da tag é obrigatório').max(50),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Cor hexadecimal inválida').optional()
});

export const filterOptionsSchema = z.object({
  ignoreFirstN: z.number().int().min(0).default(100),
  ignoreAdmins: z.boolean().default(true),
  ignoreDuplicates: z.boolean().default(true),
  ignoreAlreadyRegistered: z.boolean().default(true),
  ignoreAlreadyInDestination: z.boolean().default(true),
  ignoreWithoutIdentifier: z.boolean().default(true)
});

export const collectContactsSchema = z.object({
  groupName: z.string().min(1),
  waGroupId: z.string().optional(),
  destinationGroupId: z.string().optional().nullable(),
  filters: filterOptionsSchema,
  rawContacts: z.array(
    z.object({
      name: z.string(),
      phone: z.string(),
      identifier: z.string().optional(),
      isAdmin: z.boolean().optional()
    })
  )
});

export const campaignCreateSchema = z.object({
  name: z.string().min(1, 'Nome da campanha é obrigatório').max(150),
  sourceGroupId: z.string().optional().nullable(),
  destinationGroupId: z.string().optional().nullable(),
  targetQuantity: z.number().int().positive().max(10000),
  batchSize: z.number().int().positive().min(5).max(500).default(50),
  intervalMinutes: z.number().int().min(1).max(1440).default(30).optional(),
  contactIds: z.array(z.string()).optional()
});

export const batchContactUpdateSchema = z.object({
  status: z.enum(BATCH_CONTACT_STATUSES),
  notes: z.string().optional().nullable()
});

export const exportConfigSchema = z.object({
  format: z.enum(['CSV', 'XLSX']),
  scope: z.enum(['ALL', 'BY_GROUP', 'BY_TAG', 'NEW', 'SELECTED']),
  groupId: z.string().optional(),
  tagId: z.string().optional(),
  selectedContactIds: z.array(z.string()).optional(),
  columns: z.array(z.enum(['name', 'phone', 'groups', 'tags', 'status', 'createdAt', 'notes'])).min(1)
});

export const settingsUpdateSchema = z.object({
  ignoreFirstN: z.number().int().min(0).optional(),
  ignoreAdmins: z.boolean().optional(),
  ignoreDuplicates: z.boolean().optional(),
  ignoreAlreadyRegistered: z.boolean().optional(),
  ignoreAlreadyInDestination: z.boolean().optional(),
  ignoreWithoutIdentifier: z.boolean().optional(),
  defaultBatchSize: z.number().int().min(5).max(500).optional(),
  demoModeActive: z.boolean().optional()
});
