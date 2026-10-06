export const CONTACT_STATUSES = [
  'NOVO',
  'INTERESSADO',
  'CLIENTE',
  'VIP',
  'PENDENTE',
  'ADICIONADO',
  'NAO_ADICIONADO',
  'IGNORADO'
] as const;

export type ContactStatus = typeof CONTACT_STATUSES[number];

export const BATCH_CONTACT_STATUSES = [
  'PENDENTE',
  'ADICIONADO',
  'NAO_ADICIONADO',
  'ERRO',
  'JA_NO_GRUPO'
] as const;

export type BatchContactStatus = typeof BATCH_CONTACT_STATUSES[number];

export const CAMPAIGN_STATUSES = [
  'RASCUNHO',
  'EM_ANDAMENTO',
  'PAUSADA',
  'CONCLUIDA'
] as const;

export type CampaignStatus = typeof CAMPAIGN_STATUSES[number];

export const DEFAULT_TAGS = [
  { name: 'Lead', color: '#3b82f6' },
  { name: 'Novo', color: '#10b981' },
  { name: 'Interessado', color: '#8b5cf6' },
  { name: 'Cliente', color: '#059669' },
  { name: 'VIP', color: '#f59e0b' },
  { name: 'Promoção', color: '#ec4899' }
];

export const DEFAULT_FILTER_OPTIONS = {
  ignoreFirstN: 100,
  ignoreAdmins: true,
  ignoreDuplicates: true,
  ignoreAlreadyRegistered: true,
  ignoreAlreadyInDestination: true,
  ignoreWithoutIdentifier: true
};

export const DEFAULT_BATCH_SIZES = [25, 50, 100];
