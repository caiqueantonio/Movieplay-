import React, { useState, useMemo } from 'react';
import {
  Banknote,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Search,
  Filter,
  CreditCard,
  DollarSign,
  ArrowUpRight,
  Settings,
  MessageSquare,
  Sparkles,
  Save,
  Send,
  HelpCircle,
  CopyCheck,
  Trash2,
  RotateCcw,
  Edit,
  Eye,
  Smartphone,
  Layers,
  ChevronRight,
  X,
  FileText,
  Percent,
  Calendar,
  UserCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  PaymentRecord,
  PaymentStatus,
  PaymentMethod,
  BillingConfig,
  PaymentMethodItem,
  PaymentMethodType,
  MessageTemplate,
  MessageCategory,
  Client
} from '../types';
import { INITIAL_SETTINGS } from '../data/initialData';

export const PaymentsView: React.FC = () => {
  const {
    payments,
    clients,
    plans,
    addPayment,
    confirmPayment,
    settings,
    updateBillingConfig,
    sendWhatsAppReminder,
    copyClientField,
    playSound,
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
    renderMessageTemplate
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'faturas' | 'formas' | 'modelos' | 'configuracoes'>('faturas');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // --- Modal Nova Cobrança ---
  const [showNewBillingModal, setShowNewBillingModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedPlanName, setSelectedPlanName] = useState(plans[0]?.nome || 'Mensal');
  const [billingValue, setBillingValue] = useState<number>(20.00);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // --- Modal Formas de Pagamento ---
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethodItem | null>(null);
  const [methodForm, setMethodForm] = useState<{
    nome: string;
    tipo: PaymentMethodType;
    chaveOuLink: string;
    beneficiario: string;
    bancoRecebedor: string;
    isDefault: boolean;
    descricao: string;
  }>({
    nome: '',
    tipo: 'pix_aleatoria',
    chaveOuLink: '',
    beneficiario: 'Caique Antonio',
    bancoRecebedor: 'Mercado Pago',
    isDefault: false,
    descricao: ''
  });

  // --- Modal Modelos de Mensagens ---
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>('todos');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState<{
    nome: string;
    categoria: MessageCategory;
    categoriaNome: string;
    plano: string;
    formaPagamentoId: string;
    conteudo: string;
  }>({
    nome: '',
    categoria: 'cobranca_mensal',
    categoriaNome: 'Cobrança de mensalidade',
    plano: 'Todos',
    formaPagamentoId: 'padrao',
    conteudo: ''
  });

  // --- Modal Prévia & Teste de Envio ---
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplate | null>(null);
  const [previewClientId, setPreviewClientId] = useState<string>('');
  const [customPreviewMethodId, setCustomPreviewMethodId] = useState<string>('');

  // --- Modal Envio Rápido para Cobrança da Tabela ---
  const [sendModalPayment, setSendModalPayment] = useState<PaymentRecord | null>(null);
  const [sendModalTemplateId, setSendModalTemplateId] = useState<string>('');

  // --- Billing configuration state ---
  const currentBilling: BillingConfig = settings.billingConfig || INITIAL_SETTINGS.billingConfig!;
  const [billingForm, setBillingForm] = useState<BillingConfig>({ ...currentBilling });
  const [configSaved, setConfigSaved] = useState(false);

  // Available categories definition
  const messageCategories: Array<{ id: MessageCategory; nome: string }> = [
    { id: 'cobranca_mensal', nome: 'Cobrança de mensalidade' },
    { id: 'cobranca_semestral', nome: 'Cobrança de plano semestral' },
    { id: 'cobranca_anual', nome: 'Cobrança de plano anual' },
    { id: 'aviso_pix', nome: 'Aviso informativo de chave Pix' },
    { id: 'lembrete_vencimento', nome: 'Lembrete de vencimento' },
    { id: 'aviso_atraso', nome: 'Aviso de pagamento em atraso' },
    { id: 'confirmacao_pagamento', nome: 'Confirmação de pagamento' }
  ];

  // Helper copy with feedback
  const handleCopyText = (text: string, id: string, label?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    playSound('beep');
    copyClientField(label || 'Valor', text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!p.clienteNome.toLowerCase().includes(q) && !(p.transacaoId || '').toLowerCase().includes(q)) {
          return false;
        }
      }
      if (statusFilter !== 'todos' && p.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [payments, search, statusFilter]);

  // Financial metrics
  const totalReceived = useMemo(() => {
    return payments
      .filter(p => p.status === 'pago')
      .reduce((acc, p) => acc + (Number(p.valorFinal) || 0), 0);
  }, [payments]);

  const totalPending = useMemo(() => {
    return payments
      .filter(p => p.status === 'pendente' || p.status === 'aguardando')
      .reduce((acc, p) => acc + (Number(p.valorFinal) || 0), 0);
  }, [payments]);

  const totalOverdue = useMemo(() => {
    return payments
      .filter(p => p.status === 'vencido')
      .reduce((acc, p) => acc + (Number(p.valorFinal) || 0), 0);
  }, [payments]);

  // Handle client selection on new billing modal
  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setSelectedPlanName(client.plano || 'Mensal');
      setBillingValue(Number(client.valor) || 20.00);
      setDiscountValue(0);
      if (client.vencimento) {
        // Try to convert DD/MM/YYYY to YYYY-MM-DD
        const parts = client.vencimento.split('/');
        if (parts.length === 3) {
          setDueDate(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else {
          setDueDate(client.vencimento);
        }
      }
    }
  };

  // Issue new billing
  const handleCreateBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) {
      alert('Por favor, selecione um cliente cadastrado.');
      return;
    }

    const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethodId) ||
      paymentMethods.find(m => m.isDefault && m.ativo) ||
      paymentMethods[0];

    const finalVal = Math.max(0, billingValue - discountValue);
    
    // Format due date in DD/MM/YYYY
    let formattedDue = dueDate;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      const [y, m, d] = dueDate.split('-');
      formattedDue = `${d}/${m}/${y}`;
    }

    await addPayment({
      clienteId: client.id,
      clienteNome: client.nome,
      planoNome: selectedPlanName,
      valorOriginal: billingValue,
      desconto: discountValue,
      valorFinal: finalVal,
      dataVencimento: formattedDue,
      formaPagamento: (selectedMethod?.tipo.startsWith('pix') ? 'pix' : selectedMethod?.tipo === 'mercadopago' ? 'mercadopago' : 'outro') as PaymentMethod,
      status: 'pendente',
      transacaoId: 'FAT-' + Date.now().toString().slice(-6),
      linkPagamento: selectedMethod?.tipo === 'mercadopago' ? selectedMethod.chaveOuLink : undefined,
      chavePixUtilizada: selectedMethod?.tipo.startsWith('pix') ? selectedMethod.chaveOuLink : undefined,
      observacoes: `Cobrança emitida via ${selectedMethod?.nome || 'Pix'}`
    });

    setShowNewBillingModal(false);
  };

  // Payment Method Modal Save
  const handleSaveMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!methodForm.nome.trim()) {
      alert('Informe o nome da forma de pagamento.');
      return;
    }

    if (editingMethod) {
      await updatePaymentMethod(editingMethod.id, {
        nome: methodForm.nome,
        tipo: methodForm.tipo,
        chaveOuLink: methodForm.chaveOuLink,
        beneficiario: methodForm.beneficiario || 'Caique Antonio',
        bancoRecebedor: methodForm.bancoRecebedor || 'Mercado Pago',
        isDefault: methodForm.isDefault,
        descricao: methodForm.descricao
      });
    } else {
      await addPaymentMethod({
        nome: methodForm.nome,
        tipo: methodForm.tipo,
        chaveOuLink: methodForm.chaveOuLink,
        beneficiario: methodForm.beneficiario || 'Caique Antonio',
        bancoRecebedor: methodForm.bancoRecebedor || 'Mercado Pago',
        ativo: true,
        isDefault: methodForm.isDefault,
        descricao: methodForm.descricao
      });
    }

    setShowMethodModal(false);
    setEditingMethod(null);
  };

  const handleOpenEditMethod = (method: PaymentMethodItem) => {
    setEditingMethod(method);
    setMethodForm({
      nome: method.nome,
      tipo: method.tipo,
      chaveOuLink: method.chaveOuLink,
      beneficiario: method.beneficiario || 'Caique Antonio',
      bancoRecebedor: method.bancoRecebedor || 'Mercado Pago',
      isDefault: !!method.isDefault,
      descricao: method.descricao || ''
    });
    setShowMethodModal(true);
  };

  const handleOpenNewMethod = () => {
    setEditingMethod(null);
    setMethodForm({
      nome: '',
      tipo: 'pix_aleatoria',
      chaveOuLink: '',
      beneficiario: 'Caique Antonio',
      bancoRecebedor: 'Mercado Pago',
      isDefault: false,
      descricao: ''
    });
    setShowMethodModal(true);
  };

  // Template Modal Save
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.nome.trim() || !templateForm.conteudo.trim()) {
      alert('Preencha o nome e o conteúdo da mensagem.');
      return;
    }

    const catObj = messageCategories.find(c => c.id === templateForm.categoria);
    const categoriaNome = catObj ? catObj.nome : templateForm.categoria;

    if (editingTemplate) {
      await updateMessageTemplate(editingTemplate.id, {
        nome: templateForm.nome,
        categoria: templateForm.categoria,
        categoriaNome,
        plano: templateForm.plano,
        formaPagamentoId: templateForm.formaPagamentoId,
        conteudo: templateForm.conteudo
      });
    } else {
      await addMessageTemplate({
        nome: templateForm.nome,
        categoria: templateForm.categoria,
        categoriaNome,
        plano: templateForm.plano,
        formaPagamentoId: templateForm.formaPagamentoId,
        conteudo: templateForm.conteudo,
        isDefault: false
      });
    }

    setShowTemplateModal(false);
    setEditingTemplate(null);
  };

  const handleOpenEditTemplate = (tmpl: MessageTemplate) => {
    setEditingTemplate(tmpl);
    setTemplateForm({
      nome: tmpl.nome,
      categoria: tmpl.categoria,
      categoriaNome: tmpl.categoriaNome,
      plano: tmpl.plano,
      formaPagamentoId: tmpl.formaPagamentoId,
      conteudo: tmpl.conteudo
    });
    setShowTemplateModal(true);
  };

  const handleOpenNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      nome: '',
      categoria: 'cobranca_mensal',
      categoriaNome: 'Cobrança de mensalidade',
      plano: 'Todos',
      formaPagamentoId: 'padrao',
      conteudo: `Olá, {nome}! Tudo bem? Esperamos que esteja aproveitando a sua programação ao máximo.

Passando para lembrar que a mensalidade do seu plano {plano} vence em {vencimento}, no valor de R$ {valor}.

{forma_pagamento_detalhe}

Para garantir a continuidade do seu sinal sem qualquer pausa, por favor nos envie o comprovante por aqui assim que efetuar o pagamento.
Agradecemos muito pela confiança e parceria contínua! Tenha um ótimo dia.`
    });
    setShowTemplateModal(true);
  };

  const handleDeleteTemplateWithConfirm = async (tmpl: MessageTemplate) => {
    if (window.confirm(`Tem certeza que deseja excluir o modelo de mensagem "${tmpl.nome}"?`)) {
      await deleteMessageTemplate(tmpl.id);
    }
  };

  const handleRestoreDefaultsWithConfirm = async () => {
    if (window.confirm('Deseja restaurar os 7 modelos profissionais padrão de mensagens do Gerenciapró?')) {
      await restoreDefaultTemplates();
    }
  };

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    if (templateCategoryFilter === 'todos') return messageTemplates;
    return messageTemplates.filter(t => t.categoria === templateCategoryFilter);
  }, [messageTemplates, templateCategoryFilter]);

  // Preview interactive data calculation
  const previewClient = useMemo(() => {
    if (previewClientId) {
      const found = clients.find(c => c.id === previewClientId);
      if (found) return found;
    }
    return clients[0] || {
      id: 'preview-1',
      nome: 'João Silva',
      plano: 'Mensal',
      valor: 20.00,
      vencimento: '19/11/2026',
      whatsapp: '83986302833',
      servidor: 'Cine Hub',
      aplicativo: 'XCIPTV'
    };
  }, [previewClientId, clients]);

  const previewCustomMethod = useMemo(() => {
    if (customPreviewMethodId && customPreviewMethodId !== 'padrao') {
      return paymentMethods.find(m => m.id === customPreviewMethodId);
    }
    if (previewTemplate && previewTemplate.formaPagamentoId !== 'padrao') {
      return paymentMethods.find(m => m.id === previewTemplate.formaPagamentoId);
    }
    return undefined;
  }, [customPreviewMethodId, previewTemplate, paymentMethods]);

  const renderedPreviewText = useMemo(() => {
    if (!previewTemplate) return '';
    return renderMessageTemplate(previewTemplate.conteudo, previewClient, previewCustomMethod);
  }, [previewTemplate, previewClient, previewCustomMethod, renderMessageTemplate]);

  // Send WhatsApp from Quick Send Modal
  const handleSendFromPayment = () => {
    if (!sendModalPayment) return;
    const client = clients.find(c => c.id === sendModalPayment.clienteId);
    if (!client) {
      alert('Cliente não encontrado.');
      return;
    }

    const template = messageTemplates.find(t => t.id === sendModalTemplateId) ||
      messageTemplates.find(t => t.categoria === 'cobranca_mensal') ||
      messageTemplates[0];

    const rendered = renderMessageTemplate(template.conteudo, {
      ...client,
      plano: sendModalPayment.planoNome || client.plano,
      valor: sendModalPayment.valorFinal,
      vencimento: sendModalPayment.dataVencimento
    });

    const cleanPhone = (client.whatsapp || client.celular || '').replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(rendered)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    playSound('beep');
    setSendModalPayment(null);
  };

  return (
    <div className="space-y-6 max-w-7xl animate-in fade-in duration-200">
      {/* Header and Sub-tab Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-500 shadow-[0_0_15px_rgba(220,38,38,0.25)]">
              <Banknote size={26} />
            </div>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Cobranças & Pagamentos
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Chaves Pix, links Mercado Pago, automação de faturas e gerenciador de modelos profissionais.
              </p>
            </div>
          </div>
        </div>

        {/* 4 Clean Sub-tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#090b12] p-1.5 rounded-2xl border border-[#1b2033] shadow-inner">
          <button
            onClick={() => setActiveSubTab('faturas')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'faturas'
                ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.45)]'
                : 'text-gray-400 hover:text-white hover:bg-[#121626]'
            }`}
          >
            <Banknote size={15} />
            <span>Faturas & Cobranças</span>
          </button>

          <button
            onClick={() => setActiveSubTab('formas')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'formas'
                ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.45)]'
                : 'text-gray-400 hover:text-white hover:bg-[#121626]'
            }`}
          >
            <CreditCard size={15} />
            <span>Formas de Pagamento</span>
            <span className="px-1.5 py-0.2 rounded-md bg-[#161a29] text-[10px] text-gray-300 font-mono">
              {paymentMethods.filter(m => m.ativo).length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('modelos')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'modelos'
                ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.45)]'
                : 'text-gray-400 hover:text-white hover:bg-[#121626]'
            }`}
          >
            <MessageSquare size={15} />
            <span>Modelos de Mensagens</span>
            <span className="px-1.5 py-0.2 rounded-md bg-[#161a29] text-[10px] text-gray-300 font-mono">
              {messageTemplates.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('configuracoes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'configuracoes'
                ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.45)]'
                : 'text-gray-400 hover:text-white hover:bg-[#121626]'
            }`}
          >
            <Settings size={15} />
            <span>Configurações</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1: FATURAS & COBRANÇAS                             */}
      {/* ========================================================= */}
      {activeSubTab === 'faturas' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Top 3 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="tech-card rounded-2xl p-5 shadow-lg border-emerald-950/70">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">RECEITA RECEBIDA</span>
                <CheckCircle2 size={18} className="text-emerald-500" />
              </div>
              <div className="font-display text-2xl md:text-3xl font-extrabold text-white">
                R$ {totalReceived.toFixed(2)}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Valores confirmados e liquidados</p>
            </div>

            <div className="tech-card rounded-2xl p-5 shadow-lg border-amber-950/70">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">RECEITA PENDENTE</span>
                <Clock size={18} className="text-amber-500" />
              </div>
              <div className="font-display text-2xl md:text-3xl font-extrabold text-white">
                R$ {totalPending.toFixed(2)}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Aguardando pagamento pelo cliente</p>
            </div>

            <div className="tech-card rounded-2xl p-5 shadow-lg border-red-950/70">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-400">COBRANÇAS VENCIDAS</span>
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <div className="font-display text-2xl md:text-3xl font-extrabold text-white">
                R$ {totalOverdue.toFixed(2)}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Cobranças vencidas não pagas</p>
            </div>
          </div>

          {/* Filter Bar & Action */}
          <div className="tech-card rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por cliente, transação..."
                  className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-[#111420] border border-[#202538] text-gray-300 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-red-600"
              >
                <option value="todos">Todos os status</option>
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
                <option value="vencido">Vencido</option>
              </select>
            </div>

            <button
              onClick={() => {
                if (clients.length > 0) handleSelectClient(clients[0].id);
                setShowNewBillingModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all shrink-0 w-full sm:w-auto justify-center"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Emitir Nova Cobrança</span>
            </button>
          </div>

          {/* Payments Table */}
          <div className="tech-card rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0c0e16] text-gray-400 font-semibold uppercase text-[11px] border-b border-[#1b1f2e]">
                    <th className="p-3.5 pl-4">Transação</th>
                    <th className="p-3.5">Cliente</th>
                    <th className="p-3.5">Plano</th>
                    <th className="p-3.5">Valor</th>
                    <th className="p-3.5">Método</th>
                    <th className="p-3.5">Vencimento</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 pr-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#151824]">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-500">
                        Nenhuma cobrança encontrada. Clique em "+ Emitir Nova Cobrança" para gerar uma fatura.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map(p => (
                      <tr key={p.id} className="hover:bg-[#121626]/70 transition-colors">
                        <td className="p-3.5 pl-4 font-mono-code text-gray-400">
                          {p.transacaoId || p.id}
                        </td>
                        <td className="p-3.5 font-bold text-gray-200">
                          {p.clienteNome}
                        </td>
                        <td className="p-3.5 text-gray-300">
                          <span className="px-2 py-0.5 rounded bg-[#171a26] border border-[#242a3e]">
                            {p.planoNome}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-white font-mono-code">
                          R$ {Number(p.valorFinal).toFixed(2)}
                          {p.desconto > 0 && (
                            <span className="text-[10px] text-gray-500 block font-normal">
                              Desc: R$ {p.desconto.toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 uppercase font-semibold text-gray-300">
                          {p.formaPagamento}
                        </td>
                        <td className="p-3.5 font-mono-code text-gray-400">
                          {p.dataVencimento}
                        </td>
                        <td className="p-3.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            p.status === 'pago'
                              ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/40 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                              : p.status === 'pendente'
                              ? 'bg-amber-950/70 text-amber-400 border-amber-800/40 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                              : 'bg-red-950/70 text-red-400 border-red-800/40 shadow-[0_0_8px_rgba(220,38,38,0.25)]'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3.5 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Cobrar via WhatsApp com seletor de modelos */}
                            <button
                              onClick={() => {
                                setSendModalPayment(p);
                                // Pick initial template matching plan
                                const matched = messageTemplates.find(t => t.plano.toLowerCase() === p.planoNome.toLowerCase()) ||
                                  messageTemplates.find(t => t.categoria === 'cobranca_mensal') ||
                                  messageTemplates[0];
                                setSendModalTemplateId(matched?.id || '');
                              }}
                              className="p-1.5 rounded-lg text-emerald-400 hover:text-white hover:bg-emerald-950/60 transition-colors"
                              title="Enviar mensagem profissional via WhatsApp"
                            >
                              <Send size={15} />
                            </button>

                            {/* Copiar Pix/Link */}
                            {(p.chavePixUtilizada || p.linkPagamento) && (
                              <button
                                onClick={() => handleCopyText(p.chavePixUtilizada || p.linkPagamento || '', p.id, 'Dados de pagamento')}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a1f33] transition-colors"
                                title="Copiar chave Pix ou link desta cobrança"
                              >
                                {copiedId === p.id ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                              </button>
                            )}

                            {p.status !== 'pago' && (
                              <button
                                onClick={() => confirmPayment(p.id)}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                              >
                                Confirmar Pago
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2: FORMAS DE PAGAMENTO & CHAVES PIX                */}
      {/* ========================================================= */}
      {activeSubTab === 'formas' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Card informativo e ação */}
          <div className="tech-card rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-red-950/50">
            <div>
              <div className="flex items-center gap-2 text-white font-display font-bold text-lg">
                <CreditCard size={20} className="text-red-500" />
                <span>Formas de Recebimento Configuráveis</span>
              </div>
              <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
                Cadastre suas chaves Pix oficiais e links de pagamento. As chaves ativas são automaticamente inseridas
                nas mensagens de cobrança e podem ser selecionadas individualmente na emissão de faturas.
              </p>
            </div>

            <button
              onClick={handleOpenNewMethod}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all shrink-0 self-start md:self-auto"
            >
              <Plus size={16} />
              <span>Nova Forma de Pagamento</span>
            </button>
          </div>

          {/* Grid de Formas de Pagamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paymentMethods.map(method => {
              const isPix = method.tipo.startsWith('pix');
              const isMP = method.tipo === 'mercadopago';

              return (
                <div
                  key={method.id}
                  className={`tech-card rounded-3xl p-5 border transition-all flex flex-col justify-between ${
                    method.isDefault
                      ? 'border-red-600/70 shadow-[0_0_20px_rgba(220,38,38,0.2)] bg-gradient-to-b from-[#131726] to-[#0c0e18]'
                      : 'border-[#1e2338] hover:border-[#2b334d]'
                  } ${!method.ativo ? 'opacity-60' : ''}`}
                >
                  <div>
                    {/* Header do Card */}
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#1b2033]">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl ${
                          isPix
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'
                            : isMP
                            ? 'bg-blue-950/80 text-blue-400 border border-blue-800/40'
                            : 'bg-purple-950/80 text-purple-400 border border-purple-800/40'
                        }`}>
                          {isPix ? <QrCode size={18} /> : isMP ? <CreditCard size={18} /> : <Banknote size={18} />}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-sm">{method.nome}</h3>
                          <span className="text-[10px] text-gray-400 block font-mono">
                            {method.tipo === 'pix_aleatoria'
                              ? 'Pix Chave Aleatória (EVP)'
                              : method.tipo === 'pix_celular'
                              ? 'Pix Chave Celular'
                              : method.tipo === 'mercadopago'
                              ? 'Checkout Mercado Pago'
                              : 'Outra Forma'}
                          </span>
                        </div>
                      </div>

                      {method.isDefault && (
                        <span className="px-2 py-0.5 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 text-[10px] font-bold tracking-wider uppercase">
                          Padrão
                        </span>
                      )}
                    </div>

                    {/* Conteúdo / Chave / Link */}
                    <div className="mt-4 space-y-3">
                      <div>
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                          {isPix ? 'Chave Pix Oficial' : isMP ? 'Link de Pagamento' : 'Identificador / Dados'}
                        </span>
                        
                        {method.chaveOuLink ? (
                          <div className="flex items-center justify-between gap-2 bg-[#090b12] border border-[#1f2438] rounded-xl px-3 py-2">
                            <span className="text-xs font-mono-code text-gray-200 truncate select-all">
                              {method.chaveOuLink}
                            </span>
                            <button
                              onClick={() => handleCopyText(method.chaveOuLink, method.id, method.nome)}
                              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a1f33] transition-colors shrink-0"
                              title="Copiar com 1 clique"
                            >
                              {copiedId === method.id ? (
                                <Check size={14} className="text-emerald-400" />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="bg-[#121524] border border-dashed border-[#242b42] rounded-xl p-2.5 text-center text-xs text-amber-400/90 font-medium">
                            Nenhum link configurado. Clique em Editar para cadastrar.
                          </div>
                        )}
                      </div>

                      {method.beneficiario && (
                        <div className="text-[11px] text-gray-400 space-y-0.5 pt-1 border-t border-[#1a1e2f]">
                          <div>
                            <span className="text-gray-500 font-medium">Beneficiário:</span> <strong className="text-gray-200">{method.beneficiario}</strong>
                          </div>
                          <div>
                            <span className="text-gray-500 font-medium">Banco recebedor:</span> <strong className="text-emerald-400">{method.bancoRecebedor || 'Mercado Pago'}</strong>
                          </div>
                        </div>
                      )}

                      {method.descricao && (
                        <p className="text-[11px] text-gray-400 italic">
                          "{method.descricao}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ações do Card */}
                  <div className="mt-5 pt-3 border-t border-[#1b2033] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => togglePaymentMethod(method.id)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                          method.ativo
                            ? 'bg-emerald-950/50 border-emerald-800/40 text-emerald-400'
                            : 'bg-gray-900 border-gray-700 text-gray-400'
                        }`}
                      >
                        {method.ativo ? 'Ativa' : 'Inativa'}
                      </button>

                      {!method.isDefault && method.ativo && (
                        <button
                          onClick={() => setDefaultPaymentMethod(method.id)}
                          className="text-[11px] text-gray-400 hover:text-white transition-colors underline"
                        >
                          Tornar padrão
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditMethod(method)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#181d2e] transition-colors"
                        title="Editar forma de pagamento"
                      >
                        <Edit size={14} />
                      </button>

                      {/* Don't delete standard initial keys, allow delete for others */}
                      {paymentMethods.length > 2 && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Excluir a forma "${method.nome}"?`)) {
                              deletePaymentMethod(method.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                          title="Excluir forma de pagamento"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 3: GERENCIADOR DE MODELOS DE MENSAGENS             */}
      {/* ========================================================= */}
      {activeSubTab === 'modelos' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Header & Actions */}
          <div className="tech-card rounded-3xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-red-950/50">
            <div>
              <div className="flex items-center gap-2 text-white font-display font-bold text-lg">
                <MessageSquare size={20} className="text-red-500" />
                <span>Gerenciador de Modelos de Mensagens</span>
              </div>
              <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
                Mensagens profissionais, educadas e persuasivas com preenchimento automático dos dados do cliente.
                Crie variações, duplique e envie pelo WhatsApp com 1 clique.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleRestoreDefaultsWithConfirm}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#141724] border border-[#23293e] hover:border-gray-500 text-gray-300 hover:text-white text-xs font-semibold transition-all"
                title="Restaura os 7 modelos profissionais recomendados"
              >
                <RotateCcw size={14} />
                <span>Restaurar Padrões</span>
              </button>

              <button
                onClick={handleOpenNewTemplate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all"
              >
                <Plus size={16} />
                <span>Novo Modelo</span>
              </button>
            </div>
          </div>

          {/* Categorias Tabs / Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            <button
              onClick={() => setTemplateCategoryFilter('todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                templateCategoryFilter === 'todos'
                  ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.4)]'
                  : 'bg-[#111420] text-gray-400 hover:text-white border border-[#1e2335]'
              }`}
            >
              Todas as Categorias ({messageTemplates.length})
            </button>

            {messageCategories.map(cat => {
              const count = messageTemplates.filter(t => t.categoria === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setTemplateCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    templateCategoryFilter === cat.id
                      ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.4)]'
                      : 'bg-[#111420] text-gray-400 hover:text-white border border-[#1e2335]'
                  }`}
                >
                  {cat.nome} {count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>

          {/* Grid de Modelos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredTemplates.map(tmpl => {
              const assignedMethod = paymentMethods.find(m => m.id === tmpl.formaPagamentoId);

              return (
                <div
                  key={tmpl.id}
                  className="tech-card rounded-3xl p-5 border border-[#1e2338] hover:border-red-950/80 transition-all flex flex-col justify-between shadow-xl"
                >
                  <div>
                    {/* Header do Modelo */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#1b2033]">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-sm">{tmpl.nome}</h3>
                          {tmpl.isDefault && (
                            <span className="px-2 py-0.2 rounded bg-red-600/20 border border-red-500/30 text-red-400 text-[10px] font-bold">
                              Oficial
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-[#161a29] border border-[#242b42] text-gray-300 text-[10px] font-medium">
                            📁 {tmpl.categoriaNome || tmpl.categoria}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-[#161a29] border border-[#242b42] text-gray-300 text-[10px] font-medium">
                            📋 Plano: {tmpl.plano}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-[#161a29] border border-[#242b42] text-gray-300 text-[10px] font-medium">
                            💳 {assignedMethod ? assignedMethod.nome : 'Forma Padrão'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Preview da Mensagem */}
                    <div className="mt-4 bg-[#0a0d16] border border-[#1b2033] rounded-2xl p-3.5 text-xs text-gray-300 font-sans whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {tmpl.conteudo}
                    </div>
                  </div>

                  {/* Rodapé e Ações do Modelo */}
                  <div className="mt-4 pt-3 border-t border-[#1b2033] flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setPreviewTemplate(tmpl);
                        if (clients.length > 0 && !previewClientId) {
                          setPreviewClientId(clients[0].id);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 text-xs font-semibold transition-all"
                    >
                      <Eye size={14} />
                      <span>Prévia & Testar Envio</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => duplicateMessageTemplate(tmpl.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#181d2e] transition-colors"
                        title="Duplicar modelo para criar variação"
                      >
                        <Copy size={15} />
                      </button>

                      <button
                        onClick={() => handleOpenEditTemplate(tmpl)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#181d2e] transition-colors"
                        title="Editar modelo"
                      >
                        <Edit size={15} />
                      </button>

                      <button
                        onClick={() => handleDeleteTemplateWithConfirm(tmpl)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                        title="Excluir modelo"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 4: CONFIGURAÇÕES GERAIS DE COBRANÇA                */}
      {/* ========================================================= */}
      {activeSubTab === 'configuracoes' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await updateBillingConfig(billingForm);
            setConfigSaved(true);
            playSound('sino');
            setTimeout(() => setConfigSaved(false), 2500);
          }}
          className="space-y-6 animate-in fade-in"
        >
          {configSaved && (
            <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 p-4 rounded-2xl text-xs font-semibold flex items-center gap-3">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              <span>Configurações salvas e sincronizadas com sucesso!</span>
            </div>
          )}

          <div className="tech-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#1b1f2e]">
              <Settings size={18} className="text-red-500" />
              <h2 className="font-display text-base font-bold text-white">
                Dados Gerais de Cobrança e Notificação
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Chave Pix Padrão do Sistema
                </label>
                <input
                  type="text"
                  required
                  value={billingForm.chavePix}
                  onChange={e => setBillingForm({ ...billingForm, chavePix: e.target.value })}
                  placeholder="e4447e6e-1cef-4c99-a120-039875053ed5"
                  className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono-code"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Nome do Beneficiário
                </label>
                <input
                  type="text"
                  value={billingForm.beneficiario}
                  onChange={e => setBillingForm({ ...billingForm, beneficiario: e.target.value })}
                  placeholder="Caique Antonio"
                  className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Banco Recebedor
                </label>
                <input
                  type="text"
                  value={billingForm.bancoRecebedor || ''}
                  onChange={e => setBillingForm({ ...billingForm, bancoRecebedor: e.target.value })}
                  placeholder="Mercado Pago"
                  className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Link Mercado Pago Oficial
                </label>
                <input
                  type="text"
                  value={billingForm.linkPagamento}
                  onChange={e => setBillingForm({ ...billingForm, linkPagamento: e.target.value })}
                  placeholder="https://link.mercadopago.com.br/..."
                  className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono-code"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Instruções Adicionais para o Cliente
                </label>
                <input
                  type="text"
                  value={billingForm.instrucoes}
                  onChange={e => setBillingForm({ ...billingForm, instrucoes: e.target.value })}
                  placeholder="Após pagar, envie o comprovante nesta conversa para liberação imediata"
                  className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all"
              >
                <Save size={16} />
                <span>Salvar Configurações</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================= */}
      {/* MODAL: EMITIR NOVA COBRANÇA                                */}
      {/* ========================================================= */}
      {showNewBillingModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="tech-card border border-red-950/80 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b1f2e]">
              <div className="flex items-center gap-2 text-white font-display font-bold text-base">
                <Banknote size={20} className="text-red-500" />
                <span>Emitir Nova Cobrança</span>
              </div>
              <button
                onClick={() => setShowNewBillingModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBilling} className="space-y-4">
              {/* Cliente */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Cliente *
                </label>
                <select
                  required
                  value={selectedClientId}
                  onChange={e => handleSelectClient(e.target.value)}
                  className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                >
                  <option value="">Selecione o cliente...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nome} — {c.plano} (R$ {Number(c.valor).toFixed(2)}) - Venc: {c.vencimento}
                    </option>
                  ))}
                </select>
              </div>

              {/* Plano & Valor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Plano
                  </label>
                  <select
                    value={selectedPlanName}
                    onChange={e => setSelectedPlanName(e.target.value)}
                    className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.nome}>{p.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Vencimento
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                  </input>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Valor Original (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={billingValue}
                    onChange={e => setBillingValue(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono-code"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Desconto (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discountValue}
                    onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono-code"
                  />
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Forma de Recebimento
                </label>
                <select
                  value={selectedPaymentMethodId}
                  onChange={e => setSelectedPaymentMethodId(e.target.value)}
                  className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                >
                  <option value="">Forma Padrão do Sistema</option>
                  {paymentMethods.filter(m => m.ativo).map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nome} ({m.tipo.startsWith('pix') ? 'Pix' : 'Mercado Pago'}) {m.isDefault ? '— [Padrão]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Total Final */}
              <div className="bg-[#0b0e18] p-3.5 rounded-2xl border border-[#1d2238] flex items-center justify-between">
                <span className="text-xs text-gray-400">Total a Pagar pelo Cliente:</span>
                <span className="font-display font-extrabold text-lg text-emerald-400 font-mono-code">
                  R$ {Math.max(0, billingValue - discountValue).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewBillingModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                >
                  Emitir Cobrança
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: FORMA DE PAGAMENTO (CRIAR / EDITAR)                 */}
      {/* ========================================================= */}
      {showMethodModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="tech-card border border-red-950/80 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b1f2e]">
              <div className="flex items-center gap-2 text-white font-display font-bold text-base">
                <CreditCard size={18} className="text-red-500" />
                <span>{editingMethod ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}</span>
              </div>
              <button onClick={() => setShowMethodModal(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMethod} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Nome da Forma de Pagamento *
                </label>
                <input
                  type="text"
                  required
                  value={methodForm.nome}
                  onChange={e => setMethodForm({ ...methodForm, nome: e.target.value })}
                  placeholder="Ex: Chave Pix Aleatória, Chave Pix Celular, Link MP..."
                  className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Tipo
                  </label>
                  <select
                    value={methodForm.tipo}
                    onChange={e => setMethodForm({ ...methodForm, tipo: e.target.value as PaymentMethodType })}
                    className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="pix_aleatoria">Pix Aleatória (EVP)</option>
                    <option value="pix_celular">Pix Celular</option>
                    <option value="mercadopago">Mercado Pago</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Beneficiário
                  </label>
                  <input
                    type="text"
                    value={methodForm.beneficiario}
                    onChange={e => setMethodForm({ ...methodForm, beneficiario: e.target.value })}
                    placeholder="Caique Antonio"
                    className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Banco Recebedor
                  </label>
                  <input
                    type="text"
                    value={methodForm.bancoRecebedor}
                    onChange={e => setMethodForm({ ...methodForm, bancoRecebedor: e.target.value })}
                    placeholder="Mercado Pago"
                    className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Chave Pix ou Link de Pagamento *
                </label>
                <input
                  type="text"
                  required
                  value={methodForm.chaveOuLink}
                  onChange={e => setMethodForm({ ...methodForm, chaveOuLink: e.target.value })}
                  placeholder="Ex: e4447e6e-1cef-4c99-a120-039875053ed5 ou 83986302833 ou link"
                  className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono-code"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Descrição ou Observações (opcional)
                </label>
                <input
                  type="text"
                  value={methodForm.descricao}
                  onChange={e => setMethodForm({ ...methodForm, descricao: e.target.value })}
                  placeholder="Ex: Chave oficial de transferências instantâneas"
                  className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isDefaultCheck"
                  checked={methodForm.isDefault}
                  onChange={e => setMethodForm({ ...methodForm, isDefault: e.target.checked })}
                  className="rounded border-[#2a3047] text-red-600 focus:ring-0"
                />
                <label htmlFor="isDefaultCheck" className="text-xs text-gray-300 cursor-pointer">
                  Definir esta forma como padrão nas mensagens de cobrança
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowMethodModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                >
                  Salvar Forma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: MODELO DE MENSAGEM (CRIAR / EDITAR)                 */}
      {/* ========================================================= */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="tech-card border border-red-950/80 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b1f2e]">
              <div className="flex items-center gap-2 text-white font-display font-bold text-base">
                <MessageSquare size={18} className="text-red-500" />
                <span>{editingTemplate ? 'Editar Modelo de Mensagem' : 'Novo Modelo de Mensagem'}</span>
              </div>
              <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Nome do Modelo *
                </label>
                <input
                  type="text"
                  required
                  value={templateForm.nome}
                  onChange={e => setTemplateForm({ ...templateForm, nome: e.target.value })}
                  placeholder="Ex: Cobrança de mensalidade — profissional"
                  className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Categoria / Finalidade
                  </label>
                  <select
                    value={templateForm.categoria}
                    onChange={e => setTemplateForm({ ...templateForm, categoria: e.target.value as MessageCategory })}
                    className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    {messageCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Plano Aplicável
                  </label>
                  <select
                    value={templateForm.plano}
                    onChange={e => setTemplateForm({ ...templateForm, plano: e.target.value })}
                    className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="Todos">Todos os Planos</option>
                    <option value="Mensal">Mensal</option>
                    <option value="Semestral">Semestral</option>
                    <option value="Anual">Anual</option>
                    <option value="Trimestral">Trimestral</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={templateForm.formaPagamentoId}
                    onChange={e => setTemplateForm({ ...templateForm, formaPagamentoId: e.target.value })}
                    className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="padrao">Forma Padrão do Sistema</option>
                    {paymentMethods.filter(m => m.ativo).map(m => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Botões de Tags Dinâmicas */}
              <div>
                <span className="text-[11px] font-semibold text-gray-400 block mb-1.5">
                  Tags dinâmicas (clique para inserir no texto):
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    '{nome}',
                    '{plano}',
                    '{valor}',
                    '{vencimento}',
                    '{forma_pagamento_detalhe}',
                    '{chave_pix}',
                    '{link_pagamento}',
                    '{beneficiario}',
                    '{servidor}',
                    '{aplicativo}'
                  ].map(tag => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => setTemplateForm(prev => ({
                        ...prev,
                        conteudo: prev.conteudo + ` ${tag} `
                      }))}
                      className="px-2 py-0.5 rounded-lg bg-[#141829] border border-[#28314e] hover:border-red-500 font-mono-code text-[11px] text-red-400 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conteúdo Textarea */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Texto da Mensagem *
                </label>
                <textarea
                  rows={8}
                  required
                  value={templateForm.conteudo}
                  onChange={e => setTemplateForm({ ...templateForm, conteudo: e.target.value })}
                  className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-2xl p-3.5 text-xs text-white font-mono-code leading-relaxed outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                >
                  Salvar Modelo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: PRÉVIA INTERATIVA & TESTAR ENVIO                    */}
      {/* ========================================================= */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="tech-card border border-red-950/80 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b1f2e]">
              <div className="flex items-center gap-2 text-white font-display font-bold text-base">
                <Sparkles size={18} className="text-amber-400" />
                <span>Prévia em Tempo Real: {previewTemplate.nome}</span>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Seletor de Cliente para Simulação Real */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                  Simular com Cliente Cadastrado:
                </label>
                <select
                  value={previewClientId}
                  onChange={e => setPreviewClientId(e.target.value)}
                  className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.plano} - R$ {Number(c.valor).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                  Forma de Pagamento na Prévia:
                </label>
                <select
                  value={customPreviewMethodId}
                  onChange={e => setCustomPreviewMethodId(e.target.value)}
                  className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="">Padrão do Modelo</option>
                  {paymentMethods.filter(m => m.ativo).map(m => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mensagem Renderizada estilo WhatsApp */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                Visualização Exata que o Cliente Receberá:
              </span>
              <div className="bg-[#111b21] border border-emerald-950 rounded-2xl p-4 text-xs text-gray-100 font-sans whitespace-pre-wrap leading-relaxed shadow-inner">
                {renderedPreviewText}
              </div>
            </div>

            {/* Ações da Prévia */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#1b1f2e]">
              <button
                type="button"
                onClick={() => handleCopyText(renderedPreviewText, 'preview-msg', 'Mensagem')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#141724] border border-[#23293e] hover:border-gray-500 text-gray-300 hover:text-white text-xs font-semibold transition-all"
              >
                {copiedId === 'preview-msg' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>Copiar Mensagem Pronta</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const cleanPhone = (previewClient.whatsapp || previewClient.celular || '').replace(/\D/g, '');
                  const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;
                  const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(renderedPreviewText)}`;
                  window.open(url, '_blank', 'noopener,noreferrer');
                  playSound('beep');
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
              >
                <Send size={15} />
                <span>Testar Envio no WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ENVIO RÁPIDO PARA COBRANÇA DA TABELA               */}
      {/* ========================================================= */}
      {sendModalPayment && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="tech-card border border-red-950/80 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b1f2e]">
              <div className="flex items-center gap-2 text-white font-display font-bold text-base">
                <Send size={18} className="text-emerald-400" />
                <span>Enviar Cobrança via WhatsApp</span>
              </div>
              <button onClick={() => setSendModalPayment(null)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="bg-[#0b0e18] p-3 rounded-2xl border border-[#1b2033] text-xs space-y-1">
              <div className="text-white font-bold">{sendModalPayment.clienteNome}</div>
              <div className="text-gray-400">
                Plano: <span className="text-gray-200">{sendModalPayment.planoNome}</span> | Valor:{' '}
                <span className="text-emerald-400 font-bold">R$ {Number(sendModalPayment.valorFinal).toFixed(2)}</span> | Venc:{' '}
                <span className="text-gray-200">{sendModalPayment.dataVencimento}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Selecione o Modelo de Mensagem a Enviar:
              </label>
              <select
                value={sendModalTemplateId}
                onChange={e => setSendModalTemplateId(e.target.value)}
                className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
              >
                {messageTemplates.map(tmpl => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.nome} ({tmpl.categoriaNome || tmpl.categoria})
                  </option>
                ))}
              </select>
            </div>

            {/* Live preview snippet */}
            {(() => {
              const client = clients.find(c => c.id === sendModalPayment.clienteId);
              const template = messageTemplates.find(t => t.id === sendModalTemplateId) || messageTemplates[0];
              const rendered = template && client ? renderMessageTemplate(template.conteudo, {
                ...client,
                plano: sendModalPayment.planoNome || client.plano,
                valor: sendModalPayment.valorFinal,
                vencimento: sendModalPayment.dataVencimento
              }) : '';

              return (
                <div className="bg-[#111b21] border border-emerald-950/70 rounded-2xl p-3.5 text-xs text-gray-200 font-sans whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {rendered}
                </div>
              );
            })()}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSendModalPayment(null)}
                className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendFromPayment}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
              >
                <Send size={15} />
                <span>Abrir WhatsApp & Enviar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
