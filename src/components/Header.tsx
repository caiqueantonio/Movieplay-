import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  RotateCw,
  Undo2,
  Bell,
  Menu,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Volume2,
  VolumeX,
  Shield,
  Trash2
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, onOpenProfile }) => {
  const {
    searchQuery,
    setSearchQuery,
    refreshData,
    isSyncing,
    canUndo,
    undoLastAction,
    undoDescription,
    notifications,
    markNotificationAsRead,
    clearNotifications,
    user,
    settings,
    toggleSound,
    playSound
  } = useApp();

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.lida).length;

  // Close notifications dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRefresh = async () => {
    await refreshData();
  };

  const handleUndo = async () => {
    if (!canUndo) return;
    await undoLastAction();
  };

  return (
    <header className="h-20 bg-[#090a0f]/90 backdrop-blur-md border-b border-[#161824] px-4 md:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Left: Mobile trigger & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#151824]"
        >
          <Menu size={22} />
        </button>

        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={17} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar clientes, planos..."
            className="w-full bg-[#0d0f17] border border-[#1d2130] focus:border-red-600/80 focus:ring-1 focus:ring-red-600/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 transition-all outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2.5">
        {/* Sound toggle button */}
        <button
          onClick={toggleSound}
          className={`p-2.5 rounded-xl border transition-all ${
            settings.soundEnabled
              ? 'bg-[#150d12] border-red-900/50 text-red-400 hover:border-red-600'
              : 'bg-[#0d0f17] border-[#1d2130] text-gray-500 hover:text-gray-300'
          }`}
          title={settings.soundEnabled ? 'Alertas sonoros ativos' : 'Alertas sonoros desativados'}
        >
          {settings.soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>

        {/* Atualizar */}
        <button
          onClick={handleRefresh}
          disabled={isSyncing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#130b0f] border border-red-600/60 text-red-400 hover:bg-red-950/40 hover:text-red-300 text-xs font-semibold tracking-wide transition-all shadow-[0_0_10px_rgba(220,38,38,0.15)] disabled:opacity-50"
        >
          <RotateCw size={14} className={isSyncing ? 'animate-spin text-red-500' : ''} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>

        {/* Desfazer */}
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          title={undoDescription ? `Desfazer: ${undoDescription}` : 'Nenhuma alteração para desfazer'}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold tracking-wide transition-all ${
            canUndo
              ? 'bg-[#111420] border-[#252b40] text-gray-200 hover:border-gray-500 hover:bg-[#181d2e] cursor-pointer'
              : 'bg-[#0d0f17] border-[#181b26] text-gray-600 cursor-not-allowed opacity-60'
          }`}
        >
          <Undo2 size={14} />
          <span className="hidden sm:inline">Desfazer</span>
        </button>

        {/* Notificações Bell & Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              playSound('beep');
              setShowNotifDropdown(!showNotifDropdown);
            }}
            className="relative p-2.5 rounded-xl bg-[#0d0f17] border border-[#1d2130] text-gray-400 hover:text-gray-200 hover:border-[#2d334a] transition-all"
            title="Central de notificações"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shadow-[0_0_8px_#dc2626]">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0f111a] border border-[#222738] rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-[#1b1f30] mb-3">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-red-500" />
                  <span className="font-semibold text-sm text-white">Central de Notificações</span>
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Limpar
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {notifications.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 text-xs">
                    Nenhuma notificação no momento
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationAsRead(n.id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        n.lida
                          ? 'bg-[#0a0c13] border-[#181b26] text-gray-400'
                          : 'bg-[#140e15] border-red-950/60 text-gray-200 shadow-[0_0_8px_rgba(220,38,38,0.15)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-semibold text-white">
                          {n.tipo === 'sucesso' && <CheckCircle2 size={13} className="text-emerald-500" />}
                          {n.tipo === 'alerta' && <AlertTriangle size={13} className="text-amber-500" />}
                          {n.tipo === 'info' && <Info size={13} className="text-blue-400" />}
                          <span>{n.titulo}</span>
                        </div>
                        <span className="text-[10px] text-gray-500">{n.data}</span>
                      </div>
                      <p className="mt-1 text-gray-400 leading-relaxed">{n.mensagem}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-[#0d0f17] border border-[#1d2130] hover:border-[#2d334a] transition-all group"
          title="Ver perfil e permissões"
        >
          <div className="w-7 h-7 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center shadow-[0_0_8px_rgba(220,38,38,0.5)]">
            C
          </div>
          <span className="text-xs font-medium text-gray-300 group-hover:text-white max-w-[140px] truncate hidden md:inline">
            {user.email || 'caiqueempreendedorismo...'}
          </span>
          <Shield size={13} className="text-red-500 hidden sm:inline" />
        </button>
      </div>
    </header>
  );
};
