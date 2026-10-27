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
  AppNotification,
  BillingConfig,
  AlertScheduleConfig,
  PaymentMethodItem,
  MessageTemplate,
  ServerDeposit
} from '../types';
import {
  INITIAL_CLIENTS,
  INITIAL_SERVERS,
  INITIAL_PLANS,
  INITIAL_AUTOMATIONS,
  INITIAL_SETTINGS,
  INITIAL_USER,
  INITIAL_PAYMENT_METHODS,
  INITIAL_MESSAGE_TEMPLATES,
  INITIAL_SERVER_DEPOSITS
} from '../data/initialData';
import { soundEffects } from '../utils/audio';
import {
  checkClientsDueAlerts,
  sendBrowserNotification,
  isNotificationSupported
} from '../utils/notifications';
import { getUpcomingBirthdays } from '../utils/birthdays';

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
  updateUser: (u: Partial<UserAccount>) => void;
  
  // Toast & Quick Copy
  toastMessage: string | null;
  showToast: (msg: string) => void;
  copyClientField: (fieldName: string, value: string) => void;
  copyClientFullCredentials: (client: Client) => void;
  
  // Direct client open
  activeClientIdToOpen: string | null;
  setActiveClientIdToOpen: (id: string | null) => void;

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
  updateClientPhoto: (id: string, fotoUrl?: string) => Promise<void>;
  toggleClientStatus: (id: string) => Promise<void>;
  archiveClient: (id: string) => Promise<void>;
  unarchiveClient: (id: string) => Promise<void>;
  archiveExpiredClients: () => Promise<number>;
  bulkArchiveClients: (ids: string[], arquivado: boolean) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  bulkDeleteClients: (ids: string[]) => Promise<void>;
  renewClientPlan: (clientId: string, novoVencimento: string, valor?: number, plano?: string, forma?: string) => Promise<void>;
  importClientsBatch: (imported: Partial<Client>[], mode: 'append' | 'replace' | 'update') => Promise<void>;
  
  // Server Actions
  addServer: (nome: string, descricao?: string) => Promise<void>;
  updateServer: (id: string, updates: Partial<ServerItem>) => Promise<void>;
  deleteServer: (id: string) => Promise<void>;
  serverDeposits: ServerDeposit[];
  addServerDeposit: (deposit: Omit<ServerDeposit, 'id' | 'createdAt'>) => Promise<ServerDeposit>;
  deleteServerDeposit: (id: string) => Promise<void>;
  
  // Plan Actions
  addPlan: (plan: Omit<PlanItem, 'id'>) => Promise<void>;
  updatePlan: (id: string, updates: Partial<PlanItem>) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  
  // Payment Actions
  addPayment: (payment: Omit<PaymentRecord, 'id' | 'dataCriacao'>) => Promise<PaymentRecord>;
  confirmPayment: (paymentId: string) => Promise<void>;

  // Payment Methods Actions
  paymentMethods: PaymentMethodItem[];
  addPaymentMethod: (method: Omit<PaymentMethodItem, 'id'>) => Promise<PaymentMethodItem>;
  updatePaymentMethod: (id: string, updates: Partial<PaymentMethodItem>) => Promise<void>;
  deletePaymentMethod: (id: string) => Promise<void>;
  setDefaultPaymentMethod: (id: string) => Promise<void>;
  togglePaymentMethod: (id: string) => Promise<void>;

  // Message Templates Actions
  messageTemplates: MessageTemplate[];
  addMessageTemplate: (template: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<MessageTemplate>;
  updateMessageTemplate: (id: string, updates: Partial<MessageTemplate>) => Promise<void>;
  deleteMessageTemplate: (id: string) => Promise<void>;
  duplicateMessageTemplate: (id: string) => Promise<MessageTemplate>;
  restoreDefaultTemplates: () => Promise<void>;
  renderMessageTemplate: (templateContent: string, client: Partial<Client>, paymentMethod?: PaymentMethodItem) => string;
  
  // Automation Actions
  updateAutomations: (rules: AutomationRule[]) => Promise<void>;
  sendWhatsAppReminder: (client: Client, rule?: AutomationRule) => Promise<void>;
  
  // Settings Actions
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  updateBillingConfig: (billingConfig: Partial<BillingConfig>) => Promise<void>;
  updateAlertSchedule: (alertSchedule: Partial<AlertScheduleConfig>) => Promise<void>;
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
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>(INITIAL_PAYMENT_METHODS);
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>(INITIAL_MESSAGE_TEMPLATES);
  const [serverDeposits, setServerDeposits] = useState<ServerDeposit[]>(INITIAL_SERVER_DEPOSITS);
  const [automations, setAutomations] = useState<AutomationRule[]>(INITIAL_AUTOMATIONS);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [user, setUser] = useState<UserAccount>(INITIAL_USER);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeClientIdToOpen, setActiveClientIdToOpen] = useState<string | null>(null);

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

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 2400);
  }, []);

  // Quick Copy Helper with discreet feedback (silent as requested)
  const copyClientField = useCallback((fieldName: string, value: string) => {
    if (!value) {
      showToast(`${fieldName} está vazio`);
      return;
    }
    navigator.clipboard.writeText(value);
    showToast(`${fieldName} copiado!`);
  }, [showToast]);

  // Copy Full Client Access Credentials (silent as requested)
  const copyClientFullCredentials = useCallback((client: Client) => {
    const credText = [
      `🎬 *GERENCIAPRÓ — DADOS DE ACESSO*`,
      `👤 *Cliente:* ${client.nome}`,
      `📡 *Servidor:* ${client.servidor || 'Cine Hub'}`,
      `📱 *Aplicativo:* ${client.aplicativo || 'XCIPTV'}`,
      client.usuarioDisp ? `🔐 *Usuário:* ${client.usuarioDisp}` : '',
      client.senhaDisp ? `🔑 *Senha:* ${client.senhaDisp}` : '',
      client.mac ? `📟 *Endereço MAC:* ${client.mac}` : '',
      client.senhaMac ? `🔑 *Senha MAC:* ${client.senhaMac}` : '',
      `📅 *Vencimento:* ${client.vencimento}`,
      `💰 *Plano:* ${client.plano} (R$ ${Number(client.valor).toFixed(2)})`,
      `⚡ *Status:* ${client.status}`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `Bom entretenimento!`
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(credText);
    showToast('Ficha e credenciais completas copiadas!');
  }, [showToast]);

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
        if (data.paymentMethods) setPaymentMethods(data.paymentMethods);
        if (data.messageTemplates) setMessageTemplates(data.messageTemplates);
        if (data.serverDeposits) setServerDeposits(data.serverDeposits);
        if (data.automations) setAutomations(data.automations);
        if (data.notificationLogs) setNotificationLogs(data.notificationLogs);
        if (data.settings) {
          // Merge with defaults to ensure billingConfig and alertSchedule exist
          setSettings({
            ...INITIAL_SETTINGS,
            ...data.settings,
            billingConfig: {
              ...INITIAL_SETTINGS.billingConfig,
              ...(data.settings.billingConfig || {})
            },
            alertSchedule: {
              ...INITIAL_SETTINGS.alertSchedule,
              ...(data.settings.alertSchedule || {})
            }
          });
        }
        if (data.user) setUser(data.user);

        // Check alerts and notify if permissions granted
        if (data.clients && data.settings?.alertSchedule?.pushEnabled) {
          const alerts = checkClientsDueAlerts(data.clients, data.settings.alertSchedule);
          if (alerts.length > 0) {
            alerts.slice(0, 2).forEach(a => {
              sendBrowserNotification(`🚨 ${a.client.nome} (${a.diasTexto})`, {
                body: a.mensagem,
                clientUrl: `#client-${a.client.id}`
              });
            });
          }
        }

        // Check birthdays (today or within 7 days) and register alerts
        if (data.clients) {
          const bdays = getUpcomingBirthdays(data.clients);
          if (bdays.length > 0) {
            const bdayNotifs: AppNotification[] = bdays.map(({ client, info }) => ({
              id: `bday-${client.id}-${info.dataTexto}`,
              titulo: info.isToday ? `🎂 Aniversário Hoje: ${client.nome}!` : `🎉 Aniversário Chegando: ${client.nome}`,
              mensagem: info.isToday
                ? `${client.nome} comemora aniversário hoje (${info.dataTexto})! Aproveite para enviar uma mensagem carinhosa e um brinde especial.`
                : `${client.nome} faz aniversário em ${info.daysUntil} dia(s) (${info.dataTexto}). Que tal preparar um desconto ou brinde exclusivo?`,
              tipo: 'sucesso',
              data: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              lida: false
            }));
            setNotifications(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const fresh = bdayNotifs.filter(b => !existingIds.has(b.id));
              return [...fresh, ...prev];
            });
          }
        }
      }
    } catch (err) {
      console.warn('Backend sync failed, using local persistent fallback', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
    try {
      const savedSession = localStorage.getItem('gerenciapro_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        setUser(prev => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.warn('Session parse error', e);
    }
  }, [refreshData]);

  const updateUser = useCallback((u: Partial<UserAccount>) => {
    setUser(prev => {
      const updated = { ...prev, ...u };
      try {
        localStorage.setItem('gerenciapro_session', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

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
      showToast(`Desfeito: ${action.description}`);
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

      pushUndo(`Cadastro de ${newClient.nome}`, async () => {
        await deleteClient(newClient.id);
      });

      playSound('sino');
      showToast(`Cliente ${newClient.nome} cadastrado!`);
      return newClient;
    } finally {
      setIsSyncing(false);
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    setIsSyncing(true);
    const originalClient = clients.find(c => c.id === id);
    // Optimistic update so UI reflects immediately
    const optimisticClient = originalClient
      ? { ...originalClient, ...updates, updatedAt: new Date().toISOString() }
      : ({ id, ...updates, updatedAt: new Date().toISOString() } as Client);
    
    setClients(prev => prev.map(c => c.id === id ? optimisticClient : c));

    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const updated = await res.json();
        setClients(prev => prev.map(c => c.id === id ? updated : c));
        playSound('beep');
        showToast(`Dados de ${updated.nome} salvos com sucesso!`);
        return updated;
      }
    } catch (err) {
      console.warn('Erro ao sincronizar com o servidor:', err);
    } finally {
      setIsSyncing(false);
    }

    playSound('beep');
    showToast(`Alterações de ${optimisticClient.nome} salvas!`);
    return optimisticClient;
  };

  const updateClientPhoto = async (id: string, fotoUrl?: string) => {
    await updateClient(id, { fotoUrl });
    showToast(fotoUrl ? 'Foto do cliente atualizada!' : 'Foto removida!');
  };

  const toggleClientStatus = async (id: string) => {
    const client = clients.find(c => c.id === id);
    if (!client) return;
    const newStatus = client.status === 'Suspenso' ? 'Em dia' : 'Suspenso';
    await updateClient(id, { status: newStatus });
    showToast(`Status alterado para: ${newStatus}`);
  };

  const archiveClient = async (id: string) => {
    await updateClient(id, { arquivado: true });
    showToast('Cliente movido para pasta de Inativos/Arquivados');
  };

  const unarchiveClient = async (id: string) => {
    await updateClient(id, { arquivado: false });
    showToast('Cliente restaurado para pasta de Ativos!');
  };

  const archiveExpiredClients = async (): Promise<number> => {
    const expired = clients.filter(c => !c.arquivado && (c.status === 'Em atraso' || c.status === 'Suspenso' || c.status === 'Cancelado'));
    if (expired.length === 0) {
      showToast('Nenhum cliente expirado para arquivar.');
      return 0;
    }
    setIsSyncing(true);
    try {
      for (const cl of expired) {
        await fetch(`/api/clients/${cl.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ arquivado: true })
        });
      }
      setClients(prev => prev.map(c => expired.some(e => e.id === c.id) ? { ...c, arquivado: true } : c));
      showToast(`${expired.length} clientes expirados arquivados com sucesso!`);
      return expired.length;
    } finally {
      setIsSyncing(false);
    }
  };

  const bulkArchiveClients = async (ids: string[], arquivado: boolean) => {
    if (ids.length === 0) return;
    setIsSyncing(true);
    try {
      for (const id of ids) {
        await fetch(`/api/clients/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ arquivado })
        });
      }
      setClients(prev => prev.map(c => ids.includes(c.id) ? { ...c, arquivado } : c));
      playSound('sino');
      showToast(
        arquivado
          ? `${ids.length} cliente(s) movido(s) para Cliente inativos!`
          : `${ids.length} cliente(s) reativado(s) para Clientes Ativos!`
      );
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
      showToast(`Cliente ${original.nome} excluído!`);
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
      showToast(`${ids.length} clientes excluídos!`);
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
      showToast(`Plano de ${data.client.nome} renovado até ${novoVencimento}!`);
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
        showToast(`${imported.length} clientes importados com sucesso!`);
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
      showToast(`Servidor ${newServer.nome} adicionado!`);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteServer = async (id: string) => {
    setIsSyncing(true);
    try {
      await fetch(`/api/servers/${id}`, { method: 'DELETE' });
      setServers(prev => prev.filter(s => s.id !== id));
      showToast('Servidor removido!');
    } finally {
      setIsSyncing(false);
    }
  };

  const updateServer = async (id: string, updates: Partial<ServerItem>) => {
    setIsSyncing(true);
    setServers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    try {
      const res = await fetch(`/api/servers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const updated = await res.json();
        setServers(prev => prev.map(s => s.id === id ? updated : s));
      }
      playSound('beep');
      showToast('Configurações do servidor atualizadas!');
    } catch {
      showToast('Configurações salvas localmente!');
    } finally {
      setIsSyncing(false);
    }
  };

  const addServerDeposit = async (depositData: Omit<ServerDeposit, 'id' | 'createdAt'>) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/server-deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(depositData)
      });
      const created = await res.json();
      setServerDeposits(prev => [created, ...prev]);
      playSound('sino');
      showToast(`Investimento de R$ ${Number(created.valor).toFixed(2)} registrado!`);
      return created;
    } catch (err) {
      const fallback: ServerDeposit = {
        ...depositData,
        id: 'dep-' + Date.now(),
        createdAt: new Date().toISOString()
      };
      setServerDeposits(prev => [fallback, ...prev]);
      playSound('sino');
      showToast(`Investimento de R$ ${Number(fallback.valor).toFixed(2)} registrado!`);
      return fallback;
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteServerDeposit = async (id: string) => {
    setIsSyncing(true);
    try {
      await fetch(`/api/server-deposits/${id}`, { method: 'DELETE' });
      setServerDeposits(prev => prev.filter(d => d.id !== id));
      showToast('Registro de depósito removido!');
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
      showToast(`Plano ${newPlan.nome} adicionado!`);
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
      showToast(`Plano ${updated.nome} atualizado!`);
    } finally {
      setIsSyncing(false);
    }
  };

  const deletePlan = async (id: string) => {
    setIsSyncing(true);
    try {
      await fetch(`/api/plans/${id}`, { method: 'DELETE' });
      setPlans(prev => prev.filter(p => p.id !== id));
      showToast('Plano removido!');
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
      showToast(`Cobrança de R$ ${Number(created.valorFinal).toFixed(2)} emitida!`);
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
      showToast('Pagamento confirmado e cliente regularizado!');
    } finally {
      setIsSyncing(false);
    }
  };

  // --- FORMAS DE PAGAMENTO (Payment Methods) ---

  const addPaymentMethod = async (methodData: Omit<PaymentMethodItem, 'id'>) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(methodData)
      });
      const created = await res.json();
      setPaymentMethods(prev => {
        if (created.isDefault) {
          return [created, ...prev.map(m => ({ ...m, isDefault: false }))];
        }
        return [...prev, created];
      });
      playSound('sino');
      showToast(`Forma de pagamento "${created.nome}" cadastrada!`);
      return created;
    } finally {
      setIsSyncing(false);
    }
  };

  const updatePaymentMethod = async (id: string, updates: Partial<PaymentMethodItem>) => {
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/payment-methods/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const updated = await res.json();
      setPaymentMethods(prev => prev.map(m => {
        if (m.id === id) return updated;
        if (updates.isDefault) return { ...m, isDefault: false };
        return m;
      }));
      playSound('sino');
      showToast('Forma de pagamento atualizada!');
    } finally {
      setIsSyncing(false);
    }
  };

  const deletePaymentMethod = async (id: string) => {
    setIsSyncing(true);
    try {
      await fetch(`/api/payment-methods/${id}`, { method: 'DELETE' });
      setPaymentMethods(prev => prev.filter(m => m.id !== id));
      showToast('Forma de pagamento removida!');
    } finally {
      setIsSyncing(false);
    }
  };

  const setDefaultPaymentMethod = async (id: string) => {
    await updatePaymentMethod(id, { isDefault: true, ativo: true });
    showToast('Forma de pagamento definida como padrão!');
  };

  const togglePaymentMethod = async (id: string) => {
    const item = paymentMethods.find(m => m.id === id);
    if (!item) return;
    await updatePaymentMethod(id, { ativo: !item.ativo });
  };

  // --- MODELOS DE MENSAGENS (Message Templates) ---

  const addMessageTemplate = async (tmplData: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/message-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tmplData)
      });
      const created = await res.json();
      setMessageTemplates(prev => [created, ...prev]);
      playSound('sino');
      showToast(`Modelo "${created.nome}" criado com sucesso!`);
      return created;
    } finally {
      setIsSyncing(false);
    }
  };

  const updateMessageTemplate = async (id: string, updates: Partial<MessageTemplate>) => {
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/message-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const updated = await res.json();
      setMessageTemplates(prev => prev.map(t => t.id === id ? updated : t));
      playSound('sino');
      showToast('Modelo de mensagem salvo!');
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteMessageTemplate = async (id: string) => {
    setIsSyncing(true);
    try {
      await fetch(`/api/message-templates/${id}`, { method: 'DELETE' });
      setMessageTemplates(prev => prev.filter(t => t.id !== id));
      showToast('Modelo de mensagem excluído!');
    } finally {
      setIsSyncing(false);
    }
  };

  const duplicateMessageTemplate = async (id: string) => {
    const source = messageTemplates.find(t => t.id === id);
    if (!source) throw new Error('Modelo não encontrado');
    return await addMessageTemplate({
      nome: `${source.nome} (Cópia)`,
      categoria: source.categoria,
      categoriaNome: source.categoriaNome,
      plano: source.plano,
      formaPagamentoId: source.formaPagamentoId,
      conteudo: source.conteudo,
      isDefault: false
    });
  };

  const restoreDefaultTemplates = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/message-templates/restore', { method: 'POST' });
      const data = await res.json();
      if (data.templates) {
        setMessageTemplates(data.templates);
      }
      playSound('sino');
      showToast('7 modelos profissionais restaurados com sucesso!');
    } finally {
      setIsSyncing(false);
    }
  };

  const renderMessageTemplate = useCallback((templateContent: string, client: Partial<Client>, customMethod?: PaymentMethodItem): string => {
    const defaultMethod = paymentMethods.find(m => m.isDefault && m.ativo) || paymentMethods.find(m => m.ativo) || paymentMethods[0];
    const method = customMethod || defaultMethod;
    
    // Pix key: first active pix method or billingConfig
    const activePix = paymentMethods.find(m => m.tipo.startsWith('pix') && m.ativo);
    const chavePix = activePix ? activePix.chaveOuLink : (settings.billingConfig?.chavePix || 'e4447e6e-1cef-4c99-a120-039875053ed5');
    
    // Mercado Pago link: first active mercadopago or billingConfig
    const activeMp = paymentMethods.find(m => m.tipo === 'mercadopago' && m.ativo);
    const linkPagamento = activeMp?.chaveOuLink || settings.billingConfig?.linkPagamento || '';

    const beneficiario = method?.beneficiario || settings.billingConfig?.beneficiario || 'Gerenciapró — Movieplay';
    
    let formaDetalhe = '';
    if (method) {
      if (method.tipo.startsWith('pix')) {
        formaDetalhe = `🔑 *Chave Pix (${method.nome}):*\n\`${method.chaveOuLink}\`\n👤 *Beneficiário:* ${beneficiario}`;
      } else if (method.tipo === 'mercadopago') {
        formaDetalhe = method.chaveOuLink 
          ? `💳 *Link de Pagamento Mercado Pago:*\n${method.chaveOuLink}`
          : `🔑 *Chave Pix:* \`${chavePix}\`\n👤 *Beneficiário:* ${beneficiario}`;
      } else {
        formaDetalhe = `💰 *Forma de Pagamento (${method.nome}):*\n${method.chaveOuLink}`;
      }
    } else {
      formaDetalhe = `🔑 *Chave Pix:*\n\`${chavePix}\`\n👤 *Beneficiário:* ${beneficiario}`;
    }

    return (templateContent || '')
      .replace(/{{nome}}|{nome}/gi, client.nome || '')
      .replace(/{{plano}}|{plano}/gi, client.plano || 'Mensal')
      .replace(/{{valor}}|{valor}/gi, Number(client.valor || 20).toFixed(2))
      .replace(/{{vencimento}}|{vencimento}/gi, client.vencimento || '')
      .replace(/{{chave_pix}}|{chave_pix}|{{pix}}|{pix}/gi, chavePix)
      .replace(/{{link_pagamento}}|{link_pagamento}|{{link}}|{link}/gi, linkPagamento || 'Solicite o link atualizado')
      .replace(/{{forma_pagamento_detalhe}}|{forma_pagamento_detalhe}|{{forma_pagamento_info}}|{forma_pagamento_info}/gi, formaDetalhe)
      .replace(/{{beneficiario}}|{beneficiario}/gi, beneficiario)
      .replace(/{{servidor}}|{servidor}/gi, client.servidor || 'Cine Hub')
      .replace(/{{aplicativo}}|{aplicativo}/gi, client.aplicativo || 'XCIPTV')
      .replace(/{{usuario}}|{usuario}|{{usuariodisp}}|{usuariodisp}/gi, client.usuarioDisp || '')
      .replace(/{{senha}}|{senha}|{{senhadisp}}|{senhadisp}/gi, client.senhaDisp || '')
      .replace(/{{mac}}|{mac}/gi, client.mac || '')
      .replace(/{{whatsapp}}|{whatsapp}/gi, client.whatsapp || client.celular || '');
  }, [paymentMethods, settings.billingConfig]);

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
      showToast('Regras de automação atualizadas!');
    } finally {
      setIsSyncing(false);
    }
  };

  const sendWhatsAppReminder = async (client: Client, rule?: AutomationRule) => {
    const selectedPlan = plans.find(p => p.nome.toLowerCase() === client.plano.toLowerCase()) || plans[0];
    const pixCode = settings.billingConfig?.chavePix || selectedPlan?.chavePix || settings.adminWhatsapp;
    const linkCobranca = settings.billingConfig?.linkPagamento || selectedPlan?.linkCobranca || settings.contatoUrl;

    const template = rule?.mensagemTemplate || settings.billingConfig?.mensagemCobrancaTemplate ||
      'Olá, {{nome}}! Tudo bem? Seu plano {{plano}} tem vencimento em {{vencimento}}. O valor para renovação é R$ {{valor}}.\n\nVocê pode realizar o pagamento pelo link abaixo:\n{{link_pagamento}}\n\nOu utilize a chave Pix:\n{{chave_pix}}';

    // Replace both double and single curly braces
    const msg = template
      .replace(/{{nome}}|{nome}/gi, client.nome)
      .replace(/{{plano}}|{plano}/gi, client.plano)
      .replace(/{{vencimento}}|{vencimento}/gi, client.vencimento)
      .replace(/{{valor}}|{valor}/gi, Number(client.valor).toFixed(2))
      .replace(/{{chave_pix}}|{{pix}}|{pix}/gi, pixCode)
      .replace(/{{link_pagamento}}|{{link}}|{link}/gi, linkCobranca);

    const cleanPhone = (client.whatsapp || client.celular || '').replace(/\D/g, '');
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
          tipo: rule?.tipo || 'cobranca_personalizada',
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
    showToast(`WhatsApp aberto para ${client.nome}!`);
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

  const updateBillingConfig = async (billingConfig: Partial<BillingConfig>) => {
    const currentBilling = settings.billingConfig || INITIAL_SETTINGS.billingConfig!;
    const merged = { ...currentBilling, ...billingConfig };
    await updateSettings({ billingConfig: merged });
    showToast('Configurações de cobrança salvas!');
  };

  const updateAlertSchedule = async (alertSchedule: Partial<AlertScheduleConfig>) => {
    const currentSchedule = settings.alertSchedule || INITIAL_SETTINGS.alertSchedule!;
    const merged = { ...currentSchedule, ...alertSchedule };
    await updateSettings({ alertSchedule: merged });
    showToast('Preferências de alertas salvas!');
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
        showToast('Backup restaurado com sucesso!');
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
        toastMessage,
        showToast,
        copyClientField,
        copyClientFullCredentials,
        activeClientIdToOpen,
        setActiveClientIdToOpen,
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
        updateClientPhoto,
        toggleClientStatus,
        archiveClient,
        unarchiveClient,
        archiveExpiredClients,
        bulkArchiveClients,
        deleteClient,
        bulkDeleteClients,
        renewClientPlan,
        importClientsBatch,
        addServer,
        updateServer,
        deleteServer,
        serverDeposits,
        addServerDeposit,
        deleteServerDeposit,
        addPlan,
        updatePlan,
        deletePlan,
        addPayment,
        confirmPayment,
        paymentMethods,
        addPaymentMethod,
        updatePaymentMethod,
        deletePaymentMethod,
        setDefaultPaymentMethod,
        togglePaymentMethod,
        messageTemplates,
        addMessageTemplate,
        updateMessageTemplate,
        deleteMessageTemplate,
        duplicateMessageTemplate,
        restoreDefaultTemplates,
        renderMessageTemplate,
        updateAutomations,
        sendWhatsAppReminder,
        updateSettings,
        updateBillingConfig,
        updateAlertSchedule,
        restoreDatabase,
        updateUser
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
