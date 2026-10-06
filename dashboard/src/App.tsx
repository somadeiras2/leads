import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { DashboardHome } from './pages/DashboardHome';
import { ContactsCRM } from './pages/ContactsCRM';
import { GroupsView } from './pages/GroupsView';
import { CampaignsView } from './pages/CampaignsView';
import { BatchRunnerView } from './pages/BatchRunnerView';
import { ImportExportView } from './pages/ImportExportView';
import { HistoryView } from './pages/HistoryView';
import { SettingsView } from './pages/SettingsView';
import { LeadsApi } from './services/api';
import { DashboardStatsDTO } from '@grupoleads/shared';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [stats, setStats] = useState<DashboardStatsDTO | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  // Estados para navegação profunda entre páginas
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [campaignPrefillContactIds, setCampaignPrefillContactIds] = useState<string[]>([]);
  const [campaignPrefillGroupId, setCampaignPrefillGroupId] = useState<string | undefined>();

  const fetchStats = async () => {
    setIsStatsLoading(true);
    try {
      const data = await LeadsApi.getStats();
      setStats(data);
    } catch (err) {
      console.error('Erro ao buscar estatísticas do dashboard:', err);
    } finally {
      setIsStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleTriggerDemo = async () => {
    setIsDemoLoading(true);
    try {
      await LeadsApi.triggerDemoMode();
      await fetchStats();
      alert('Modo Demonstração carregado com sucesso! 500 contatos, 5 grupos, 3 campanhas e 10 lotes foram gerados.');
      setActiveTab('dashboard');
    } catch (err: any) {
      alert('Erro ao carregar dados demo: ' + (err.message || ''));
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleNavigateToCampaign = (campaignId: string) => {
    // Busca a campanha e abre seu primeiro lote
    LeadsApi.getCampaign(campaignId).then((camp) => {
      const pendingBatch = camp.batches?.find(b => b.status !== 'CONCLUIDO') || camp.batches?.[0];
      if (pendingBatch) {
        setActiveBatchId(pendingBatch.id);
        setActiveTab('batches');
      } else {
        setActiveTab('campaigns');
      }
    });
  };

  const handleDismissPrompt = () => {
    if (stats) {
      setStats({ ...stats, activeCampaignPrompt: null });
    }
  };

  const titles: Record<NavTab, string> = {
    dashboard: 'Visão Geral & Métricas',
    crm: 'Contatos & Gestão CRM',
    groups: 'Grupos Mapeados',
    campaigns: 'Gerenciador de Campanhas',
    batches: 'Execução de Lote & Ação Manual',
    'import-export': 'Importação & Exportação',
    history: 'Histórico de Atividades',
    settings: 'Configurações & Privacidade'
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar Fixo */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'batches') setActiveBatchId(null);
        }}
        onTriggerDemo={handleTriggerDemo}
        isDemoLoading={isDemoLoading}
      />

      {/* Conteúdo Principal com Scroll */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Navbar
          title={titles[activeTab]}
          onOpenNewCampaignModal={() => {
            setCampaignPrefillContactIds([]);
            setCampaignPrefillGroupId(undefined);
            setIsCampaignModalOpen(true);
            setActiveTab('campaigns');
          }}
        />

        <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <DashboardHome
              stats={stats}
              isLoading={isStatsLoading}
              onNavigateToCampaign={handleNavigateToCampaign}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onDismissCampaignPrompt={handleDismissPrompt}
            />
          )}

          {activeTab === 'crm' && (
            <ContactsCRM
              onOpenCreateCampaignWithContacts={(contactIds) => {
                setCampaignPrefillContactIds(contactIds);
                setCampaignPrefillGroupId(undefined);
                setIsCampaignModalOpen(true);
                setActiveTab('campaigns');
              }}
            />
          )}

          {activeTab === 'groups' && (
            <GroupsView
              onOpenCreateCampaignForGroup={(groupId) => {
                setCampaignPrefillGroupId(groupId);
                setCampaignPrefillContactIds([]);
                setIsCampaignModalOpen(true);
                setActiveTab('campaigns');
              }}
              onFilterContactsByGroup={(groupId) => {
                setActiveTab('crm');
              }}
              onExportGroup={(groupId) => {
                setActiveTab('import-export');
              }}
            />
          )}

          {activeTab === 'campaigns' && (
            <CampaignsView
              onOpenBatchRunner={(batchId) => {
                setActiveBatchId(batchId);
                setActiveTab('batches');
              }}
              isCreateModalOpen={isCampaignModalOpen}
              setIsCreateModalOpen={setIsCampaignModalOpen}
              initialContactIds={campaignPrefillContactIds}
              initialGroupId={campaignPrefillGroupId}
            />
          )}

          {activeTab === 'batches' && activeBatchId && (
            <BatchRunnerView
              batchId={activeBatchId}
              onBack={() => setActiveTab('campaigns')}
              onNavigateToBatch={(nextId) => setActiveBatchId(nextId)}
            />
          )}

          {activeTab === 'import-export' && <ImportExportView />}

          {activeTab === 'history' && <HistoryView />}

          {activeTab === 'settings' && (
            <SettingsView
              onTriggerDemo={handleTriggerDemo}
              isDemoLoading={isDemoLoading}
            />
          )}
        </main>
      </div>
    </div>
  );
};
