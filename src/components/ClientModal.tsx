import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Tv,
  CreditCard,
  FileText,
  Copy,
  Check,
  Eye,
  EyeOff,
  RotateCcw,
  Send,
  Save,
  CheckCircle2,
  Calendar,
  Lock,
  Smartphone,
  Camera,
  Upload,
  Clipboard,
  Trash2,
  Bell,
  AlarmClock,
  Sparkles,
  ShieldAlert,
  Cake,
  Gift,
  Archive,
  ArchiveRestore,
  Clock
} from 'lucide-react';
import { Client, ClientStatus } from '../types';
import { useApp } from '../context/AppContext';
import { processClientAvatar, pasteImageFromClipboard } from '../utils/imageHelper';
import { downloadClientAlarmCalendarFile } from '../utils/notifications';
import { getClientBirthdayInfo } from '../utils/birthdays';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null; // null for new client
  mode: 'view' | 'edit' | 'create';
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  client,
  mode: initialMode
}) => {
  const {
    servers,
    plans,
    addClient,
    updateClient,
    renewClientPlan,
    sendWhatsAppReminder,
    copyClientField,
    copyClientFullCredentials,
    playSound
  } = useApp();

  const [mode, setMode] = useState<'view' | 'edit' | 'create'>(initialMode);
  const [activeTab, setActiveTab] = useState<'dados' | 'acesso' | 'financeiro' | 'obs'>('dados');
  const [showPassword, setShowPassword] = useState(false);
  const [showMacPassword, setShowMacPassword] = useState(false);
  const [localFeedback, setLocalFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Renewal quick modal inside
  const [showRenewBox, setShowRenewBox] = useState(false);
  const [renewMonths, setRenewMonths] = useState<number>(1);
  const [renewValue, setRenewValue] = useState<number>(20.00);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State with ALL 18 fields + fotoUrl + appPagoStatus
  const [formData, setFormData] = useState<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>({
    nome: '',
    email: '',
    whatsapp: '',
    celular: '',
    aparelho: 'Smart TV',
    mac: '',
    senhaMac: '',
    servidor: 'Cine Hub',
    aplicativo: 'XCIPTV',
    usuarioDisp: '',
    senhaDisp: '',
    appPago: false,
    appPagoStatus: 'pendente',
    validadeApp: '',
    plano: 'Mensal',
    vencimento: new Date().toLocaleDateString('pt-BR'),
    status: 'Em dia',
    valor: 20.00,
    observacoes: '',
    fotoUrl: '',
    dataNascimento: '',
    arquivado: false
  });

  useEffect(() => {
    setMode(initialMode);
    if (client) {
      setFormData({
        nome: client.nome || '',
        email: client.email || '',
        whatsapp: client.whatsapp || '',
        celular: client.celular || '',
        aparelho: client.aparelho || 'Smart TV',
        mac: client.mac || '',
        senhaMac: client.senhaMac || '',
        servidor: client.servidor || 'Cine Hub',
        aplicativo: client.aplicativo || 'XCIPTV',
        usuarioDisp: client.usuarioDisp || '',
        senhaDisp: client.senhaDisp || '',
        appPago: !!client.appPago,
        appPagoStatus: client.appPagoStatus || (client.appPago ? 'recebido' : 'pendente'),
        validadeApp: client.validadeApp || '',
        plano: client.plano || 'Mensal',
        vencimento: client.vencimento || '',
        status: client.status || 'Em dia',
        valor: Number(client.valor) || 20.00,
        observacoes: client.observacoes || '',
        fotoUrl: client.fotoUrl || '',
        dataNascimento: client.dataNascimento || '',
        arquivado: !!client.arquivado
      });
      setRenewValue(Number(client.valor) || 20.00);
    } else {
      setFormData({
        nome: '',
        email: '',
        whatsapp: '',
        celular: '',
        aparelho: 'Smart TV',
        mac: '',
        senhaMac: '',
        servidor: servers[0]?.nome || 'Cine Hub',
        aplicativo: 'XCIPTV',
        usuarioDisp: '',
        senhaDisp: '',
        appPago: false,
        appPagoStatus: 'pendente',
        validadeApp: '',
        plano: 'Mensal',
        vencimento: new Date().toLocaleDateString('pt-BR'),
        status: 'Em dia',
        valor: 20.00,
        observacoes: '',
        fotoUrl: '',
        dataNascimento: '',
        arquivado: false
      });
    }
  }, [client, initialMode, servers]);

  if (!isOpen) return null;

  const handleCopyField = (fieldName: string, val: string) => {
    copyClientField(fieldName, val);
    setLocalFeedback(`${fieldName} copiado!`);
    setTimeout(() => setLocalFeedback(null), 2000);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUri = await processClientAvatar(file);
      setFormData(prev => ({ ...prev, fotoUrl: dataUri }));
      playSound('sino');
      setLocalFeedback('Foto carregada!');
      setTimeout(() => setLocalFeedback(null), 2000);
    } catch {
      alert('Erro ao processar imagem. Selecione um arquivo válido (JPG ou PNG).');
    }
  };

  const handlePastePhoto = async () => {
    try {
      const dataUri = await pasteImageFromClipboard();
      if (dataUri) {
        setFormData(prev => ({ ...prev, fotoUrl: dataUri }));
        playSound('sino');
        setLocalFeedback('Imagem colada com sucesso!');
        setTimeout(() => setLocalFeedback(null), 2000);
      } else {
        alert('Nenhuma imagem encontrada na área de transferência.');
      }
    } catch {
      alert('Não foi possível ler a área de transferência neste navegador.');
    }
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, fotoUrl: '' }));
    setLocalFeedback('Foto removida!');
    setTimeout(() => setLocalFeedback(null), 2000);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.nome.trim()) {
      alert('O Nome do cliente é obrigatório.');
      return;
    }

    setIsSaving(true);
    try {
      if (mode === 'create') {
        await addClient(formData);
        setLocalFeedback('Cliente cadastrado com sucesso!');
      } else if (client) {
        await updateClient(client.id, formData);
        setLocalFeedback('Alterações salvas com sucesso!');
      }
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 350);
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
      alert('Erro ao salvar cliente. Tente novamente.');
      setIsSaving(false);
    }
  };

  const handleExecuteRenew = async () => {
    if (!client) return;
    let curDate = new Date();
    if (client.vencimento) {
      if (client.vencimento.includes('/')) {
        const [d, m, y] = client.vencimento.split('/');
        curDate = new Date(Number(y), Number(m) - 1, Number(d));
      } else {
        curDate = new Date(client.vencimento);
      }
    }
    curDate.setMonth(curDate.getMonth() + Number(renewMonths));
    const day = String(curDate.getDate()).padStart(2, '0');
    const month = String(curDate.getMonth() + 1).padStart(2, '0');
    const year = curDate.getFullYear();
    const newVenc = `${day}/${month}/${year}`;

    await renewClientPlan(client.id, newVenc, Number(renewValue), formData.plano, 'pix');
    setFormData(prev => ({ ...prev, vencimento: newVenc, status: 'Em dia' }));
    setShowRenewBox(false);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="tech-card border border-red-950/80 rounded-3xl max-w-3xl w-full my-auto shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-[#1b1f2e] bg-[#0c0e16]/90 flex items-center justify-between relative">
          <div className="flex items-center gap-3.5">
            {/* Avatar / Photo with glowing ring */}
            <div className="relative group">
              <div className="w-13 h-13 rounded-full bg-[#141724] border-2 border-red-600/70 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-[0_0_15px_rgba(220,38,38,0.4)]">
                {formData.fotoUrl ? (
                  <img
                    src={formData.fotoUrl}
                    alt={formData.nome}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : formData.nome ? (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-red-900 to-red-950 text-white font-display font-extrabold text-base flex items-center justify-center tracking-wider">
                    {formData.nome.substring(0, 2).toUpperCase()}
                  </div>
                ) : (
                  <User size={22} className="text-red-500" />
                )}
              </div>

              {/* Photo change overlay button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-semibold"
                title="Trocar foto"
              >
                <Camera size={14} />
              </button>
            </div>

            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
                <span>{mode === 'create' ? 'Cadastrar Novo Cliente' : formData.nome}</span>
                {client && (
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold tracking-wider uppercase ${
                    formData.status === 'Em dia'
                      ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                      : 'bg-red-950/80 text-red-400 border-red-800/60 shadow-[0_0_8px_rgba(220,38,38,0.3)]'
                  }`}>
                    {formData.status}
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                <span>{formData.servidor}</span>
                <span>•</span>
                <span>{formData.plano}</span>
                <span>•</span>
                <span className="font-mono-code">Venc: {formData.vencimento}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mode === 'view' ? (
              <button
                type="button"
                onClick={() => setMode('edit')}
                className="px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/50 text-xs font-semibold transition-all shadow-[0_0_8px_rgba(220,38,38,0.2)]"
              >
                Editar Ficha
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-[0_0_12px_rgba(220,38,38,0.5)] transition-all disabled:opacity-50"
              >
                <Save size={13} />
                <span>{isSaving ? 'Salvando...' : (mode === 'create' ? 'Cadastrar' : 'Salvar')}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1a1d2d] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Discreet Toast feedback */}
          {localFeedback && (
            <div className="absolute top-2 right-14 bg-red-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-[0_0_12px_#dc2626] animate-in fade-in slide-in-from-top-1">
              {localFeedback}
            </div>
          )}
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-[#1a1d2c] bg-[#090b11] px-6 gap-2 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('dados')}
            className={`py-3 px-3 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'dados'
                ? 'border-red-600 text-white shadow-[0_4px_12px_rgba(220,38,38,0.3)]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <User size={14} className={activeTab === 'dados' ? 'text-red-500' : ''} />
            <span>A. Dados Pessoais</span>
          </button>

          <button
            onClick={() => setActiveTab('acesso')}
            className={`py-3 px-3 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'acesso'
                ? 'border-red-600 text-white shadow-[0_4px_12px_rgba(220,38,38,0.3)]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Tv size={14} className={activeTab === 'acesso' ? 'text-red-500' : ''} />
            <span>B. Equipamento & Acesso</span>
          </button>

          <button
            onClick={() => setActiveTab('financeiro')}
            className={`py-3 px-3 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'financeiro'
                ? 'border-red-600 text-white shadow-[0_4px_12px_rgba(220,38,38,0.3)]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <CreditCard size={14} className={activeTab === 'financeiro' ? 'text-red-500' : ''} />
            <span>C. Plano & Financeiro</span>
          </button>

          <button
            onClick={() => setActiveTab('obs')}
            className={`py-3 px-3 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'obs'
                ? 'border-red-600 text-white shadow-[0_4px_12px_rgba(220,38,38,0.3)]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileText size={14} className={activeTab === 'obs' ? 'text-red-500' : ''} />
            <span>D. Observações</span>
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Section A: Dados Pessoais & Foto */}
          {activeTab === 'dados' && (
            <div className="space-y-5">
              {/* Photo Upload & Clipboard Bar */}
              <div className="bg-[#121522] border border-[#202538] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-full border-2 border-red-600/70 overflow-hidden flex items-center justify-center bg-[#171a26] shrink-0 shadow-[0_0_12px_rgba(220,38,38,0.3)]">
                    {formData.fotoUrl ? (
                      <img src={formData.fotoUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-display font-bold text-lg text-white">
                        {formData.nome ? formData.nome.substring(0, 2).toUpperCase() : 'CP'}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-white block">Foto Personalizada</span>
                    <span className="text-[11px] text-gray-400">
                      Foto circular salva de forma compacta e persistente.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1b2030] hover:bg-[#252c42] text-xs font-semibold text-gray-200 transition-colors border border-[#2b334a]"
                  >
                    <Upload size={13} className="text-red-500" />
                    <span>Escolher Arquivo</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePastePhoto}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1b2030] hover:bg-[#252c42] text-xs font-semibold text-gray-200 transition-colors border border-[#2b334a]"
                    title="Colar foto da área de transferência (Ctrl+V / Cmd+V)"
                  >
                    <Clipboard size={13} className="text-red-500" />
                    <span>Colar Imagem</span>
                  </button>

                  {formData.fotoUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="p-1.5 rounded-xl text-gray-500 hover:text-red-400 transition-colors"
                      title="Remover foto"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Personal Data Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    1. Nome Completo / Identificação *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      disabled={mode === 'view'}
                      value={formData.nome}
                      onChange={e => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Ex: Caique Antonio"
                      className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none disabled:opacity-80"
                    />
                    {formData.nome && (
                      <button
                        type="button"
                        onClick={() => handleCopyField('Nome', formData.nome)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400 transition-colors p-1"
                        title="Copiar Nome"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    2. E-mail
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      disabled={mode === 'view'}
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="cliente@email.com"
                      className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none disabled:opacity-80 font-mono-code"
                    />
                    {formData.email && (
                      <button
                        type="button"
                        onClick={() => handleCopyField('E-mail', formData.email)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400 transition-colors p-1"
                        title="Copiar E-mail"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    3. WhatsApp
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled={mode === 'view'}
                      value={formData.whatsapp}
                      onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                      placeholder="83988887777"
                      className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl pl-3.5 pr-16 py-2.5 text-xs text-white outline-none disabled:opacity-80 font-mono-code"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {formData.whatsapp && (
                        <button
                          type="button"
                          onClick={() => handleCopyField('WhatsApp', formData.whatsapp)}
                          className="text-gray-500 hover:text-red-400 transition-colors p-1"
                          title="Copiar WhatsApp"
                        >
                          <Copy size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    4. Celular / Telefone Adicional
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled={mode === 'view'}
                      value={formData.celular}
                      onChange={e => setFormData({ ...formData, celular: e.target.value })}
                      placeholder="83988887777"
                      className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none disabled:opacity-80 font-mono-code"
                    />
                    {formData.celular && (
                      <button
                        type="button"
                        onClick={() => handleCopyField('Celular', formData.celular)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400 transition-colors p-1"
                        title="Copiar Celular"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Data de Nascimento com alerta de Aniversário */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                      <Cake size={13} className="text-pink-400" />
                      <span>Data de Nascimento</span>
                    </label>
                    {(() => {
                      const bdayInfo = getClientBirthdayInfo(formData.dataNascimento);
                      if (!bdayInfo) return null;
                      return (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          bdayInfo.isToday
                            ? 'bg-pink-950/90 text-pink-300 border border-pink-700/60 shadow-[0_0_10px_rgba(244,114,182,0.4)] animate-pulse'
                            : bdayInfo.isThisWeek
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-700/50'
                            : 'bg-[#1a1e2e] text-gray-400'
                        }`}>
                          {bdayInfo.isToday ? '🎉 Aniversário Hoje!' : `🎂 em ${bdayInfo.daysUntil}d (${bdayInfo.dataTexto})`}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      disabled={mode === 'view'}
                      value={formData.dataNascimento ? (formData.dataNascimento.includes('/') ? formData.dataNascimento.split('/').reverse().join('-') : formData.dataNascimento) : ''}
                      onChange={e => setFormData({ ...formData, dataNascimento: e.target.value })}
                      className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none disabled:opacity-80 font-mono-code"
                    />
                    {formData.dataNascimento && (
                      <button
                        type="button"
                        onClick={() => handleCopyField('Data de Nascimento', formData.dataNascimento || '')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400 transition-colors p-1"
                        title="Copiar Data de Nascimento"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Pasta de Arquivamento (Inativo) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                    <Archive size={13} className="text-amber-400" />
                    <span>Organização da Pasta</span>
                  </label>
                  <div className="flex items-center gap-2.5 bg-[#131622] border border-[#23293c] rounded-xl px-3.5 py-2.5">
                    <input
                      type="checkbox"
                      id="arquivado-checkbox"
                      disabled={mode === 'view'}
                      checked={!!formData.arquivado}
                      onChange={e => setFormData({ ...formData, arquivado: e.target.checked })}
                      className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                    />
                    <label htmlFor="arquivado-checkbox" className="text-xs text-gray-300 cursor-pointer select-none">
                      Arquivar cliente (mover para subpasta de Inativos)
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    5. Aparelho
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled={mode === 'view'}
                      value={formData.aparelho}
                      onChange={e => setFormData({ ...formData, aparelho: e.target.value })}
                      placeholder="Ex: Smart TV Samsung, TV Box, Fire Stick"
                      className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none disabled:opacity-80"
                    />
                    {formData.aparelho && (
                      <button
                        type="button"
                        onClick={() => handleCopyField('Aparelho', formData.aparelho)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400 transition-colors p-1"
                        title="Copiar Aparelho"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section B: Equipamento & Acesso com cópia individual */}
          {activeTab === 'acesso' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  6. Endereço MAC
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={mode === 'view'}
                    value={formData.mac}
                    onChange={e => setFormData({ ...formData, mac: e.target.value })}
                    placeholder="00:1a:79:xx:xx:xx"
                    className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white outline-none disabled:opacity-80 font-mono-code"
                  />
                  {formData.mac && (
                    <button
                      type="button"
                      onClick={() => handleCopyField('Endereço MAC', formData.mac)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400 p-1"
                      title="Copiar Endereço MAC"
                    >
                      <Copy size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  7. Senha MAC / Key
                </label>
                <div className="relative">
                  <input
                    type={showMacPassword ? 'text' : 'password'}
                    disabled={mode === 'view'}
                    value={formData.senhaMac}
                    onChange={e => setFormData({ ...formData, senhaMac: e.target.value })}
                    placeholder="123456"
                    className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl pl-3.5 pr-16 py-2.5 text-xs text-white outline-none disabled:opacity-80 font-mono-code"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-gray-500">
                    <button
                      type="button"
                      onClick={() => setShowMacPassword(!showMacPassword)}
                      className="hover:text-white p-1"
                      title={showMacPassword ? 'Ocultar' : 'Mostrar'}
                    >
                      {showMacPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    {formData.senhaMac && (
                      <button
                        type="button"
                        onClick={() => handleCopyField('Senha MAC', formData.senhaMac)}
                        className="hover:text-red-400 p-1"
                        title="Copiar Senha MAC"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  8. Servidor
                </label>
                <div className="relative">
                  <select
                    disabled={mode === 'view'}
                    value={formData.servidor}
                    onChange={e => setFormData({ ...formData, servidor: e.target.value })}
                    className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white outline-none disabled:opacity-80"
                  >
                    {servers.map(s => (
                      <option key={s.id} value={s.nome}>{s.nome}</option>
                    ))}
                    {!servers.some(s => s.nome === formData.servidor) && formData.servidor && (
                      <option value={formData.servidor}>{formData.servidor}</option>
                    )}
                  </select>
                  {formData.servidor && (
                    <button
                      type="button"
                      onClick={() => handleCopyField('Servidor', formData.servidor)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400 p-1"
                      title="Copiar Servidor"
                    >
                      <Copy size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  9. Aplicativo
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={mode === 'view'}
                    value={formData.aplicativo}
                    onChange={e => setFormData({ ...formData, aplicativo: e.target.value })}
                    placeholder="XCIPTV, IBO PRÓ, Smart player Lite"
                    className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white outline-none disabled:opacity-80"
                  />
                  {formData.aplicativo && (
                    <button
                      type="button"
                      onClick={() => handleCopyField('Aplicativo', formData.aplicativo)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400 p-1"
                      title="Copiar Aplicativo"
                    >
                      <Copy size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  10. Usuário Disp. (Login)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={mode === 'view'}
                    value={formData.usuarioDisp}
                    onChange={e => setFormData({ ...formData, usuarioDisp: e.target.value })}
                    placeholder="usuario123"
                    className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white outline-none disabled:opacity-80 font-mono-code font-bold"
                  />
                  {formData.usuarioDisp && (
                    <button
                      type="button"
                      onClick={() => handleCopyField('Usuário', formData.usuarioDisp)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400 p-1"
                      title="Copiar Usuário"
                    >
                      <Copy size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  11. Senha Disp.
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    disabled={mode === 'view'}
                    value={formData.senhaDisp}
                    onChange={e => setFormData({ ...formData, senhaDisp: e.target.value })}
                    placeholder="pass123"
                    className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl pl-3.5 pr-16 py-2.5 text-xs text-white outline-none disabled:opacity-80 font-mono-code"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-gray-500">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="hover:text-white p-1"
                      title={showPassword ? 'Ocultar' : 'Mostrar'}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    {formData.senhaDisp && (
                      <button
                        type="button"
                        onClick={() => handleCopyField('Senha', formData.senhaDisp)}
                        className="hover:text-red-400 p-1"
                        title="Copiar Senha"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 12. Aplicativo Pago com Pergunta e Botões de Confirmação */}
              <div className="md:col-span-2 bg-[#0d0f18] border border-[#1e2336] rounded-2xl p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      disabled={mode === 'view'}
                      checked={formData.appPago}
                      onChange={e => {
                        const checked = e.target.checked;
                        setFormData({
                          ...formData,
                          appPago: checked,
                          appPagoStatus: checked ? (formData.appPagoStatus || 'pendente') : undefined
                        });
                      }}
                      className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                    />
                    <span className="text-xs sm:text-sm font-semibold text-white">
                      12. O cliente utiliza aplicativo pago?
                    </span>
                  </label>
                  {formData.appPago && (
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      formData.appPagoStatus === 'recebido'
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/60 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                        : 'bg-amber-950/80 text-amber-300 border-amber-700/60 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                    }`}>
                      {formData.appPagoStatus === 'recebido' ? '✓ Pagamento Recebido' : '⏳ Pagamento Pendente'}
                    </span>
                  )}
                </div>

                {formData.appPago && (
                  <div className="pt-2 border-t border-[#1a1f30] space-y-2 animate-in fade-in duration-200">
                    <div className="text-[11px] text-gray-300 font-medium flex items-center gap-1.5">
                      <span>Status do pagamento do aplicativo:</span>
                      <span className="text-gray-500">(clique para definir)</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        disabled={mode === 'view'}
                        onClick={() => setFormData({ ...formData, appPagoStatus: 'recebido' })}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                          formData.appPagoStatus === 'recebido'
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                            : 'bg-[#141826] text-gray-400 border-[#22283d] hover:text-white hover:border-emerald-600/40'
                        }`}
                      >
                        <CheckCircle2 size={14} className={formData.appPagoStatus === 'recebido' ? 'text-white' : 'text-emerald-500'} />
                        <span>Recebi o pagamento</span>
                      </button>

                      <button
                        type="button"
                        disabled={mode === 'view'}
                        onClick={() => setFormData({ ...formData, appPagoStatus: 'pendente' })}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                          formData.appPagoStatus === 'pendente'
                            ? 'bg-amber-600 text-white border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                            : 'bg-[#141826] text-gray-400 border-[#22283d] hover:text-white hover:border-amber-600/40'
                        }`}
                      >
                        <Clock size={14} className={formData.appPagoStatus === 'pendente' ? 'text-white' : 'text-amber-400'} />
                        <span>Ainda está pendente</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  13. Validade do Aplicativo
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={mode === 'view'}
                    value={formData.validadeApp}
                    onChange={e => setFormData({ ...formData, validadeApp: e.target.value })}
                    placeholder="DD/MM/AAAA"
                    className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none disabled:opacity-80 font-mono-code"
                  />
                  {formData.validadeApp && (
                    <button
                      type="button"
                      onClick={() => handleCopyField('Validade App', formData.validadeApp)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400 p-1"
                      title="Copiar Validade"
                    >
                      <Copy size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section C: Plano & Financeiro */}
          {activeTab === 'financeiro' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    14. Plano Contratado
                  </label>
                  <select
                    disabled={mode === 'view'}
                    value={formData.plano}
                    onChange={e => {
                      const selectedPlan = plans.find(p => p.nome === e.target.value);
                      setFormData({
                        ...formData,
                        plano: e.target.value,
                        valor: selectedPlan ? selectedPlan.valorPadrao : formData.valor
                      });
                    }}
                    className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none disabled:opacity-80"
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.nome}>{p.nome}</option>
                    ))}
                    {!plans.some(p => p.nome === formData.plano) && formData.plano && (
                      <option value={formData.plano}>{formData.plano}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    15. Data de Vencimento
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled={mode === 'view'}
                      value={formData.vencimento}
                      onChange={e => setFormData({ ...formData, vencimento: e.target.value })}
                      placeholder="DD/MM/AAAA"
                      className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white outline-none disabled:opacity-80 font-mono-code font-bold"
                    />
                    {formData.vencimento && (
                      <button
                        type="button"
                        onClick={() => handleCopyField('Vencimento', formData.vencimento)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400 p-1"
                        title="Copiar Vencimento"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    16. Situação / Status
                  </label>
                  <select
                    disabled={mode === 'view'}
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as ClientStatus })}
                    className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none disabled:opacity-80"
                  >
                    <option value="Em dia">Em dia</option>
                    <option value="Em atraso">Em atraso</option>
                    <option value="Vencendo (7d)">Vencendo (7d)</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Suspenso">Suspenso</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    17. Valor do Plano (R$)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      disabled={mode === 'view'}
                      value={formData.valor}
                      onChange={e => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
                      placeholder="20.00"
                      className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white outline-none disabled:opacity-80 font-mono-code font-bold"
                    />
                    {formData.valor && (
                      <button
                        type="button"
                        onClick={() => handleCopyField('Valor', `R$ ${Number(formData.valor).toFixed(2)}`)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400 p-1"
                        title="Copiar Valor"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Renewal Section Box */}
              {client && (
                <div className="bg-[#141018] border border-red-950/80 rounded-2xl p-4 space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RotateCcw size={16} className="text-red-500" />
                      <span className="font-semibold text-xs text-white">Renovação de Acesso</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowRenewBox(!showRenewBox)}
                      className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(220,38,38,0.4)]"
                    >
                      {showRenewBox ? 'Fechar Renovação' : '+ Renovar Plano Agora'}
                    </button>
                  </div>

                  {showRenewBox && (
                    <div className="pt-3 border-t border-[#23171e] grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in">
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">Duração a adicionar</label>
                        <select
                          value={renewMonths}
                          onChange={e => {
                            const m = Number(e.target.value);
                            setRenewMonths(m);
                            setRenewValue(m === 1 ? 20 : m === 3 ? 55 : m === 6 ? 100 : 160);
                          }}
                          className="w-full bg-[#0d0f17] border border-[#2a2f42] rounded-lg p-2 text-xs text-white"
                        >
                          <option value={1}>+ 1 Mês (Mensal)</option>
                          <option value={3}>+ 3 Meses (Trimestral)</option>
                          <option value={6}>+ 6 Meses (Semestral)</option>
                          <option value={12}>+ 12 Meses (Anual)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">Valor do Pagamento</label>
                        <input
                          type="number"
                          step="0.01"
                          value={renewValue}
                          onChange={e => setRenewValue(parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#0d0f17] border border-[#2a2f42] rounded-lg p-2 text-xs text-white font-mono-code font-bold"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={handleExecuteRenew}
                          className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.4)] transition-all"
                        >
                          <CheckCircle2 size={14} />
                          <span>Confirmar Renovação</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Section D: Observações */}
          {activeTab === 'obs' && (
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                18. Observações Gerais
              </label>
              <textarea
                rows={5}
                disabled={mode === 'view'}
                value={formData.observacoes}
                onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Insira detalhes sobre o cliente, ponto adicional, preferências, observações técnicas..."
                className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl p-3.5 text-xs text-white outline-none disabled:opacity-80 resize-none leading-relaxed"
              />
            </div>
          )}

          {/* Quick Universal Actions Bar */}
          {client && (
            <div className="bg-[#0b0e17] border border-[#1d2235] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Copiar Ficha Completa */}
                <button
                  type="button"
                  onClick={() => copyClientFullCredentials(client)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#151a2a] hover:bg-[#1e2438] text-gray-200 text-xs font-semibold border border-[#262f48] transition-all"
                  title="Copiar todos os dados de acesso formatados"
                >
                  <Copy size={13} className="text-red-500" />
                  <span>Copiar Ficha Completa</span>
                </button>

                {/* Adicionar Alarme no Celular */}
                <button
                  type="button"
                  onClick={() => downloadClientAlarmCalendarFile(client)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#151a2a] hover:bg-[#1e2438] text-gray-200 text-xs font-semibold border border-[#262f48] transition-all"
                  title="Baixar alarme e lembrete para o calendário do celular (.ics)"
                >
                  <AlarmClock size={13} className="text-amber-400" />
                  <span>Alarme no Celular (.ics)</span>
                </button>
              </div>

              {/* Cobrar via WhatsApp */}
              <button
                type="button"
                onClick={() => sendWhatsAppReminder(client)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all ml-auto"
                title="Abrir WhatsApp com mensagem de cobrança personalizada"
              >
                <Send size={13} />
                <span>Cobrar no WhatsApp</span>
              </button>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#1b1f2e] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#171b29] hover:bg-[#202538] text-gray-300 text-xs font-semibold transition-colors"
            >
              {mode === 'view' ? 'Fechar' : 'Cancelar'}
            </button>

            {mode === 'view' ? (
              <button
                type="button"
                onClick={() => setMode('edit')}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-500/60 text-xs font-bold transition-all shadow-[0_0_12px_rgba(220,38,38,0.25)]"
              >
                <span>Editar Ficha</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-[0_0_18px_rgba(220,38,38,0.5)] transition-all disabled:opacity-50"
              >
                <Save size={15} />
                <span>{isSaving ? 'Salvando...' : (mode === 'create' ? 'Cadastrar Cliente' : 'Salvar Alterações')}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
