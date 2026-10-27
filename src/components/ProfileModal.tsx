import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Shield,
  Clock,
  History,
  Lock,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Cloud
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onLogout }) => {
  const { user, playSound } = useApp();
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; timestamp: string; usuario: string; acao: string; detalhes: string }>>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoadingLogs(true);
      fetch('/api/bootstrap')
        .then(res => res.json())
        .then(data => {
          if (data.auditLogs) setAuditLogs(data.auditLogs);
        })
        .catch(() => {})
        .finally(() => setLoadingLogs(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0e1017] border border-[#222738] rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl animate-in fade-in">
        <div className="flex items-center justify-between pb-3 border-b border-[#1b1f2e]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-600 text-white font-extrabold text-lg flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.5)]">
              C
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <span>{user.nome || 'Caique Antonio'}</span>
                <span className="text-[10px] bg-red-950 text-red-400 px-2 py-0.5 rounded-full border border-red-800 uppercase font-bold tracking-wider">
                  {user.role}
                </span>
              </h2>
              <p className="text-xs text-gray-400 font-mono-code">{user.email}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a1d2c]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Permissions & Security Summary */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-[#121522] border border-[#202538] rounded-xl p-3.5 space-y-1">
            <span className="text-gray-400 font-semibold block">Nível de Acesso</span>
            <div className="text-white font-bold flex items-center gap-1.5 text-sm">
              <Shield size={15} className="text-red-500" />
              <span>Super Administrador</span>
            </div>
          </div>

          <div className="bg-[#121522] border border-[#202538] rounded-xl p-3.5 space-y-1">
            <span className="text-gray-400 font-semibold block">Sessão Segura</span>
            <div className="text-emerald-400 font-bold flex items-center gap-1.5 text-sm">
              <CheckCircle2 size={15} />
              <span>Conexão Ativa</span>
            </div>
          </div>
        </div>

        {/* Audit Log */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
            <History size={14} className="text-red-500" />
            <span>Registro de Auditoria Recente</span>
          </div>

          <div className="border border-[#1b1f2e] bg-[#090b11] rounded-2xl p-3 max-h-56 overflow-y-auto divide-y divide-[#151824] text-xs">
            {auditLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Carregando logs de auditoria...</p>
            ) : (
              auditLogs.map(log => (
                <div key={log.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div>
                    <span className="font-bold text-gray-200">{log.acao}</span>
                    <p className="text-gray-400 text-[11px] mt-0.5">{log.detalhes}</p>
                  </div>
                  <span className="text-[10px] text-gray-500 shrink-0 font-mono-code">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Google Account Status */}
        <div className="bg-[#111422] border border-[#20273d] rounded-2xl p-4 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center p-1.5 shadow-sm shrink-0">
              <svg className="w-full h-full" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-1.5">
                <span>Conta Google Conectada</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-gray-400 font-mono-code mt-0.5">
                {user.email} • Sincronização em Nuvem Ativa
              </p>
            </div>
          </div>

          <div className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded-full">
            Multi-dispositivo
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#1b1f2e]">
          {onLogout ? (
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-950/60 hover:bg-red-950 text-red-400 hover:text-red-300 border border-red-900/60 text-xs font-bold transition-all"
            >
              <LogOut size={14} />
              <span>Sair da Conta Google</span>
            </button>
          ) : <div />}

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#171a26] hover:bg-[#202538] text-white text-xs font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
