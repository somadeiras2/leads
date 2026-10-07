import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Tag as TagIcon,
  FileText,
  Phone,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreVertical,
  Check,
  AlertTriangle,
  XCircle,
  Lock,
  Sparkles
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { LeadsApi } from '../services/api';
import { ContactDTO, GroupDTO, TagDTO } from '@grupoleads/shared';

interface ContactsCRMProps {
  onOpenCreateCampaignWithContacts?: (contactIds: string[]) => void;
  initialGroupId?: string;
}

export const ContactsCRM: React.FC<ContactsCRMProps> = ({
  onOpenCreateCampaignWithContacts,
  initialGroupId
}) => {
  const [contacts, setContacts] = useState<ContactDTO[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [groups, setGroups] = useState<GroupDTO[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId || '');
  const [selectedTagId, setSelectedTagId] = useState('');
  const [tags, setTags] = useState<TagDTO[]>([]);

  // Seleção múltipla para criação de lotes ou exportação
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());

  // Modal de edição / observações
  const [editingContact, setEditingContact] = useState<ContactDTO | null>(null);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('NOVO');
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Modal de criação de nova tag
  const [isNewTagModalOpen, setIsNewTagModalOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');

  // Modal de exclusão em massa com PIN
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deleteAllError, setDeleteAllError] = useState('');

  const fetchContacts = async (page = 1, newLimit?: number) => {
    setIsLoading(true);
    const limitToUse = newLimit || pagination.limit || 20;
    try {
      const res = await LeadsApi.getContacts({
        search,
        status: statusFilter === 'TODOS' ? undefined : statusFilter,
        groupId: selectedGroupId || undefined,
        tagId: selectedTagId || undefined,
        page,
        limit: limitToUse
      });
      setContacts(res.contacts);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Erro ao buscar contatos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [gList, tList] = await Promise.all([
        LeadsApi.getGroups(),
        LeadsApi.getTags()
      ]);
      setGroups(gList);
      setTags(tList);
    } catch (err) {
      console.error('Erro ao buscar metadados:', err);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (initialGroupId !== undefined) {
      setSelectedGroupId(initialGroupId);
    }
  }, [initialGroupId]);

  useEffect(() => {
    fetchContacts(1);
  }, [search, statusFilter, selectedGroupId, selectedTagId]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedContactIds(new Set(contacts.map(c => c.id)));
    } else {
      setSelectedContactIds(new Set());
    }
  };

  const toggleSelectContact = (id: string) => {
    const next = new Set(selectedContactIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedContactIds(next);
  };

  const openEditModal = (contact: ContactDTO) => {
    setEditingContact(contact);
    setEditName(contact.name);
    setEditStatus(contact.status);
    setEditNotes(contact.notes || '');
    setEditTags(contact.tags?.map(t => t.tagId) || []);
  };

  const handleSaveContact = async () => {
    if (!editingContact) return;
    setIsSaving(true);
    try {
      await LeadsApi.updateContact(editingContact.id, {
        name: editName,
        status: editStatus as any,
        notes: editNotes,
        tagIds: editTags
      });
      setEditingContact(null);
      fetchContacts(pagination.page);
    } catch (err) {
      console.error('Erro ao salvar contato:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Deseja realmente excluir este contato?')) return;
    try {
      await LeadsApi.deleteContact(id);
      fetchContacts(pagination.page);
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  const handleDeleteAll = async () => {
    if (!pinInput.trim()) {
      setDeleteAllError('Por favor, digite o PIN de segurança.');
      return;
    }
    if (pinInput !== '1234') {
      setDeleteAllError('PIN incorreto! O PIN cadastrado é 1234.');
      return;
    }

    setIsDeletingAll(true);
    setDeleteAllError('');
    try {
      await LeadsApi.deleteAllContacts(pinInput);
      setIsDeleteAllModalOpen(false);
      setPinInput('');
      setSelectedContactIds(new Set());
      await fetchContacts(1);
      alert('Todos os contatos foram apagados com sucesso!');
    } catch (err: any) {
      setDeleteAllError(err.response?.data?.error || err.message || 'Erro ao apagar contatos.');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      await LeadsApi.createTag({ name: newTagName.trim(), color: newTagColor });
      setNewTagName('');
      setIsNewTagModalOpen(false);
      fetchMetadata();
    } catch (err) {
      console.error('Erro ao criar tag:', err);
    }
  };

  const statusFilters = [
    { label: 'Todos', value: 'TODOS' },
    { label: 'Novos', value: 'NOVO' },
    { label: 'Interessados', value: 'INTERESSADO' },
    { label: 'Clientes', value: 'CLIENTE' },
    { label: 'VIP', value: 'VIP' },
    { label: 'Pendentes', value: 'PENDENTE' },
    { label: 'Adicionados', value: 'ADICIONADO' },
    { label: 'Não Adicionados', value: 'NAO_ADICIONADO' }
  ];

  return (
    <div className="space-y-6">
      {/* Barra superior de busca e filtros */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone ou final (%0290)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all"
            />
            {search.startsWith('%') && search.length > 1 && (
              <div className="absolute left-0 top-full mt-1.5 z-10 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-md flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-200 animate-pulse" />
                <span>Buscando números terminados em <strong>{search.slice(1)}</strong></span>
              </div>
            )}
            {search.endsWith('%') && !search.startsWith('%') && search.length > 1 && (
              <div className="absolute left-0 top-full mt-1.5 z-10 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-md flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-200 animate-pulse" />
                <span>Buscando números iniciados em <strong>{search.slice(0, -1)}</strong></span>
              </div>
            )}
          </div>

          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
          >
            <option value="">Todos os Grupos</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                📁 {g.name}
              </option>
            ))}
          </select>

          <select
            value={selectedTagId}
            onChange={(e) => setSelectedTagId(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
          >
            <option value="">Todas as Etiquetas</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                🏷️ {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {selectedContactIds.size > 0 && onOpenCreateCampaignWithContacts && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onOpenCreateCampaignWithContacts(Array.from(selectedContactIds))}
              icon={<Layers className="w-4 h-4" />}
            >
              Criar Lotes com {selectedContactIds.size} Selecionados
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsNewTagModalOpen(true)}
            icon={<TagIcon className="w-4 h-4" />}
          >
            Nova Tag
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setIsDeleteAllModalOpen(true);
              setPinInput('');
              setDeleteAllError('');
            }}
            icon={<Trash2 className="w-4 h-4" />}
          >
            Apagar Todos
          </Button>
        </div>
      </div>

      {/* Filtros em pílulas de status */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {statusFilters.map((sf) => (
          <button
            key={sf.value}
            onClick={() => setStatusFilter(sf.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === sf.value
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {sf.label}
          </button>
        ))}
      </div>

      {/* Tabela de Contatos */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={contacts.length > 0 && selectedContactIds.size === contacts.length}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Grupos de Origem</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Última Coleta</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                    Carregando contatos...
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Nenhum contato encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => {
                  const isSelected = selectedContactIds.has(contact.id);
                  return (
                    <tr
                      key={contact.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectContact(contact.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {contact.name || 'Sem Nome'}
                        {contact.notes && (
                          <span
                            title={contact.notes}
                            className="ml-2 inline-block text-slate-400 hover:text-slate-600 cursor-help"
                          >
                            <FileText className="w-3.5 h-3.5 inline" />
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                        +{contact.phone}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {contact.groups && contact.groups.length > 0 ? (
                            contact.groups.map((g) => (
                              <span
                                key={g.groupId}
                                className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium"
                              >
                                {g.group.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-xs">
                              {contact.sourceGroup || 'Sem grupo'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {contact.tags && contact.tags.length > 0 ? (
                            contact.tags.map((t) => (
                              <span
                                key={t.tagId}
                                className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-white shadow-xs"
                                style={{ backgroundColor: t.tag.color || '#3b82f6' }}
                              >
                                {t.tag.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={contact.status.toLowerCase() as any}>
                          {contact.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {contact.lastCollectedAt
                          ? new Date(contact.lastCollectedAt).toLocaleDateString('pt-BR')
                          : new Date(contact.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                          onClick={() => openEditModal(contact)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar contato"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteContact(contact.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir contato"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <div className="text-xs text-slate-500">
            Mostrando <strong>{contacts.length}</strong> de <strong>{pagination.total}</strong> contatos
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Itens por página */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Por página:</span>
              <select
                value={pagination.limit}
                onChange={(e) => fetchContacts(1, Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Primeira página */}
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchContacts(1)}
                title="Primeira página"
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>

              {/* Página anterior */}
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchContacts(pagination.page - 1)}
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              {/* Seletor dropdown direto da página */}
              <div className="flex items-center gap-1.5 px-1 text-xs text-slate-700 font-medium">
                <span>Página</span>
                <select
                  value={pagination.page}
                  onChange={(e) => fetchContacts(Number(e.target.value))}
                  className="bg-white border border-blue-400 text-blue-700 font-bold rounded-lg px-2.5 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer shadow-xs"
                >
                  {Array.from({ length: pagination.totalPages || 1 }, (_, i) => i + 1).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <span className="text-slate-500">de {pagination.totalPages || 1}</span>
              </div>

              {/* Próxima página */}
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchContacts(pagination.page + 1)}
                title="Próxima página"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>

              {/* Última página */}
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchContacts(pagination.totalPages)}
                title="Última página"
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Modal de Edição de Contato */}
      <Modal
        isOpen={!!editingContact}
        onClose={() => setEditingContact(null)}
        title="Editar Contato"
        subtitle={editingContact ? `+${editingContact.phone}` : ''}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status CRM</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            >
              {statusFilters.filter(s => s.value !== 'TODOS').map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tags</label>
            <div className="flex flex-wrap gap-2 p-2 border border-slate-200 rounded-lg max-h-32 overflow-y-auto">
              {tags.map((tag) => {
                const isSelected = editTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) setEditTags(editTags.filter(id => id !== tag.id));
                      else setEditTags([...editTags, tag.id]);
                    }}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Observações Internas</label>
            <textarea
              rows={3}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Histórico, notas de atendimento ou qualificação do lead..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setEditingContact(null)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSaveContact} isLoading={isSaving}>
              Salvar Alterações
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Criação de Nova Tag */}
      <Modal
        isOpen={isNewTagModalOpen}
        onClose={() => setIsNewTagModalOpen(false)}
        title="Criar Nova Tag"
        subtitle="Tags ajudam a segmentar contatos para campanhas e lotes"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nome da Tag</label>
            <input
              type="text"
              placeholder="Ex: Black Friday, Quente, Investidor..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Cor</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="w-10 h-10 rounded border border-slate-200 cursor-pointer"
              />
              <span className="text-sm font-mono text-slate-600">{newTagColor}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsNewTagModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleCreateTag}>
              Criar Tag
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Apagar Todos os Contatos com PIN 1234 */}
      <Modal
        isOpen={isDeleteAllModalOpen}
        onClose={() => setIsDeleteAllModalOpen(false)}
        title="Apagar Todos os Contatos"
        subtitle="Confirmação de segurança necessária"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-900">Atenção! Esta ação é irreversível.</p>
              <p className="mt-0.5">Todos os contatos salvos no CRM, tags associadas e registros de lotes serão permanentemente excluídos do banco de dados.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Digite o PIN de Segurança para Confirmar:</span>
            </label>
            <input
              type="password"
              maxLength={10}
              placeholder="Digite o PIN (padrão: 1234)"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setDeleteAllError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleDeleteAll();
              }}
              autoFocus
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-base font-mono tracking-widest text-center focus:ring-2 focus:ring-rose-500 focus:border-rose-500 focus:outline-none"
            />
            {deleteAllError && (
              <p className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> {deleteAllError}
              </p>
            )}
            <p className="text-[11px] text-slate-400 mt-1 text-center">
              PIN cadastrado de segurança: <strong>1234</strong>
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsDeleteAllModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAll}
              isLoading={isDeletingAll}
              icon={<Trash2 className="w-4 h-4" />}
            >
              Confirmar Exclusão Total
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
