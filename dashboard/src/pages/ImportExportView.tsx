import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  DownloadCloud,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Layers,
  FileText,
  Filter
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { LeadsApi } from '../services/api';
import { GroupDTO, TagDTO, ImportPreviewDTO, ExportConfigDTO } from '@grupoleads/shared';

export const ImportExportView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [groups, setGroups] = useState<GroupDTO[]>([]);
  const [tags, setTags] = useState<TagDTO[]>([]);

  // Configurações de Exportação
  const [exportFormat, setExportFormat] = useState<'XLSX' | 'CSV'>('XLSX');
  const [exportScope, setExportScope] = useState<'ALL' | 'BY_GROUP' | 'BY_TAG' | 'NEW'>('ALL');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedTagId, setSelectedTagId] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'name', 'phone', 'groups', 'tags', 'status', 'createdAt', 'notes'
  ]);
  const [isExporting, setIsExporting] = useState(false);

  // Importação
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreviewDTO | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [gList, tList] = await Promise.all([
          LeadsApi.getGroups(),
          LeadsApi.getTags()
        ]);
        setGroups(gList);
        setTags(tList);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      }
    };
    loadMetadata();
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await LeadsApi.exportContacts({
        format: exportFormat,
        scope: exportScope,
        groupId: selectedGroupId || undefined,
        tagId: selectedTagId || undefined,
        columns: selectedColumns as any
      });
    } catch (err) {
      console.error('Erro ao exportar:', err);
      alert('Falha ao exportar contatos.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setImportFile(file);
    setImportSuccessMsg('');
    setIsAnalyzing(true);
    try {
      const preview = await LeadsApi.previewImport(file);
      setImportPreview(preview);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao processar planilha.');
      setImportPreview(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview?.previewRows) return;
    setIsConfirming(true);
    try {
      const validRows = importPreview.previewRows.filter(r => r.isValid && !r.isDuplicate);
      const res = await LeadsApi.confirmImport(validRows);
      setImportSuccessMsg(`Importação realizada com sucesso! ${res.importedCount} novos contatos foram salvos.`);
      setImportPreview(null);
      setImportFile(null);
    } catch (err) {
      console.error('Erro ao confirmar importação:', err);
    } finally {
      setIsConfirming(false);
    }
  };

  const availableColumns = [
    { id: 'name', label: 'Nome' },
    { id: 'phone', label: 'Telefone' },
    { id: 'groups', label: 'Grupos de Origem' },
    { id: 'tags', label: 'Tags' },
    { id: 'status', label: 'Status' },
    { id: 'createdAt', label: 'Data de Coleta' },
    { id: 'notes', label: 'Observações' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('export')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'export'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <DownloadCloud className="w-4 h-4" />
          <span>Exportar Base de Contatos</span>
        </button>

        <button
          onClick={() => setActiveTab('import')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'import'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Importar Planilha (CSV / XLSX)</span>
        </button>
      </div>

      {activeTab === 'export' ? (
        <Card title="Configurações de Exportação" subtitle="Baixe seus contatos organizados em XLSX ou CSV">
          <div className="space-y-6 max-w-2xl">
            {/* Formato */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                1. Formato do Arquivo
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setExportFormat('XLSX')}
                  className={`p-3 rounded-xl border flex items-center gap-3 font-semibold text-sm transition-all ${
                    exportFormat === 'XLSX'
                      ? 'border-blue-600 bg-blue-50/60 text-blue-700 ring-2 ring-blue-500/20'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <span>Microsoft Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat('CSV')}
                  className={`p-3 rounded-xl border flex items-center gap-3 font-semibold text-sm transition-all ${
                    exportFormat === 'CSV'
                      ? 'border-blue-600 bg-blue-50/60 text-blue-700 ring-2 ring-blue-500/20'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>Texto Separado por Vírgula (.csv)</span>
                </button>
              </div>
            </div>

            {/* Escopo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                2. Escopo dos Contatos
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {[
                  { id: 'ALL', label: 'Todos os Contatos' },
                  { id: 'NEW', label: 'Apenas Novos' },
                  { id: 'BY_GROUP', label: 'Por Grupo' },
                  { id: 'BY_TAG', label: 'Por Tag' }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setExportScope(s.id as any)}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      exportScope === s.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {exportScope === 'BY_GROUP' && (
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Selecione um grupo...</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              )}

              {exportScope === 'BY_TAG' && (
                <select
                  value={selectedTagId}
                  onChange={(e) => setSelectedTagId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Selecione uma tag...</option>
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Colunas */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                3. Escolher Colunas
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableColumns.map((col) => {
                  const isChecked = selectedColumns.includes(col.id);
                  return (
                    <label
                      key={col.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs font-medium transition-all ${
                        isChecked ? 'bg-blue-50/60 border-blue-200 text-blue-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            if (selectedColumns.length > 1) {
                              setSelectedColumns(selectedColumns.filter(c => c !== col.id));
                            }
                          } else {
                            setSelectedColumns([...selectedColumns, col.id]);
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{col.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <Button
                variant="primary"
                size="lg"
                onClick={handleExport}
                isLoading={isExporting}
                icon={<DownloadCloud className="w-5 h-5" />}
              >
                Gerar e Baixar Arquivo
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card title="Importação de Planilha" subtitle="Importe arquivos XLSX ou CSV com detecção automática de duplicados">
          <div className="space-y-6 max-w-3xl">
            {importSuccessMsg && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 font-medium">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{importSuccessMsg}</span>
              </div>
            )}

            {/* Dropzone */}
            <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-8 text-center transition-all bg-slate-50/50">
              <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-800">Selecione ou arraste sua planilha</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Formatos aceitos: <strong>.xlsx, .xls, .csv</strong> com cabeçalhos como Nome, Telefone, Grupo
              </p>
              <label className="cursor-pointer">
                <span className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm">
                  Procurar Arquivo
                </span>
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {importFile && (
                <p className="text-xs text-blue-600 font-semibold mt-3">
                  Arquivo selecionado: {importFile.name}
                </p>
              )}
            </div>

            {isAnalyzing && (
              <div className="py-8 text-center text-slate-500 text-xs">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                Analisando e conferindo deduplicação com o banco de dados...
              </div>
            )}

            {/* 14. Prévia antes de importar */}
            {importPreview && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total de Linhas</span>
                    <p className="text-xl font-black text-slate-900">{importPreview.totalRows}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">Novos Contatos</span>
                    <p className="text-xl font-black text-emerald-700">{importPreview.newCount}</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-[10px] font-bold text-amber-600 uppercase">Duplicados</span>
                    <p className="text-xl font-black text-amber-700">{importPreview.duplicatesCount}</p>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                    <span className="text-[10px] font-bold text-rose-600 uppercase">Inválidos</span>
                    <p className="text-xl font-black text-rose-700">{importPreview.invalidCount}</p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="px-3 py-2">Nome</th>
                        <th className="px-3 py-2">Telefone</th>
                        <th className="px-3 py-2">Grupo</th>
                        <th className="px-3 py-2">Status da Análise</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importPreview.previewRows.map((r, idx) => (
                        <tr key={idx} className={r.isDuplicate ? 'bg-amber-50/30' : !r.isValid ? 'bg-rose-50/30' : ''}>
                          <td className="px-3 py-2 font-medium">{r.name}</td>
                          <td className="px-3 py-2 font-mono">{r.phone}</td>
                          <td className="px-3 py-2 text-slate-500">{r.group || '-'}</td>
                          <td className="px-3 py-2">
                            {r.isValid && !r.isDuplicate ? (
                              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> Pronto para importar
                              </span>
                            ) : r.isDuplicate ? (
                              <span className="text-amber-600 font-semibold flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> {r.reason}
                              </span>
                            ) : (
                              <span className="text-rose-600 font-semibold flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" /> {r.reason}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2">
                  <Button
                    variant="success"
                    size="md"
                    onClick={handleConfirmImport}
                    isLoading={isConfirming}
                    disabled={importPreview.newCount === 0}
                  >
                    CONFIRMAR IMPORTAÇÃO ({importPreview.newCount} Novos Contatos)
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
