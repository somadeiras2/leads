import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  Users,
  RefreshCw,
  Layers,
  Download,
  Plus,
  Trash2,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { LeadsApi } from '../services/api';
import { GroupDTO } from '@grupoleads/shared';

interface GroupsViewProps {
  onOpenCreateCampaignForGroup: (groupId: string) => void;
  onFilterContactsByGroup: (groupId: string) => void;
  onExportGroup: (groupId: string) => void;
}

export const GroupsView: React.FC<GroupsViewProps> = ({
  onOpenCreateCampaignForGroup,
  onFilterContactsByGroup,
  onExportGroup
}) => {
  const [groups, setGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      const data = await LeadsApi.getGroups();
      setGroups(data);
    } catch (err) {
      console.error('Erro ao carregar grupos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await LeadsApi.createGroup({ name: newGroupName.trim(), description: newGroupDesc });
      setNewGroupName('');
      setNewGroupDesc('');
      setIsNewGroupModalOpen(false);
      fetchGroups();
    } catch (err) {
      console.error('Erro ao criar grupo:', err);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Deseja realmente remover este grupo? Os contatos continuarão salvos no CRM.')) return;
    try {
      await LeadsApi.deleteGroup(id);
      fetchGroups();
    } catch (err) {
      console.error('Erro ao deletar grupo:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Meus Grupos de Origem</h2>
          <p className="text-xs text-slate-500">
            Grupos identificados pela extensão Chrome ou cadastrados para segmentação
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsNewGroupModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Novo Grupo
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Nome do Grupo</th>
                <th className="px-6 py-3.5">Contatos Totais</th>
                <th className="px-6 py-3.5">Novos Contatos</th>
                <th className="px-6 py-3.5">Última Coleta</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                    Carregando grupos...
                  </td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Nenhum grupo cadastrado ainda. Use a Extensão no WhatsApp Web ou clique em "Novo Grupo".
                  </td>
                </tr>
              ) : (
                groups.map((group) => (
                  <tr key={group.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{group.name}</div>
                      {group.description && (
                        <div className="text-xs text-slate-500 mt-0.5">{group.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">
                      {group.contactsCount || group._count?.contacts || 0}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {group.newContactsCount || 0} novos
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {group.lastCollectedAt
                        ? new Date(group.lastCollectedAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Nunca coletado'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="concluido">Ativo</Badge>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <button
                        onClick={() => onFilterContactsByGroup(group.id)}
                        className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-medium inline-flex items-center gap-1"
                        title="Ver contatos"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Ver</span>
                      </button>

                      <button
                        onClick={() => onOpenCreateCampaignForGroup(group.id)}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-xs font-medium inline-flex items-center gap-1"
                        title="Criar lotes desta origem"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Criar Lote</span>
                      </button>

                      <button
                        onClick={() => onExportGroup(group.id)}
                        className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors text-xs font-medium inline-flex items-center gap-1"
                        title="Exportar contatos deste grupo"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Exportar</span>
                      </button>

                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Excluir grupo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Novo Grupo */}
      <Modal
        isOpen={isNewGroupModalOpen}
        onClose={() => setIsNewGroupModalOpen(false)}
        title="Cadastrar Novo Grupo"
        subtitle="Identifique um grupo para organizar contatos e criar campanhas"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Grupo</label>
            <input
              type="text"
              placeholder="Ex: Ofertas VIP Imóveis"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição (Opcional)</label>
            <textarea
              rows={3}
              placeholder="Notas ou objetivo deste grupo..."
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsNewGroupModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleCreateGroup}>
              Salvar Grupo
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
