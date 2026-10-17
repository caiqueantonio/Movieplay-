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
  ArrowUpRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PaymentRecord, PaymentStatus, PaymentMethod } from '../types';

export const PaymentsView: React.FC = () => {
  const {
    payments,
    clients,
    plans,
    addPayment,
    confirmPayment,
    settings,
    playSound
  } = useApp();

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
      linkPagamento: generatedMpUrl || undefined,
      observacoes: 'Cobrança gerada no módulo financeiro'
    });

    setShowNewBillingModal(false);
    setGeneratedMpUrl(null);
  };

  return (
    <div className="space-y-6 max-w-6xl animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Cobranças & Financeiro
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Gestão de faturas, links Mercado Pago, Pix Copia e Cola e conciliação de recebimentos.
          </p>
        </div>

        <button
          onClick={() => setShowNewBillingModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Nova Cobrança</span>
        </button>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0c0e15] border border-emerald-900/40 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">RECEITA RECEBIDA</span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <div className="font-display text-2xl md:text-3xl font-extrabold text-white">
            R$ {totalReceived.toFixed(2)}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Valores confirmados e liquidados</p>
        </div>

        <div className="bg-[#0c0e15] border border-amber-900/40 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">RECEITA PENDENTE</span>
            <Clock size={18} className="text-amber-500" />
          </div>
          <div className="font-display text-2xl md:text-3xl font-extrabold text-white">
            R$ {totalPending.toFixed(2)}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Aguardando pagamento pelo cliente</p>
        </div>

        <div className="bg-[#0c0e15] border border-red-900/40 rounded-2xl p-5 shadow-lg">
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

      {/* Filter and Search */}
      <div className="bg-[#0b0d14] border border-[#1b1f2e] rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
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
          className="bg-[#111420] border border-[#202538] text-gray-300 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-red-600 w-full sm:w-auto"
        >
          <option value="todos">Todos os status</option>
          <option value="pago">Pago</option>
          <option value="pendente">Pendente</option>
          <option value="aguardando">Aguardando Pagamento</option>
          <option value="vencido">Vencido</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {/* Payments Table */}
      <div className="bg-[#0b0d14] border border-[#1b1f2e] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0e1017] text-gray-400 font-semibold uppercase text-[11px] border-b border-[#1b1f2e]">
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
                  <tr key={p.id} className="hover:bg-[#121522]/70 transition-colors">
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
                          ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/40'
                          : p.status === 'pendente'
                          ? 'bg-amber-950/70 text-amber-400 border-amber-800/40'
                          : 'bg-red-950/70 text-red-400 border-red-800/40'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3.5 pr-4 text-right">
                      {p.status !== 'pago' && (
                        <button
                          onClick={() => handleConfirmPay(p.id)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                        >
                          Confirmar Pago
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nova Cobrança */}
      {showNewBillingModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1017] border border-[#222738] rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in">
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
                    className="w-full bg-[#121522] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono-code"
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
              <div className="p-3 bg-[#151016] border border-red-950/60 rounded-xl space-y-2">
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
