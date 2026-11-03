import React from 'react';
import { Smartphone, CheckCircle, X, Wifi, Radio } from 'lucide-react';

export interface SyncToastData {
  deviceName: string;
  actionText: string;
  timestamp: number;
}

interface SyncToastProps {
  toast: SyncToastData | null;
  onDismiss: () => void;
}

export const SyncToast: React.FC<SyncToastProps> = ({ toast, onDismiss }) => {
  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md animate-bounce-subtle pointer-events-auto">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-950 via-gray-900 to-red-950/80 border-2 border-red-500/60 shadow-2xl shadow-red-950/60 p-4 text-white">
        {/* Glow corner */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 shrink-0">
            <Radio className="w-5 h-5 animate-pulse text-red-400" />
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                <Wifi className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                Tempo Real
              </span>
              <span className="text-[11px] text-gray-400 truncate flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-red-400" />
                <strong className="text-gray-200">{toast.deviceName}</strong>
              </span>
            </div>

            <p className="text-xs font-semibold text-white leading-snug">
              Alteração sincronizada:
            </p>
            <p className="text-xs text-red-200/90 font-medium mt-0.5 break-words">
              {toast.actionText}
            </p>

            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              Atualizado instantaneamente em todos os seus aparelhos
            </p>
          </div>

          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors shrink-0"
            title="Fechar aviso de sincronização"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
