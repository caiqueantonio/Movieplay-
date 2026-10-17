import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Info,
  Download,
  RotateCcw,
  RefreshCw,
  FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  parseExcelBuffer,
  ImportResult,
  downloadSampleExcelTemplate,
  EXCEL_COLUMNS
} from '../utils/excel';

export const ImportView: React.FC = () => {
  const { clients, importClientsBatch, playSound } = useApp();

  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'update' | 'replace'>('append');
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setParsing(true);
    setImportSuccess(null);

    try {
      const buffer = await selected.arrayBuffer();
      const result = parseExcelBuffer(buffer, clients);
      setImportResult(result);
      playSound('sino');
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Erro ao ler o arquivo: ${error.message}`);
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importResult) return;
    setParsing(true);
    try {
      const toImport = importResult.validRows
        .filter(r => !r.hasErrors)
        .map(r => r.parsed);

      await importClientsBatch(toImport, importMode);
      setImportSuccess(
        `Importação concluída com sucesso! ${toImport.length} registro(s) processado(s) no modo: ${
          importMode === 'append' ? 'Cadastrar Novos' : importMode === 'update' ? 'Atualizar Existentes' : 'Substituir Base'
        }.`
      );
      playSound('sino');
      setFile(null);
      setImportResult(null);
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Erro na importação: ${error.message}`);
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-200">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Importação de Planilha
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Importe registros em Excel (.xlsx) ou CSV com as 18 colunas originais do seu banco.
          </p>
        </div>

        <button
          onClick={downloadSampleExcelTemplate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#141724] border border-[#23293c] hover:border-gray-500 text-xs font-semibold text-gray-300 hover:text-white transition-all shadow-sm"
        >
          <Download size={14} className="text-red-500" />
          <span>Baixar Modelo Excel (.xlsx)</span>
        </button>
      </div>

      {importSuccess && (
        <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 p-4 rounded-2xl text-xs font-semibold flex items-center gap-3">
          <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
          <span>{importSuccess}</span>
        </div>
      )}

      {/* Upload Box */}
      <div className="bg-[#0b0d14] border-2 border-dashed border-[#23293c] hover:border-red-600/60 rounded-3xl p-8 md:p-12 text-center space-y-4 transition-all">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#140b10] border border-red-950 text-red-500 flex items-center justify-center">
          <UploadCloud size={32} />
        </div>

        <div className="space-y-1">
          <h3 className="font-display font-bold text-lg text-white">
            Selecione a planilha de clientes
          </h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Suporta a planilha <strong>clientes-1792279062638.xlsx</strong> ou qualquer arquivo Excel com a aba "Clientes".
          </p>
        </div>

        <div>
          <label className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs tracking-wide cursor-pointer transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)]">
            <FileSpreadsheet size={16} />
            <span>Selecionar Arquivo Excel / CSV</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {file && (
          <div className="text-xs text-gray-300 font-mono-code pt-2">
            Arquivo selecionado: <strong className="text-white">{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
          </div>
        )}
      </div>

      {/* The 18 Required Columns Overview */}
      <div className="bg-[#0e1017] border border-[#1b1f2e] rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase tracking-wider">
          <Info size={15} className="text-red-500" />
          <span>18 Colunas Reconhecidas Automaticamente</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {EXCEL_COLUMNS.map((col, idx) => (
            <span
              key={col}
              className="px-2.5 py-1 rounded-lg bg-[#141724] border border-[#22283a] text-gray-300 text-[11px] font-mono-code"
            >
              {idx + 1}. {col}
            </span>
          ))}
        </div>
      </div>

      {/* Preview and Validation Result */}
      {importResult && (
        <div className="bg-[#0b0d14] border border-[#1b1f2e] rounded-3xl p-6 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#181b28]">
            <div>
              <h2 className="font-display text-xl font-bold text-white">
                Prévia da Importação
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Validação de campos, detecção de duplicidades e formatação
              </p>
            </div>

            {/* Metrics */}
            <div className="flex items-center gap-3 text-xs">
              <span className="px-3 py-1.5 rounded-xl bg-[#131622] text-gray-300 border border-[#202538]">
                Total: <strong>{importResult.totalRows}</strong>
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-amber-950/60 text-amber-400 border border-amber-800/40">
                Duplicados: <strong>{importResult.duplicatesCount}</strong>
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-red-950/60 text-red-400 border border-red-800/40">
                Erros: <strong>{importResult.errorRowsCount}</strong>
              </span>
            </div>
          </div>

          {/* Import Strategy Options */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-gray-300 block">
              Como tratar os registros existentes ou duplicados?
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                importMode === 'append'
                  ? 'bg-[#180e14] border-red-600/80 text-white shadow-[0_0_12px_rgba(220,38,38,0.2)]'
                  : 'bg-[#111420] border-[#202538] text-gray-400 hover:text-white'
              }`}>
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'append'}
                  onChange={() => setImportMode('append')}
                  className="hidden"
                />
                <strong className="block text-white mb-0.5">Cadastrar Novos</strong>
                <span>Adiciona apenas clientes que não existirem na base</span>
              </label>

              <label className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                importMode === 'update'
                  ? 'bg-[#180e14] border-red-600/80 text-white shadow-[0_0_12px_rgba(220,38,38,0.2)]'
                  : 'bg-[#111420] border-[#202538] text-gray-400 hover:text-white'
              }`}>
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'update'}
                  onChange={() => setImportMode('update')}
                  className="hidden"
                />
                <strong className="block text-white mb-0.5">Atualizar Existentes</strong>
                <span>Atualiza campos de clientes já cadastrados</span>
              </label>

              <label className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                importMode === 'replace'
                  ? 'bg-[#180e14] border-red-600/80 text-white shadow-[0_0_12px_rgba(220,38,38,0.2)]'
                  : 'bg-[#111420] border-[#202538] text-gray-400 hover:text-white'
              }`}>
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="hidden"
                />
                <strong className="block text-white mb-0.5">Substituir Toda a Base</strong>
                <span>Substitui completamente a base com a planilha atual</span>
              </label>
            </div>
          </div>

          {/* Preview Table */}
          <div className="border border-[#1b1f2e] rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#121522] text-gray-400 sticky top-0 font-semibold border-b border-[#1b1f2e]">
                <tr>
                  <th className="p-3">Nome</th>
                  <th className="p-3">Contato</th>
                  <th className="p-3">Servidor</th>
                  <th className="p-3">Plano</th>
                  <th className="p-3">Vencimento</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Validação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#151824]">
                {importResult.validRows.slice(0, 15).map((row, i) => (
                  <tr key={i} className="hover:bg-[#121522]/60">
                    <td className="p-3 font-semibold text-gray-200">{row.parsed.nome}</td>
                    <td className="p-3 font-mono-code text-gray-400">{row.parsed.whatsapp || '—'}</td>
                    <td className="p-3 text-gray-300">{row.parsed.servidor}</td>
                    <td className="p-3 text-gray-300">{row.parsed.plano}</td>
                    <td className="p-3 font-mono-code text-gray-300">{row.parsed.vencimento}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-[#181c2b] text-gray-300">
                        {row.parsed.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {row.isDuplicate ? (
                        <span className="text-amber-400 font-semibold flex items-center gap-1 text-[11px]">
                          <AlertTriangle size={12} /> {row.duplicateReason}
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 size={12} /> Válido
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {importResult.validRows.length > 15 && (
            <p className="text-[11px] text-gray-500 text-center">
              Exibindo 15 de {importResult.validRows.length} linhas para conferência.
            </p>
          )}

          {/* Confirm Import Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setImportResult(null)}
              className="px-4 py-2.5 rounded-xl bg-[#171a26] text-gray-300 hover:text-white text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={parsing}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all"
            >
              <CheckCircle2 size={15} />
              <span>Confirmar e Importar para o Sistema</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
