import axios from 'axios';
import {
  ContactDTO,
  GroupDTO,
  TagDTO,
  CampaignDTO,
  BatchDTO,
  CollectionHistoryDTO,
  DashboardStatsDTO,
  ImportPreviewDTO,
  ExportConfigDTO,
  UserSettingsDTO
} from '@grupoleads/shared';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para injetar token JWT se disponível
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('grupoleads_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const LeadsApi = {
  // Autenticação & Usuários
  login: async (email: string, password: string) => (await api.post('/auth/login', { email, password })).data,
  register: async (name: string, email: string, password: string) => (await api.post('/auth/register', { name, email, password })).data,
  getMe: async () => (await api.get('/auth/me')).data,
  updateProfile: async (data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) =>
    (await api.put('/auth/profile', data)).data,
  getUsers: async () => (await api.get<Array<{ id: string; name: string; email: string; createdAt: string; _count?: any }>>('/admin/users')).data,
  createAdminUser: async (data: { name: string; email: string; password: string }) =>
    (await api.post('/admin/users', data)).data,
  deleteUser: async (id: string) => (await api.delete(`/admin/users/${id}`)).data,

  // Dashboard Stats
  getStats: async (): Promise<DashboardStatsDTO> => (await api.get('/dashboard/stats')).data,

  // Contatos
  getContacts: async (params?: { search?: string; status?: string; groupId?: string; tagId?: string; page?: number; limit?: number }) =>
    (await api.get<{ contacts: ContactDTO[]; pagination: any }>('/contacts', { params })).data,
  getContact: async (id: string): Promise<ContactDTO> => (await api.get(`/contacts/${id}`)).data,
  updateContact: async (id: string, data: Partial<ContactDTO> & { tagIds?: string[]; groupIds?: string[] }): Promise<ContactDTO> => (await api.put(`/contacts/${id}`, data)).data,
  deleteContact: async (id: string) => (await api.delete(`/contacts/${id}`)).data,
  deleteAllContacts: async (pin: string) => (await api.post('/contacts/delete-all', { pin })).data,
  previewFilter: async (payload: any) => (await api.post('/contacts/preview', payload)).data,
  collectContacts: async (payload: any) => (await api.post('/contacts/collect', payload)).data,

  // Grupos
  getGroups: async (): Promise<GroupDTO[]> => (await api.get('/groups')).data,
  getGroup: async (id: string) => (await api.get(`/groups/${id}`)).data,
  createGroup: async (data: { name: string; description?: string }) => (await api.post('/groups', data)).data,
  deleteGroup: async (id: string) => (await api.delete(`/groups/${id}`)).data,

  // Tags
  getTags: async (): Promise<TagDTO[]> => (await api.get('/tags')).data,
  createTag: async (data: { name: string; color?: string }): Promise<TagDTO> => (await api.post('/tags', data)).data,
  deleteTag: async (id: string) => (await api.delete(`/tags/${id}`)).data,

  // Campanhas
  getCampaigns: async (): Promise<CampaignDTO[]> => (await api.get('/campaigns')).data,
  getCampaign: async (id: string): Promise<CampaignDTO> => (await api.get(`/campaigns/${id}`)).data,
  createCampaign: async (data: any): Promise<CampaignDTO> => (await api.post('/campaigns', data)).data,
  updateCampaignStatus: async (id: string, status: string) => (await api.put(`/campaigns/${id}/status`, { status })).data,
  deleteCampaign: async (id: string) => (await api.delete(`/campaigns/${id}`)).data,

  // Lotes
  getBatch: async (id: string): Promise<BatchDTO> => (await api.get(`/batches/${id}`)).data,
  getNextBatch: async (campaignId: string, currentBatchNumber: number): Promise<BatchDTO | null> =>
    (await api.get('/batches/next', { params: { campaignId, currentBatchNumber } })).data,
  updateBatchContactStatus: async (contactId: string, status: string, notes?: string) =>
    (await api.put(`/batches/contacts/${contactId}`, { status, notes })).data,
  bulkUpdateBatch: async (batchId: string, items: Array<{ id: string; status: string; notes?: string }>) =>
    (await api.post(`/batches/${batchId}/bulk`, { items })).data,
  removeBatchContact: async (contactId: string) => (await api.delete(`/batches/contacts/${contactId}`)).data,

  // Histórico
  getCollections: async (): Promise<CollectionHistoryDTO[]> => (await api.get('/collections')).data,

  // Importação & Exportação
  previewImport: async (file: File): Promise<ImportPreviewDTO> => {
    const formData = new FormData();
    formData.append('file', file);
    return (await api.post('/imports/preview', formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
  },
  confirmImport: async (rows: any[]) => (await api.post('/imports/confirm', { rows })).data,
  exportContacts: async (config: ExportConfigDTO) => {
    const response = await api.post('/exports', config, { responseType: 'blob' });
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `grupoleads_export_${Date.now()}.${config.format.toLowerCase()}`;
    link.click();
    window.URL.revokeObjectURL(url);
  },

  // Configurações & Modo Demonstração
  getSettings: async (): Promise<UserSettingsDTO> => (await api.get('/settings')).data,
  updateSettings: async (data: Partial<UserSettingsDTO>) => (await api.put('/settings', data)).data,
  triggerDemoMode: async () => (await api.post('/settings/demo')).data
};
