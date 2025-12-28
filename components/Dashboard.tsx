import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, LabelList, Cell
} from 'recharts';
import { Occurrence, EscalationLevel, OccurrenceStatus } from '../types';
import { Card, Modal, Badge, CustomSelect, DateRangePicker } from './UiComponents';
import { Filter, Calendar, MapPin, BarChart2, Activity, Table as TableIcon, Trophy, Users, Grid, CheckCircle2, AlertCircle, Clock, X, Layers } from 'lucide-react';

// Brand Palette
const COLORS = ['#940910', '#F6B700', '#404040', '#7a060c', '#b38600', '#8c8c8c'];

interface DashboardProps {
  occurrences: Occurrence[];
}

export const Dashboard: React.FC<DashboardProps> = ({ occurrences }) => {
  // --- Global Filters State ---
  // FIX: Use Local Time generation instead of toISOString (UTC) to match saved data
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayString = `${year}-${month}-${day}`;

  const currentYear = year.toString();
  const currentMonth = (today.getMonth() + 1).toString();

  const [dateStart, setDateStart] = useState(todayString);
  const [dateEnd, setDateEnd] = useState(todayString);
  const [selectedCluster, setSelectedCluster] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSector, setSelectedSector] = useState('');

  // --- Pareto Specific Filter State ---
  const [paretoCategory, setParetoCategory] = useState('');

  // --- Ranking Specific Filter State ---
  const [rankingYear, setRankingYear] = useState(currentYear);
  const [rankingMonth, setRankingMonth] = useState(currentMonth);
  const [rankingCategory, setRankingCategory] = useState('');
  const [rankingReason, setRankingReason] = useState('');

  // --- KPI Modal State ---
  const [detailsModalType, setDetailsModalType] = useState<'ALL' | 'PENDING' | 'TREATED' | null>(null);

  // --- Derived Data: Global Filter Options ---
  const availableClusters = useMemo((): string[] => {
    // FIX: Improved type inference for string arrays from Sets to resolve 'unknown[]' error
    const clusters = occurrences.map(o => o.cluster).filter((c): c is string => !!c);
    // Explicitly type Set as <string> to ensure correct type inference during spread
    return [...new Set<string>(clusters)].sort();
  }, [occurrences]);

  const availableBranches = useMemo((): string[] => {
    let source = occurrences;
    if (selectedCluster) {
      source = source.filter(o => o.cluster === selectedCluster);
    }
    // FIX: Improved type inference for string arrays from Sets to resolve 'unknown[]' error
    const branches = source.map(o => o.branch).filter((b): b is string => !!b);
    // Explicitly type Set as <string> to ensure correct type inference during spread
    return [...new Set<string>(branches)].sort();
  }, [occurrences, selectedCluster]);

  const availableSectors = useMemo((): string[] => {
    let source = occurrences;
    if (selectedCluster) {
      source = source.filter(o => o.cluster === selectedCluster);
    }
    if (selectedBranch) {
      source = source.filter(o => o.branch === selectedBranch);
    }
    // FIX: Improved type inference for string arrays from Sets to resolve 'unknown[]' error
    const sectors = source.map(o => o.sector).filter((s): s is string => !!s);
    // Explicitly type Set as <string> to ensure correct type inference during spread
    return [...new Set<string>(sectors)].sort();
  }, [occurrences, selectedCluster, selectedBranch]);

  const availableCategories = useMemo((): string[] => {
    // Explicitly type Set as <string> to ensure Array.from returns string[]
    return Array.from(new Set<string>(occurrences.map(o => o.category))).sort();
  }, [occurrences]);

  const availableReasons = useMemo((): string[] => {
    let source = occurrences;
    if (rankingCategory) {
      source = source.filter(o => o.category === rankingCategory);
    }
    // Explicitly type Set as <string> to ensure Array.from returns string[]
    return Array.from(new Set<string>(source.map(o => o.reason))).sort();
  }, [occurrences, rankingCategory]);

  // --- 1. Global Filtering (For Main Charts) ---
  const filteredOccurrences = useMemo(() => {
    return occurrences.filter(o => {
      const occDate = o.date;
      if (dateStart && occDate < dateStart) return false;
      if (dateEnd && occDate > dateEnd) return false;
      if (selectedCluster && o.cluster !== selectedCluster) return false;
      if (selectedBranch && o.branch !== selectedBranch) return false;
      if (selectedSector && o.sector !== selectedSector) return false;
      return true;
    });
  }, [occurrences, dateStart, dateEnd, selectedCluster, selectedBranch, selectedSector]);

  // --- KPI CALCULATIONS ---
  const kpiStats = useMemo(() => {
    const total = filteredOccurrences.length;
    const treated = filteredOccurrences.filter(o => o.status === OccurrenceStatus.CONCLUIDA).length;
    const pending = total - treated;
    const percentage = total > 0 ? Math.round((treated / total) * 100) : 0;

    return { total, treated, pending, percentage };
  }, [filteredOccurrences]);

  // --- Modal Data Logic ---
  const modalData = useMemo(() => {
    if (!detailsModalType) return [];
    if (detailsModalType === 'ALL') return filteredOccurrences;
    if (detailsModalType === 'TREATED') return filteredOccurrences.filter(o => o.status === OccurrenceStatus.CONCLUIDA);
    if (detailsModalType === 'PENDING') return filteredOccurrences.filter(o => o.status !== OccurrenceStatus.CONCLUIDA);
    return [];
  }, [detailsModalType, filteredOccurrences]);

  const getModalTitle = () => {
    switch (detailsModalType) {
      case 'ALL': return 'Todas as Ocorrências (Período Selecionado)';
      case 'PENDING': return 'Ocorrências Pendentes';
      case 'TREATED': return 'Ocorrências Tratadas / Concluídas';
      default: return 'Detalhes';
    }
  };

  // Helper to format date string manually (YYYY-MM-DD -> DD/MM/YYYY)
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  // --- 2. Data for Panel 1: Occurrences per Category (Bar Chart) ---
  const categoryData = useMemo(() => {
    const counts = filteredOccurrences.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(counts)
      .map(k => ({ name: k, count: counts[k] }))
      .sort((a, b) => b.count - a.count);
  }, [filteredOccurrences]);

  // --- 3. Data for Panel 2: Pareto Chart (Reasons) ---
  const paretoData = useMemo(() => {
    const dataForPareto = paretoCategory
      ? filteredOccurrences.filter(o => o.category === paretoCategory)
      : filteredOccurrences;

    const counts = dataForPareto.reduce((acc, curr) => {
      acc[curr.reason] = (acc[curr.reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sortedReasons = Object.keys(counts)
      .map(k => ({ name: k, count: counts[k] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const totalCount = sortedReasons.reduce((sum, item) => sum + item.count, 0);

    let cumulativeCount = 0;
    return sortedReasons.map(item => {
      cumulativeCount += item.count;
      return {
        ...item,
        cumulativePercentage: totalCount === 0 ? 0 : Math.round((cumulativeCount / totalCount) * 100)
      };
    });
  }, [filteredOccurrences, paretoCategory]);

  // --- 4. Data for Panel 3: Ranking of Technicians (Independent Filters) ---
  const rankingData = useMemo(() => {
    let data = occurrences.filter(o => {
      const d = new Date(o.date); // This is parsed as UTC midnight
      // Correction: parse y/m manually to avoid timezone shift on 'd.getMonth()'
      const [yStr, mStr, dStr] = o.date.split('-');

      // Remove leading zero for comparison with single digit months if needed, or keep consistent
      // The state rankingMonth is '1'..'12'. mStr is '01'..'12'.
      const mNum = parseInt(mStr).toString();

      if (rankingYear && yStr !== rankingYear) return false;
      if (rankingMonth && mNum !== rankingMonth) return false;
      if (rankingCategory && o.category !== rankingCategory) return false;
      if (rankingReason && o.reason !== rankingReason) return false;
      return true;
    });

    const counts = data.reduce((acc, curr) => {
      acc[curr.userName] = (acc[curr.userName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(counts)
      .map(k => ({ name: k, count: counts[k] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10
  }, [occurrences, rankingYear, rankingMonth, rankingCategory, rankingReason]);

  // --- 5. Data for Panel 4: Escalation Matrix (Table) - AGGREGATED BY CATEGORY ONLY ---
  const matrixData = useMemo(() => {
    // Define a type for the matrix rows to avoid implicit 'any' arithmetic errors
    type MatrixRow = {
      category: string;
      total: number;
      counts: Record<string, number>;
    };

    const rows: Record<string, MatrixRow> = {};
    const escalationLevels = Object.values(EscalationLevel);

    filteredOccurrences.forEach(occ => {
      // Group by Category ONLY (removed Reason)
      const key = occ.category;

      if (!rows[key]) {
        const newRow: MatrixRow = {
          category: occ.category,
          total: 0,
          counts: {}
        };
        escalationLevels.forEach(lvl => {
          newRow.counts[lvl] = 0;
        });
        rows[key] = newRow;
      }

      const row = rows[key];
      if (row) {
        const level = occ.escalationLevel || EscalationLevel.NONE;
        row.counts[level] = (row.counts[level] || 0) + 1;
        row.total += 1;
      }
    });

    // Sort by total volume
    return Object.values(rows).sort((a, b) => b.total - a.total);
  }, [filteredOccurrences]);

  // --- 6. Data for Panel 5: Cluster Matrix (Table) - AGGREGATED BY CATEGORY ONLY ---
  const clusterMatrixData = useMemo(() => {
    const clustersFound = new Set<string>();
    const rows: Record<string, { category: string; total: number; clusters: Record<string, number> }> = {};

    filteredOccurrences.forEach(occ => {
      const clusterName = occ.cluster || 'Não Definido';
      clustersFound.add(clusterName);

      // Group by Category ONLY
      const key = occ.category;
      if (!rows[key]) {
        rows[key] = {
          category: occ.category,
          total: 0,
          clusters: {}
        };
      }

      const row = rows[key];
      if (row) {
        row.clusters[clusterName] = (row.clusters[clusterName] || 0) + 1;
        row.total += 1;
      }
    });

    const sortedClusters = Array.from(clustersFound).sort();
    const sortedRows = Object.values(rows).sort((a, b) => b.total - a.total);

    return { sortedClusters, sortedRows };
  }, [filteredOccurrences]);

  // Helpers for Filter Selects
  const years = Array.from(new Set(occurrences.map(o => o.date.split('-')[0]))).sort((a: string, b: string) => parseInt(b) - parseInt(a));
  const months = [
    { v: '1', l: 'Janeiro' }, { v: '2', l: 'Fevereiro' }, { v: '3', l: 'Março' }, { v: '4', l: 'Abril' },
    { v: '5', l: 'Maio' }, { v: '6', l: 'Junho' }, { v: '7', l: 'Julho' }, { v: '8', l: 'Agosto' },
    { v: '9', l: 'Setembro' }, { v: '10', l: 'Outubro' }, { v: '11', l: 'Novembro' }, { v: '12', l: 'Dezembro' }
  ];

  return (
    <div className="space-y-8">

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
                  ...availableClusters.map((c: string) => ({ label: c, value: c }))
                ]}
                placeholder="Todos os Clusters"
              />
            </div>
            <div className="w-full md:w-48">
              <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                <MapPin size={12} /> Filial
              </label>
              <CustomSelect
                value={selectedBranch}
                onChange={(val) => { setSelectedBranch(val); setSelectedSector(''); }}
                options={[
                  { label: 'Todas as Filiais', value: '' },
                  ...availableBranches.map((b: string) => ({ label: b, value: b }))
                ]}
                placeholder="Todas as Filiais"
              />
            </div>
            <div className="w-full md:w-48">
              <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                <Layers size={12} /> Setor
              </label>
              <CustomSelect
                value={selectedSector}
                onChange={(val) => setSelectedSector(val)}
                options={[
                  { label: 'Todos os Setores', value: '' },
                  ...availableSectors.map((s: string) => ({ label: s, value: s }))
                ]}
                placeholder="Todos os Setores"
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
            <h3 className="text-4xl font-bold text-[#404040]">{kpiStats.total}</h3>
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
            <h3 className="text-4xl font-bold text-[#b38600]">{kpiStats.pending}</h3>
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
            <h3 className="text-4xl font-bold text-emerald-600">{kpiStats.treated}</h3>
            <p className="text-xs text-emerald-600 mt-2 font-bold">{kpiStats.percentage}% Resolvido</p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-full text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
            <CheckCircle2 size={32} />
          </div>
        </div>
      </div>

      {/* --- KPI DETAILS MODAL --- */}
      <Modal isOpen={!!detailsModalType} onClose={() => setDetailsModalType(null)} title={getModalTitle()}>
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-[#940910] text-white text-xs uppercase sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 border-r border-white/20">Data/Hora</th>
                <th className="px-3 py-2 border-r border-white/20">Técnico</th>
                <th className="px-3 py-2 w-24 border-r border-white/20">Local</th>
                <th className="px-3 py-2 w-1/3 border-r border-white/20">Ocorrência</th>
                <th className="px-3 py-2 border-r border-white/20">Motivo</th>
                <th className="px-3 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {modalData.map(o => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-xs">
                    <div className="font-bold text-[#404040] whitespace-nowrap">{formatDate(o.date)}</div>
                    <div className="text-slate-500">{o.time}</div>
                  </td>
                  <td className="px-3 py-2 text-xs font-medium text-[#404040]">{o.userName}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    <div className="line-clamp-2" title={`${o.branch} - ${o.sector}`}>
                      <span className="font-bold">{o.branch}</span>
                      <br />{o.sector}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    <div className="line-clamp-2" title={o.category}>
                      {o.category}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <div className="text-[#940910] font-bold">
                      <div className="line-clamp-2 max-w-[150px]" title={o.reason}>{o.reason}</div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Badge status={o.status} />
                  </td>
                </tr>
              ))}
              {modalData.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                    Nenhum registro encontrado para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setDetailsModalType(null)} className="bg-slate-100 hover:bg-slate-200 text-[#404040] px-4 py-2 rounded text-sm font-medium transition-colors">
            Fechar
          </button>
        </div>
      </Modal>

      {/* --- STACKED CONTAINER --- */}
      <div className="flex flex-col gap-8">

        {/* --- CHART 1: OCCURRENCES BY TYPE --- */}
        <Card title="Volume por Tipo de Ocorrência (Filtro Global)" className="flex flex-col w-full">
          <div className="h-[400px] w-full">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#404040', fontSize: 11 }}
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                    height={80}
                  />
                  <YAxis tick={{ fill: '#404040', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    cursor={{ fill: '#f1f5f9' }}
                  />
                  <Bar dataKey="count" name="Qtd. Ocorrências" fill="#940910" radius={[4, 4, 0, 0]} barSize={50}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    <LabelList dataKey="count" position="top" fill="#404040" fontSize={12} fontWeight="bold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <BarChart2 size={48} className="mb-2 opacity-20" />
                <p>Sem dados para o período selecionado.</p>
              </div>
            )}
          </div>
        </Card>

        {/* --- CHART 2: PARETO CHART --- */}
        <Card className="flex flex-col w-full overflow-visible">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-slate-100 pb-4">
            <div className="mb-2 sm:mb-0">
              <h3 className="font-bold text-[#404040] text-lg flex items-center gap-2">
                <Activity size={20} className="text-[#F6B700]" />
                Pareto (Motivos Ofensores - Filtro Global)
              </h3>
            </div>

            <div className="w-full sm:w-64">
              <CustomSelect
                value={paretoCategory}
                onChange={(val) => setParetoCategory(val)}
                options={[
                  { label: 'Todas as Categorias', value: '' },
                  ...availableCategories.map((c: string) => ({ label: c, value: c }))
                ]}
                placeholder="Todas as Categorias"
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-8 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#940910]"></div>
              <span className="text-sm font-bold text-[#404040]">Ocorrências</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6">
                <div className="w-full h-[3px] bg-[#F6B700] relative">
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#F6B700]"></div>
                </div>
              </div>
              <span className="text-sm font-bold text-[#404040]">Porcentagem acumulada</span>
            </div>
          </div>

          <div className="h-[500px] w-full flex-1">
            {paretoData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={paretoData} margin={{ top: 20, right: 30, left: 20, bottom: 120 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#404040', fontSize: 11 }}
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                    height={100}
                  />
                  <YAxis yAxisId="left" tick={{ fill: '#404040', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: '#F6B700', fontSize: 12 }} unit="%" axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  <Bar yAxisId="left" dataKey="count" fill="#940910" barSize={60} radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="count" position="top" fill="#404040" fontSize={12} fontWeight="bold" offset={5} />
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="cumulativePercentage" stroke="#F6B700" strokeWidth={3} dot={{ r: 4, fill: '#F6B700', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, fill: '#F6B700' }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Activity size={48} className="mb-2 opacity-20" />
                <p>Sem dados para gerar o Pareto.</p>
              </div>
            )}
          </div>
        </Card>

        {/* --- CHART 3: ESCALATION MATRIX TABLE (Aggregated by Category) --- */}
        <Card title="Matriz de Escalonamento por Ocorrência (Filtro Global)" className="w-full overflow-visible">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-[#940910] text-white">
                  <th className="p-3 border-r border-white/20 w-1/2">Categoria (Tipo)</th>
                  {Object.values(EscalationLevel).map(lvl => (
                    <th key={lvl} className="p-3 text-center border-r border-white/20">{lvl}</th>
                  ))}
                  <th className="p-3 text-center font-bold bg-[#F6B700] text-[#404040]">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {matrixData.length > 0 ? matrixData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 bg-white text-[#404040]">
                    <td className="p-3 font-bold text-xs text-[#940910]">{row.category}</td>
                    {Object.values(EscalationLevel).map(lvl => {
                      const val = row.counts[lvl] || 0;
                      return (
                        <td key={lvl} className={`p-3 text-center border-l border-slate-100 ${val > 0 ? 'font-bold text-[#940910] bg-red-50' : 'text-slate-300'}`}>
                          {val > 0 ? val : '-'}
                        </td>
                      );
                    })}
                    <td className="p-3 text-center font-bold bg-slate-50 border-l border-slate-200">{row.total}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={1 + Object.values(EscalationLevel).length + 1} className="p-8 text-center text-slate-400">
                      <TableIcon size={48} className="mx-auto mb-2 opacity-20" />
                      Nenhum dado encontrado para os filtros globais selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* --- CHART 4: CLUSTER MATRIX TABLE (Aggregated by Category) --- */}
        <Card title="Distribuição de Ocorrências por Cluster (Filtro Global)" className="w-full overflow-visible">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-[#940910] text-white">
                  <th className="p-3 border-r border-white/20 w-1/3">Categoria (Tipo)</th>
                  {clusterMatrixData.sortedClusters.map(c => (
                    <th key={c} className="p-3 text-center border-r border-white/20 whitespace-nowrap">{c}</th>
                  ))}
                  <th className="p-3 text-center font-bold bg-[#F6B700] text-[#404040]">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {clusterMatrixData.sortedRows.length > 0 ? clusterMatrixData.sortedRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 bg-white text-[#404040]">
                    <td className="p-3 font-bold text-xs text-[#940910]">{row.category}</td>
                    {clusterMatrixData.sortedClusters.map(c => {
                      const val = row.clusters[c] || 0;
                      return (
                        <td key={c} className={`p-3 text-center border-l border-slate-100 ${val > 0 ? 'font-bold text-[#940910] bg-red-50' : 'text-slate-300'}`}>
                          {val > 0 ? val : '-'}
                        </td>
                      );
                    })}
                    <td className="p-3 text-center font-bold bg-slate-50 border-l border-slate-200">{row.total}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={1 + clusterMatrixData.sortedClusters.length + 1} className="p-8 text-center text-slate-400">
                      <Grid size={48} className="mx-auto mb-2 opacity-20" />
                      Nenhum dado encontrado para os filtros globais selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* --- CHART 5: RANKING TECHNICIANS --- */}
        <Card className="flex flex-col w-full overflow-visible">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-slate-100 pb-4">
            <div className="mb-2 sm:mb-0">
              <h3 className="font-bold text-[#404040] text-lg flex items-center gap-2">
                <Trophy size={20} className="text-[#F6B700]" />
                Ranking de Técnicos Ofensores (Top 10)
              </h3>
              <p className="text-xs text-slate-500 mt-1">Filtros independentes do dashboard global</p>
            </div>
          </div>

          {/* Independent Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Ano</label>
              <CustomSelect
                value={rankingYear}
                onChange={(val) => setRankingYear(val)}
                options={[
                  { label: 'Todos', value: '' },
                  ...years.map((y: string) => ({ label: y, value: y }))
                ]}
                placeholder="Todos"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Mês</label>
              <CustomSelect
                value={rankingMonth}
                onChange={(val) => setRankingMonth(val)}
                options={[
                  { label: 'Todos', value: '' },
                  ...months.map(m => ({ label: m.l, value: m.v }))
                ]}
                placeholder="Todos"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Categoria (Tipo)</label>
              <CustomSelect
                value={rankingCategory}
                onChange={(val) => { setRankingCategory(val); setRankingReason(''); }}
                options={[
                  { label: 'Todas', value: '' },
                  ...availableCategories.map((c: string) => ({ label: c, value: c }))
                ]}
                placeholder="Todas"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Motivo</label>
              <CustomSelect
                value={rankingReason}
                onChange={(val) => setRankingReason(val)}
                options={[
                  { label: 'Todos', value: '' },
                  ...availableReasons.map((r: string) => ({ label: r, value: r }))
                ]}
                placeholder="Todos"
                disabled={!rankingCategory}
              />
            </div>
          </div>

          <div className="h-[400px] w-full">
            {rankingData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rankingData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={150}
                    tick={{ fill: '#404040', fontSize: 12, fontWeight: 'bold' }}
                    interval={0}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    cursor={{ fill: '#f1f5f9', opacity: 0.5 }}
                  />
                  <Bar dataKey="count" fill="#940910" barSize={20} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="count" position="right" fill="#940910" fontSize={12} fontWeight="bold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Users size={48} className="mb-2 opacity-20" />
                <p>Sem dados para the ranking com os filtros atuais.</p>
              </div>
            )}
          </div>
        </Card>

      </div>
    </div>
  );
};