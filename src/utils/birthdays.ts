import { Client } from '../types';

export interface BirthdayInfo {
  isToday: boolean;
  isThisWeek: boolean;
  daysUntil: number;
  idadeProxima?: number;
  dataTexto: string;
}

/**
 * Parses date string (YYYY-MM-DD or DD/MM/YYYY or DD/MM) and computes birthday status.
 */
export function getClientBirthdayInfo(dataNasc?: string): BirthdayInfo | null {
  if (!dataNasc || !dataNasc.trim()) return null;

  let day = 0;
  let month = 0; // 0-indexed
  let birthYear: number | null = null;

  const clean = dataNasc.trim();
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      birthYear = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    }
  } else if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length >= 2) {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      if (parts.length === 3) {
        birthYear = parseInt(parts[2], 10);
      }
    }
  }

  if (!day || month < 0 || month > 11) return null;

  const today = new Date();
  const currentYear = today.getFullYear();

  // Next birthday date in current year
  let nextBday = new Date(currentYear, month, day);
  
  // Set times to midnight for clean day diff
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  if (nextBday < todayMidnight) {
    // Already passed this year, next one is next year
    nextBday = new Date(currentYear + 1, month, day);
  }

  const diffTime = nextBday.getTime() - todayMidnight.getTime();
  const daysUntil = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const isToday = daysUntil === 0;
  const isThisWeek = daysUntil >= 0 && daysUntil <= 7;

  let idadeProxima: number | undefined;
  if (birthYear && birthYear > 1900 && birthYear <= currentYear) {
    idadeProxima = nextBday.getFullYear() - birthYear;
  }

  const formattedDay = String(day).padStart(2, '0');
  const formattedMonth = String(month + 1).padStart(2, '0');
  const dataTexto = `${formattedDay}/${formattedMonth}${birthYear ? `/${birthYear}` : ''}`;

  return {
    isToday,
    isThisWeek,
    daysUntil,
    idadeProxima,
    dataTexto
  };
}

/**
 * Checks all clients and returns those having birthday today or within 7 days.
 */
export function getUpcomingBirthdays(clients: Client[]): Array<{ client: Client; info: BirthdayInfo }> {
  const result: Array<{ client: Client; info: BirthdayInfo }> = [];

  for (const client of clients) {
    if (client.arquivado) continue; // Don't notify archived clients
    const info = getClientBirthdayInfo(client.dataNascimento);
    if (info && info.isThisWeek) {
      result.push({ client, info });
    }
  }

  // Sort by urgency (today first, then 1 day, 2 days, etc.)
  return result.sort((a, b) => a.info.daysUntil - b.info.daysUntil);
}
