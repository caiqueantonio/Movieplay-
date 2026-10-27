import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { Client, ServerItem, ServerDeposit } from '../types';

interface DashboardExportData {
  clients: Client[];
  servers: ServerItem[];
  serverDeposits: ServerDeposit[];
  monthlyRevenue: number;
  annualRevenue: number;
  activeClientsCount: number;
  inactiveClientsCount: number;
  upToDateCount: number;
  overdueCount: number;
  dueSoonCount: number;
  totalServerInvested: number;
  serverExpensesMonth: number;
  serverExpensesWeek: number;
  realNetProfit: number;
}

export function exportDashboardToExcel(data: DashboardExportData) {
  const wb = XLSX.utils.book_new();

  // 1. Planilha Resumo Executivo
  const summaryRows = [
    { Indicador: 'Data de Emissão', Valor: new Date().toLocaleString('pt-BR') },
    { Indicador: 'Total Geral de Clientes', Valor: data.clients.length },
    { Indicador: 'Clientes Ativos', Valor: data.activeClientsCount },
    { Indicador: 'Clientes Inativos / Arquivados', Valor: data.inactiveClientsCount },
    { Indicador: 'Clientes Em Dia', Valor: data.upToDateCount },
    { Indicador: 'Clientes Vencendo (7d)', Valor: data.dueSoonCount },
    { Indicador: 'Clientes Em Atraso', Valor: data.overdueCount },
    { Indicador: 'Renda Mensal (Planos Mensais/Trimestrais)', Valor: `R$ ${data.monthlyRevenue.toFixed(2)}` },
    { Indicador: 'Receita Total Projetada (Mensal + Semestral + Anual)', Valor: `R$ ${data.annualRevenue.toFixed(2)}` },
    { Indicador: 'Total Investido em Servidores', Valor: `R$ ${data.totalServerInvested.toFixed(2)}` },
    { Indicador: 'Gastos com Servidores neste Mês', Valor: `R$ ${data.serverExpensesMonth.toFixed(2)}` },
    { Indicador: 'Gastos com Servidores nesta Semana', Valor: `R$ ${data.serverExpensesWeek.toFixed(2)}` },
    { Indicador: 'Lucro Líquido Real (Renda Mensal - Gastos do Mês)', Valor: `R$ ${data.realNetProfit.toFixed(2)}` }
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo Geral');

  // 2. Planilha Servidores & Rentabilidade
  const serverRows = data.servers.map(s => {
    const serverClients = data.clients.filter(c => (c.servidor || '').toLowerCase() === s.nome.toLowerCase() && !c.arquivado);
    const serverDeposits = data.serverDeposits.filter(d => d.servidorId === s.id || d.servidorNome.toLowerCase() === s.nome.toLowerCase());
    const totalDeposited = serverDeposits.reduce((acc, d) => acc + Number(d.valor || 0), 0);
    
    // Faturamento anualizado
    let annualRevenue = 0;
    serverClients.forEach(c => {
      const val = Number(c.valor) || 20;
      const p = (c.plano || '').toLowerCase();
      if (p.includes('anual')) annualRevenue += val;
      else if (p.includes('semestral')) annualRevenue += val * 2;
      else if (p.includes('trimestral')) annualRevenue += val * 4;
      else annualRevenue += val * 12;
    });

    const netProfit = annualRevenue - totalDeposited;
    const roiRatio = totalDeposited > 0 ? (annualRevenue / totalDeposited) : (annualRevenue > 0 ? 10 : 0);

    return {
      'Nome do Servidor': s.nome,
      'Status': s.status,
      'Clientes Conectados (Vendas)': serverClients.length,
      'Faturamento Anual Gerado (R$)': Number(annualRevenue.toFixed(2)),
      'Total Investido em Depósitos (R$)': Number(totalDeposited.toFixed(2)),
      'Lucro Líquido Anual (R$)': Number(netProfit.toFixed(2)),
      'Retorno p/ R$ 1 Investido': `R$ ${roiRatio.toFixed(2)}`,
      'Qtd de Depósitos': serverDeposits.length,
      'Link do Painel': s.linkAcesso || 'Não cadastrado'
    };
  });
  const wsServers = XLSX.utils.json_to_sheet(serverRows);
  XLSX.utils.book_append_sheet(wb, wsServers, 'Rentabilidade Servidores');

  // 3. Planilha Histórico de Depósitos em Servidores
  const depositRows = data.serverDeposits.map(d => ({
    'Data': d.data,
    'Servidor': d.servidorNome,
    'Valor (R$)': Number(Number(d.valor || 0).toFixed(2)),
    'Período': d.periodo,
    'Observações': d.observacoes || '—',
    'Data de Registro': d.createdAt ? new Date(d.createdAt).toLocaleString('pt-BR') : '—'
  }));
  const wsDeposits = XLSX.utils.json_to_sheet(depositRows.length > 0 ? depositRows : [{ Status: 'Nenhum depósito cadastrado' }]);
  XLSX.utils.book_append_sheet(wb, wsDeposits, 'Depósitos Servidores');

  // Salvar arquivo
  const fileName = `Relatorio_Financeiro_Gerenciapro_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportDashboardToPDF(data: DashboardExportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // Background Header Banner
  doc.setFillColor(12, 14, 22);
  doc.rect(0, 0, pageWidth, 32, 'F');
  
  // Neon Red Line
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 31, pageWidth, 1.5, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('GERENCIAPRÔ — PAINEL PREMIUM', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(239, 68, 68);
  doc.text('RELATÓRIO FINANCEIRO & OPERACIONAL EXECUTIVO', 14, 22);

  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - 14, 22, { align: 'right' });

  y = 40;

  // Section 1: RESUMO FINANCEIRO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(17, 24, 39);
  doc.text('1. RESUMO FINANCEIRO PRINCIPAL', 14, y);
  y += 6;

  // Cards row
  const cardWidth = (pageWidth - 34) / 3;
  const cards = [
    { title: 'Renda Mensal', value: `R$ ${data.monthlyRevenue.toFixed(2)}`, sub: 'Planos mensais/trimestrais' },
    { title: 'Gastos c/ Servidores (Mês)', value: `R$ ${data.serverExpensesMonth.toFixed(2)}`, sub: 'Investimentos do mês' },
    { title: 'Lucro Líquido Real', value: `R$ ${data.realNetProfit.toFixed(2)}`, sub: 'Renda Mensal - Gastos' }
  ];

  cards.forEach((card, index) => {
    const x = 14 + index * (cardWidth + 3);
    doc.setFillColor(248, 249, 250);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(x, y, cardWidth, 22, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(card.title, x + 3, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(index === 2 ? 16 : 17, index === 2 ? 185 : 24, index === 2 ? 129 : 39);
    doc.text(card.value, x + 3, y + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text(card.sub, x + 3, y + 19);
  });

  y += 30;

  // Section 2: BASE DE CLIENTES
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(17, 24, 39);
  doc.text('2. INDICADORES DA BASE DE CLIENTES', 14, y);
  y += 6;

  const clientStats = [
    ['Total de Clientes Cadastrados:', `${data.clients.length} clientes`],
    ['Clientes Ativos:', `${data.activeClientsCount} clientes`],
    ['Clientes Inativos / Arquivados:', `${data.inactiveClientsCount} clientes`],
    ['Clientes Em Dia:', `${data.upToDateCount} clientes`],
    ['Clientes Vencendo nos Próximos 7 Dias:', `${data.dueSoonCount} clientes`],
    ['Clientes Em Atraso / Expirados:', `${data.overdueCount} clientes`],
    ['Receita Total Anual Projetada:', `R$ ${data.annualRevenue.toFixed(2)}`],
    ['Total Acumulado Investido em Servidores:', `R$ ${data.totalServerInvested.toFixed(2)}`]
  ];

  clientStats.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);
    doc.text(label, 16, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(val, pageWidth - 16, y, { align: 'right' });

    y += 5.5;
  });

  y += 6;

  // Section 3: SERVIDORES E INVESTIMENTOS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(17, 24, 39);
  doc.text('3. DESEMPENHO E INVESTIMENTO POR SERVIDOR', 14, y);
  y += 6;

  // Table header
  doc.setFillColor(243, 244, 246);
  doc.rect(14, y, pageWidth - 28, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);
  doc.text('Servidor', 16, y + 5);
  doc.text('Clientes', 65, y + 5);
  doc.text('Faturamento', 95, y + 5);
  doc.text('Investimento', 135, y + 5);
  doc.text('Lucro Líquido', pageWidth - 16, y + 5, { align: 'right' });
  y += 8;

  data.servers.forEach(s => {
    const srvClients = data.clients.filter(c => (c.servidor || '').toLowerCase() === s.nome.toLowerCase() && !c.arquivado);
    const deposits = data.serverDeposits.filter(d => d.servidorId === s.id || d.servidorNome.toLowerCase() === s.nome.toLowerCase());
    const totalInvest = deposits.reduce((acc, d) => acc + Number(d.valor || 0), 0);

    let annualRevenue = 0;
    srvClients.forEach(c => {
      const val = Number(c.valor) || 20;
      const p = (c.plano || '').toLowerCase();
      if (p.includes('anual')) annualRevenue += val;
      else if (p.includes('semestral')) annualRevenue += val * 2;
      else if (p.includes('trimestral')) annualRevenue += val * 4;
      else annualRevenue += val * 12;
    });

    const profit = annualRevenue - totalInvest;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(31, 41, 55);
    doc.text(s.nome, 16, y + 4);
    doc.text(`${srvClients.length} ativ.`, 65, y + 4);
    doc.text(`R$ ${annualRevenue.toFixed(0)}`, 95, y + 4);
    doc.setTextColor(220, 38, 38);
    doc.text(`R$ ${totalInvest.toFixed(0)}`, 135, y + 4);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(profit >= 0 ? 16 : 220, profit >= 0 ? 185 : 38, profit >= 0 ? 129 : 38);
    doc.text(`${profit >= 0 ? '+' : ''}R$ ${profit.toFixed(0)}`, pageWidth - 16, y + 4, { align: 'right' });

    // Thin separator line
    doc.setDrawColor(243, 244, 246);
    doc.line(14, y + 6, pageWidth - 14, y + 6);
    y += 7;
  });

  y += 6;

  // Section 4: ÚLTIMOS DEPÓSITOS REGISTRADOS
  if (data.serverDeposits.length > 0) {
    if (y > 230) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text('4. HISTÓRICO RECENTE DE DEPÓSITOS EM SERVIDORES', 14, y);
    y += 6;

    // Header
    doc.setFillColor(243, 244, 246);
    doc.rect(14, y, pageWidth - 28, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(55, 65, 81);
    doc.text('Data', 16, y + 5);
    doc.text('Servidor', 45, y + 5);
    doc.text('Período', 90, y + 5);
    doc.text('Observações', 125, y + 5);
    doc.text('Valor (R$)', pageWidth - 16, y + 5, { align: 'right' });
    y += 8;

    data.serverDeposits.slice(0, 8).forEach(d => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(55, 65, 81);
      doc.text(d.data || '—', 16, y + 4);
      doc.text(d.servidorNome, 45, y + 4);
      doc.text(d.periodo, 90, y + 4);
      doc.text((d.observacoes || '—').substring(0, 30), 125, y + 4);
      doc.setFont('helvetica', 'bold');
      doc.text(`R$ ${Number(d.valor || 0).toFixed(2)}`, pageWidth - 16, y + 4, { align: 'right' });

      doc.setDrawColor(243, 244, 246);
      doc.line(14, y + 6, pageWidth - 14, y + 6);
      y += 7;
    });
  }

  // Footer note
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text('Gerenciaprô — Painel Premium. Documento confidencial para controle financeiro e administrativo.', pageWidth / 2, 285, { align: 'center' });

  const fileName = `Relatorio_Dashboard_Gerenciapro_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
