import React from 'react';
import {
  LayoutDashboard,
  Users,
  Banknote,
  Zap,
  BarChart2,
  UploadCloud,
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
  const { activeTab, setActiveTab, settings, playSound } = useApp();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'cobrancas', label: 'Cobranças', icon: Banknote },
    { id: 'automacoes', label: 'Automações', icon: Zap },
    { id: 'graficos', label: 'Gráficos', icon: BarChart2 },
    { id: 'importacao', label: 'Importação', icon: UploadCloud },
    { id: 'baixar-app', label: 'Baixar App', icon: Download },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
  ];

  const handleSelect = (id: string) => {
    playSound('beep');
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
            <div className="w-11 h-11 shrink-0 rounded-full p-0.5 relative group">
              <img
                src={settings.logoUrl || '/logo.svg'}
                alt="Gerenciapró Movieplay"
                className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(220,38,38,0.4)] transition-transform group-hover:scale-105"
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
                    28
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Sair */}
        <div className="p-3 border-t border-[#161824]">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-[#161217] transition-all group"
            title="Sair do painel"
          >
            <LogOut size={19} className="shrink-0 text-gray-400 group-hover:text-red-400 transition-colors" />
            {!collapsed && <span className="truncate">Sair</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
