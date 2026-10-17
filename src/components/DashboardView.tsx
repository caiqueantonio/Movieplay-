import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  Clock,
  AlertTriangle,
  Calendar,
  TrendingUp,
  DollarSign,
  Volume2,
  VolumeX,
  Send,
  CreditCard,
  ExternalLink,
  ChevronRight,
  Server,
  ArrowUpRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Client } from '../types';

interface DashboardViewProps {
  onOpenClient: (client: Client) => void;
  onRenewClient: (client: Client) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenClient, onRenewClient }) => {
  const {
    clients,
    plans,
    servers,
    settings,
    toggleSound,
    sendWhatsAppReminder,
    setActiveTab,
    playSound
  } = useApp();

  const [filterOverdue, setFilterOverdue] = useState<string>('todos');

  // Real calculated metrics from persistent clients data
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === 'Em dia').length;
  const pendingClients = clients.filter(c => c.status === 'Pendente').length;
  const overdueClients = clients.filter(c => c.status === 'Em atraso').length;
  const expiring7dClients = clients.filter(c => c.status === 'Vencendo (7d)').length;

  const mensalCount = clients.filter(c => (c.plano || '').toLowerCase().includes('mensal')).length;
  const trimestralCount = clients.filter(c => (c.plano || '').toLowerCase().includes('trimestral')).length;
  const anualCount = clients.filter(c => (c.plano || '').toLowerCase().includes('anual')).length;

  // Exact estimated revenue calculation
  const totalEstimatedRevenue = clients.reduce((acc, c) => acc + (Number(c.valor) || 0), 0);

  // Parse Brazilian or ISO date to calculate days overdue
  const getDaysDiff = (dateStr: string): number => {
    if (!dateStr) return 0;
    let targetDate: Date;
    if (dateStr.includes('/')) {
      const [d, m, y] = dateStr.split('/');
      targetDate = new Date(Number(y), Number(m) - 1, Number(d));
    } else {
      targetDate = new Date(dateStr);
    }
    // Using current reference date 2026-10-17
    const now = new Date(2026, 9, 17);
    const diffTime = now.getTime() - targetDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Smart alert list sorted by overdue severity
  const urgentList = [...clients]
    .filter(c => c.status === 'Em atraso' || c.status === 'Vencendo (7d)')
    .map(c => ({
      ...c,
      daysOverdue: getDaysDiff(c.vencimento)
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  const filteredUrgent = filterOverdue === 'todos' 
    ? urgentList 
    : urgentList.filter(c => c.daysOverdue > 60);

  const handleNotifyOwner = (client: Client) => {
    playSound('sino');
    sendWhatsAppReminder(client);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Title & Sound Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Visão geral do seu painel Movieplay
          </p>
        </div>

        <button
          onClick={toggleSound}
          className={`self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold tracking-wider transition-all shadow-sm ${
            settings.soundEnabled
              ? 'bg-[#150d12] border-red-600/70 text-red-400 shadow-[0_0_12px_rgba(220,38,38,0.25)]'
              : 'bg-[#10121a] border-[#222738] text-gray-400 hover:text-gray-200'
          }`}
        >
          {settings.soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          <span>{settings.soundEnabled ? 'Som ativo' : 'Som desativado'}</span>
        </button>
      </div>

      {/* Row 1 Stats: 5 Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* TOTAL */}
        <div className="bg-[#0f1118] border border-[#1b1f2e] hover:border-[#2b3248] rounded-2xl p-4 transition-all group">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase">TOTAL</span>
            <div className="p-2 rounded-xl bg-[#171a26] text-gray-300 group-hover:text-white transition-colors">
              <Users size={16} />
            </div>
          </div>
          <div className="font-display text-3xl font-extrabold text-white tracking-tight">
            {totalClients}
          </div>
        </div>

        {/* ATIVOS */}
        <div className="bg-[#0f1118] border border-[#1b1f2e] hover:border-emerald-900/50 rounded-2xl p-4 transition-all group">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase">ATIVOS</span>
            <div className="p-2 rounded-xl bg-[#122119] text-emerald-400 group-hover:scale-105 transition-transform">
              <UserCheck size={16} />
            </div>
          </div>
          <div className="font-display text-3xl font-extrabold text-white tracking-tight">
            {activeClients}
          </div>
        </div>

        {/* PENDENTES */}
        <div className="bg-[#0f1118] border border-[#1b1f2e] hover:border-amber-900/50 rounded-2xl p-4 transition-all group">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase">PENDENTES</span>
            <div className="p-2 rounded-xl bg-[#241d13] text-amber-400 group-hover:scale-105 transition-transform">
              <Clock size={16} />
            </div>
          </div>
          <div className="font-display text-3xl font-extrabold text-white tracking-tight">
            {pendingClients}
          </div>
        </div>

        {/* EM ATRASO */}
        <div className="bg-[#0f1118] border border-[#1b1f2e] hover:border-red-900/50 rounded-2xl p-4 transition-all group">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase">EM ATRASO</span>
            <div className="p-2 rounded-xl bg-[#291114] text-red-400 group-hover:scale-105 transition-transform">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="font-display text-3xl font-extrabold text-white tracking-tight">
            {overdueClients}
          </div>
        </div>

        {/* VENCENDO 7D */}
        <div className="bg-[#0f1118] border border-[#1b1f2e] hover:border-orange-900/50 rounded-2xl p-4 transition-all group col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase">VENCENDO (7D)</span>
            <div className="p-2 rounded-xl bg-[#241712] text-orange-400 group-hover:scale-105 transition-transform">
              <Calendar size={16} />
            </div>
          </div>
          <div className="font-display text-3xl font-extrabold text-white tracking-tight">
            {expiring7dClients}
          </div>
        </div>
      </div>

      {/* Row 2 Stats: Plan Counts & Estimated Revenue */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* MENSAL */}
        <div className="bg-[#0f1118] border border-[#1b1f2e] rounded-2xl p-4 transition-all">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase">MENSAL</span>
            <div className="p-2 rounded-xl bg-[#171a26] text-gray-300">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="font-display text-3xl font-extrabold text-white tracking-tight">
            {mensalCount}
          </div>
        </div>

        {/* TRIMESTRAL */}
        <div className="bg-[#0f1118] border border-[#1b1f2e] rounded-2xl p-4 transition-all">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase">TRIMESTRAL</span>
            <div className="p-2 rounded-xl bg-[#171a26] text-gray-300">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="font-display text-3xl font-extrabold text-white tracking-tight">
            {trimestralCount}
          </div>
        </div>

        {/* ANUAL */}
        <div className="bg-[#0f1118] border border-[#1b1f2e] rounded-2xl p-4 transition-all">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase">ANUAL</span>
            <div className="p-2 rounded-xl bg-[#171a26] text-gray-300">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="font-display text-3xl font-extrabold text-white tracking-tight">
            {anualCount}
          </div>
        </div>

        {/* RECEITA ESTIMADA */}
        <div className="bg-[#140b10] border border-red-900/50 hover:border-red-600/70 rounded-2xl p-4 transition-all relative overflow-hidden shadow-[0_0_20px_rgba(220,38,38,0.15)] col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-red-300 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">RECEITA ESTIMADA</span>
            <div className="p-2 rounded-xl bg-red-950/70 text-red-400 border border-red-800/40">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            R$ {totalEstimatedRevenue.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Alertas Inteligentes Section */}
      <div className="bg-[#0c0e15] border border-[#1b1f2e] rounded-2xl p-5 md:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[#181b26]">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={20} className="text-red-500" />
            <h2 className="font-display text-lg font-bold text-white tracking-wide">
              Alertas Inteligentes
            </h2>
            <span className="text-xs bg-red-950/80 text-red-400 px-2.5 py-0.5 rounded-full border border-red-800/50 font-bold">
              {urgentList.length} registros
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterOverdue('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterOverdue === 'todos'
                  ? 'bg-red-600 text-white shadow-[0_0_8px_#dc2626]'
                  : 'bg-[#141724] text-gray-400 hover:text-white'
              }`}
            >
              Todos ({urgentList.length})
            </button>
            <button
              onClick={() => setFilterOverdue('criticos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterOverdue === 'criticos'
                  ? 'bg-red-600 text-white shadow-[0_0_8px_#dc2626]'
                  : 'bg-[#141724] text-gray-400 hover:text-white'
              }`}
            >
              Críticos (+60d)
            </button>
            <button
              onClick={() => setActiveTab('clientes')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#141724] hover:bg-[#1d2235] text-gray-300 hover:text-white flex items-center gap-1 transition-all"
            >
              <span>Ver Todos Clientes</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* List of Overdue Clients */}
        <div className="divide-y divide-[#161824]">
          {filteredUrgent.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">
              Nenhum alerta pendente para a seleção atual.
            </div>
          ) : (
            filteredUrgent.map(client => (
              <div
                key={client.id}
                className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-[#111420]/60 px-3 rounded-xl transition-all group"
              >
                {/* Left: Client Name & Details */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1b1f2e] border border-[#2b334a] text-gray-200 font-bold text-xs flex items-center justify-center shrink-0">
                    {client.nome.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white group-hover:text-red-400 transition-colors">
                        {client.nome}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-[#181c2b] text-gray-400 border border-[#242b40]">
                        {client.servidor}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-[#181c2b] text-gray-400 border border-[#242b40]">
                        {client.plano}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-3">
                      <span>Vencimento: <strong className="text-gray-300">{client.vencimento}</strong></span>
                      <span>Valor: <strong className="text-gray-300">R$ {Number(client.valor).toFixed(2)}</strong></span>
                      {client.whatsapp && <span>WhatsApp: {client.whatsapp}</span>}
                    </div>
                  </div>
                </div>

                {/* Right: Days Overdue & Action Buttons */}
                <div className="flex items-center gap-3 self-end md:self-auto">
                  <span className="text-xs font-bold text-red-500 font-mono-code tracking-wide">
                    {client.daysOverdue > 0 ? `${client.daysOverdue}d atrasado` : 'Vence em breve'}
                  </span>

                  <button
                    onClick={() => handleNotifyOwner(client)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151016] border border-red-950 hover:border-red-600/70 text-gray-300 hover:text-white text-xs font-semibold transition-all shadow-sm"
                    title="Notificar proprietário / Enviar cobrança no WhatsApp"
                  >
                    <Send size={12} className="text-red-500" />
                    <span>Notificar proprietário</span>
                  </button>

                  <button
                    onClick={() => onRenewClient(client)}
                    className="p-1.5 rounded-lg bg-[#141724] hover:bg-emerald-950/60 hover:text-emerald-400 text-gray-400 border border-[#202538] transition-all"
                    title="Registrar pagamento ou renovar"
                  >
                    <CreditCard size={15} />
                  </button>

                  <button
                    onClick={() => onOpenClient(client)}
                    className="p-1.5 rounded-lg bg-[#141724] hover:bg-[#1f2436] text-gray-400 hover:text-white border border-[#202538] transition-all"
                    title="Abrir ficha completa"
                  >
                    <ExternalLink size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Visual Distribution Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Servers Distribution */}
        <div className="bg-[#0f1118] border border-[#1b1f2e] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Server size={17} className="text-red-500" />
              <h3 className="font-display text-sm font-bold text-white">Distribuição por Servidor</h3>
            </div>
            <span className="text-xs text-gray-500">{servers.length} servidores</span>
          </div>

          <div className="space-y-3">
            {servers.map(srv => {
              const count = clients.filter(c => (c.servidor || '').toLowerCase() === srv.nome.toLowerCase()).length;
              const percent = totalClients > 0 ? Math.round((count / totalClients) * 100) : 0;
              return (
                <div key={srv.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-300">{srv.nome}</span>
                    <span className="font-mono-code text-gray-400">{count} clientes ({percent}%)</span>
                  </div>
                  <div className="w-full h-2 bg-[#171a26] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Plans Distribution */}
        <div className="bg-[#0f1118] border border-[#1b1f2e] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={17} className="text-red-500" />
              <h3 className="font-display text-sm font-bold text-white">Planos Contratados</h3>
            </div>
            <span className="text-xs text-gray-500">{plans.length} planos</span>
          </div>

          <div className="space-y-3">
            {plans.map(p => {
              const count = clients.filter(c => (c.plano || '').toLowerCase() === p.nome.toLowerCase()).length;
              const percent = totalClients > 0 ? Math.round((count / totalClients) * 100) : 0;
              return (
                <div key={p.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-300">{p.nome} (R$ {Number(p.valorPadrao).toFixed(2)})</span>
                    <span className="font-mono-code text-gray-400">{count} clientes ({percent}%)</span>
                  </div>
                  <div className="w-full h-2 bg-[#171a26] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-700 to-red-500 rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
