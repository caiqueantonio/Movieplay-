import React, { useState, useMemo, useRef } from 'react';
import {
  Server,
  Plus,
  ExternalLink,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Settings2,
  Trash2,
  Upload,
  Globe,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Users,
  Search,
  Filter,
  Layers,
  ArrowUpRight,
  Trophy,
  Award,
  Zap,
  BarChart3,
  Flame,
  PieChart,
  ShieldCheck,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ServerItem, ServerDeposit, Client } from '../types';
import { processClientAvatar, pasteImageFromClipboard } from '../utils/imageHelper';

type TimeframeOption = 'mes' | 'semestre' | 'ano' | 'total';
type SortRankingOption = 'lucro' | 'vendas' | 'faturamento' | 'roi' | 'investido';

export const ServersView: React.FC = () => {
  const {
    servers,
    serverDeposits,
    clients,
    updateServer,
    addServerDeposit,
    deleteServerDeposit,
    playSound
  } = useApp();

  // Period / Timeframe state
  const [timeframe, setTimeframe] = useState<TimeframeOption>('mes');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [rankingSort, setRankingSort] = useState<SortRankingOption>('lucro');

  const [searchServer, setSearchServer] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<string>('todos');

  // Modals state
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [selectedServerForDeposit, setSelectedServerForDeposit] = useState<string>('');
  const [depositForm, setDepositForm] = useState<{
    servidorId: string;
    valor: number;
    data: string;
    periodo: 'mensal' | 'semanal' | 'quinzenal' | 'avulso';
    observacoes: string;
  }>({
    servidorId: '',
    valor: 50.00,
    data: new Date().toISOString().slice(0, 10),
    periodo: 'mensal',
    observacoes: ''
  });

  // Adjustments Modal
  const [isEditServerModalOpen, setIsEditServerModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerItem | null>(null);
  const [serverLogoPreview, setServerLogoPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Success Feedback
  const [feedback, setFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Helper de data de depósito
  const parseDepositDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      return new Date(y, m, d);
    }
    return new Date(dateStr);
  };

  // Label amigável do período selecionado
  const timeframeLabel = useMemo(() => {
    switch (timeframe) {
      case 'mes':
        return 'Mês Atual';
      case 'semestre':
        return 'Semestre (6 Meses)';
      case 'ano':
        return `Ano de ${selectedYear} (12 Meses)`;
      case 'total':
        return 'Todo o Período (Histórico)';
    }
  }, [timeframe, selectedYear]);

  // Multiplicador de receita conforme o período para cada tipo de plano
  const getRevenueMultiplier = (plano: string, tf: TimeframeOption): number => {
    const p = (plano || '').toLowerCase();
    const isAnual = p.includes('anual');
    const isSemestral = p.includes('semestral');
    const isTrimestral = p.includes('trimestral');
    // Default = mensal

    if (tf === 'mes') {
      if (isAnual) return 1 / 12; // cota mensal do plano anual
      if (isSemestral) return 1 / 6;
      if (isTrimestral) return 1 / 3;
      return 1; // plano mensal = 1x valor
    } else if (tf === 'semestre') {
      if (isAnual) return 0.5; // meio ano do plano anual
      if (isSemestral) return 1;
      if (isTrimestral) return 2;
      return 6; // plano mensal no semestre = 6x valor
    } else if (tf === 'ano') {
      if (isAnual) return 1;
      if (isSemestral) return 2;
      if (isTrimestral) return 4;
      return 12; // plano mensal no ano = 12x valor
    } else {
      // total / acumulado anual projetado
      if (isAnual) return 1;
      if (isSemestral) return 2;
      if (isTrimestral) return 4;
      return 12;
    }
  };

  // Checar se depósito pertence ao período selecionado
  const isDepositInTimeframe = (depDate: Date, tf: TimeframeOption, year: number): boolean => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    if (tf === 'mes') {
      return depDate.getFullYear() === curYear && depDate.getMonth() === curMonth;
    } else if (tf === 'semestre') {
      // Últimos 180 dias ou mesmo semestre do ano corrente
      const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      return depDate >= sixMonthsAgo && depDate <= now;
    } else if (tf === 'ano') {
      return depDate.getFullYear() === year;
    } else {
      return true; // total
    }
  };

  // Estatísticas aprofundadas por servidor considerando o período selecionado
  const serverFinancialStats = useMemo(() => {
    const activeClients = clients.filter(c => !c.arquivado);

    return servers.map(srv => {
      // Clientes vinculados a este servidor
      const srvClients = activeClients.filter(
        c => (c.servidor || '').trim().toLowerCase() === srv.nome.trim().toLowerCase()
      );

      // Quantidade de clientes
      const clientsCount = srvClients.length;

      // Planos detalhados
      const plansCount = {
        mensal: 0,
        trimestral: 0,
        semestral: 0,
        anual: 0
      };

      let revenueForPeriod = 0;
      let monthlyBaseRevenue = 0; // renda mensal direta

      srvClients.forEach(c => {
        const val = Number(c.valor) || 20;
        const p = (c.plano || '').toLowerCase();

        if (p.includes('anual')) {
          plansCount.anual++;
        } else if (p.includes('semestral')) {
          plansCount.semestral++;
        } else if (p.includes('trimestral')) {
          plansCount.trimestral++;
        } else {
          plansCount.mensal++;
          monthlyBaseRevenue += val;
        }

        const multiplier = getRevenueMultiplier(c.plano, timeframe);
        revenueForPeriod += val * multiplier;
      });

      // Depósitos vinculados a este servidor
      const allServerDeposits = serverDeposits.filter(
        d => d.servidorId === srv.id || d.servidorNome.trim().toLowerCase() === srv.nome.trim().toLowerCase()
      );

      // Depósitos no período selecionado
      const periodDeposits = allServerDeposits.filter(d => {
        const dDate = parseDepositDate(d.data);
        return isDepositInTimeframe(dDate, timeframe, selectedYear);
      });

      const totalInvestedInPeriod = periodDeposits.reduce((acc, d) => acc + Number(d.valor || 0), 0);
      const allTimeInvested = allServerDeposits.reduce((acc, d) => acc + Number(d.valor || 0), 0);

      // Lucro Líquido
      const netProfit = revenueForPeriod - totalInvestedInPeriod;

      // Retorno sobre investimento (ROI)
      const roiRatio = totalInvestedInPeriod > 0
        ? revenueForPeriod / totalInvestedInPeriod
        : revenueForPeriod > 0 ? 10 : 0;

      const roiPercent = totalInvestedInPeriod > 0
        ? ((revenueForPeriod - totalInvestedInPeriod) / totalInvestedInPeriod) * 100
        : revenueForPeriod > 0 ? 100 : 0;

      return {
        server: srv,
        clientsCount,
        srvClients,
        plansCount,
        monthlyBaseRevenue,
        revenueForPeriod,
        totalInvestedInPeriod,
        allTimeInvested,
        periodDepositsCount: periodDeposits.length,
        allDepositsCount: allServerDeposits.length,
        netProfit,
        roiRatio,
        roiPercent
      };
    });
  }, [servers, clients, serverDeposits, timeframe, selectedYear]);

  // Servidores Campeões (Inteligência de Lucro & Vendas)
  const intelligenceHighlights = useMemo(() => {
    if (serverFinancialStats.length === 0) return null;

    // 1. Campeão de Lucro Líquido
    const mostProfitable = [...serverFinancialStats].sort((a, b) => b.netProfit - a.netProfit)[0];

    // 2. Campeão de Vendas / Volume de Clientes (O que mais vende)
    const topSeller = [...serverFinancialStats].sort((a, b) => b.clientsCount - a.clientsCount)[0];

    // 3. Maior Retorno por Investimento (ROI com investimento > 0)
    const investedServers = serverFinancialStats.filter(s => s.totalInvestedInPeriod > 0);
    const bestROI = investedServers.length > 0
      ? [...investedServers].sort((a, b) => b.roiRatio - a.roiRatio)[0]
      : mostProfitable;

    // Totais consolidados no período
    const totalRevenuePeriod = serverFinancialStats.reduce((acc, s) => acc + s.revenueForPeriod, 0);
    const totalInvestedPeriod = serverFinancialStats.reduce((acc, s) => acc + s.totalInvestedInPeriod, 0);
    const totalNetProfitPeriod = totalRevenuePeriod - totalInvestedPeriod;
    const overallROI = totalInvestedPeriod > 0
      ? ((totalRevenuePeriod - totalInvestedPeriod) / totalInvestedPeriod) * 100
      : 100;

    return {
      mostProfitable,
      topSeller,
      bestROI,
      totalRevenuePeriod,
      totalInvestedPeriod,
      totalNetProfitPeriod,
      overallROI
    };
  }, [serverFinancialStats]);

  // Ranking ordenado
  const rankedServers = useMemo(() => {
    const list = [...serverFinancialStats];
    switch (rankingSort) {
      case 'lucro':
        return list.sort((a, b) => b.netProfit - a.netProfit);
      case 'vendas':
        return list.sort((a, b) => b.clientsCount - a.clientsCount);
      case 'faturamento':
        return list.sort((a, b) => b.revenueForPeriod - a.revenueForPeriod);
      case 'roi':
        return list.sort((a, b) => b.roiRatio - a.roiRatio);
      case 'investido':
        return list.sort((a, b) => b.totalInvestedInPeriod - a.totalInvestedInPeriod);
      default:
        return list;
    }
  }, [serverFinancialStats, rankingSort]);

  // Open Deposit Modal
  const handleOpenDepositModal = (serverId?: string) => {
    const targetId = serverId || (servers[0]?.id || '');
    setSelectedServerForDeposit(targetId);
    setDepositForm({
      servidorId: targetId,
      valor: 50.00,
      data: new Date().toISOString().slice(0, 10),
      periodo: 'mensal',
      observacoes: ''
    });
    setIsDepositModalOpen(true);
  };

  // Submit Deposit
  const handleSaveDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetServer = servers.find(s => s.id === depositForm.servidorId) || servers[0];
    if (!targetServer) {
      alert('Selecione um servidor válido.');
      return;
    }

    if (Number(depositForm.valor) <= 0) {
      alert('Informe um valor de depósito válido.');
      return;
    }

    let formattedDate = depositForm.data;
    if (depositForm.data.includes('-')) {
      const [y, m, d] = depositForm.data.split('-');
      formattedDate = `${d}/${m}/${y}`;
    }

    await addServerDeposit({
      servidorId: targetServer.id,
      servidorNome: targetServer.nome,
      valor: Number(depositForm.valor),
      data: formattedDate,
      periodo: depositForm.periodo,
      observacoes: depositForm.observacoes
    });

    playSound('sino');
    showFeedback(`Depósito de R$ ${Number(depositForm.valor).toFixed(2)} registrado com sucesso!`);
    setIsDepositModalOpen(false);
  };

  // Open Adjustments Modal
  const handleOpenEditServer = (server: ServerItem) => {
    setEditingServer({ ...server });
    setServerLogoPreview(server.logoUrl || '');
    setIsEditServerModalOpen(true);
  };

  // Handle Logo Upload
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUri = await processClientAvatar(file);
      setServerLogoPreview(dataUri);
      if (editingServer) {
        setEditingServer({ ...editingServer, logoUrl: dataUri });
      }
      showFeedback('Imagem do servidor carregada!');
    } catch {
      alert('Erro ao carregar imagem. Escolha um arquivo JPG ou PNG.');
    }
  };

  const handlePasteLogo = async () => {
    try {
      const dataUri = await pasteImageFromClipboard();
      if (dataUri) {
        setServerLogoPreview(dataUri);
        if (editingServer) {
          setEditingServer({ ...editingServer, logoUrl: dataUri });
        }
        showFeedback('Imagem colada com sucesso!');
      } else {
        alert('Nenhuma imagem encontrada na área de transferência.');
      }
    } catch {
      alert('Não foi possível ler a área de transferência.');
    }
  };

  // Save Server Adjustments
  const handleSaveServerAdjustments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServer) return;

    await updateServer(editingServer.id, {
      nome: editingServer.nome,
      linkAcesso: editingServer.linkAcesso,
      logoUrl: serverLogoPreview || editingServer.logoUrl,
      corTema: editingServer.corTema,
      descricao: editingServer.descricao,
      status: editingServer.status
    });

    playSound('sino');
    showFeedback('Servidor atualizado com sucesso!');
    setIsEditServerModalOpen(false);
    setEditingServer(null);
  };

  // Delete Deposit
  const handleDeleteDeposit = async (id: string, valor: number, serv: string) => {
    if (confirm(`Deseja realmente remover o registro de depósito de R$ ${valor.toFixed(2)} em ${serv}?`)) {
      await deleteServerDeposit(id);
      showFeedback('Depósito removido com sucesso!');
    }
  };

  // Filtered servers by search
  const filteredServersStats = useMemo(() => {
    return rankedServers.filter(item => {
      if (searchServer.trim()) {
        const q = searchServer.toLowerCase();
        return item.server.nome.toLowerCase().includes(q) || (item.server.descricao || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [rankedServers, searchServer]);

  // Filtered deposits history
  const filteredDeposits = useMemo(() => {
    return serverDeposits.filter(d => {
      if (filterPeriod !== 'todos' && d.periodo !== filterPeriod) return false;
      if (searchServer.trim()) {
        const q = searchServer.toLowerCase();
        return d.servidorNome.toLowerCase().includes(q);
      }
      return true;
    });
  }, [serverDeposits, filterPeriod, searchServer]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Toast Alert */}
      {feedback && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.5)] flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={16} />
          <span>{feedback}</span>
        </div>
      )}

      {/* Top Header with Title and Main Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-red-950/70 border border-red-700/60 text-red-500 shadow-[0_0_18px_rgba(220,38,38,0.35)]">
            <Server size={24} />
          </div>
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5 flex-wrap">
              <span>Painel de Servidores</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-600/40">
                Rentabilidade & Acesso
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              Descubra qual servidor gera mais lucro por investimento, o que mais vende e visualize o desempenho no mês, semestre ou anos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleOpenDepositModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <DollarSign size={15} />
            <span>Registrar Novo Depósito</span>
          </button>
        </div>
      </div>

      {/* ---------------- BARRA DE CONTROLE TEMPORAL (MÊS / SEMESTRE / ANO / TOTAL) ---------------- */}
      <div className="tech-card border border-[#1e2338] bg-[#0a0d16] rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-300 w-full md:w-auto">
          <Calendar size={16} className="text-red-500 shrink-0" />
          <span>Período de Análise Financeira:</span>
          <span className="text-red-400 font-bold bg-red-950/60 px-2 py-0.5 rounded-md border border-red-900/50">
            {timeframeLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0e111d] p-1 rounded-xl border border-[#23293e] w-full md:w-auto overflow-x-auto justify-between md:justify-start">
          <button
            onClick={() => setTimeframe('mes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              timeframe === 'mes'
                ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.4)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Mês Atual
          </button>

          <button
            onClick={() => setTimeframe('semestre')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              timeframe === 'semestre'
                ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.4)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Semestre (6M)
          </button>

          <button
            onClick={() => setTimeframe('ano')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              timeframe === 'ano'
                ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.4)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Ano ({selectedYear})
          </button>

          <button
            onClick={() => setTimeframe('total')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              timeframe === 'total'
                ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.4)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Histórico Total
          </button>

          {/* Seletor de Ano */}
          {timeframe === 'ano' && (
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-[#151928] border border-[#2b334d] text-white text-xs font-bold rounded-lg px-2 py-1 outline-none ml-1 cursor-pointer"
            >
              {[2026, 2025, 2024, 2023].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ---------------- DESTAQUES DE INTELIGÊNCIA: QUAL GERA MAIS LUCRO & QUAL MAIS VENDE ---------------- */}
      {intelligenceHighlights && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: 🏆 CAMPEÃO DE LUCRO LÍQUIDO (Gera mais lucro por investimento) */}
          <div className="tech-card border border-amber-500/40 bg-gradient-to-br from-[#1c1409] via-[#120e09] to-[#08090d] rounded-2xl p-5 relative overflow-hidden group shadow-[0_0_30px_rgba(245,158,11,0.12)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/20 transition-all" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-950/90 border border-amber-800/70 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                <Trophy size={12} className="text-amber-400" />
                <span>MAIOR LUCRO LÍQUIDO</span>
              </span>
              <div className="p-2 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-800/60 shadow-sm">
                <Award size={18} />
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <h3 className="font-display text-xl font-black text-white truncate">
                {intelligenceHighlights.mostProfitable.server.nome}
              </h3>
            </div>

            <div className="mt-2 text-2xl font-black text-emerald-400 font-mono-code tracking-tight">
              +R$ {intelligenceHighlights.mostProfitable.netProfit.toFixed(2)}
              <span className="text-[10px] text-gray-400 font-normal ml-1">líquido</span>
            </div>

            <div className="mt-3 pt-3 border-t border-amber-900/40 text-[11px] text-gray-300 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Faturamento ({timeframeLabel}):</span>
                <span className="font-bold text-white font-mono-code">
                  R$ {intelligenceHighlights.mostProfitable.revenueForPeriod.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Investimento ({timeframeLabel}):</span>
                <span className="font-bold text-red-400 font-mono-code">
                  R$ {intelligenceHighlights.mostProfitable.totalInvestedInPeriod.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between font-semibold text-amber-300 pt-0.5">
                <span>Retorno por R$ 1,00:</span>
                <span>R$ {intelligenceHighlights.mostProfitable.roiRatio.toFixed(2)} gerados</span>
              </div>
            </div>
          </div>

          {/* Card 2: 🚀 CAMPEÃO DE VENDAS (O que mais vende) */}
          <div className="tech-card border border-red-600/40 bg-gradient-to-br from-[#1c0a0f] via-[#12080c] to-[#08090d] rounded-2xl p-5 relative overflow-hidden group shadow-[0_0_30px_rgba(220,38,38,0.15)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-red-600/20 transition-all" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-400 bg-red-950/90 border border-red-800/70 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-[0_0_10px_rgba(220,38,38,0.3)]">
                <Flame size={12} className="text-red-400" />
                <span>O QUE MAIS VENDE</span>
              </span>
              <div className="p-2 rounded-xl bg-red-950/80 text-red-400 border border-red-800/60 shadow-sm">
                <Zap size={18} />
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <h3 className="font-display text-xl font-black text-white truncate">
                {intelligenceHighlights.topSeller.server.nome}
              </h3>
            </div>

            <div className="mt-2 text-2xl font-black text-white font-mono-code tracking-tight flex items-baseline gap-1.5">
              <span>{intelligenceHighlights.topSeller.clientsCount}</span>
              <span className="text-xs text-gray-400 font-normal">clientes ativos</span>
            </div>

            <div className="mt-3 pt-3 border-t border-red-900/40 text-[11px] text-gray-300 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Participação na Base:</span>
                <span className="font-bold text-red-400 font-mono-code">
                  {clients.filter(c => !c.arquivado).length > 0
                    ? `${((intelligenceHighlights.topSeller.clientsCount / clients.filter(c => !c.arquivado).length) * 100).toFixed(0)}% das vendas`
                    : '0%'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Planos Mensais:</span>
                <span className="font-bold text-white font-mono-code">
                  {intelligenceHighlights.topSeller.plansCount.mensal} contas
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Planos Anuais/Semestrais:</span>
                <span className="font-bold text-amber-300 font-mono-code">
                  {intelligenceHighlights.topSeller.plansCount.anual + intelligenceHighlights.topSeller.plansCount.semestral} contas
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: 💰 FATURAMENTO BRUTO NO PERÍODO */}
          <div className="tech-card border border-[#1d2235] bg-[#0c0f18] rounded-2xl p-5 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3 text-gray-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Faturamento ({timeframeLabel})</span>
              <div className="p-2 rounded-xl bg-blue-950/60 text-blue-400 border border-blue-800/40">
                <DollarSign size={18} />
              </div>
            </div>

            <div className="text-2xl font-black text-white font-mono-code tracking-tight">
              R$ {intelligenceHighlights.totalRevenuePeriod.toFixed(2)}
            </div>

            <div className="mt-3 pt-3 border-t border-[#181c2b] text-[11px] text-gray-400">
              Receita consolidada de todos os servidores no período selecionado.
            </div>
          </div>

          {/* Card 4: 📈 LUCRO LÍQUIDO CONSOLIDADO NO PERÍODO */}
          <div className="tech-card border border-emerald-950 bg-[#0a1210] rounded-2xl p-5 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3 text-gray-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Lucro Líquido Real ({timeframeLabel})
              </span>
              <div className="p-2 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shadow-[0_0_10px_rgba(16,185,129,0.25)]">
                <TrendingUp size={18} />
              </div>
            </div>

            <div className="text-2xl font-black text-emerald-400 font-mono-code tracking-tight">
              R$ {intelligenceHighlights.totalNetProfitPeriod.toFixed(2)}
            </div>

            <div className="mt-3 pt-3 border-t border-emerald-950/80 text-[11px] flex items-center justify-between text-gray-300">
              <span>Investimento:</span>
              <span className="font-mono-code text-red-400 font-bold">
                -R$ {intelligenceHighlights.totalInvestedPeriod.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TABELA DE COMPARATIVO & RANKING DE RENTABILIDADE POR SERVIDOR ---------------- */}
      <div className="tech-card border border-[#1b2032] rounded-3xl p-5 space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b1f30] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-950/60 text-red-500 border border-red-800/40">
              <BarChart3 size={18} />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Diferenciação Financeira por Servidor</span>
                <span className="text-xs font-semibold text-gray-400">({timeframeLabel})</span>
              </h2>
              <p className="text-xs text-gray-400">
                Compare quanto foi investido e quanto foi lucrado em cada servidor conforme os clientes e planos vinculados.
              </p>
            </div>
          </div>

          {/* Botões de Ordenação do Ranking */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-400 font-semibold mr-1">Ordenar por:</span>
            {[
              { id: 'lucro', label: 'Mais Lucrativo' },
              { id: 'vendas', label: 'Mais Vendido' },
              { id: 'roi', label: 'Melhor ROI' },
              { id: 'faturamento', label: 'Faturamento' },
              { id: 'investido', label: 'Mais Investido' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setRankingSort(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  rankingSort === tab.id
                    ? 'bg-red-600/30 text-red-400 border border-red-600/60'
                    : 'bg-[#121522] text-gray-400 border border-[#21273a] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela Comparativa Detalhada */}
        <div className="overflow-x-auto rounded-2xl border border-[#1a1f30]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b0d14] text-gray-400 uppercase font-semibold text-[10px] tracking-wider border-b border-[#1a1f30]">
              <tr>
                <th className="py-3 px-4">Posição & Servidor</th>
                <th className="py-3 px-4">Clientes & Planos</th>
                <th className="py-3 px-4">Faturamento ({timeframeLabel})</th>
                <th className="py-3 px-4">Investimento ({timeframeLabel})</th>
                <th className="py-3 px-4">Lucro Líquido</th>
                <th className="py-3 px-4">Retorno (ROI)</th>
                <th className="py-3 px-4 text-center">Classificação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171b29]">
              {rankedServers.map((item, index) => {
                const isTopProfit = intelligenceHighlights?.mostProfitable.server.id === item.server.id;
                const isTopSeller = intelligenceHighlights?.topSeller.server.id === item.server.id;
                const isBestROI = intelligenceHighlights?.bestROI.server.id === item.server.id;

                return (
                  <tr
                    key={item.server.id}
                    className={`transition-colors ${
                      index % 2 === 0 ? 'bg-[#0f121d]' : 'bg-[#0b0d14]'
                    } hover:bg-[#171b2a]`}
                  >
                    {/* 1. Posição & Servidor */}
                    <td className="py-3.5 px-4 font-bold text-white">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                          index === 0
                            ? 'bg-amber-500 text-black shadow-[0_0_8px_#f59e0b]'
                            : index === 1
                            ? 'bg-gray-300 text-black'
                            : index === 2
                            ? 'bg-amber-800 text-white'
                            : 'bg-[#181d2e] text-gray-400'
                        }`}>
                          {index + 1}
                        </span>

                        <div className="w-8 h-8 rounded-lg bg-[#141724] border border-[#262c42] flex items-center justify-center overflow-hidden shrink-0">
                          {item.server.logoUrl ? (
                            <img src={item.server.logoUrl} alt={item.server.nome} className="w-full h-full object-contain" />
                          ) : (
                            <span className="font-bold text-xs text-red-500">
                              {item.server.nome.substring(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="text-sm font-display font-bold text-white flex items-center gap-1.5">
                            <span>{item.server.nome}</span>
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {item.server.status === 'ativo' ? 'Ativo' : 'Inativo'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Clientes & Planos */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="font-bold text-white flex items-center gap-1">
                          <Users size={12} className="text-red-500" />
                          <span>{item.clientsCount} clientes</span>
                        </div>
                        <div className="text-[10px] text-gray-400 flex items-center gap-1.5 flex-wrap">
                          <span>{item.plansCount.mensal} mensais</span>
                          {item.plansCount.anual > 0 && (
                            <span className="text-amber-400 font-semibold">• {item.plansCount.anual} anuais</span>
                          )}
                          {item.plansCount.semestral > 0 && (
                            <span className="text-purple-400">• {item.plansCount.semestral} semestr.</span>
                          )}
                          {item.plansCount.trimestral > 0 && (
                            <span className="text-blue-400">• {item.plansCount.trimestral} trimestr.</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 3. Faturamento no Período */}
                    <td className="py-3.5 px-4 font-mono-code font-bold text-white">
                      R$ {item.revenueForPeriod.toFixed(2)}
                    </td>

                    {/* 4. Investimento no Período */}
                    <td className="py-3.5 px-4 font-mono-code text-red-400 font-semibold">
                      R$ {item.totalInvestedInPeriod.toFixed(2)}
                      <div className="text-[10px] text-gray-500 font-sans">
                        {item.periodDepositsCount} recargas no período
                      </div>
                    </td>

                    {/* 5. Lucro Líquido */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono-code font-bold border ${
                        item.netProfit >= 0
                          ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                          : 'bg-red-950/80 text-red-400 border-red-800/60'
                      }`}>
                        {item.netProfit >= 0 ? '+' : ''}R$ {item.netProfit.toFixed(2)}
                      </span>
                    </td>

                    {/* 6. Retorno (ROI) */}
                    <td className="py-3.5 px-4 font-mono-code">
                      <div className="font-bold text-gray-200">
                        {item.totalInvestedInPeriod > 0
                          ? `R$ ${item.roiRatio.toFixed(2)} / R$ 1`
                          : 'Sem custo'}
                      </div>
                      <div className="text-[10px] text-emerald-400 font-semibold">
                        {item.totalInvestedInPeriod > 0 ? `+${item.roiPercent.toFixed(0)}% ROI` : '100% Margem'}
                      </div>
                    </td>

                    {/* 7. Classificação / Badges */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {isTopProfit && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/90 text-amber-300 border border-amber-800/60 flex items-center gap-1 shadow-[0_0_6px_rgba(245,158,11,0.25)]">
                            <Trophy size={10} />
                            <span>Maior Lucro</span>
                          </span>
                        )}
                        {isTopSeller && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950/90 text-red-300 border border-red-800/60 flex items-center gap-1 shadow-[0_0_6px_rgba(220,38,38,0.25)]">
                            <Flame size={10} />
                            <span>Mais Vendido</span>
                          </span>
                        )}
                        {isBestROI && !isTopProfit && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-800/60 flex items-center gap-1">
                            <Zap size={10} />
                            <span>Melhor ROI</span>
                          </span>
                        )}
                        {!isTopProfit && !isTopSeller && !isBestROI && (
                          <span className="text-[10px] text-gray-500 font-medium">
                            Rentável
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- CARDS VISUAIS INDIVIDUAIS DOS SERVIDORES (COM LINKS E BOTÕES) ---------------- */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b1f30] pb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Layers size={18} className="text-red-500" />
              <span>Painéis de Acesso Direto & Cards dos Servidores</span>
            </h2>
            <span className="text-xs text-gray-400">({filteredServersStats.length})</span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchServer}
              onChange={e => setSearchServer(e.target.value)}
              placeholder="Buscar servidor..."
              className="w-full bg-[#10131e] border border-[#21273a] focus:border-red-600 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white outline-none"
            />
          </div>
        </div>

        {/* Server Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServersStats.map(item => {
            const server = item.server;
            const isTopProfit = intelligenceHighlights?.mostProfitable.server.id === server.id;
            const isTopSeller = intelligenceHighlights?.topSeller.server.id === server.id;

            return (
              <div
                key={server.id}
                className="tech-card border border-[#1b2032] hover:border-red-600/60 rounded-3xl p-5 flex flex-col justify-between transition-all duration-200 group relative overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.5)]"
              >
                {/* Glow accent */}
                <div
                  className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none transition-all group-hover:opacity-40"
                  style={{ backgroundColor: server.corTema || '#dc2626' }}
                />

                <div>
                  {/* Top: Logo, Badges & Adjustments button */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Visual Logo / Image */}
                      <div className="w-14 h-14 rounded-2xl bg-[#0f121d] border-2 border-[#242b40] group-hover:border-red-600/70 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.6)]">
                        {server.logoUrl ? (
                          <img
                            src={server.logoUrl}
                            alt={server.nome}
                            className="w-full h-full object-contain rounded-xl"
                          />
                        ) : (
                          <div
                            className="w-full h-full rounded-xl flex items-center justify-center font-display font-black text-lg text-white"
                            style={{
                              background: `linear-gradient(135deg, ${server.corTema || '#dc2626'}99, #090a0f)`
                            }}
                          >
                            {server.nome.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-base font-bold text-white truncate group-hover:text-red-400 transition-colors">
                            {server.nome}
                          </h3>
                          <span className={`w-2 h-2 rounded-full shrink-0 ${server.status === 'ativo' ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-gray-500'}`} />
                        </div>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                          {server.descricao || 'Servidor de alta estabilidade e canais'}
                        </p>
                      </div>
                    </div>

                    {/* Adjustments Button */}
                    <button
                      onClick={() => handleOpenEditServer(server)}
                      className="p-2 rounded-xl bg-[#141724] hover:bg-red-600/20 text-gray-400 hover:text-red-400 border border-[#23293d] hover:border-red-600/40 transition-all shrink-0"
                      title="Ajustes do Servidor (Link, Logo, Nome)"
                    >
                      <Settings2 size={16} />
                    </button>
                  </div>

                  {/* Highlights Badges for Server */}
                  {(isTopProfit || isTopSeller) && (
                    <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                      {isTopProfit && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/60 flex items-center gap-1 shadow-[0_0_8px_rgba(245,158,11,0.25)]">
                          <Trophy size={10} />
                          <span>Campeão de Lucro</span>
                        </span>
                      )}
                      {isTopSeller && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-950/80 text-red-300 border border-red-800/60 flex items-center gap-1 shadow-[0_0_8px_rgba(220,38,38,0.25)]">
                          <Flame size={10} />
                          <span>Mais Vendido</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* 3 Metric Mini Cards */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-[#0b0d15] border border-[#1a1f30] rounded-xl p-2 text-center">
                      <div className="text-[9px] text-gray-400 font-semibold uppercase">Vendas Ativas</div>
                      <div className="text-sm font-bold text-white font-mono-code mt-0.5">
                        {item.clientsCount}
                      </div>
                    </div>

                    <div className="bg-[#0b0d15] border border-[#1a1f30] rounded-xl p-2 text-center">
                      <div className="text-[9px] text-gray-400 font-semibold uppercase">Investido</div>
                      <div className="text-sm font-bold text-red-400 font-mono-code mt-0.5">
                        R$ {item.totalInvestedInPeriod.toFixed(0)}
                      </div>
                    </div>

                    <div className="bg-[#0b0d15] border border-[#1a1f30] rounded-xl p-2 text-center">
                      <div className="text-[9px] text-gray-400 font-semibold uppercase">Lucro Líquido</div>
                      <div className="text-sm font-bold text-emerald-400 font-mono-code mt-0.5">
                        R$ {item.netProfit.toFixed(0)}
                      </div>
                    </div>
                  </div>

                  {/* Detalhes de Retorno & Planos */}
                  <div className="bg-[#0e111c] border border-[#1e2335] rounded-xl p-2.5 mb-3 text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-gray-300">
                      <span className="text-gray-400">Faturamento no período:</span>
                      <span className="font-bold text-white font-mono-code">
                        R$ {item.revenueForPeriod.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-gray-300">
                      <span className="text-gray-400">Eficiência de Lucro (ROI):</span>
                      <span className="font-bold text-amber-300 font-mono-code">
                        {item.totalInvestedInPeriod > 0
                          ? `R$ ${item.roiRatio.toFixed(2)} p/ R$ 1`
                          : '100% Margem'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="space-y-2 pt-2 border-t border-[#181c2b]">
                  {/* Visual Access Button */}
                  {server.linkAcesso ? (
                    <a
                      href={server.linkAcesso}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold shadow-[0_0_15px_rgba(220,38,38,0.35)] transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <Globe size={14} />
                      <span>Acessar Painel {server.nome}</span>
                      <ExternalLink size={13} className="opacity-80" />
                    </a>
                  ) : (
                    <button
                      onClick={() => handleOpenEditServer(server)}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#161a29] hover:bg-[#1f2438] text-amber-300 text-xs font-semibold border border-amber-600/30 transition-all"
                    >
                      <Plus size={14} />
                      <span>Adicionar Link de Acesso</span>
                    </button>
                  )}

                  {/* Quick deposit button for this server */}
                  <button
                    onClick={() => handleOpenDepositModal(server.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#10131e] hover:bg-[#171b29] text-gray-300 hover:text-white text-[11px] font-semibold border border-[#1d2235] transition-all"
                  >
                    <DollarSign size={13} className="text-emerald-400" />
                    <span>Lançar Depósito ({item.allDepositsCount} depósitos)</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------- HISTÓRICO COMPLETO DE DEPÓSITOS ---------------- */}
      <div className="tech-card border border-[#1b2032] rounded-3xl p-5 space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b1f30] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-950/60 text-red-500 border border-red-800/40">
              <TrendingUp size={18} />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-white tracking-tight">
                Histórico Geral de Depósitos & Investimentos nos Servidores
              </h2>
              <p className="text-xs text-gray-400">
                Acompanhe quantas vezes e quais valores foram investidos em cada período (mensal, semanal, quinzenal ou avulso).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-semibold flex items-center gap-1">
              <Filter size={13} />
              <span>Período:</span>
            </span>
            <select
              value={filterPeriod}
              onChange={e => setFilterPeriod(e.target.value)}
              className="bg-[#121522] border border-[#22283c] rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
            >
              <option value="todos">Todos os Períodos</option>
              <option value="mensal">Mensal</option>
              <option value="semanal">Semanal</option>
              <option value="quinzenal">Quinzenal</option>
              <option value="avulso">Avulso / Créditos</option>
            </select>
          </div>
        </div>

        {/* Deposits Table */}
        <div className="overflow-x-auto rounded-2xl border border-[#1a1f30]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b0d14] text-gray-400 uppercase font-semibold text-[10px] tracking-wider border-b border-[#1a1f30]">
              <tr>
                <th className="py-3 px-4">Data do Depósito</th>
                <th className="py-3 px-4">Servidor</th>
                <th className="py-3 px-4">Período</th>
                <th className="py-3 px-4">Valor Investido</th>
                <th className="py-3 px-4">Observações</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171b29]">
              {filteredDeposits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    Nenhum depósito cadastrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredDeposits.map((dep, idx) => (
                  <tr
                    key={dep.id}
                    className={`transition-colors ${
                      idx % 2 === 0 ? 'bg-[#0f121d]' : 'bg-[#0b0d14]'
                    } hover:bg-[#171b2a]`}
                  >
                    <td className="py-3 px-4 font-mono-code text-gray-300 font-semibold">
                      {dep.data}
                    </td>
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span>{dep.servidorNome}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                        dep.periodo === 'mensal'
                          ? 'bg-blue-950/80 text-blue-300 border-blue-800/60'
                          : dep.periodo === 'semanal'
                          ? 'bg-purple-950/80 text-purple-300 border-purple-800/60'
                          : dep.periodo === 'quinzenal'
                          ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                          : 'bg-gray-900 text-gray-300 border-gray-700'
                      }`}>
                        {dep.periodo}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono-code font-bold text-emerald-400 text-sm">
                      R$ {Number(dep.valor || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-gray-400 truncate max-w-xs">
                      {dep.observacoes || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteDeposit(dep.id, dep.valor, dep.servidorNome)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-950/50 transition-colors"
                        title="Excluir este lançamento"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- MODAL 1: REGISTRAR DEPÓSITO ---------------- */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="tech-card border border-red-950/80 rounded-3xl max-w-md w-full p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#1b1f30] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-950/80 text-red-500 border border-red-700/50">
                  <DollarSign size={18} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-white">
                    Registrar Depósito em Servidor
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Lance despesas e recargas para calcular gastos semanais, mensais e anuais.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDeposit} className="space-y-4">
              {/* Servidor */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Servidor Destino
                </label>
                <select
                  value={depositForm.servidorId}
                  onChange={e => setDepositForm({ ...depositForm, servidorId: e.target.value })}
                  className="w-full bg-[#121522] border border-[#23293e] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  required
                >
                  {servers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Valor */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Valor do Depósito (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={depositForm.valor}
                    onChange={e => setDepositForm({ ...depositForm, valor: parseFloat(e.target.value) || 0 })}
                    placeholder="50.00"
                    className="w-full bg-[#121522] border border-[#23293e] focus:border-red-600 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white font-mono-code font-bold outline-none"
                    required
                  />
                </div>
              </div>

              {/* Data & Período */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Data
                  </label>
                  <input
                    type="date"
                    value={depositForm.data}
                    onChange={e => setDepositForm({ ...depositForm, data: e.target.value })}
                    className="w-full bg-[#121522] border border-[#23293e] focus:border-red-600 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono-code"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Período / Tipo
                  </label>
                  <select
                    value={depositForm.periodo}
                    onChange={e => setDepositForm({ ...depositForm, periodo: e.target.value as any })}
                    className="w-full bg-[#121522] border border-[#23293e] focus:border-red-600 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="mensal">Mensal</option>
                    <option value="semanal">Semanal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="avulso">Avulso / Créditos</option>
                  </select>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Observações (Opcional)
                </label>
                <input
                  type="text"
                  value={depositForm.observacoes}
                  onChange={e => setDepositForm({ ...depositForm, observacoes: e.target.value })}
                  placeholder="Ex: Recarga de 100 créditos, renovação dedicada..."
                  className="w-full bg-[#121522] border border-[#23293e] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-[#1b1f30] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#171b29] hover:bg-[#202538] text-gray-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                >
                  Salvar Depósito
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL 2: AJUSTES DO SERVIDOR (LINK, LOGO, NOME) ---------------- */}
      {isEditServerModalOpen && editingServer && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="tech-card border border-red-950/80 rounded-3xl max-w-lg w-full p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#1b1f30] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-950/80 text-red-500 border border-red-700/50">
                  <Settings2 size={18} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-white">
                    Ajustes de Servidor: {editingServer.nome}
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Defina o link de acesso ao painel e a imagem do servidor para identificação visual.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditServerModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveServerAdjustments} className="space-y-4">
              {/* Logo / Imagem do Servidor */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Imagem / Logo do Servidor (Reconhecimento Visual)
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-[#0f121d] border-2 border-red-600/60 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-[0_0_15px_rgba(220,38,38,0.3)]">
                    {serverLogoPreview ? (
                      <img
                        src={serverLogoPreview}
                        alt="Logo Preview"
                        className="w-full h-full object-contain rounded-xl"
                      />
                    ) : (
                      <Server size={24} className="text-gray-500" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#171b29] hover:bg-[#22273b] text-gray-200 text-xs font-semibold border border-[#272e45]"
                      >
                        <Upload size={13} className="text-red-400" />
                        <span>Carregar Arquivo</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePasteLogo}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#171b29] hover:bg-[#22273b] text-gray-200 text-xs font-semibold border border-[#272e45]"
                      >
                        <Sparkles size={13} className="text-amber-400" />
                        <span>Colar da Área de Transf.</span>
                      </button>

                      {serverLogoPreview && (
                        <button
                          type="button"
                          onClick={() => setServerLogoPreview('')}
                          className="px-2.5 py-1.5 rounded-xl text-red-400 hover:text-red-300 text-xs font-semibold"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500">
                      Suporta JPG, PNG ou link de imagem direto.
                    </p>
                  </div>
                </div>
              </div>

              {/* Link de Acesso ao Painel */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Link de Acesso ao Painel Web (URL)
                </label>
                <div className="relative">
                  <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="url"
                    value={editingServer.linkAcesso || ''}
                    onChange={e => setEditingServer({ ...editingServer, linkAcesso: e.target.value })}
                    placeholder="https://painel.seuservidor.com"
                    className="w-full bg-[#121522] border border-[#23293e] focus:border-red-600 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white outline-none font-mono-code"
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Ao clicar no botão de acesso, este link será aberto automaticamente em uma nova aba.
                </p>
              </div>

              {/* Nome do Servidor */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Nome do Servidor
                </label>
                <input
                  type="text"
                  value={editingServer.nome}
                  onChange={e => setEditingServer({ ...editingServer, nome: e.target.value })}
                  className="w-full bg-[#121522] border border-[#23293e] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  required
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Descrição / Informações
                </label>
                <input
                  type="text"
                  value={editingServer.descricao || ''}
                  onChange={e => setEditingServer({ ...editingServer, descricao: e.target.value })}
                  placeholder="Ex: Servidor de alta qualidade UHD, suporte a canais e filmes..."
                  className="w-full bg-[#121522] border border-[#23293e] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-[#1b1f30] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditServerModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#171b29] hover:bg-[#202538] text-gray-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                >
                  Salvar Ajustes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
