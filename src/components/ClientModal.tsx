import React, { useState, useEffect } from 'react';
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
  Smartphone
} from 'lucide-react';
import { Client, ClientStatus } from '../types';
import { useApp } from '../context/AppContext';

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
    playSound
  } = useApp();

  const [mode, setMode] = useState<'view' | 'edit' | 'create'>(initialMode);
  const [activeTab, setActiveTab] = useState<'dados' | 'acesso' | 'financeiro' | 'obs'>('dados');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showMacPassword, setShowMacPassword] = useState(false);

  // Renewal quick modal inside
  const [showRenewBox, setShowRenewBox] = useState(false);
  const [renewMonths, setRenewMonths] = useState<number>(1);
  const [renewValue, setRenewValue] = useState<number>(20.00);

  // Form State with ALL 18 fields
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
    validadeApp: '',
    plano: 'Mensal',
    vencimento: new Date().toLocaleDateString('pt-BR'),
    status: 'Em dia',
    valor: 20.00,
    observacoes: ''
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
        validadeApp: client.validadeApp || '',
        plano: client.plano || 'Mensal',
        vencimento: client.vencimento || '',
        status: client.status || 'Em dia',
        valor: Number(client.valor) || 20.00,
        observacoes: client.observacoes || ''
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
        validadeApp: '',
        plano: 'Mensal',
        vencimento: new Date().toLocaleDateString('pt-BR'),
        status: 'Em dia',
        valor: 20.00,
        observacoes: ''
      });
    }
  }, [client, initialMode, servers]);

  if (!isOpen) return null;

  const copyText = (val: string, key: string) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    playSound('beep');
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      alert('O Nome do cliente é obrigatório.');
      return;
    }

    if (mode === 'create') {
      await addClient(formData);
    } else if (client) {
      await updateClient(client.id, formData);
    }
    onClose();
  };

  const handleExecuteRenew = async () => {
    if (!client) return;
    // Calculate new date
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
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#0e1017] border border-[#212638] rounded-3xl max-w-3xl w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1b1f2e] bg-[#121520] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-950/70 border border-red-800/40 text-red-500 flex items-center justify-center font-bold">
              {formData.nome ? formData.nome.substring(0, 2).toUpperCase() : 'CP'}
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <span>{mode === 'create' ? 'Cadastrar Novo Cliente' : formData.nome}</span>
                {client && (
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-semibold ${
                    formData.status === 'Em dia'
                      ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/40'
                      : 'bg-red-950/80 text-red-400 border-red-800/40'
                  }`}>
                    {formData.status}
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-400">
                {mode === 'create' ? 'Preencha os dados e credenciais do cliente' : `Ficha cadastral completa com 18 colunas`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mode === 'view' && (
              <button
                onClick={() => setMode('edit')}
                className="px-3 py-1.5 rounded-xl bg-[#1b2030] hover:bg-[#252c42] text-xs font-semibold text-gray-200 transition-colors"
              >
                Editar
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1a1d2d] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-[#1a1d2c] bg-[#0c0e15] px-6 gap-2 overflow-x-auto text-xs font-semibold">
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
          {/* Section A: Dados Pessoais */}
          {activeTab === 'dados' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  1. Nome Completo / Identificação *
                </label>
                <input
                  type="text"
                  required
                  disabled={mode === 'view'}
                  value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Caique Antonio"
                  className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none disabled:opacity-70"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  2. E-mail
                </label>
                <input
                  type="email"
                  disabled={mode === 'view'}
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="cliente@email.com"
                  className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none disabled:opacity-70"
                />
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
                    className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl pl-3.5 pr-9 py-2.5 text-xs text-white outline-none disabled:opacity-70 font-mono-code"
                  />
                  {formData.whatsapp && (
                    <button
                      type="button"
                      onClick={() => copyText(formData.whatsapp, 'zap')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                      title="Copiar WhatsApp"
                    >
                      {copiedKey === 'zap' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  4. Celular / Telefone Adicional
                </label>
                <input
                  type="text"
                  disabled={mode === 'view'}
                  value={formData.celular}
                  onChange={e => setFormData({ ...formData, celular: e.target.value })}
                  placeholder="83988887777"
                  className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none disabled:opacity-70 font-mono-code"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  5. Aparelho
                </label>
                <input
                  type="text"
                  disabled={mode === 'view'}
                  value={formData.aparelho}
                  onChange={e => setFormData({ ...formData, aparelho: e.target.value })}
                  placeholder="Ex: Smart TV Samsung, TV Box, Fire Stick"
                  className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none disabled:opacity-70"
                />
              </div>
            </div>
          )}

          {/* Section B: Equipamento & Acesso */}
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
                    className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl pl-3.5 pr-9 py-2.5 text-xs text-white outline-none disabled:opacity-70 font-mono-code"
                  />
                  {formData.mac && (
                    <button
                      type="button"
                      onClick={() => copyText(formData.mac, 'mac')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                      title="Copiar MAC"
                    >
                      {copiedKey === 'mac' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
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
                    className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl pl-3.5 pr-16 py-2.5 text-xs text-white outline-none disabled:opacity-70 font-mono-code"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-gray-500">
                    <button
                      type="button"
                      onClick={() => setShowMacPassword(!showMacPassword)}
                      className="hover:text-white"
                      title={showMacPassword ? 'Ocultar' : 'Mostrar'}
                    >
                      {showMacPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    {formData.senhaMac && (
                      <button
                        type="button"
                        onClick={() => copyText(formData.senhaMac, 'macPass')}
                        className="hover:text-white"
                        title="Copiar"
                      >
                        {copiedKey === 'macPass' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  8. Servidor
                </label>
                <select
                  disabled={mode === 'view'}
                  value={formData.servidor}
                  onChange={e => setFormData({ ...formData, servidor: e.target.value })}
                  className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none disabled:opacity-70"
                >
                  {servers.map(s => (
                    <option key={s.id} value={s.nome}>{s.nome}</option>
                  ))}
                  {!servers.some(s => s.nome === formData.servidor) && formData.servidor && (
                    <option value={formData.servidor}>{formData.servidor}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  9. Aplicativo
                </label>
                <input
                  type="text"
                  disabled={mode === 'view'}
                  value={formData.aplicativo}
                  onChange={e => setFormData({ ...formData, aplicativo: e.target.value })}
                  placeholder="XCIPTV, IBO PRÓ, Smart player Lite"
                  className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none disabled:opacity-70"
                />
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
                    className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl pl-3.5 pr-9 py-2.5 text-xs text-white outline-none disabled:opacity-70 font-mono-code"
                  />
                  {formData.usuarioDisp && (
                    <button
                      type="button"
                      onClick={() => copyText(formData.usuarioDisp, 'userDisp')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                      title="Copiar Usuário"
                    >
                      {copiedKey === 'userDisp' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
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
                    className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl pl-3.5 pr-16 py-2.5 text-xs text-white outline-none disabled:opacity-70 font-mono-code"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-gray-500">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="hover:text-white"
                      title={showPassword ? 'Ocultar' : 'Mostrar'}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    {formData.senhaDisp && (
                      <button
                        type="button"
                        onClick={() => copyText(formData.senhaDisp, 'passDisp')}
                        className="hover:text-white"
                        title="Copiar"
                      >
                        {copiedKey === 'passDisp' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  12. Aplicativo Pago?
                </label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-200">
                    <input
                      type="checkbox"
                      disabled={mode === 'view'}
                      checked={formData.appPago}
                      onChange={e => setFormData({ ...formData, appPago: e.target.checked })}
                      className="w-4 h-4 accent-red-600 rounded"
                    />
                    <span>Sim, licença paga</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  13. Validade do Aplicativo
                </label>
                <input
                  type="text"
                  disabled={mode === 'view'}
                  value={formData.validadeApp}
                  onChange={e => setFormData({ ...formData, validadeApp: e.target.value })}
                  placeholder="DD/MM/AAAA"
                  className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none disabled:opacity-70 font-mono-code"
                />
              </div>
            </div>
          )}

          {/* Section C: Plano & Financeiro */}
          {activeTab === 'financeiro' && (
            <div className="space-y-4">
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
                    className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none disabled:opacity-70"
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
                  <input
                    type="text"
                    disabled={mode === 'view'}
                    value={formData.vencimento}
                    onChange={e => setFormData({ ...formData, vencimento: e.target.value })}
                    placeholder="DD/MM/AAAA"
                    className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none disabled:opacity-70 font-mono-code"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    16. Situação / Status
                  </label>
                  <select
                    disabled={mode === 'view'}
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as ClientStatus })}
                    className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none disabled:opacity-70"
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
                  <input
                    type="number"
                    step="0.01"
                    disabled={mode === 'view'}
                    value={formData.valor}
                    onChange={e => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
                    placeholder="20.00"
                    className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none disabled:opacity-70 font-mono-code font-bold"
                  />
                </div>
              </div>

              {/* Renewal Section Box */}
              {client && (
                <div className="bg-[#141018] border border-red-950/70 rounded-2xl p-4 space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RotateCcw size={16} className="text-red-500" />
                      <span className="font-semibold text-xs text-white">Renovação do Acesso</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowRenewBox(!showRenewBox)}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-[0_0_10px_rgba(220,38,38,0.4)]"
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
                          className="w-full bg-[#0d0f17] border border-[#2a2f42] rounded-lg p-2 text-xs text-white font-mono-code"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={handleExecuteRenew}
                          className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all"
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
                className="w-full bg-[#131622] border border-[#23293c] focus:border-red-600 rounded-xl p-3.5 text-xs text-white outline-none disabled:opacity-70 resize-none leading-relaxed"
              />
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#1b1f2e] flex flex-wrap items-center justify-between gap-3">
            {client ? (
              <button
                type="button"
                onClick={() => sendWhatsAppReminder(client)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/70 border border-emerald-800/40 text-emerald-400 hover:bg-emerald-900/60 text-xs font-semibold transition-all"
              >
                <Send size={13} />
                <span>Cobrança via WhatsApp</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#171b29] hover:bg-[#202538] text-gray-300 text-xs font-semibold transition-colors"
              >
                Fechar
              </button>

              {mode !== 'view' && (
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all"
                >
                  <Save size={14} />
                  <span>{mode === 'create' ? 'Cadastrar Cliente' : 'Salvar Alterações'}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
