import React, { useState, useEffect } from 'react';
import {
  Zap,
  Clock,
  MessageCircle,
  Save,
  CheckCircle2,
  AlertTriangle,
  Play,
  History,
  Send,
  Plus,
  Bell,
  Smartphone,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Volume2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AutomationRule, AlertScheduleConfig } from '../types';
import { INITIAL_SETTINGS } from '../data/initialData';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendBrowserNotification
} from '../utils/notifications';

export const AutomationsView: React.FC = () => {
  const {
    automations,
    updateAutomations,
    notificationLogs,
    clients,
    settings,
    updateAlertSchedule,
    sendWhatsAppReminder,
    playSound
  } = useApp();

  const [rules, setRules] = useState<AutomationRule[]>(automations);
  const [savedNotice, setSavedNotice] = useState(false);
  const [testClient, setTestClient] = useState(clients[0]?.id || '');

  // Alert Schedule Config (Requirement 5)
  const currentSchedule: AlertScheduleConfig = settings.alertSchedule || INITIAL_SETTINGS.alertSchedule!;
  const [scheduleForm, setScheduleForm] = useState<AlertScheduleConfig>({ ...currentSchedule });
  const [notifPermission, setNotifPermission] = useState<string>('default');

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
  }, []);

  const handleToggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, ativo: !r.ativo } : r));
  };

  const handleTemplateChange = (id: string, text: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, mensagemTemplate: text } : r));
  };

  const handleDaysChange = (id: string, days: number) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, dias: days } : r));
  };

  const handleSaveAll = async () => {
    await updateAutomations(rules);
    await updateAlertSchedule(scheduleForm);
    setSavedNotice(true);
    playSound('sino');
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleRequestPush = async () => {
    const granted = await requestNotificationPermission();
    setNotifPermission(getNotificationPermission());
    if (granted) {
      setScheduleForm(prev => ({ ...prev, pushEnabled: true }));
      await updateAlertSchedule({ pushEnabled: true });
      sendBrowserNotification('🔔 Gerenciapró — Notificações Ativadas!', {
        body: 'Você receberá alertas automáticos de vencimento e atraso de clientes neste dispositivo.'
      });
      playSound('sino');
    } else {
      alert('Permissão de notificações não foi concedida. Verifique as configurações do navegador/dispositivo.');
    }
  };

  const handleTestNotification = () => {
    const sent = sendBrowserNotification('🚨 Alerta de Vencimento — Gerenciapró', {
      body: 'Cliente: Comercial | Plano: Mensal | Vencimento hoje! Valor: R$ 20.00',
      clientUrl: '#clientes'
    });
    if (!sent) {
      alert('Ative as notificações clicando em "Ativar Notificações no Dispositivo" primeiro.');
    } else {
      playSound('urgente');
    }
  };

  return (
    <div className="space-y-8 max-w-5xl animate-in fade-in duration-200">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Automações & Alertas de Celular
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Configure períodos de aviso, notificações no dispositivo e réguas de cobrança no WhatsApp.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all hover:scale-[1.02]"
        >
          <Save size={15} />
          <span>Salvar Todas as Configurações</span>
        </button>
      </div>

      {savedNotice && (
        <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>Configurações de alerta e automações salvas com sucesso!</span>
        </div>
      )}

      {/* REQUIREMENT 5: Alertas de Vencimento e Notificações do Celular / PWA */}
      <div className="tech-card rounded-3xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1b1f2e]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-950/80 border border-red-800/60 text-red-500 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(220,38,38,0.3)]">
              <Bell size={22} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                Alertas de Vencimento no Celular & Navegador
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Disparo de notificações com nome, plano, vencimento, situação e dias restantes ou de atraso.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {notifPermission === 'granted' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-xs font-bold">
                <CheckCircle2 size={14} />
                <span>Notificações Ativas</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleRequestPush}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all"
              >
                <Smartphone size={14} />
                <span>Ativar Notificações no Dispositivo</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleTestNotification}
              className="px-3 py-2 rounded-xl bg-[#141724] hover:bg-[#1f2436] text-gray-200 text-xs font-semibold border border-[#23293c]"
            >
              Testar Notificação
            </button>
          </div>
        </div>

        {/* Configurable Alert Interval Checks (Requirement 5) */}
        <div className="space-y-4">
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
            Selecione os momentos em que deseja receber alertas:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* 7 dias antes */}
            <label className={`p-4 rounded-2xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
              scheduleForm.aviso7Dias
                ? 'bg-[#150d12] border-red-600/70 text-white shadow-[0_0_12px_rgba(220,38,38,0.2)]'
                : 'bg-[#0f1118] border-[#1d2232] text-gray-400'
            }`}>
              <input
                type="checkbox"
                checked={scheduleForm.aviso7Dias}
                onChange={e => setScheduleForm({ ...scheduleForm, aviso7Dias: e.target.checked })}
                className="w-4 h-4 accent-red-600 mt-0.5"
              />
              <div>
                <strong className="block text-white">7 dias antes</strong>
                <span className="text-[11px] text-gray-400">Alerta preventivo com 1 semana de antecedência</span>
              </div>
            </label>

            {/* 3 dias antes */}
            <label className={`p-4 rounded-2xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
              scheduleForm.aviso3Dias
                ? 'bg-[#150d12] border-red-600/70 text-white shadow-[0_0_12px_rgba(220,38,38,0.2)]'
                : 'bg-[#0f1118] border-[#1d2232] text-gray-400'
            }`}>
              <input
                type="checkbox"
                checked={scheduleForm.aviso3Dias}
                onChange={e => setScheduleForm({ ...scheduleForm, aviso3Dias: e.target.checked })}
                className="w-4 h-4 accent-red-600 mt-0.5"
              />
              <div>
                <strong className="block text-white">3 dias antes</strong>
                <span className="text-[11px] text-gray-400">Lembrete para providenciar a renovação</span>
              </div>
            </label>

            {/* 1 dia antes */}
            <label className={`p-4 rounded-2xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
              scheduleForm.aviso1Dia
                ? 'bg-[#150d12] border-red-600/70 text-white shadow-[0_0_12px_rgba(220,38,38,0.2)]'
                : 'bg-[#0f1118] border-[#1d2232] text-gray-400'
            }`}>
              <input
                type="checkbox"
                checked={scheduleForm.aviso1Dia}
                onChange={e => setScheduleForm({ ...scheduleForm, aviso1Dia: e.target.checked })}
                className="w-4 h-4 accent-red-600 mt-0.5"
              />
              <div>
                <strong className="block text-white">1 dia antes (Véspera)</strong>
                <span className="text-[11px] text-gray-400">Alerta de vencimento amanhã</span>
              </div>
            </label>

            {/* No dia do vencimento */}
            <label className={`p-4 rounded-2xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
              scheduleForm.avisoNoDia
                ? 'bg-[#150d12] border-red-600/70 text-white shadow-[0_0_12px_rgba(220,38,38,0.2)]'
                : 'bg-[#0f1118] border-[#1d2232] text-gray-400'
            }`}>
              <input
                type="checkbox"
                checked={scheduleForm.avisoNoDia}
                onChange={e => setScheduleForm({ ...scheduleForm, avisoNoDia: e.target.checked })}
                className="w-4 h-4 accent-red-600 mt-0.5"
              />
              <div>
                <strong className="block text-white">No dia do vencimento</strong>
                <span className="text-[11px] text-gray-400">Alerta urgente de vencimento hoje</span>
              </div>
            </label>

            {/* Após o vencimento */}
            <label className={`p-4 rounded-2xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
              scheduleForm.avisoAposVencimento
                ? 'bg-[#150d12] border-red-600/70 text-white shadow-[0_0_12px_rgba(220,38,38,0.2)]'
                : 'bg-[#0f1118] border-[#1d2232] text-gray-400'
            }`}>
              <input
                type="checkbox"
                checked={scheduleForm.avisoAposVencimento}
                onChange={e => setScheduleForm({ ...scheduleForm, avisoAposVencimento: e.target.checked })}
                className="w-4 h-4 accent-red-600 mt-0.5"
              />
              <div>
                <strong className="block text-white">Após o vencimento (Em atraso)</strong>
                <span className="text-[11px] text-gray-400">Alertas recorrentes durante a inadimplência</span>
              </div>
            </label>

            {/* Intervalo durante atraso */}
            <div className="p-4 rounded-2xl border border-[#1d2232] bg-[#0f1118] text-xs space-y-1.5">
              <strong className="block text-white">Intervalo durante o atraso:</strong>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">A cada</span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={scheduleForm.intervaloAtrasoDias}
                  onChange={e => setScheduleForm({ ...scheduleForm, intervaloAtrasoDias: parseInt(e.target.value) || 2 })}
                  className="w-14 bg-[#141724] border border-[#23293c] rounded-lg px-2 py-1 text-xs text-white text-center font-mono-code font-bold outline-none"
                />
                <span className="text-gray-400">dias</span>
              </div>
              <span className="text-[10px] text-gray-500 block">Evita disparos excessivos repetitivos</span>
            </div>
          </div>

          {/* Technical clarification card */}
          <div className="bg-[#10131d] border border-[#1d2235] rounded-2xl p-4 text-xs text-gray-300 space-y-2">
            <div className="flex items-center gap-2 text-white font-semibold">
              <ShieldCheck size={16} className="text-red-500" />
              <span>Como funcionam as notificações no seu dispositivo:</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              • <strong>No PWA e navegadores móveis (Android Chrome e iOS Safari 16.4+)</strong>: as notificações push e locais são exibidas na central de avisos do aparelho quando o aplicativo estiver instalado ou o navegador aberto.<br />
              • <strong>Alarmes no Relógio/Calendário</strong>: devido a restrições de segurança dos sistemas operacionais, o navegador não pode criar diretamente alarmes no app Relógio nativo; para isso, disponibilizamos o botão <strong>Alarme no Celular (.ics)</strong> na ficha de cada cliente, que cria o evento com alarme sonoro integrado no Google Agenda ou Apple Calendar.
            </p>
          </div>
        </div>
      </div>

      {/* Regras do WhatsApp (Automação de mensagens) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-white font-display font-bold text-base">
          <MessageCircle size={18} className="text-emerald-400" />
          <span>Regras e Mensagens para Disparo via WhatsApp</span>
        </div>

        {rules.map(rule => (
          <div
            key={rule.id}
            className={`tech-card rounded-2xl p-5 md:p-6 transition-all ${
              rule.ativo
                ? 'border-red-950/70 shadow-[0_0_15px_rgba(220,38,38,0.1)]'
                : 'opacity-75'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#181b28]">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${
                  rule.ativo ? 'bg-red-950/70 text-red-500 border-red-800/50' : 'bg-[#151824] text-gray-500 border-[#222738]'
                }`}>
                  <Zap size={18} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-white">
                    {rule.titulo}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <span>Disparar:</span>
                    <input
                      type="number"
                      value={rule.dias}
                      onChange={e => handleDaysChange(rule.id, parseInt(e.target.value) || 0)}
                      className="w-16 bg-[#131622] border border-[#23293c] rounded px-2 py-0.5 text-xs text-white text-center font-mono-code font-bold"
                    />
                    <span>dia(s) em relação ao vencimento</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const client = clients.find(c => c.id === testClient) || clients[0];
                    if (client) sendWhatsAppReminder(client, rule);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141724] hover:bg-[#1f2436] text-gray-300 hover:text-white text-xs font-semibold border border-[#23293c] transition-colors"
                  title="Testar disparo via WhatsApp"
                >
                  <Send size={13} className="text-emerald-400" />
                  <span>Testar no WhatsApp</span>
                </button>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rule.ativo}
                    onChange={() => handleToggleRule(rule.id)}
                    className="w-4 h-4 accent-red-600 rounded"
                  />
                  <span className="text-xs font-bold text-gray-300">{rule.ativo ? 'Ativo' : 'Pausado'}</span>
                </label>
              </div>
            </div>

            {/* Template Editor */}
            <div className="pt-3 space-y-2">
              <label className="block text-xs font-semibold text-gray-400">
                Modelo da Mensagem (tags: <strong className="text-red-400">{'{{nome}}'}</strong>, <strong className="text-red-400">{'{{vencimento}}'}</strong>, <strong className="text-red-400">{'{{valor}}'}</strong>, <strong className="text-red-400">{'{{plano}}'}</strong>, <strong className="text-red-400">{'{{chave_pix}}'}</strong>, <strong className="text-red-400">{'{{link_pagamento}}'}</strong>)
              </label>
              <textarea
                rows={3}
                value={rule.mensagemTemplate}
                onChange={e => handleTemplateChange(rule.id, e.target.value)}
                className="w-full bg-[#10131d] border border-[#1f2436] focus:border-red-600 rounded-xl p-3 text-xs text-white font-mono-code leading-relaxed outline-none resize-none"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Dispatches / Notification Logs */}
      <div className="tech-card rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#181b28]">
          <div className="flex items-center gap-2 text-white font-display font-bold text-base">
            <History size={18} className="text-red-500" />
            <span>Histórico de Notificações Enviadas</span>
          </div>
          <span className="text-xs text-gray-500 font-mono-code">{notificationLogs.length} envios registrados</span>
        </div>

        {notificationLogs.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-6">
            Nenhum disparo registrado ainda. Ao notificar no Dashboard ou Clientes, o histórico é salvo automaticamente.
          </p>
        ) : (
          <div className="divide-y divide-[#151824] max-h-72 overflow-y-auto pr-1">
            {notificationLogs.map(log => (
              <div key={log.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{log.clienteNome}</span>
                    <span className="font-mono-code text-gray-400">({log.clienteWhatsapp})</span>
                    <span className="px-2 py-0.5 bg-[#171a26] text-gray-300 rounded text-[10px]">
                      {log.tipo}
                    </span>
                  </div>
                  <p className="text-gray-400 text-[11px] mt-1 line-clamp-2">{log.mensagem}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-emerald-400 font-semibold text-[10px] block">Enviado</span>
                  <span className="text-gray-500 text-[10px]">
                    {new Date(log.data).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
