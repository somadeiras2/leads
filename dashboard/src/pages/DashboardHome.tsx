import React from 'react';
import {
  Users,
  UserCheck,
  FolderKanban,
  UserPlus,
  Layers,
  Clock,
  Play,
  ArrowRight,
  TrendingUp,
  PieChart as PieIcon,
  BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { DashboardStatsDTO } from '@grupoleads/shared';

interface DashboardHomeProps {
  stats: DashboardStatsDTO | null;
  isLoading: boolean;
  onNavigateToCampaign: (campaignId: string) => void;
  onNavigateTab: (tab: any) => void;
  onDismissCampaignPrompt: () => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  stats,
  isLoading,
  onNavigateToCampaign,
  onNavigateTab,
  onDismissCampaignPrompt
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const safeStats: DashboardStatsDTO = stats || {
    totalContacts: 0,
    uniqueContacts: 0,
    totalGroups: 0,
    newContacts: 0,
    activeCampaigns: 0,
    pendingBatches: 0,
    contactsByGroup: [],
    contactsGrowth: [],
    contactsByStatus: [],
    campaignPerformance: []
  };

  const kpis = [
    {
      title: 'CONTATOS TOTAIS',
      value: safeStats.totalContacts.toLocaleString('pt-BR'),
      change: 'Base consolidada',
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      title: 'CONTATOS ÚNICOS',
      value: (safeStats.uniqueContacts || 0).toLocaleString('pt-BR'),
      change: 'Deduplicados',
      icon: UserCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    {
      title: 'GRUPOS',
      value: (safeStats.totalGroups || 0).toLocaleString('pt-BR'),
      change: 'Origem mapeada',
      icon: FolderKanban,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50'
    },
    {
      title: 'NOVOS',
      value: (safeStats.newContacts || 0).toLocaleString('pt-BR'),
      change: 'Aguardando ação',
      icon: UserPlus,
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    },
    {
      title: 'CAMPANHAS',
      value: (safeStats.activeCampaigns || 0).toLocaleString('pt-BR'),
      change: 'Ativas no momento',
      icon: Layers,
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
    {
      title: 'LOTES PENDENTES',
      value: (safeStats.pendingBatches || 0).toLocaleString('pt-BR'),
      change: 'Prontos para revisão',
      icon: Clock,
      color: 'text-rose-600',
      bg: 'bg-rose-50'
    }
  ];

  return (
    <div className="space-y-6">
      {/* 24. CONTINUIDADE: Banner de Campanha em Andamento */}
      {safeStats.activeCampaignPrompt && (
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
              <Play className="w-6 h-6 text-white fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20">
                  Continuidade Ativa
                </span>
                <span className="text-xs text-blue-100">
                  {safeStats.activeCampaignPrompt.pendingBatchesCount} lotes restantes
                </span>
              </div>
              <h2 className="text-lg font-bold mt-1">
                Você possui uma campanha em andamento: “{safeStats.activeCampaignPrompt.campaignName}”
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Continue o trabalho de revisão e inclusão manual exatamente de onde parou.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onDismissCampaignPrompt}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
            >
              Encerrar Campanha
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigateToCampaign(safeStats.activeCampaignPrompt!.campaignId)}
              className="bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow-md"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Continuar Lote
            </Button>
          </div>
        </div>
      )}

      {/* Grid de KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {kpi.title}
                </span>
                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                  <Icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
                {kpi.value}
              </div>
              <div className="mt-1 text-[11px] text-slate-500 font-medium">
                {kpi.change}
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráficos Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico: Crescimento de Contatos */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Crescimento de Contatos</span>
            </div>
          }
          subtitle="Evolução da base de dados organizada nos últimos dias"
        >
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={safeStats.contactsGrowth || []}>
                <defs>
                  <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#growthGradient)"
                  name="Contatos"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Gráfico: Contatos por Grupo */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>Contatos por Grupo de Origem</span>
            </div>
          }
          subtitle="Distribuição dos contatos coletados pelos grupos"
        >
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={safeStats.contactsByGroup || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="groupName"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(val) => (val.length > 12 ? val.slice(0, 10) + '...' : val)}
                />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} name="Contatos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Gráfico: Desempenho das Campanhas */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Desempenho das Campanhas de Lotes</span>
          </div>
        }
        subtitle="Registro manual do progresso: adicionados, não adicionados e pendentes"
      >
        <div className="h-64 w-full pt-2">
          {(safeStats.campaignPerformance || []).length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={safeStats.campaignPerformance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(val) => (val.length > 15 ? val.slice(0, 13) + '...' : val)}
                />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="added" fill="#10b981" name="Adicionados" stackId="a" />
                <Bar dataKey="notAdded" fill="#f43f5e" name="Não Adicionados" stackId="a" />
                <Bar dataKey="pending" fill="#cbd5e1" name="Pendentes" stackId="a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
              <Layers className="w-8 h-8 mb-2 opacity-50" />
              <span>Nenhuma campanha criada ainda. Crie sua primeira campanha para ver o desempenho!</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
