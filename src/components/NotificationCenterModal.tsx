import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Trash2,
  CheckCheck,
  X,
  MessageCircle,
  Calendar,
  Smartphone,
  Filter,
  User,
  Zap,
  Info
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppNotification } from '../types';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMobileGuide?: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  onOpenMobileGuide
}) => {
  const {
    notifications,
    markNotificationAsRead,
    clearNotifications,
    clients,
    setActiveClientIdToOpen,
    playSound
  } = useApp();

  const [filter, setFilter] = useState<'all' | 'unread' | 'due' | 'system'>('all');

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.lida).length;

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.lida;
    if (filter === 'due') {
      const text = (n.titulo + ' ' + n.mensagem).toLowerCase();
      return text.includes('venc') || text.includes('atras') || text.includes('plano');
    }
    if (filter === 'system') {
      const text = (n.titulo + ' ' + n.mensagem).toLowerCase();
      return !text.includes('venc') && !text.includes('atras');
    }
    return true;
  });

  const handleMarkAllAsRead = () => {
    notifications.forEach(n => {
      if (!n.lida) markNotificationAsRead(n.id);
    });
    playSound('sino');
  };

  const handleClearAll = () => {
    if (confirm('Tem certeza que deseja limpar todo o histórico de notificações?')) {
      clearNotifications();
      playSound('sino');
    }
  };

  const handleOpenClient = (notification: AppNotification) => {
    markNotificationAsRead(notification.id);
    
    // Find matching client by ID or name
    let foundClientId: string | null = null;
    if (notification.id.includes('bday-')) {
      const parts = notification.id.split('-');
      foundClientId = parts[1];
    } else if (notification.link && notification.link.includes('client-')) {
      foundClientId = notification.link.replace('#client-', '');
    }

    if (!foundClientId) {
      // Search in clients array by matching name inside notification title or message
      const match = clients.find(c => 
        notification.titulo.toLowerCase().includes(c.nome.toLowerCase()) ||
        notification.mensagem.toLowerCase().includes(c.nome.toLowerCase())
      );
      if (match) foundClientId = match.id;
    }

    if (foundClientId) {
      setActiveClientIdToOpen(foundClientId);
      onClose();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="tech-card border border-red-950/80 rounded-3xl max-w-2xl w-full my-auto flex flex-col max-h-[90vh] shadow-[0_0_60px_rgba(220,38,38,0.25)] relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#1b1f30] flex items-center justify-between gap-4 relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-red-950/80 border border-red-700/60 text-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)]">
              <Bell size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg sm:text-xl font-bold text-white tracking-tight">
                  Central de Notificações
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white font-mono-code font-bold text-xs shadow-[0_0_10px_#dc2626]">
                    {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Alertas do sistema, vencimentos e notificações push Android
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenMobileGuide && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMobileGuide();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141724] border border-[#23293c] hover:border-red-600/60 text-gray-300 hover:text-white text-xs font-semibold transition-all"
                title="Configurar notificações no celular"
              >
                <Smartphone size={14} className="text-red-400" />
                <span>Configurar Celular</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-[#1c2030] transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filter bar & Actions */}
        <div className="px-5 py-3 border-b border-[#161a29] bg-[#090b12] flex flex-wrap items-center justify-between gap-2.5 shrink-0 relative z-10">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'unread', label: `Não Lidas (${unreadCount})` },
              { id: 'due', label: 'Vencimentos' },
              { id: 'system', label: 'Sistema' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  filter === tab.id
                    ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.4)]'
                    : 'bg-[#121522] text-gray-400 hover:text-gray-200 border border-[#1f2436]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-[11px] font-semibold text-gray-300 hover:text-emerald-400 px-2.5 py-1 rounded-lg hover:bg-[#141828] transition-colors"
              >
                <CheckCheck size={14} className="text-emerald-400" />
                <span>Marcar todas como lidas</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-red-400 px-2.5 py-1 rounded-lg hover:bg-red-950/40 transition-colors"
              >
                <Trash2 size={13} />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* List of notifications */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 relative z-10 divide-y divide-[#161a28]/60">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 text-gray-500 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#121522] border border-[#1f2436] flex items-center justify-center mx-auto text-gray-600">
                <Bell size={22} />
              </div>
              <p className="text-sm font-semibold text-gray-400">Nenhuma notificação no momento</p>
              <p className="text-xs text-gray-600">
                {filter === 'unread' ? 'Você já visualizou todos os seus alertas.' : 'Novos alertas e lembretes aparecerão aqui.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map(notification => {
              const isDueAlert = (notification.titulo + notification.mensagem).toLowerCase().includes('venc') ||
                                 (notification.titulo + notification.mensagem).toLowerCase().includes('atras');
              const isBday = notification.id.includes('bday-');

              return (
                <div
                  key={notification.id}
                  className={`pt-3 first:pt-0 p-3 rounded-2xl transition-all ${
                    !notification.lida
                      ? 'bg-[#150f18]/80 border border-red-900/40 shadow-[0_0_15px_rgba(220,38,38,0.08)]'
                      : 'bg-[#0e101a]/50 hover:bg-[#121522]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Icon */}
                      <div className="mt-0.5 shrink-0">
                        {isBday ? (
                          <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-800 text-purple-400 flex items-center justify-center">
                            🎂
                          </div>
                        ) : notification.tipo === 'erro' || (notification.titulo.toLowerCase().includes('atraso')) ? (
                          <div className="w-8 h-8 rounded-xl bg-red-950/80 border border-red-800 text-red-400 flex items-center justify-center">
                            <AlertTriangle size={15} />
                          </div>
                        ) : notification.tipo === 'sucesso' ? (
                          <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center">
                            <CheckCircle2 size={15} />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-400 flex items-center justify-center">
                            <Clock size={15} />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`text-xs font-bold ${!notification.lida ? 'text-white' : 'text-gray-300'}`}>
                            {notification.titulo}
                          </h4>
                          {!notification.lida && (
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          )}
                        </div>

                        <p className="text-xs text-gray-400 leading-relaxed">
                          {notification.mensagem}
                        </p>

                        <div className="flex items-center gap-3 pt-1 text-[11px] text-gray-500">
                          <span>{notification.data}</span>
                          {isDueAlert && (
                            <span className="text-red-400 font-semibold">• Vencimento / Cobrança</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <button
                        onClick={() => handleOpenClient(notification)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-600/40 text-xs font-bold transition-all shadow-sm"
                        title="Abrir ficha e ações do cliente"
                      >
                        <User size={13} />
                        <span>Abrir Ficha</span>
                      </button>

                      {!notification.lida && (
                        <button
                          onClick={() => markNotificationAsRead(notification.id)}
                          className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          Marcar como lida
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-[#1b1f30] bg-[#0c0e16] flex items-center justify-between text-xs text-gray-400 shrink-0">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-red-500" />
            <span>Notificações push sincronizadas em segundo plano via Android Web Push</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#141724] border border-[#23293c] hover:border-gray-500 text-xs font-semibold text-gray-300 hover:text-white transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
