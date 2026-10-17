import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Shield,
  Clock,
  History,
  Lock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
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

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#171a26] hover:bg-[#202538] text-white text-xs font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
