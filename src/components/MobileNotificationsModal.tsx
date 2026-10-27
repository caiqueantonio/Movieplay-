import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Calendar,
  MessageCircle,
  Download,
  Volume2,
  X,
  ExternalLink,
  Sparkles,
  Zap
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendBrowserNotification
} from '../utils/notifications';

interface MobileNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNotificationsModal: React.FC<MobileNotificationsModalProps> = ({
  isOpen,
  onClose
}) => {
  const { clients, playSound } = useApp();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [testSent, setTestSent] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const overdueCount = clients.filter(c => !c.arquivado && c.status === 'Em atraso').length;
  const dueSoonCount = clients.filter(c => !c.arquivado && c.status === 'Vencendo (7d)').length;

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    const granted = await requestNotificationPermission();
    setPermission(getNotificationPermission());
    setIsRequesting(false);

    if (granted) {
      playSound('sino');
      // Fire a test notification immediately
      sendBrowserNotification('🚨 Gerenciapró Alerta Ativado!', {
        body: `Notificações configuradas com sucesso! Você tem ${overdueCount} cliente(s) em atraso no painel.`,
        icon: '/logo.png'
      });
      setTestSent(true);
    } else {
      alert('A permissão de notificações não foi concedida. Verifique as permissões de notificação do seu navegador nas configurações do celular.');
    }
  };

  const handleSendTestNotification = () => {
    playSound('urgente');
    const success = sendBrowserNotification('🚨 Gerenciapró: Clientes em Atraso!', {
      body: `Atenção: Existem ${overdueCount} clientes com pagamentos em atraso aguardando cobrança no painel.`,
      icon: '/logo.png'
    });

    if (success) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 4000);
    } else {
      alert('Ative as notificações primeiro clicando no botão acima.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="tech-card border border-red-950/80 rounded-3xl max-w-2xl w-full my-auto p-6 md:p-8 space-y-6 shadow-[0_0_60px_rgba(220,38,38,0.25)] relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Glow background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#1b1f30] pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-red-950/80 border border-red-700/60 text-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)]">
              <Smartphone size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg sm:text-xl font-bold text-white tracking-tight">
                  Como o App te Notifica no Celular
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/90 text-emerald-400 border border-emerald-800/60">
                  Sem Abrir o App
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Saiba exatamente como funciona a integração nativa com o seu smartphone.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1a1d2c] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status atual das notificações */}
        <div className="bg-[#0b0e17] border border-[#1f2538] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              permission === 'granted'
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-amber-950/80 text-amber-400 border-amber-700/60'
            }`}>
              <Bell size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Status no seu dispositivo:</span>
                <span className={`text-[11px] font-mono-code font-bold ${
                  permission === 'granted' ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {permission === 'granted' ? 'Ativo (Permitido)' : 'Aguardando Permissão'}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {permission === 'granted'
                  ? 'Seu celular está autorizado a receber alertas de clientes em atraso na tela de bloqueio.'
                  : 'Clique abaixo para permitir que o aparelho toque e vibre com alertas de vencimento.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {permission !== 'granted' ? (
              <button
                onClick={handleRequestPermission}
                disabled={isRequesting}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all flex items-center justify-center gap-1.5"
              >
                <Bell size={14} />
                <span>Ativar no Meu Celular</span>
              </button>
            ) : (
              <button
                onClick={handleSendTestNotification}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles size={14} />
                <span>Testar Notificação Agora</span>
              </button>
            )}
          </div>
        </div>

        {testSent && (
          <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={16} />
            <span>Alerta disparado para o seu aparelho! Verifique o topo da tela do seu celular.</span>
          </div>
        )}

        {/* 4 Métodos de Integração no Celular */}
        <div className="space-y-3 relative z-10">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
            Os 3 Modos de Notificação Integrados ao Aparelho:
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Método 1: Notificações Push do Sistema */}
            <div className="bg-[#0e111d] border border-[#1e2338] rounded-2xl p-4 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-red-950/80 text-red-500 border border-red-800/60 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h4 className="font-display text-xs font-bold text-white flex items-center gap-1.5">
                <Bell size={13} className="text-red-400" />
                <span>Notificações na Barra de Status</span>
              </h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                O navegador do seu celular (Chrome, Safari, Edge) envia alertas na <strong>tela de bloqueio e na barra de notificações</strong> sempre que um cliente estiver atrasado, sem você precisar abrir o app.
              </p>
            </div>

            {/* Método 2: Instalação como App Nativo (PWA) */}
            <div className="bg-[#0e111d] border border-[#1e2338] rounded-2xl p-4 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-blue-950/80 text-blue-400 border border-blue-800/60 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h4 className="font-display text-xs font-bold text-white flex items-center gap-1.5">
                <Smartphone size={13} className="text-blue-400" />
                <span>Instalar como App Nativo</span>
              </h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Adicione o Gerenciapró à <strong>Tela de Início</strong> do seu celular (Android ou iPhone). Ele passa a se comportar como um app nativo baixado da loja, com ícone próprio e alertas em segundo plano.
              </p>
            </div>

            {/* Método 3: Alarmes no Calendário do Celular (.ics) */}
            <div className="bg-[#0e111d] border border-[#1e2338] rounded-2xl p-4 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-800/60 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h4 className="font-display text-xs font-bold text-white flex items-center gap-1.5">
                <Calendar size={13} className="text-amber-400" />
                <span>Alarmes no Calendário</span>
              </h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Ao clicar em <strong>"Alarme no Celular"</strong> em qualquer cliente ou lote, o app cria um evento com despertador no Google Agenda / Apple Calendar que toca o som do celular na hora exata do vencimento.
              </p>
            </div>
          </div>
        </div>

        {/* Resumo de Atrasos Atuais */}
        <div className="bg-[#140b10] border border-red-950/80 rounded-2xl p-4 flex items-center justify-between text-xs relative z-10 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            <span className="text-gray-300">
              Você possui atualmente <strong className="text-white">{overdueCount} cliente(s) em atraso</strong> e <strong className="text-amber-300">{dueSoonCount} vencendo</strong> nos próximos 7 dias.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-600/50 text-xs font-bold transition-all ml-auto"
          >
            Entendido, fechar
          </button>
        </div>
      </div>
    </div>
  );
};
