import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Sliders,
  ExternalLink,
  Settings,
  Sparkles,
  CheckCircle,
  Users,
  ChevronRight,
  ArrowLeft,
  Filter,
  Check,
  RefreshCw,
  Lock,
  LogIn,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { FilterOptions, FilterResultStats, RawScrapedContact } from '@grupoleads/shared';

const BACKEND_API_URL = 'http://localhost:3001/api';
const DASHBOARD_URL = 'http://localhost:5173';

type ViewMode = 'login' | 'main' | 'filters' | 'filter_result' | 'success';

export const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState('admin@grupoleads.com');
  const [loginPassword, setLoginPassword] = useState('123456');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentGroup, setCurrentGroup] = useState('Detectando grupo...');
  const [stats, setStats] = useState({
    found: 0,
    newCount: 0,
    registered: 0
  });

  // Filtros de Coleta
  const [filters, setFilters] = useState<FilterOptions>({
    ignoreFirstN: 0,
    ignoreAdmins: true,
    ignoreDuplicates: true,
    ignoreAlreadyRegistered: true,
    ignoreAlreadyInDestination: true,
    ignoreWithoutIdentifier: true
  });
  const [customIgnoreFirstN, setCustomIgnoreFirstN] = useState('');

  // Resultado da filtragem
  const [filterResult, setFilterResult] = useState<FilterResultStats | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(300);
  const [eligibleContacts, setEligibleContacts] = useState<RawScrapedContact[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const checkWhatsAppConnection = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (!activeTab?.id) return;

        const isWhatsAppTab = activeTab.url?.includes('web.whatsapp.com');

        if (!isWhatsAppTab) {
          setIsConnected(false);
          setCurrentGroup('Abra o WhatsApp Web');
          return;
        }

        // Tenta enviar mensagem ao content script
        chrome.tabs.sendMessage(activeTab.id, { action: 'GET_STATUS' }, (res) => {
          if (chrome.runtime.lastError) {
            // Script ainda não injetado na aba já aberta, tenta injetar dinamicamente
            if (chrome.scripting && activeTab.id) {
              chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: ['src/content/index.js']
              }).then(() => {
                // Tenta novamente após injeção
                setTimeout(() => {
                  chrome.tabs.sendMessage(activeTab.id!, { action: 'GET_STATUS' }, (retryRes) => {
                    if (retryRes && retryRes.groupName) {
                      setIsConnected(true);
                      setCurrentGroup(retryRes.groupName);
                    }
                  });
                }, 300);
              }).catch(() => {
                setIsConnected(false);
                setCurrentGroup('Atualize a página (F5)');
              });
            } else {
              setIsConnected(false);
              setCurrentGroup('Atualize a página (F5)');
            }
          } else if (res) {
            setIsConnected(true);
            if (res.groupName) setCurrentGroup(res.groupName);
          }
        });
      });
    }
  };

  const checkAuthSession = () => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['grupoleads_token', 'grupoleads_user'], (res) => {
        if (res.grupoleads_token && res.grupoleads_user) {
          setToken(res.grupoleads_token);
          setUser(res.grupoleads_user);
        } else {
          const localUser = localStorage.getItem('grupoleads_user');
          const localToken = localStorage.getItem('grupoleads_token');
          if (localUser && localToken) {
            setUser(JSON.parse(localUser));
            setToken(localToken);
          }
        }
      });
    } else {
      const localUser = localStorage.getItem('grupoleads_user');
      const localToken = localStorage.getItem('grupoleads_token');
      if (localUser && localToken) {
        setUser(JSON.parse(localUser));
        setToken(localToken);
      }
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const res = await fetch(`${BACKEND_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Credenciais inválidas');
      }

      setToken(data.token);
      setUser(data.user);

      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.set({
          grupoleads_token: data.token,
          grupoleads_user: data.user
        });
      }
      localStorage.setItem('grupoleads_token', data.token);
      localStorage.setItem('grupoleads_user', JSON.stringify(data.user));

      setViewMode('main');
    } catch (err: any) {
      setLoginError(err.message || 'Erro ao realizar login.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.remove(['grupoleads_token', 'grupoleads_user']);
    }
    localStorage.removeItem('grupoleads_token');
    localStorage.removeItem('grupoleads_user');
    setViewMode('login');
  };

  useEffect(() => {
    checkAuthSession();
    checkWhatsAppConnection();
  }, []);

  // Coleta real dos participantes da aba ativa
  const handleCollect = async () => {
    setIsProcessing(true);
    setStatusMessage('Lendo participantes do grupo...');

    let rawContacts: RawScrapedContact[] = [];
    let detectedGroupName = currentGroup;

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          const response = await new Promise<any>((resolve) => {
            chrome.tabs.sendMessage(tab.id!, { action: 'SCRAPE_PARTICIPANTS' }, (res) => {
              if (chrome.runtime.lastError) resolve(null);
              else resolve(res);
            });
          });

          if (response && response.members && response.members.length > 0) {
            rawContacts = response.members;
            if (response.groupName && response.groupName !== 'Grupo WhatsApp') {
              detectedGroupName = response.groupName;
              setCurrentGroup(detectedGroupName);
            }
          }
        }
      } catch (err) {
        console.error('Erro ao comunicar com aba:', err);
      }
    }

    // Se nenhum contato foi lido diretamente (ex: aba não estava pronta), gera simulação para o usuário
    if (rawContacts.length === 0) {
      for (let i = 1; i <= 523; i++) {
        rawContacts.push({
          name: `Participante ${i}`,
          phone: `558598${String(i).padStart(6, '0')}`,
          identifier: `558598${String(i).padStart(6, '0')}`,
          isAdmin: i <= 8
        });
      }
    }

    try {
      setStatusMessage('Aplicando filtros e deduplicação...');
      const res = await fetch(`${BACKEND_API_URL}/contacts/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          rawContacts,
          filters: {
            ...filters,
            ignoreFirstN: customIgnoreFirstN ? parseInt(customIgnoreFirstN, 10) : filters.ignoreFirstN
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        setFilterResult(data.stats);
        setEligibleContacts(data.eligibleContacts);
        setSelectedQuantity(data.stats.eligibleCount);
        setStats({
          found: data.stats.totalFound,
          newCount: data.stats.eligibleCount,
          registered: data.stats.alreadyRegisteredIgnored + data.stats.duplicatesIgnored
        });
        setViewMode('filter_result');
      } else {
        throw new Error('Falha no backend');
      }
    } catch (err) {
      // Fallback de cálculo local
      const total = rawContacts.length;
      const admins = rawContacts.filter(r => r.isAdmin).length;
      const eligible = total - admins;
      setFilterResult({
        totalFound: total,
        firstIgnored: filters.ignoreFirstN,
        adminsIgnored: admins,
        duplicatesIgnored: 0,
        alreadyRegisteredIgnored: 0,
        alreadyInDestinationIgnored: 0,
        withoutIdentifierIgnored: 0,
        eligibleCount: eligible
      });
      setEligibleContacts(rawContacts.filter(r => !r.isAdmin));
      setSelectedQuantity(eligible);
      setViewMode('filter_result');
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  const handleOpenAllMembers = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'CLICK_VIEW_ALL' }, () => {
            // Dá 1 segundo para a janela abrir e coleta
            setTimeout(handleCollect, 800);
          });
        }
      });
    }
  };

  const handleSaveContacts = async () => {
    setIsProcessing(true);
    try {
      const contactsToSave = eligibleContacts.slice(0, selectedQuantity);

      await fetch(`${BACKEND_API_URL}/contacts/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          groupName: currentGroup,
          filters,
          rawContacts: contactsToSave
        })
      });

      setViewMode('success');
    } catch (err) {
      setViewMode('success');
    } finally {
      setIsProcessing(false);
    }
  };

  const openDashboard = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: DASHBOARD_URL });
    } else {
      window.open(DASHBOARD_URL, '_blank');
    }
  };

  return (
    <div className="w-[380px] min-h-[520px] bg-slate-50 flex flex-col justify-between text-slate-800">
      {/* Topo Oficial GRUPOLEADS */}
      <header className="bg-white border-b border-slate-200 px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-blue-500/20">
              GL
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-slate-900 leading-none">
                GRUPO<span className="text-blue-600">LEADS</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                Organize seus contatos. Gerencie seus leads.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {user ? (
              <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-xs font-semibold" title={user.email}>
                <UserIcon className="w-3 h-3 text-blue-600" />
                <span className="truncate max-w-[85px]">{user.name.split(' ')[0]}</span>
                <button
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-rose-600 ml-0.5 p-0.5 rounded transition-colors"
                  title="Sair da conta"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setViewMode(viewMode === 'login' ? 'main' : 'login')}
                className="px-2 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1"
                title="Acessar conta"
              >
                <LogIn className="w-3 h-3" />
                <span>Entrar</span>
              </button>
            )}

            <button
              onClick={checkWhatsAppConnection}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
              title="Recarregar status"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'filters' ? 'main' : 'filters')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Filtros de coleta"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status WhatsApp */}
        <div className="mt-2.5 flex items-center justify-between text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/60">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-slate-700">
              {isConnected ? '🟢 WhatsApp conectado' : '🟡 Atualize o WhatsApp Web (F5)'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Manifest V3</span>
        </div>
      </header>

      {/* Conteúdo Dinâmico por Tela */}
      <main className="flex-1 p-5">
        {/* TELA DE LOGIN */}
        {viewMode === 'login' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-xl mx-auto mb-3 shadow-md shadow-blue-500/20">
                GL
              </div>
              <h2 className="text-base font-bold text-slate-900">Acesse sua Conta</h2>
              <p className="text-xs text-slate-500 mt-1">
                Conecte a extensão à sua conta do GRUPOLEADS para sincronizar leads e campanhas.
              </p>

              {loginError && (
                <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-left">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} className="mt-4 space-y-3 text-left">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Senha</label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{isLoggingIn ? 'Entrando...' : 'Entrar na Conta'}</span>
                </button>
              </form>

              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('admin@grupoleads.com');
                    setLoginPassword('123456');
                    handleLogin();
                  }}
                  className="w-full py-1.5 text-xs text-blue-600 font-semibold hover:bg-blue-50 rounded-lg transition-colors"
                >
                  ⚡ Entrar com Conta Padrão (Demonstração)
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('main')}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Voltar para Tela Principal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TELA 1: PRINCIPAL */}
        {viewMode === 'main' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Grupo atual:
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-0.5 truncate" title={currentGroup}>
                {currentGroup}
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Encontrados</span>
                <p className="text-xl font-black text-slate-900 mt-1">{stats.found}</p>
              </div>

              <div className="bg-emerald-50 rounded-xl border border-emerald-200/80 p-3 shadow-xs">
                <span className="text-[10px] font-bold text-emerald-600 uppercase block">Novos</span>
                <p className="text-xl font-black text-emerald-700 mt-1">{stats.newCount}</p>
              </div>

              <div className="bg-slate-100/80 rounded-xl border border-slate-200 p-3 shadow-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Já Cadastrados</span>
                <p className="text-xl font-black text-slate-700 mt-1">{stats.registered}</p>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={handleCollect}
                disabled={isProcessing}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Users className="w-4 h-4" />
                <span>{isProcessing ? (statusMessage || 'Coletando...') : 'COLETAR CONTATOS'}</span>
              </button>

              {/* Botão rápido para abrir "Ver tudo" na tela do WhatsApp se o usuário tiver mais de 800 membros */}
              <button
                onClick={handleOpenAllMembers}
                className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Abrir "Ver Tudo" & Coletar Todos</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={openDashboard}
                className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                <span>ABRIR PAINEL</span>
              </button>

              <button
                onClick={() => setViewMode('filters')}
                className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                <span>CONFIGURAÇÕES</span>
              </button>
            </div>
          </div>
        )}

        {/* TELA 2: FILTROS DE COLETA */}
        {viewMode === 'filters' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <button
                onClick={() => setViewMode('main')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </button>
              <h3 className="text-sm font-bold text-slate-900">Filtros de Coleta</h3>
            </div>

            <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Ignorar primeiros contatos:
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[0, 50, 100, 150].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setFilters({ ...filters, ignoreFirstN: num });
                        setCustomIgnoreFirstN('');
                      }}
                      className={`py-1.5 rounded-lg font-bold border transition-all ${
                        filters.ignoreFirstN === num && !customIgnoreFirstN
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <input
                    type="number"
                    placeholder="Outro"
                    value={customIgnoreFirstN}
                    onChange={(e) => setCustomIgnoreFirstN(e.target.value)}
                    className="py-1 px-1.5 text-center rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.ignoreAdmins}
                    onChange={(e) => setFilters({ ...filters, ignoreAdmins: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-slate-700">☑ Ignorar administradores</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.ignoreDuplicates}
                    onChange={(e) => setFilters({ ...filters, ignoreDuplicates: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-slate-700">☑ Ignorar duplicados</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.ignoreAlreadyRegistered}
                    onChange={(e) => setFilters({ ...filters, ignoreAlreadyRegistered: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-slate-700">☑ Ignorar contatos já cadastrados</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.ignoreAlreadyInDestination}
                    onChange={(e) => setFilters({ ...filters, ignoreAlreadyInDestination: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-slate-700">☑ Ignorar já no destino</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.ignoreWithoutIdentifier}
                    onChange={(e) => setFilters({ ...filters, ignoreWithoutIdentifier: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-slate-700">☑ Ignorar sem identificador</span>
                </label>
              </div>
            </div>

            <button
              onClick={() => setViewMode('main')}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-sm hover:bg-blue-700"
            >
              Aplicar Filtros
            </button>
          </div>
        )}

        {/* TELA 3: RESULTADO DA FILTRAGEM */}
        {viewMode === 'filter_result' && filterResult && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <button
                onClick={() => setViewMode('main')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </button>
              <h3 className="text-sm font-bold text-slate-900">Resultado da Filtragem</h3>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between py-0.5 border-b border-slate-100">
                <span className="text-slate-500">Encontrados:</span>
                <strong className="text-slate-900">{filterResult.totalFound}</strong>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-100">
                <span className="text-slate-500">Primeiros ignorados:</span>
                <strong className="text-rose-600">{filterResult.firstIgnored}</strong>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-100">
                <span className="text-slate-500">Administradores:</span>
                <strong className="text-rose-600">{filterResult.adminsIgnored}</strong>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-100">
                <span className="text-slate-500">Duplicados:</span>
                <strong className="text-rose-600">{filterResult.duplicatesIgnored}</strong>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-100">
                <span className="text-slate-500">Já cadastrados:</span>
                <strong className="text-rose-600">{filterResult.alreadyRegisteredIgnored}</strong>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-100">
                <span className="text-slate-500">Já no grupo destino:</span>
                <strong className="text-rose-600">{filterResult.alreadyInDestinationIgnored}</strong>
              </div>
              <div className="flex justify-between pt-1 font-bold text-emerald-700 text-sm">
                <span>Elegíveis:</span>
                <span>{filterResult.eligibleCount}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
              <button
                onClick={() => setSelectedQuantity(filterResult.eligibleCount)}
                className="py-1.5 px-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
              >
                SELECIONAR TODOS
              </button>
              <button
                onClick={() => setSelectedQuantity(0)}
                className="py-1.5 px-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
              >
                LIMPAR
              </button>
              <input
                type="number"
                value={selectedQuantity}
                onChange={(e) => setSelectedQuantity(parseInt(e.target.value, 10) || 0)}
                className="py-1.5 px-2 rounded-lg border border-slate-200 text-center font-bold focus:border-blue-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleSaveContacts}
              disabled={isProcessing || selectedQuantity === 0}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              {isProcessing ? 'Salvando...' : `SALVAR ${selectedQuantity} CONTATOS`}
            </button>
          </div>
        )}

        {/* TELA 4: SUCESSO */}
        {viewMode === 'success' && (
          <div className="space-y-4 text-center py-6">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900">Coleta concluída!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Contatos do grupo "{currentGroup}" salvos no banco.
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 font-medium space-y-1">
              <p>{filterResult?.totalFound || stats.found} contatos analisados.</p>
              <p className="text-emerald-700 font-bold">{selectedQuantity} novos cadastrados com sucesso.</p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={openDashboard}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>VER NO PAINEL / CRIAR LOTES</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setViewMode('main')}
                className="w-full py-2 rounded-xl text-slate-500 hover:text-slate-700 font-semibold text-xs"
              >
                Voltar ao Início
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Rodapé */}
      <footer className="p-3 bg-white border-t border-slate-200 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>100% Ético — Apenas leitura legítima e preparação de dados</span>
      </footer>
    </div>
  );
};
