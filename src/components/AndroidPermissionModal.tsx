import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellOff,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Calendar,
  X,
  Volume2,
  Lock,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import {
  getNotificationPermission,
  isPermissionDenied,
  isPermissionGranted,
  registerDeviceForPush,
  sendTestPushToAll,
  listenToPermissionChanges
} from '../utils/webPush';
import { useApp } from '../context/AppContext';

interface AndroidPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidPermissionModal: React.FC<AndroidPermissionModalProps> = ({ isOpen, onClose }) => {
  const { clients, showToast, playSound } = useApp();
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [activeStepTab, setActiveStepTab] = useState<'chrome' | 'android' | 'calendar'>('chrome');

  useEffect(() => {
    if (!isOpen) return;
    setPermissionState(getNotificationPermission());

    const cleanup = listenToPermissionChanges((status) => {
      setPermissionState(status);
      if (status === 'granted') {
        showToast('Permissão de notificações detectada como ATIVA!');
        playSound('sino');
        // Auto-register immediately
        registerDeviceForPush();
      }
    });

    return cleanup;
  }, [isOpen, showToast, playSound]);

  if (!isOpen) return null;

  const handleCheckAndActivate = async () => {
    setLoading(true);
    setTestStatus(null);
    try {
      const result = await registerDeviceForPush();
      setPermissionState(getNotificationPermission());
      if (result.success) {
        showToast(result.message);
        playSound('sino');
        setTestStatus('✅ Conectado com sucesso! Notificações ativas.');
      } else {
        showToast(result.message);
        playSound('urgente');
        setTestStatus(result.message);
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao verificar');
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setLoading(true);
    try {
      // If permission is granted in browser, also trigger immediate native Notification API
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('🚨 GERENCIAPRÓ — Teste de Vencimento', {
            body: 'Seu celular Android está recebendo os alertas de clientes com sucesso!',
            icon: '/assets/icon.png',
            tag: 'test-direct-' + Date.now()
          });
        } catch {
          // Ignore service worker requirement on some browsers
        }
      }

      const res = await sendTestPushToAll();
      showToast(res.message);
      playSound('sino');
      setTestStatus(res.success ? '🔔 Alerta de teste emitido para o dispositivo!' : res.message);
    } catch (err: any) {
      showToast(err.message || 'Erro ao disparar teste');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCalendar = () => {
    try {
      const expiringClients = clients.filter(c => !c.arquivado && c.vencimento);
      if (expiringClients.length === 0) {
        showToast('Nenhum cliente com data de vencimento encontrada.');
        return;
      }

      let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Gerenciapro//Alertas de Vencimento//PT',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Gerenciapro Vencimentos',
        'X-WR-TIMEZONE:America/Sao_Paulo'
      ];

      expiringClients.forEach(c => {
        // Parse vencimento format DD/MM/YYYY or YYYY-MM-DD
        let year = '', month = '', day = '';
        if (c.vencimento.includes('/')) {
          const parts = c.vencimento.split('/');
          if (parts.length === 3) {
            day = parts[0].padStart(2, '0');
            month = parts[1].padStart(2, '0');
            year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
          }
        } else if (c.vencimento.includes('-')) {
          const parts = c.vencimento.split('-');
          if (parts.length === 3) {
            year = parts[0];
            month = parts[1].padStart(2, '0');
            day = parts[2].padStart(2, '0');
          }
        }

        if (year && month && day) {
          const dateStr = `${year}${month}${day}`;
          icsContent.push(
            'BEGIN:VEVENT',
            `UID:gerenciapro-client-${c.id}@gerenciapro.app`,
            `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
            `DTSTART;VALUE=DATE:${dateStr}`,
            `SUMMARY:🚨 Vencimento: ${c.nome} (R$ ${Number(c.valor || 0).toFixed(2)})`,
            `DESCRIPTION:Cliente: ${c.nome}\\nPlano: ${c.plano}\\nServidor: ${c.servidor || 'Cine Hub'}\\nTelefone: ${c.whatsapp || ''}\\nStatus atual: ${c.status}`,
            'BEGIN:VALARM',
            'ACTION:DISPLAY',
            'DESCRIPTION:Lembrete de Vencimento Gerenciapro',
            'TRIGGER:-P1D', // 1 day before
            'END:VALARM',
            'BEGIN:VALARM',
            'ACTION:DISPLAY',
            'DESCRIPTION:Vencimento Hoje Gerenciapro',
            'TRIGGER:PT9H', // 9:00 AM on the day
            'END:VALARM',
            'END:VEVENT'
          );
        }
      });

      icsContent.push('END:VCALENDAR');

      const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'gerenciapro_vencimentos_agenda.ics');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('Arquivo de Agenda (.ics) baixado! Abra no seu Android para vincular ao alarme da Agenda.');
      playSound('digital');
    } catch (e: any) {
      showToast('Erro ao exportar agenda: ' + e.message);
    }
  };

  const isDenied = permissionState === 'denied';
  const isGranted = permissionState === 'granted';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-gray-900 border border-red-500/30 rounded-2xl shadow-2xl shadow-red-950/40 text-gray-200 overflow-hidden my-6">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 bg-gradient-to-r from-red-950/50 via-gray-900 to-black flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isGranted
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : isDenied
                ? 'bg-red-500/10 border-red-500/40 text-red-400 animate-pulse'
                : 'bg-amber-500/10 border-amber-500/40 text-amber-400'
            }`}>
              {isGranted ? <Bell className="w-6 h-6" /> : <BellOff className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Central de Notificações do Android
                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold border ${
                  isGranted
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30'
                    : isDenied
                    ? 'bg-red-950/80 text-red-400 border-red-500/30'
                    : 'bg-amber-950/80 text-amber-400 border-amber-500/30'
                }`}>
                  {isGranted ? 'Ativo' : isDenied ? 'Bloqueado no Celular' : 'Pendente'}
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Como desbloquear e receber alertas de vencimento mesmo com o app fechado
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Diagnostic Status Box */}
        <div className="p-5 space-y-4">
          <div className={`p-4 rounded-xl border ${
            isGranted
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
              : isDenied
              ? 'bg-red-950/30 border-red-500/40 text-red-200'
              : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
          }`}>
            <div className="flex items-start gap-3">
              {isGranted ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs leading-relaxed space-y-1">
                <p className="font-semibold text-white">
                  {isGranted
                    ? 'Notificações estão 100% autorizadas neste dispositivo!'
                    : isDenied
                    ? 'O Android bloqueou as notificações deste aplicativo'
                    : 'A permissão ainda não foi confirmada pelo navegador'}
                </p>
                <p className="text-gray-300">
                  {isGranted
                    ? 'Você receberá os avisos de clientes em atraso e vencimentos diretamente na barra superior do celular.'
                    : isDenied
                    ? 'No Android, quando a notificação é recusada uma vez, o navegador bloqueia e não pergunta de novo automaticamente. Você só precisa trocar a opção para "Permitir" seguindo o guia abaixo:'
                    : 'Toque no botão "Verificar e Ativar Agora" para solicitar a permissão do sistema operacional.'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Step Tabs */}
          <div className="flex rounded-lg bg-gray-950 p-1 border border-gray-800 text-xs">
            <button
              onClick={() => setActiveStepTab('chrome')}
              className={`flex-1 py-2 px-3 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeStepTab === 'chrome'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              1. Desbloquear no Chrome (15s)
            </button>
            <button
              onClick={() => setActiveStepTab('android')}
              className={`flex-1 py-2 px-3 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeStepTab === 'android'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              2. Configurações Android
            </button>
            <button
              onClick={() => setActiveStepTab('calendar')}
              className={`flex-1 py-2 px-3 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeStepTab === 'calendar'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              3. Alarme na Agenda
            </button>
          </div>

          {/* Step 1: Chrome Android Guide */}
          {activeStepTab === 'chrome' && (
            <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-red-400" />
                Como desbloquear no Chrome do Celular:
              </h3>
              
              <ol className="space-y-2.5 text-xs text-gray-300">
                <li className="flex items-start gap-2.5 bg-gray-900/60 p-2.5 rounded-lg border border-gray-800/80">
                  <span className="w-5 h-5 rounded-full bg-red-600/30 border border-red-500/50 text-red-300 flex items-center justify-center font-bold shrink-0 text-[11px]">1</span>
                  <div>
                    <strong className="text-white">Toque no ícone ao lado do endereço do site:</strong>
                    <p className="text-gray-400 mt-0.5">Na barra de topo do Chrome (onde fica o link), toque no ícone de <strong>Cadeado 🔒</strong> ou <strong>Ajustes do Site ⚙️</strong>.</p>
                  </div>
                </li>

                <li className="flex items-start gap-2.5 bg-gray-900/60 p-2.5 rounded-lg border border-gray-800/80">
                  <span className="w-5 h-5 rounded-full bg-red-600/30 border border-red-500/50 text-red-300 flex items-center justify-center font-bold shrink-0 text-[11px]">2</span>
                  <div>
                    <strong className="text-white">Acesse Permissões:</strong>
                    <p className="text-gray-400 mt-0.5">Toque no item <strong>"Permissões"</strong> ou <strong>"Configurações do site"</strong>.</p>
                  </div>
                </li>

                <li className="flex items-start gap-2.5 bg-gray-900/60 p-2.5 rounded-lg border border-gray-800/80">
                  <span className="w-5 h-5 rounded-full bg-red-600/30 border border-red-500/50 text-red-300 flex items-center justify-center font-bold shrink-0 text-[11px]">3</span>
                  <div>
                    <strong className="text-white">Mude Notificações para PERMITIR:</strong>
                    <p className="text-gray-400 mt-0.5">Toque em <strong>Notificações</strong> e mude de <em>"Bloqueado"</em> para <strong className="text-emerald-400">"Permitir"</strong> (ou toque em <em>"Redefinir permissões"</em>).</p>
                  </div>
                </li>

                <li className="flex items-start gap-2.5 bg-gray-900/60 p-2.5 rounded-lg border border-gray-800/80">
                  <span className="w-5 h-5 rounded-full bg-red-600/30 border border-red-500/50 text-red-300 flex items-center justify-center font-bold shrink-0 text-[11px]">4</span>
                  <div>
                    <strong className="text-white">Volte aqui e clique no botão abaixo:</strong>
                    <p className="text-gray-400 mt-0.5">Assim que você permitir, o aplicativo ativará o canal push automaticamente.</p>
                  </div>
                </li>
              </ol>
            </div>
          )}

          {/* Step 2: Android System Guide */}
          {activeStepTab === 'android' && (
            <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-red-400" />
                Permissão Geral do Sistema Android (Android 13, 14 e 15):
              </h3>
              
              <p className="text-xs text-gray-400">
                Se as notificações do seu navegador Chrome estiverem desligadas no sistema Android como um todo, nenhuma mensagem chega:
              </p>

              <ol className="space-y-2 text-xs text-gray-300">
                <li className="bg-gray-900/60 p-2.5 rounded-lg border border-gray-800/80 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Abra as <strong>Configurações</strong> do seu celular Android.</span>
                </li>
                <li className="bg-gray-900/60 p-2.5 rounded-lg border border-gray-800/80 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Toque em <strong>Aplicativos</strong> (ou Gerenciar Apps) e selecione o <strong>Chrome</strong> (ou o Gerenciapró se estiver instalado na tela inicial).</span>
                </li>
                <li className="bg-gray-900/60 p-2.5 rounded-lg border border-gray-800/80 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Toque em <strong>Notificações</strong> e marque a chave para <strong className="text-emerald-400">ATIVAR / Permitir notificações</strong>.</span>
                </li>
                <li className="bg-gray-900/60 p-2.5 rounded-lg border border-gray-800/80 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Certifique-se de que a opção de <strong>Não Perturbe</strong> não está silenciando o app.</span>
                </li>
              </ol>
            </div>
          )}

          {/* Step 3: Calendar Alarm Fallback */}
          {activeStepTab === 'calendar' && (
            <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                Garantia Extra: Alarmes na Agenda do Android (.ICS)
              </h3>
              
              <p className="text-xs text-gray-300 leading-relaxed">
                Você pode importar todos os vencimentos atuais diretamente para a Agenda nativa do seu celular (Google Agenda / Samsung Agenda). O sistema criará lembretes automáticos com alarme 1 dia antes e no próprio dia do vencimento de cada cliente.
              </p>

              <button
                onClick={handleExportCalendar}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 transition-all cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                Baixar Agenda de Vencimentos (.ICS) para o Android
              </button>
            </div>
          )}

          {testStatus && (
            <div className="text-xs p-3 rounded-lg bg-gray-950 border border-gray-800 text-gray-300 flex items-center justify-between">
              <span>{testStatus}</span>
              <button onClick={() => setTestStatus(null)} className="text-gray-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-5 border-t border-gray-800 bg-gray-950/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-800 text-xs text-gray-400 hover:text-white hover:bg-gray-900 transition-colors"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isGranted && (
              <button
                onClick={handleTestNotification}
                disabled={loading}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-white flex items-center justify-center gap-2 border border-gray-700 transition-all cursor-pointer"
              >
                <Volume2 className="w-4 h-4 text-emerald-400" />
                Testar Alarme Agora
              </button>
            )}

            <button
              onClick={handleCheckAndActivate}
              disabled={loading}
              className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                isGranted
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                  : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-red-950/50'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Verificando...' : isGranted ? 'Re-sincronizar Dispositivo' : 'Verificar e Ativar Agora'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
