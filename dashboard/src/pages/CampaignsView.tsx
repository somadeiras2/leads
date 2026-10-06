import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Play,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Trash2,
  PauseCircle,
  PlayCircle
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ProgressBar } from '../components/common/ProgressBar';
import { Modal } from '../components/common/Modal';
import { LeadsApi } from '../services/api';
import { CampaignDTO, GroupDTO } from '@grupoleads/shared';

interface CampaignsViewProps {
  onOpenBatchRunner: (batchId: string) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  initialContactIds?: string[];
  initialGroupId?: string;
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({
  onOpenBatchRunner,
  isCreateModalOpen,
  setIsCreateModalOpen,
  initialContactIds,
  initialGroupId
}) => {
  const [campaigns, setCampaigns] = useState<CampaignDTO[]>([]);
  const [groups, setGroups] = useState<GroupDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Formulário de Criação de Campanha
  const [name, setName] = useState('');
  const [sourceGroupId, setSourceGroupId] = useState(initialGroupId || '');
  const [destinationGroupId, setDestinationGroupId] = useState('');
  const [targetQuantity, setTargetQuantity] = useState(300);
  const [batchSize, setBatchSize] = useState(20);
  const [customBatchSize, setCustomBatchSize] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [customInterval, setCustomInterval] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const [cList, gList] = await Promise.all([
        LeadsApi.getCampaigns(),
        LeadsApi.getGroups()
      ]);
      setCampaigns(cList);
      setGroups(gList);
    } catch (err) {
      console.error('Erro ao buscar campanhas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (initialGroupId) {
      setSourceGroupId(initialGroupId);
      setName(`Campanha — ${groups.find(g => g.id === initialGroupId)?.name || 'Lotes'}`);
    }
  }, [initialGroupId, groups]);

  const handleCreateCampaign = async () => {
    setErrorMsg('');
    if (!name.trim()) {
      setErrorMsg('Informe um nome para a campanha.');
      return;
    }

    const effectiveBatchSize = customBatchSize ? parseInt(customBatchSize, 10) : batchSize;
    if (isNaN(effectiveBatchSize) || effectiveBatchSize < 5) {
      setErrorMsg('O tamanho do lote deve ser no mínimo 5 contatos.');
      return;
    }

    const effectiveInterval = customInterval ? parseInt(customInterval, 10) : intervalMinutes;

    setIsSubmitting(true);
    try {
      await LeadsApi.createCampaign({
        name: name.trim(),
        sourceGroupId: sourceGroupId || null,
        destinationGroupId: destinationGroupId || null,
        targetQuantity,
        batchSize: effectiveBatchSize,
        intervalMinutes: effectiveInterval,
        contactIds: initialContactIds
      });

      setIsCreateModalOpen(false);
      setName('');
      fetchCampaigns();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Erro ao criar campanha');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (camp: CampaignDTO) => {
    const nextStatus = camp.status === 'EM_ANDAMENTO' ? 'PAUSADA' : 'EM_ANDAMENTO';
    try {
      await LeadsApi.updateCampaignStatus(camp.id, nextStatus);
      fetchCampaigns();
    } catch (err) {
      console.error('Erro ao alterar status:', err);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta campanha e todos os seus lotes?')) return;
    try {
      await LeadsApi.deleteCampaign(id);
      fetchCampaigns();
    } catch (err) {
      console.error('Erro ao excluir campanha:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Gerenciador de Campanhas & Lotes</h2>
          <p className="text-xs text-slate-500">
            Divida contatos elegíveis em lotes controlados para inclusão manual segura no WhatsApp Web
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Criar Campanha
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="text-center py-16">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">Nenhuma campanha criada</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Crie sua primeira campanha para particionar seus contatos em lotes organizados de 25, 50 ou 100 contatos.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Criar Campanha Agora
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {campaigns.map((camp) => {
            const stats = camp.stats || {
              selected: camp.targetGoal,
              processed: 0,
              added: 0,
              notAdded: 0,
              pending: camp.targetGoal,
              progressPercentage: 0
            };

            const firstPendingBatch = camp.batches?.find(b => b.status !== 'CONCLUIDO') || camp.batches?.[0];

            return (
              <Card key={camp.id} className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{camp.name}</h3>
                      <Badge variant={camp.status === 'EM_ANDAMENTO' ? 'em_andamento' : camp.status === 'CONCLUIDA' ? 'concluido' : 'pendente'}>
                        {camp.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>Origem: <strong>{camp.sourceGroup?.name || 'Todos os contatos'}</strong></span>
                      {camp.destinationGroup && (
                        <span>• Destino: <strong>{camp.destinationGroup.name}</strong></span>
                      )}
                      <span>• Lotes: <strong>{camp.batches?.length || 0}</strong> ({camp.batchSize} por lote)</span>
                      <span>• Criada em: {new Date(camp.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleStatus(camp)}
                      className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                      title={camp.status === 'EM_ANDAMENTO' ? 'Pausar campanha' : 'Iniciar campanha'}
                    >
                      {camp.status === 'EM_ANDAMENTO' ? <PauseCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                    </button>

                    <button
                      onClick={() => handleDeleteCampaign(camp.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Excluir campanha"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>

                    {firstPendingBatch && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onOpenBatchRunner(firstPendingBatch.id)}
                        icon={<Play className="w-3.5 h-3.5 fill-white" />}
                      >
                        Abrir Lote {firstPendingBatch.batchNumber}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Métricas e Barra de Progresso */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-4 text-center">
                  <div className="bg-slate-50 rounded-lg p-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Selecionados</span>
                    <p className="text-lg font-black text-slate-800">{stats.selected}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Processados</span>
                    <p className="text-lg font-black text-blue-600">{stats.processed}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Adicionados</span>
                    <p className="text-lg font-black text-emerald-600">{stats.added}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Não Adicionados</span>
                    <p className="text-lg font-black text-rose-600">{stats.notAdded}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Pendentes</span>
                    <p className="text-lg font-black text-amber-600">{stats.pending}</p>
                  </div>
                </div>

                <div className="mt-2">
                  <ProgressBar
                    percentage={stats.progressPercentage}
                    label="Progresso da Campanha"
                    sublabel={`${stats.progressPercentage}% concluído (${stats.processed}/${stats.selected})`}
                    color={stats.progressPercentage === 100 ? 'emerald' : 'blue'}
                  />
                </div>

                {/* Lista compacta de lotes da campanha */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-700 block mb-2">Lotes da Campanha:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {camp.batches?.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => onOpenBatchRunner(b.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] ${
                          b.status === 'CONCLUIDO'
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                            : b.status === 'EM_ANDAMENTO'
                            ? 'bg-blue-50/80 border-blue-300 text-blue-900 ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>Lote {String(b.batchNumber).padStart(2, '0')}</span>
                          {b.status === 'CONCLUIDO' && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {b.contacts?.length || b.targetSize} contatos
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 16. CONFIGURAÇÃO DO LOTE — Modal de Criação */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Criar Nova Campanha de Lotes"
        subtitle="Selecione origem, destino e defina o particionamento em lotes"
      >
        <div className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nome da Campanha</label>
            <input
              type="text"
              placeholder="Ex: Ofertas VIP"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Grupo de Origem</label>
              <select
                value={sourceGroupId}
                onChange={(e) => setSourceGroupId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Todos os contatos da base</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Grupo Destino (Opcional)</label>
              <select
                value={destinationGroupId}
                onChange={(e) => setDestinationGroupId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Nenhum (Apenas organizar)</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Quantidade Total de Contatos Alvo
            </label>
            <input
              type="number"
              min={10}
              max={5000}
              value={targetQuantity}
              onChange={(e) => setTargetQuantity(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Contatos duplicados ou já presentes no destino serão ignorados automaticamente.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tamanho do Lote (Recomendado para segurança)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[20, 30, 50, 100].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => {
                    setBatchSize(sz);
                    setCustomBatchSize('');
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition-all border ${
                    batchSize === sz && !customBatchSize
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {sz}
                </button>
              ))}

              <input
                type="number"
                placeholder="Outro"
                value={customBatchSize}
                onChange={(e) => setCustomBatchSize(e.target.value)}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center border focus:outline-none ${
                  customBatchSize
                    ? 'border-blue-600 ring-2 ring-blue-500/20'
                    : 'border-slate-200'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Intervalo Programado entre Lotes</span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                Blindagem Antispam
              </span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[15, 30, 45, 60].map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => {
                    setIntervalMinutes(min);
                    setCustomInterval('');
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition-all border ${
                    intervalMinutes === min && !customInterval
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {min}m
                </button>
              ))}

              <input
                type="number"
                placeholder="Outro"
                value={customInterval}
                onChange={(e) => setCustomInterval(e.target.value)}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center border focus:outline-none ${
                  customInterval
                    ? 'border-emerald-600 ring-2 ring-emerald-500/20'
                    : 'border-slate-200'
                }`}
              />
            </div>
          </div>

          {/* Prévia da divisão e cadência de lotes */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 space-y-1">
            <span className="font-bold block">Cadência Inteligente Programada:</span>
            <p>
              Com {targetQuantity} contatos e lotes de <strong>{customBatchSize || batchSize}</strong> a cada <strong>{customInterval || intervalMinutes} minutos</strong>:
            </p>
            <p className="font-semibold text-blue-700">
              ➔ Serão gerados {Math.ceil(targetQuantity / (parseInt(customBatchSize, 10) || batchSize))} lotes com temporizador de cadência automático.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateCampaign}
              isLoading={isSubmitting}
            >
              Criar Lotes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
