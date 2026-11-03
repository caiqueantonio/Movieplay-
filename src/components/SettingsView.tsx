import React, { useState, useEffect } from 'react';
import {
  Upload,
  Play,
  Check,
  Plus,
  Trash2,
  Lock,
  Save,
  Moon,
  Sun,
  Shield,
  CreditCard,
  Server,
  FileCode,
  Smartphone,
  ExternalLink,
  Bell,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Radio,
  HelpCircle,
  Zap,
  ShieldCheck,
  Power,
  Clock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { soundEffects } from '../utils/audio';
import {
  registerDeviceForPush,
  unregisterDeviceFromPush,
  fetchConnectedDevices,
  removeDeviceById,
  sendTestPushToAll,
  triggerManualAlertsDispatch,
  detectDeviceName,
  getCurrentPushSubscription,
  isPushNotificationSupported
} from '../utils/webPush';
import { PushDeviceSubscription, AlertScheduleConfig } from '../types';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    servers,
    addServer,
    deleteServer,
    plans,
    addPlan,
    updatePlan,
    deletePlan,
    clients,
    playSound,
    setActiveTab,
    openAndroidPermissionAssistant,
    showToast,
    connectedDevices: liveConnectedDevices,
    connectedDevicesCount: liveConnectedDevicesCount
  } = useApp();

  const [appName, setAppName] = useState(settings.appName || 'Gerenciapró');
  const [newServerName, setNewServerName] = useState('');
  const [newPlanName, setNewPlanName] = useState('');
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor || '#dc2626');
  const [adminWhatsapp, setAdminWhatsapp] = useState(settings.adminWhatsapp || '');
  const [contatoUrl, setContatoUrl] = useState(settings.contatoUrl || '');

  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Push Notifications & Connected Devices State
  const [devices, setDevices] = useState<PushDeviceSubscription[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isCheckingAlerts, setIsCheckingAlerts] = useState(false);
  const [currentDevice] = useState(detectDeviceName());
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [hasActiveSub, setHasActiveSub] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertScheduleConfig>(
    settings.alertSchedule || {
      aviso7Dias: true,
      aviso3Dias: true,
      aviso1Dia: true,
      avisoNoDia: true,
      avisoAposVencimento: true,
      avisoApos40Dias: true,
      intervaloAtrasoDias: 2,
      horarioEnvio: '09:00',
      pushEnabled: true
    }
  );

  const loadDevices = async () => {
    const list = await fetchConnectedDevices();
    setDevices(list);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    } else {
      setPermission('unsupported');
    }
    const currentSub = await getCurrentPushSubscription();
    setHasActiveSub(!!currentSub);
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handleSaveIdentity = async () => {
    await updateSettings({ appName });
    triggerSaved('Identidade visual atualizada!');
  };

  const handleSaveContact = async () => {
    await updateSettings({ primaryColor, adminWhatsapp, contatoUrl });
    triggerSaved('Configurações salvas!');
  };

  const triggerSaved = (msg: string) => {
    setSavedNotice(msg);
    playSound('sino');
    setTimeout(() => setSavedNotice(null), 2500);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        await updateSettings({ logoUrl: base64 });
        triggerSaved('Logomarca atualizada com sucesso!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTestSound = (type: 'beep' | 'sino' | 'urgente' | 'digital') => {
    soundEffects.playByType(type);
    updateSettings({ soundAlert: type });
  };

  const handleRegisterPush = async () => {
    setIsRegistering(true);
    try {
      const res = await registerDeviceForPush();
      if (res.success) {
        playSound('sino');
        triggerSaved('Dispositivo registrado com sucesso no serviço Push!');
        await loadDevices();
      } else {
        showToast(res.message);
        if (res.isDenied || Notification?.permission === 'denied') {
          openAndroidPermissionAssistant();
        }
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSendTestPush = async () => {
    setIsTesting(true);
    try {
      const res = await sendTestPushToAll();
      if (res.success && res.sentCount > 0) {
        playSound('urgente');
        triggerSaved(`Notificação enviada para ${res.sentCount} aparelho(s)!`);
      } else {
        showToast(res.message);
        if (Notification?.permission === 'denied') {
          openAndroidPermissionAssistant();
        }
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleManualAlertScan = async () => {
    setIsCheckingAlerts(true);
    try {
      const res = await triggerManualAlertsDispatch();
      triggerSaved(res.message);
      playSound('sino');
    } finally {
      setIsCheckingAlerts(false);
    }
  };

  const handleDeleteDevice = async (id: string, name: string) => {
    if (confirm(`Desconectar e remover o aparelho "${name}" das notificações?`)) {
      await removeDeviceById(id);
      triggerSaved('Dispositivo desconectado.');
      await loadDevices();
    }
  };

  const handleSaveAlertSchedule = async (newConfig: AlertScheduleConfig) => {
    setAlertConfig(newConfig);
    await updateSettings({ alertSchedule: newConfig });
    triggerSaved('Regras de envio de notificações atualizadas!');
  };

  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerName.trim()) return;
    await addServer(newServerName.trim());
    setNewServerName('');
    triggerSaved('Servidor adicionado!');
  };

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim()) return;
    await addPlan({
      nome: newPlanName.trim(),
      duracaoMeses: 1,
      valorPadrao: 20.00,
      linkCobranca: '',
      chavePix: '',
      status: 'ativo'
    });
    setNewPlanName('');
    triggerSaved('Novo plano adicionado!');
  };


  return (
    <div className="space-y-6 max-w-4xl pb-16 animate-in fade-in duration-200">
      {/* Title */}
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          Configurações
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Gerencie seu perfil, aparência e preferências
        </p>
      </div>

      {savedNotice && (
        <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <Check size={16} />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* 1. Identidade Visual (matching tela5.png) */}
      <div className="bg-[#0c0e15] border border-[#1b1f2e] rounded-2xl p-5 md:p-6 space-y-4">
        <h2 className="font-display text-base font-bold text-white tracking-wide">
          Identidade Visual
        </h2>
        <p className="text-xs text-gray-400">
          As personalizações ficam vinculadas à sua conta e sincronizam automaticamente em todos os dispositivos.
        </p>

        <div className="flex items-center gap-5 pt-2">
          {/* Logo preview with red glow */}
          <div className="w-16 h-16 flex items-center justify-center shrink-0 filter drop-shadow-[0_0_15px_rgba(220,38,38,0.4)]">
            <img
              src={settings.logoUrl || '/logo.png'}
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              LOGO
            </span>
            <p className="text-[11px] text-gray-500">
              Clique no botão para trocar (PNG transparente ou SVG, máx 2MB)
            </p>
            <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141724] border border-[#23293c] hover:border-gray-500 text-xs font-medium text-gray-300 hover:text-white cursor-pointer transition-colors mt-1">
              <Upload size={13} />
              <span>Escolher arquivo</span>
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
          </div>
        </div>

        <div className="pt-2">
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">
            Nome do aplicativo
          </label>
          <div className="flex gap-2.5 max-w-lg">
            <input
              type="text"
              value={appName}
              onChange={e => setAppName(e.target.value)}
              className="flex-1 bg-[#121522] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
            />
            <button
              onClick={handleSaveIdentity}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-[0_0_12px_#dc2626] transition-all"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>

      {/* 2. Aparência (matching tela5.png) */}
      <div className="bg-[#0c0e15] border border-[#1b1f2e] rounded-2xl p-5 md:p-6 space-y-4">
        <h2 className="font-display text-base font-bold text-white tracking-wide">
          Aparência
        </h2>
        <div>
          <span className="block text-xs font-semibold text-gray-400 mb-2.5">Tema</span>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <button
              onClick={() => updateSettings({ theme: 'dark' })}
              className={`flex items-center justify-center gap-2.5 py-3 rounded-xl border text-xs font-semibold transition-all ${
                settings.theme !== 'light'
                  ? 'bg-[#180e14] border-red-600/80 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                  : 'bg-[#121522] border-[#222738] text-gray-400 hover:text-white'
              }`}
            >
              <Moon size={15} className="text-red-500" />
              <span>Escuro</span>
            </button>

            <button
              onClick={() => updateSettings({ theme: 'light' })}
              className={`flex items-center justify-center gap-2.5 py-3 rounded-xl border text-xs font-semibold transition-all ${
                settings.theme === 'light'
                  ? 'bg-[#180e14] border-red-600/80 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                  : 'bg-[#121522] border-[#222738] text-gray-400 hover:text-white'
              }`}
            >
              <Sun size={15} />
              <span>Claro</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Alertas Sonoros (matching tela5.png) */}
      <div className="bg-[#0c0e15] border border-[#1b1f2e] rounded-2xl p-5 md:p-6 space-y-4">
        <h2 className="font-display text-base font-bold text-white tracking-wide">
          Alertas Sonoros
        </h2>
        <p className="text-xs text-gray-400">
          Escolha o som que será reproduzido em alertas de vencimento.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
          {[
            { id: 'beep', label: 'Beep Clássico' },
            { id: 'sino', label: 'Sino Suave' },
            { id: 'urgente', label: 'Alerta Urgente' },
            { id: 'digital', label: 'Digital Futurista' },
          ].map(sound => {
            const isSelected = (settings.soundAlert || 'sino') === sound.id;
            return (
              <button
                key={sound.id}
                onClick={() => handleTestSound(sound.id as any)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-[#170e13] border-red-600/80 text-white shadow-[0_0_12px_rgba(220,38,38,0.25)]'
                    : 'bg-[#121522] border-[#222738] text-gray-400 hover:text-white'
                }`}
              >
                <span>{sound.label}</span>
                <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-red-600 text-white' : 'bg-[#1b1f2e] text-gray-400'}`}>
                  <Play size={12} fill="currentColor" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dispositivos Conectados & Push Android (FCM / Web Push) */}
      <div className="bg-[#0c0e15] border border-red-950/60 rounded-2xl p-5 md:p-6 space-y-6 relative overflow-hidden shadow-[0_0_30px_rgba(220,38,38,0.12)]">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b1f2e] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-950/80 rounded-2xl border border-red-700/60 text-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)]">
              <Smartphone size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-white tracking-wide">
                  Dispositivos Conectados & Push Android
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-red-600/20 border border-red-600/40 text-red-400 font-mono-code text-[11px] font-bold">
                  FCM / Web Push
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Receba alertas nativos na central de notificações do Android mesmo com o app fechado ou tela bloqueada.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadDevices}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141724] border border-[#23293c] hover:border-gray-500 text-xs text-gray-300 hover:text-white transition-all self-start sm:self-auto"
            title="Atualizar lista de dispositivos"
          >
            <RefreshCw size={13} />
            <span>Atualizar</span>
          </button>
        </div>

        {/* Diagnostic Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: Permissão Android */}
          <div className="bg-[#10131d] border border-[#1f2436] rounded-xl p-3.5 space-y-1">
            <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider block">
              Permissão no Android
            </span>
            <div className="flex items-center gap-2">
              {permission === 'granted' ? (
                <>
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400">Autorizada</span>
                </>
              ) : permission === 'denied' ? (
                <>
                  <AlertTriangle size={16} className="text-red-400" />
                  <span className="text-xs font-bold text-red-400">Bloqueada no Celular</span>
                </>
              ) : (
                <>
                  <Clock size={16} className="text-amber-400" />
                  <span className="text-xs font-bold text-amber-400">Pendente de Autorização</span>
                </>
              )}
            </div>
          </div>

          {/* Card 2: Aparelho Atual */}
          <div className="bg-[#10131d] border border-[#1f2436] rounded-xl p-3.5 space-y-1">
            <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider block">
              Aparelho Atual
            </span>
            <div className="flex items-center gap-2">
              <Smartphone size={16} className="text-red-400 shrink-0" />
              <span className="text-xs font-bold text-white truncate" title={currentDevice.name}>
                {currentDevice.name}
              </span>
            </div>
          </div>

          {/* Card 3: Status Push em 2º Plano */}
          <div className="bg-[#10131d] border border-[#1f2436] rounded-xl p-3.5 space-y-1">
            <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider block">
              Push em 2º Plano (App Fechado)
            </span>
            <div className="flex items-center gap-2">
              {hasActiveSub ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                  <span className="text-xs font-bold text-emerald-400">Conectado & Ativo</span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-500" />
                  <span className="text-xs font-bold text-gray-400">Não Registrado</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Unblock Banner when Android permission was denied */}
        {permission === 'denied' && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-lg shadow-red-950/40">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-2">
                  Permissão de notificações bloqueada no seu Android / Navegador
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600/30 text-red-300 border border-red-500/40">
                    Ação necessária
                  </span>
                </p>
                <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">
                  O celular não exibirá novos avisos enquanto as notificações estiverem bloqueadas no Chrome. Toque no botão ao lado para ver como desbloquear em 15 segundos.
                </p>
              </div>
            </div>
            <button
              onClick={openAndroidPermissionAssistant}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs shrink-0 cursor-pointer shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 transition-all"
            >
              <Smartphone size={14} />
              <span>Desbloquear Notificações (Guia)</span>
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={openAndroidPermissionAssistant}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#181220] border border-red-500/40 hover:border-red-500 text-red-300 hover:text-white text-xs font-bold tracking-wide transition-all cursor-pointer shadow-sm"
          >
            <Smartphone size={15} className="text-red-400" />
            <span>Guia Passo a Passo Android</span>
          </button>

          <button
            onClick={handleRegisterPush}
            disabled={isRegistering}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold tracking-wide transition-all shadow-[0_0_15px_#dc2626] disabled:opacity-50 cursor-pointer"
          >
            {isRegistering ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Zap size={15} />
            )}
            <span>{hasActiveSub ? 'Re-sincronizar Notificações deste Aparelho' : 'Ativar Notificações no Celular'}</span>
          </button>

          <button
            onClick={handleSendTestPush}
            disabled={isTesting}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#141724] border border-red-900/60 hover:border-red-600 text-red-300 hover:text-white text-xs font-bold tracking-wide transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isTesting ? (
              <RefreshCw size={15} className="animate-spin text-red-400" />
            ) : (
              <Send size={15} className="text-red-400" />
            )}
            <span>Enviar Notificação de Teste no Android</span>
          </button>

          <button
            onClick={handleManualAlertScan}
            disabled={isCheckingAlerts}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#121522] border border-[#23293c] hover:border-gray-500 text-gray-300 hover:text-white text-xs font-semibold tracking-wide transition-all disabled:opacity-50 cursor-pointer"
            title="Executa a verificação dos vencimentos e envia push imediatamente caso haja pendência"
          >
            {isCheckingAlerts ? (
              <RefreshCw size={14} className="animate-spin text-gray-400" />
            ) : (
              <CheckCircle2 size={14} className="text-gray-400" />
            )}
            <span>Verificar e Disparar Vencimentos Agora</span>
          </button>
        </div>

        {/* Connected Devices List */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <span>Dispositivos Conectados</span>
              <span className="px-2 py-0.5 rounded-full bg-[#161a29] text-gray-400 font-mono-code text-[11px]">
                {devices.length} {devices.length === 1 ? 'aparelho' : 'aparelhos'}
              </span>
            </h3>
            <span className="text-[11px] text-gray-500">
              Notificações são enviadas para todos os aparelhos ativos simultaneamente
            </span>
          </div>

          {devices.length === 0 ? (
            <div className="bg-[#10131d] border border-dashed border-[#23293c] rounded-2xl p-6 text-center space-y-2">
              <Smartphone size={24} className="mx-auto text-gray-600" />
              <p className="text-xs text-gray-400 font-semibold">
                Nenhum dispositivo registrado ainda no serviço de notificações.
              </p>
              <p className="text-[11px] text-gray-500 max-w-md mx-auto">
                Acesse o Gerenciapró pelo navegador do seu celular Android (ou instale o PWA) e clique no botão <strong>"Ativar Notificações no Celular"</strong> acima.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#181c2b] border border-[#1d2233] bg-[#0e111a] rounded-2xl overflow-hidden">
              {devices.map(device => {
                const isCurrent = device.deviceName === currentDevice.name;
                return (
                  <div key={device.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#121624] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-900/40 text-red-400">
                        <Smartphone size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-white">
                            {device.deviceName}
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[10px] font-bold">
                              Este Aparelho
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-md bg-[#161a29] text-gray-400 text-[10px] font-mono-code">
                            {device.platform}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                          <span>Conectado em: {new Date(device.createdAt).toLocaleDateString('pt-BR')}</span>
                          <span>•</span>
                          <span>Última atividade: {new Date(device.lastActiveAt).toLocaleDateString('pt-BR')} {new Date(device.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-900/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Ativo</span>
                      </span>

                      <button
                        onClick={() => handleDeleteDevice(device.id, device.deviceName)}
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl transition-all"
                        title="Desconectar este aparelho"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alert Categories & Automation Schedule */}
        <div className="bg-[#10131d] border border-[#1f2436] rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1b1f30] pb-3">
            <div>
              <h3 className="font-display text-xs font-bold text-white uppercase tracking-wider">
                Regras & Categorias de Envio Automático
              </h3>
              <p className="text-[11px] text-gray-400">
                O servidor verifica a base de clientes periodicamente e dispara notificações push no horário programado.
              </p>
            </div>

            {/* General Push Toggle */}
            <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto">
              <input
                type="checkbox"
                checked={alertConfig.pushEnabled}
                onChange={e => handleSaveAlertSchedule({ ...alertConfig, pushEnabled: e.target.checked })}
                className="w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-[#161a28] border-[#293046]"
              />
              <span className="text-xs font-bold text-white">Serviço Push Ativo</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {[
              {
                id: 'aviso7Dias',
                label: '7 dias antes do vencimento',
                desc: 'Aviso preventivo para renovações tranquilas'
              },
              {
                id: 'aviso3Dias',
                label: '3 dias antes do vencimento',
                desc: 'Alerta de vencimento iminente'
              },
              {
                id: 'aviso1Dia',
                label: '1 dia antes (vence amanhã)',
                desc: 'Lembrete de urgência prévia'
              },
              {
                id: 'avisoNoDia',
                label: 'No dia do vencimento (HOJE)',
                desc: 'Notificação crítica do dia'
              },
              {
                id: 'avisoAposVencimento',
                label: 'Avisos após vencimento (em atraso)',
                desc: 'Cobrança periódica de clientes com atraso'
              },
              {
                id: 'avisoApos40Dias',
                label: 'Clientes inativos (+40 dias atrasados)',
                desc: 'Alerta para arquivamento ou oferta de reativação'
              }
            ].map(rule => (
              <label
                key={rule.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-[#141826] border border-[#23293c] hover:border-red-900/60 cursor-pointer transition-all"
              >
                <input
                  type="checkbox"
                  checked={(alertConfig as any)[rule.id] ?? true}
                  onChange={e =>
                    handleSaveAlertSchedule({
                      ...alertConfig,
                      [rule.id]: e.target.checked
                    })
                  }
                  className="mt-0.5 w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-[#0d0f17] border-[#293046]"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-gray-200 block">{rule.label}</span>
                  <span className="text-[11px] text-gray-500 block leading-tight">{rule.desc}</span>
                </div>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#1b1f30]">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Intervalo de cobrança para clientes em atraso
              </label>
              <select
                value={alertConfig.intervaloAtrasoDias || 2}
                onChange={e =>
                  handleSaveAlertSchedule({
                    ...alertConfig,
                    intervaloAtrasoDias: Number(e.target.value)
                  })
                }
                className="w-full bg-[#121522] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
              >
                <option value={1}>A cada 1 dia (Diariamente)</option>
                <option value={2}>A cada 2 dias (Recomendado)</option>
                <option value={3}>A cada 3 dias</option>
                <option value={5}>A cada 5 dias</option>
                <option value={7}>A cada 7 dias (Semanalmente)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Horário preferencial de disparo
              </label>
              <input
                type="time"
                value={alertConfig.horarioEnvio || '09:00'}
                onChange={e =>
                  handleSaveAlertSchedule({
                    ...alertConfig,
                    horarioEnvio: e.target.value
                  })
                }
                className="w-full bg-[#121522] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono-code"
              />
            </div>
          </div>
        </div>

        {/* Android Troubleshooting & Step-by-Step Guide */}
        <div className="bg-[#120f18] border border-amber-900/40 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
          <HelpCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs text-gray-300 leading-relaxed">
            <h4 className="font-bold text-amber-300">
              Como garantir que as notificações cheguem com o celular bloqueado ou app fechado:
            </h4>
            <ol className="list-decimal pl-4 space-y-1 text-gray-400 text-[11px]">
              <li>
                <strong>Permissão no Android:</strong> Toque no ícone de cadeado na barra de endereço do navegador no celular &gt; <em>Permissões</em> &gt; <em>Notificações</em> &gt; selecione <strong>Permitir</strong>.
              </li>
              <li>
                <strong>Instalar no Android (PWA):</strong> No menu do Chrome (três pontinhos), toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong> para melhor integração ao sistema.
              </li>
              <li>
                <strong>Economia de Bateria:</strong> No Android, vá em <em>Configurações do Celular &gt; Apps &gt; Chrome (ou Gerenciapró) &gt; Bateria</em> e defina como <strong>Sem restrições</strong>.
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* 4. Cor Primária & Contato (matching tela5.png) */}
      <div className="bg-[#0c0e15] border border-[#1b1f2e] rounded-2xl p-5 md:p-6 space-y-4">
        <h2 className="font-display text-base font-bold text-white tracking-wide">
          Cor Primária & Contato
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Cor primária
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer p-0"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                className="flex-1 bg-[#121522] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono-code"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              WhatsApp do proprietário
            </label>
            <input
              type="text"
              value={adminWhatsapp}
              onChange={e => setAdminWhatsapp(e.target.value)}
              placeholder="Ex: 83986302833"
              className="w-full bg-[#121522] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono-code"
            />
            <span className="text-[11px] text-gray-500 mt-1 block">
              Usado nos alertas de "Notificar proprietário".
            </span>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              URL de contato/destino
            </label>
            <input
              type="text"
              value={contatoUrl}
              onChange={e => setContatoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-[#121522] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono-code"
            />
          </div>
        </div>

        <button
          onClick={handleSaveContact}
          className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-[0_0_12px_#dc2626] transition-all"
        >
          Salvar Dados de Contato
        </button>
      </div>

      {/* 5. Gerenciar Servidores (matching tela5..png) */}
      <div className="bg-[#0c0e15] border border-[#1b1f2e] rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-950/80 rounded-xl border border-red-900/60 text-red-500">
              <Server size={18} />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white tracking-wide">
                Gerenciar Servidores
              </h2>
              <p className="text-xs text-gray-400">
                Adicione e remova servidores disponíveis no cadastro de clientes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('servidores')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/50 text-xs font-semibold transition-all self-start sm:self-auto"
          >
            <span>Abrir Aba Servidores</span>
            <ExternalLink size={12} />
          </button>
        </div>

        <form onSubmit={handleAddServer} className="flex gap-2.5 pt-2">
          <input
            type="text"
            value={newServerName}
            onChange={e => setNewServerName(e.target.value)}
            placeholder="Nome do servidor (ex: Servidor X)"
            className="flex-1 bg-[#121522] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-[0_0_12px_#dc2626]"
          >
            <Plus size={15} />
            <span>Adicionar</span>
          </button>
        </form>

        <div className="divide-y divide-[#181b28] pt-2">
          {servers.map(srv => {
            const clientCount = clients.filter(c => (c.servidor || '').toLowerCase() === srv.nome.toLowerCase()).length;
            return (
              <div key={srv.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-gray-200">{srv.nome}</span>
                  <span className="text-gray-500 ml-2">({clientCount} clientes vinculados)</span>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Remover servidor ${srv.nome}?`)) {
                      deleteServer(srv.id);
                    }
                  }}
                  className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-[#1c2030]"
                  title="Remover servidor"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Gestão de Planos & Links (matching tela5..png) */}
      <div className="bg-[#0c0e15] border border-[#1b1f2e] rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-red-950/80 rounded-xl border border-red-900/60 text-red-500">
            <CreditCard size={18} />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-white tracking-wide">
              Gestão de Planos
            </h2>
            <p className="text-xs text-gray-400">
              Configure os planos disponíveis. Links de pagamento e chaves Pix são gerenciados exclusivamente na aba <strong className="text-red-400">Cobranças</strong>.
            </p>
          </div>
        </div>

        <form onSubmit={handleAddPlan} className="flex gap-2.5 pt-2">
          <input
            type="text"
            value={newPlanName}
            onChange={e => setNewPlanName(e.target.value)}
            placeholder="Nome do novo plano (ex: Trimestral)"
            className="flex-1 bg-[#121522] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-[0_0_12px_#dc2626]"
          >
            <Plus size={15} />
            <span>Adicionar</span>
          </button>
        </form>

        <div className="space-y-3 pt-3">
          {plans.map(p => (
            <div
              key={p.id}
              className="bg-[#10131d] border border-[#1f2436] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold text-xs shadow-sm">
                  {p.nome}
                </span>
                <div className="text-xs text-gray-400">
                  <span>Duração: <strong className="text-white">{p.duracaoMeses} {p.duracaoMeses === 1 ? 'mês' : 'meses'}</strong></span>
                  <span className="mx-2">•</span>
                  <span>Valor padrão: <strong className="text-emerald-400">R$ {Number(p.valorPadrao).toFixed(2)}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-[11px] text-gray-500 italic hidden md:inline">
                  Links na aba Cobranças
                </span>
                <button
                  onClick={() => {
                    if (confirm(`Remover plano ${p.nome}?`)) deletePlan(p.id);
                  }}
                  className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-[#1a1e2e] transition-colors"
                  title="Remover plano"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
