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
  Trash2,
  Smartphone
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  onOpenProfile: () => void;
  onOpenMobileNotifs?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, onOpenProfile, onOpenMobileNotifs }) => {
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
          {/* Mobile Notifications Phone Alert Trigger */}
          {onOpenMobileNotifs && (
            <button
              onClick={onOpenMobileNotifs}
              className="p-2.5 rounded-xl bg-[#0d0f17] border border-[#1d2130] hover:border-red-600/60 text-gray-400 hover:text-red-400 transition-all relative group"
              title="Como o app te notifica no celular (sem abrir o app)"
            >
              <Smartphone size={17} />
              <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-1.5 right-1.5 animate-pulse" />
            </button>
          )}

          {/* User Profile with Google Account Badge */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-[#0d0f17] border border-[#1d2130] hover:border-red-600/50 transition-all group cursor-pointer"
            title="Perfil do Usuário e Conta Google Conectada"
          >
            <div className="relative">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-600 to-red-800 text-white font-bold text-xs flex items-center justify-center shadow-[0_0_8px_rgba(220,38,38,0.5)]">
                {(user.nome || user.email || 'C').substring(0, 1).toUpperCase()}
              </div>
              {user.provider === 'google' && (
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center p-0.5 shadow-sm">
                  <svg className="w-full h-full" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </div>
              )}
            </div>

            <div className="hidden md:flex flex-col text-left leading-tight">
              <span className="text-xs font-bold text-gray-200 group-hover:text-white max-w-[130px] truncate">
                {user.nome || user.email.split('@')[0]}
              </span>
              <span className="text-[10px] text-gray-400 font-mono-code truncate max-w-[130px]">
                {user.email}
              </span>
            </div>

            <Shield size={13} className="text-red-500 hidden sm:inline" />
          </button>
        </div>
      </div>
    </header>
  );
};
