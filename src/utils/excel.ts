import * as XLSX from 'xlsx';
import { Client, ClientStatus } from '../types';

export const EXCEL_COLUMNS = [
  'Nome',
  'Email',
  'WhatsApp',
  'Celular',
  'Aparelho',
  'MAC',
  'Senha MAC',
  'Servidor',
  'Aplicativo',
  'Usuário Disp.',
  'Senha Disp.',
  'App Pago',
  'Validade App',
  'Plano',
  'Vencimento',
  'Status',
  'Valor',
  'Observações'
] as const;

export interface ImportPreviewRow {
  raw: Record<string, unknown>;
  parsed: Partial<Client>;
  isDuplicate: boolean;
  duplicateReason?: string;
  matchedClientId?: string;
  hasErrors: boolean;
  errorMessages: string[];
}

export interface ImportResult {
  totalRows: number;
  validRows: ImportPreviewRow[];
  duplicatesCount: number;
  errorRowsCount: number;
  headersDetected: string[];
}

// Convert Excel Serial Date or Date string to DD/MM/YYYY or YYYY-MM-DD
export function parseExcelDate(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'number') {
    // Excel serial date to JS Date
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      const day = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const year = date.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
  }
  return str;
}

export function parseExcelValue(val: unknown): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = String(val).replace(/R\$\s*/gi, '').replace(/\./g, '').replace(',', '.').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function parseExcelBoolean(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  if (!val) return false;
  const s = String(val).toLowerCase().trim();
  return ['sim', 'true', '1', 'pago', 'yes'].includes(s);
}

export function normalizeHeader(h: string): string {
  return h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

export function parseExcelBuffer(buffer: ArrayBuffer, existingClients: Client[]): ImportResult {
  const workbook = XLSX.read(buffer, { type: 'array', raw: true });
  const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('cliente')) || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error('Nenhuma planilha encontrada no arquivo.');
  }

  // Get raw JSON rows preserving exact text and Brazilian dates
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '', raw: true });
  const headers = Object.keys(rawRows[0] || {});

  const validRows: ImportPreviewRow[] = [];
  let duplicatesCount = 0;
  let errorRowsCount = 0;

  // Header mapping dictionary
  const headerMap: Record<string, string> = {};
  headers.forEach(h => {
    const norm = normalizeHeader(h);
    if (norm === 'nome') headerMap.nome = h;
    else if (norm === 'email' || norm === 'mail') headerMap.email = h;
    else if (norm === 'whatsapp' || norm === 'zap') headerMap.whatsapp = h;
    else if (norm === 'celular' || norm === 'telefone' || norm === 'fone') headerMap.celular = h;
    else if (norm === 'aparelho' || norm === 'dispositivo') headerMap.aparelho = h;
    else if (norm === 'mac' || norm === 'enderecomac') headerMap.mac = h;
    else if (norm === 'senhamac' || norm === 'keymac' || norm === 'macsenha') headerMap.senhaMac = h;
    else if (norm === 'servidor' || norm === 'server') headerMap.servidor = h;
    else if (norm === 'aplicativo' || norm === 'app') headerMap.aplicativo = h;
    else if (norm.includes('usuariodisp') || norm === 'usuario') headerMap.usuarioDisp = h;
    else if (norm.includes('senhadisp') || norm === 'senha') headerMap.senhaDisp = h;
    else if (norm.includes('apppago') || norm.includes('pago')) headerMap.appPago = h;
    else if (norm.includes('validadeapp') || norm.includes('validade')) headerMap.validadeApp = h;
    else if (norm === 'plano') headerMap.plano = h;
    else if (norm === 'vencimento' || norm.includes('venc')) headerMap.vencimento = h;
    else if (norm === 'status' || norm === 'situacao') headerMap.status = h;
    else if (norm === 'valor' || norm === 'preco') headerMap.valor = h;
    else if (norm.includes('obs') || norm.includes('observa')) headerMap.observacoes = h;
  });

  rawRows.forEach((row, idx) => {
    const errors: string[] = [];
    const getVal = (key: string) => {
      const mappedHeader = headerMap[key];
      return mappedHeader ? row[mappedHeader] : (row[key] ?? '');
    };

    const nome = String(getVal('nome') || '').trim();
    if (!nome) {
      errors.push(`Linha ${idx + 2}: Nome obrigatório está vazio.`);
    }

    const whatsapp = String(getVal('whatsapp') || '').trim();
    const email = String(getVal('email') || '').trim();
    const mac = String(getVal('mac') || '').trim();
    const rawStatus = String(getVal('status') || 'Em dia').trim();
    const vencimentoStr = parseExcelDate(getVal('vencimento'));
    const valor = parseExcelValue(getVal('valor'));

    // Check duplicate against existing
    let isDuplicate = false;
    let duplicateReason = '';
    let matchedClientId: string | undefined = undefined;

    const cleanZap = whatsapp.replace(/\D/g, '');
    const cleanMac = mac.toLowerCase().replace(/[^a-f0-9]/g, '');

    const existingMatch = existingClients.find(c => {
      if (cleanZap && cleanZap.length >= 8 && c.whatsapp.replace(/\D/g, '') === cleanZap) {
        duplicateReason = `WhatsApp duplicado (${whatsapp})`;
        return true;
      }
      if (cleanMac && cleanMac.length >= 10 && c.mac.toLowerCase().replace(/[^a-f0-9]/g, '') === cleanMac) {
        duplicateReason = `MAC duplicado (${mac})`;
        return true;
      }
      if (email && email.includes('@') && c.email.toLowerCase() === email.toLowerCase()) {
        duplicateReason = `Email duplicado (${email})`;
        return true;
      }
      if (nome.toLowerCase() === c.nome.toLowerCase() && nome.length > 3) {
        duplicateReason = `Nome idêntico (${nome})`;
        return true;
      }
      return false;
    });

    if (existingMatch) {
      isDuplicate = true;
      matchedClientId = existingMatch.id;
      duplicatesCount++;
    }

    if (errors.length > 0) {
      errorRowsCount++;
    }

    // Determine normalized status
    let status: ClientStatus = 'Em dia';
    if (rawStatus.toLowerCase().includes('atraso')) status = 'Em atraso';
    else if (rawStatus.toLowerCase().includes('venc')) status = 'Vencendo (7d)';
    else if (rawStatus.toLowerCase().includes('susp')) status = 'Suspenso';
    else if (rawStatus.toLowerCase().includes('canc')) status = 'Cancelado';
    else if (rawStatus.toLowerCase().includes('pend')) status = 'Pendente';

    const parsed: Partial<Client> = {
      nome,
      email,
      whatsapp,
      celular: String(getVal('celular') || '').trim(),
      aparelho: String(getVal('aparelho') || '').trim(),
      mac,
      senhaMac: String(getVal('senhaMac') || '').trim(),
      servidor: String(getVal('servidor') || 'Cine Hub').trim(),
      aplicativo: String(getVal('aplicativo') || 'XCIPTV').trim(),
      usuarioDisp: String(getVal('usuarioDisp') || '').trim(),
      senhaDisp: String(getVal('senhaDisp') || '').trim(),
      appPago: parseExcelBoolean(getVal('appPago')),
      validadeApp: parseExcelDate(getVal('validadeApp')),
      plano: String(getVal('plano') || 'Mensal').trim(),
      vencimento: vencimentoStr,
      status,
      valor: valor || 20.00,
      observacoes: String(getVal('observacoes') || '').trim()
    };

    validRows.push({
      raw: row,
      parsed,
      isDuplicate,
      duplicateReason,
      matchedClientId,
      hasErrors: errors.length > 0,
      errorMessages: errors
    });
  });

  return {
    totalRows: rawRows.length,
    validRows,
    duplicatesCount,
    errorRowsCount,
    headersDetected: headers
  };
}

export function exportClientsToExcel(clients: Client[], fileName = 'clientes-gerenciapro.xlsx') {
  const data = clients.map(c => ({
    'Nome': c.nome,
    'Email': c.email || '',
    'WhatsApp': c.whatsapp || '',
    'Celular': c.celular || '',
    'Aparelho': c.aparelho || '',
    'MAC': c.mac || '',
    'Senha MAC': c.senhaMac || '',
    'Servidor': c.servidor || '',
    'Aplicativo': c.aplicativo || '',
    'Usuário Disp.': c.usuarioDisp || '',
    'Senha Disp.': c.senhaDisp || '',
    'App Pago': c.appPago ? 'Sim' : 'Não',
    'Validade App': c.validadeApp || '',
    'Plano': c.plano || '',
    'Vencimento': c.vencimento || '',
    'Status': c.status || 'Em dia',
    'Valor': Number(c.valor || 0).toFixed(2),
    'Observações': c.observacoes || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data, { header: [...EXCEL_COLUMNS] });
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 24 }, // Nome
    { wch: 24 }, // Email
    { wch: 16 }, // WhatsApp
    { wch: 16 }, // Celular
    { wch: 18 }, // Aparelho
    { wch: 20 }, // MAC
    { wch: 12 }, // Senha MAC
    { wch: 14 }, // Servidor
    { wch: 18 }, // Aplicativo
    { wch: 16 }, // Usuario Disp
    { wch: 14 }, // Senha Disp
    { wch: 10 }, // App Pago
    { wch: 14 }, // Validade App
    { wch: 12 }, // Plano
    { wch: 14 }, // Vencimento
    { wch: 14 }, // Status
    { wch: 12 }, // Valor
    { wch: 30 }  // Observações
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');
  XLSX.writeFile(workbook, fileName);
}

export function exportClientsToCSV(clients: Client[], fileName = 'clientes-gerenciapro.csv') {
  const data = clients.map(c => ({
    'Nome': c.nome,
    'Email': c.email || '',
    'WhatsApp': c.whatsapp || '',
    'Celular': c.celular || '',
    'Aparelho': c.aparelho || '',
    'MAC': c.mac || '',
    'Senha MAC': c.senhaMac || '',
    'Servidor': c.servidor || '',
    'Aplicativo': c.aplicativo || '',
    'Usuário Disp.': c.usuarioDisp || '',
    'Senha Disp.': c.senhaDisp || '',
    'App Pago': c.appPago ? 'Sim' : 'Não',
    'Validade App': c.validadeApp || '',
    'Plano': c.plano || '',
    'Vencimento': c.vencimento || '',
    'Status': c.status || 'Em dia',
    'Valor': Number(c.valor || 0).toFixed(2),
    'Observações': c.observacoes || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data, { header: [...EXCEL_COLUMNS] });
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
}

export function downloadSampleExcelTemplate() {
  const sampleData = [
    {
      'Nome': 'Exemplo João Silva',
      'Email': 'joao@email.com',
      'WhatsApp': '83988887777',
      'Celular': '83988887777',
      'Aparelho': 'Smart TV Samsung',
      'MAC': 'aa:bb:cc:11:22:33',
      'Senha MAC': '123456',
      'Servidor': 'Cine Hub',
      'Aplicativo': 'XCIPTV',
      'Usuário Disp.': 'joao10',
      'Senha Disp.': 'pass789',
      'App Pago': 'Não',
      'Validade App': '19/10/2026',
      'Plano': 'Mensal',
      'Vencimento': '19/11/2026',
      'Status': 'Em dia',
      'Valor': '20.00',
      'Observações': 'Cliente preferencial'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: [...EXCEL_COLUMNS] });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');
  XLSX.writeFile(workbook, 'modelo-importacao-clientes.xlsx');
}
