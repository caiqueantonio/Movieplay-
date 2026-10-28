import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Shield,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Cloud,
  X,
  UserPlus,
  Trash2,
  Edit2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserAccount } from '../types';

interface LoginViewProps {
  onSuccess: (userProfile?: Partial<UserAccount>) => void;
}

interface GoogleAccountOption {
  id: string;
  nome: string;
  email: string;
  avatarBg: string;
}

const DEFAULT_GOOGLE_ACCOUNTS: GoogleAccountOption[] = [
  {
    id: 'g-1',
    nome: 'Caique Antonio',
    email: 'caiqueantoniio10@gmail.com',
    avatarBg: 'bg-red-600'
  },
  {
    id: 'g-2',
    nome: 'Caique Empreendedorismo',
    email: 'caiqueempreendedorismo@gmail.com',
    avatarBg: 'bg-blue-600'
  }
];

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const { settings, playSound } = useApp();

  // Manual inputs start completely empty as requested
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [role, setRole] = useState<'admin' | 'operador'>('admin');
  const [errorMsg, setErrorMsg] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Google Account Picker Modal state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccountOption[]>(() => {
    try {
      const saved = localStorage.getItem('gerenciapro_google_accounts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_GOOGLE_ACCOUNTS;
  });

  const [isAddingNewGoogle, setIsAddingNewGoogle] = useState(false);
  const [newGoogleEmail, setNewGoogleEmail] = useState('');
  const [newGoogleName, setNewGoogleName] = useState('');
  const [authenticatingEmail, setAuthenticatingEmail] = useState<string | null>(null);

  // Save google accounts whenever updated
  useEffect(() => {
    try {
      localStorage.setItem('gerenciapro_google_accounts', JSON.stringify(googleAccounts));
    } catch {}
  }, [googleAccounts]);

  // Open Google Picker
  const handleOpenGooglePicker = () => {
    setErrorMsg('');
    setShowGoogleModal(true);
    playSound('beep');
  };

  // Select a specific Google Account
  const handleSelectGoogleAccount = (acc: GoogleAccountOption) => {
    setAuthenticatingEmail(acc.email);
    playSound('sino');

    setTimeout(() => {
      const googleUser: Partial<UserAccount> = {
        id: `usr-${acc.id}`,
        nome: acc.nome || acc.email.split('@')[0],
        email: acc.email,
        role: 'admin',
        provider: 'google',
        avatar: 'https://lh3.googleusercontent.com/a/default-user'
      };

      try {
        localStorage.setItem('gerenciapro_session', JSON.stringify(googleUser));
      } catch (e) {
        console.warn('LocalStorage unavailable', e);
      }

      setShowGoogleModal(false);
      onSuccess(googleUser);
    }, 450);
  };

  // Add and select a new Google account
  const handleAddNewGoogleAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoogleEmail.trim()) return;

    const emailTrimmed = newGoogleEmail.trim().toLowerCase();
    const derivedName = newGoogleName.trim() || emailTrimmed.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    const newAcc: GoogleAccountOption = {
      id: `g-${Date.now()}`,
      nome: derivedName,
      email: emailTrimmed,
      avatarBg: 'bg-emerald-600'
    };

    setGoogleAccounts(prev => {
      const exists = prev.some(a => a.email === emailTrimmed);
      if (exists) {
        return prev.map(a => a.email === emailTrimmed ? newAcc : a);
      }
      return [newAcc, ...prev];
    });

    handleSelectGoogleAccount(newAcc);
  };

  // Remove an account from remembered list
  const handleRemoveAccount = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setGoogleAccounts(prev => prev.filter(a => a.id !== id));
  };

  // Submit via Typing Email and Password
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Por favor, informe seu e-mail e senha.');
      playSound('urgente');
      return;
    }

    playSound('sino');
    const isGoogleAccount = email.toLowerCase().includes('gmail') || email.toLowerCase().includes('google');

    // Extract default name from email
    const userDisplayName = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    const userProfile: Partial<UserAccount> = {
      id: 'usr-manual',
      nome: userDisplayName || 'Caique Antonio',
      email: email.trim(),
      role: role,
      provider: isGoogleAccount ? 'google' : 'local'
    };

    try {
      localStorage.setItem('gerenciapro_session', JSON.stringify(userProfile));
    } catch (e) {
      console.warn('LocalStorage unavailable', e);
    }

    onSuccess(userProfile);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotEmail) {
      setForgotSent(true);
      playSound('sino');
    }
  };

  return (
    <div className="min-h-screen bg-[#07080d] flex items-center justify-center p-3 sm:p-5 md:p-8 relative overflow-hidden select-none">
      {/* Red ambient glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-[500px] h-80 sm:h-[500px] bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-red-950/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card - 100% Responsivo */}
      <div className="tech-card border border-[#1d2232] rounded-3xl max-w-md w-full p-6 sm:p-8 md:p-9 space-y-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Logo and Brand */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto flex items-center justify-center filter drop-shadow-[0_0_25px_rgba(220,38,38,0.5)]">
            <img
              src={settings.logoUrl || '/logo.png'}
              alt="Logo Movieplay"
              className="w-full h-full object-contain"
            />
          </div>

          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
              {settings.appName || 'Gerenciapró'}
            </h1>
            <p className="text-xs font-bold text-red-500 uppercase tracking-widest mt-0.5">
              {settings.appSubtitle || 'Painel Premium'}
            </p>
          </div>
        </div>

        {/* Cloud Sync Notice */}
        <div className="bg-[#0e121e] border border-blue-900/40 rounded-2xl p-3 text-[11px] text-gray-300 flex items-start gap-2.5">
          <Cloud size={16} className="text-blue-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-white block font-semibold">Sincronização em Nuvem Ativa</strong>
            Acesse de qualquer aparelho. Seus clientes e dados são salvos na nuvem e sincronizados em tempo real.
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-950/80 border border-red-800 text-red-300 p-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!showForgot ? (
          <div className="space-y-4">
            {/* 1. Botão Oficial: Login com a Conta Google com Seleção Autônoma */}
            <div>
              <button
                type="button"
                onClick={handleOpenGooglePicker}
                className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-gray-100 text-gray-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all hover:scale-[1.01] active:scale-[0.99] border border-gray-200 cursor-pointer"
              >
                {/* Official Google G Logo */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Fazer login com o Google</span>
              </button>
              <p className="text-[10px] text-gray-500 text-center mt-1.5">
                Escolha a conta desejada ou use outra conta Google
              </p>
            </div>

            {/* Separador Elegante */}
            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-[#1e2335] w-full" />
              <span className="bg-[#0b0d14] px-3 text-[10px] sm:text-[11px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">
                Ou digite seu e-mail e senha
              </span>
              <div className="border-t border-[#1e2335] w-full" />
            </div>

            {/* Formulário com E-mail e Senha (Sem pré-preenchimento forçado) */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  E-mail da Conta
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu.email@gmail.com"
                    autoComplete="off"
                    className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none font-mono-code transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-[11px] text-red-400 hover:text-red-300 underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="new-password"
                    className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl pl-10 pr-12 py-2.5 text-xs text-white outline-none font-mono-code transition-colors"
                  />
                  {/* Botão de Visualizar / Ocultar Senha */}
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 transition-colors"
                    title={showPass ? 'Ocultar senha' : 'Visualizar senha'}
                  >
                    {showPass ? <EyeOff size={15} className="text-red-400" /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Nível de Permissão */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                  Nível de Acesso
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      role === 'admin'
                        ? 'bg-red-950/70 border-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)]'
                        : 'bg-[#111420] border-[#202538] text-gray-400 hover:text-white'
                    }`}
                  >
                    <Shield size={13} className="text-red-500" />
                    <span>Administrador</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('operador')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      role === 'operador'
                        ? 'bg-red-950/70 border-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)]'
                        : 'bg-[#111420] border-[#202538] text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>Operador</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer mt-3"
              >
                <span>Acessar Painel Gerenciapró</span>
                <ArrowRight size={15} />
              </button>
            </form>
          </div>
        ) : (
          <form onSubmit={handleForgotSubmit} className="space-y-4 animate-in fade-in">
            <h3 className="font-display text-sm font-bold text-white">
              Recuperação de Acesso
            </h3>
            <p className="text-xs text-gray-400">
              Digite seu e-mail cadastrado para receber as instruções de redefinição de acesso.
            </p>

            <div>
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                placeholder="seu.email@gmail.com"
                className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono-code"
              />
            </div>

            {forgotSent ? (
              <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>Instruções enviadas para seu e-mail com sucesso!</span>
              </div>
            ) : (
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-[0_0_12px_#dc2626]"
              >
                Enviar Link de Recuperação
              </button>
            )}

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setShowForgot(false);
                  setForgotSent(false);
                }}
                className="text-xs text-gray-400 hover:text-white underline"
              >
                Voltar para o Login
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ========================================================= */}
      {/* GOOGLE ACCOUNT SELECTOR MODAL (ESCOLHA AUTÔNOMA DE CONTA)  */}
      {/* ========================================================= */}
      {showGoogleModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#10121b] border border-[#252b3f] rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl relative">
            
            {/* Header Google Modal */}
            <div className="flex items-start justify-between pb-3 border-b border-[#1c2235]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center p-2 shadow-sm">
                  <svg className="w-full h-full" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Fazer login com o Google</h3>
                  <p className="text-xs text-gray-400">Escolha uma conta para continuar</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#1c2235]"
              >
                <X size={18} />
              </button>
            </div>

            {authenticatingEmail ? (
              <div className="py-8 text-center space-y-3 animate-in fade-in">
                <div className="w-10 h-10 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-semibold text-white">Autenticando com o Google...</p>
                <p className="text-xs text-gray-400 font-mono-code">{authenticatingEmail}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Account list */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1 divide-y divide-[#181d2e]">
                  {googleAccounts.map(acc => (
                    <div
                      key={acc.id}
                      onClick={() => handleSelectGoogleAccount(acc)}
                      className="p-3 rounded-2xl hover:bg-[#181d2e] border border-transparent hover:border-[#2a324b] transition-all flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-full ${acc.avatarBg} text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-md`}>
                          {acc.nome.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white group-hover:text-red-400 transition-colors truncate">
                            {acc.nome}
                          </p>
                          <p className="text-[11px] text-gray-400 font-mono-code truncate">
                            {acc.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleRemoveAccount(e, acc.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-[#20273d] transition-all"
                          title="Remover da lista de lembrados"
                        >
                          <Trash2 size={14} />
                        </button>
                        <ArrowRight size={14} className="text-gray-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Usar outra conta Google */}
                {!isAddingNewGoogle ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingNewGoogle(true)}
                    className="w-full p-3 rounded-2xl border border-dashed border-[#2b334d] hover:border-red-500/80 hover:bg-[#141824] text-xs font-semibold text-gray-300 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <UserPlus size={15} className="text-red-400" />
                    <span>Usar outra conta Google</span>
                  </button>
                ) : (
                  <form onSubmit={handleAddNewGoogleAccount} className="bg-[#0b0d14] border border-[#20263b] rounded-2xl p-4 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <UserPlus size={14} className="text-red-500" />
                        <span>Adicionar Nova Conta Google</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewGoogle(false)}
                        className="text-xs text-gray-500 hover:text-gray-300"
                      >
                        Cancelar
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                        E-mail da sua conta Google *
                      </label>
                      <input
                        type="email"
                        required
                        value={newGoogleEmail}
                        onChange={e => setNewGoogleEmail(e.target.value)}
                        placeholder="exemplo@gmail.com"
                        className="w-full bg-[#121624] border border-[#242c42] focus:border-red-600 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono-code"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                        Nome visível no painel (opcional)
                      </label>
                      <input
                        type="text"
                        value={newGoogleName}
                        onChange={e => setNewGoogleName(e.target.value)}
                        placeholder="Ex: Caique Antonio"
                        className="w-full bg-[#121624] border border-[#242c42] focus:border-red-600 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-[0_0_12px_#dc2626] transition-all flex items-center justify-center gap-2"
                    >
                      <span>Entrar com esta Conta Google</span>
                      <ArrowRight size={14} />
                    </button>
                  </form>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-[#1a1f30] text-center">
              <span className="text-[11px] text-gray-500">
                O Gerenciaprô salva suas preferências no banco de dados sincronizado.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
