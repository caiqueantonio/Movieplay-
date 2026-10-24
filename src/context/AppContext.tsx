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
  AlertScheduleConfig
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
      showToast(`Dados de ${updated.nome} atualizados!`);
      return updated;
    } finally {
      setIsSyncing(false);
    }
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
        deleteServer,
        addPlan,
        updatePlan,
        deletePlan,
        addPayment,
        confirmPayment,
        updateAutomations,
        sendWhatsAppReminder,
        updateSettings,
        updateBillingConfig,
        updateAlertSchedule,
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
