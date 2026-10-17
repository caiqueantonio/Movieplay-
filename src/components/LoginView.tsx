import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Shield,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface LoginViewProps {
  onSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const { settings, playSound } = useApp();
  const [email, setEmail] = useState('caiqueempreendedorismo@gmail.com');
  const [password, setPassword] = useState('admin123');
  const [showPass, setShowPass] = useState(false);
  const [role, setRole] = useState<'admin' | 'operador'>('admin');
  const [errorMsg, setErrorMsg] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Informe e-mail e senha.');
      playSound('urgente');
      return;
    }

    playSound('sino');
    onSuccess();
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotEmail) {
      setForgotSent(true);
      playSound('sino');
    }
  };

  return (
    <div className="min-h-screen bg-[#07080d] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Red ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="bg-[#0b0d14] border border-[#1d2232] rounded-3xl max-w-md w-full p-8 md:p-10 space-y-6 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Logo and Brand */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#12090e] border border-red-950/80 p-2 flex items-center justify-center shadow-[0_0_25px_rgba(220,38,38,0.4)]">
            <img
              src={settings.logoUrl || '/logo.svg'}
              alt="Logo Movieplay"
              className="w-full h-full object-contain"
            />
          </div>

          <div>
            <h1 className="font-display text-2xl font-extrabold text-white tracking-tight">
              {settings.appName || 'Gerenciapró'}
            </h1>
            <p className="text-xs font-bold text-red-500 uppercase tracking-wider mt-0.5">
              {settings.appSubtitle || 'Painel Premium'}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-950/70 border border-red-800 text-red-300 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        {!showForgot ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                E-mail de acesso
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@gerenciapro.com.br"
                  className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none"
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
                  placeholder="••••••••"
                  className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white outline-none font-mono-code"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Perfil Role */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                Nível de Permissão
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    role === 'admin'
                      ? 'bg-red-950/70 border-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)]'
                      : 'bg-[#111420] border-[#202538] text-gray-400'
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
                      : 'bg-[#111420] border-[#202538] text-gray-400'
                  }`}
                >
                  <span>Operador</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all mt-2"
            >
              <span>Entrar no Painel</span>
              <ArrowRight size={15} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotSubmit} className="space-y-4 animate-in fade-in">
            <h3 className="font-display text-sm font-bold text-white">
              Recuperação de Senha
            </h3>
            <p className="text-xs text-gray-400">
              Digite seu e-mail para receber as instruções de redefinição de acesso.
            </p>

            <div>
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
              />
            </div>

            {forgotSent ? (
              <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>Instruções enviadas para seu e-mail!</span>
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
    </div>
  );
};
