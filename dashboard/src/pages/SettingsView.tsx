import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  CheckCircle,
  Database,
  Sliders,
  Sparkles,
  Save,
  Lock
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LeadsApi } from '../services/api';
import { UserSettingsDTO } from '@grupoleads/shared';

interface SettingsViewProps {
  onTriggerDemo: () => void;
  isDemoLoading: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onTriggerDemo, isDemoLoading }) => {
  const [settings, setSettings] = useState<UserSettingsDTO>({
    ignoreFirstN: 100,
    ignoreAdmins: true,
    ignoreDuplicates: true,
    ignoreAlreadyRegistered: true,
    ignoreAlreadyInDestination: true,
    ignoreWithoutIdentifier: true,
    defaultBatchSize: 50,
    demoModeActive: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await LeadsApi.getSettings();
        setSettings(data);
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMsg('');
    try {
      await LeadsApi.updateSettings(settings);
      setSuccessMsg('Configurações salvas com sucesso!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 font-medium">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filtros Padrão de Coleta */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            <span>Filtros Padrão de Coleta</span>
          </div>
        }
        subtitle="Regras aplicadas por padrão na extensão do Chrome"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Ignorar Primeiros Contatos
              </label>
              <input
                type="number"
                min={0}
                max={500}
                value={settings.ignoreFirstN}
                onChange={(e) => setSettings({ ...settings, ignoreFirstN: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Útil para não incluir donos e administradores que frequentemente estão no topo da listagem.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tamanho Padrão do Lote
              </label>
              <input
                type="number"
                min={5}
                max={200}
                value={settings.defaultBatchSize}
                onChange={(e) => setSettings({ ...settings, defaultBatchSize: parseInt(e.target.value, 10) || 50 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Tamanho padrão sugerido ao criar novas campanhas (recomendado: 25 a 50).
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.ignoreAdmins}
                onChange={(e) => setSettings({ ...settings, ignoreAdmins: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">☑ Ignorar administradores do grupo</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.ignoreDuplicates}
                onChange={(e) => setSettings({ ...settings, ignoreDuplicates: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">☑ Ignorar números duplicados na mesma coleta</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.ignoreAlreadyRegistered}
                onChange={(e) => setSettings({ ...settings, ignoreAlreadyRegistered: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">☑ Ignorar contatos já cadastrados no CRM</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.ignoreAlreadyInDestination}
                onChange={(e) => setSettings({ ...settings, ignoreAlreadyInDestination: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">☑ Ignorar contatos já presentes no grupo de destino</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.ignoreWithoutIdentifier}
                onChange={(e) => setSettings({ ...settings, ignoreWithoutIdentifier: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">☑ Ignorar contatos sem telefone ou identificador disponível</span>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button
              variant="primary"
              size="md"
              onClick={handleSave}
              isLoading={isSaving}
              icon={<Save className="w-4 h-4" />}
            >
              Salvar Preferências
            </Button>
          </div>
        </div>
      </Card>

      {/* 31. DECLARAÇÃO DE PRIVACIDADE E SEGURANÇA */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Privacidade, Ética & Segurança (WhatsApp)</span>
          </div>
        }
        subtitle="Termos técnicos de conformidade do GRUPOLEADS"
      >
        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p className="font-semibold text-slate-900">
            O GRUPOLEADS foi projetado desde sua concepção para manter total respeito aos termos de serviço e à integridade da plataforma:
          </p>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 font-medium">
            <li className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Não coletamos mensagens de texto</span>
            </li>
            <li className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Não coletamos conteúdo de conversas ou mídias</span>
            </li>
            <li className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Não enviamos mensagens automáticas</span>
            </li>
            <li className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Não realizamos disparos em massa</span>
            </li>
            <li className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Não tentamos burlar bloqueios ou CAPTCHAs</span>
            </li>
            <li className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Não contornamos mecanismos antispam</span>
            </li>
          </ul>

          <p className="pt-2 text-slate-500">
            A ferramenta serve estritamente para <strong>organização, deduplicação e gerenciamento manual</strong> de contatos legítimos que o usuário possui autorização e acesso em grupos.
          </p>
        </div>
      </Card>

      {/* Modo Demonstração & Banco de Dados */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            <span>Banco de Dados & Modo Demonstração</span>
          </div>
        }
        subtitle="Carregue dados simulados para testes de carga e demonstração do sistema"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-800">Gerar Massa de Testes (500 Contatos)</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Popula o banco com 500 contatos brasileiros, 5 grupos, 3 campanhas e 10 lotes completos.
            </p>
          </div>
          <Button
            variant="secondary"
            size="md"
            onClick={onTriggerDemo}
            isLoading={isDemoLoading}
            icon={<Sparkles className="w-4 h-4 text-amber-400" />}
          >
            Carregar Modo Demo
          </Button>
        </div>
      </Card>
    </div>
  );
};
