import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
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
} from './src/data/initialData.ts';
import {
  Client,
  ServerItem,
  ServerDeposit,
  PlanItem,
  PaymentRecord,
  AutomationRule,
  AppSettings,
  UserAccount,
  NotificationLog,
  PaymentMethodItem,
  MessageTemplate,
  PushDeviceSubscription,
  SentAlertRecord
} from './src/types/index.ts';
import webpush from 'web-push';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DatabaseSchema {
  clients: Client[];
  servers: ServerItem[];
  plans: PlanItem[];
  payments: PaymentRecord[];
  paymentMethods: PaymentMethodItem[];
  messageTemplates: MessageTemplate[];
  serverDeposits: ServerDeposit[];
  automations: AutomationRule[];
  notificationLogs: NotificationLog[];
  settings: AppSettings;
  user: UserAccount;
  auditLogs: Array<{ id: string; timestamp: string; usuario: string; acao: string; detalhes: string }>;
  pushSubscriptions?: PushDeviceSubscription[];
  sentAlertHistory?: SentAlertRecord[];
  vapidKeys?: {
    publicKey: string;
    privateKey: string;
  };
}

// Ensure data folder and db file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadDatabase(): DatabaseSchema {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (!parsed.paymentMethods || parsed.paymentMethods.length === 0) {
        parsed.paymentMethods = INITIAL_PAYMENT_METHODS;
      }
      if (!parsed.messageTemplates || parsed.messageTemplates.length === 0) {
        parsed.messageTemplates = INITIAL_MESSAGE_TEMPLATES;
      }
      if (!parsed.serverDeposits || parsed.serverDeposits.length === 0) {
        parsed.serverDeposits = INITIAL_SERVER_DEPOSITS;
      }
      // Ensure servers have links if missing
      if (parsed.servers && parsed.servers.length > 0) {
        parsed.servers = parsed.servers.map((s: any) => {
          const match = INITIAL_SERVERS.find((is: any) => is.nome.toLowerCase() === s.nome.toLowerCase());
          return {
            ...s,
            linkAcesso: s.linkAcesso || match?.linkAcesso || '',
            corTema: s.corTema || match?.corTema || '#ef4444'
          };
        });
      }
      if (!parsed.pushSubscriptions) {
        parsed.pushSubscriptions = [];
      }
      if (!parsed.sentAlertHistory) {
        parsed.sentAlertHistory = [];
      }
      return parsed;
    } catch (err) {
      console.error('Error reading db.json, re-initializing', err);
    }
  }

  // Generate initial payments matching clients
  const initialPayments: PaymentRecord[] = [
    {
      id: 'pay-01',
      clienteId: 'cli-19',
      clienteNome: 'Beto vaqueiro',
      planoNome: 'Mensal',
      valorOriginal: 20.00,
      desconto: 0,
      valorFinal: 20.00,
      dataCriacao: '2026-09-19',
      dataVencimento: '2026-10-19',
      formaPagamento: 'pix',
      status: 'pago',
      dataConfirmacao: '2026-09-19',
      transacaoId: 'PIX-99827101',
      observacoes: 'Renovação mensal confirmada via Pix'
    },
    {
      id: 'pay-02',
      clienteId: 'cli-24',
      clienteNome: 'Gordin',
      planoNome: 'Anual',
      valorOriginal: 150.00,
      desconto: 0,
      valorFinal: 150.00,
      dataCriacao: '2025-12-12',
      dataVencimento: '2026-12-12',
      formaPagamento: 'pix',
      status: 'pago',
      dataConfirmacao: '2025-12-12',
      transacaoId: 'PIX-11223344',
      observacoes: 'Assinatura anual'
    }
  ];

  const defaultDb: DatabaseSchema = {
    clients: INITIAL_CLIENTS,
    servers: INITIAL_SERVERS,
    plans: INITIAL_PLANS,
    payments: initialPayments,
    paymentMethods: INITIAL_PAYMENT_METHODS,
    messageTemplates: INITIAL_MESSAGE_TEMPLATES,
    serverDeposits: INITIAL_SERVER_DEPOSITS,
    automations: INITIAL_AUTOMATIONS,
    notificationLogs: [],
    settings: INITIAL_SETTINGS,
    user: INITIAL_USER,
    auditLogs: [
      {
        id: 'aud-01',
        timestamp: new Date().toISOString(),
        usuario: 'Caique Antonio',
        acao: 'Sistema Inicializado',
        detalhes: 'Base de dados carregada com 28 clientes, servidores e planos'
      }
    ]
  };

  saveDatabase(defaultDb);
  return defaultDb;
}

function saveDatabase(db: DatabaseSchema) {
  try {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tmp, DB_FILE);
  } catch (err) {
    console.error('Error saving db.json atomically, trying direct write:', err);
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    } catch (directErr) {
      console.error('Direct write also failed:', directErr);
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  let db = loadDatabase();

  // Initialize Persistent VAPID Keys for Web Push / FCM
  if (!db.vapidKeys || !db.vapidKeys.publicKey || !db.vapidKeys.privateKey) {
    const generatedKeys = webpush.generateVAPIDKeys();
    db.vapidKeys = generatedKeys;
    saveDatabase(db);
    console.log('🔑 Novas chaves VAPID geradas e salvas com sucesso em db.json');
  }

  try {
    webpush.setVapidDetails(
      'mailto:contato@gerenciapro.com.br',
      db.vapidKeys.publicKey,
      db.vapidKeys.privateKey
    );
  } catch (err) {
    console.error('Falha ao configurar VAPID details:', err);
  }

  // Date parsing helper supporting DD/MM/YYYY and YYYY-MM-DD
  const parseServerDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
    } else if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const getDaysDiff = (targetDateStr: string, refDate = new Date()): number => {
    const d = parseServerDate(targetDateStr);
    if (!d) return 0;
    const targetMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const refMidnight = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate()).getTime();
    const diffMs = refMidnight - targetMidnight;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  // Dispatch Web Push to all registered and active devices
  const sendWebPushToDevices = async (
    payload: {
      title: string;
      body: string;
      icon?: string;
      badge?: string;
      data?: any;
      tag?: string;
    }
  ): Promise<number> => {
    if (!db.pushSubscriptions || db.pushSubscriptions.length === 0) {
      return 0;
    }

    const payloadString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/logo.svg',
      badge: payload.badge || '/logo.svg',
      data: payload.data || { url: '/' },
      tag: payload.tag || `push-${Date.now()}`
    });

    let sentCount = 0;
    const expiredEndpoints: string[] = [];

    for (const sub of db.pushSubscriptions) {
      if (!sub.ativo) continue;
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys
          },
          payloadString
        );
        sentCount++;
        sub.lastActiveAt = new Date().toISOString();
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          expiredEndpoints.push(sub.endpoint);
        } else {
          console.warn(`[WebPush] Erro ao enviar para ${sub.deviceName}:`, err.message);
        }
      }
    }

    if (expiredEndpoints.length > 0) {
      db.pushSubscriptions = db.pushSubscriptions.filter(s => !expiredEndpoints.includes(s.endpoint));
      saveDatabase(db);
    }

    return sentCount;
  };

  // Automated Due Dates Dispatcher with Deduplication
  const dispatchDueAlerts = async (): Promise<number> => {
    if (!db.settings?.alertSchedule?.pushEnabled) {
      return 0;
    }

    const schedule = db.settings.alertSchedule;
    const todayStr = new Date().toISOString().split('T')[0];
    if (!db.sentAlertHistory) db.sentAlertHistory = [];

    let dispatched = 0;

    for (const client of db.clients) {
      if (client.arquivado) continue;
      if (!client.vencimento) continue;

      const daysDiff = getDaysDiff(client.vencimento);
      let alertType: string | null = null;
      let title = '';
      let body = '';

      if (daysDiff === -7 && schedule.aviso7Dias) {
        alertType = 'vencendo_7d';
        title = `📅 Vence em 7 dias: ${client.nome}`;
        body = `Plano ${client.plano} de ${client.nome} vence em 7 dias (${client.vencimento}). Valor: R$ ${Number(client.valor).toFixed(2)}`;
      } else if (daysDiff === -3 && schedule.aviso3Dias) {
        alertType = 'vencendo_3d';
        title = `⏳ Vence em 3 dias: ${client.nome}`;
        body = `Atenção: Vencimento de ${client.nome} em 3 dias (${client.vencimento}).`;
      } else if (daysDiff === -1 && schedule.aviso1Dia) {
        alertType = 'vencendo_1d';
        title = `⚡ Vence Amanhã: ${client.nome}`;
        body = `O plano de ${client.nome} vence amanhã (${client.vencimento}). Lembrete preventivo!`;
      } else if (daysDiff === 0 && schedule.avisoNoDia) {
        alertType = 'vencendo_hoje';
        title = `🚨 VENCE HOJE: ${client.nome}`;
        body = `O plano de ${client.nome} vence hoje! Valor: R$ ${Number(client.valor).toFixed(2)}.`;
      } else if (daysDiff > 0 && client.status !== 'Em dia' && schedule.avisoAposVencimento) {
        if (daysDiff >= 40 && schedule.avisoApos40Dias) {
          alertType = 'atrasado_40d';
          title = `⛔ Cliente Inativo (+40d): ${client.nome}`;
          body = `${client.nome} está há ${daysDiff} dias sem renovar (${client.vencimento}).`;
        } else {
          const interval = Math.max(1, schedule.intervaloAtrasoDias || 2);
          if (daysDiff === 1 || daysDiff === 3 || daysDiff % interval === 0) {
            alertType = 'atrasado';
            title = `⚠️ Pagamento em Atraso (${daysDiff}d): ${client.nome}`;
            body = `Vencimento de ${client.nome} atrasado há ${daysDiff} dias. Cobrança pendente: R$ ${Number(client.valor).toFixed(2)}`;
          }
        }
      }

      if (!alertType) continue;

      // Deduplication: Has this alertType already been sent to this client TODAY?
      const alreadySentToday = db.sentAlertHistory.some(
        h => h.clientId === client.id && h.tipo === alertType && h.dataEnvio === todayStr
      );

      if (alreadySentToday) {
        continue;
      }

      // Send Push to devices
      await sendWebPushToDevices({
        title,
        body,
        icon: '/logo.svg',
        badge: '/logo.svg',
        tag: `client-${client.id}-${alertType}`,
        data: {
          clientId: client.id,
          url: `/?clientId=${client.id}#client-${client.id}`
        }
      });

      // Record in history
      db.sentAlertHistory.unshift({
        id: 'alert-' + Date.now() + Math.random().toString(36).substring(2, 6),
        clientId: client.id,
        clienteNome: client.nome,
        tipo: alertType,
        dataEnvio: todayStr,
        timestamp: new Date().toISOString(),
        mensagem: body
      });

      // Log in notification logs
      db.notificationLogs.unshift({
        id: 'notif-' + Date.now(),
        data: new Date().toISOString(),
        clienteId: client.id,
        clienteNome: client.nome,
        clienteWhatsapp: client.whatsapp || client.celular || '',
        tipo: `Push Android: ${alertType}`,
        status: 'enviado',
        mensagem: body
      });

      dispatched++;
    }

    if (db.sentAlertHistory.length > 1000) {
      db.sentAlertHistory = db.sentAlertHistory.slice(0, 1000);
    }
    if (db.notificationLogs.length > 500) {
      db.notificationLogs = db.notificationLogs.slice(0, 500);
    }

    if (dispatched > 0) {
      saveDatabase(db);
    }

    return dispatched;
  };

  // Helper log audit
  const logAudit = (usuario: string, acao: string, detalhes: string) => {
    const entry = {
      id: 'aud-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuario,
      acao,
      detalhes
    };
    db.auditLogs.unshift(entry);
    if (db.auditLogs.length > 500) db.auditLogs.pop();
  };

  // --- REAL-TIME MULTI-DEVICE SYNCHRONIZATION (SSE) ---
  interface ConnectedSyncClient {
    id: string;
    res: Response;
    deviceId: string;
    deviceName: string;
    ip: string;
    connectedAt: string;
  }

  const activeSyncClients = new Map<string, ConnectedSyncClient>();

  const broadcastSync = (
    req: Request | null,
    action: string,
    entity: 'client' | 'payment' | 'setting' | 'server' | 'plan' | 'template' | 'all',
    actionText: string,
    data?: any
  ) => {
    let rawDeviceId = '';
    let rawDeviceName = '';
    if (req) {
      rawDeviceId = (req.headers['x-device-id'] as string) || (req.query?.deviceId as string) || '';
      rawDeviceName = (req.headers['x-device-name'] as string) || (req.query?.deviceName as string) || '';
    }
    const originDeviceId = rawDeviceId || 'servidor';
    let originDeviceName = 'Dispositivo';
    try {
      originDeviceName = rawDeviceName ? decodeURIComponent(rawDeviceName) : (db.user?.nome || 'Outro Dispositivo');
    } catch {
      originDeviceName = rawDeviceName || 'Outro Dispositivo';
    }

    const payload = JSON.stringify({
      type: 'SYNC_UPDATE',
      originDeviceId,
      originDeviceName,
      action,
      entity,
      actionText,
      timestamp: new Date().toISOString(),
      data
    });

    const sseMessage = `event: sync\ndata: ${payload}\n\n`;

    activeSyncClients.forEach((client, clientId) => {
      try {
        client.res.write(sseMessage);
      } catch {
        activeSyncClients.delete(clientId);
      }
    });
  };

  // --- API ROUTES ---

  // Real-time synchronization SSE stream
  app.get('/api/sync/events', (req: Request, res: Response) => {
    const rawDeviceId = (req.query.deviceId as string) || (req.headers['x-device-id'] as string) || `dev-${Date.now()}`;
    const rawDeviceName = (req.query.deviceName as string) || (req.headers['x-device-name'] as string) || 'Dispositivo Conectado';
    let deviceName = 'Celular Android';
    try {
      deviceName = decodeURIComponent(rawDeviceName);
    } catch {
      deviceName = rawDeviceName;
    }
    const clientId = `conn-${rawDeviceId}-${Date.now()}`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const clientInfo: ConnectedSyncClient = {
      id: clientId,
      res,
      deviceId: rawDeviceId,
      deviceName,
      ip: req.ip || '',
      connectedAt: new Date().toISOString()
    };

    activeSyncClients.set(clientId, clientInfo);

    // Initial greeting
    res.write(`event: connected\ndata: ${JSON.stringify({
      type: 'CONNECTED',
      clientId,
      deviceId: rawDeviceId,
      deviceName,
      activeDevicesCount: activeSyncClients.size
    })}\n\n`);

    // Broadcast join to other active clients
    activeSyncClients.forEach((otherClient, id) => {
      if (id !== clientId) {
        try {
          otherClient.res.write(`event: sync\ndata: ${JSON.stringify({
            type: 'DEVICE_CONNECTED',
            originDeviceId: rawDeviceId,
            originDeviceName: deviceName,
            action: 'DEVICE_JOINED',
            actionText: `Dispositivo "${deviceName}" conectado ao painel`,
            entity: 'all',
            timestamp: new Date().toISOString()
          })}\n\n`);
        } catch {}
      }
    });

    // Heartbeat ping every 20 seconds
    const pingInterval = setInterval(() => {
      try {
        res.write(`: ping\n\n`);
      } catch {
        clearInterval(pingInterval);
        activeSyncClients.delete(clientId);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(pingInterval);
      activeSyncClients.delete(clientId);
    });
  });

  // Get active connected devices list
  app.get('/api/sync/active-devices', (_req: Request, res: Response) => {
    const list = Array.from(activeSyncClients.values()).map(c => ({
      clientId: c.id,
      deviceId: c.deviceId,
      deviceName: c.deviceName,
      connectedAt: c.connectedAt
    }));
    res.json({ devices: list, total: list.length });
  });

  // Health
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Bootstrap (all in one for ultra-fast startup)
  app.get('/api/bootstrap', (_req: Request, res: Response) => {
    res.json({
      clients: db.clients,
      servers: db.servers,
      plans: db.plans,
      payments: db.payments,
      paymentMethods: db.paymentMethods || INITIAL_PAYMENT_METHODS,
      messageTemplates: db.messageTemplates || INITIAL_MESSAGE_TEMPLATES,
      serverDeposits: db.serverDeposits || INITIAL_SERVER_DEPOSITS,
      automations: db.automations,
      notificationLogs: db.notificationLogs,
      settings: db.settings,
      user: db.user,
      auditLogs: db.auditLogs.slice(0, 50)
    });
  });

  // Clients
  app.get('/api/clients', (_req: Request, res: Response) => {
    res.json(db.clients);
  });

  app.post('/api/clients', (req: Request, res: Response) => {
    const newClient: Client = {
      ...req.body,
      id: req.body.id || 'cli-' + Date.now() + Math.random().toString(36).substring(2, 6),
      createdAt: req.body.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString()
    };
    db.clients.unshift(newClient);
    logAudit(db.user.nome, 'Novo Cliente', `Cadastrou o cliente: ${newClient.nome}`);
    saveDatabase(db);
    broadcastSync(req, 'client_created', 'client', `Cliente "${newClient.nome}" cadastrado`, newClient);
    res.status(201).json(newClient);
  });

  app.put('/api/clients/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const index = db.clients.findIndex(c => c.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Cliente não encontrado' });
      return;
    }
    const old = db.clients[index];
    const updated: Client = {
      ...old,
      ...req.body,
      id,
      updatedAt: new Date().toISOString()
    };
    db.clients[index] = updated;
    logAudit(db.user.nome, 'Edição de Cliente', `Atualizou dados do cliente: ${updated.nome}`);
    saveDatabase(db);
    broadcastSync(req, 'client_updated', 'client', `Cliente "${updated.nome}" atualizado`, updated);
    res.json(updated);
  });

  app.delete('/api/clients/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const client = db.clients.find(c => c.id === id);
    if (!client) {
      res.status(404).json({ error: 'Cliente não encontrado' });
      return;
    }
    db.clients = db.clients.filter(c => c.id !== id);
    logAudit(db.user.nome, 'Exclusão de Cliente', `Removeu o cliente: ${client.nome}`);
    saveDatabase(db);
    broadcastSync(req, 'client_deleted', 'client', `Cliente "${client.nome}" excluído`, { id });
    res.json({ success: true, id });
  });

  app.post('/api/clients/bulk-delete', (req: Request, res: Response) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'Nenhum cliente selecionado' });
      return;
    }
    const count = ids.length;
    db.clients = db.clients.filter(c => !ids.includes(c.id));
    logAudit(db.user.nome, 'Exclusão em Massa', `Excluiu ${count} cliente(s)`);
    saveDatabase(db);
    broadcastSync(req, 'clients_bulk_deleted', 'client', `${count} cliente(s) excluído(s)`, { ids });
    res.json({ success: true, count });
  });

  // Client Renew
  app.post('/api/clients/renew', (req: Request, res: Response) => {
    const { clientId, novoVencimento, valor, plano, formaPagamento } = req.body;
    const client = db.clients.find(c => c.id === clientId);
    if (!client) {
      res.status(404).json({ error: 'Cliente não encontrado' });
      return;
    }

    client.vencimento = novoVencimento;
    client.status = 'Em dia';
    client.arquivado = false;
    client.updatedAt = new Date().toISOString();

    const payment: PaymentRecord = {
      id: 'pay-' + Date.now(),
      clienteId: client.id,
      clienteNome: client.nome,
      planoNome: plano || client.plano,
      valorOriginal: valor || client.valor,
      desconto: 0,
      valorFinal: valor || client.valor,
      dataCriacao: new Date().toISOString().split('T')[0],
      dataVencimento: novoVencimento,
      formaPagamento: formaPagamento || 'pix',
      status: 'pago',
      dataConfirmacao: new Date().toISOString().split('T')[0],
      transacaoId: 'REN-' + Date.now(),
      observacoes: 'Renovação registrada no painel'
    };

    db.payments.unshift(payment);
    logAudit(db.user.nome, 'Renovação de Plano', `Renovou cliente ${client.nome} até ${novoVencimento}`);
    saveDatabase(db);
    broadcastSync(req, 'client_renewed', 'client', `Cliente ${client.nome} renovado até ${novoVencimento}`, { client, payment });
    res.json({ success: true, client, payment });
  });

  // Bulk Renew
  app.post('/api/clients/bulk-renew', (req: Request, res: Response) => {
    const { renewals } = req.body;
    if (!Array.isArray(renewals) || renewals.length === 0) {
      res.status(400).json({ error: 'Nenhuma renovação informada' });
      return;
    }
    const updatedClients: Client[] = [];
    const newPayments: PaymentRecord[] = [];

    renewals.forEach(({ clientId, novoVencimento }: { clientId: string; novoVencimento: string }) => {
      const client = db.clients.find(c => c.id === clientId);
      if (!client) return;
      client.vencimento = novoVencimento;
      client.status = 'Em dia';
      client.arquivado = false;
      client.updatedAt = new Date().toISOString();
      updatedClients.push(client);

      const payment: PaymentRecord = {
        id: 'pay-' + Date.now() + Math.random().toString(36).substring(2, 6),
        clienteId: client.id,
        clienteNome: client.nome,
        planoNome: client.plano,
        valorOriginal: client.valor,
        desconto: 0,
        valorFinal: client.valor,
        dataCriacao: new Date().toISOString().split('T')[0],
        dataVencimento: novoVencimento,
        formaPagamento: 'pix',
        status: 'pago',
        dataConfirmacao: new Date().toISOString().split('T')[0],
        transacaoId: 'REN-' + Date.now(),
        observacoes: 'Renovação coletiva (+1 mês)'
      };
      newPayments.unshift(payment);
      db.payments.unshift(payment);
    });

    logAudit(db.user.nome, 'Renovação Coletiva', `Renovou ${updatedClients.length} clientes em lote (+1 mês)`);
    saveDatabase(db);
    broadcastSync(req, 'clients_bulk_renewed', 'client', `${updatedClients.length} clientes renovados em lote (+1 mês)`, { updatedClients, payments: newPayments });
    res.json({ success: true, updatedClients, payments: newPayments });
  });

  // Import batch
  app.post('/api/clients/import', (req: Request, res: Response) => {
    const { clients: importedClients, mode } = req.body; // mode: 'append' | 'replace' | 'update'
    if (!Array.isArray(importedClients)) {
      res.status(400).json({ error: 'Formato inválido de clientes' });
      return;
    }

    if (mode === 'replace') {
      db.clients = importedClients.map(c => ({
        ...c,
        id: c.id || 'cli-' + Date.now() + Math.random().toString(36).substring(2, 6),
        createdAt: c.createdAt || new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString()
      }));
    } else {
      // Append or update duplicates
      importedClients.forEach(newC => {
        const cleanZap = (newC.whatsapp || '').replace(/\D/g, '');
        const existingIdx = db.clients.findIndex(c => {
          if (cleanZap && cleanZap.length >= 8 && c.whatsapp.replace(/\D/g, '') === cleanZap) return true;
          if (newC.mac && c.mac && newC.mac.toLowerCase() === c.mac.toLowerCase()) return true;
          if (newC.nome && c.nome && newC.nome.toLowerCase() === c.nome.toLowerCase()) return true;
          return false;
        });

        if (existingIdx !== -1 && mode === 'update') {
          db.clients[existingIdx] = {
            ...db.clients[existingIdx],
            ...newC,
            updatedAt: new Date().toISOString()
          };
        } else if (existingIdx === -1) {
          db.clients.push({
            ...newC,
            id: newC.id || 'cli-' + Date.now() + Math.random().toString(36).substring(2, 6),
            createdAt: newC.createdAt || new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString()
          });
        }
      });
    }

    logAudit(db.user.nome, 'Importação de Clientes', `Importou ${importedClients.length} registro(s) no modo ${mode}`);
    saveDatabase(db);
    broadcastSync(req, 'clients_imported', 'client', `Importação de ${importedClients.length} cliente(s) concluída`, { count: db.clients.length });
    res.json({ success: true, total: db.clients.length });
  });

  // Servers
  app.get('/api/servers', (_req: Request, res: Response) => {
    res.json(db.servers);
  });

  app.post('/api/servers', (req: Request, res: Response) => {
    const newServer: ServerItem = {
      id: 'srv-' + Date.now(),
      nome: req.body.nome,
      descricao: req.body.descricao || '',
      status: req.body.status || 'ativo',
      observacoes: req.body.observacoes || '',
      createdAt: new Date().toISOString().split('T')[0]
    };
    db.servers.push(newServer);
    logAudit(db.user.nome, 'Novo Servidor', `Adicionou servidor ${newServer.nome}`);
    saveDatabase(db);
    broadcastSync(req, 'server_created', 'server', `Servidor "${newServer.nome}" cadastrado`, newServer);
    res.status(201).json(newServer);
  });

  app.put('/api/servers/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const index = db.servers.findIndex(s => s.id === id);
    if (index !== -1) {
      db.servers[index] = {
        ...db.servers[index],
        ...req.body,
        id
      };
      logAudit(db.user.nome, 'Servidor Atualizado', `Atualizou servidor: ${db.servers[index].nome}`);
      saveDatabase(db);
      broadcastSync(req, 'server_updated', 'server', `Servidor "${db.servers[index].nome}" atualizado`, db.servers[index]);
      res.json(db.servers[index]);
    } else {
      res.status(404).json({ error: 'Servidor não encontrado' });
    }
  });

  app.delete('/api/servers/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const srv = db.servers.find(s => s.id === id);
    db.servers = db.servers.filter(s => s.id !== id);
    logAudit(db.user.nome, 'Remoção de Servidor', `Removeu servidor id ${id}`);
    saveDatabase(db);
    broadcastSync(req, 'server_deleted', 'server', `Servidor "${srv ? srv.nome : id}" excluído`, { id });
    res.json({ success: true });
  });

  // Server Deposits / Investments
  app.get('/api/server-deposits', (_req: Request, res: Response) => {
    res.json(db.serverDeposits || []);
  });

  app.post('/api/server-deposits', (req: Request, res: Response) => {
    const deposit: ServerDeposit = {
      id: 'dep-' + Date.now(),
      servidorId: req.body.servidorId,
      servidorNome: req.body.servidorNome,
      data: req.body.data || new Date().toLocaleDateString('pt-BR'),
      valor: Number(req.body.valor) || 0,
      periodo: req.body.periodo || 'mensal',
      observacoes: req.body.observacoes || '',
      createdAt: new Date().toISOString()
    };
    if (!db.serverDeposits) db.serverDeposits = [];
    db.serverDeposits.unshift(deposit);
    logAudit(db.user.nome, 'Depósito em Servidor', `Registrou investimento de R$ ${deposit.valor} no servidor ${deposit.servidorNome}`);
    saveDatabase(db);
    broadcastSync(req, 'server_deposit_created', 'server', `Investimento de R$ ${deposit.valor} no servidor ${deposit.servidorNome}`, deposit);
    res.status(201).json(deposit);
  });

  app.delete('/api/server-deposits/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    if (!db.serverDeposits) db.serverDeposits = [];
    db.serverDeposits = db.serverDeposits.filter(d => d.id !== id);
    logAudit(db.user.nome, 'Exclusão de Depósito', `Removeu registro de investimento id ${id}`);
    saveDatabase(db);
    broadcastSync(req, 'server_deposit_deleted', 'server', `Investimento de servidor removido`, { id });
    res.json({ success: true });
  });

  // Plans
  app.get('/api/plans', (_req: Request, res: Response) => {
    res.json(db.plans);
  });

  app.post('/api/plans', (req: Request, res: Response) => {
    const newPlan: PlanItem = {
      id: 'pln-' + Date.now(),
      nome: req.body.nome,
      duracaoMeses: Number(req.body.duracaoMeses) || 1,
      valorPadrao: Number(req.body.valorPadrao) || 20.00,
      linkCobranca: req.body.linkCobranca || '',
      chavePix: req.body.chavePix || '',
      status: 'ativo',
      descricao: req.body.descricao || ''
    };
    db.plans.push(newPlan);
    logAudit(db.user.nome, 'Novo Plano', `Cadastrou plano ${newPlan.nome}`);
    saveDatabase(db);
    broadcastSync(req, 'plan_created', 'plan', `Plano "${newPlan.nome}" criado`, newPlan);
    res.status(201).json(newPlan);
  });

  app.put('/api/plans/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const index = db.plans.findIndex(p => p.id === id);
    if (index !== -1) {
      db.plans[index] = { ...db.plans[index], ...req.body, id };
      saveDatabase(db);
      broadcastSync(req, 'plan_updated', 'plan', `Plano "${db.plans[index].nome}" atualizado`, db.plans[index]);
      res.json(db.plans[index]);
    } else {
      res.status(404).json({ error: 'Plano não encontrado' });
    }
  });

  app.delete('/api/plans/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const plan = db.plans.find(p => p.id === id);
    db.plans = db.plans.filter(p => p.id !== id);
    saveDatabase(db);
    broadcastSync(req, 'plan_deleted', 'plan', `Plano "${plan ? plan.nome : id}" excluído`, { id });
    res.json({ success: true });
  });

  // Payments
  app.get('/api/payments', (_req: Request, res: Response) => {
    res.json(db.payments);
  });

  app.post('/api/payments', (req: Request, res: Response) => {
    const payment: PaymentRecord = {
      ...req.body,
      id: 'pay-' + Date.now(),
      dataCriacao: req.body.dataCriacao || new Date().toISOString().split('T')[0],
      status: req.body.status || 'pendente'
    };
    db.payments.unshift(payment);
    logAudit(db.user.nome, 'Nova Cobrança', `Cobrança criada para ${payment.clienteNome} no valor de R$ ${payment.valorFinal}`);
    saveDatabase(db);
    broadcastSync(req, 'payment_created', 'payment', `Cobrança para ${payment.clienteNome} (R$ ${payment.valorFinal}) gerada`, payment);
    res.status(201).json(payment);
  });

  app.post('/api/payments/:id/confirm', (req: Request, res: Response) => {
    const { id } = req.params;
    const payment = db.payments.find(p => p.id === id);
    if (!payment) {
      res.status(404).json({ error: 'Cobrança não encontrada' });
      return;
    }
    payment.status = 'pago';
    payment.dataConfirmacao = new Date().toISOString().split('T')[0];

    // Update client status & vencimento if linked
    const client = db.clients.find(c => c.id === payment.clienteId);
    if (client) {
      client.status = 'Em dia';
      client.updatedAt = new Date().toISOString();
    }

    logAudit(db.user.nome, 'Confirmação de Pagamento', `Pagamento confirmado: ${payment.clienteNome} (R$ ${payment.valorFinal})`);
    saveDatabase(db);
    broadcastSync(req, 'payment_confirmed', 'payment', `Pagamento confirmado: ${payment.clienteNome} (R$ ${payment.valorFinal})`, { payment, client });
    res.json({ success: true, payment, client });
  });

  // Payment Methods
  app.get('/api/payment-methods', (_req: Request, res: Response) => {
    res.json(db.paymentMethods || INITIAL_PAYMENT_METHODS);
  });

  app.post('/api/payment-methods', (req: Request, res: Response) => {
    const isDef = !!req.body.isDefault;
    if (isDef && db.paymentMethods) {
      db.paymentMethods.forEach(m => { m.isDefault = false; });
    }
    const newMethod: PaymentMethodItem = {
      id: 'pm-' + Date.now(),
      nome: req.body.nome || 'Nova Forma de Pagamento',
      tipo: req.body.tipo || 'pix_aleatoria',
      chaveOuLink: req.body.chaveOuLink || '',
      beneficiario: req.body.beneficiario || 'Gerenciapró — Movieplay',
      ativo: req.body.ativo !== false,
      isDefault: isDef,
      descricao: req.body.descricao || ''
    };
    if (!db.paymentMethods) db.paymentMethods = [...INITIAL_PAYMENT_METHODS];
    db.paymentMethods.push(newMethod);
    logAudit(db.user.nome, 'Forma de Pagamento Cadastrada', `Cadastrou forma: ${newMethod.nome}`);
    saveDatabase(db);
    broadcastSync(req, 'payment_method_created', 'setting', `Forma de pagamento "${newMethod.nome}" cadastrada`, newMethod);
    res.status(201).json(newMethod);
  });

  app.put('/api/payment-methods/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    if (!db.paymentMethods) db.paymentMethods = [...INITIAL_PAYMENT_METHODS];
    const index = db.paymentMethods.findIndex(m => m.id === id);
    if (index !== -1) {
      if (req.body.isDefault) {
        db.paymentMethods.forEach(m => { m.isDefault = false; });
      }
      db.paymentMethods[index] = { ...db.paymentMethods[index], ...req.body, id };
      logAudit(db.user.nome, 'Forma de Pagamento Atualizada', `Atualizou forma: ${db.paymentMethods[index].nome}`);
      saveDatabase(db);
      broadcastSync(req, 'payment_method_updated', 'setting', `Forma de pagamento "${db.paymentMethods[index].nome}" atualizada`, db.paymentMethods[index]);
      res.json(db.paymentMethods[index]);
    } else {
      res.status(404).json({ error: 'Forma de pagamento não encontrada' });
    }
  });

  app.delete('/api/payment-methods/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    if (!db.paymentMethods) db.paymentMethods = [...INITIAL_PAYMENT_METHODS];
    const method = db.paymentMethods.find(m => m.id === id);
    db.paymentMethods = db.paymentMethods.filter(m => m.id !== id);
    logAudit(db.user.nome, 'Forma de Pagamento Removida', `Excluiu forma id ${id}`);
    saveDatabase(db);
    broadcastSync(req, 'payment_method_deleted', 'setting', `Forma de pagamento "${method ? method.nome : id}" removida`, { id });
    res.json({ success: true });
  });

  // Message Templates Manager
  app.get('/api/message-templates', (_req: Request, res: Response) => {
    res.json(db.messageTemplates || INITIAL_MESSAGE_TEMPLATES);
  });

  app.post('/api/message-templates', (req: Request, res: Response) => {
    const newTemplate: MessageTemplate = {
      id: 'tmpl-' + Date.now(),
      nome: req.body.nome || 'Novo Modelo de Cobrança',
      categoria: req.body.categoria || 'cobranca_mensal',
      categoriaNome: req.body.categoriaNome || 'Cobrança de mensalidade',
      plano: req.body.plano || 'Todos',
      formaPagamentoId: req.body.formaPagamentoId || 'padrao',
      conteudo: req.body.conteudo || '',
      isDefault: false,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString()
    };
    if (!db.messageTemplates) db.messageTemplates = [...INITIAL_MESSAGE_TEMPLATES];
    db.messageTemplates.push(newTemplate);
    logAudit(db.user.nome, 'Novo Modelo de Mensagem', `Criou modelo: ${newTemplate.nome}`);
    saveDatabase(db);
    broadcastSync(req, 'template_created', 'template', `Modelo de mensagem "${newTemplate.nome}" criado`, newTemplate);
    res.status(201).json(newTemplate);
  });

  app.put('/api/message-templates/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    if (!db.messageTemplates) db.messageTemplates = [...INITIAL_MESSAGE_TEMPLATES];
    const index = db.messageTemplates.findIndex(t => t.id === id);
    if (index !== -1) {
      db.messageTemplates[index] = {
        ...db.messageTemplates[index],
        ...req.body,
        id,
        updatedAt: new Date().toISOString()
      };
      logAudit(db.user.nome, 'Modelo de Mensagem Editado', `Editou modelo: ${db.messageTemplates[index].nome}`);
      saveDatabase(db);
      broadcastSync(req, 'template_updated', 'template', `Modelo "${db.messageTemplates[index].nome}" atualizado`, db.messageTemplates[index]);
      res.json(db.messageTemplates[index]);
    } else {
      res.status(404).json({ error: 'Modelo não encontrado' });
    }
  });

  app.delete('/api/message-templates/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    if (!db.messageTemplates) db.messageTemplates = [...INITIAL_MESSAGE_TEMPLATES];
    const tmpl = db.messageTemplates.find(t => t.id === id);
    db.messageTemplates = db.messageTemplates.filter(t => t.id !== id);
    logAudit(db.user.nome, 'Modelo de Mensagem Excluído', `Excluiu modelo id ${id}`);
    saveDatabase(db);
    broadcastSync(req, 'template_deleted', 'template', `Modelo "${tmpl ? tmpl.nome : id}" removido`, { id });
    res.json({ success: true });
  });

  app.post('/api/message-templates/restore', (req: Request, res: Response) => {
    db.messageTemplates = [...INITIAL_MESSAGE_TEMPLATES];
    logAudit(db.user.nome, 'Restauração de Modelos', 'Restaurou os 7 modelos profissionais padrão de mensagens');
    saveDatabase(db);
    broadcastSync(req, 'templates_restored', 'template', `Modelos restaurados para os padrões profissionais`, db.messageTemplates);
    res.json({ success: true, templates: db.messageTemplates });
  });

  // Automations
  app.get('/api/automations', (_req: Request, res: Response) => {
    res.json(db.automations);
  });

  app.put('/api/automations', (req: Request, res: Response) => {
    db.automations = req.body;
    saveDatabase(db);
    broadcastSync(req, 'automations_updated', 'setting', `Regras de automação atualizadas`, db.automations);
    res.json(db.automations);
  });

  app.post('/api/automations/log', (req: Request, res: Response) => {
    const log: NotificationLog = {
      id: 'log-' + Date.now(),
      data: new Date().toISOString(),
      clienteId: req.body.clienteId,
      clienteNome: req.body.clienteNome,
      clienteWhatsapp: req.body.clienteWhatsapp,
      tipo: req.body.tipo,
      status: req.body.status || 'enviado',
      mensagem: req.body.mensagem
    };
    db.notificationLogs.unshift(log);
    if (db.notificationLogs.length > 300) db.notificationLogs.pop();
    saveDatabase(db);
    res.status(201).json(log);
  });

  // Settings
  app.get('/api/settings', (_req: Request, res: Response) => {
    // Hide real private tokens in public client response
    const maskedSettings = {
      ...db.settings,
      mpAccessTokenConfigured: !!(process.env.MERCADOPAGO_ACCESS_TOKEN || db.settings.mpAccessToken)
    };
    res.json(maskedSettings);
  });

  app.put('/api/settings', (req: Request, res: Response) => {
    db.settings = { ...db.settings, ...req.body };
    logAudit(db.user.nome, 'Configurações Alteradas', 'Preferências do aplicativo atualizadas');
    saveDatabase(db);
    broadcastSync(req, 'settings_updated', 'setting', `Configurações do sistema atualizadas`, db.settings);
    res.json(db.settings);
  });

  // User Profile & Display Name
  app.get('/api/user', (_req: Request, res: Response) => {
    res.json(db.user);
  });

  app.put('/api/user', (req: Request, res: Response) => {
    db.user = {
      id: req.body.id || 'usr-1',
      nome: req.body.nome || '',
      email: req.body.email || '',
      role: req.body.role || 'admin',
      provider: req.body.provider || 'local',
      avatar: req.body.avatar
    };
    logAudit(db.user.nome || db.user.email, 'Usuário Conectado', `Conta ativa: ${db.user.email}`);
    saveDatabase(db);
    broadcastSync(req, 'user_updated', 'setting', `Perfil atualizado: ${db.user.nome}`, db.user);
    res.json(db.user);
  });

  // Backup & Restore
  app.get('/api/backup', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=backup-gerenciapro-${Date.now()}.json`);
    res.json(db);
  });

  app.post('/api/restore', (req: Request, res: Response) => {
    const restored = req.body as DatabaseSchema;
    if (!restored || !Array.isArray(restored.clients)) {
      res.status(400).json({ error: 'Arquivo de backup inválido ou corrompido' });
      return;
    }
    db = {
      clients: restored.clients || [],
      servers: restored.servers || db.servers,
      plans: restored.plans || db.plans,
      payments: restored.payments || [],
      paymentMethods: restored.paymentMethods || db.paymentMethods,
      messageTemplates: restored.messageTemplates || db.messageTemplates,
      serverDeposits: restored.serverDeposits || db.serverDeposits || [],
      automations: restored.automations || db.automations,
      notificationLogs: restored.notificationLogs || [],
      settings: restored.settings || db.settings,
      user: restored.user || db.user,
      auditLogs: restored.auditLogs || []
    };
    logAudit(db.user.nome, 'Restauração de Backup', `Backup restaurado com ${db.clients.length} clientes`);
    saveDatabase(db);
    broadcastSync(req, 'database_restored', 'all', `Backup do sistema restaurado`, db);
    res.json({ success: true, count: db.clients.length });
  });

  // Mercado Pago Integration (Backend Proxy & Webhook)
  app.post('/api/mercadopago/preference', async (req: Request, res: Response) => {
    const { clienteId, clienteNome, planoNome, valor, email } = req.body;
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN || db.settings.mpAccessToken;

    if (!token) {
      // In sandbox mode without credentials, return clean test checkout payload
      const testPreferenceId = 'TEST-PREF-' + Date.now();
      const testInitPoint = `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${testPreferenceId}`;
      res.json({
        isSandbox: true,
        preferenceId: testPreferenceId,
        initPoint: testInitPoint,
        message: 'Modo de teste: configure MERCADOPAGO_ACCESS_TOKEN no servidor para cobranças reais.'
      });
      return;
    }

    try {
      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: [
            {
              title: `Assinatura ${planoNome} — Gerenciapró`,
              description: `Acesso ao serviço IPTV para ${clienteNome}`,
              quantity: 1,
              currency_id: 'BRL',
              unit_price: Number(valor)
            }
          ],
          payer: {
            name: clienteNome,
            email: email || 'cliente@gerenciapro.com.br'
          },
          external_reference: `${clienteId}:::${Date.now()}`,
          notification_url: `${process.env.APP_URL || 'https://meu-app.com'}/api/mercadopago/webhook`,
          back_urls: {
            success: `${process.env.APP_URL || ''}/?status=approved`,
            failure: `${process.env.APP_URL || ''}/?status=failure`,
            pending: `${process.env.APP_URL || ''}/?status=pending`
          },
          auto_return: 'approved'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Falha na API do Mercado Pago');
      }

      res.json({
        preferenceId: data.id,
        initPoint: data.init_point,
        sandboxInitPoint: data.sandbox_init_point
      });
    } catch (err: unknown) {
      const error = err as Error;
      res.status(500).json({ error: error.message || 'Erro ao conectar com Mercado Pago' });
    }
  });

  // Mercado Pago Webhook with Idempotency
  app.post('/api/mercadopago/webhook', async (req: Request, res: Response) => {
    const { type, data } = req.body;
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN || db.settings.mpAccessToken;

    // Acknowledge MP notification immediately
    res.status(200).send('OK');

    if (type === 'payment' && data && data.id && token) {
      try {
        // Query MP official API to verify real status
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (mpRes.ok) {
          const paymentData = await mpRes.json();
          const externalRef = paymentData.external_reference || '';
          const [clientId] = externalRef.split(':::');

          // Idempotency: verify if already confirmed
          const existingPayment = db.payments.find(p => p.mpPaymentId === String(data.id));
          if (!existingPayment && paymentData.status === 'approved') {
            const client = db.clients.find(c => c.id === clientId);
            const clientName = client ? client.nome : 'Cliente MP';

            db.payments.unshift({
              id: 'pay-' + Date.now(),
              clienteId: clientId || 'cli-mp',
              clienteNome: clientName,
              planoNome: client ? client.plano : 'Mensal',
              valorOriginal: paymentData.transaction_amount || 20.0,
              desconto: 0,
              valorFinal: paymentData.transaction_amount || 20.0,
              dataCriacao: new Date().toISOString().split('T')[0],
              dataVencimento: new Date().toISOString().split('T')[0],
              formaPagamento: 'mercadopago',
              status: 'pago',
              mpPaymentId: String(data.id),
              transacaoId: String(data.id),
              dataConfirmacao: new Date().toISOString().split('T')[0],
              observacoes: 'Aprovado via Webhook Mercado Pago'
            });

            if (client) {
              client.status = 'Em dia';
              client.updatedAt = new Date().toISOString();
            }

            logAudit('Mercado Pago Webhook', 'Pagamento Aprovado', `Pagamento ID ${data.id} confirmado para ${clientName}`);
            saveDatabase(db);
          }
        }
      } catch (err) {
        console.error('Webhook processing error', err);
      }
    }
  });

  // --- NATIVE ANDROID PUSH NOTIFICATIONS API ---

  // Get VAPID Public Key for client subscription
  app.get('/api/push/vapid-public-key', (_req: Request, res: Response) => {
    res.json({ publicKey: db.vapidKeys?.publicKey || '' });
  });

  // List connected devices
  app.get('/api/push/devices', (_req: Request, res: Response) => {
    res.json({ devices: db.pushSubscriptions || [] });
  });

  // Register device push subscription
  app.post('/api/push/register', (req: Request, res: Response) => {
    const { endpoint, keys, deviceName, platform, userAgent } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      res.status(400).json({ error: 'Endpoint e chaves de criptografia são obrigatórios.' });
      return;
    }

    if (!db.pushSubscriptions) db.pushSubscriptions = [];
    const nowIso = new Date().toISOString();
    const existingIndex = db.pushSubscriptions.findIndex(s => s.endpoint === endpoint);

    let device: PushDeviceSubscription;
    if (existingIndex !== -1) {
      device = {
        ...db.pushSubscriptions[existingIndex],
        deviceName: deviceName || db.pushSubscriptions[existingIndex].deviceName,
        platform: platform || db.pushSubscriptions[existingIndex].platform,
        userAgent: userAgent || db.pushSubscriptions[existingIndex].userAgent,
        keys,
        lastActiveAt: nowIso,
        ativo: true
      };
      db.pushSubscriptions[existingIndex] = device;
    } else {
      device = {
        id: 'dev-' + Date.now() + Math.random().toString(36).substring(2, 6),
        endpoint,
        keys,
        deviceName: deviceName || 'Celular Android',
        platform: platform || 'Android Chrome',
        userAgent: userAgent || '',
        userId: db.user?.id || 'admin',
        createdAt: nowIso,
        lastActiveAt: nowIso,
        ativo: true
      };
      db.pushSubscriptions.unshift(device);
    }

    saveDatabase(db);
    logAudit(db.user.nome, 'Dispositivo Conectado', `Aparelho registrado para Push: ${device.deviceName}`);
    res.json({ success: true, device });
  });

  // Unregister device push subscription
  app.post('/api/push/unregister', (req: Request, res: Response) => {
    const { endpoint } = req.body;
    if (db.pushSubscriptions) {
      db.pushSubscriptions = db.pushSubscriptions.filter(s => s.endpoint !== endpoint);
      saveDatabase(db);
    }
    res.json({ success: true });
  });

  // Delete device by ID
  app.delete('/api/push/devices/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    if (db.pushSubscriptions) {
      const dev = db.pushSubscriptions.find(d => d.id === id);
      db.pushSubscriptions = db.pushSubscriptions.filter(d => d.id !== id);
      saveDatabase(db);
      if (dev) {
        logAudit(db.user.nome, 'Dispositivo Removido', `Removeu o aparelho: ${dev.deviceName}`);
      }
    }
    res.json({ success: true });
  });

  // Send real test notification to all active devices
  app.post('/api/push/test', async (_req: Request, res: Response) => {
    const sentCount = await sendWebPushToDevices({
      title: '🚨 Gerenciapró — Teste no Android',
      body: 'Notificação push em segundo plano funcionando com perfeição no seu celular Android!',
      icon: '/logo.svg',
      badge: '/logo.svg',
      data: { url: '/' }
    });

    res.json({
      success: true,
      sentCount,
      message: sentCount > 0
        ? `Notificação enviada com sucesso para ${sentCount} dispositivo(s) conectado(s)!`
        : 'Nenhum dispositivo Android ativo cadastrado. Clique em "Ativar Notificações no Celular" para vincular este aparelho.'
    });
  });

  // Trigger manual check and dispatch
  app.post('/api/push/dispatch-alerts', async (_req: Request, res: Response) => {
    const count = await dispatchDueAlerts();
    res.json({
      success: true,
      dispatchedCount: count,
      message: `Varredura concluída. ${count} novo(s) alerta(s) enviado(s).`
    });
  });

  // Mount Vite dev server in middleware mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static build
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Gerenciapró Server running on http://localhost:${PORT}`);
    // Run initial alert check shortly after start
    setTimeout(() => {
      dispatchDueAlerts().catch(err => console.error('Initial alerts check error', err));
    }, 4000);

    // Periodic check every 15 minutes
    setInterval(() => {
      dispatchDueAlerts().catch(err => console.error('Periodic alerts check error', err));
    }, 1000 * 60 * 15);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
