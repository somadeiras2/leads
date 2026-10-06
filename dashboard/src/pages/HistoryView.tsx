import React, { useState, useEffect } from 'react';
import { History, Layers, Calendar, ArrowRight } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { LeadsApi } from '../services/api';
import { CollectionHistoryDTO, CampaignDTO } from '@grupoleads/shared';

export const HistoryView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'collections' | 'campaigns'>('collections');
  const [collections, setCollections] = useState<CollectionHistoryDTO[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [cList, campList] = await Promise.all([
          LeadsApi.getCollections(),
          LeadsApi.getCampaigns()
        ]);
        setCollections(cList);
        setCampaigns(campList);
      } catch (err) {
        console.error('Erro ao buscar histórico:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('collections')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'collections'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Histórico de Coletas</span>
        </button>

        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'campaigns'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Histórico de Campanhas</span>
        </button>
      </div>

      {activeTab === 'collections' ? (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Data & Hora</th>
                  <th className="px-6 py-3.5">Grupo</th>
                  <th className="px-6 py-3.5 text-center">Encontrados</th>
                  <th className="px-6 py-3.5 text-center">Novos</th>
                  <th className="px-6 py-3.5 text-center">Duplicados</th>
                  <th className="px-6 py-3.5 text-center">Ignorados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">Carregando histórico...</td>
                  </tr>
                ) : collections.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Nenhuma coleta registrada no histórico.
                    </td>
                  </tr>
                ) : (
                  collections.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80">
                      <td className="px-6 py-3.5 text-xs text-slate-600 font-medium">
                        {new Date(c.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-slate-900">{c.groupName}</td>
                      <td className="px-6 py-3.5 text-center font-bold text-slate-700">{c.totalFound}</td>
                      <td className="px-6 py-3.5 text-center font-bold text-emerald-600">{c.newCount}</td>
                      <td className="px-6 py-3.5 text-center font-bold text-amber-600">{c.duplicatesCount}</td>
                      <td className="px-6 py-3.5 text-center font-bold text-slate-400">{c.ignoredCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Campanha</th>
                  <th className="px-6 py-3.5">Data de Criação</th>
                  <th className="px-6 py-3.5 text-center">Selecionados</th>
                  <th className="px-6 py-3.5 text-center">Lotes</th>
                  <th className="px-6 py-3.5 text-center">Processados</th>
                  <th className="px-6 py-3.5 text-center">Adicionados</th>
                  <th className="px-6 py-3.5 text-center">Pendentes</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">Carregando histórico...</td>
                  </tr>
                ) : campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Nenhuma campanha encontrada no histórico.
                    </td>
                  </tr>
                ) : (
                  campaigns.map((camp) => {
                    const stats = camp.stats || {
                      selected: camp.targetGoal,
                      processed: 0,
                      added: 0,
                      pending: camp.targetGoal
                    };
                    return (
                      <tr key={camp.id} className="hover:bg-slate-50/80">
                        <td className="px-6 py-3.5 font-semibold text-slate-900">{camp.name}</td>
                        <td className="px-6 py-3.5 text-xs text-slate-600">
                          {new Date(camp.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-3.5 text-center font-bold text-slate-700">{stats.selected}</td>
                        <td className="px-6 py-3.5 text-center font-semibold text-slate-600">
                          {camp.batches?.length || 0}
                        </td>
                        <td className="px-6 py-3.5 text-center font-bold text-blue-600">{stats.processed}</td>
                        <td className="px-6 py-3.5 text-center font-bold text-emerald-600">{stats.added}</td>
                        <td className="px-6 py-3.5 text-center font-bold text-amber-600">{stats.pending}</td>
                        <td className="px-6 py-3.5 text-center">
                          <Badge variant={camp.status.toLowerCase() as any}>
                            {camp.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
