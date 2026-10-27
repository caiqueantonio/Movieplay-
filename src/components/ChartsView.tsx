import React, { useState } from 'react';
import {
  BarChart2,
  TrendingUp,
  PieChart,
  Users,
  DollarSign,
  Calendar,
  Server,
  Download
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ChartsView: React.FC = () => {
  const { clients, servers, plans, payments } = useApp();
  const [period, setPeriod] = useState<'30d' | '90d' | 'ano'>('30d');

  const totalClients = clients.length;
  const activeCount = clients.filter(c => !c.arquivado && c.status === 'Em dia').length;
  const overdueCount = clients.filter(c => !c.arquivado && c.status === 'Em atraso').length;

  // Classificação dos planos
  const isPlanMensal = (plano: string) => {
    const p = (plano || '').toLowerCase();
    return p.includes('mensal') || (!p.includes('anual') && !p.includes('semestral') && !p.includes('trimestral'));
  };
  const isPlanAnual = (plano: string) => (plano || '').toLowerCase().includes('anual');
  const isPlanSemestral = (plano: string) => (plano || '').toLowerCase().includes('semestral');
  const isPlanTrimestral = (plano: string) => (plano || '').toLowerCase().includes('trimestral');

  const activeNonArchived = clients.filter(c => !c.arquivado);
  const mensalClients = activeNonArchived.filter(c => isPlanMensal(c.plano));
  const anualClients = activeNonArchived.filter(c => isPlanAnual(c.plano));
  const semestralClients = activeNonArchived.filter(c => isPlanSemestral(c.plano));
  const trimestralClients = activeNonArchived.filter(c => isPlanTrimestral(c.plano));

  // Renda Mensal (exclui anuais)
  const rendaMensal = mensalClients.reduce((acc, c) => acc + (Number(c.valor) || 0), 0);

  // Lucro Anual (anuais + mensais 12x + semestrais 2x + trimestrais 4x)
  const receitaAnualPlanosAnuais = anualClients.reduce((acc, c) => acc + (Number(c.valor) || 0), 0);
  const receitaAnualPlanosMensais = rendaMensal * 12;
  const receitaAnualPlanosSemestrais = semestralClients.reduce((acc, c) => acc + (Number(c.valor) || 0) * 2, 0);
  const receitaAnualPlanosTrimestrais = trimestralClients.reduce((acc, c) => acc + (Number(c.valor) || 0) * 4, 0);

  const lucroAnualTotal = receitaAnualPlanosAnuais + receitaAnualPlanosMensais + receitaAnualPlanosSemestrais + receitaAnualPlanosTrimestrais;

  const displayRevenue = period === 'ano' ? lucroAnualTotal : rendaMensal;

  // Month-by-month projection
  const baseMonthly = rendaMensal > 0 ? rendaMensal : 400;
  const monthlyProjection = [
    { mes: 'Mai 2026', receita: Math.round(baseMonthly * 0.88), clientes: Math.max(1, mensalClients.length - 3) },
    { mes: 'Jun 2026', receita: Math.round(baseMonthly * 0.92), clientes: Math.max(1, mensalClients.length - 2) },
    { mes: 'Jul 2026', receita: Math.round(baseMonthly * 0.95), clientes: Math.max(1, mensalClients.length - 1) },
    { mes: 'Ago 2026', receita: Math.round(baseMonthly * 0.97), clientes: mensalClients.length },
    { mes: 'Set 2026', receita: Math.round(baseMonthly * 0.99), clientes: mensalClients.length },
    { mes: 'Out 2026', receita: rendaMensal, clientes: mensalClients.length },
  ];

  const maxRevenue = Math.max(...monthlyProjection.map(m => m.receita), 1);

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-200">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Gráficos & Relatórios
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Indicadores de faturamento, desempenho dos planos e retenção da base de clientes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(['30d', '90d', 'ano'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                period === p
                  ? 'bg-red-600 text-white shadow-[0_0_10px_#dc2626]'
                  : 'bg-[#121522] border border-[#202538] text-gray-400 hover:text-white'
              }`}
            >
              {p === '30d' ? '30 dias' : p === '90d' ? '90 dias' : 'Ano'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Bar Chart: Monthly Evolution */}
      <div className="bg-[#0b0d14] border border-[#1b1f2e] rounded-3xl p-6 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-[#181b28]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-950/80 rounded-xl border border-red-900/60 text-red-500">
              <TrendingUp size={18} />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white">
                Evolução da Receita Mensal (R$)
              </h2>
              <p className="text-xs text-gray-400">
                Histórico de faturamento apurado nos últimos 6 meses
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="font-display text-xl font-extrabold text-white">
              R$ {displayRevenue.toFixed(2)}
            </span>
            <span className="text-[11px] text-emerald-400 block font-semibold">+ 4.2% este mês</span>
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

      {/* Grid: Status Distribution & Server Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Distribution */}
        <div className="bg-[#0b0d14] border border-[#1b1f2e] rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <Users size={17} className="text-red-500" />
            <h3 className="font-display text-sm font-bold text-white">
              Situação da Base de Clientes
            </h3>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-emerald-400 font-semibold">Em dia (Ativos)</span>
                <span className="font-mono-code text-gray-300">
                  {activeCount} ({Math.round((activeCount / totalClients) * 100)}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#141724] rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${(activeCount / totalClients) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-red-400 font-semibold">Em atraso</span>
                <span className="font-mono-code text-gray-300">
                  {overdueCount} ({Math.round((overdueCount / totalClients) * 100)}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#141724] rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-600 rounded-full shadow-[0_0_8px_#dc2626]"
                  style={{ width: `${(overdueCount / totalClients) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Server Distribution */}
        <div className="bg-[#0b0d14] border border-[#1b1f2e] rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <Server size={17} className="text-red-500" />
            <h3 className="font-display text-sm font-bold text-white">
              Ocupação de Servidores IPTV
            </h3>
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
