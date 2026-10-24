import { Client, AlertScheduleConfig } from '../types';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  try {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch {
    return false;
  }
}

export function sendBrowserNotification(
  title: string,
  options?: NotificationOptions & { clientUrl?: string }
): boolean {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const notification = new Notification(title, {
      icon: '/logo.svg',
      badge: '/logo.svg',
      tag: 'gerenciapro-alert',
      ...options
    });

    if (options?.clientUrl) {
      notification.onclick = () => {
        window.focus();
        if (options.clientUrl) {
          window.location.hash = options.clientUrl;
        }
      };
    }

    return true;
  } catch (err) {
    console.warn('Erro ao disparar notificação local', err);
    return false;
  }
}

// Convert DD/MM/YYYY or YYYY-MM-DD to JS Date
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  } else if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export function getDaysDiffFromReference(dateStr: string, refDate = new Date(2026, 9, 23)): number {
  const d = parseDate(dateStr);
  if (!d) return 0;
  const diffMs = refDate.getTime() - d.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export interface ClientAlertItem {
  client: Client;
  tipo: 'vencendo_7d' | 'vencendo_3d' | 'vencendo_1d' | 'vencendo_hoje' | 'atrasado';
  diasTexto: string;
  mensagem: string;
}

export function checkClientsDueAlerts(
  clients: Client[],
  config?: AlertScheduleConfig,
  refDate = new Date(2026, 9, 23)
): ClientAlertItem[] {
  const alerts: ClientAlertItem[] = [];
  const schedule = config || {
    aviso7Dias: true,
    aviso3Dias: true,
    aviso1Dia: true,
    avisoNoDia: true,
    avisoAposVencimento: true,
    intervaloAtrasoDias: 2,
    horarioEnvio: '09:00',
    pushEnabled: true
  };

  clients.forEach(c => {
    if (!c.vencimento) return;
    const daysDiff = getDaysDiffFromReference(c.vencimento, refDate);

    // daysDiff < 0 means future (vencimento está à frente)
    // daysDiff === 0 means today
    // daysDiff > 0 means overdue (atrasado)
    if (daysDiff === -7 && schedule.aviso7Dias) {
      alerts.push({
        client: c,
        tipo: 'vencendo_7d',
        diasTexto: 'Vence em 7 dias',
        mensagem: `${c.nome}: plano ${c.plano} vence em 7 dias (${c.vencimento})`
      });
    } else if (daysDiff === -3 && schedule.aviso3Dias) {
      alerts.push({
        client: c,
        tipo: 'vencendo_3d',
        diasTexto: 'Vence em 3 dias',
        mensagem: `${c.nome}: plano ${c.plano} vence em 3 dias (${c.vencimento})`
      });
    } else if (daysDiff === -1 && schedule.aviso1Dia) {
      alerts.push({
        client: c,
        tipo: 'vencendo_1d',
        diasTexto: 'Vence amanhã',
        mensagem: `${c.nome}: plano ${c.plano} vence amanhã!`
      });
    } else if (daysDiff === 0 && schedule.avisoNoDia) {
      alerts.push({
        client: c,
        tipo: 'vencendo_hoje',
        diasTexto: 'Vence HOJE',
        mensagem: `${c.nome}: plano ${c.plano} vence hoje! Valor: R$ ${Number(c.valor).toFixed(2)}`
      });
    } else if (daysDiff > 0 && schedule.avisoAposVencimento) {
      // Check if matches interval
      const interval = Math.max(1, schedule.intervaloAtrasoDias || 2);
      if (daysDiff % interval === 0 || daysDiff === 1 || daysDiff === 3 || daysDiff === 7) {
        alerts.push({
          client: c,
          tipo: 'atrasado',
          diasTexto: `${daysDiff}d atrasado`,
          mensagem: `${c.nome}: vencimento atrasado há ${daysDiff} dias (${c.vencimento})`
        });
      }
    }
  });

  return alerts;
}

// Generate an .ics calendar file with alarm (VALARM) for native phone alarm/calendar integration
export function downloadClientAlarmCalendarFile(client: Client) {
  const d = parseDate(client.vencimento);
  if (!d) {
    alert('Data de vencimento inválida para criar alarme.');
    return;
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateFormatted = `${year}${month}${day}`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gerenciapro//Painel Premium//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:gerenciapro-${client.id}-${Date.now()}@gerenciapro.com`,
    `DTSTAMP:${dateFormatted}T090000Z`,
    `DTSTART;VALUE=DATE:${dateFormatted}`,
    `DTEND;VALUE=DATE:${dateFormatted}`,
    `SUMMARY:🚨 Vencimento: ${client.nome} (${client.plano})`,
    `DESCRIPTION:Cliente: ${client.nome}\\nWhatsApp: ${client.whatsapp}\\nPlano: ${client.plano}\\nValor: R$ ${Number(client.valor).toFixed(2)}\\nServidor: ${client.servidor}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'ACTION:AUDIO',
    'TRIGGER:-PT15M',
    'DESCRIPTION:Lembrete de Vencimento Gerenciapró',
    'END:VALARM',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:-PT9H',
    `DESCRIPTION:Vencimento do cliente ${client.nome} hoje!`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `alarme-vencimento-${client.nome.toLowerCase().replace(/[^a-z0-9]/g, '-')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
