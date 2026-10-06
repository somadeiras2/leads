import { ContactStatus, BatchContactStatus, CampaignStatus } from '../constants';

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface TagDTO {
  id: string;
  name: string;
  color?: string;
  userId: string;
  _count?: {
    contacts?: number;
  };
}

export interface GroupDTO {
  id: string;
  name: string;
  waGroupId?: string | null;
  description?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  lastCollectedAt?: string | null;
  _count?: {
    contacts?: number;
  };
}

export interface ContactDTO {
  id: string;
  name: string;
  phone: string;
  identifier?: string | null;
  status: ContactStatus;
  notes?: string | null;
  userId: string;
  sourceGroup?: string | null;
  sourceGroupId?: string | null;
  lastCollectedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  groups?: {
    groupId: string;
    group: {
      id: string;
      name: string;
    };
  }[];
  tags?: {
    tagId: string;
    tag: {
      id: string;
      name: string;
      color?: string;
    };
  }[];
}

export interface FilterOptions {
  ignoreFirstN: number;
  ignoreAdmins: boolean;
  ignoreDuplicates: boolean;
  ignoreAlreadyRegistered: boolean;
  ignoreAlreadyInDestination: boolean;
  ignoreWithoutIdentifier: boolean;
}

export interface FilterResultStats {
  totalFound: number;
  firstIgnored: number;
  adminsIgnored: number;
  duplicatesIgnored: number;
  alreadyRegisteredIgnored: number;
  alreadyInDestinationIgnored: number;
  withoutIdentifierIgnored: number;
  eligibleCount: number;
}

export interface RawScrapedContact {
  name: string;
  phone: string;
  identifier?: string;
  isAdmin?: boolean;
}

export interface BatchContactDTO {
  id: string;
  batchId: string;
  contactId: string;
  status: BatchContactStatus;
  processedAt?: string | null;
  notes?: string | null;
  contact: ContactDTO;
}

export interface BatchDTO {
  id: string;
  campaignId: string;
  batchNumber: number;
  targetSize: number;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO';
  createdAt: string;
  updatedAt: string;
  contacts?: BatchContactDTO[];
  _count?: {
    contacts?: number;
  };
}

export interface CampaignDTO {
  id: string;
  name: string;
  targetGoal: number;
  batchSize: number;
  status: CampaignStatus;
  sourceGroupId?: string | null;
  sourceGroup?: GroupDTO | null;
  destinationGroupId?: string | null;
  destinationGroup?: GroupDTO | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  batches?: BatchDTO[];
  stats?: {
    selected: number;
    processed: number;
    added: number;
    notAdded: number;
    pending: number;
    error: number;
    alreadyInGroup: number;
    progressPercentage: number;
  };
}

export interface CollectionHistoryDTO {
  id: string;
  userId: string;
  groupId: string;
  groupName: string;
  totalFound: number;
  newCount: number;
  duplicatesCount: number;
  ignoredCount: number;
  createdAt: string;
}

export interface DashboardStatsDTO {
  totalContacts: number;
  uniqueContacts: number;
  totalGroups: number;
  newContacts: number;
  activeCampaigns: number;
  pendingBatches: number;
  contactsByGroup: { groupName: string; count: number }[];
  contactsGrowth: { date: string; count: number }[];
  contactsByStatus: { status: string; count: number }[];
  campaignPerformance: { name: string; added: number; notAdded: number; pending: number }[];
  activeCampaignPrompt?: {
    campaignId: string;
    campaignName: string;
    pendingBatchesCount: number;
  } | null;
}

export interface ImportPreviewDTO {
  totalRows: number;
  newCount: number;
  duplicatesCount: number;
  invalidCount: number;
  previewRows: Array<{
    name: string;
    phone: string;
    group?: string;
    tags?: string[];
    notes?: string;
    isValid: boolean;
    isDuplicate: boolean;
    reason?: string;
  }>;
}

export interface ExportConfigDTO {
  format: 'CSV' | 'XLSX';
  scope: 'ALL' | 'BY_GROUP' | 'BY_TAG' | 'NEW' | 'SELECTED';
  groupId?: string;
  tagId?: string;
  selectedContactIds?: string[];
  columns: Array<'name' | 'phone' | 'groups' | 'tags' | 'status' | 'createdAt' | 'notes'>;
}

export interface UserSettingsDTO {
  ignoreFirstN: number;
  ignoreAdmins: boolean;
  ignoreDuplicates: boolean;
  ignoreAlreadyRegistered: boolean;
  ignoreAlreadyInDestination: boolean;
  ignoreWithoutIdentifier: boolean;
  defaultBatchSize: number;
  demoModeActive: boolean;
}
