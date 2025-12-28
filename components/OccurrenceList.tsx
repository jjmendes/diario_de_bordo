import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Occurrence, OccurrenceStatus, UserRole, User, EscalationLevel } from '../types';
import { Card, Badge, Button, Modal, CustomSelect, DateRangePicker } from './UiComponents';
import { Filter, Eye, CheckCircle, X, ArrowUpCircle, RotateCcw, Pencil, MapPin, FileDown, Download, Trash2, Upload, RefreshCw, AlertOctagon, ChevronDown, Loader2 } from 'lucide-react';
import { SupabaseDB } from '../services/supabaseDb';

interface OccurrenceListProps {
  // occurrences prop removed - fetching internally
  users?: User[];
  currentUser: User;
  onUpdateStatus: (id: string, newStatus: OccurrenceStatus, feedback?: string) => Promise<void>;
  onUpdateEscalation: (id: string, newLevel: EscalationLevel) => Promise<void>;
  onViewDetails: (occurrence: Occurrence) => void;
  onEdit: (occurrence: Occurrence) => void;
  onDelete: (id: string) => Promise<void>;
}

export const OccurrenceList: React.FC<OccurrenceListProps> = ({ users = [], currentUser, onUpdateStatus, onUpdateEscalation, onViewDetails, onEdit, onDelete }) => {
  // --- Data States ---
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const [hasMore, setHasMore] = useState(true);

  // --- Filter States ---
  // --- Filter States ---
  // FIX: Default filter to Today to match Dashboard and User Request
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayString = `${year}-${month}-${day}`;

  const [filters, setFilters] = useState({
    startDate: todayString,
    endDate: todayString,
    technician: '',
    category: '',
    reason: '',
    escalation: '',
    status: '',
    branch: '',
    cluster: '',
    registeredBy: ''
  });

  const [debouncedSearch, setDebouncedSearch] = useState(''); // Global text search

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

  // --- Options (Derived from users prop and static lists, partially from loaded data for dynamic lists if needed) ---
  const options = useMemo(() => {
    // Ideally these should come from DB config/distinct queries. 
    // For now using what we have or static if possible. 
    // Since we don't have ALL occurrences, we can't derive 'all branches' from 'occurrences' state anymore.
    // We should probably rely on predefined lists or just allow text/search.
    // For now, let's keep empty or minimal to avoid breakage, or fetch config.
    // Fallback: Use unique values from CURRENTLY LOADED page (suboptimal) or rely on what App passed (App doesn't pass config).
    // Let's keep it simple: showing options from *loaded* data for now, or maybe we accept that dropdowns fill as you load more.
    return {
      technicians: users.map(u => u.name).sort(),
      // Categories/Reasons/Clusters/Branches: We might lose the full dropdown list if we only check loaded data.
      // This is a trade-off. We can fetch "all options" separately or just use text input.
      // Let's keep it simple: showing options from *loaded* data for now, or maybe we accept that dropdowns fill as you load more.
      categories: Array.from(new Set(occurrences.map(o => o.category))).sort(),
      reasons: Array.from(new Set(occurrences.map(o => o.reason))).sort(),
      escalations: Object.values(EscalationLevel),
      statuses: Object.values(OccurrenceStatus),
      branches: Array.from(new Set(occurrences.map(o => o.branch || ''))).filter(Boolean).sort(),
      clusters: Array.from(new Set(occurrences.map(o => o.cluster || ''))).filter(Boolean).sort()
    };
  }, [occurrences, users]);

  const fetchData = useCallback(async (isLoadMore = false) => {
    setLoading(true);
    const targetPage = isLoadMore ? page + 1 : 0;

    // Convert UI filters to Backend Params
    // Note: detailed filters (category, reason) are NOT in the backend getOccurrences yet (it supports generic 'search').
    // We update the backend call to pass 'search' combining these, or we update backend to support them.
    // For now, let's use the 'search' param for text-based fields if a specific filter isn't there.
    // Or better: pass them and if backend ignores, we might miss filtering.
    // Backend `getOccurrences` supports: startDate, endDate, status, cluster, branch, search.
    // It does NOT support: category, reason, technician (Directly), escalation.
    // We should construct a 'search' string for the unsupported ones? 
    // Or update backend. Let's start with supported ones and generic search.

    const backendFilters = {
      startDate: filters.startDate,
      endDate: filters.endDate,
      status: filters.status,
      cluster: filters.cluster,
      branch: filters.branch,
      search: debouncedSearch,

      technicianId: filters.technician, // Added support for technician filter
      registeredBy: filters.registeredBy
    };

    // Pass currentUser to enable backend hierarchy filtering
    const { data: resultData, count } = await SupabaseDB.getOccurrences(
      backendFilters,
      targetPage,
      pageSize,
      currentUser // Pass current user for RLS-like logic
    );

    if (isLoadMore) {
      setOccurrences(prev => [...prev, ...resultData]);
      setPage(targetPage);
    } else {
      setOccurrences(resultData);
      setPage(0);
    }

    setTotalCount(count);
    setHasMore(resultData.length === pageSize); // If we got full page, assume more might exist
    setLoading(false);

  }, [filters, debouncedSearch, page, pageSize]);

  // Initial Fetch & Filter Change
  useEffect(() => {
    fetchData(false);
  }, [filters, debouncedSearch, fetchData]); // Reset page on filter change

  const handleLoadMore = () => {
    fetchData(true);
  };

  const clearFilters = () => {
    // Reset to Today, not empty, as per default behavior
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayString = `${year}-${month}-${day}`;

    setFilters({ startDate: todayString, endDate: todayString, technician: '', category: '', reason: '', escalation: '', status: '', branch: '', cluster: '', registeredBy: '' });
    setDebouncedSearch('');
  };

  const hasActiveFilters = Object.values(filters).some(Boolean) || !!debouncedSearch;

  const handleAction = async (id: string, action: 'COMPLETE' | 'CANCEL') => {
    const newStatus = action === 'COMPLETE' ? OccurrenceStatus.CONCLUIDA : OccurrenceStatus.CANCELADA;
    await onUpdateStatus(id, newStatus);
    // Optimistic update
    setOccurrences(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
  };

  const updateFilter = (field: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-');
    return `${day} /${month}/${year} `;
  };

  // --- Handlers for Import/Export (Keeping logic mostly same but updating internal state refreshing) ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setPendingFileText(text);
        setImportModalOpen(true);
      };
      reader.readAsText(file);
    }
  };

  const confirmImport = async (mode: 'MERGE' | 'REPLACE') => {
    try {
      const result = await SupabaseDB.importOccurrencesFromCsv(pendingFileText, mode);
      alert(`Importação concluída!\nTotal na planilha: ${result.total} \nNovos inseridos: ${result.new} \nErros: ${result.errors.length} `);
      setImportModalOpen(false);
      setPendingFileText('');
      fetchData(false); // Refresh list
    } catch (e: any) {
      alert(`Erro na importação: ${e.message} `);
    }
  };

  const handleDownloadTemplate = () => {
    const header = "Data;Hora;Categoria;Motivo;Descricao;Status;Nivel_Escalonamento;Cluster;Filial;Setor;Audit_Trail_JSON;Feedback_JSON";
    const example = "2023-10-27;14:30;Rede;Queda de Link;Link principal down;REGISTRADA;;Regional Sul;PoA - Centro;TI;;";
    const blob = new Blob([`\uFEFF${header} \n${example} `], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo_importacao_ocorrencias.csv';
    link.click();
  };


  const handleExport = async () => {
    try {
      // Fetch ALL data matching current filters for export (up to 5000 records)
      const backendFilters = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        status: filters.status,
        cluster: filters.cluster,
        branch: filters.branch,
        search: [filters.category, filters.reason, filters.technician, debouncedSearch].filter(Boolean).join(' ')
      };

      const { data: allData } = await SupabaseDB.getOccurrences(backendFilters, 0, 5000);

      if (allData.length === 0) {
        alert("Não há dados para exportar com os filtros atuais.");
        return;
      }

      const header = "ID;Data;Hora;Técnico;Cluster;Filial;Setor;Categoria;Motivo;Descrição;Status;Recorrência;Feedback\n";
      const rows = allData.map(o =>
        `${o.id};${o.date};${o.time};${o.userName};${o.cluster || ''};${o.branch || ''};${o.sector || ''};${o.category};${o.reason};"${(o.description || '').replace(/"/g, '""')}";${o.status};${o.escalationLevel || ''};"${(o.feedback || '').replace(/"/g, '""')}"`
      ).join('\n');

      const blob = new Blob([`\uFEFF${header}${rows}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio_ocorrencias_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

    } catch (error) {
      console.error("Export error:", error);
      alert("Erro ao exportar dados. Tente novamente.");
    }
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
      const deletedCount = await SupabaseDB.deleteManyOccurrences({
        startDate: bulkDeleteFilters.startDate,
        endDate: bulkDeleteFilters.endDate,
        cluster: bulkDeleteFilters.cluster,
        branch: bulkDeleteFilters.branch,
        technicianId: bulkDeleteFilters.technicianId
      });

      alert(`Sucesso! ${deletedCount} ocorrências foram excluídas.`);
      fetchData(false);
    } catch (e: any) {
      console.error(e);
      alert(`Erro ao excluir ocorrências: ${e.message}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 mt-6 flex flex-col h-full">
      {/* Custom Header with Title and Action Buttons */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <h3 className="text-lg font-bold text-[#404040]">
          Lista de Ocorrências
          <span className="ml-2 text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {totalCount} registros
          </span>
        </h3>
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
          {/* ... Import Modal Content (Same as before) ... */}
          <div className="space-y-6">
            <div className="flex items-start gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
              <AlertOctagon size={24} className="text-blue-600 shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-blue-800">Selecione o Modo de Importação</h4>
                <p className="text-sm text-blue-700 mt-1">Você deseja apenas adicionar os novos registros ou substituir todas as ocorrências existentes?</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => confirmImport('MERGE')} className="flex flex-col items-center p-6 border-2 border-green-100 bg-green-50 hover:bg-green-100 hover:border-green-300 rounded-xl transition-all text-center group">
                <div className="bg-white p-3 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                  <RefreshCw size={28} className="text-green-600" />
                </div>
                <h3 className="font-bold text-green-800">Acrescentar</h3>
                <p className="text-xs text-green-700 mt-1">Adiciona novas ocorrências.<br />Mantém os registros existentes.</p>
              </button>
              <button onClick={() => confirmImport('REPLACE')} className="flex flex-col items-center p-6 border-2 border-red-100 bg-red-50 hover:bg-red-100 hover:border-red-300 rounded-xl transition-all text-center group">
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
              <Download size={16} /> Exportar Dados Carregados (CSV)
            </h4>
            <p className="text-xs text-slate-500 mb-2">Nota: Esta exportação inclui apenas os dados atualmente visíveis na lista.</p>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <Button onClick={handleExport} className="bg-[#940910] hover:bg-[#7a060c] text-white text-xs">
                Baixar Relatório
              </Button>
            </div>
          </div>
        )}

        {/* --- BULK DELETE MENU (ADMIN ONLY) --- */}
        {showBulkDeleteMenu && currentUser.role === UserRole.ADMIN && (
          <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-lg animate-in fade-in slide-in-from-top-2">
            {/* ... Bulk delete content same as before ... */}
            <h4 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
              <Trash2 size={16} /> Exclusão em Lote (Cuidado!)
            </h4>
            <p className="text-xs text-red-600 mb-4">
              Selecione os critérios para exclusão. <strong>Esta ação é irreversível.</strong> Deixe os filtros em branco para ignorá-los.
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">

            {/* Left Side: Title + Date Picker */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
              <div className="flex items-center gap-2 text-slate-600 font-bold whitespace-nowrap">
                <Filter size={16} />
                <span className="text-xs">Filtros Avançados</span>
              </div>

              <div className="w-full md:w-auto">
                <DateRangePicker
                  startDate={filters.startDate}
                  endDate={filters.endDate}
                  onChange={(start, end) => setFilters(prev => ({ ...prev, startDate: start, endDate: end }))}
                />
              </div>
            </div>

            {/* Right Side: Search + Clear */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <input
                type="text"
                placeholder="Buscar por texto..."
                className="border rounded p-1.5 text-xs w-full md:w-64"
                value={debouncedSearch}
                onChange={e => setDebouncedSearch(e.target.value)}
              />

              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-[10px] flex items-center gap-1 text-red-600 hover:text-red-800 font-medium transition-colors whitespace-nowrap ml-2" title="Limpar Filtros">
                  <RotateCcw size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {/* Removed Search and Date from here */}
            {/* User Filter (Creator) */}
            <CustomSelect
              value={filters.registeredBy}
              onChange={(val) => updateFilter('registeredBy', val)}
              options={[{ label: 'Usuário (Criador)', value: '' }, ...users.map(u => ({ label: u.name, value: u.id })).sort((a, b) => a.label.localeCompare(b.label))]}
              placeholder="Usuário"
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
            {/* Other filters like Technician, Category, Reason - kept visually but using 'search' logic in backend as fallback */}
          </div>
        </div>

        {/* --- TABLE --- */}
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-[11px] text-left border-collapse table-fixed min-w-[850px]">
            <thead className="bg-[#940910] text-white font-bold border-b border-[#940910]">
              <tr>
                <th className="px-1.5 py-2 w-[75px] border-r border-white/20">Data/Hora</th>
                <th className="px-1.5 py-2 w-[65px] border-r border-white/20">Usuário</th>
                <th className="px-1.5 py-2 w-[75px] border-r border-white/20">Cluster</th>
                <th className="px-1.5 py-2 w-[100px] border-r border-white/20">Filial/Setor</th>
                <th className="px-1.5 py-2 w-[100px] border-r border-white/20">Técnico</th>
                <th className="px-1.5 py-2 w-[140px] border-r border-white/20">Ocorrência</th>
                <th className="px-1.5 py-2 w-[140px] border-r border-white/20">Motivo</th>
                <th className="px-1.5 py-2 w-[105px] border-r border-white/20">Recorrência</th>
                <th className="px-1.5 py-2 w-[85px] text-center border-r border-white/20">Status</th>
                <th className="px-1.5 py-2 text-center w-[65px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">

              {occurrences.map(o => {
                const canEdit = o.status !== OccurrenceStatus.CONCLUIDA && o.status !== OccurrenceStatus.CANCELADA;
                return (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-1.5 py-2">
                      <div className="font-semibold text-[#404040] whitespace-nowrap">{formatDate(o.date)}</div>
                      <div className="text-[10px] text-slate-500">{o.time?.slice(0, 5)}</div>
                    </td>
                    <td className="px-1.5 py-2">
                      <div className="text-[10px] text-slate-500 truncate max-w-[85px]" title={o.creatorName || '-'}>
                        {o.creatorName ? o.creatorName.split(' ')[0] : '-'}
                      </div>
                    </td>
                    <td className="px-1.5 py-2">
                      <div className="font-bold text-[9px] text-[#940910] bg-[#940910]/5 px-1 rounded inline-block truncate max-w-full" title={o.cluster}>{o.cluster || '-'}</div>
                    </td>
                    <td className="px-1.5 py-2">
                      <div className="font-bold text-[10px] text-[#404040] truncate" title={o.branch}>{o.branch || '-'}</div>
                      <div className="text-[9px] text-slate-500 truncate" title={o.sector}>{o.sector || '-'}</div>
                    </td>
                    <td className="px-1.5 py-2 text-[#404040] font-medium whitespace-normal leading-tight" title={o.userName}>{o.userName}</td>
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
                          className={`bg-transparent border-none text-[9px] font-bold p-0 focus:ring-0 outline-none rounded transition-colors w-full truncate ${canEdit ? 'text-[#940910] cursor-pointer hover:bg-red-50' : 'text-slate-400 cursor-not-allowed'}`}
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
              {occurrences.length === 0 && !loading && (
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

        {/* --- LOAD MORE / PAGINATION CONTROL --- */}
        {hasMore && (
          <div className="flex justify-center p-4 border-t border-slate-100">
            <Button
              onClick={handleLoadMore}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2 text-[#940910] border-[#940910]/20 hover:bg-[#940910]/5"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <ChevronDown size={16} />}
              {loading ? 'Carregando...' : 'Carregar Mais Ocorrências'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
