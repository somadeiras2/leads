import React from 'react';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Layers,
  ArrowUpDown,
  History,
  Settings,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { Logo } from '../common/Logo';

export type NavTab = 'dashboard' | 'crm' | 'groups' | 'campaigns' | 'batches' | 'import-export' | 'history' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onTriggerDemo?: () => void;
  isDemoLoading?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'crm' as NavTab, label: 'Contatos & CRM', icon: Users },
    { id: 'groups' as NavTab, label: 'Meus Grupos', icon: FolderKanban },
    { id: 'campaigns' as NavTab, label: 'Campanhas & Lotes', icon: Layers },
    { id: 'import-export' as NavTab, label: 'Importar / Exportar', icon: ArrowUpDown },
    { id: 'history' as NavTab, label: 'Histórico & Coletas', icon: History },
    { id: 'settings' as NavTab, label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 h-screen sticky top-0">
      {/* Topo / Logo */}
      <div className="p-6 border-b border-slate-100">
        <Logo size="md" showSlogan={true} />
      </div>

      {/* Menu Principal */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Menu Principal
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id || (activeTab === 'batches' && item.id === 'campaigns');

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm shadow-blue-500/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Seção Inferior: Compliance Ético */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-emerald-50/80 border border-emerald-100 text-[11px] text-emerald-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>100% Ético & Seguro (Sem spam ou disparos)</span>
        </div>
      </div>
    </aside>
  );
};
