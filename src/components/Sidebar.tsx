import React from 'react';
import {
  LayoutDashboard,
  Users,
  Server,
  Banknote,
  Zap,
  Download,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  onLogout
}) => {
  const { activeTab, setActiveTab, settings, playSound, clients, user } = useApp();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'servidores', label: 'Servidores', icon: Server },
    { id: 'cobrancas', label: 'Cobranças', icon: Banknote },
    { id: 'automacoes', label: 'Automações', icon: Zap },
    { id: 'baixar-app', label: 'Baixar App', icon: Download },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
  ];

  const handleSelect = (id: string) => {
    setActiveTab(id);
    if (mobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen bg-[#08090d] border-r border-[#1a1d29] z-50 flex flex-col transition-all duration-300 select-none ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-20 flex items-center px-4 border-b border-[#161824] justify-between">
          <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={() => handleSelect('dashboard')}>
            <div className="w-12 h-12 shrink-0 relative group flex items-center justify-center">
              <img
                src={settings.logoUrl || '/logo.png'}
                alt="Gerenciapró Movieplay"
                className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(220,38,38,0.45)] transition-transform group-hover:scale-105"
              />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-display text-[17px] font-bold tracking-tight text-white leading-tight truncate">
                  {settings.appName || 'Gerenciapró'}
                </span>
                <span className="text-[11px] font-medium text-red-500 tracking-wider uppercase truncate">
                  {settings.appSubtitle || 'Painel Premium'}
                </span>
              </div>
            )}
          </div>

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#151824] transition-colors"
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all group relative ${
                  isActive
                    ? 'bg-[#180d12] text-white border border-red-600/70 shadow-[0_0_15px_rgba(220,38,38,0.25)]'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#12141d]'
                }`}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-red-600 rounded-r-full shadow-[0_0_8px_#dc2626]" />
                )}
                
                <Icon
                  size={20}
                  className={`shrink-0 transition-colors ${
                    isActive ? 'text-red-500 drop-shadow-[0_0_6px_rgba(220,38,38,0.6)]' : 'text-gray-400 group-hover:text-gray-200'
                  }`}
                />

                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}

                {/* Badge for Alert or Pending (e.g. for Clientes) */}
                {!collapsed && item.id === 'clientes' && (
                  <span className="ml-auto text-[11px] bg-red-950/70 text-red-400 border border-red-800/40 px-2 py-0.5 rounded-full font-mono-code font-bold">
                    {clients.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom User Info & Sair */}
        <div className="p-3 border-t border-[#161824] space-y-2">
          {!collapsed && user && (
            <div className="p-2.5 rounded-xl bg-[#0c0d13] border border-[#1b1e2c] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#141724] border border-[#23273a] flex items-center justify-center shrink-0">
                {user.provider === 'google' ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z" />
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z" />
                    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.4 7.5 23 12 23z" />
                  </svg>
                ) : (
                  <span className="text-xs font-bold text-red-400">
                    {(user.nome || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{user.nome || user.email}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] text-gray-400 truncate">Nuvem Conectada</span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-[#161217] transition-all group"
            title="Sair do painel"
          >
            <LogOut size={18} className="shrink-0 text-gray-400 group-hover:text-red-400 transition-colors" />
            {!collapsed && <span className="truncate">Sair da Conta</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
