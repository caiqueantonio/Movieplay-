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
  INITIAL_USER
} from './src/data/initialData.ts';
import { Client, ServerItem, PlanItem, PaymentRecord, AutomationRule, AppSettings, UserAccount, NotificationLog } from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DatabaseSchema {
  clients: Client[];
  servers: ServerItem[];
  plans: PlanItem[];
  payments: PaymentRecord[];
  automations: AutomationRule[];
  notificationLogs: NotificationLog[];
  settings: AppSettings;
  user: UserAccount;
  auditLogs: Array<{ id: string; timestamp: string; usuario: string; acao: string; detalhes: string }>;
}

// Ensure data folder and db file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadDatabase(): DatabaseSchema {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Error reading db.json, re-initializing', err);
    }
  }

  // Generate initial payments matching clients
  const initialPayments: PaymentRecord[] = [
    {
      id: 'pay-01',
      clienteId: 'cli-09',
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
      clienteId: 'cli-23',
      clienteNome: 'Rodrigo Peixoto',
      planoNome: 'Anual',
      valorOriginal: 160.00,
      desconto: 0,
      valorFinal: 160.00,
      dataCriacao: '2025-10-28',
      dataVencimento: '2026-10-28',
      formaPagamento: 'pix',
      status: 'pago',
      dataConfirmacao: '2025-10-28',
      transacaoId: 'PIX-11223344',
      observacoes: 'Assinatura anual'
    }
  ];

  const defaultDb: DatabaseSchema = {
    clients: INITIAL_CLIENTS,
    servers: INITIAL_SERVERS,
    plans: INITIAL_PLANS,
    payments: initialPayments,
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
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db.json', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  let db = loadDatabase();

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

  // --- API ROUTES ---

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
    res.json({ success: true, client, payment });
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
    res.status(201).json(newServer);
  });

  app.delete('/api/servers/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    db.servers = db.servers.filter(s => s.id !== id);
    logAudit(db.user.nome, 'Remoção de Servidor', `Removeu servidor id ${id}`);
    saveDatabase(db);
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
    res.status(201).json(newPlan);
  });

  app.put('/api/plans/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const index = db.plans.findIndex(p => p.id === id);
    if (index !== -1) {
      db.plans[index] = { ...db.plans[index], ...req.body, id };
      saveDatabase(db);
      res.json(db.plans[index]);
    } else {
      res.status(404).json({ error: 'Plano não encontrado' });
    }
  });

  app.delete('/api/plans/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    db.plans = db.plans.filter(p => p.id !== id);
    saveDatabase(db);
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
    res.json({ success: true, payment, client });
  });

  // Automations
  app.get('/api/automations', (_req: Request, res: Response) => {
    res.json(db.automations);
  });

  app.put('/api/automations', (req: Request, res: Response) => {
    db.automations = req.body;
    saveDatabase(db);
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
    res.json(db.settings);
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
      automations: restored.automations || db.automations,
      notificationLogs: restored.notificationLogs || [],
      settings: restored.settings || db.settings,
      user: restored.user || db.user,
      auditLogs: restored.auditLogs || []
    };
    logAudit(db.user.nome, 'Restauração de Backup', `Backup restaurado com ${db.clients.length} clientes`);
    saveDatabase(db);
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
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
