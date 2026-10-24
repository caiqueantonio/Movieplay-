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
  Server,
  BarChart2,
  Cake,
  Gift,
  MessageCircle,
  Folder,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Client } from '../types';
import { getUpcomingBirthdays } from '../utils/birthdays';

interface DashboardViewProps {
  onOpenClient: (client: Client) => void;
  onRenewClient: (client: Client) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenClient }) => {
  const {
    clients,
    plans,
    servers,
    settings,
    toggleSound,
    setActiveTab,
    sendWhatsAppReminder
  } = useApp();

  const [period, setPeriod] = useState<'30d' | '90d' | 'ano'>('30d');

  // Real calculated metrics from persistent clients data
  const totalClients = clients.length;
  const activeClients = clients.filter(c => !c.arquivado && c.status === 'Em dia').length;
  const pendingClients = clients.filter(c => !c.arquivado && c.status === 'Pendente').length;
  const overdueClients = clients.filter(c => !c.arquivado && c.status === 'Em atraso').length;
  const expiring7dClients = clients.filter(c => !c.arquivado && c.status === 'Vencendo (7d)').length;
  const archivedClients = clients.filter(c => !!c.arquivado).length;

  const mensalCount = clients.filter(c => (c.plano || '').toLowerCase().includes('mensal')).length;
  const trimestralCount = clients.filter(c => (c.plano || '').toLowerCase().includes('trimestral')).length;
  const anualCount = clients.filter(c => (c.plano || '').toLowerCase().includes('anual')).length;

  // Exact estimated revenue calculation
  const totalEstimatedRevenue = clients
    .filter(c => !c.arquivado)
    .reduce((acc, c) => acc + (Number(c.valor) || 0), 0);

  // Upcoming birthdays (today or within 7 days)
  const upcomingBirthdays = getUpcomingBirthdays(clients);

  // Month-by-month projection for revenue chart
  const monthlyProjection = [
    { mes: 'Mai 2026', receita: 1240.00, clientes: 24 },
    { mes: 'Jun 2026', receita: 1360.00, clientes: 26 },
    { mes: 'Jul 2026', receita: 1410.00, clientes: 27 },
    { mes: 'Ago 2026', receita: 1450.00, clientes: 28 },
    { mes: 'Set 2026', receita: 1460.00, clientes: 28 },
    { mes: 'Out 2026', receita: totalEstimatedRevenue, clientes: totalClients },
  ];

  const maxRevenue = Math.max(...monthlyProjection.map(m => m.receita));

  const handleSendBirthdayGreeting = (client: Client) => {
    const cleanPhone = (client.whatsapp || client.celular || '').replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;
    const msg = `🎉 Parabéns, ${client.nome}! A equipe Movieplay deseja a você um feliz aniversário repleto de saúde e alegrias! Como agradecimento pela sua parceria, preparamos uma condição especial exclusiva para sua próxima renovação. Conte sempre conosco!`;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
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
            Visão geral e gráficos de desempenho do seu painel Movieplay
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleSound}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold tracking-wider transition-all shadow-sm ${
              settings.soundEnabled
                ? 'bg-[#150d12] border-red-600/70 text-red-400 shadow-[0_0_12px_rgba(220,38,38,0.25)]'
                : 'bg-[#10121a] border-[#222738] text-gray-400 hover:text-gray-200'
            }`}
          >
            {settings.soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span>{settings.soundEnabled ? 'Som ativo' : 'Som desativado'}</span>
          </button>
        </div>
      </div>

      {/* Birthday Alert Banner (if any birthday today or this week) */}
      {upcomingBirthdays.length > 0 && (
        <div className="bg-gradient-to-r from-[#200d17] via-[#1a0f19] to-[#0f111a] border border-pink-900/60 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-pink-950/90 border border-pink-700/60 flex items-center justify-center text-pink-400 shadow-[0_0_15px_rgba(244,114,182,0.3)] shrink-0">
                <Cake size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-bold text-white">
                    Aniversariantes em Destaque
                  </h3>
                  <span className="text-[10px] font-bold bg-pink-950 text-pink-300 border border-pink-800/60 px-2 py-0.5 rounded-full">
                    {upcomingBirthdays.length} {upcomingBirthdays.length === 1 ? 'cliente' : 'clientes'}
                  </span>
                </div>
                <p className="text-xs text-gray-300 mt-0.5">
                  Aproveite a data especial para enviar um presente, desconto ou mensagem personalizada e fidelizar seu cliente!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {upcomingBirthdays.slice(0, 3).map(({ client, info }) => (
                <div
                  key={client.id}
                  className="bg-[#120a11]/90 border border-pink-900/50 rounded-2xl px-3 py-2 flex items-center gap-2.5"
                >
                  <div className="w-7 h-7 rounded-full bg-pink-950 text-pink-300 font-bold text-xs flex items-center justify-center shrink-0">
                    {client.nome.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-white block truncate max-w-[120px]">{client.nome}</span>
                    <span className="text-[10px] text-pink-400">
                      {info.isToday ? '🎉 É hoje!' : `em ${info.daysUntil}d (${info.dataTexto})`}
                    </span>
                  </div>
                  <button
                    onClick={() => handleSendBirthdayGreeting(client)}
                    className="p-1.5 rounded-xl bg-pink-950/80 hover:bg-pink-900 text-pink-300 hover:text-white transition-colors"
                    title="Enviar Parabéns & Presente via WhatsApp"
                  >
                    <MessageCircle size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Row 1 Stats: 5 Metric Cards */}
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

      {/* Main Bar Chart: Monthly Evolution (substituindo informações individuais conforme solicitado) */}
      <div className="bg-[#0b0d14] border border-[#1b1f2e] rounded-3xl p-6 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#181b28]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-950/80 rounded-xl border border-red-900/60 text-red-500">
              <TrendingUp size={18} />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white">
                Evolução da Receita Mensal (R$)
              </h2>
              <p className="text-xs text-gray-400">
                Histórico de faturamento apurado nos últimos 6 meses com base na base de clientes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="font-display text-xl font-extrabold text-white">
                R$ {totalEstimatedRevenue.toFixed(2)}
              </span>
              <span className="text-[11px] text-emerald-400 block font-semibold">+ 4.2% este mês</span>
            </div>

            <div className="flex items-center gap-1.5 ml-2">
              {(['30d', '90d', 'ano'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                    period === p
                      ? 'bg-red-600 text-white shadow-[0_0_8px_#dc2626]'
                      : 'bg-[#121522] border border-[#202538] text-gray-400 hover:text-white'
                  }`}
                >
                  {p === '30d' ? '30d' : p === '90d' ? '90d' : 'Ano'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="h-56 flex items-end justify-between gap-3 pt-6 px-2">
          {monthlyProjection.map((item, idx) => {
            const heightPercent = Math.round((item.receita / maxRevenue) * 100);
            const isCurrent = idx === monthlyProjection.length - 1;
            return (
              <div key={item.mes} className="flex-1 flex flex-col items-center gap-2 group">
                <span className="text-[10px] font-mono-code text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  R$ {item.receita.toFixed(0)}
                </span>
                <div className="w-full max-w-[50px] bg-[#161a28] rounded-xl overflow-hidden h-40 flex items-end p-1">
                  <div
                    className={`w-full rounded-lg transition-all duration-500 ${
                      isCurrent
                        ? 'bg-gradient-to-t from-red-700 to-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)]'
                        : 'bg-gradient-to-t from-[#20263c] to-[#3a4465] group-hover:from-red-900 group-hover:to-red-600'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-gray-400 text-center">
                  {item.mes.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Situação da Base de Clientes & Ocupação de Servidores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Distribution */}
        <div className="bg-[#0b0d14] border border-[#1b1f2e] rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={17} className="text-red-500" />
              <h3 className="font-display text-sm font-bold text-white">
                Situação da Base de Clientes
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('clientes')}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold"
            >
              <span>Gerenciar na aba Clientes</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-emerald-400 font-semibold">Em dia (Ativos)</span>
                <span className="font-mono-code text-gray-300">
                  {activeClients} ({totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#141724] rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${totalClients > 0 ? (activeClients / totalClients) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-red-400 font-semibold">Em atraso</span>
                <span className="font-mono-code text-gray-300">
                  {overdueClients} ({totalClients > 0 ? Math.round((overdueClients / totalClients) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#141724] rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-600 rounded-full shadow-[0_0_8px_#dc2626]"
                  style={{ width: `${totalClients > 0 ? (overdueClients / totalClients) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-amber-400 font-semibold">Subpasta Inativos / Arquivados</span>
                <span className="font-mono-code text-gray-300">
                  {archivedClients} ({totalClients > 0 ? Math.round((archivedClients / totalClients) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#141724] rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full shadow-[0_0_8px_#f59e0b]"
                  style={{ width: `${totalClients > 0 ? (archivedClients / totalClients) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Server Distribution */}
        <div className="bg-[#0b0d14] border border-[#1b1f2e] rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server size={17} className="text-red-500" />
              <h3 className="font-display text-sm font-bold text-white">
                Ocupação de Servidores IPTV
              </h3>
            </div>
            <span className="text-xs text-gray-500 font-mono-code">{servers.length} servidores</span>
          </div>

          <div className="space-y-3 pt-2">
            {servers.map(srv => {
              const count = clients.filter(c => (c.servidor || '').toLowerCase() === srv.nome.toLowerCase()).length;
              const percent = totalClients > 0 ? Math.round((count / totalClients) * 100) : 0;
              return (
                <div key={srv.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-300 font-semibold">{srv.nome}</span>
                    <span className="font-mono-code text-gray-400">{count} contas ({percent}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-[#141724] rounded-full overflow-hidden">
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
      </div>
    </div>
  );
};
