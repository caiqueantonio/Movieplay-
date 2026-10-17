import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  Client,
  ServerItem,
  PlanItem,
  PaymentRecord,
  AutomationRule,
  NotificationLog,
  AppSettings,
  UserAccount,
  AppNotification
} from '../types';
import {
  INITIAL_CLIENTS,
  INITIAL_SERVERS,
  INITIAL_PLANS,
  INITIAL_AUTOMATIONS,
  INITIAL_SETTINGS,
  INITIAL_USER
} from '../data/initialData';
import { soundEffects } from '../utils/audio';

interface UndoAction {
  id: string;
  description: string;
  undo: () => Promise<void>;
}

interface AppContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Data
  clients: Client[];
  servers: ServerItem[];
  plans: PlanItem[];
  payments: PaymentRecord[];
  automations: AutomationRule[];
  notificationLogs: NotificationLog[];
  settings: AppSettings;
  user: UserAccount;
  
  // Notifications & Undo
  notifications: AppNotification[];
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
  canUndo: boolean;
  undoLastAction: () => Promise<void>;
  undoDescription: string | null;
  
  // Status
  isSyncing: boolean;
  refreshData: () => Promise<void>;
  playSound: (type?: 'beep' | 'sino' | 'urgente' | 'digital') => void;
  toggleSound: () => void;
  
  // Client Actions
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Client>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<Client>;
  deleteClient: (id: string) => Promise<void>;
  bulkDeleteClients: (ids: string[]) => Promise<void>;
  renewClientPlan: (clientId: string, novoVencimento: string, valor?: number, plano?: string, forma?: string) => Promise<void>;
  importClientsBatch: (imported: Partial<Client>[], mode: 'append' | 'replace' | 'update') => Promise<void>;
  
  // Server Actions
  addServer: (nome: string, descricao?: string) => Promise<void>;
  deleteServer: (id: string) => Promise<void>;
  
  // Plan Actions
  addPlan: (plan: Omit<PlanItem, 'id'>) => Promise<void>;
  updatePlan: (id: string, updates: Partial<PlanItem>) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  
  // Payment Actions
  addPayment: (payment: Omit<PaymentRecord, 'id' | 'dataCriacao'>) => Promise<PaymentRecord>;
  confirmPayment: (paymentId: string) => Promise<void>;
  
  // Automation Actions
  updateAutomations: (rules: AutomationRule[]) => Promise<void>;
  sendWhatsAppReminder: (client: Client, rule?: AutomationRule) => Promise<void>;
  
  // Settings Actions
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  restoreDatabase: (data: unknown) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [servers, setServers] = useState<ServerItem[]>(INITIAL_SERVERS);
  const [plans, setPlans] = useState<PlanItem[]>(INITIAL_PLANS);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [automations, setAutomations] = useState<AutomationRule[]>(INITIAL_AUTOMATIONS);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [user, setUser] = useState<UserAccount>(INITIAL_USER);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'notif-1',
      titulo: 'Boas-vindas ao Gerenciapró',
      mensagem: 'Painel Premium sincronizado com 28 clientes carregados com sucesso.',
      tipo: 'sucesso',
      data: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      lida: false
    },
    {
      id: 'notif-2',
      titulo: '18 Clientes em atraso',
      mensagem: 'Verifique a lista de Alertas Inteligentes no Dashboard para enviar lembretes.',
      tipo: 'alerta',
      data: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      lida: false
    }
  ]);

  // Load from backend on mount
  const refreshData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/bootstrap');
      if (res.ok) {
        const data = await res.json();
        if (data.clients) setClients(data.clients);
        if (data.servers) setServers(data.servers);
        if (data.plans) setPlans(data.plans);
        if (data.payments) setPayments(data.payments);
        if (data.automations) setAutomations(data.automations);
        if (data.notificationLogs) setNotificationLogs(data.notificationLogs);
        if (data.settings) setSettings(data.settings);
        if (data.user) setUser(data.user);
      }
    } catch (err) {
      console.warn('Backend sync failed, using local persistent fallback', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Sound trigger
  const playSound = (type?: 'beep' | 'sino' | 'urgente' | 'digital') => {
    if (!settings.soundEnabled) return;
    const soundType = type || settings.soundAlert || 'sino';
    soundEffects.playByType(soundType);
  };

  const toggleSound = () => {
    const updated = !settings.soundEnabled;
    updateSettings({ soundEnabled: updated });
    if (updated) {
      soundEffects.playByType(settings.soundAlert);
    }
  };

  const pushUndo = (description: string, undo: () => Promise<void>) => {
    setUndoStack(prev => [{ id: 'undo-' + Date.now(), description, undo }, ...prev.slice(0, 10)]);
  };

  const undoLastAction = async () => {
    if (undoStack.length === 0) return;
    const [action, ...remaining] = undoStack;
    setUndoStack(remaining);
    try {
      await action.undo();
      playSound('sino');
      setNotifications(prev => [
        {
          id: 'notif-' + Date.now(),
          titulo: 'Alteração desfeita',
          mensagem: `Ação revertida: ${action.description}`,
          tipo: 'info',
          data: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          lida: false
        },
        ...prev
      ]);
    } catch (err) {
      console.error('Error undoing action', err);
    }
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // --- CLIENT ACTIONS ---

  const addClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData)
      });
      const newClient = await res.json();
      setClients(prev => [newClient, ...prev]);

      // Push undo
      pushUndo(`Cadastro de ${newClient.nome}`, async () => {
        await deleteClient(newClient.id);
      });

      playSound('sino');
      return newClient;
    } finally {
      setIsSyncing(false);
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    setIsSyncing(true);
    const originalClient = clients.find(c => c.id === id);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const updated = await res.json();
      setClients(prev => prev.map(c => c.id === id ? updated : c));

      if (originalClient) {
        pushUndo(`Edição de ${originalClient.nome}`, async () => {
          await updateClient(id, originalClient);
        });
      }

      playSound('beep');
      return updated;
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteClient = async (id: string) => {
    const original = clients.find(c => c.id === id);
    if (!original) return;
    setIsSyncing(true);
    try {
      await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      setClients(prev => prev.filter(c => c.id !== id));

      pushUndo(`Exclusão de ${original.nome}`, async () => {
        await addClient(original);
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const bulkDeleteClients = async (ids: string[]) => {
    const originals = clients.filter(c => ids.includes(c.id));
    setIsSyncing(true);
    try {
      await fetch('/api/clients/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      setClients(prev => prev.filter(c => !ids.includes(c.id)));

      pushUndo(`Exclusão de ${ids.length} clientes`, async () => {
        for (const item of originals) {
          await addClient(item);
        }
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const renewClientPlan = async (clientId: string, novoVencimento: string, valor?: number, plano?: string, forma?: string) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/clients/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, novoVencimento, valor, plano, formaPagamento: forma })
      });
      const data = await res.json();
      if (data.client) {
        setClients(prev => prev.map(c => c.id === clientId ? data.client : c));
      }
      if (data.payment) {
        setPayments(prev => [data.payment, ...prev]);
      }
      playSound('sino');
      setNotifications(prev => [
        {
          id: 'notif-' + Date.now(),
          titulo: 'Plano Renovado!',
          mensagem: `${data.client.nome} teve o vencimento renovado para ${novoVencimento}`,
          tipo: 'sucesso',
          data: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          lida: false
        },
        ...prev
      ]);
    } finally {
      setIsSyncing(false);
    }
  };

  const importClientsBatch = async (imported: Partial<Client>[], mode: 'append' | 'replace' | 'update') => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/clients/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clients: imported, mode })
      });
      if (res.ok) {
        await refreshData();
        playSound('sino');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // --- SERVERS ---

  const addServer = async (nome: string, descricao = '') => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, descricao })
      });
      const newServer = await res.json();
      setServers(prev => [...prev, newServer]);
      playSound('sino');
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteServer = async (id: string) => {
    setIsSyncing(true);
    try {
      await fetch(`/api/servers/${id}`, { method: 'DELETE' });
      setServers(prev => prev.filter(s => s.id !== id));
    } finally {
      setIsSyncing(false);
    }
  };

  // --- PLANS ---

  const addPlan = async (planData: Omit<PlanItem, 'id'>) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData)
      });
      const newPlan = await res.json();
      setPlans(prev => [...prev, newPlan]);
      playSound('sino');
    } finally {
      setIsSyncing(false);
    }
  };

  const updatePlan = async (id: string, updates: Partial<PlanItem>) => {
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const updated = await res.json();
      setPlans(prev => prev.map(p => p.id === id ? updated : p));
      playSound('beep');
    } finally {
      setIsSyncing(false);
    }
  };

  const deletePlan = async (id: string) => {
    setIsSyncing(true);
    try {
      await fetch(`/api/plans/${id}`, { method: 'DELETE' });
      setPlans(prev => prev.filter(p => p.id !== id));
    } finally {
      setIsSyncing(false);
    }
  };

  // --- PAYMENTS ---

  const addPayment = async (paymentData: Omit<PaymentRecord, 'id' | 'dataCriacao'>) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });
      const created = await res.json();
      setPayments(prev => [created, ...prev]);
      playSound('sino');
      return created;
    } finally {
      setIsSyncing(false);
    }
  };

  const confirmPayment = async (paymentId: string) => {
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}/confirm`, { method: 'POST' });
      const data = await res.json();
      if (data.payment) {
        setPayments(prev => prev.map(p => p.id === paymentId ? data.payment : p));
      }
      if (data.client) {
        setClients(prev => prev.map(c => c.id === data.client.id ? data.client : c));
      }
      playSound('sino');
    } finally {
      setIsSyncing(false);
    }
  };

  // --- AUTOMATIONS & WHATSAPP ---

  const updateAutomations = async (rules: AutomationRule[]) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/automations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rules)
      });
      const updated = await res.json();
      setAutomations(updated);
      playSound('sino');
    } finally {
      setIsSyncing(false);
    }
  };

  const sendWhatsAppReminder = async (client: Client, rule?: AutomationRule) => {
    const selectedPlan = plans.find(p => p.nome.toLowerCase() === client.plano.toLowerCase()) || plans[0];
    const pixCode = selectedPlan?.chavePix || settings.adminWhatsapp;
    const linkCobranca = selectedPlan?.linkCobranca || settings.contatoUrl;

    const defaultTemplate = rule?.mensagemTemplate || 
      'Olá {nome}! Seu plano {plano} no Gerenciapró vence em {vencimento} no valor de R$ {valor}. Renove via Pix: {pix} ou link: {link}';

    const msg = defaultTemplate
      .replace(/{nome}/g, client.nome)
      .replace(/{plano}/g, client.plano)
      .replace(/{vencimento}/g, client.vencimento)
      .replace(/{valor}/g, Number(client.valor).toFixed(2))
      .replace(/{pix}/g, pixCode)
      .replace(/{link}/g, linkCobranca);

    const cleanPhone = client.whatsapp.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`;

    // Open WhatsApp link in tab/window
    window.open(url, '_blank', 'noopener,noreferrer');

    // Register log in backend
    try {
      const logRes = await fetch('/api/automations/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: client.id,
          clienteNome: client.nome,
          clienteWhatsapp: client.whatsapp,
          tipo: rule?.tipo || 'cobranca_manual',
          status: 'enviado',
          mensagem: msg
        })
      });
      if (logRes.ok) {
        const newLog = await logRes.json();
        setNotificationLogs(prev => [newLog, ...prev]);
      }
    } catch {
      // ignore
    }

    playSound('beep');
    setNotifications(prev => [
      {
        id: 'notif-' + Date.now(),
        titulo: 'WhatsApp Aberto',
        mensagem: `Mensagem de cobrança enviada para ${client.nome} (${client.whatsapp})`,
        tipo: 'sucesso',
        data: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        lida: false
      },
      ...prev
    ]);
  };

  // --- SETTINGS ---

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      const updated = await res.json();
      setSettings(prev => ({ ...prev, ...updated }));
    } finally {
      setIsSyncing(false);
    }
  };

  const restoreDatabase = async (data: unknown) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        await refreshData();
        playSound('sino');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        searchQuery,
        setSearchQuery,
        clients,
        servers,
        plans,
        payments,
        automations,
        notificationLogs,
        settings,
        user,
        notifications,
        markNotificationAsRead,
        clearNotifications,
        canUndo: undoStack.length > 0,
        undoLastAction,
        undoDescription: undoStack[0]?.description || null,
        isSyncing,
        refreshData,
        playSound,
        toggleSound,
        addClient,
        updateClient,
        deleteClient,
        bulkDeleteClients,
        renewClientPlan,
        importClientsBatch,
        addServer,
        deleteServer,
        addPlan,
        updatePlan,
        deletePlan,
        addPayment,
        confirmPayment,
        updateAutomations,
        sendWhatsAppReminder,
        updateSettings,
        restoreDatabase
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
