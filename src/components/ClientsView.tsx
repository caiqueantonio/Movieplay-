import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Trash2,
  UploadCloud,
  Download,
  MessageCircle,
  Eye,
  Edit2,
  Key,
  Copy,
  Check,
  CheckSquare,
  Square,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Filter
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Client, ClientStatus } from '../types';
import { exportClientsToExcel, exportClientsToCSV } from '../utils/excel';

interface ClientsViewProps {
  onNewClient: () => void;
  onOpenClient: (client: Client) => void;
  onEditClient: (client: Client) => void;
  onRenewClient: (client: Client) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  onNewClient,
  onOpenClient,
  onEditClient,
  onRenewClient
}) => {
  const {
    clients,
    servers,
    plans,
    deleteClient,
    bulkDeleteClients,
    updateClient,
    sendWhatsAppReminder,
    setActiveTab,
    playSound
  } = useApp();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [localSearch, setLocalSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [planFilter, setPlanFilter] = useState<string>('todos');
  const [serverFilter, setServerFilter] = useState<string>('todos');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);

  // Bulk delete confirmation modal state
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      // Search text
      if (localSearch.trim()) {
        const query = localSearch.toLowerCase();
        const matchesName = (c.nome || '').toLowerCase().includes(query);
        const matchesPhone = (c.whatsapp || '').toLowerCase().includes(query) || (c.celular || '').toLowerCase().includes(query);
        const matchesMac = (c.mac || '').toLowerCase().includes(query);
        const matchesServer = (c.servidor || '').toLowerCase().includes(query);
        const matchesApp = (c.aplicativo || '').toLowerCase().includes(query);
        const matchesUser = (c.usuarioDisp || '').toLowerCase().includes(query);
        const matchesEmail = (c.email || '').toLowerCase().includes(query);
        if (!matchesName && !matchesPhone && !matchesMac && !matchesServer && !matchesApp && !matchesUser && !matchesEmail) {
          return false;
        }
      }

      // Status
      if (statusFilter !== 'todos' && c.status !== statusFilter) {
        return false;
      }

      // Plan
      if (planFilter !== 'todos' && !c.plano.toLowerCase().includes(planFilter.toLowerCase())) {
        return false;
      }

      // Server
      if (serverFilter !== 'todos' && c.servidor.toLowerCase() !== serverFilter.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [clients, localSearch, statusFilter, planFilter, serverFilter]);

  // Paginated clients
  const totalPages = Math.ceil(filteredClients.length / rowsPerPage) || 1;
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredClients.slice(start, start + rowsPerPage);
  }, [filteredClients, currentPage, rowsPerPage]);

  const handleSelectAll = () => {
    if (selectedIds.length === paginatedClients.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedClients.map(c => c.id));
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    playSound('beep');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const togglePasswordVisibility = (id: string) => {
    setRevealedPasswords(prev => ({ ...prev, [id]: !prev[id] }));
    playSound('beep');
  };

  const handleDeleteOne = async (client: Client) => {
    if (confirm(`Tem certeza que deseja excluir o cliente ${client.nome}?`)) {
      await deleteClient(client.id);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Tem certeza que deseja excluir os ${selectedIds.length} clientes selecionados?`)) {
      await bulkDeleteClients(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleClearAll = async () => {
    const allIds = clients.map(c => c.id);
    await bulkDeleteClients(allIds);
    setSelectedIds([]);
    setShowClearConfirm(false);
  };

  const handleExportAll = (format: 'xlsx' | 'csv') => {
    const targetList = selectedIds.length > 0 
      ? clients.filter(c => selectedIds.includes(c.id))
      : filteredClients;
    
    if (format === 'xlsx') {
      exportClientsToExcel(targetList, `clientes-gerenciapro-${Date.now()}.xlsx`);
    } else {
      exportClientsToCSV(targetList, `clientes-gerenciapro-${Date.now()}.csv`);
    }
    setShowExportMenu(false);
    playSound('sino');
  };

  const calculateDaysText = (dateStr: string) => {
    if (!dateStr) return '';
    let targetDate: Date;
    if (dateStr.includes('/')) {
      const [d, m, y] = dateStr.split('/');
      targetDate = new Date(Number(y), Number(m) - 1, Number(d));
    } else {
      targetDate = new Date(dateStr);
    }
    const now = new Date(2026, 9, 17);
    const diffDays = Math.floor((now.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) return `${diffDays}d atrasado`;
    if (diffDays === 0) return 'Vence hoje';
    return `em ${Math.abs(diffDays)}d`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header matching tela 1.png */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Clientes
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {filteredClients.length} cliente(s) encontrado(s) · {selectedIds.length} selecionado(s)
          </p>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Limpar Todos os Clientes */}
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-red-900/60 bg-[#160c10] text-red-400 hover:bg-red-950/60 hover:text-red-300 hover:border-red-600 text-xs font-semibold tracking-wide transition-all"
            title="Limpar todos os clientes cadastrados"
          >
            <Trash2 size={14} />
            <span>Limpar Todos os Clientes</span>
          </button>

          {/* Importar Planilha */}
          <button
            onClick={() => setActiveTab('importacao')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#23293d] bg-[#111420] text-gray-200 hover:text-white hover:border-[#353d5a] text-xs font-semibold tracking-wide transition-all"
            title="Importar planilha Excel ou CSV"
          >
            <UploadCloud size={14} className="text-red-500" />
            <span>Importar Planilha</span>
          </button>

          {/* Exportar Menu */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#23293d] bg-[#111420] text-gray-200 hover:text-white hover:border-[#353d5a] text-xs font-semibold tracking-wide transition-all"
              title="Exportar clientes"
            >
              <Download size={14} className="text-red-500" />
              <span>Exportar</span>
              <ChevronDown size={13} className="text-gray-500" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-[#0f1118] border border-[#222738] rounded-xl shadow-2xl p-1.5 z-40">
                <button
                  onClick={() => handleExportAll('xlsx')}
                  className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-[#1a1e2d] rounded-lg transition-colors flex items-center justify-between"
                >
                  <span>Exportar para Excel (.xlsx)</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1 rounded">XLSX</span>
                </button>
                <button
                  onClick={() => handleExportAll('csv')}
                  className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-[#1a1e2d] rounded-lg transition-colors flex items-center justify-between"
                >
                  <span>Exportar para CSV (.csv)</span>
                  <span className="text-[10px] bg-blue-950 text-blue-400 px-1 rounded">CSV</span>
                </button>
              </div>
            )}
          </div>

          {/* + Novo Cliente (Vibrant Red `#dc2626`) */}
          <button
            onClick={onNewClient}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:shadow-[0_0_20px_rgba(220,38,38,0.6)]"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar matching tela 1.png */}
      <div className="bg-[#0c0e15] border border-[#1b1f2e] rounded-2xl p-4 flex flex-col lg:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={17} />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar por nome, e-mail, whatsapp, servidor..."
            className="w-full bg-[#111420] border border-[#202538] focus:border-red-600/70 focus:ring-1 focus:ring-red-600/40 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-200 placeholder-gray-500 outline-none transition-all"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center flex-wrap gap-2.5 w-full lg:w-auto">
          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-[#111420] border border-[#202538] text-gray-300 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-red-600"
          >
            <option value="todos">Todos status</option>
            <option value="Em dia">Em dia</option>
            <option value="Em atraso">Em atraso</option>
            <option value="Vencendo (7d)">Vencendo (7d)</option>
            <option value="Pendente">Pendente</option>
            <option value="Suspenso">Suspenso</option>
          </select>

          {/* Plan Dropdown */}
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-[#111420] border border-[#202538] text-gray-300 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-red-600"
          >
            <option value="todos">Todos planos</option>
            {plans.map(p => (
              <option key={p.id} value={p.nome}>{p.nome}</option>
            ))}
          </select>

          {/* Server Dropdown */}
          <select
            value={serverFilter}
            onChange={(e) => {
              setServerFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-[#111420] border border-[#202538] text-gray-300 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-red-600"
          >
            <option value="todos">Todos servidores</option>
            {servers.map(s => (
              <option key={s.id} value={s.nome}>{s.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk action banner when items selected */}
      {selectedIds.length > 0 && (
        <div className="bg-[#1b1218] border border-red-900/60 rounded-xl px-4 py-2.5 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-semibold text-red-300">
            <CheckSquare size={16} className="text-red-500" />
            <span>{selectedIds.length} clientes selecionados</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800 text-xs font-medium transition-all"
            >
              <Trash2 size={13} /> Excluir selecionados
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-gray-400 hover:text-white px-2 py-1"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Main Table matching tela 1.png */}
      <div className="bg-[#0b0d13] border border-[#1b1f2e] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-[#1b1f2e] bg-[#0e1017] text-gray-400 font-semibold tracking-wider uppercase text-[11px]">
                <th className="py-3.5 px-4 w-10 text-center">
                  <button
                    onClick={handleSelectAll}
                    className="text-gray-400 hover:text-white"
                  >
                    {selectedIds.length === paginatedClients.length && paginatedClients.length > 0 ? (
                      <CheckSquare size={16} className="text-red-500" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-3 min-w-[160px]">Cliente</th>
                <th className="py-3.5 px-3 min-w-[130px]">Contato</th>
                <th className="py-3.5 px-3 min-w-[150px]">MAC / Senha</th>
                <th className="py-3.5 px-3 min-w-[100px]">Servidor</th>
                <th className="py-3.5 px-3 min-w-[130px]">App</th>
                <th className="py-3.5 px-3 text-center min-w-[90px]">App Pago</th>
                <th className="py-3.5 px-3 text-center min-w-[90px]">Plano</th>
                <th className="py-3.5 px-3 min-w-[90px]">Valor</th>
                <th className="py-3.5 px-3 min-w-[140px]">Vencimento</th>
                <th className="py-3.5 px-3 min-w-[110px]">Status</th>
                <th className="py-3.5 px-4 text-right min-w-[130px]">Ações</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-[#151824]">
              {paginatedClients.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-gray-500">
                    Nenhum cliente encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                paginatedClients.map(client => {
                  const isSelected = selectedIds.includes(client.id);
                  const isOverdue = client.status === 'Em atraso';
                  const isDueSoon = client.status === 'Vencendo (7d)';
                  const isPasswordRevealed = revealedPasswords[client.id];

                  return (
                    <tr
                      key={client.id}
                      className={`hover:bg-[#121522]/80 transition-colors ${
                        isSelected ? 'bg-[#181119]' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleSelectRow(client.id)}
                          className="text-gray-400 hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare size={15} className="text-red-500" />
                          ) : (
                            <Square size={15} />
                          )}
                        </button>
                      </td>

                      {/* Cliente */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#171a26] border border-[#23293c] text-white font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                            {client.nome.toLowerCase() === 'comercial' ? (
                              <img src="/logo.svg" alt="logo" className="w-6 h-6 object-contain" />
                            ) : (
                              client.nome.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <span
                            onClick={() => onOpenClient(client)}
                            className="font-bold text-gray-200 hover:text-red-400 cursor-pointer truncate max-w-[150px]"
                            title={client.nome}
                          >
                            {client.nome}
                          </span>
                        </div>
                      </td>

                      {/* Contato (WhatsApp) */}
                      <td className="py-3.5 px-3 font-mono-code text-gray-300">
                        {client.whatsapp || client.celular || '—'}
                      </td>

                      {/* MAC / Senha */}
                      <td className="py-3.5 px-3 font-mono-code">
                        {client.mac ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-gray-300">
                              <span>{client.mac}</span>
                              <button
                                onClick={() => copyToClipboard(client.mac, `mac-${client.id}`)}
                                className="text-gray-500 hover:text-gray-300"
                                title="Copiar MAC"
                              >
                                {copiedField === `mac-${client.id}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                              </button>
                            </div>
                            {client.senhaMac && (
                              <div className="flex items-center gap-1.5 text-[11px] text-amber-400/90">
                                <Key size={11} className="text-amber-500" />
                                <span>{isPasswordRevealed ? client.senhaMac : '••••••'}</span>
                                <button
                                  onClick={() => togglePasswordVisibility(client.id)}
                                  className="text-gray-500 hover:text-gray-300 text-[10px]"
                                  title={isPasswordRevealed ? 'Ocultar' : 'Revelar'}
                                >
                                  {isPasswordRevealed ? 'ocultar' : 'ver'}
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>

                      {/* Servidor */}
                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-1 rounded-md bg-[#161a28] text-gray-300 border border-[#23293c] text-[11px] font-semibold whitespace-nowrap">
                          {client.servidor || 'Cine Hub'}
                        </span>
                      </td>

                      {/* Aplicativo */}
                      <td className="py-3.5 px-3 text-gray-300 truncate max-w-[130px]" title={client.aplicativo}>
                        {client.aplicativo || '—'}
                      </td>

                      {/* App Pago */}
                      <td className="py-3.5 px-3 text-center">
                        {client.appPago ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 font-semibold text-[10px]">
                            Pago
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>

                      {/* Plano */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-md bg-[#181a24] text-gray-300 border border-[#272b3c] text-[11px] font-medium">
                          {client.plano || 'Mensal'}
                        </span>
                      </td>

                      {/* Valor */}
                      <td className="py-3.5 px-3 font-semibold text-gray-200 font-mono-code">
                        R$ {Number(client.valor || 20).toFixed(2)}
                      </td>

                      {/* Vencimento + Days diff badge */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-0.5">
                          <div className="font-mono-code text-gray-200">
                            {client.vencimento || '—'}
                          </div>
                          {client.vencimento && (
                            <div className={`text-[10px] font-semibold ${
                              isOverdue ? 'text-red-400' : isDueSoon ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {calculateDaysText(client.vencimento)}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          client.status === 'Em dia'
                            ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/50'
                            : client.status === 'Em atraso'
                            ? 'bg-red-950/70 text-red-400 border-red-800/50'
                            : client.status === 'Vencendo (7d)'
                            ? 'bg-amber-950/70 text-amber-400 border-amber-800/50'
                            : 'bg-gray-900 text-gray-400 border-gray-700'
                        }`}>
                          {client.status}
                        </span>
                      </td>

                      {/* Ações (Matching tela 1.png icons: WhatsApp, Eye, Pencil, Trash) */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* WhatsApp Billing Reminder */}
                          <button
                            onClick={() => sendWhatsAppReminder(client)}
                            className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/50 transition-colors"
                            title="Enviar cobrança via WhatsApp"
                          >
                            <MessageCircle size={15} />
                          </button>

                          {/* Quick View */}
                          <button
                            onClick={() => onOpenClient(client)}
                            className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-950/50 transition-colors"
                            title="Visualizar ficha completa"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Quick Edit */}
                          <button
                            onClick={() => onEditClient(client)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a1d2d] transition-colors"
                            title="Editar cadastro"
                          >
                            <Edit2 size={15} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteOne(client)}
                            className="p-1.5 rounded-lg text-red-500 hover:text-red-400 hover:bg-red-950/50 transition-colors"
                            title="Excluir cliente"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="border-t border-[#1b1f2e] bg-[#0e1017] px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <span>
              Mostrando {Math.min(filteredClients.length, (currentPage - 1) * rowsPerPage + 1)} a{' '}
              {Math.min(filteredClients.length, currentPage * rowsPerPage)} de {filteredClients.length} clientes
            </span>

            <div className="flex items-center gap-1.5">
              <span>Linhas por página:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-[#141724] border border-[#202538] text-gray-300 rounded-lg px-2 py-1 outline-none text-xs"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg bg-[#141724] border border-[#202538] text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Anterior
            </button>
            <span className="px-2 font-mono-code text-gray-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg bg-[#141724] border border-[#202538] text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Próximo
            </button>
          </div>
        </div>
      </div>

      {/* Clear All Modal Confirmation */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12141f] border border-red-900/60 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500">
              <div className="p-3 bg-red-950/80 rounded-xl border border-red-800">
                <AlertTriangle size={24} />
              </div>
              <h3 className="font-display text-lg font-bold text-white">
                Limpar Todos os Clientes?
              </h3>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Esta ação removerá todos os {clients.length} clientes da base de dados.
              Você poderá desfazer a alteração imediatamente através do botão <strong>Desfazer</strong> no cabeçalho ou restaurar um backup.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl bg-[#1c2030] text-gray-300 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-[0_0_12px_#dc2626]"
              >
                Sim, Limpar Todos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
