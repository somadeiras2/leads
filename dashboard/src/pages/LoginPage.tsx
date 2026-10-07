import React, { useState } from 'react';
import { Lock, Mail, User as UserIcon, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { LeadsApi } from '../services/api';

interface LoginPageProps {
  onLoginSuccess: (user: { id: string; name: string; email: string }) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // Senha SEMPRE vazia por padrão
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Por favor, preencha todos os campos.');
      return;
    }

    if (isRegister && !name.trim()) {
      setErrorMsg('Por favor, informe seu nome.');
      return;
    }

    setIsLoading(true);

    try {
      let data;
      if (isRegister) {
        data = await LeadsApi.register(name.trim(), email.trim(), password);
      } else {
        data = await LeadsApi.login(email.trim(), password);
      }

      if (data && data.token) {
        localStorage.setItem('grupoleads_token', data.token);
        localStorage.setItem('grupoleads_user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
      } else {
        throw new Error('Resposta de autenticação inválida.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Erro ao autenticar. Verifique seus dados.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Logo GRUPOLEADS */}
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-lg shadow-md shadow-blue-500/25">
            GL
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            GRUPO<span className="text-blue-600">LEADS</span>
          </h1>
        </div>
        <p className="text-xs font-semibold text-slate-500">
          Organize seus contatos. Gerencie seus leads.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-100">
          {/* Alternador de Abas: Entrar / Criar Conta */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setErrorMsg('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                !isRegister
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setErrorMsg('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                isRegister
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Criar Conta
            </button>
          </div>

          <h2 className="text-lg font-extrabold text-slate-900 mb-1">
            {isRegister ? 'Crie sua conta no GRUPOLEADS' : 'Acesse o Painel de Controle'}
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            {isRegister
              ? 'Comece a organizar seus contatos de forma ética e profissional.'
              : 'Informe seu e-mail e senha para gerenciar seus leads e lotes.'}
          </p>

          {/* Mensagem de Erro */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nome Completo
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu Nome"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{isLoading ? 'Autenticando...' : isRegister ? 'Criar Minha Conta' : 'Acessar Painel'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Rodapé Informativo */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Acesso seguro com criptografia e proteção anti-bloqueio</span>
          </div>
        </div>
      </div>
    </div>
  );
};
