import React, { useState, useMemo, useRef } from 'react';
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
  Filter,
  Camera,
  ArrowUpDown,
  MoreVertical,
  AlarmClock,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  FileSpreadsheet,
  X,
  Upload,
  Clipboard,
  Folder,
  Archive,
  ArchiveRestore,
  Cake,
  Gift
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Client, ClientStatus } from '../types';
import { exportClientsToExcel, exportClientsToCSV, parseExcelBuffer, ImportResult, downloadSampleExcelTemplate } from '../utils/excel';
import { processClientAvatar } from '../utils/imageHelper';
import { downloadClientAlarmCalendarFile, getDaysDiffFromReference } from '../utils/notifications';
import { getClientBirthdayInfo } from '../utils/birthdays';

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
    updateClientPhoto,
    toggleClientStatus,
    archiveClient,
    unarchiveClient,
    archiveExpiredClients,
    bulkArchiveClients,
    importClientsBatch,
    sendWhatsAppReminder,
    copyClientField,
    copyClientFullCredentials,
    playSound
  } = useApp();

  const [clientFolder, setClientFolder] = useState<'ativos' | 'inativos'>('ativos');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [localSearch, setLocalSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [planFilter, setPlanFilter] = useState<string>('todos');
  const [serverFilter, setServerFilter] = useState<string>('todos');
  const [dueFilter, setDueFilter] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<'vencimento' | 'nome_asc' | 'nome_desc' | 'valor_desc' | 'recentes'>('vencimento');

  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);

  // Modals state inside Clientes
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);

  // Photo change state
  const [targetPhotoClientId, setTargetPhotoClientId] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Integrated Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importParsing, setImportParsing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'update' | 'replace'>('append');

  // Filter & Sort clients
  const filteredClients = useMemo(() => {
    const list = clients.filter(c => {
      // Search
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

      // Subpasta: Ativos vs Inativos/Arquivados
      if (clientFolder === 'ativos' && c.arquivado) return false;
      if (clientFolder === 'inativos' && !c.arquivado) return false;

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

      // Vencimento filter
      if (dueFilter !== 'todos') {
        const diff = getDaysDiffFromReference(c.vencimento);
        if (dueFilter === 'vencidos' && diff <= 0) return false;
        if (dueFilter === 'hoje' && diff !== 0) return false;
        if (dueFilter === '7d' && (diff > 0 || diff < -7)) return false;
        if (dueFilter === 'em_dia' && diff > 0) return false;
      }

      return true;
    });

    // Sorting
    return list.sort((a, b) => {
      if (sortBy === 'nome_asc') return a.nome.localeCompare(b.nome);
      if (sortBy === 'nome_desc') return b.nome.localeCompare(a.nome);
      if (sortBy === 'valor_desc') return (Number(b.valor) || 0) - (Number(a.valor) || 0);
      if (sortBy === 'recentes') return (b.createdAt || '').localeCompare(a.createdAt || '');
      // Vencimento (most overdue / urgent first)
      const diffA = getDaysDiffFromReference(a.vencimento);
      const diffB = getDaysDiffFromReference(b.vencimento);
      return diffB - diffA;
    });
  }, [clients, clientFolder, localSearch, statusFilter, planFilter, serverFilter, dueFilter, sortBy]);

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

  const handleBulkArchive = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Deseja mover os ${selectedIds.length} clientes selecionados para Cliente inativos?`)) {
      await bulkArchiveClients(selectedIds, true);
      setSelectedIds([]);
    }
  };

  const handleBulkUnarchive = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Deseja reativar os ${selectedIds.length} clientes selecionados e movê-los de volta para Clientes Ativos?`)) {
      await bulkArchiveClients(selectedIds, false);
      setSelectedIds([]);
    }
  };

  const handleClearAll = async () => {
    const allIds = clients.map(c => c.id);
    await bulkDeleteClients(allIds);
    setSelectedIds([]);
    setShowClearConfirm(false);
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
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
    const diffDays = getDaysDiffFromReference(dateStr);
    if (diffDays > 0) return `${diffDays}d atrasado`;
    if (diffDays === 0) return 'Vence hoje';
    return `em ${Math.abs(diffDays)}d`;
  };

  // Quick photo upload from table row
  const handleOpenPhotoPicker = (clientId: string) => {
    setTargetPhotoClientId(clientId);
    avatarInputRef.current?.click();
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetPhotoClientId) return;
    try {
      const dataUri = await processClientAvatar(file);
      await updateClientPhoto(targetPhotoClientId, dataUri);
      playSound('sino');
    } catch {
      alert('Erro ao carregar a foto do cliente.');
    } finally {
      setTargetPhotoClientId(null);
      e.target.value = '';
    }
  };

  // Integrated Import handlers
  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setImportFile(selected);
    setImportParsing(true);
    try {
      const buffer = await selected.arrayBuffer();
      const result = parseExcelBuffer(buffer, clients);
      setImportResult(result);
      playSound('sino');
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Erro ao ler o arquivo: ${error.message}`);
    } finally {
      setImportParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importResult) return;
    setImportParsing(true);
    try {
      const toImport = importResult.validRows
        .filter(r => !r.hasErrors)
        .map(r => r.parsed);

      await importClientsBatch(toImport, importMode);
      setShowImportModal(false);
      setImportFile(null);
      setImportResult(null);
      playSound('sino');
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Erro na importação: ${error.message}`);
    } finally {
      setImportParsing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hidden file input for fast row avatar replacement */}
      <input
        type="file"
        ref={avatarInputRef}
        accept="image/*"
        onChange={handlePhotoFileChange}
        className="hidden"
      />

      {/* Top Header & Central Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span>Clientes</span>
            <span className="text-xs font-mono-code font-bold px-2.5 py-1 rounded-full bg-red-950/80 border border-red-800 text-red-400 shadow-[0_0_10px_rgba(220,38,38,0.3)]">
              {filteredClients.length} cadastrados
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Gestão unificada: visualização, cadastro, edição, importação e exportação de clientes em um só lugar.
          </p>
        </div>

        {/* Centralized Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Limpar Todos os Clientes */}
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-950 bg-[#120a0e] text-red-400/90 hover:bg-red-950/60 hover:text-red-300 hover:border-red-600/70 text-xs font-semibold tracking-wide transition-all"
            title="Limpar todos os clientes cadastrados"
          >
            <Trash2 size={13} />
            <span className="hidden sm:inline">Limpar Base</span>
          </button>

          {/* Importar Planilha (Centralizado) */}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#23293d] bg-[#111420] text-gray-200 hover:text-white hover:border-red-600/60 text-xs font-semibold tracking-wide transition-all shadow-sm group"
            title="Importar planilha Excel ou CSV"
          >
            <UploadCloud size={15} className="text-red-500 group-hover:scale-110 transition-transform" />
            <span>Importar Planilha</span>
          </button>

          {/* Exportar Menu */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#23293d] bg-[#111420] text-gray-200 hover:text-white hover:border-red-600/60 text-xs font-semibold tracking-wide transition-all shadow-sm"
              title="Exportar clientes"
            >
              <Download size={15} className="text-red-500" />
              <span>Exportar</span>
              <ChevronDown size={13} className="text-gray-500" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-[#0c0e15] border border-red-950/80 rounded-2xl shadow-2xl p-2 z-40 animate-in fade-in slide-in-from-top-1">
                <button
                  onClick={() => handleExport('xlsx')}
                  className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:text-white hover:bg-red-950/50 rounded-xl transition-colors flex items-center justify-between"
                >
                  <span>Exportar Excel (.xlsx)</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded font-mono-code">XLSX</span>
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:text-white hover:bg-red-950/50 rounded-xl transition-colors flex items-center justify-between mt-1"
                >
                  <span>Exportar CSV (.csv)</span>
                  <span className="text-[10px] bg-blue-950 text-blue-400 px-1.5 py-0.5 rounded font-mono-code">CSV</span>
                </button>
              </div>
            )}
          </div>

          {/* + Novo Cliente */}
          <button
            onClick={onNewClient}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:shadow-[0_0_25px_rgba(220,38,38,0.7)] hover:scale-[1.02]"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* Subpastas: Clientes Ativos vs Inativos / Arquivados */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0c0e17] border border-[#1c2132] p-2.5 rounded-2xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setClientFolder('ativos'); setCurrentPage(1); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              clientFolder === 'ativos'
                ? 'bg-[#180e14] text-white border border-red-600/80 shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                : 'bg-transparent text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            <Folder size={14} className={clientFolder === 'ativos' ? 'text-red-500' : 'text-gray-500'} />
            <span>Clientes Ativos</span>
            <span className="text-[11px] bg-red-950/80 text-red-300 border border-red-800/60 px-2 py-0.5 rounded-full font-mono-code font-bold">
              {clients.filter(c => !c.arquivado).length}
            </span>
          </button>

          <button
            onClick={() => { setClientFolder('inativos'); setCurrentPage(1); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              clientFolder === 'inativos'
                ? 'bg-[#18130e] text-white border border-amber-600/80 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                : 'bg-transparent text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            <Archive size={14} className={clientFolder === 'inativos' ? 'text-amber-500' : 'text-gray-500'} />
            <span>Cliente inativos</span>
            <span className="text-[11px] bg-amber-950/80 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded-full font-mono-code font-bold">
              {clients.filter(c => !!c.arquivado).length}
            </span>
          </button>
        </div>

        {/* Botão Arquivar Expirados */}
        {clientFolder === 'ativos' && (
          <button
            onClick={async () => {
              if (confirm('Deseja arquivar todos os clientes com vencimento expirado que não renovaram? Eles serão movidos para a subpasta de Inativos.')) {
                await archiveExpiredClients();
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#14121a] hover:bg-[#1f1a28] border border-amber-900/60 hover:border-amber-600/80 text-amber-400 hover:text-amber-300 text-xs font-semibold transition-all self-end sm:self-auto"
            title="Arquivar clientes expirados em atraso ou suspensos"
          >
            <Archive size={14} />
            <span>Arquivar Expirados ({clients.filter(c => !c.arquivado && (c.status === 'Em atraso' || c.status === 'Suspenso' || c.status === 'Cancelado')).length})</span>
          </button>
        )}
      </div>

      {/* Filter, Search & Sorting Bar */}
      <div className="tech-card rounded-2xl p-4 flex flex-col lg:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar por nome, e-mail, whatsapp, servidor, MAC, app..."
            className="w-full bg-[#111420] border border-[#202538] focus:border-red-600/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-200 placeholder-gray-500 outline-none transition-all"
          />
        </div>

        {/* Filter & Sort Dropdowns */}
        <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto">
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

          {/* Vencimento Dropdown */}
          <select
            value={dueFilter}
            onChange={(e) => {
              setDueFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-[#111420] border border-[#202538] text-gray-300 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-red-600"
          >
            <option value="todos">Vencimento: Todos</option>
            <option value="vencidos">Vencidos / Atrasados</option>
            <option value="hoje">Vencem Hoje</option>
            <option value="7d">Próximos 7 dias</option>
            <option value="em_dia">Em dia</option>
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

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#111420] border border-[#202538] text-gray-300 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-red-600"
          >
            <option value="vencimento">Ordenar: Mais Urgentes</option>
            <option value="nome_asc">Nome (A-Z)</option>
            <option value="nome_desc">Nome (Z-A)</option>
            <option value="valor_desc">Maior Valor</option>
            <option value="recentes">Mais Recentes</option>
          </select>
        </div>
      </div>

      {/* Bulk action banner when items selected */}
      {selectedIds.length > 0 && (
        <div className="bg-[#180e15] border border-red-600/70 rounded-2xl px-5 py-3 flex items-center justify-between shadow-[0_0_20px_rgba(220,38,38,0.25)] animate-in fade-in">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-white">
            <CheckSquare size={17} className="text-red-500" />
            <span>{selectedIds.length} clientes selecionados</span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {clientFolder === 'ativos' ? (
              <button
                onClick={handleBulkArchive}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-950 hover:bg-amber-900 text-amber-200 border border-amber-750 text-xs font-bold transition-all shadow-[0_0_12px_rgba(245,158,11,0.3)] hover:scale-[1.02]"
                title="Mover clientes selecionados coletivamente para a pasta Cliente inativos"
              >
                <Archive size={13} className="text-amber-400" />
                <span>Mover para Cliente inativos ({selectedIds.length})</span>
              </button>
            ) : (
              <button
                onClick={handleBulkUnarchive}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border border-emerald-750 text-xs font-bold transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:scale-[1.02]"
                title="Reativar e mover clientes selecionados de volta para Clientes Ativos"
              >
                <ArchiveRestore size={13} className="text-emerald-400" />
                <span>Mover para Ativos ({selectedIds.length})</span>
              </button>
            )}

            <button
              onClick={() => handleExport('xlsx')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#221828] hover:bg-[#2e1e36] text-gray-200 text-xs font-medium border border-red-950 transition-all"
            >
              <Download size={13} className="text-red-400" /> Exportar selecionados
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-950 hover:bg-red-900 text-red-200 border border-red-800 text-xs font-bold transition-all shadow-[0_0_10px_rgba(220,38,38,0.3)]"
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

      {/* Main Table - Amplo, Responsivo e Sem Rolagem Excessiva */}
      <div className="tech-card rounded-3xl overflow-hidden shadow-2xl border border-[#1b1f2e]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs table-auto">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-[#1b1f2e] bg-[#0c0e16] text-gray-400 font-semibold tracking-wider uppercase text-[11px]">
                <th className="py-3 px-3 w-10 text-center">
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
                <th className="py-3 px-3 w-[26%] min-w-[210px]">Cliente & Contato</th>
                <th className="py-3 px-3 w-[26%] min-w-[210px]">Acesso & Servidor IPTV</th>
                <th className="py-3 px-3 w-[18%] min-w-[150px]">Plano & Vencimento</th>
                <th className="py-3 px-3 w-[12%] min-w-[100px] text-center">Status</th>
                <th className="py-3 px-3 w-[18%] min-w-[170px] text-right">Ações</th>
              </tr>
            </thead>

            {/* Table Body com Zebra Striping */}
            <tbody className="divide-y divide-[#151824]">
              {paginatedClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-gray-500">
                    Nenhum cliente encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                paginatedClients.map((client, index) => {
                  const isSelected = selectedIds.includes(client.id);
                  const isOverdue = client.status === 'Em atraso';
                  const isDueSoon = client.status === 'Vencendo (7d)';
                  const isPasswordRevealed = revealedPasswords[client.id];
                  const bdayInfo = getClientBirthdayInfo(client.dataNascimento);
                  const isEven = index % 2 === 0;
                  const zebraBg = isSelected
                    ? 'bg-red-950/40 border-l-4 border-l-red-500'
                    : isEven
                    ? 'bg-[#080911]'
                    : 'bg-[#10131f]';

                  return (
                    <tr
                      key={client.id}
                      className={`${zebraBg} hover:bg-[#181d2f] transition-colors border-b border-[#161a29]`}
                    >
                      {/* 1. Checkbox */}
                      <td className="py-3 px-3 text-center align-middle">
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

                      {/* 2. Cliente & Contato */}
                      <td className="py-3 px-3 align-middle">
                        <div className="flex items-center gap-3">
                          {/* Circular Avatar / Custom Photo */}
                          <div
                            onClick={() => handleOpenPhotoPicker(client.id)}
                            className="w-10 h-10 rounded-full bg-[#151824] border border-red-600/70 text-white font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden relative group cursor-pointer shadow-[0_0_10px_rgba(220,38,38,0.25)]"
                            title="Clique para alterar a foto do cliente"
                          >
                            {client.fotoUrl ? (
                              <img src={client.fotoUrl} alt={client.nome} className="w-full h-full object-cover" />
                            ) : client.nome.toLowerCase() === 'comercial' ? (
                              <img src="/logo.png" alt="logo" className="w-full h-full object-contain p-0.5" />
                            ) : (
                              <span className="font-display font-extrabold text-sm">{client.nome.substring(0, 2).toUpperCase()}</span>
                            )}
                            {/* Hover overlay to change photo */}
                            <div className="absolute inset-0 bg-black/75 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Camera size={13} className="text-white" />
                            </div>
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                onClick={() => onOpenClient(client)}
                                className="font-bold text-gray-100 hover:text-red-400 cursor-pointer truncate max-w-[150px] text-xs"
                                title={client.nome}
                              >
                                {client.nome}
                              </span>
                              <button
                                onClick={() => copyClientField('Nome', client.nome)}
                                className="text-gray-500 hover:text-red-400 p-0.5"
                                title="Copiar Nome"
                              >
                                <Copy size={11} />
                              </button>

                              {/* Birthday Badge */}
                              {bdayInfo?.isToday && (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.2 rounded-full font-bold bg-pink-950/90 text-pink-300 border border-pink-600/70 shadow-[0_0_8px_rgba(244,114,182,0.4)] animate-pulse" title="Aniversário Hoje!">
                                  <Cake size={11} /> Hoje!
                                </span>
                              )}
                              {bdayInfo && !bdayInfo.isToday && bdayInfo.isThisWeek && (
                                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-950/80 text-amber-300 border border-amber-600/50" title={`Aniversário em ${bdayInfo.daysUntil} dias (${bdayInfo.dataTexto})`}>
                                  <Cake size={10} /> {bdayInfo.daysUntil}d
                                </span>
                              )}

                              {/* Inactive tag */}
                              {client.arquivado && (
                                <span className="text-[10px] bg-amber-950/70 text-amber-400 border border-amber-700/50 px-1.5 py-0.2 rounded font-mono-code font-bold">
                                  Inativo
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-gray-400">
                              <div className="flex items-center gap-1 font-mono-code">
                                <span className="text-gray-300">{client.whatsapp || client.celular || '—'}</span>
                                {client.whatsapp && (
                                  <button
                                    onClick={() => copyClientField('WhatsApp', client.whatsapp)}
                                    className="text-gray-500 hover:text-red-400 p-0.5"
                                    title="Copiar WhatsApp"
                                  >
                                    <Copy size={11} />
                                  </button>
                                )}
                              </div>
                              {client.usuarioDisp && (
                                <span className="text-[10px] text-gray-500 font-mono-code truncate max-w-[100px]">
                                  @{client.usuarioDisp}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Acesso & Servidor IPTV */}
                      <td className="py-3 px-3 align-middle font-mono-code">
                        <div className="space-y-1.5">
                          {/* Servidor + App */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#161a29] text-gray-300 border border-[#23293e] text-[10px] font-semibold">
                              <span>{client.servidor || 'Cine Hub'}</span>
                              <button
                                onClick={() => copyClientField('Servidor', client.servidor)}
                                className="text-gray-500 hover:text-red-400"
                                title="Copiar Servidor"
                              >
                                <Copy size={10} />
                              </button>
                            </span>

                            {client.aplicativo && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#131622] text-gray-300 border border-[#1f2436] text-[10px]">
                                <span className="truncate max-w-[90px]">{client.aplicativo}</span>
                                <button
                                  onClick={() => copyClientField('Aplicativo', client.aplicativo)}
                                  className="text-gray-500 hover:text-red-400"
                                  title="Copiar Aplicativo"
                                >
                                  <Copy size={10} />
                                </button>
                              </span>
                            )}

                            {client.appPago && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-semibold text-[9px]">
                                Pago
                              </span>
                            )}
                          </div>

                          {/* MAC & Senha */}
                          {client.mac ? (
                            <div className="flex items-center gap-2 flex-wrap text-[11px]">
                              <div className="flex items-center gap-1 text-gray-300">
                                <span>{client.mac}</span>
                                <button
                                  onClick={() => copyClientField('Endereço MAC', client.mac)}
                                  className="text-gray-500 hover:text-red-400"
                                  title="Copiar MAC"
                                >
                                  <Copy size={10} />
                                </button>
                              </div>

                              {client.senhaMac && (
                                <div className="flex items-center gap-1 text-[10px] text-amber-400/90">
                                  <Key size={10} className="text-amber-500" />
                                  <span>{isPasswordRevealed ? client.senhaMac : '••••'}</span>
                                  <button
                                    onClick={() => togglePasswordVisibility(client.id)}
                                    className="text-gray-500 hover:text-gray-300 text-[9px] underline"
                                  >
                                    {isPasswordRevealed ? 'ocultar' : 'ver'}
                                  </button>
                                  <button
                                    onClick={() => copyClientField('Senha MAC', client.senhaMac)}
                                    className="text-gray-500 hover:text-red-400"
                                    title="Copiar Senha MAC"
                                  >
                                    <Copy size={10} />
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-600 text-[10px] font-sans">Sem MAC cadastrado</span>
                          )}
                        </div>
                      </td>

                      {/* 4. Plano & Vencimento */}
                      <td className="py-3 px-3 align-middle">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-[#181a26] text-gray-300 border border-[#272b3e] text-[10px] font-medium">
                              {client.plano || 'Mensal'}
                            </span>
                            <span className="font-semibold text-gray-100 font-mono-code text-xs">
                              R$ {Number(client.valor || 20).toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono-code text-gray-300 text-[11px]">
                              {client.vencimento || '—'}
                            </span>
                            {client.vencimento && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                                isOverdue
                                  ? 'bg-red-950/80 text-red-400 border border-red-800/60'
                                  : isDueSoon
                                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                                  : 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/40'
                              }`}>
                                {calculateDaysText(client.vencimento)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 5. Status */}
                      <td className="py-3 px-3 align-middle text-center">
                        <button
                          onClick={() => toggleClientStatus(client.id)}
                          className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
                            client.status === 'Em dia'
                              ? 'bg-emerald-950/70 text-emerald-400 border-emerald-700/60 shadow-[0_0_10px_rgba(16,185,129,0.25)] hover:border-emerald-500'
                              : client.status === 'Em atraso'
                              ? 'bg-red-950/70 text-red-400 border-red-700/60 shadow-[0_0_10px_rgba(220,38,38,0.25)] hover:border-red-500'
                              : client.status === 'Vencendo (7d)'
                              ? 'bg-amber-950/70 text-amber-400 border-amber-700/60 shadow-[0_0_10px_rgba(245,158,11,0.25)] hover:border-amber-500'
                              : 'bg-gray-900 text-gray-400 border-gray-700'
                          }`}
                          title="Clique para alternar status (Ativar / Suspender)"
                        >
                          <span>{client.status}</span>
                        </button>
                      </td>

                      {/* 6. Ações */}
                      <td className="py-3 px-3 align-middle text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Copiar Ficha Completa */}
                          <button
                            onClick={() => copyClientFullCredentials(client)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a1d2d] transition-colors"
                            title="Copiar Ficha Completa do Cliente"
                          >
                            <Copy size={14} />
                          </button>

                          {/* WhatsApp Billing Reminder */}
                          <button
                            onClick={() => sendWhatsAppReminder(client)}
                            className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/60 transition-colors"
                            title="Cobrar via WhatsApp com mensagem personalizada"
                          >
                            <MessageCircle size={15} />
                          </button>

                          {/* Quick View / Edit */}
                          <button
                            onClick={() => onOpenClient(client)}
                            className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-950/60 transition-colors"
                            title="Abrir ficha cadastral completa"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Alarme no celular (.ics) */}
                          <button
                            onClick={() => downloadClientAlarmCalendarFile(client)}
                            className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-950/60 transition-colors"
                            title="Adicionar Alarme / Lembrete no Calendário do Celular (.ics)"
                          >
                            <AlarmClock size={15} />
                          </button>

                          {/* Arquivar / Desarquivar */}
                          {client.arquivado ? (
                            <button
                              onClick={() => unarchiveClient(client.id)}
                              className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-950/60 transition-colors"
                              title="Reativar cliente (mover para Clientes Ativos)"
                            >
                              <ArchiveRestore size={15} />
                            </button>
                          ) : (
                            <button
                              onClick={() => archiveClient(client.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-amber-950/50 transition-colors"
                              title="Mover cliente para pasta Cliente inativos"
                            >
                              <Archive size={15} />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteOne(client)}
                            className="p-1.5 rounded-lg text-red-500 hover:text-red-400 hover:bg-red-950/60 transition-colors"
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

        {/* Pagination Footer */}
        <div className="border-t border-[#1b1f2e] bg-[#0c0e16] px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <span>
              Mostrando {Math.min(filteredClients.length, (currentPage - 1) * rowsPerPage + 1)} a{' '}
              {Math.min(filteredClients.length, currentPage * rowsPerPage)} de {filteredClients.length} clientes
            </span>

            <div className="flex items-center gap-1.5">
              <span>Por página:</span>
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

      {/* INTEGRATED IMPORT MODAL (Inside Clientes) */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="tech-card border border-red-950/80 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b1f2e]">
              <div className="flex items-center gap-2.5 text-white font-display font-bold text-lg">
                <FileSpreadsheet size={20} className="text-red-500" />
                <span>Importar Planilha de Clientes</span>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportResult(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-gray-300 leading-relaxed">
                Suporta o arquivo <strong>clientes-1792279062638.xlsx</strong> com as 18 colunas originais (Nome, WhatsApp, Servidor, MAC, Senha, Plano, Vencimento, etc.).
              </p>

              {/* Upload Drop area */}
              <div className="border-2 border-dashed border-[#262c3e] hover:border-red-600/70 rounded-2xl p-6 text-center space-y-3 bg-[#090b11]">
                <UploadCloud size={32} className="mx-auto text-red-500" />
                <div>
                  <span className="font-semibold text-xs text-white block">
                    {importFile ? importFile.name : 'Selecione ou arraste a planilha'}
                  </span>
                  <span className="text-[11px] text-gray-500">Formatos aceitos: .xlsx, .xls, .csv</span>
                </div>

                <div className="flex items-center justify-center gap-2 pt-1">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-[0_0_12px_rgba(220,38,38,0.4)]">
                    <FileSpreadsheet size={14} />
                    <span>Escolher Arquivo</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleImportFileChange}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={downloadSampleExcelTemplate}
                    className="px-3 py-2 rounded-xl bg-[#141724] hover:bg-[#1d2235] text-gray-300 text-xs font-semibold border border-[#23293c]"
                  >
                    Baixar Modelo
                  </button>
                </div>
              </div>

              {/* Preview Result */}
              {importResult && (
                <div className="space-y-3 bg-[#0d0f17] border border-[#1b1f2e] rounded-2xl p-4">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-white">Linhas detectadas: {importResult.totalRows}</span>
                    <span className="text-amber-400">Duplicidades: {importResult.duplicatesCount}</span>
                    <span className="text-emerald-400">Válidos: {importResult.validRows.length}</span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <span className="font-semibold text-gray-400 block">Modo de Importação:</span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setImportMode('append')}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-semibold ${
                          importMode === 'append' ? 'bg-red-950/80 border-red-600 text-white' : 'bg-[#121522] border-[#222738] text-gray-400'
                        }`}
                      >
                        Cadastrar Novos
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportMode('update')}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-semibold ${
                          importMode === 'update' ? 'bg-red-950/80 border-red-600 text-white' : 'bg-[#121522] border-[#222738] text-gray-400'
                        }`}
                      >
                        Atualizar Existentes
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportMode('replace')}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-semibold ${
                          importMode === 'replace' ? 'bg-red-950/80 border-red-600 text-white' : 'bg-[#121522] border-[#222738] text-gray-400'
                        }`}
                      >
                        Substituir Base
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportResult(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#171a26] text-gray-300 text-xs font-semibold"
              >
                Cancelar
              </button>

              {importResult && (
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={importParsing}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all"
                >
                  Confirmar e Importar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clear All Modal Confirmation */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="tech-card border border-red-900/80 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500">
              <div className="p-3 bg-red-950/80 rounded-2xl border border-red-800">
                <AlertTriangle size={24} />
              </div>
              <h3 className="font-display text-lg font-bold text-white">
                Limpar Todos os Clientes?
              </h3>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Esta ação removerá todos os {clients.length} clientes da base de dados.
              Você poderá desfazer a alteração imediatamente através do botão <strong>Desfazer</strong> no cabeçalho ou importar novamente.
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
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-[0_0_15px_#dc2626]"
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
