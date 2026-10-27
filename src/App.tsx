import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ClientsView } from './components/ClientsView';
import { ServersView } from './components/ServersView';
import { PaymentsView } from './components/PaymentsView';
import { AutomationsView } from './components/AutomationsView';
import { ChartsView } from './components/ChartsView';
import { ImportView } from './components/ImportView';
import { InstallAppView } from './components/InstallAppView';
import { SettingsView } from './components/SettingsView';
import { ClientModal } from './components/ClientModal';
import { ProfileModal } from './components/ProfileModal';
import { LoginView } from './components/LoginView';
import { MobileNotificationsModal } from './components/MobileNotificationsModal';
import { Client, UserAccount } from './types';

function MainApp() {
  const { activeTab, setActiveTab, clients, toastMessage, activeClientIdToOpen, setActiveClientIdToOpen, updateUser } = useApp();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  // Client Modal
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientModalMode, setClientModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // Profile Modal & Mobile Notifications Modal
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMobileNotifModalOpen, setIsMobileNotifModalOpen] = useState(false);

  // Auto-open client modal if deep-linked or routed via activeClientIdToOpen
  useEffect(() => {
    if (activeClientIdToOpen) {
      const target = clients.find(c => c.id === activeClientIdToOpen);
      if (target) {
        setSelectedClient(target);
        setClientModalMode('view');
        setIsClientModalOpen(true);
      }
      setActiveClientIdToOpen(null);
    }
  }, [activeClientIdToOpen, clients, setActiveClientIdToOpen]);

  const handleOpenClient = (client: Client) => {
    setSelectedClient(client);
    setClientModalMode('view');
    setIsClientModalOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setClientModalMode('edit');
    setIsClientModalOpen(true);
  };

  const handleNewClient = () => {
    setSelectedClient(null);
    setClientModalMode('create');
    setIsClientModalOpen(true);
  };

  const handleRenewClient = (client: Client) => {
    setSelectedClient(client);
    setClientModalMode('edit');
    setIsClientModalOpen(true);
  };

  const handleLoginSuccess = (userProfile?: Partial<UserAccount>) => {
    if (userProfile) {
      updateUser(userProfile);
    }
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('gerenciapro_session');
    } catch {}
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginView onSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#07080d] flex text-gray-100">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Header */}
        <Header
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onOpenMobileNotifs={() => setIsMobileNotifModalOpen(true)}
        />

        {/* Content View */}
        <main className={`flex-1 p-3 sm:p-5 md:p-6 w-full mx-auto transition-all ${activeTab === 'clientes' ? 'max-w-[1780px]' : 'max-w-7xl'}`}>
          {activeTab === 'dashboard' && (
            <DashboardView
              onOpenClient={handleOpenClient}
              onRenewClient={handleRenewClient}
              onOpenMobileNotifs={() => setIsMobileNotifModalOpen(true)}
            />
          )}

          {activeTab === 'clientes' && (
            <ClientsView
              onNewClient={handleNewClient}
              onOpenClient={handleOpenClient}
              onEditClient={handleEditClient}
              onRenewClient={handleRenewClient}
            />
          )}

          {activeTab === 'servidores' && <ServersView />}

          {activeTab === 'cobrancas' && <PaymentsView />}

          {activeTab === 'automacoes' && <AutomationsView />}

          {activeTab === 'graficos' && <ChartsView />}

          {activeTab === 'importacao' && <ImportView />}

          {activeTab === 'baixar-app' && <InstallAppView />}

          {activeTab === 'configuracoes' && <SettingsView />}
        </main>
      </div>

      {/* Full 18-Field Client View/Edit/Create Modal */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        client={selectedClient}
        mode={clientModalMode}
      />

      {/* Profile & Audit Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onLogout={handleLogout}
      />

      {/* Phone Integration Notifications Modal */}
      <MobileNotificationsModal
        isOpen={isMobileNotifModalOpen}
        onClose={() => setIsMobileNotifModalOpen(false)}
      />

      {/* Futuristic Neon Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 bg-[#0e1017]/95 border border-red-500/60 shadow-[0_0_25px_rgba(220,38,38,0.4)] rounded-xl text-white text-sm font-medium backdrop-blur-md pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse" />
          <span className="tracking-wide">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
