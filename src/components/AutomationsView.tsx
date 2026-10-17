import React, { useState } from 'react';
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
  Plus
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AutomationRule } from '../types';

export const AutomationsView: React.FC = () => {
  const {
    automations,
    updateAutomations,
    notificationLogs,
    clients,
    sendWhatsAppReminder,
    playSound
  } = useApp();

  const [rules, setRules] = useState<AutomationRule[]>(automations);
  const [savedNotice, setSavedNotice] = useState(false);
  const [testClient, setTestClient] = useState(clients[0]?.id || '');

  const handleToggle = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, ativo: !r.ativo } : r));
  };

  const handleTemplateChange = (id: string, text: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, mensagemTemplate: text } : r));
  };

  const handleDaysChange = (id: string, days: number) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, dias: days } : r));
  };

  const handleSave = async () => {
    await updateAutomations(rules);
    setSavedNotice(true);
    playSound('sino');
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleTestRule = (rule: AutomationRule) => {
    const client = clients.find(c => c.id === testClient) || clients[0];
    if (client) {
      sendWhatsAppReminder(client, rule);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl animate-in fade-in duration-200">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Automações & WhatsApp
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Configure regras automáticas de aviso de vencimento, cobrança e confirmação.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all"
        >
          <Save size={15} />
          <span>Salvar Regras</span>
        </button>
      </div>

      {savedNotice && (
        <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>Regras de automação salvas com sucesso!</span>
        </div>
      )}

      {/* Rules list */}
      <div className="space-y-4">
        {rules.map(rule => (
          <div
            key={rule.id}
            className={`border rounded-2xl p-5 md:p-6 transition-all ${
              rule.ativo
                ? 'bg-[#0c0e15] border-red-950/70 shadow-[0_0_15px_rgba(220,38,38,0.1)]'
                : 'bg-[#090b11] border-[#181b26] opacity-75'
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
                  onClick={() => handleTestRule(rule)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141724] hover:bg-[#1f2436] text-gray-300 hover:text-white text-xs font-semibold border border-[#23293c] transition-colors"
                  title="Testar disparo via WhatsApp para cliente selecionado"
                >
                  <Send size={13} className="text-emerald-400" />
                  <span>Testar Disparo</span>
                </button>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rule.ativo}
                    onChange={() => handleToggle(rule.id)}
                    className="w-4 h-4 accent-red-600 rounded"
                  />
                  <span className="text-xs font-bold text-gray-300">{rule.ativo ? 'Ativo' : 'Pausado'}</span>
                </label>
              </div>
            </div>

            {/* Template Editor */}
            <div className="pt-3 space-y-2">
              <label className="block text-xs font-semibold text-gray-400">
                Modelo da Mensagem (tags dinâmicas disponíveis: <strong className="text-red-400">{'{nome}'}</strong>, <strong className="text-red-400">{'{vencimento}'}</strong>, <strong className="text-red-400">{'{valor}'}</strong>, <strong className="text-red-400">{'{plano}'}</strong>, <strong className="text-red-400">{'{pix}'}</strong>, <strong className="text-red-400">{'{link}'}</strong>)
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
      <div className="bg-[#0c0e15] border border-[#1b1f2e] rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#181b28]">
          <div className="flex items-center gap-2 text-white font-display font-bold text-base">
            <History size={18} className="text-red-500" />
            <span>Histórico de Notificações Enviadas</span>
          </div>
          <span className="text-xs text-gray-500">{notificationLogs.length} envios registrados</span>
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
