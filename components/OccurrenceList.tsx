
import React, { useState, useMemo, useRef } from 'react';
import { Occurrence, OccurrenceStatus, UserRole, User, EscalationLevel } from '../types';
import { Card, Badge, Button, Modal, CustomSelect, DateRangePicker } from './UiComponents';
import { Filter, Eye, CheckCircle, X, ArrowUpCircle, RotateCcw, Pencil, MapPin, FileDown, Download, Trash2, Upload, RefreshCw, AlertOctagon } from 'lucide-react';
import { MockDB } from '../services/mockDatabase';

interface OccurrenceListProps {
  occurrences: Occurrence[];
  users?: User[]; // Optional to avoid breaking other usages if any
  currentUser: User;
  onUpdateStatus: (id: string, newStatus: OccurrenceStatus, feedback?: string) => void;
  onUpdateEscalation: (id: string, newLevel: EscalationLevel) => void;
  onViewDetails: (occurrence: Occurrence) => void;
  onEdit: (occurrence: Occurrence) => void;
  onDelete: (id: string) => void;
}

export const OccurrenceList: React.FC<OccurrenceListProps> = ({ occurrences, users = [], currentUser, onUpdateStatus, onUpdateEscalation, onViewDetails, onEdit, onDelete }) => {
  // --- Filter States ---
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    technician: '',
    category: '',
    reason: '',
    escalation: '',
    status: '',
    branch: '',
    cluster: ''
  });

  // --- Export States ---
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  // --- Import States ---
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [pendingFileText, setPendingFileText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Bulk Delete States (Admin) ---
  const [showBulkDeleteMenu, setShowBulkDeleteMenu] = useState(false);
  const [bulkDeleteFilters, setBulkDeleteFilters] = useState({ startDate: '', endDate: '', cluster: '', branch: '', technicianId: '' });

  const options = useMemo(() => {
    const data = occurrences;
    return {
      technicians: Array.from(new Set(data.map(o => o.userName))).sort(),
      categories: Array.from(new Set(data.map(o => o.category))).sort(),
      reasons: Array.from(new Set(data.map(o => o.reason))).sort(),
      escalations: Object.values(EscalationLevel),
      statuses: Object.values(OccurrenceStatus),
      branches: Array.from(new Set(data.map(o => o.branch || ''))).filter(Boolean).sort(),
      clusters: Array.from(new Set(data.map(o => o.cluster || ''))).filter(Boolean).sort()
    };
  }, [occurrences]);

  const filtered = occurrences.filter(o => {
    if (currentUser.role === UserRole.CONTROLADOR && o.registeredByUserId !== currentUser.id) return false;

    // Date range filter
    if (filters.startDate && o.date < filters.startDate) return false;
    if (filters.endDate && o.date > filters.endDate) return false;

    if (filters.technician && o.userName !== filters.technician) return false;
    if (filters.category && o.category !== filters.category) return false;
    if (filters.reason && o.reason !== filters.reason) return false;
    if (filters.escalation && (o.escalationLevel || 'Sem Recorrência') !== filters.escalation) return false;
    if (filters.status && o.status !== filters.status) return false;
    if (filters.branch && o.branch !== filters.branch) return false;
    if (filters.cluster && o.cluster !== filters.cluster) return false;

    return true;
  });

  const clearFilters = () => {
    setFilters({ startDate: '', endDate: '', technician: '', category: '', reason: '', escalation: '', status: '', branch: '', cluster: '' });
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const handleAction = (id: string, action: 'COMPLETE' | 'CANCEL') => {
    if (action === 'COMPLETE') onUpdateStatus(id, OccurrenceStatus.CONCLUIDA);
    if (action === 'CANCEL') onUpdateStatus(id, OccurrenceStatus.CANCELADA);
  };

  const updateFilter = (field: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const downloadCSV = (filename: string, content: string) => {
    const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    if (!exportStartDate || !exportEndDate) {
      alert("Por favor, selecione a Data Inicial e Final.");
      return;
    }
    const start = new Date(exportStartDate);
    const end = new Date(exportEndDate);
    const dataToExport = occurrences.filter(o => {
      const occDate = new Date(o.date);
      return occDate >= start && occDate <= end;
    });
    if (dataToExport.length === 0) {
      alert("Nenhum registro encontrado neste período.");
      return;
    }
    const header = "ID;Data Registro;Hora Registro;Cluster;Filial;Setor;Tecnico;Categoria;Motivo;Descricao;Recorrencia;Data/Hora Escalonamento;Data/Hora Conclusao;Status;Registrado Por\n";
    const rows = dataToExport.map(o => {
      const safeDesc = (o.description || '').replace(/;/g, ',').replace(/\n/g, ' ');
      const safeReason = (o.reason || '').replace(/;/g, ',');
      const completionLog = o.auditTrail.find(log => log.action === 'CONCLUIDA');
      const completionTime = completionLog ? new Date(completionLog.date).toLocaleString('pt-BR') : '';
      const escalationLog = [...o.auditTrail].reverse().find(log => log.action === 'ESCALONAMENTO');
      const escalationTime = escalationLog ? new Date(escalationLog.date).toLocaleString('pt-BR') : '';
      return `${o.id};${o.date};${o.time};${o.cluster || ''};${o.branch || ''};${o.sector || ''};${o.userName};${o.category};${safeReason};${safeDesc};${o.escalationLevel || 'Nenhuma'};${escalationTime};${completionTime};${o.status};${o.registeredByUserId}`;
    }).join("\n");
    downloadCSV(`relatorio_ocorrencias_${exportStartDate}_ate_${exportEndDate}.csv`, header + rows);
    setShowExportMenu(false);
  };

  const handleDownloadTemplate = () => {
    const header = "Data (YYYY-MM-DD);Hora (HH:MM);ID Tecnico;Nome Tecnico;Categoria;Motivo;Descricao;Filial;Setor;Status\n";
    const example = "2025-11-20;08:30;T001;João Silva;1 - Técnico não Iniciou até 08:30;1.2 Ainda em Deslocamento;Trânsito na via principal;SALVADOR;BKT_SALVADOR_AREA_01;REGISTRADA";
    downloadCSV("modelo_importacao_ocorrencias.csv", header + example);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setPendingFileText(text);
        setImportModalOpen(true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmImport = (mode: 'MERGE' | 'REPLACE') => {
    const result = MockDB.importOccurrencesFromCsv(pendingFileText, mode);
    if (result.total > 0) {
      alert(`Importação Concluída!\nTotal de registros importados: ${result.new}`);
      window.location.reload();
    } else {
      alert("Erro: Arquivo inválido ou sem registros.");
    }
    setImportModalOpen(false);
    setPendingFileText('');
  };

  const handleBulkDelete = async () => {
    // 1. Confirm
    const selectedUser = users?.find(u => u.id === bulkDeleteFilters.technicianId);

    const filtersLabel = [
      bulkDeleteFilters.startDate ? `De: ${formatDate(bulkDeleteFilters.startDate)}` : '',
      bulkDeleteFilters.endDate ? `Até: ${formatDate(bulkDeleteFilters.endDate)}` : '',
      bulkDeleteFilters.cluster ? `Cluster: ${bulkDeleteFilters.cluster}` : '',
      bulkDeleteFilters.branch ? `Filial: ${bulkDeleteFilters.branch}` : '',
      selectedUser ? `Usuário: ${selectedUser.name}` : ''
    ].filter(Boolean).join(', ');

    const msg = `ATENÇÃO: Você está prestes a excluir ocorrências!\n\nCritérios: ${filtersLabel || 'TODAS AS OCORRÊNCIAS (Sem filtros selecionados)'}\n\nEsta ação não pode ser desfeita. Tem certeza absoluta?`;

    if (!window.confirm(msg)) return;
    // Double confirmation for delete all
    if (!filtersLabel && !window.confirm("VOCÊ NÃO SELECIONOU NENHUM FILTRO. ISSO APAGARÁ TODO O BANCO DE DADOS DE OCORRÊNCIAS.\n\nConfirma DE NOVO?")) return;

    try {
      const deletedCount = await import('../services/supabaseDb').then(m => m.SupabaseDB.deleteManyOccurrences({
        startDate: bulkDeleteFilters.startDate,
        endDate: bulkDeleteFilters.endDate,
        cluster: bulkDeleteFilters.cluster,
        branch: bulkDeleteFilters.branch,
        technicianId: bulkDeleteFilters.technicianId // Direct ID now
      }));

      alert(`Sucesso! ${deletedCount} ocorrências foram excluídas.`);
      window.location.reload(); // Simple refresh to update list
    } catch (e: any) {
      console.error(e);
      alert(`Erro ao excluir ocorrências: ${e.message || e.error_description || JSON.stringify(e)}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 mt-6">
      {/* Custom Header with Title and Action Buttons */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <h3 className="text-lg font-bold text-[#404040]">Lista de Ocorrências</h3>
        <div className="flex gap-2">
          {currentUser.role === UserRole.ADMIN && (
            <>
              <button
                onClick={() => setShowBulkDeleteMenu(!showBulkDeleteMenu)}
                className={`p-2 rounded-md transition-colors ${showBulkDeleteMenu ? 'bg-red-600 text-white' : 'text-red-600 border border-red-200 hover:bg-red-50'}`}
                title="Exclusão em Lote"
              >
                <Trash2 size={18} />
              </button>
              <button
                onClick={handleDownloadTemplate}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors"
                title="Modelo CSV"
              >
                <FileDown size={18} />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-[#940910] hover:bg-[#7a060c] text-white rounded-md transition-colors"
                title="Importar CSV"
              >
                <Upload size={18} />
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.txt" onChange={handleFileSelect} />
            </>
          )}
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className={`p-2 rounded-md transition-colors ${showExportMenu ? 'bg-[#940910] text-white' : 'text-[#940910] border border-[#940910]/30 hover:bg-red-50'}`}
            title={showExportMenu ? 'Fechar Exportação' : 'Exportar Dados'}
          >
            <FileDown size={18} />
          </button>
        </div>
      </div>

      <div className="p-6">

        <Modal isOpen={importModalOpen} onClose={() => { setImportModalOpen(false); setPendingFileText(''); }} title="Confirmar Importação de Ocorrências">
          <div className="space-y-6">
            <div className="flex items-start gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
              <AlertOctagon size={24} className="text-blue-600 shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-blue-800">Selecione o Modo de Importação</h4>
                <p className="text-sm text-blue-700 mt-1">Você deseja apenas adicionar os novos registros ou substituir todas as ocorrências existentes?</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => confirmImport('MERGE')}
                className="flex flex-col items-center p-6 border-2 border-green-100 bg-green-50 hover:bg-green-100 hover:border-green-300 rounded-xl transition-all text-center group"
              >
                <div className="bg-white p-3 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                  <RefreshCw size={28} className="text-green-600" />
                </div>
                <h3 className="font-bold text-green-800">Acrescentar</h3>
                <p className="text-xs text-green-700 mt-1">Adiciona novas ocorrências.<br />Mantém os registros existentes.</p>
              </button>
              <button
                onClick={() => confirmImport('REPLACE')}
                className="flex flex-col items-center p-6 border-2 border-red-100 bg-red-50 hover:bg-red-100 hover:border-red-300 rounded-xl transition-all text-center group"
              >
                <div className="bg-white p-3 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                  <Trash2 size={28} className="text-red-600" />
                </div>
                <h3 className="font-bold text-red-800">Substituir Tudo</h3>
                <p className="text-xs text-red-700 mt-1">Apaga todas as ocorrências.<br />Mantém apenas o que está na planilha.</p>
              </button>
            </div>
          </div>
        </Modal>

        {/* --- EXPORT MENU --- */}
        {showExportMenu && (
          <div className="mb-6 bg-[#940910]/5 border border-[#940910]/20 p-4 rounded-lg animate-in fade-in slide-in-from-top-2">
            <h4 className="text-sm font-bold text-[#940910] mb-3 flex items-center gap-2">
              <Download size={16} /> Exportar Ocorrências por Período (CSV)
            </h4>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-[#404040] mb-1">Data Inicial</label>
                <input
                  type="date"
                  className="border rounded p-2 text-xs bg-white focus:ring-2 focus:ring-[#940910]"
                  value={exportStartDate}
                  onChange={e => setExportStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#404040] mb-1">Data Final</label>
                <input
                  type="date"
                  className="border rounded p-2 text-xs bg-white focus:ring-2 focus:ring-[#940910]"
                  value={exportEndDate}
                  onChange={e => setExportEndDate(e.target.value)}
                />
              </div>
              <Button onClick={handleExport} className="bg-[#940910] hover:bg-[#7a060c] text-white text-xs">
                Baixar Relatório
              </Button>
            </div>
          </div>
        )}

        {/* --- BULK DELETE MENU (ADMIN ONLY) --- */}
        {showBulkDeleteMenu && currentUser.role === UserRole.ADMIN && (
          <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-lg animate-in fade-in slide-in-from-top-2">
            <h4 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
              <Trash2 size={16} /> Exclusão em Lote (Cuidado!)
            </h4>
            <p className="text-xs text-red-600 mb-4">
              Selecione os critérios para exclusão. <strong>Esta ação é irreversível.</strong> Deixe os filtros em branco para ignorá-los. Se não selecionar nada e clicar em "Excluir", <strong>TUDO SERÁ APAGADO</strong>.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              <div className="lg:col-span-1">
                <label className="block text-[10px] font-medium text-red-800 mb-1">Período de Análise</label>
                <DateRangePicker
                  startDate={bulkDeleteFilters.startDate}
                  endDate={bulkDeleteFilters.endDate}
                  onChange={(s, e) => setBulkDeleteFilters({ ...bulkDeleteFilters, startDate: s, endDate: e })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-red-800 mb-1">Cluster</label>
                <select className="w-full border border-red-200 rounded p-1.5 text-xs bg-white focus:ring-red-500 focus:border-red-500" value={bulkDeleteFilters.cluster} onChange={e => setBulkDeleteFilters({ ...bulkDeleteFilters, cluster: e.target.value })}>
                  <option value="">Todos</option>
                  {options.clusters.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-red-800 mb-1">Filial</label>
                <select className="w-full border border-red-200 rounded p-1.5 text-xs bg-white focus:ring-red-500 focus:border-red-500" value={bulkDeleteFilters.branch} onChange={e => setBulkDeleteFilters({ ...bulkDeleteFilters, branch: e.target.value })}>
                  <option value="">Todas</option>
                  {options.branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-red-800 mb-1">Usuário</label>
                <select className="w-full border border-red-200 rounded p-1.5 text-xs bg-white focus:ring-red-500 focus:border-red-500" value={bulkDeleteFilters.technicianId} onChange={e => setBulkDeleteFilters({ ...bulkDeleteFilters, technicianId: e.target.value })}>
                  <option value="">Todos</option>
                  {users && users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="lg:col-span-4 flex justify-end mt-2">
                <Button onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700 text-white text-xs px-8 flex gap-2 items-center">
                  <Trash2 size={14} /> Excluir Registros Selecionados
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* --- FILTERS SECTION --- */}
        <div className="mb-6 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-slate-600 font-bold">
              <Filter size={16} />
              <span className="text-xs">Filtros Avançados</span>
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-[10px] flex items-center gap-1 text-red-600 hover:text-red-800 font-medium transition-colors">
                <RotateCcw size={10} /> Limpar Filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <DateRangePicker
              startDate={filters.startDate}
              endDate={filters.endDate}
              onChange={(start, end) => setFilters(prev => ({ ...prev, startDate: start, endDate: end }))}
            />
            <CustomSelect
              value={filters.cluster}
              onChange={(val) => updateFilter('cluster', val)}
              options={[{ label: 'Clusters', value: '' }, ...options.clusters.map(c => ({ label: c, value: c }))]}
              placeholder="Clusters"
            />
            <CustomSelect
              value={filters.branch}
              onChange={(val) => updateFilter('branch', val)}
              options={[{ label: 'Filiais', value: '' }, ...options.branches.map(b => ({ label: b, value: b }))]}
              placeholder="Filiais"
            />
            <CustomSelect
              value={filters.technician}
              onChange={(val) => updateFilter('technician', val)}
              options={[{ label: 'Técnicos', value: '' }, ...options.technicians.map(t => ({ label: t, value: t }))]}
              placeholder="Técnicos"
            />
            <CustomSelect
              value={filters.category}
              onChange={(val) => updateFilter('category', val)}
              options={[{ label: 'Categorias', value: '' }, ...options.categories.map(c => ({ label: c, value: c }))]}
              placeholder="Categorias"
            />
            <CustomSelect
              value={filters.reason}
              onChange={(val) => updateFilter('reason', val)}
              options={[{ label: 'Motivos', value: '' }, ...options.reasons.map(r => ({ label: r, value: r }))]}
              placeholder="Motivos"
            />
            <CustomSelect
              value={filters.escalation}
              onChange={(val) => updateFilter('escalation', val)}
              options={[{ label: 'Recorrência', value: '' }, ...options.escalations.map(e => ({ label: e, value: e }))]}
              placeholder="Recorrência"
            />
            <CustomSelect
              value={filters.status}
              onChange={(val) => updateFilter('status', val)}
              options={[{ label: 'Status', value: '' }, ...options.statuses.map(s => ({ label: s, value: s }))]}
              placeholder="Status"
            />
          </div>
        </div>

        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-[11px] text-left border-collapse table-fixed min-w-[850px]">
            <thead className="bg-[#940910] text-white font-bold border-b border-[#940910]">
              <tr>
                <th className="px-1.5 py-2 w-[75px] border-r border-white/20">Data/Hora</th>
                <th className="px-1.5 py-2 w-[75px] border-r border-white/20">Cluster</th>
                <th className="px-1.5 py-2 w-[100px] border-r border-white/20">Filial/Setor</th>
                <th className="px-1.5 py-2 w-[100px] border-r border-white/20">Técnico</th>
                <th className="px-1.5 py-2 w-[140px] border-r border-white/20">Ocorrência</th>
                <th className="px-1.5 py-2 w-[140px] border-r border-white/20">Motivo</th>
                <th className="px-1.5 py-2 w-[105px] border-r border-white/20">Recorrência</th>
                <th className="px-1.5 py-2 w-[85px] text-center border-r border-white/20">Status</th>
                <th className="px-1.5 py-2 text-center w-[60px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map(o => {
                const canEdit = o.status !== OccurrenceStatus.CONCLUIDA && o.status !== OccurrenceStatus.CANCELADA;
                return (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-1.5 py-2">
                      <div className="font-semibold text-[#404040] whitespace-nowrap">{formatDate(o.date)}</div>
                      <div className="text-[10px] text-slate-500">{o.time}</div>
                    </td>
                    <td className="px-1.5 py-2">
                      <div className="font-bold text-[9px] text-[#940910] bg-[#940910]/5 px-1 rounded inline-block truncate max-w-full" title={o.cluster}>{o.cluster || '-'}</div>
                    </td>
                    <td className="px-1.5 py-2">
                      <div className="font-bold text-[10px] text-[#404040] truncate" title={o.branch}>{o.branch || '-'}</div>
                      <div className="text-[9px] text-slate-500 truncate" title={o.sector}>{o.sector || '-'}</div>
                    </td>
                    <td className="px-1.5 py-2 text-[#404040] truncate font-medium" title={o.userName}>{o.userName}</td>
                    <td className="px-1.5 py-2">
                      <div className="font-medium text-[#404040] line-clamp-2 leading-tight" title={o.category}>{o.category}</div>
                    </td>
                    <td className="px-1.5 py-2">
                      <div className="text-[10px] text-slate-600 line-clamp-2 leading-tight" title={o.reason}>{o.reason}</div>
                    </td>
                    <td className="px-1.5 py-2">
                      <div className="flex items-center gap-1 overflow-hidden">
                        <ArrowUpCircle size={10} className={canEdit ? "text-[#940910]/50 shrink-0" : "text-slate-300 shrink-0"} />
                        <select
                          className={`bg-transparent border-none text-[9px] font-bold p-0 focus:ring-0 outline-none rounded transition-colors w-full truncate ${canEdit ? 'text-[#940910] cursor-pointer hover:bg-red-50' : 'text-slate-400 cursor-not-allowed'
                            }`}
                          value={o.escalationLevel || EscalationLevel.NONE}
                          onChange={(e) => onUpdateEscalation(o.id, e.target.value as EscalationLevel)}
                          disabled={!canEdit}
                        >
                          {Object.values(EscalationLevel).map(lvl => (
                            <option key={lvl} value={lvl}>{lvl}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-1.5 py-2 text-center"><Badge status={o.status} /></td>
                    <td className="px-1 py-2">
                      <div className="flex flex-wrap gap-0.5 justify-center">
                        {canEdit && (
                          <button onClick={() => onEdit(o)} className="p-1 text-slate-500 hover:text-[#940910] hover:bg-red-50 rounded" title="Editar">
                            <Pencil size={12} />
                          </button>
                        )}
                        <button onClick={() => onViewDetails(o)} className="p-1 text-slate-500 hover:bg-slate-100 rounded" title="Detalhes">
                          <Eye size={12} />
                        </button>
                        {o.status === OccurrenceStatus.REGISTRADA && (
                          <>
                            <button onClick={() => handleAction(o.id, 'COMPLETE')} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Concluir">
                              <CheckCircle size={12} />
                            </button>
                            <button onClick={() => handleAction(o.id, 'CANCEL')} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Cancelar">
                              <X size={12} />
                            </button>
                          </>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); onDelete(o.id); }} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Excluir">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Filter className="text-slate-200" size={32} />
                      <p className="text-xs">Nenhuma ocorrência encontrada.</p>
                      <Button variant="ghost" onClick={clearFilters} className="text-[#940910] text-xs">Limpar filtros</Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
