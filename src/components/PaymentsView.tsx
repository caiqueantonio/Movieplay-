import React, { useState } from 'react';
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
  HelpCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PaymentRecord, PaymentStatus, PaymentMethod, BillingConfig } from '../types';
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
    playSound
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'lista' | 'configuracoes'>('lista');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [showNewBillingModal, setShowNewBillingModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New billing form state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedPlanName, setSelectedPlanName] = useState(plans[0]?.nome || 'Mensal');
  const [billingValue, setBillingValue] = useState<number>(20.00);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatedMpUrl, setGeneratedMpUrl] = useState<string | null>(null);

  // Billing configuration state (Requirement 6)
  const currentBilling: BillingConfig = settings.billingConfig || INITIAL_SETTINGS.billingConfig!;
  const [billingForm, setBillingForm] = useState<BillingConfig>({ ...currentBilling });
  const [configSaved, setConfigSaved] = useState(false);

  // Filtered payments
  const filteredPayments = payments.filter(p => {
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

  // Financial metrics
  const totalReceived = payments
    .filter(p => p.status === 'pago')
    .reduce((acc, p) => acc + (p.valorFinal || 0), 0);

  const totalPending = payments
    .filter(p => p.status === 'pendente' || p.status === 'aguardando')
    .reduce((acc, p) => acc + (p.valorFinal || 0), 0);

  const totalOverdue = payments
    .filter(p => p.status === 'vencido')
    .reduce((acc, p) => acc + (p.valorFinal || 0), 0);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    playSound('beep');
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleConfirmPay = async (paymentId: string) => {
    await confirmPayment(paymentId);
  };

  const handleGenerateMercadoPagoLink = async () => {
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) {
      alert('Selecione um cliente primeiro.');
      return;
    }

    setGeneratingLink(true);
    try {
      const res = await fetch('/api/mercadopago/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: client.id,
          clienteNome: client.nome,
          planoNome: selectedPlanName,
          valor: billingValue - discountValue,
          email: client.email
        })
      });
      const data = await res.json();
      if (data.initPoint) {
        setGeneratedMpUrl(data.initPoint);
        playSound('sino');
      }
    } catch {
      alert('Erro ao conectar com API Mercado Pago.');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCreateBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) {
      alert('Selecione um cliente válido.');
      return;
    }

    const finalVal = Math.max(0, billingValue - discountValue);
    await addPayment({
      clienteId: client.id,
      clienteNome: client.nome,
      planoNome: selectedPlanName,
      valorOriginal: billingValue,
      desconto: discountValue,
      valorFinal: finalVal,
      dataVencimento: dueDate,
      formaPagamento: paymentMethod,
      status: 'pendente',
      transacaoId: 'COB-' + Date.now(),
      linkPagamento: generatedMpUrl || billingForm.linkPagamento || undefined,
      chavePixUtilizada: billingForm.chavePix || undefined,
      observacoes: 'Cobrança gerada no módulo financeiro'
    });

    setShowNewBillingModal(false);
    setGeneratedMpUrl(null);
  };

  const handleSaveBillingConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateBillingConfig(billingForm);
    setConfigSaved(true);
    playSound('sino');
    setTimeout(() => setConfigSaved(false), 2500);
  };

  // Preview message interpolation for sample client
  const sampleClient = clients[0] || {
    nome: 'João Silva',
    plano: 'Mensal',
    valor: 20.00,
    vencimento: '19/11/2026',
    whatsapp: '83988887777'
  };

  const previewMessage = (billingForm.mensagemCobrancaTemplate || '')
    .replace(/{{nome}}|{nome}/gi, sampleClient.nome)
    .replace(/{{plano}}|{plano}/gi, sampleClient.plano)
    .replace(/{{vencimento}}|{vencimento}/gi, sampleClient.vencimento)
    .replace(/{{valor}}|{valor}/gi, Number(sampleClient.valor).toFixed(2))
    .replace(/{{link_pagamento}}|{{link}}|{link}/gi, billingForm.linkPagamento || 'https://link.mercadopago.com.br/gerenciapro')
    .replace(/{{chave_pix}}|{{pix}}|{pix}/gi, billingForm.chavePix || 'caiqueempreendedorismo@gmail.com');

  const handleDirectWhatsAppBilling = (payment: PaymentRecord) => {
    const client = clients.find(c => c.id === payment.clienteId);
    if (!client) {
      alert('Cliente vinculado não encontrado');
      return;
    }
    sendWhatsAppReminder(client);
  };

  return (
    <div className="space-y-6 max-w-6xl animate-in fade-in duration-200">
      {/* Header with Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Cobranças & Pagamentos
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Gestão financeira, faturas, links Mercado Pago, Pix Copia e Cola e régua de mensagens personalizadas.
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex items-center gap-2 bg-[#0d0f17] p-1 rounded-2xl border border-[#1e2335]">
          <button
            onClick={() => setActiveSubTab('lista')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'lista'
                ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.4)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Banknote size={14} />
            <span>Faturas & Cobranças</span>
          </button>

          <button
            onClick={() => setActiveSubTab('configuracoes')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'configuracoes'
                ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.4)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Settings size={14} />
            <span>Configurações de Cobrança</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'lista' ? (
        <>
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

          {/* Filter and New Billing Button */}
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
                <option value="aguardando">Aguardando Pagamento</option>
                <option value="vencido">Vencido</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            <button
              onClick={() => setShowNewBillingModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all shrink-0 w-full sm:w-auto justify-center"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Nova Cobrança</span>
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
                        Nenhuma cobrança encontrada. Clique em "+ Nova Cobrança" para gerar.
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
                            {/* Cobrar via WhatsApp */}
                            <button
                              onClick={() => handleDirectWhatsAppBilling(p)}
                              className="p-1.5 rounded-lg text-emerald-400 hover:text-white hover:bg-emerald-950/60 transition-colors"
                              title="Enviar cobrança personalizada via WhatsApp"
                            >
                              <Send size={14} />
                            </button>

                            {p.linkPagamento && (
                              <a
                                href={p.linkPagamento}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg text-blue-400 hover:text-white hover:bg-blue-950/60 transition-colors"
                                title="Abrir link de pagamento"
                              >
                                <ExternalLink size={14} />
                              </a>
                            )}

                            {p.status !== 'pago' && (
                              <button
                                onClick={() => handleConfirmPay(p.id)}
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
        </>
      ) : (
        /* CONFIGURAÇÕES DE COBRANÇA (Requirement 6) */
        <form onSubmit={handleSaveBillingConfig} className="space-y-6 animate-in fade-in">
          {configSaved && (
            <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 p-4 rounded-2xl text-xs font-semibold flex items-center gap-3">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              <span>Configurações e modelo de mensagem salvos com sucesso!</span>
            </div>
          )}

          {/* Section A: Dados de Pagamento */}
          <div className="tech-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#1b1f2e]">
              <CreditCard size={18} className="text-red-500" />
              <h2 className="font-display text-base font-bold text-white">
                A. Dados de Pagamento
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Chave Pix Principal *
                </label>
                <input
                  type="text"
                  required
                  value={billingForm.chavePix}
                  onChange={e => setBillingForm({ ...billingForm, chavePix: e.target.value })}
                  placeholder="Ex: caiqueempreendedorismo@gmail.com ou CPF"
                  className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono-code"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Tipo de Chave Pix
                </label>
                <select
                  value={billingForm.tipoChavePix}
                  onChange={e => setBillingForm({ ...billingForm, tipoChavePix: e.target.value as any })}
                  className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                >
                  <option value="email">E-mail</option>
                  <option value="celular">Celular / Telefone</option>
                  <option value="cpf_cnpj">CPF / CNPJ</option>
                  <option value="aleatoria">Chave Aleatória (EVP)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Nome do Beneficiário
                </label>
                <input
                  type="text"
                  value={billingForm.beneficiario}
                  onChange={e => setBillingForm({ ...billingForm, beneficiario: e.target.value })}
                  placeholder="Ex: Gerenciapró / Caique"
                  className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Link de Pagamento Padrão
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
                  Descrição da Forma de Pagamento
                </label>
                <input
                  type="text"
                  value={billingForm.descricao}
                  onChange={e => setBillingForm({ ...billingForm, descricao: e.target.value })}
                  placeholder="Ex: Pix imediato ou Cartão de Crédito"
                  className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Instruções Adicionais
                </label>
                <input
                  type="text"
                  value={billingForm.instrucoes}
                  onChange={e => setBillingForm({ ...billingForm, instrucoes: e.target.value })}
                  placeholder="Ex: Enviar comprovante nesta conversa para liberação"
                  className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section B: Mensagem de Cobrança Padrão */}
          <div className="tech-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b1f2e]">
              <div className="flex items-center gap-2.5">
                <MessageSquare size={18} className="text-red-500" />
                <h2 className="font-display text-base font-bold text-white">
                  B. Mensagem de Cobrança Personalizada
                </h2>
              </div>
              <span className="text-[11px] text-gray-400">Variáveis são substituídas automaticamente</span>
            </div>

            {/* Variable Tag Badges */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-gray-400 font-semibold mr-1">Tags disponíveis:</span>
              {['{{nome}}', '{{plano}}', '{{valor}}', '{{vencimento}}', '{{link_pagamento}}', '{{chave_pix}}'].map(tag => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => {
                    setBillingForm(prev => ({
                      ...prev,
                      mensagemCobrancaTemplate: prev.mensagemCobrancaTemplate + ` ${tag} `
                    }));
                  }}
                  className="px-2 py-0.5 rounded-lg bg-[#141724] border border-[#2b334a] hover:border-red-500 font-mono-code text-[11px] text-red-400 transition-colors"
                  title="Clique para inserir no texto"
                >
                  {tag}
                </button>
              ))}
            </div>

            <textarea
              rows={6}
              value={billingForm.mensagemCobrancaTemplate}
              onChange={e => setBillingForm({ ...billingForm, mensagemCobrancaTemplate: e.target.value })}
              className="w-full bg-[#111420] border border-[#202538] focus:border-red-600 rounded-2xl p-4 text-xs text-white font-mono-code leading-relaxed outline-none"
            />

            {/* Real-time Live Preview */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                <Sparkles size={14} className="text-amber-400" />
                <span>Prévia em Tempo Real (Exemplo com dados reais):</span>
              </div>

              <div className="bg-[#141d1a] border border-emerald-900/50 rounded-2xl p-4 text-xs text-emerald-100 font-sans whitespace-pre-wrap leading-relaxed shadow-inner">
                {previewMessage}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all"
            >
              <Save size={16} />
              <span>Salvar Configurações de Cobrança</span>
            </button>
          </div>
        </form>
      )}

      {/* Modal Nova Cobrança */}
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
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBilling} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Cliente *
                </label>
                <select
                  required
                  value={selectedClientId}
                  onChange={e => {
                    setSelectedClientId(e.target.value);
                    const c = clients.find(cl => cl.id === e.target.value);
                    if (c) {
                      setBillingValue(Number(c.valor) || 20);
                      setSelectedPlanName(c.plano || 'Mensal');
                    }
                  }}
                  className="w-full bg-[#121522] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                >
                  <option value="">Selecione um cliente...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.whatsapp || c.celular})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Plano
                  </label>
                  <select
                    value={selectedPlanName}
                    onChange={e => {
                      setSelectedPlanName(e.target.value);
                      const p = plans.find(pl => pl.nome === e.target.value);
                      if (p) setBillingValue(p.valorPadrao);
                    }}
                    className="w-full bg-[#121522] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.nome}>{p.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Vencimento da Fatura
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full bg-[#121522] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  />
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
                    value={billingValue}
                    onChange={e => setBillingValue(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#121522] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono-code font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Desconto (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={discountValue}
                    onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#121522] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono-code"
                  />
                </div>
              </div>

              {/* Mercado Pago Link Generator */}
              <div className="p-3.5 bg-[#151016] border border-red-950/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-200">Checkout Mercado Pago</span>
                  <button
                    type="button"
                    onClick={handleGenerateMercadoPagoLink}
                    disabled={generatingLink || !selectedClientId}
                    className="text-red-400 hover:text-red-300 font-bold underline disabled:opacity-50"
                  >
                    {generatingLink ? 'Gerando link...' : 'Gerar Link MP'}
                  </button>
                </div>
                {generatedMpUrl && (
                  <div className="text-[11px] font-mono-code text-gray-300 truncate bg-[#0c0e14] p-2 rounded-lg border border-[#222738]">
                    Link gerado: <a href={generatedMpUrl} target="_blank" rel="noreferrer" className="text-red-400 underline">{generatedMpUrl}</a>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewBillingModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#171a26] text-gray-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-[0_0_12px_#dc2626]"
                >
                  Emitir Cobrança
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
