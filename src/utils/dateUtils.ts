/**
 * Utilitários de data inteligentes para o Gerenciaprô.
 * Calcula renovações de clientes, adicionando meses à data de vencimento anterior,
 * tratando rolagem de mês (ex: 31/01 -> 28/02) e virada de ano com precisão.
 */

export function calculateOneMonthRenewal(vencimentoStr?: string, monthsToAdd = 1): string {
  const now = new Date();
  if (!vencimentoStr || vencimentoStr.trim() === '' || vencimentoStr === '-') {
    const targetMonth = (now.getMonth() + monthsToAdd) % 12;
    const targetYear = now.getFullYear() + Math.floor((now.getMonth() + monthsToAdd) / 12);
    const day = now.getDate();
    const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
    const finalDay = Math.min(day, maxDays);
    return `${String(finalDay).padStart(2, '0')}/${String(targetMonth + 1).padStart(2, '0')}/${targetYear}`;
  }

  const trimmed = vencimentoStr.trim();
  let origDay = 1;
  let origMonth = 0; // 0-indexado
  let origYear = now.getFullYear();

  if (trimmed.includes('/')) {
    const parts = trimmed.split('/').map(p => parseInt(p, 10));
    origDay = parts[0] || 1;
    origMonth = (parts[1] || 1) - 1;
    origYear = parts[2] || now.getFullYear();
    if (origYear < 100) origYear += 2000;
  } else if (trimmed.includes('-')) {
    const parts = trimmed.split('-').map(p => parseInt(p, 10));
    origYear = parts[0] || now.getFullYear();
    origMonth = (parts[1] || 1) - 1;
    origDay = parts[2] || 1;
    if (origYear < 100) origYear += 2000;
  } else {
    origDay = now.getDate();
    origMonth = now.getMonth();
    origYear = now.getFullYear();
  }

  // Adicionar meses
  const totalMonths = origMonth + monthsToAdd;
  const newYear = origYear + Math.floor(totalMonths / 12);
  const newMonth = ((totalMonths % 12) + 12) % 12;

  // Dias no mês de destino
  const maxDays = new Date(newYear, newMonth + 1, 0).getDate();
  const finalDay = Math.min(origDay, maxDays);

  const formattedDay = String(finalDay).padStart(2, '0');
  const formattedMonth = String(newMonth + 1).padStart(2, '0');

  return `${formattedDay}/${formattedMonth}/${newYear}`;
}

export function formatBRL(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}
