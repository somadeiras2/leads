import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  CheckCircle,
  Database,
  Sliders,
  Sparkles,
  Save,
  Lock,
  User as UserIcon,
  UserPlus,
  Trash2,
  KeyRound,
  Mail,
  Users
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LeadsApi } from '../services/api';
import { UserSettingsDTO } from '@grupoleads/shared';

interface SettingsViewProps {
  currentUser?: { id: string; name: string; email: string } | null;
  onUpdateCurrentUser?: (user: { id: string; name: string; email: string }) => void;
  onTriggerDemo?: () => void;
  isDemoLoading?: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onUpdateCurrentUser,
  onTriggerDemo,
  isDemoLoading = false
}) => {
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

  // Estados para edição do perfil e senha do usuário logado
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profileEmail, setProfileEmail] = useState(currentUser?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // Estados para gerenciamento de usuários adicionais
  const [usersList, setUsersList] = useState<Array<{ id: string; name: string; email: string; createdAt: string; _count?: any }>>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userAdminMsg, setUserAdminMsg] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name);
      setProfileEmail(currentUser.email);
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const data = await LeadsApi.getUsers();
      setUsersList(data);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

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
    fetchUsers();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMsg('');
    try {
      await LeadsApi.updateSettings(settings);
      setSuccessMsg('Configurações de coleta salvas com sucesso!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setIsUpdatingProfile(true);

    try {
      const res = await LeadsApi.updateProfile({
        name: profileName,
        email: profileEmail,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined
      });

      if (res.user) {
        localStorage.setItem('grupoleads_user', JSON.stringify(res.user));
        if (res.token) {
          localStorage.setItem('grupoleads_token', res.token);
        }
        if (onUpdateCurrentUser) {
          onUpdateCurrentUser(res.user);
        }
      }

      setProfileMsg({ text: 'Perfil e senha alterados com sucesso!' });
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setProfileMsg(null), 4000);
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Erro ao atualizar dados.';
      setProfileMsg({ text: msg, error: true });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserAdminMsg(null);

    if (!newUserName || !newUserEmail || !newUserPassword) {
      setUserAdminMsg({ text: 'Preencha todos os campos para criar o usuário.', error: true });
      return;
    }

    setIsCreatingUser(true);
    try {
      await LeadsApi.createAdminUser({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword
      });

      setUserAdminMsg({ text: `Usuário "${newUserName}" criado com sucesso!` });
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      fetchUsers();
      setTimeout(() => setUserAdminMsg(null), 4000);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Erro ao criar usuário.';
      setUserAdminMsg({ text: msg, error: true });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o acesso de "${name}"?`)) return;

    try {
      await LeadsApi.deleteUser(id);
      setUserAdminMsg({ text: `Usuário removido com sucesso!` });
      fetchUsers();
      setTimeout(() => setUserAdminMsg(null), 3000);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Erro ao remover usuário.';
      alert(msg);
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
    <div className="space-y-6 max-w-4xl pb-12">
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 font-medium">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* SEÇÃO 1: MINHA CONTA & ALTERAÇÃO DE SENHA */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-blue-600" />
            <span>Minha Conta & Alteração de Senha</span>
          </div>
        }
        subtitle="Altere seu nome, e-mail de login e senha de acesso ao painel"
      >
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          {profileMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                profileMsg.error
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              {profileMsg.error ? null : <CheckCircle className="w-4 h-4 text-emerald-600" />}
              <span>{profileMsg.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nome de Exibição
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                E-mail de Login
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
              Alterar Senha de Acesso
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nova Senha (deixe em branco para manter a atual)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite nova senha"
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Senha Atual (obrigatório apenas se for alterar)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Sua senha atual"
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isUpdatingProfile}
              icon={<Save className="w-4 h-4" />}
            >
              Salvar Alterações de Acesso
            </Button>
          </div>
        </form>
      </Card>

      {/* SEÇÃO 2: GERENCIAMENTO DE USUÁRIOS & CRIAÇÃO DE NOVAS CONTAS */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>Gerenciamento de Contas & Usuários</span>
          </div>
        }
        subtitle="Crie e gerencie contas adicionais diretamente de dentro do seu painel administrativo"
      >
        <div className="space-y-6">
          {userAdminMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                userAdminMsg.error
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              {userAdminMsg.error ? null : <CheckCircle className="w-4 h-4 text-emerald-600" />}
              <span>{userAdminMsg.text}</span>
            </div>
          )}

          {/* Formulário: Criar Nova Conta */}
          <form onSubmit={handleCreateNewUser} className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              <span>Criar Novo Usuário</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome do operador"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  placeholder="operador@grupoleads.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Senha Provisória
                </label>
                <input
                  type="password"
                  required
                  placeholder="Senha de acesso"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                isLoading={isCreatingUser}
                icon={<UserPlus className="w-3.5 h-3.5 text-indigo-600" />}
              >
                Cadastrar Usuário
              </Button>
            </div>
          </form>

          {/* Listagem de Usuários Cadastrados */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Usuários com Acesso ({usersList.length})
            </h4>

            {isLoadingUsers ? (
              <div className="py-6 text-center text-xs text-slate-400">Carregando usuários...</div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {usersList.map((u) => {
                  const isCurrent = currentUser?.id === u.id || currentUser?.email === u.email;

                  return (
                    <div key={u.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                          {u.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-900">{u.name}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">
                                Você
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500">{u.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Excluir usuário"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* SEÇÃO 3: FILTROS PADRÃO DE COLETA */}
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
              Salvar Preferências de Coleta
            </Button>
          </div>
        </div>
      </Card>

      {/* SEÇÃO 4: CONFORMIDADE & SEGURANÇA */}
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
    </div>
  );
};
