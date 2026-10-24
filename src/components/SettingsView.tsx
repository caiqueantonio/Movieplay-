import React, { useState } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { soundEffects } from '../utils/audio';

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
    playSound
  } = useApp();

  const [appName, setAppName] = useState(settings.appName || 'Gerenciapró');
  const [newServerName, setNewServerName] = useState('');
  const [newPlanName, setNewPlanName] = useState('');
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor || '#dc2626');
  const [adminWhatsapp, setAdminWhatsapp] = useState(settings.adminWhatsapp || '');
  const [contatoUrl, setContatoUrl] = useState(settings.contatoUrl || '');
  const [devPassword, setDevPassword] = useState('');
  const [devUnlocked, setDevUnlocked] = useState(false);
  const [devError, setDevError] = useState(false);

  const [savedNotice, setSavedNotice] = useState<string | null>(null);

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

  const handleDevUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (devPassword === 'Senhacontrahacker1!') {
      setDevUnlocked(true);
      setDevError(false);
    } else {
      setDevError(true);
    }
  };

  const handleExportSingleHTML = () => {
    // Generate lightweight standalone snapshot
    const htmlSnapshot = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${settings.appName} — Snapshot</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#090a0f] text-gray-100 p-8">
  <h1 class="text-3xl font-bold text-red-500 mb-4">${settings.appName} — Exportação Monolítica</h1>
  <p class="text-gray-400 mb-6">Total de clientes exportados: ${clients.length}</p>
  <pre class="bg-[#111420] p-4 rounded-xl text-xs overflow-auto">${JSON.stringify(clients, null, 2)}</pre>
</body>
</html>`;
    const blob = new Blob([htmlSnapshot], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gerenciapro-snapshot-${Date.now()}.html`;
    a.click();
    playSound('sino');
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

      {/* 7. Área do Desenvolvedor — Visualizar Código & Exportar */}
      <div className="bg-[#0c0e15] border border-[#1b1f2e] rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#1b2030] rounded-xl border border-[#2b334d] text-gray-300">
            <Lock size={18} />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-white tracking-wide">
              Área do Desenvolvedor — Visualizar Código & Exportar
            </h2>
            <p className="text-xs text-gray-400">
              Acesso protegido para inspeção de código-fonte, banco de dados e exportação de snapshot monolítico.
            </p>
          </div>
        </div>

        {!devUnlocked ? (
          <form onSubmit={handleDevUnlock} className="space-y-3 pt-2 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                Senha de acesso ao código
              </label>
              <div className="flex gap-2.5">
                <input
                  type="password"
                  value={devPassword}
                  onChange={e => {
                    setDevPassword(e.target.value);
                    setDevError(false);
                  }}
                  placeholder="Digite a senha..."
                  className="flex-1 bg-[#121522] border border-[#23293c] focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono-code"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-[0_0_12px_#dc2626]"
                >
                  Acessar Código
                </button>
              </div>
            </div>

            {devError && (
              <p className="text-xs font-semibold text-red-500 flex items-center gap-1.5">
                <span>⛔ Senha incorreta. Acesso negado.</span>
              </p>
            )}
          </form>
        ) : (
          <div className="pt-2 space-y-4 animate-in fade-in">
            <div className="p-4 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-emerald-400 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Check size={16} />
                <span>Área do Desenvolvedor Desbloqueada com Senha Segura</span>
              </div>
              <button
                onClick={handleExportSingleHTML}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-[0_0_12px_#dc2626] shrink-0"
              >
                Baixar Snapshot HTML Único
              </button>
            </div>

            {/* Code and Database Viewer */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-300 block uppercase tracking-wider">
                Estrutura de Dados e Código Ativo (/data/db.json)
              </span>
              <pre className="bg-[#08090f] border border-[#1b1f2e] p-4 rounded-xl text-[11px] font-mono-code text-gray-300 max-h-64 overflow-y-auto overflow-x-auto leading-relaxed select-all">
                {JSON.stringify(
                  {
                    app: settings.appName,
                    versao: '2.5.0-premium',
                    totalClientes: clients.length,
                    servidores: servers.map(s => s.nome),
                    planos: plans.map(p => ({ nome: p.nome, valor: p.valorPadrao })),
                    amostraClientes: clients.slice(0, 3)
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
