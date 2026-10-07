import React from 'react';
import { ShieldCheck, Plus, LogOut } from 'lucide-react';
import { Button } from '../common/Button';

interface NavbarProps {
  onOpenNewCampaignModal: () => void;
  title: string;
  user?: { id: string; name: string; email: string } | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNewCampaignModal,
  title,
  user,
  onLogout
}) => {
  const userName = user?.name || 'Administrador';
  const userEmail = user?.email || 'admin@grupoleads.com';
  const initials = userName
    .split(' ')
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 sticky top-0 z-30">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs text-slate-600 font-medium border border-slate-200/60">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Extensão Manifest V3 Conectada</span>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={onOpenNewCampaignModal}
          icon={<Plus className="w-4 h-4" />}
        >
          Criar Campanha
        </Button>

        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs border border-blue-200">
            {initials}
          </div>
          <div className="hidden sm:block text-left text-xs">
            <p className="font-semibold text-slate-900 leading-tight">{userName}</p>
            <p className="text-[10px] text-slate-500">{userEmail}</p>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
              title="Sair da conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
