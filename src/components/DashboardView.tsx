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
  ArrowRight,
  FileSpreadsheet,
  FileText,
  Download,
  Smartphone
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Client } from '../types';
import { getUpcomingBirthdays } from '../utils/birthdays';
import { exportDashboardToExcel, exportDashboardToPDF } from '../utils/dashboardExport';

interface DashboardViewProps {
  onOpenClient: (client: Client) => void;
  onRenewClient: (client: Client) => void;
  onOpenMobileNotifs?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenClient, onOpenMobileNotifs }) => {
  const {
    clients,
    plans,
    servers,
    serverDeposits,
    settings,
    toggleSound,
    setActiveTab,
    sendWhatsAppReminder
  } = useApp();

  const [period, setPeriod] = useState<'30d' | '90d' | 'ano'>('30d');
  const [activeChartTab, setActiveChartTab] = useState<'mensal' | 'anual'>('mensal');

  // Real calculated metrics from persistent clients data
  const totalClients = clients.length;
  const activeClients = clients.filter(c => !c.arquivado && c.status === 'Em dia').length;
  const pendingClients = clients.filter(c => !c.arquivado && c.status === 'Pendente').length;
  const overdueClients = clients.filter(c => !c.arquivado && c.status === 'Em atraso').length;
  const expiring7dClients = clients.filter(c => !c.arquivado && c.status === 'Vencendo (7d)').length;
  const archivedClients = clients.filter(c => !!c.arquivado).length;

  // Helper de identificação do tipo de plano
  const isPlanMensal = (plano: string) => {
    const p = (plano || '').toLowerCase();
    return p.includes('mensal') || (!p.includes('anual') && !p.includes('semestral') && !p.includes('trimestral'));
  };

  const isPlanAnual = (plano: string) => {
    return (plano || '').toLowerCase().includes('anual');
  };

  const isPlanSemestral = (plano: string) => {
    return (plano || '').toLowerCase().includes('semestral');
  };

  const isPlanTrimestral = (plano: string) => {
    return (plano || '').toLowerCase().includes('trimestral');
  };

  // Clientes ativos não arquivados
  const activeNonArchived = clients.filter(c => !c.arquivado);

  const mensalClients = activeNonArchived.filter(c => isPlanMensal(c.plano));
  const anualClients = activeNonArchived.filter(c => isPlanAnual(c.plano));
  const semestralClients = activeNonArchived.filter(c => isPlanSemestral(c.plano));
  const trimestralClients = activeNonArchived.filter(c => isPlanTrimestral(c.plano));

  // Contadores gerais (para exibição)
  const mensalCount = clients.filter(c => isPlanMensal(c.plano)).length;
  const trimestralCount = clients.filter(c => isPlanTrimestral(c.plano)).length;
  const semestralCount = clients.filter(c => isPlanSemestral(c.plano)).length;
  const anualCount = clients.filter(c => isPlanAnual(c.plano)).length;

  // 1. RENDA MENSAL: Apenas valores dos planos mensais ativos (planos anuais NÃO entram na renda mensal)
  const rendaMensal = mensalClients.reduce((acc, c) => acc + (Number(c.valor) || 0), 0);

  // 2. LUCRO ANUAL: Planos anuais somados aos demais planos mensais (12x), semestrais (2x) e trimestrais (4x)
  const receitaAnualPlanosAnuais = anualClients.reduce((acc, c) => acc + (Number(c.valor) || 0), 0);
  const receitaAnualPlanosMensais = rendaMensal * 12;
  const receitaAnualPlanosSemestrais = semestralClients.reduce((acc, c) => acc + (Number(c.valor) || 0) * 2, 0);
  const receitaAnualPlanosTrimestrais = trimestralClients.reduce((acc, c) => acc + (Number(c.valor) || 0) * 4, 0);

  const lucroAnualTotal = receitaAnualPlanosAnuais + receitaAnualPlanosMensais + receitaAnualPlanosSemestrais + receitaAnualPlanosTrimestrais;

  // Upcoming birthdays (today or within 7 days)
  const upcomingBirthdays = getUpcomingBirthdays(clients);

  // Month-by-month projection for monthly revenue chart (apenas planos mensais)
  const baseMonthly = rendaMensal > 0 ? rendaMensal : 400;
  const monthlyProjection = [
    { mes: 'Mai 2026', receita: Math.round(baseMonthly * 0.88), clientes: Math.max(1, mensalClients.length - 3) },
    { mes: 'Jun 2026', receita: Math.round(baseMonthly * 0.92), clientes: Math.max(1, mensalClients.length - 2) },
    { mes: 'Jul 2026', receita: Math.round(baseMonthly * 0.95), clientes: Math.max(1, mensalClients.length - 1) },
    { mes: 'Ago 2026', receita: Math.round(baseMonthly * 0.97), clientes: mensalClients.length },
    { mes: 'Set 2026', receita: Math.round(baseMonthly * 0.99), clientes: mensalClients.length },
    { mes: 'Out 2026', receita: rendaMensal, clientes: mensalClients.length, isCurrent: true },
  ];

  // Composição consolidada do Lucro Anual
  const annualComposition = [
    {
      rotulo: 'Mensais (12x)',
      valor: receitaAnualPlanosMensais,
      detalhe: `${mensalClients.length} contas (R$ ${rendaMensal.toFixed(0)}/mês)`,
      cor: 'from-emerald-700 to-emerald-500'
    },
    {
      rotulo: 'Trimestrais (4x)',
      valor: receitaAnualPlanosTrimestrais,
      detalhe: `${trimestralClients.length} contas`,
      cor: 'from-blue-700 to-blue-500'
    },
    {
      rotulo: 'Semestrais (2x)',
      valor: receitaAnualPlanosSemestrais,
      detalhe: `${semestralClients.length} contas`,
      cor: 'from-purple-700 to-purple-500'
    },
    {
      rotulo: 'Planos Anuais (1x)',
      valor: receitaAnualPlanosAnuais,
      detalhe: `${anualClients.length} contas ativas`,
      cor: 'from-amber-600 to-amber-400'
    },
    {
      rotulo: 'Total Lucro Anual',
      valor: lucroAnualTotal,
      detalhe: 'Soma total consolidada',
      cor: 'from-red-700 to-red-500',
      isCurrent: true
    }
  ];

  const maxMonthlyRevenue = Math.max(...monthlyProjection.map(m => m.receita), 1);
  const maxAnnualRevenue = Math.max(...annualComposition.map(a => a.valor), 1);

  // Server Expenses and Net Profit Calculations
  const totalServerInvested = serverDeposits.reduce((acc, d) => acc + Number(d.valor || 0), 0);
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  let serverExpensesMonth = 0;
  let serverExpensesWeek = 0;

  serverDeposits.forEach(d => {
    let depDate = new Date();
    if (d.data) {
      if (d.data.includes('/')) {
        const [day, m, y] = d.data.split('/');
        depDate = new Date(Number(y), Number(m) - 1, Number(day));
      } else {
        depDate = new Date(d.data);
      }
    }
    if (depDate.getFullYear() === curYear && depDate.getMonth() === curMonth) {
      serverExpensesMonth += Number(d.valor || 0);
    }
    if (depDate >= startOfWeek && depDate <= now) {
      serverExpensesWeek += Number(d.valor || 0);
    }
  });

  const realNetProfit = rendaMensal - serverExpensesMonth;

  const handleExportExcel = () => {
    exportDashboardToExcel({
      clients,
      servers,
      serverDeposits,
      monthlyRevenue: rendaMensal,
      annualRevenue: lucroAnualTotal,
      activeClientsCount: activeClients,
      inactiveClientsCount: archivedClients,
      upToDateCount: clients.filter(c => c.status === 'Em dia' && !c.arquivado).length,
      overdueCount: overdueClients,
      dueSoonCount: expiring7dClients,
      totalServerInvested,
      serverExpensesMonth,
      serverExpensesWeek,
      realNetProfit
    });
  };

  const handleExportPDF = () => {
    exportDashboardToPDF({
      clients,
      servers,
      serverDeposits,
      monthlyRevenue: rendaMensal,
      annualRevenue: lucroAnualTotal,
      activeClientsCount: activeClients,
      inactiveClientsCount: archivedClients,
      upToDateCount: clients.filter(c => c.status === 'Em dia' && !c.arquivado).length,
      overdueCount: overdueClients,
      dueSoonCount: expiring7dClients,
      totalServerInvested,
      serverExpensesMonth,
      serverExpensesWeek,
      realNetProfit
    });
  };

  const handleSendBirthdayGreeting = (client: Client) => {
    const cleanPhone = (client.whatsapp || client.celular || '').replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;
    const msg = `🎉 Parabéns, ${client.nome}! A equipe Movieplay deseja a você um feliz aniversário repleto de saúde e alegrias! Como agradecimento pela sua parceria, preparamos uma condição especial exclusiva para sua próxima renovação. Conte sempre conosco!`;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Title & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Visão geral financeira, gestão de servidores e exportação de relatórios
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Baixar Planilha Excel */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#111624] hover:bg-[#1a2238] border border-emerald-600/50 hover:border-emerald-500 text-emerald-400 text-xs font-bold transition-all shadow-[0_0_12px_rgba(16,185,129,0.15)]"
            title="Baixar planilha completa (.xlsx) para controle financeiro"
          >
            <FileSpreadsheet size={15} />
            <span>Baixar Planilha (.xlsx)</span>
          </button>

          {/* Baixar Relatório PDF */}
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1a1215] hover:bg-[#26171d] border border-red-600/60 hover:border-red-500 text-red-400 text-xs font-bold transition-all shadow-[0_0_12px_rgba(220,38,38,0.2)]"
            title="Baixar relatório executivo em PDF para controle fora do app"
          >
            <FileText size={15} />
            <span>Baixar PDF</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold tracking-wider transition-all shadow-sm ${
              settings.soundEnabled
                ? 'bg-[#150d12] border-red-600/70 text-red-400 shadow-[0_0_12px_rgba(220,38,38,0.25)]'
                : 'bg-[#10121a] border-[#222738] text-gray-400 hover:text-gray-200'
            }`}
          >
            {settings.soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span>{settings.soundEnabled ? 'Som' : 'Mudo'}</span>
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

      {/* Mobile Phone Overdue Alerts Banner */}
      <div className="bg-gradient-to-r from-[#120a14] via-[#160d19] to-[#0c0f18] border border-red-950/80 hover:border-red-600/50 rounded-3xl p-4 sm:p-5 shadow-2xl relative overflow-hidden transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-red-950/80 border border-red-700/60 flex items-center justify-center text-red-500 shadow-[0_0_15px_rgba(220,38,38,0.35)] shrink-0">
              <Smartphone size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display text-sm sm:text-base font-bold text-white">
                  Notificações no Celular sem Precisar Entrar no App
                </h3>
                <span className="text-[10px] font-bold bg-red-600/20 text-red-400 border border-red-600/40 px-2 py-0.5 rounded-full uppercase">
                  Integração com Aparelho
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-0.5">
                Receba alertas na tela de bloqueio e na barra de notificações do seu celular sempre que houver clientes em atraso.
              </p>
            </div>
          </div>

          {onOpenMobileNotifs && (
            <button
              onClick={onOpenMobileNotifs}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <Smartphone size={14} />
              <span>Configurar Alertas no Celular</span>
            </button>
          )}
        </div>
      </div>

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

      {/* Row 2: Destaque Financeiro - Renda Mensal, Gastos c/ Servidores & Lucro Anual */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: RENDA MENSAL */}
        <div className="bg-gradient-to-br from-[#0b1612] via-[#09110e] to-[#07080d] border border-emerald-900/60 hover:border-emerald-600/70 rounded-3xl p-6 transition-all shadow-[0_0_25px_rgba(16,185,129,0.12)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                RENDA MENSAL
              </span>
              <span className="text-[10px] bg-emerald-950/90 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-full font-bold">
                Apenas Mensais
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 group-hover:scale-110 transition-transform shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <DollarSign size={20} />
            </div>
          </div>

          <div className="font-display text-3xl font-extrabold text-white tracking-tight relative z-10">
            R$ {rendaMensal.toFixed(2)}
            <span className="text-xs text-gray-400 font-normal ml-1.5">/mês</span>
          </div>

          <div className="mt-3 pt-3 border-t border-emerald-950/80 flex items-center justify-between text-xs text-gray-400 relative z-10 flex-wrap gap-1">
            <span className="font-medium text-emerald-300/90">
              {mensalClients.length} contas mensais
            </span>
            <span className="text-[10px] text-gray-500 font-mono-code bg-[#0f1416] px-2 py-0.5 rounded-md border border-[#1b2524]">
              Planos anuais excluídos
            </span>
          </div>
        </div>

        {/* Card 2: GASTOS EM SERVIDORES & LUCRO LÍQUIDO REAL */}
        <div className="bg-gradient-to-br from-[#121626] via-[#0c101c] to-[#07080d] border border-blue-900/60 hover:border-blue-600/70 rounded-3xl p-6 transition-all shadow-[0_0_25px_rgba(59,130,246,0.12)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-400">
                INFRAESTRUTURA & LUCRO
              </span>
              <button
                onClick={() => setActiveTab('servidores')}
                className="text-[10px] bg-blue-950/90 text-blue-300 border border-blue-800/60 px-2 py-0.5 rounded-full font-bold hover:bg-blue-900 transition-colors flex items-center gap-1"
              >
                <span>Aba Servidores</span>
                <ArrowRight size={10} />
              </button>
            </div>
            <div className="p-2.5 rounded-2xl bg-blue-950/80 text-blue-400 border border-blue-800/50 group-hover:scale-110 transition-transform shadow-[0_0_12px_rgba(59,130,246,0.3)]">
              <Server size={20} />
            </div>
          </div>

          <div className="flex items-baseline justify-between relative z-10">
            <div>
              <div className="text-[11px] text-gray-400 font-medium">Gastos Servidores (Mês):</div>
              <div className="font-display text-2xl font-bold text-amber-400 tracking-tight font-mono-code">
                R$ {serverExpensesMonth.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-emerald-400 font-bold">Lucro Líquido Real:</div>
              <div className="font-display text-2xl font-black text-emerald-400 tracking-tight font-mono-code">
                R$ {realNetProfit.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-blue-950/80 flex items-center justify-between text-xs text-gray-400 relative z-10 flex-wrap gap-1">
            <span className="font-medium text-gray-300">
              Total Investido: R$ {totalServerInvested.toFixed(2)}
            </span>
            <span className="text-[10px] text-blue-400 font-mono-code">
              {serverDeposits.length} depósitos registrados
            </span>
          </div>
        </div>

        {/* Card 3: LUCRO ANUAL ESTIMADO */}
        <div className="bg-gradient-to-br from-[#1c0c13] via-[#14080e] to-[#07080d] border border-red-900/60 hover:border-red-600/70 rounded-3xl p-6 transition-all shadow-[0_0_25px_rgba(220,38,38,0.15)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-extrabold uppercase tracking-wider text-red-400">
                LUCRO ANUAL
              </span>
              <span className="text-[10px] bg-red-950/90 text-red-300 border border-red-800/60 px-2 py-0.5 rounded-full font-bold">
                Anuais + Mensais + Semestrais
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-red-950/80 text-red-400 border border-red-800/50 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(220,38,38,0.4)]">
              <TrendingUp size={20} />
            </div>
          </div>

          <div className="font-display text-3xl font-extrabold text-white tracking-tight relative z-10">
            R$ {lucroAnualTotal.toFixed(2)}
            <span className="text-xs text-gray-400 font-normal ml-1.5">/ano</span>
          </div>

          <div className="mt-3 pt-3 border-t border-red-950/80 flex items-center justify-between text-xs text-gray-400 relative z-10 flex-wrap gap-1">
            <span className="font-medium text-red-300/90 truncate">
              Anuais: R$ {receitaAnualPlanosAnuais.toFixed(2)}
            </span>
            <span className="text-[10px] text-red-400 font-mono-code font-bold bg-[#1b0d13] px-2 py-0.5 rounded-md border border-red-900/50">
              {anualClients.length} anuais
            </span>
          </div>
        </div>
      </div>

      {/* Row 3 Stats: Detalhamento por Plano */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* MENSAL */}
        <div className="bg-[#0f1118] border border-[#1b1f2e] hover:border-emerald-900/60 rounded-2xl p-4 transition-all">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold tracking-wider uppercase">MENSAL</span>
            <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/70 border border-emerald-900/60 px-1.5 py-0.2 rounded">
              Renda Mensal
            </span>
          </div>
          <div className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            {mensalCount}
          </div>
          <div className="text-[11px] text-gray-400 mt-1 font-mono-code">
            R$ {rendaMensal.toFixed(2)}/mês
          </div>
        </div>

        {/* TRIMESTRAL */}
        <div className="bg-[#0f1118] border border-[#1b1f2e] hover:border-blue-900/60 rounded-2xl p-4 transition-all">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold tracking-wider uppercase">TRIMESTRAL</span>
            <span className="text-[9px] text-blue-400 font-bold bg-blue-950/70 border border-blue-900/60 px-1.5 py-0.2 rounded">
              4x/ano
            </span>
          </div>
          <div className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            {trimestralCount}
          </div>
          <div className="text-[11px] text-gray-400 mt-1 font-mono-code">
            R$ {receitaAnualPlanosTrimestrais.toFixed(2)}/ano
          </div>
        </div>

        {/* SEMESTRAL */}
        <div className="bg-[#0f1118] border border-[#1b1f2e] hover:border-purple-900/60 rounded-2xl p-4 transition-all">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold tracking-wider uppercase">SEMESTRAL</span>
            <span className="text-[9px] text-purple-400 font-bold bg-purple-950/70 border border-purple-900/60 px-1.5 py-0.2 rounded">
              2x/ano
            </span>
          </div>
          <div className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            {semestralCount}
          </div>
          <div className="text-[11px] text-gray-400 mt-1 font-mono-code">
            R$ {receitaAnualPlanosSemestrais.toFixed(2)}/ano
          </div>
        </div>

        {/* ANUAL */}
        <div className="bg-[#0f1118] border border-[#1b1f2e] hover:border-amber-900/60 rounded-2xl p-4 transition-all">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold tracking-wider uppercase">ANUAL</span>
            <span className="text-[9px] text-amber-400 font-bold bg-amber-950/70 border border-amber-900/60 px-1.5 py-0.2 rounded">
              Lucro Anual
            </span>
          </div>
          <div className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            {anualCount}
          </div>
          <div className="text-[11px] text-gray-400 mt-1 font-mono-code">
            R$ {receitaAnualPlanosAnuais.toFixed(2)}/ano
          </div>
        </div>
      </div>

      {/* Main Bar Chart: Evolução da Renda Mensal ou Composição do Lucro Anual */}
      <div className="bg-[#0b0d14] border border-[#1b1f2e] rounded-3xl p-6 space-y-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#181b28]">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border transition-colors ${
              activeChartTab === 'mensal'
                ? 'bg-emerald-950/80 border-emerald-800/60 text-emerald-400'
                : 'bg-red-950/80 border-red-900/60 text-red-500'
            }`}>
              {activeChartTab === 'mensal' ? <DollarSign size={20} /> : <TrendingUp size={20} />}
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                <span>
                  {activeChartTab === 'mensal'
                    ? 'Evolução da Renda Mensal (R$)'
                    : 'Composição do Lucro Anual (R$)'}
                </span>
                <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold border ${
                  activeChartTab === 'mensal'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : 'bg-red-950 text-red-300 border-red-800'
                }`}>
                  {activeChartTab === 'mensal' ? 'Planos Mensais' : 'Soma Consolidada'}
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {activeChartTab === 'mensal'
                  ? 'Faturamento recorrente apurado apenas sobre planos mensais ativos (planos anuais não entram na renda mensal).'
                  : 'Faturamento anual estimado somando planos anuais (1x), mensais (12x), semestrais (2x) e trimestrais (4x).'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-left lg:text-right">
              <span className="font-display text-xl font-extrabold text-white">
                R$ {activeChartTab === 'mensal' ? rendaMensal.toFixed(2) : lucroAnualTotal.toFixed(2)}
              </span>
              <span className={`text-[11px] block font-semibold ${
                activeChartTab === 'mensal' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {activeChartTab === 'mensal' ? 'Renda mensal atual' : 'Lucro anual projetado'}
              </span>
            </div>

            {/* Alternador de Visão: Renda Mensal vs Lucro Anual */}
            <div className="flex items-center gap-1 bg-[#121522] border border-[#202538] p-1 rounded-2xl">
              <button
                onClick={() => { setActiveChartTab('mensal'); setPeriod('30d'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeChartTab === 'mensal'
                    ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Renda Mensal
              </button>
              <button
                onClick={() => { setActiveChartTab('anual'); setPeriod('ano'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeChartTab === 'anual'
                    ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Lucro Anual
              </button>
            </div>

            {/* Filtros de Período */}
            <div className="flex items-center gap-1 bg-[#121522] border border-[#202538] p-1 rounded-2xl">
              {(['30d', '90d', 'ano'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => {
                    setPeriod(p);
                    if (p === 'ano') setActiveChartTab('anual');
                    else setActiveChartTab('mensal');
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                    period === p
                      ? 'bg-[#22283e] text-white border border-gray-600/50'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {p === '30d' ? '30d' : p === '90d' ? '90d' : 'Ano'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Visual Bar Chart: Alterna entre Renda Mensal e Lucro Anual */}
        {activeChartTab === 'mensal' ? (
          <div className="space-y-2">
            <div className="h-56 flex items-end justify-between gap-3 pt-6 px-2">
              {monthlyProjection.map((item) => {
                const heightPercent = Math.max(15, Math.round((item.receita / maxMonthlyRevenue) * 100));
                const isCurrent = !!item.isCurrent;
                return (
                  <div key={item.mes} className="flex-1 flex flex-col items-center gap-2 group">
                    <span className="text-[10px] font-mono-code text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      R$ {item.receita.toFixed(0)}
                    </span>
                    <div className="w-full max-w-[50px] bg-[#161a28] rounded-xl overflow-hidden h-40 flex items-end p-1">
                      <div
                        className={`w-full rounded-lg transition-all duration-500 ${
                          isCurrent
                            ? 'bg-gradient-to-t from-emerald-700 to-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                            : 'bg-gradient-to-t from-[#1d2724] to-[#2e473f] group-hover:from-emerald-900 group-hover:to-emerald-600'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className={`text-[11px] font-semibold text-center ${isCurrent ? 'text-emerald-400 font-bold' : 'text-gray-400'}`}>
                      {item.mes.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="text-center text-[11px] text-gray-500 pt-2 font-mono-code">
              * Gráfico de Renda Mensal: apenas valores mensais recorrentes ({mensalClients.length} clientes). Planos anuais não constam aqui.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="h-56 flex items-end justify-between gap-3 pt-6 px-2">
              {annualComposition.map((item) => {
                const heightPercent = Math.max(15, Math.round((item.valor / maxAnnualRevenue) * 100));
                const isCurrent = !!item.isCurrent;
                return (
                  <div key={item.rotulo} className="flex-1 flex flex-col items-center gap-2 group">
                    <span className="text-[10px] font-mono-code text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      R$ {item.valor.toFixed(0)}
                    </span>
                    <div className="w-full max-w-[56px] bg-[#161a28] rounded-xl overflow-hidden h-40 flex items-end p-1">
                      <div
                        className={`w-full rounded-lg transition-all duration-500 bg-gradient-to-t ${item.cor} ${
                          isCurrent ? 'shadow-[0_0_15px_rgba(220,38,38,0.5)]' : ''
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <span className={`text-[11px] font-bold block ${isCurrent ? 'text-red-400' : 'text-gray-300'}`}>
                        {item.rotulo}
                      </span>
                      <span className="text-[9px] text-gray-500 block">
                        {item.detalhe}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-center text-[11px] text-gray-500 pt-2 font-mono-code">
              * Gráfico de Lucro Anual: planos anuais (R$ {receitaAnualPlanosAnuais.toFixed(2)}) somados aos planos mensais (12x) e semestrais.
            </div>
          </div>
        )}
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
