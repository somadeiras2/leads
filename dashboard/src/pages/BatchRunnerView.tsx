import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  UserCheck,
  Check,
  Trash2,
  Copy,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Phone,
  Clock,
  Play,
  Pause,
  RotateCcw,
  CheckCheck
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ProgressBar } from '../components/common/ProgressBar';
import { LeadsApi } from '../services/api';
import { BatchDTO, BatchContactDTO } from '@grupoleads/shared';

interface BatchRunnerViewProps {
  batchId: string;
  onBack: () => void;
  onNavigateToBatch: (batchId: string) => void;
}

export const BatchRunnerView: React.FC<BatchRunnerViewProps> = ({
  batchId,
  onBack,
  onNavigateToBatch
}) => {
  const [batch, setBatch] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPendingOnly, setFilterPendingOnly] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Estado de confirmação do lote
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());

  // Temporizador de Cadência (ex: 30 minutos)
  const defaultIntervalMinutes = 30;
  const [cadenceMinutes, setCadenceMinutes] = useState(defaultIntervalMinutes);
  const [timeLeft, setTimeLeft] = useState(defaultIntervalMinutes * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, timeLeft]);

  const handleResetTimer = (minutes?: number) => {
    const mins = minutes || cadenceMinutes;
    setCadenceMinutes(mins);
    setTimeLeft(mins * 60);
    setIsTimerRunning(false);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleCopyAllBatchPhones = () => {
    if (!batch?.contacts || batch.contacts.length === 0) return;
    const phones = batch.contacts
      .map((c: any) => c.contact?.phone)
      .filter(Boolean)
      .join(', ');

    navigator.clipboard.writeText(phones);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 3000);
  };

  const fetchBatch = async () => {
    setIsLoading(true);
    try {
      const data = await LeadsApi.getBatch(batchId);
      setBatch(data);
      if (data && data.contacts) {
        // Se já tiver contatos processados, considera confirmado
        const anyProcessed = data.contacts.some((c: any) => c.status !== 'PENDENTE');
        if (anyProcessed) setIsConfirmed(true);
      }
    } catch (err) {
      console.error('Erro ao carregar lote:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatch();
  }, [batchId]);

  const handleUpdateStatus = async (contactId: string, status: string) => {
    try {
      await LeadsApi.updateBatchContactStatus(contactId, status);
      fetchBatch();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const handleBulkStatus = async (status: string) => {
    if (!batch?.contacts) return;
    const targetContacts = selectedContactIds.size > 0
      ? batch.contacts.filter((c: any) => selectedContactIds.has(c.id))
      : batch.contacts.filter((c: any) => c.status === 'PENDENTE');

    if (targetContacts.length === 0) return;

    try {
      await LeadsApi.bulkUpdateBatch(
        batch.id,
        targetContacts.map((c: any) => ({ id: c.id, status }))
      );
      setSelectedContactIds(new Set());
      fetchBatch();
    } catch (err) {
      console.error('Erro ao processar em massa:', err);
    }
  };

  const handleRemoveContact = async (contactId: string) => {
    if (!confirm('Deseja remover este contato do lote?')) return;
    try {
      await LeadsApi.removeBatchContact(contactId);
      fetchBatch();
    } catch (err) {
      console.error('Erro ao remover contato do lote:', err);
    }
  };

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(`+${phone}`);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const handleNextBatch = async () => {
    if (!batch) return;
    try {
      const next = await LeadsApi.getNextBatch(batch.campaignId, batch.batchNumber);
      if (next) {
        onNavigateToBatch(next.id);
      } else {
        alert('Parabéns! Todos os lotes desta campanha foram concluídos.');
        onBack();
      }
    } catch (err) {
      console.error('Erro ao buscar próximo lote:', err);
    }
  };

  if (isLoading || !batch) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const contactsList: BatchContactDTO[] = (batch.contacts || []).filter((c: BatchContactDTO) => {
    if (filterPendingOnly) return c.status === 'PENDENTE';
    return true;
  });

  const stats = batch.stats || {
    total: batch.contacts?.length || 0,
    processed: 0,
    added: 0,
    notAdded: 0,
    pending: batch.contacts?.length || 0,
    error: 0,
    alreadyInGroup: 0,
    isCompleted: false
  };

  return (
    <div className="space-y-6">
      {/* Topo com Navegação e Título do Lote */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
            Voltar
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                LOTE {String(batch.batchNumber).padStart(2, '0')}
              </h2>
              <span className="text-sm font-semibold text-slate-500">
                — {stats.total} contatos
              </span>
              <Badge variant={stats.isCompleted ? 'concluido' : 'em_andamento'}>
                {stats.isCompleted ? 'Concluído' : 'Em Andamento'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Campanha: <strong>{batch.campaign?.name}</strong> • Origem: {batch.campaign?.sourceGroup?.name || 'Base Geral'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={() => window.open('https://web.whatsapp.com', '_blank')}
            icon={<ExternalLink className="w-4 h-4 text-emerald-600" />}
          >
            Abrir no WhatsApp Web
          </Button>

          {!isConfirmed ? (
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsConfirmed(true)}
              icon={<Check className="w-4 h-4" />}
            >
              Confirmar Lote e Iniciar
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="md"
              onClick={handleNextBatch}
              icon={<ChevronRight className="w-4 h-4" />}
            >
              Próximo Lote
            </Button>
          )}
        </div>
      </div>

      {/* 20. RESULTADO DO LOTE — Cartão de Estatísticas */}
      <Card className="p-5">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center mb-4">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Selecionados</span>
            <p className="text-xl font-black text-slate-900">{stats.total}</p>
          </div>
          <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-100">
            <span className="text-[11px] font-bold text-blue-600 uppercase">Processados</span>
            <p className="text-xl font-black text-blue-700">{stats.processed}</p>
          </div>
          <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-100">
            <span className="text-[11px] font-bold text-emerald-600 uppercase">Adicionados</span>
            <p className="text-xl font-black text-emerald-700">{stats.added}</p>
          </div>
          <div className="bg-rose-50/60 rounded-xl p-3 border border-rose-100">
            <span className="text-[11px] font-bold text-rose-600 uppercase">Não Adicionados</span>
            <p className="text-xl font-black text-rose-700">{stats.notAdded}</p>
          </div>
          <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-100">
            <span className="text-[11px] font-bold text-amber-600 uppercase">Pendentes</span>
            <p className="text-xl font-black text-amber-700">{stats.pending}</p>
          </div>
        </div>

        <ProgressBar
          percentage={stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0}
          label="Progresso deste Lote"
          sublabel={`${stats.processed} de ${stats.total} contatos revisados (${stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0}%)`}
          color={stats.isCompleted ? 'emerald' : 'blue'}
        />

        {stats.isCompleted && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span><strong>Lote concluído com sucesso!</strong> Todos os {stats.total} contatos foram processados.</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setFilterPendingOnly(false)}>
                Ver Todos
              </Button>
              <Button variant="success" size="sm" onClick={handleNextBatch} icon={<ChevronRight className="w-4 h-4" />}>
                Próximo Lote
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* CADÊNCIA PROGRAMADA & COPIAR EM MASSA */}
      <Card className="p-4 bg-gradient-to-r from-blue-50/60 via-indigo-50/30 to-purple-50/40 border-blue-200/80">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-2xl ${timeLeft === 0 ? 'bg-amber-500 text-white animate-bounce' : isTimerRunning ? 'bg-blue-600 text-white animate-pulse' : 'bg-white text-blue-600 border border-blue-200'}`}>
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Cadência Inteligente Anti-Bloqueio</h3>
                <Badge variant={timeLeft === 0 ? 'pendente' : isTimerRunning ? 'em_andamento' : 'neutral'}>
                  {timeLeft === 0 ? '⏰ Tempo Esgotado!' : isTimerRunning ? 'Em Contagem' : 'Pausado'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Processe este lote de {stats.total} contatos no WhatsApp e aguarde o intervalo de segurança para o próximo.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
            {/* Temporizador Display */}
            <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-sm">
              <span className="font-mono text-lg font-black text-slate-800 tracking-wider">
                {formatTimer(timeLeft)}
              </span>
              <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                {!isTimerRunning ? (
                  <button
                    onClick={() => setIsTimerRunning(true)}
                    className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                    title="Iniciar Temporizador"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setIsTimerRunning(false)}
                    className="p-1 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                    title="Pausar Temporizador"
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleResetTimer(30)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Reiniciar (30m)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Presets de Intervalo */}
            <div className="flex items-center gap-1 bg-white/80 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => handleResetTimer(15)}
                className={`px-2 py-1 rounded-lg transition-colors ${cadenceMinutes === 15 ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                15m
              </button>
              <button
                onClick={() => handleResetTimer(30)}
                className={`px-2 py-1 rounded-lg transition-colors ${cadenceMinutes === 30 ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                30m
              </button>
              <button
                onClick={() => handleResetTimer(45)}
                className={`px-2 py-1 rounded-lg transition-colors ${cadenceMinutes === 45 ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                45m
              </button>
            </div>

            {/* Botão de Copiar Todos os Telefones do Lote */}
            <Button
              variant={copiedAll ? 'success' : 'primary'}
              size="sm"
              onClick={handleCopyAllBatchPhones}
              icon={copiedAll ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            >
              {copiedAll ? 'Números Copiados!' : `Copiar Todos os ${stats.total} Números`}
            </Button>
          </div>
        </div>
      </Card>

      {/* 19. CONTROLE MANUAL — Barra de Ações Rápidas em Lote */}
      {isConfirmed && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Registrar Ação Manual em Lote:</span>
            {selectedContactIds.size > 0 && (
              <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">
                {selectedContactIds.size} selecionados
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="success"
              size="sm"
              onClick={() => handleBulkStatus('ADICIONADO')}
              icon={<CheckCircle className="w-4 h-4" />}
            >
              Marcar como Adicionado
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleBulkStatus('NAO_ADICIONADO')}
              icon={<XCircle className="w-4 h-4" />}
            >
              Não Adicionado
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkStatus('JA_NO_GRUPO')}
              icon={<UserCheck className="w-4 h-4" />}
            >
              Já Estava no Grupo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterPendingOnly(!filterPendingOnly)}
            >
              {filterPendingOnly ? 'Ver Todos' : 'Ver Apenas Pendentes'}
            </Button>
          </div>
        </div>
      )}

      {/* Assistente Conectado ao WhatsApp Web */}
      <div className="p-4 bg-emerald-50 rounded-xl text-xs text-emerald-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-emerald-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-3 w-3 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <div>
            <div className="font-bold text-emerald-950 text-sm">Assistente Integrado ao WhatsApp Web Ativo</div>
            <p className="text-emerald-800 mt-0.5">
              Ao abrir o <strong>WhatsApp Web</strong> no navegador, o assistente lateral do <strong>GRUPOLEADS</strong> aparecerá com este lote pronto para você preencher os números na busca com 1 clique e respeitar a cadência anti-bloqueio.
            </p>
          </div>
        </div>
        <Button
          variant="success"
          size="sm"
          onClick={() => window.open('https://web.whatsapp.com', '_blank')}
          icon={<ExternalLink className="w-3.5 h-3.5" />}
        >
          Conectar / Ir para o WhatsApp
        </Button>
      </div>

      {/* Tabela de Contatos do Lote */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) setSelectedContactIds(new Set(contactsList.map(c => c.id)));
                      else setSelectedContactIds(new Set());
                    }}
                    checked={contactsList.length > 0 && selectedContactIds.size === contactsList.length}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Status no Lote</th>
                <th className="px-4 py-3 text-right">Registro Manual / Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contactsList.map((item) => {
                const isSelected = selectedContactIds.has(item.id);
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      item.status === 'ADICIONADO'
                        ? 'bg-emerald-50/20'
                        : item.status === 'NAO_ADICIONADO'
                        ? 'bg-rose-50/20'
                        : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          const next = new Set(selectedContactIds);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          setSelectedContactIds(next);
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {item.contact?.name || 'Contato WhatsApp'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-700">+{item.contact?.phone}</span>
                        <button
                          onClick={() => handleCopyPhone(item.contact?.phone || '')}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                          title="Copiar número"
                        >
                          {copiedPhone === item.contact?.phone ? (
                            <span className="text-[10px] text-emerald-600 font-bold">Copiado!</span>
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {item.contact?.sourceGroup || 'Base de Contatos'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={item.status.toLowerCase() as any}>
                        {item.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleUpdateStatus(item.id, 'ADICIONADO')}
                          className={`p-1.5 rounded-lg transition-colors ${
                            item.status === 'ADICIONADO'
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title="Registrar como Adicionado"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleUpdateStatus(item.id, 'NAO_ADICIONADO')}
                          className={`p-1.5 rounded-lg transition-colors ${
                            item.status === 'NAO_ADICIONADO'
                              ? 'bg-rose-600 text-white'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                          }`}
                          title="Registrar como Não Adicionado"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleUpdateStatus(item.id, 'JA_NO_GRUPO')}
                          className={`p-1.5 rounded-lg transition-colors ${
                            item.status === 'JA_NO_GRUPO'
                              ? 'bg-purple-600 text-white'
                              : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'
                          }`}
                          title="Registrar como Já no Grupo"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleRemoveContact(item.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors ml-1"
                          title="Remover deste lote"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
