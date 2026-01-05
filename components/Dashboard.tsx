import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, LabelList, Cell, Legend
} from 'recharts';
import { Occurrence, EscalationLevel, OccurrenceStatus } from '../types';
import { Card, Modal, Badge, CustomSelect, DateRangePicker } from './UiComponents';
import { Filter, Calendar, MapPin, BarChart2, Activity, Table as TableIcon, Trophy, Users, Grid, CheckCircle2, AlertCircle, Clock, X, Layers, Loader2 } from 'lucide-react';
import { SupabaseDB } from '../services/supabaseDb';

// Brand Palette
const COLORS = ['#940910', '#F6B700', '#404040', '#7a060c', '#b38600', '#8c8c8c'];

interface DashboardProps {
  // Removed 'occurrences' prop as we fetch data internally for scalability
}

export const Dashboard: React.FC<DashboardProps> = () => {
  // --- Global Filters State ---
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayString = `${year}-${month}-${day}`;

  // Calculate First and Last day of Current Month
  const firstDayString = `${year}-${month}-01`;
  const lastDayOfCurrentMonth = new Date(year, today.getMonth() + 1, 0).getDate();
  const lastDayString = `${year}-${month}-${String(lastDayOfCurrentMonth).padStart(2, '0')}`;

  const currentYear = year.toString();
  const currentMonth = (today.getMonth() + 1).toString();

  // Helper to load from Session Storage
  const loadState = (key: string, defaultVal: string) => sessionStorage.getItem(`dashboard_${key}`) || defaultVal;

  const [dateStart, setDateStart] = useState(() => loadState('dateStart', firstDayString));
  const [dateEnd, setDateEnd] = useState(() => loadState('dateEnd', lastDayString));
  const [selectedCluster, setSelectedCluster] = useState(() => loadState('cluster', ''));
  const [selectedBranch, setSelectedBranch] = useState(() => loadState('branch', ''));
  const [selectedSector, setSelectedSector] = useState(() => loadState('sector', ''));
  const [selectedSupervisor, setSelectedSupervisor] = useState(() => loadState('supervisor', ''));

  // Save to Session Storage on Change
  useEffect(() => { sessionStorage.setItem('dashboard_dateStart', dateStart); }, [dateStart]);
  useEffect(() => { sessionStorage.setItem('dashboard_dateEnd', dateEnd); }, [dateEnd]);
  useEffect(() => { sessionStorage.setItem('dashboard_cluster', selectedCluster); }, [selectedCluster]);
  useEffect(() => { sessionStorage.setItem('dashboard_branch', selectedBranch); }, [selectedBranch]);
  useEffect(() => { sessionStorage.setItem('dashboard_sector', selectedSector); }, [selectedSector]);
  useEffect(() => { sessionStorage.setItem('dashboard_supervisor', selectedSupervisor); }, [selectedSupervisor]);

  // --- Comparative Chart State ---
  const [matrixGroupBy, setMatrixGroupBy] = useState<'SUPERVISOR' | 'SECTOR'>('SUPERVISOR');
  const [comparativeData, setComparativeData] = useState<any[]>([]);
  const [comparativeLoading, setComparativeLoading] = useState(false);

  // --- Loading States ---
  const [loading, setLoading] = useState(true);
  const [rankingLoading, setRankingLoading] = useState(true);

  // --- Data States (Server Side Aggregated) ---
  const [metrics, setMetrics] = useState<any>({
    kpi: { total: 0, treated: 0, percentage: 0, pending: 0 },
    category_counts: [],
    pareto_reasons: [],
    matrix_category: [],
    matrix_cluster: []
  });

  const [rankingData, setRankingData] = useState<any[]>([]);

  // --- Filter Options States (Fetched separately) ---
  const [availableClusters, setAvailableClusters] = useState<string[]>([]);
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [availableSectors, setAvailableSectors] = useState<string[]>([]); // Derived from Branch Data Map
  const [availableSupervisors, setAvailableSupervisors] = useState<{ id: string, name: string }[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableReasons, setAvailableReasons] = useState<string[]>([]); // All reasons flattening
  const [geoStructure, setGeoStructure] = useState<any[]>([]); // Full hierarchy for local filtering

  // --- Pareto Specific Filter State ---
  const [paretoCategory, setParetoCategory] = useState(''); // Not used in RPC yet? Or RPC returns global. 
  // Note: The RPC `get_dashboard_metrics` calculates Pareto globally based on main filters.
  // If we want to filter Pareto by Category, we would need to pass it to RPC or filter locally if we had raw data (which we don't).
  // Current RPC implementation for Pareto applies GLOBAL filters (Date, Cluster, etc). 
  // To support "Pareto Category Filter" specifically for the chart, we might need to update RPC or accept it applies global filters.
  // Let's assume for now Pareto follows global filters. If user wants specific category pareto, they can filter the main dashboard by Category?
  // Wait, the UI had a specific dropdown for Pareto. The RPC v1 I wrote didn't take 'Pareto Category'.
  // I will disable that specific dropdown for now or treat it as a future enhancement to update RPC.
  // Actually, I'll hide the specific dropdown to simplify, as global filters are powerful enough.

  // --- Ranking Specific Filter State ---
  const [rankingYear, setRankingYear] = useState(currentYear);
  const [rankingMonth, setRankingMonth] = useState(currentMonth);
  const [rankingCategory, setRankingCategory] = useState('');
  const [rankingReason, setRankingReason] = useState('');

  // --- Pareto Specific Filter State ---
  const [paretoData, setParetoData] = useState<any[]>([]);
  const [paretoLoading, setParetoLoading] = useState(false);
  const [paretoFilters, setParetoFilters] = useState({
    cluster: '',
    branch: '',
    category: ''
  });

  // --- KPI Modal State (Drill Down) ---
  // Since we don't have raw rows, we must FETCH drill down data when modal opens.
  const [detailsModalType, setDetailsModalType] = useState<'ALL' | 'PENDING' | 'TREATED' | null>(null);
  const [modalOccurrences, setModalOccurrences] = useState<Occurrence[]>([]);
  const [loadingModal, setLoadingModal] = useState(false);

  // --- INITIAL DATA FETCH (Options) ---
  useEffect(() => {
    const loadOptions = async () => {
      // Load Geo Structure
      const geo = await SupabaseDB.getGeoHierarchy();
      setGeoStructure(geo);
      setAvailableClusters(geo.map(c => c.name));

      // Load Reasons/Categories
      const reasonTree = await SupabaseDB.getReasonHierarchy();
      setAvailableCategories(reasonTree.map(r => r.category));
      const allReasons = reasonTree.flatMap(r => r.reasons);
      setAvailableReasons([...new Set(allReasons)].sort());

      // Load Supervisors
      const supervisors = await SupabaseDB.getAllSupervisorsForFilter();
      setAvailableSupervisors(supervisors);
    };
    loadOptions();
  }, []);

  // --- LOAD BRANCHES/SECTORS when Cluster changes ---
  useEffect(() => {
    const updateBranches = async () => {
      if (!selectedCluster) {
        setAvailableBranches([]);
        return;
      }
      const geo = await SupabaseDB.getGeoHierarchy();
      const cluster = geo.find(c => c.name === selectedCluster);
      if (cluster) {
        setAvailableBranches(cluster.branches.map(b => b.name).sort());
      } else {
        setAvailableBranches([]);
      }
    };
    updateBranches();
  }, [selectedCluster]);

  // --- LOAD SECTORS when Branch changes ---
  useEffect(() => {
    const updateSectors = async () => {
      if (!selectedBranch) {
        setAvailableSectors([]);
        return;
      }
      const map = await SupabaseDB.getBranchDataMap();
      const sectors = map[selectedBranch] || [];
      setAvailableSectors(sectors.sort());
    };
    updateSectors();
  }, [selectedBranch]);

  // --- FETCH MAIN METRICS ---
  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      // We pass global filters
      // Handle Date Filters: Default to "All Time" (from 2024) if cleared
      const effectiveStartDate = dateStart || '2024-01-01';
      const effectiveEndDate = dateEnd || todayString;

      const data = await SupabaseDB.getDashboardMetrics({
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        cluster: selectedCluster || undefined,
        branch: selectedBranch || undefined,
        sector: selectedSector || undefined,
        supervisorId: selectedSupervisor || undefined
      });
      console.log('Metrics Fetched:', data); // DEBUG LOG

      // Calculate Percentage locally if not in RPC (RPC returns total/treated/pending)
      const total = data.kpi.total || 0;
      const treated = data.kpi.treated || 0;
      const pct = total > 0 ? Math.round((treated / total) * 100) : 0;
      data.kpi.percentage = pct; // Inject

      // Pareto Cumulative Calculation (Client Side post-processing of Top 20)
      const paretoRaw = data.pareto_reasons || [];
      const paretoTotal = paretoRaw.reduce((sum: number, item: any) => sum + parseInt(item.count), 0);
      let cumulative = 0;
      const paretoProcessed = paretoRaw.map((item: any) => {
        const count = parseInt(item.count);
        cumulative += count;
        return {
          name: item.name,
          count: count,
          cumulativePercentage: paretoTotal === 0 ? 0 : Math.round((cumulative / paretoTotal) * 100)
        };
      });
      data.pareto_reasons = paretoProcessed;

      setMetrics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [dateStart, dateEnd, selectedCluster, selectedBranch, selectedSector, selectedSupervisor]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // --- FETCH PARETO METRICS (Independent) ---
  const fetchParetoMetrics = useCallback(async () => {
    setParetoLoading(true);
    try {
      const pCluster = paretoFilters.cluster || selectedCluster;
      const pBranch = paretoFilters.branch || selectedBranch;

      // Handle Date Filters: Default to "All Time" (from 2024) if cleared
      const effectiveStartDate = dateStart || '2024-01-01';
      const effectiveEndDate = dateEnd || todayString;

      const rawData = await SupabaseDB.getParetoChartData({
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        cluster: pCluster || undefined,
        branch: pBranch || undefined,
        category: paretoFilters.category || undefined
      });

      // Calculate Cumulative Percentage
      const total = rawData.reduce((sum: number, item: any) => sum + parseInt(item.count), 0);
      let cumulative = 0;
      const processed = rawData.map((item: any) => {
        const count = parseInt(item.count);
        cumulative += count;
        return {
          name: item.name,
          count: count,
          cumulativePercentage: total === 0 ? 0 : Math.round((cumulative / total) * 100)
        };
      });
      setParetoData(processed);
    } catch (err) {
      console.error(err);
    } finally {
      setParetoLoading(false);
    }
  }, [dateStart, dateEnd, selectedCluster, selectedBranch, paretoFilters]);

  useEffect(() => {
    fetchParetoMetrics();
  }, [fetchParetoMetrics]);

  // --- FETCH COMPARATIVE MATRIX ---
  useEffect(() => {
    const fetchComparative = async () => {
      setComparativeLoading(true);
      try {
        // Handle Date Filters: Default to "All Time" (from 2024) if cleared
        const effectiveStartDate = dateStart || '2024-01-01';
        const effectiveEndDate = dateEnd || todayString;

        const data = await SupabaseDB.getComparativeMatrix({
          startDate: effectiveStartDate,
          endDate: effectiveEndDate,
          cluster: selectedCluster || undefined,
          branch: selectedBranch || undefined,
          sector: selectedSector || undefined,
          supervisorId: selectedSupervisor || undefined,
          groupBy: matrixGroupBy
        });

        // Transform for Recharts:
        // Input: [{ name: 'Sup1', categories: { 'CatA': 10, 'CatB': 5 } }]
        // Output: [{ name: 'Sup1', 'CatA': 10, 'CatB': 5 }]
        const transformed = data.map((d: any) => ({
          name: d.name,
          ...d.categories
        }));
        setComparativeData(transformed);
      } catch (e) {
        console.error(e);
      } finally {
        setComparativeLoading(false);
      }
    };
    fetchComparative();
  }, [dateStart, dateEnd, selectedCluster, selectedBranch, selectedSector, selectedSupervisor, matrixGroupBy]);

  // --- FETCH RANKING ---
  useEffect(() => {
    const fetchRanking = async () => {
      setRankingLoading(true);
      try {
        const data = await SupabaseDB.getTechnicianRanking({
          year: rankingYear || undefined,
          month: rankingMonth || undefined,
          category: rankingCategory || undefined,
          reason: rankingReason || undefined
        });
        setRankingData(data);
      } catch (e) { console.error(e); }
      finally { setRankingLoading(false); }
    };
    fetchRanking();
  }, [rankingYear, rankingMonth, rankingCategory, rankingReason]);

  // --- FETCH MODAL DRILL DOWN ---
  useEffect(() => {
    if (!detailsModalType) {
      setModalOccurrences([]);
      return;
    }

    const fetchDrillDown = async () => {
      setLoadingModal(true);
      // Re-use getOccurrences but with filters matching the dashboard
      // Status logic:
      let statusFilter = 'ALL';
      if (detailsModalType === 'TREATED') statusFilter = OccurrenceStatus.CONCLUIDA;
      if (detailsModalType === 'PENDING') statusFilter = 'PENDING'; // Special handling needed in getOccurrences? 
      // Actually getOccurrences takes 'status'. 'PENDING' is not a DB status.
      // We might need to fetch ALL and filter or update getOccurrences to support 'NOT_CONCLUIDA'
      // For now, let's fetch 'ALL' and filter client side if the list is small (it's drill down, paginated usually).
      // But we want to avoid fetching 1000s.
      // Let's assume pagination 0-100 for drill down is enough.

      // Map 'PENDING' to a status? No, it means != CONCLUIDA. 
      // SupabaseDB.getOccurrences doesn't support '!=', so we fetch basic and filtered client side?
      // BETTER: Use the existing logic but recognize 'ALL' might be huge.
      // Let's modify getting 100 records for the modal.

      const filters: any = {
        startDate: dateStart,
        endDate: dateEnd,
        cluster: selectedCluster || 'ALL',
        branch: selectedBranch || 'ALL'
      };

      if (detailsModalType === 'TREATED') filters.status = OccurrenceStatus.CONCLUIDA;
      // PENDING logic implies status != CONCLUIDA. getOccurrences doesn't support != directly. 
      // We will fetch up to 100 records and filter locally or just show all for now if Type is PENDING

      const { data } = await SupabaseDB.getOccurrences(filters, 0, 100);
      // Client side filter for PENDING if needed
      let filtered = data;
      if (detailsModalType === 'PENDING') {
        filtered = data.filter(d => d.status !== OccurrenceStatus.CONCLUIDA);
      }
      setModalOccurrences(filtered);
      setLoadingModal(false);
    };
    fetchDrillDown();
  }, [detailsModalType, dateStart, dateEnd, selectedCluster, selectedBranch]);


  // Helpers for Filter Selects
  const years = Array.from({ length: 5 }, (_, i) => (year - i).toString());
  const months = [
    { v: '1', l: 'Janeiro' }, { v: '2', l: 'Fevereiro' }, { v: '3', l: 'Março' }, { v: '4', l: 'Abril' },
    { v: '5', l: 'Maio' }, { v: '6', l: 'Junho' }, { v: '7', l: 'Julho' }, { v: '8', l: 'Agosto' },
    { v: '9', l: 'Setembro' }, { v: '10', l: 'Outubro' }, { v: '11', l: 'Novembro' }, { v: '12', l: 'Dezembro' }
  ];

  // Formatting Helpers
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const [y, m, d] = dateString.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="space-y-8">
      {/* --- GLOBAL FILTER LOADING OVERLAY --- */}
      {loading && (
        <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-xl border border-slate-200 z-50 flex items-center gap-3 animate-in slide-in-from-bottom-10">
          <Loader2 className="animate-spin text-[#940910]" />
          <span className="text-sm font-bold text-slate-600">Atualizando Indicadores...</span>
        </div>
      )}

      {/* --- GLOBAL DASHBOARD FILTERS --- */}
      <Card className="bg-white border-l-4 border-slate-200 border-l-[#940910] shadow-sm">
        <div className="flex flex-col md:flex-row items-end md:items-center gap-4">
          <div className="flex items-center gap-2 text-[#940910] font-bold mr-auto">
            <Filter size={20} />
            <span>Filtros Globais</span>
          </div>

          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-end">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                <Calendar size={12} /> Período de Análise
              </label>
              <DateRangePicker
                startDate={dateStart}
                endDate={dateEnd}
                onChange={(start, end) => { setDateStart(start); setDateEnd(end); }}
              />
            </div>

            <div className="w-full md:w-48">
              <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                <MapPin size={12} /> Cluster
              </label>
              <CustomSelect
                value={selectedCluster}
                onChange={(val) => { setSelectedCluster(val); setSelectedBranch(''); setSelectedSector(''); }}
                options={[
                  { label: 'Todos os Clusters', value: '' },
                  ...availableClusters.map(c => ({ label: c, value: c }))
                ]}
                placeholder="Todos os Clusters"
              />
            </div>
            <div className="w-full md:w-32">
              <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                <MapPin size={12} /> Filial
              </label>
              <CustomSelect
                value={selectedBranch}
                onChange={(val) => { setSelectedBranch(val); setSelectedSector(''); }}
                options={[
                  { label: 'Todas', value: '' },
                  ...availableBranches.map(b => ({ label: b, value: b }))
                ]}
                placeholder="Todas"
              />
            </div>
            {/* Added: Sector Filter */}
            <div className="w-full md:w-32">
              <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                <Grid size={12} /> Setor
              </label>
              <CustomSelect
                value={selectedSector}
                onChange={(val) => setSelectedSector(val)}
                options={[
                  { label: 'Todos', value: '' },
                  ...availableSectors.map(s => ({ label: s, value: s }))
                ]}
                placeholder="Todos"
              />
            </div>
            {/* Added: Supervisor Filter */}
            <div className="w-full md:w-48">
              <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                <Users size={12} /> Supervisor
              </label>
              <CustomSelect
                value={selectedSupervisor}
                onChange={(val) => setSelectedSupervisor(val)}
                options={[
                  { label: 'Todos', value: '' },
                  ...availableSupervisors.map(s => ({ label: s.name, value: s.id }))
                ]}
                placeholder="Todos"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* --- KPI CARDS (CLICKABLE) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          onClick={() => setDetailsModalType('ALL')}
          className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group"
        >
          <div className="absolute right-0 top-0 h-full w-2 bg-[#940910]"></div>
          <div>
            <p className="text-slate-500 font-medium text-sm mb-1 group-hover:text-[#940910]">Total Ocorrências</p>
            <h3 className="text-4xl font-bold text-[#404040]">{metrics.kpi.total}</h3>
            <p className="text-xs text-slate-400 mt-2">No período selecionado</p>
          </div>
          <div className="bg-[#940910]/10 p-4 rounded-full text-[#940910] group-hover:bg-[#940910] group-hover:text-white transition-colors">
            <AlertCircle size={32} />
          </div>
        </div>

        <div
          onClick={() => setDetailsModalType('PENDING')}
          className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group"
        >
          <div className="absolute right-0 top-0 h-full w-2 bg-[#F6B700]"></div>
          <div>
            <p className="text-slate-500 font-medium text-sm mb-1 group-hover:text-[#b38600]">Pendentes</p>
            <h3 className="text-4xl font-bold text-[#b38600]">{metrics.kpi.pending}</h3>
            <p className="text-xs text-[#b38600] mt-2 font-bold">Aguardando tratamento</p>
          </div>
          <div className="bg-[#F6B700]/10 p-4 rounded-full text-[#b38600] group-hover:bg-[#F6B700] group-hover:text-white transition-colors">
            <Clock size={32} />
          </div>
        </div>

        <div
          onClick={() => setDetailsModalType('TREATED')}
          className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group"
        >
          <div className="absolute right-0 top-0 h-full w-2 bg-emerald-500"></div>
          <div>
            <p className="text-slate-500 font-medium text-sm mb-1 group-hover:text-emerald-600">Ocorrências Tratadas</p>
            <h3 className="text-4xl font-bold text-emerald-600">{metrics.kpi.treated}</h3>
            <p className="text-xs text-emerald-600 mt-2 font-bold">{metrics.kpi.percentage}% Resolvido</p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-full text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
            <CheckCircle2 size={32} />
          </div>
        </div>
      </div>

      {/* --- KPI DETAILS MODAL --- */}
      <Modal isOpen={!!detailsModalType} onClose={() => setDetailsModalType(null)} title={detailsModalType === 'PENDING' ? 'Pendentes' : 'Detalhes'}>
        <div className="max-h-[60vh] overflow-y-auto">
          {loadingModal ? (
            <div className="p-10 text-center text-slate-500"><Loader2 className="animate-spin mb-2 mx-auto" /> Carregando lista...</div>
          ) : (
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-[#940910] text-white text-xs uppercase sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 border-r border-white/20">Data</th>
                  <th className="px-3 py-2">Técnico</th>
                  <th className="px-3 py-2">Ocorrência</th>
                  <th className="px-3 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {modalOccurrences.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50 border-b border-slate-100">
                    <td className="px-3 py-2 text-xs">{formatDate(o.date)} {o.time}</td>
                    <td className="px-3 py-2 text-xs font-bold">{o.userName}</td>
                    <td className="px-3 py-2 text-xs">{o.category} - {o.reason}</td>
                    <td className="px-3 py-2 text-center"><Badge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Modal>

      {/* --- STACKED CONTAINER --- */}
      <div className="flex flex-col gap-8">
        {/* --- CHART 1: OCCURRENCES BY TYPE --- */}
        <Card title="Tipo de Ocorrência" className="flex flex-col w-full">
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.category_counts} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fill: '#404040', fontSize: 11 }} angle={-25} textAnchor="end" interval={0} height={80} />
                <YAxis tick={{ fill: '#404040', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="count" name="Qtd. Ocorrências" fill="#940910" radius={[4, 4, 0, 0]} barSize={50}>
                  <LabelList dataKey="count" position="top" fill="#404040" fontSize={12} fontWeight="bold" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* --- CHART 2: PARETO CHART --- */}
        <Card className="flex flex-col w-full overflow-visible">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-slate-100 pb-4">
            <div className="mb-2 sm:mb-0">
              <h3 className="font-bold text-[#404040] text-lg flex items-center gap-2">
                <Activity size={20} className="text-[#F6B700]" />
                Pareto (Motivos Ofensores)
              </h3>
            </div>
            {/* Pareto Filters */}
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <div className="w-32">
                <CustomSelect
                  value={paretoFilters.category}
                  onChange={(v) => setParetoFilters(prev => ({ ...prev, category: v }))}
                  options={[{ label: 'Categoria', value: '' }, ...availableCategories.map(c => ({ label: c, value: c }))]}
                  placeholder="Categoria"
                  className="h-8 text-xs"
                />
              </div>
              <div className="w-32">
                <CustomSelect
                  value={paretoFilters.cluster}
                  onChange={(v) => setParetoFilters(prev => ({ ...prev, cluster: v, branch: '' }))}
                  options={[{ label: 'Cluster', value: '' }, ...availableClusters.map(c => ({ label: c, value: c }))]}
                  placeholder="Cluster"
                  className="h-8 text-xs"
                />
              </div>
              <div className="w-32">
                {/* Logic to filter branches based on Pareto Cluster OR Global Cluster if Pareto is empty */}
                {(() => {
                  const activeClusterName = paretoFilters.cluster || selectedCluster;
                  const activeCluster = geoStructure.find(c => c.name === activeClusterName);
                  const pBranches = activeCluster ? activeCluster.branches.map((b: any) => b.name).sort() : [];

                  return (
                    <CustomSelect
                      value={paretoFilters.branch}
                      onChange={(v) => setParetoFilters(prev => ({ ...prev, branch: v }))}
                      options={[{ label: 'Filial', value: '' }, ...pBranches.map((b: string) => ({ label: b, value: b }))]}
                      placeholder="Filial"
                      className="h-8 text-xs"
                    />
                  );
                })()}
              </div>
            </div>
          </div>
          <div className="h-[500px] w-full flex-1 relative">
            {paretoLoading && <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center"><Loader2 className="animate-spin text-[#940910]" /></div>}
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={paretoData} margin={{ top: 20, right: 30, left: 20, bottom: 120 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fill: '#404040', fontSize: 11 }} angle={-25} textAnchor="end" interval={0} height={100} />
                <YAxis yAxisId="left" tick={{ fill: '#404040', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: '#F6B700', fontSize: 12 }} unit="%" axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Bar yAxisId="left" dataKey="count" fill="#940910" barSize={60} radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="count" position="top" fill="#404040" fontSize={12} fontWeight="bold" offset={5} />
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="cumulativePercentage" stroke="#F6B700" strokeWidth={3} dot={{ r: 4, fill: '#F6B700' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* --- CHART 3: ESCALATION MATRIX TABLE --- */}
        {/* --- CHART 3: ESCALATION MATRIX TABLE --- */}
        <Card className="w-full overflow-visible">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-slate-100 pb-4">
            <h3 className="font-bold text-[#404040] text-lg flex items-center gap-2">
              <Grid size={20} className="text-[#940910]" />
              Matriz de Escalonamento por Ocorrência
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-[#940910] text-white">
                  <th className="p-3 border-r border-white/20 w-1/2">Categoria</th>
                  {Object.values(EscalationLevel).map(lvl => <th key={lvl} className="p-3 text-center border-r border-white/20">{lvl}</th>)}
                  <th className="p-3 text-center font-bold bg-[#F6B700] text-[#404040]">Total</th>
                </tr>
              </thead>
              <tbody>
                {metrics.matrix_category.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 bg-white text-[#404040]">
                    <td className="p-3 font-bold text-xs text-[#940910]">{row.category}</td>
                    {Object.values(EscalationLevel).map(lvl => {
                      const val = row.counts[lvl] || 0;
                      return <td key={lvl} className={`p-3 text-center border-l border-slate-100 ${val > 0 ? 'font-bold text-[#940910] bg-red-50' : 'text-slate-300'}`}>{val || '-'}</td>
                    })}
                    <td className="p-3 text-center font-bold bg-slate-50 border-l border-slate-200">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* --- NEW CHART: COMPARATIVE MATRIX (Dynamic) --- */}
        <Card className="flex flex-col w-full overflow-visible">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-slate-100 pb-4">
            <div className="mb-2 sm:mb-0">
              <h3 className="font-bold text-[#404040] text-lg flex items-center gap-2">
                <BarChart2 size={20} className="text-[#940910]" />
                Análise Comparativa de Ocorrências
              </h3>
            </div>
            <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setMatrixGroupBy('SUPERVISOR')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${matrixGroupBy === 'SUPERVISOR' ? 'bg-white text-[#940910] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Por Supervisor
              </button>
              <button
                onClick={() => setMatrixGroupBy('SECTOR')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${matrixGroupBy === 'SECTOR' ? 'bg-white text-[#940910] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Por Setor
              </button>
            </div>
          </div>
          <div className="w-full relative overflow-x-auto">
            {comparativeLoading && <div className="p-10 text-center text-slate-500"><Loader2 className="animate-spin mb-2 mx-auto" /> Carregando comparativo...</div>}

            {!comparativeLoading && comparativeData.length === 0 && (
              <div className="p-10 text-center text-slate-400 text-sm">Nenhum dado encontrado para os filtros selecionados.</div>
            )}

            {!comparativeLoading && comparativeData.length > 0 && (() => {
              // Calculate columns once
              const dataKeys = Array.from(new Set(comparativeData.flatMap(d => Object.keys(d).filter(k => k !== 'name')))).sort();

              return (
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-[#940910] text-white">
                      <th className="p-3 border-r border-white/20 whitespace-nowrap sticky left-0 z-10 bg-[#940910] min-w-[200px]">
                        {matrixGroupBy === 'SUPERVISOR' ? 'Supervisor' : 'Setor'}
                      </th>
                      {dataKeys.map(cat => (
                        <th key={cat} className="p-3 text-center border-r border-white/20 whitespace-nowrap min-w-[100px] text-xs">
                          {cat}
                        </th>
                      ))}
                      <th className="p-3 text-center font-bold bg-[#F6B700] text-[#404040] min-w-[80px]">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparativeData.map((row: any, idx) => {
                      const rowTotal = dataKeys.reduce<number>((sum, key) => {
                        const val = row[key as string];
                        return sum + (typeof val === 'number' ? val : 0);
                      }, 0);

                      return (
                        <tr key={idx} className="hover:bg-slate-50 bg-white text-[#404040] border-b border-slate-100">
                          <td className="p-3 font-bold text-xs text-[#940910] sticky left-0 z-10 bg-white border-r border-slate-100">
                            {row.name}
                          </td>
                          {dataKeys.map(cat => {
                            const val = row[cat as string];
                            return (
                              <td key={cat} className={`p-3 text-center border-l border-slate-100 text-xs ${val ? 'font-bold text-[#940910] bg-red-50' : 'text-slate-300'}`}>
                                {val || '-'}
                              </td>
                            );
                          })}
                          <td className="p-3 text-center font-bold bg-slate-50 border-l border-slate-200">
                            {rowTotal}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </Card>

        {/* --- CHART 5: RANKING TECHNICIANS --- */}
        <Card className="flex flex-col w-full overflow-visible">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-slate-100 pb-4">
            <div className="mb-2 sm:mb-0">
              <h3 className="font-bold text-[#404040] text-lg flex items-center gap-2">
                <Trophy size={20} className="text-[#F6B700]" />
                Ranking de Técnicos (Top 10)
              </h3>
            </div>
          </div>
          {/* Filters for Ranking */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Ano</label>
              <CustomSelect value={rankingYear} onChange={setRankingYear} options={[{ label: 'Todos', value: '' }, ...years.map(y => ({ label: y, value: y }))]} placeholder="Todos" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Mês</label>
              <CustomSelect value={rankingMonth} onChange={setRankingMonth} options={[{ label: 'Todos', value: '' }, ...months.map(m => ({ label: m.l, value: m.v }))]} placeholder="Todos" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Categoria</label>
              <CustomSelect value={rankingCategory} onChange={setRankingCategory} options={[{ label: 'Todas', value: '' }, ...availableCategories.map(c => ({ label: c, value: c }))]} placeholder="Todas" />
            </div>
            {/* Reason filter simplified, could fetch dynamically if needed */}
          </div>

          <div className="h-[400px] w-full">
            {rankingLoading ? <div className="text-center p-10 text-slate-400"><Loader2 className="animate-spin inline mr-2" /> Carregando ranking...</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rankingData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={150} tick={{ fill: '#404040', fontSize: 12, fontWeight: 'bold' }} interval={0} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }} cursor={{ fill: '#f1f5f9', opacity: 0.5 }} />
                  <Bar dataKey="count" fill="#940910" barSize={20} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="count" position="right" fill="#940910" fontSize={12} fontWeight="bold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

      </div >
    </div >
  );
};