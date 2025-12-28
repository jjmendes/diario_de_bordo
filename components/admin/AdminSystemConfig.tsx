import React, { useState, useRef } from 'react';
import { SupabaseDB } from '../../services/supabaseDb';

import { ReasonTree, GeoCluster } from '../../types';
import { Card, Button } from '../UiComponents';
import { Upload, Trash2, Plus, Save, X, FileDown, Pencil, ChevronDown, ChevronRight, Globe, List, Info, Image as ImageIcon } from 'lucide-react';

interface AdminSystemConfigProps {
    reasonsHierarchy: ReasonTree[];
    geoHierarchy: GeoCluster[];
    onRefresh: () => Promise<void>;
}

export const AdminSystemConfig: React.FC<AdminSystemConfigProps> = ({
    reasonsHierarchy,
    geoHierarchy,
    onRefresh
}) => {
    const [configMode, setConfigMode] = useState<'REASONS' | 'GEO' | 'BRANDING'>('REASONS');

    // Reasons UI State
    const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
    const [tempCategoryName, setTempCategoryName] = useState('');
    const [editingReasonIndices, setEditingReasonIndices] = useState<{ cIdx: number, rIdx: number } | null>(null);
    const [tempReasonText, setTempReasonText] = useState('');
    const [newReasonText, setNewReasonText] = useState('');

    // Geo UI State
    const [expandedClusters, setExpandedClusters] = useState<string[]>([]);
    const [expandedBranches, setExpandedBranches] = useState<string[]>([]);
    const [newClusterName, setNewClusterName] = useState('');
    const [newBranchName, setNewBranchName] = useState('');
    const [newSectorName, setNewSectorName] = useState('');
    const [addingBranchToClusterIndex, setAddingBranchToClusterIndex] = useState<number | null>(null);
    const [addingSectorToBranchIndex, setAddingSectorToBranchIndex] = useState<{ cIdx: number, bIdx: number } | null>(null);
    const [editingClusterIdx, setEditingClusterIdx] = useState<number | null>(null);
    const [tempClusterName, setTempClusterName] = useState('');
    const [editingBranchIndices, setEditingBranchIndices] = useState<{ cIdx: number, bIdx: number } | null>(null);
    const [tempBranchName, setTempBranchName] = useState('');
    const [editingSectorIndices, setEditingSectorIndices] = useState<{ cIdx: number, bIdx: number, sIdx: number } | null>(null);
    const [tempSectorName, setTempSectorName] = useState('');

    // ================= EXPORT HELPERS =================
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

    const handleExportConfig = () => {
        const header = "Categoria;Motivo\n";
        const rows = reasonsHierarchy.flatMap(cat =>
            cat.reasons.map(r => `${cat.category};${r}`)
        ).join("\n");
        downloadCSV(`motivos_ocorrencia_${new Date().toISOString().split('T')[0]}.csv`, header + rows);
    };

    const handleExportGeo = () => {
        const header = "Cluster;Filial;Setor\n";
        const rows = geoHierarchy.flatMap(c =>
            c.branches.flatMap(b =>
                b.sectors.length > 0
                    ? b.sectors.map(s => `${c.name};${b.name};${s}`)
                    : [`${c.name};${b.name};`]
            )
        ).join("\n");
        downloadCSV(`estrutura_geo_${new Date().toISOString().split('T')[0]}.csv`, header + rows);
    };

    // ================= CONFIG (REASONS) LOGIC =================
    const handleUpdateCategoryName = async (index: number) => {
        if (!tempCategoryName.trim()) return;
        const updated = [...reasonsHierarchy];
        updated[index].category = tempCategoryName.trim() as any;
        try {
            await SupabaseDB.saveReasonHierarchy(updated);
            await onRefresh();
            setEditingCategoryIndex(null);
        } catch (e) {
            console.error(e);
            alert("Erro ao salvar categoria.");
        }
    };

    const handleAddCategory = async () => {
        const updated = [...reasonsHierarchy];
        const baseName = 'NOVA CATEGORIA';
        let newName = `${baseName} (EDITAR)`;
        let counter = 1;
        while (updated.some(c => c.category === newName)) {
            newName = `${baseName} ${counter} (EDITAR)`;
            counter++;
        }
        updated.push({ category: newName as any, reasons: [] });
        try {
            await SupabaseDB.saveReasonHierarchy(updated);
            await onRefresh();
            setTimeout(() => {
                setEditingCategoryIndex(updated.length - 1);
                setTempCategoryName(newName);
            }, 50);
        } catch (e) {
            console.error(e);
            alert("Erro ao adicionar categoria.");
        }
    };

    const handleDeleteCategory = async (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        e.preventDefault();

        const categoryToDelete = reasonsHierarchy[index];
        const hasReasons = categoryToDelete && categoryToDelete.reasons.length > 0;

        if (!hasReasons || window.confirm('Tem certeza? Isso remove a opção para novos registros.')) {
            setEditingCategoryIndex(null);
            setTempCategoryName('');
            const updated = [...reasonsHierarchy];
            updated.splice(index, 1);
            try {
                await SupabaseDB.saveReasonHierarchy(updated);
                await onRefresh();
            } catch (e) {
                console.error(e);
                alert("Erro ao excluir.");
            }
        }
    };

    const handleAddReason = async (catIndex: number) => {
        if (!newReasonText.trim()) return;
        const updated = [...reasonsHierarchy];
        if (!updated[catIndex].reasons.includes(newReasonText.trim())) {
            updated[catIndex].reasons.push(newReasonText.trim());
            try {
                await SupabaseDB.saveReasonHierarchy(updated);
                setNewReasonText('');
                await onRefresh();
            } catch (e) {
                console.error(e);
                alert("Erro ao adicionar motivo.");
            }
        } else {
            alert('Motivo já existe nesta categoria.');
        }
    };

    const handleRemoveReason = async (catIndex: number, reasonIndex: number) => {
        if (window.confirm('Remover motivo?')) {
            const updated = [...reasonsHierarchy];
            updated[catIndex].reasons.splice(reasonIndex, 1);
            try {
                await SupabaseDB.saveReasonHierarchy(updated);
                await onRefresh();
            } catch (e) {
                console.error(e);
                alert("Erro ao remover motivo.");
            }
        }
    };

    const handleUpdateReason = async (catIndex: number, reasonIndex: number) => {
        if (!tempReasonText.trim()) return;
        const updated = [...reasonsHierarchy];
        updated[catIndex].reasons[reasonIndex] = tempReasonText.trim();
        try {
            await SupabaseDB.saveReasonHierarchy(updated);
            setEditingReasonIndices(null);
            await onRefresh();
        } catch (e) {
            console.error(e);
            alert("Erro ao atualizar motivo.");
        }
    };

    // ================= GEO LOGIC =================
    const saveGeo = async (newGeo: GeoCluster[]) => {
        try {
            await SupabaseDB.saveGeoHierarchy(newGeo);
            await onRefresh();
        } catch (e) {
            console.error(e);
            alert("Erro ao salvar estrutura geográfica.");
        }
    };

    const handleAddCluster = () => {
        if (!newClusterName.trim()) return;
        if (geoHierarchy.some(c => c.name.toUpperCase() === newClusterName.trim().toUpperCase())) {
            alert("Cluster já existe.");
            return;
        }
        const updated = [...geoHierarchy, { name: newClusterName.trim().toUpperCase(), branches: [] }];
        updated.sort((a, b) => a.name.localeCompare(b.name));
        saveGeo(updated);
        setNewClusterName('');
    };

    const handleUpdateClusterName = () => {
        if (editingClusterIdx === null || !tempClusterName.trim()) return;
        const updated = [...geoHierarchy];
        updated[editingClusterIdx].name = tempClusterName.trim().toUpperCase();
        updated.sort((a, b) => a.name.localeCompare(b.name));
        saveGeo(updated);
        setEditingClusterIdx(null);
    };

    const handleDeleteCluster = (e: React.MouseEvent, idx: number) => {
        e.stopPropagation();
        if (geoHierarchy[idx].branches.length > 0) {
            if (!window.confirm("Cluster possui filiais. Excluir mesmo assim?")) return;
        }
        const updated = [...geoHierarchy];
        updated.splice(idx, 1);
        saveGeo(updated);
    };

    const handleAddBranch = (clusterIndex: number) => {
        if (!newBranchName.trim()) return;
        const updated = [...geoHierarchy];
        if (updated[clusterIndex].branches.some(b => b.name === newBranchName.trim())) {
            alert("Filial já existe neste cluster.");
            return;
        }
        updated[clusterIndex].branches.push({ name: newBranchName.trim(), sectors: [] });
        updated[clusterIndex].branches.sort((a, b) => a.name.localeCompare(b.name));
        saveGeo(updated);
        setNewBranchName('');
        setAddingBranchToClusterIndex(null);
    };

    const toggleClusterExpand = (name: string) => { setExpandedClusters(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]); };
    const toggleBranchExpand = (name: string) => { setExpandedBranches(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]); };

    const handleUpdateBranchName = (cIdx: number, bIdx: number) => {
        if (!tempBranchName.trim()) return;
        const updated = [...geoHierarchy];
        updated[cIdx].branches[bIdx].name = tempBranchName.trim();
        saveGeo(updated);
        setEditingBranchIndices(null);
    };

    const handleDeleteBranch = (e: React.MouseEvent, cIdx: number, bIdx: number) => {
        e.stopPropagation();
        e.preventDefault();
        if (window.confirm('Excluir esta Filial e seus Setores?')) {
            const updated = [...geoHierarchy];
            updated[cIdx].branches.splice(bIdx, 1);
            saveGeo(updated);
        }
    };

    const handleAddSector = (cIdx: number, bIdx: number) => {
        if (!newSectorName.trim()) return;
        const updated = [...geoHierarchy];
        if (updated[cIdx].branches[bIdx].sectors.includes(newSectorName)) {
            alert('Setor já existe');
            return;
        }
        updated[cIdx].branches[bIdx].sectors.push(newSectorName.trim());
        saveGeo(updated);
        setNewSectorName('');
        setAddingSectorToBranchIndex(null);
        setExpandedBranches(prev => [...prev, updated[cIdx].branches[bIdx].name]);
    };

    const handleUpdateSectorName = (cIdx: number, bIdx: number, sIdx: number) => {
        if (!tempSectorName.trim()) return;
        const updated = [...geoHierarchy];
        updated[cIdx].branches[bIdx].sectors[sIdx] = tempSectorName.trim();
        saveGeo(updated);
        setEditingSectorIndices(null);
    };

    const handleDeleteSector = (e: React.MouseEvent, cIdx: number, bIdx: number, sIdx: number) => {
        e.stopPropagation();
        e.preventDefault();
        const updated = [...geoHierarchy];
        updated[cIdx].branches[bIdx].sectors.splice(sIdx, 1);
        saveGeo(updated);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex border-b border-slate-200 mb-4">
                <button onClick={() => setConfigMode('REASONS')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${configMode === 'REASONS' ? 'border-[#940910] text-[#940910]' : 'border-transparent text-slate-500 hover:text-[#404040]'}`}>Motivos de Ocorrência</button>
                <button onClick={() => setConfigMode('GEO')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${configMode === 'GEO' ? 'border-[#940910] text-[#940910]' : 'border-transparent text-slate-500 hover:text-[#404040]'}`}>Estrutura Operacional</button>
                <button onClick={() => setConfigMode('BRANDING')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${configMode === 'BRANDING' ? 'border-[#940910] text-[#940910]' : 'border-transparent text-slate-500 hover:text-[#404040]'}`}>Personalização</button>
            </div>

            {configMode === 'BRANDING' && (
                <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 flex items-start gap-3">
                        <Info className="shrink-0 mt-0.5" size={18} />
                        <div>
                            <p className="font-bold">Personalização do Sistema</p>
                            <p>Altere a imagem de fundo da tela de login. A imagem será salva na nuvem e atualizada para todos os usuários.</p>
                        </div>
                    </div>

                    <Card className="border border-slate-200 p-6">
                        <h3 className="font-bold text-lg text-[#404040] mb-4 flex items-center gap-2">
                            <ImageIcon size={20} className="text-[#940910]" />
                            Imagem de Fundo do Login
                        </h3>

                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            {/* Current Image Preview */}
                            <div className="w-full md:w-1/3 aspect-video bg-slate-100 rounded-lg border border-slate-200 overflow-hidden relative group">
                                <img
                                    src={SupabaseDB.getSystemAssetUrl('bg_login.png') + `?t=${Date.now()}`} // Force refresh
                                    alt="Fundo Atual"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/bg-login.png'; // Fallback to local
                                    }}
                                />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white text-xs font-bold">Visualização Atual</span>
                                </div>
                            </div>

                            {/* Upload Controls */}
                            <div className="flex-1 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#404040] mb-2">Carregar Nova Imagem</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#940910]/10 file:text-[#940910] hover:file:bg-[#940910]/20"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    if (file.size > 5 * 1024 * 1024) {
                                                        alert("A imagem deve ter no máximo 5MB.");
                                                        return;
                                                    }

                                                    if (confirm("Deseja definir esta imagem como fundo da tela de login?")) {
                                                        try {
                                                            // Show loading state implicitly
                                                            e.target.value = ''; // Reset input
                                                            const result = await SupabaseDB.uploadSystemAsset(file);
                                                            if (result.success) {
                                                                alert("Imagem atualizada com sucesso! A mudança pode levar alguns instantes para aparecer.");
                                                                await onRefresh(); // Re-render to update preview
                                                            } else {
                                                                alert(`Erro ao enviar imagem:\n${result.error}`);
                                                            }
                                                        } catch (err: any) {
                                                            alert("Erro inesperado no upload.");
                                                        }
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">Recomendado: 1920x1080px (Full HD). Formatos: PNG, JPG, WEBP.</p>
                                </div>

                                <div className="pt-4 border-t border-slate-100">
                                    <p className="text-xs text-slate-400">
                                        Nota: Se receber erro de "Bucket not found", crie um bucket público chamado <code>system-assets</code> no painel do Supabase.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {configMode === 'REASONS' && (
                <>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={handleExportConfig} className="text-[#940910] border-[#940910]/20"><FileDown size={18} /> Exportar Estrutura</Button>
                        <Button onClick={handleAddCategory} type="button" className="bg-[#940910] hover:bg-[#7a060c] text-white"><Plus size={18} /> Nova Categoria Principal</Button>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                        {reasonsHierarchy.map((cat, idx) => (
                            <Card key={`${cat.category}-${idx}`} className="border border-slate-200">
                                <div className="bg-slate-50 px-4 py-3 border-b flex justify-between items-center">
                                    {editingCategoryIndex === idx ? (
                                        <div className="flex gap-2 w-full max-w-lg">
                                            <input className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm bg-white" value={tempCategoryName} onChange={e => setTempCategoryName(e.target.value)} autoFocus />
                                            <button onClick={() => handleUpdateCategoryName(idx)} className="text-green-600 hover:bg-green-100 p-1 rounded"><Save size={18} /></button>
                                            <button onClick={() => setEditingCategoryIndex(null)} className="text-red-600 hover:bg-red-100 p-1 rounded"><X size={18} /></button>
                                        </div>
                                    ) : (<h3 className="font-bold text-[#404040]">{cat.category}</h3>)}
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => { setEditingCategoryIndex(idx); setTempCategoryName(cat.category); }} className="text-slate-400 hover:text-[#940910] hover:bg-red-50 p-1 rounded relative z-20" title="Renomear Categoria"><Pencil size={16} className="pointer-events-none" /></button>
                                        <button type="button" onClick={(e) => handleDeleteCategory(e, idx)} className="text-red-500 hover:bg-red-50 p-1 rounded relative z-20" title="Excluir Categoria"><Trash2 size={16} className="pointer-events-none" /></button>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <ul className="space-y-2 mb-4">
                                        {cat.reasons.map((reason, rIdx) => {
                                            const isEditingReason = editingReasonIndices?.cIdx === idx && editingReasonIndices?.rIdx === rIdx;
                                            return (
                                                <li key={`${reason}-${rIdx}`} className="flex justify-between items-center text-sm bg-white border border-slate-100 p-2 rounded hover:bg-slate-50 group">
                                                    {isEditingReason ? (
                                                        <div className="flex gap-1 w-full">
                                                            <input className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm bg-white" value={tempReasonText} onChange={e => setTempReasonText(e.target.value)} autoFocus />
                                                            <button onClick={(e) => { e.stopPropagation(); handleUpdateReason(idx, rIdx); }} className="text-green-600 hover:bg-green-100 p-1 rounded"><Save size={16} /></button>
                                                            <button onClick={() => setEditingReasonIndices(null)} className="text-red-600 hover:bg-red-100 p-1 rounded"><X size={16} /></button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <span className="text-[#404040] flex-1">{reason}</span>
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button type="button" onClick={() => { setEditingReasonIndices({ cIdx: idx, rIdx }); setTempReasonText(reason); }} className="text-slate-300 hover:text-[#940910] p-1 relative z-20" title="Editar Motivo"><Pencil size={14} className="pointer-events-none" /></button>
                                                                <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveReason(idx, rIdx); }} className="text-red-400 hover:text-red-600 p-1 relative z-20"><Trash2 size={14} className="pointer-events-none" /></button>
                                                            </div>
                                                        </>
                                                    )}
                                                </li>
                                            )
                                        })}
                                        {cat.reasons.length === 0 && <li className="text-xs text-slate-400 italic">Nenhum motivo cadastrado nesta categoria.</li>}
                                    </ul>
                                    <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
                                        <input placeholder="Adicionar novo motivo..." className="flex-1 border rounded px-2 py-1 text-xs bg-white" value={newReasonText} onChange={(e) => setNewReasonText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddReason(idx); }} />
                                        <Button variant="secondary" className="text-xs py-1 h-8" onClick={() => handleAddReason(idx)}>Adicionar</Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </>
            )}

            {configMode === 'GEO' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="bg-[#940910]/5 border border-[#940910]/20 rounded-lg p-4 text-sm text-[#940910] flex-1 mr-4">
                            <h4 className="font-bold flex items-center gap-2 mb-1"><Globe size={16} /> Gerenciamento de Clusters e Filiais</h4>
                            <p>Estrutura: <strong>Cluster</strong> &gt; <strong>Filial (Cidade)</strong> &gt; <strong>Setor (BKT)</strong></p>
                        </div>
                        <Button variant="outline" onClick={handleExportGeo} className="text-[#940910] border-[#940910]/20"><FileDown size={18} /> Exportar Estrutura</Button>
                    </div>
                    <div className="flex gap-2 mb-6">
                        <input className="border rounded p-2 text-sm bg-white w-64 focus:ring-1 focus:ring-[#940910]" placeholder="Nome do Novo Cluster" value={newClusterName} onChange={e => setNewClusterName(e.target.value)} />
                        <Button onClick={handleAddCluster} className="bg-[#940910] hover:bg-[#7a060c] text-white"><Plus size={16} /> Adicionar Cluster</Button>
                    </div>
                    <div className="space-y-4">
                        {geoHierarchy.map((cluster, cIdx) => (
                            <Card key={cluster.name} className="border border-slate-200">
                                <div className="bg-slate-100 px-4 py-3 flex justify-between items-center cursor-pointer" onClick={() => toggleClusterExpand(cluster.name)}>
                                    <div className="flex items-center gap-2 flex-1">
                                        {expandedClusters.includes(cluster.name) ? <ChevronDown size={18} className="text-slate-500" /> : <ChevronRight size={18} className="text-slate-500" />}
                                        {editingClusterIdx === cIdx ? (
                                            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                                <input className="border border-slate-300 rounded px-2 py-0.5 text-sm bg-white" value={tempClusterName} onChange={e => setTempClusterName(e.target.value)} autoFocus />
                                                <button onClick={() => handleUpdateClusterName()} className="text-green-600 hover:bg-green-100 p-1 rounded"><Save size={16} /></button>
                                                <button onClick={() => setEditingClusterIdx(null)} className="text-red-600 hover:bg-red-100 p-1 rounded"><X size={16} /></button>
                                            </div>
                                        ) : (
                                            <>
                                                <h3 className="font-bold text-[#940910] uppercase tracking-wide">{cluster.name}</h3>
                                                <button onClick={(e) => { e.stopPropagation(); setEditingClusterIdx(cIdx); setTempClusterName(cluster.name); }} className="text-slate-400 hover:text-[#940910] p-1 relative z-20" title="Renomear Cluster"><Pencil size={14} className="pointer-events-none" /></button>
                                            </>
                                        )}
                                        <span className="text-xs text-slate-400 bg-white px-2 py-0.5 rounded border ml-2">{cluster.branches.length} Filiais</span>
                                    </div>
                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                        <Button variant="ghost" className="text-xs h-7 px-2 text-[#940910] hover:bg-red-50 relative z-20" onClick={() => setAddingBranchToClusterIndex(cIdx)}><Plus size={12} className="mr-1" /> Nova Filial</Button>
                                        <button type="button" onClick={(e) => handleDeleteCluster(e, cIdx)} className="text-red-500 hover:bg-red-100 p-1 rounded relative z-20"><Trash2 size={16} className="pointer-events-none" /></button>
                                    </div>
                                </div>
                                {expandedClusters.includes(cluster.name) && (
                                    <div className="p-4 bg-white">
                                        {addingBranchToClusterIndex === cIdx && (
                                            <div className="flex gap-2 mb-4 p-2 bg-red-50 rounded border border-red-100 animate-in fade-in">
                                                <input className="flex-1 border rounded p-1 text-xs bg-white" placeholder="Nome da Filial/Cidade" value={newBranchName} onChange={e => setNewBranchName(e.target.value)} autoFocus />
                                                <Button variant="primary" className="h-7 text-xs" onClick={() => handleAddBranch(cIdx)}>Salvar</Button>
                                                <Button variant="ghost" className="h-7 text-xs" onClick={() => setAddingBranchToClusterIndex(null)}>Cancelar</Button>
                                            </div>
                                        )}
                                        {cluster.branches.length === 0 && addingBranchToClusterIndex !== cIdx && (
                                            <p className="text-xs text-slate-400 italic">Nenhuma filial cadastrada neste cluster.</p>
                                        )}
                                        <div className="space-y-3">
                                            {cluster.branches.map((branch, bIdx) => {
                                                const isEditingBranch = editingBranchIndices?.cIdx === cIdx && editingBranchIndices?.bIdx === bIdx;
                                                return (
                                                    <div key={branch.name} className="border border-slate-200 rounded-md overflow-hidden">
                                                        <div className="flex justify-between items-center p-2 bg-slate-50 cursor-pointer hover:bg-slate-100" onClick={() => toggleBranchExpand(branch.name)}>
                                                            <div className="flex items-center gap-2 flex-1">
                                                                {expandedBranches.includes(branch.name) ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                                                                {isEditingBranch ? (
                                                                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                                                        <input className="border border-slate-300 rounded px-1 py-0 text-xs bg-white" value={tempBranchName} onChange={e => setTempBranchName(e.target.value)} autoFocus />
                                                                        <button onClick={() => handleUpdateBranchName(cIdx, bIdx)} className="text-green-600 hover:bg-green-100 px-1 rounded"><Save size={12} /></button>
                                                                        <button onClick={() => setEditingBranchIndices(null)} className="text-red-600 hover:bg-red-100 px-1 rounded"><X size={12} /></button>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <span className="font-semibold text-[#404040] text-sm">{branch.name}</span>
                                                                        <button onClick={(e) => { e.stopPropagation(); setEditingBranchIndices({ cIdx, bIdx }); setTempBranchName(branch.name); }} className="text-slate-400 hover:text-[#940910] p-0.5 opacity-50 hover:opacity-100 relative z-20" title="Renomear Filial"><Pencil size={12} className="pointer-events-none" /></button>
                                                                    </>
                                                                )}
                                                                <span className="text-[10px] text-slate-400 ml-2">{branch.sectors.length} Setores</span>
                                                            </div>
                                                            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                                                <button onClick={() => setAddingSectorToBranchIndex({ cIdx, bIdx })} className="text-[#940910] hover:bg-red-50 p-1 rounded relative z-20" title="Adicionar Setor"><Plus size={14} /></button>
                                                                <button type="button" onClick={(e) => handleDeleteBranch(e, cIdx, bIdx)} className="text-red-400 hover:bg-red-50 p-1 rounded relative z-20"><Trash2 size={14} className="pointer-events-none" /></button>
                                                            </div>
                                                        </div>
                                                        {expandedBranches.includes(branch.name) && (
                                                            <div className="p-2 bg-white border-t border-slate-100">
                                                                {addingSectorToBranchIndex?.cIdx === cIdx && addingSectorToBranchIndex?.bIdx === bIdx && (
                                                                    <div className="flex gap-2 mb-2">
                                                                        <input className="flex-1 border rounded p-1 text-xs bg-white" placeholder="Nome do Setor (BKT)" value={newSectorName} onChange={e => setNewSectorName(e.target.value)} autoFocus />
                                                                        <button onClick={() => handleAddSector(cIdx, bIdx)} className="bg-red-50 text-[#940910] px-2 rounded text-xs">OK</button>
                                                                        <button onClick={() => setAddingSectorToBranchIndex(null)} className="text-slate-400 px-2 text-xs">X</button>
                                                                    </div>
                                                                )}
                                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                                    {branch.sectors.map((sector, sIdx) => {
                                                                        const isEditingSector = editingSectorIndices?.cIdx === cIdx && editingSectorIndices?.bIdx === bIdx && editingSectorIndices?.sIdx === sIdx;
                                                                        return (
                                                                            <div key={sector} className="flex justify-between items-center bg-slate-50 p-1.5 rounded border border-slate-100 text-xs group">
                                                                                {isEditingSector ? (
                                                                                    <div className="flex gap-1 w-full">
                                                                                        <input className="flex-1 border border-slate-300 rounded px-1 py-0 text-[10px] bg-white" value={tempSectorName} onChange={e => setTempSectorName(e.target.value)} autoFocus />
                                                                                        <button onClick={() => handleUpdateSectorName(cIdx, bIdx, sIdx)} className="text-green-600"><Save size={10} /></button>
                                                                                        <button onClick={() => setEditingSectorIndices(null)} className="text-red-600"><X size={10} /></button>
                                                                                    </div>
                                                                                ) : (
                                                                                    <>
                                                                                        <div className="flex items-center gap-1 truncate mr-2">
                                                                                            <span className="truncate text-[#404040]" title={sector}>{sector}</span>
                                                                                            <button onClick={() => { setEditingSectorIndices({ cIdx, bIdx, sIdx }); setTempSectorName(sector); }} className="text-slate-300 hover:text-[#940910] opacity-0 group-hover:opacity-100 relative z-20"><Pencil size={10} className="pointer-events-none" /></button>
                                                                                        </div>
                                                                                        <button type="button" onClick={(e) => handleDeleteSector(e, cIdx, bIdx, sIdx)} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 relative z-20"><X size={12} className="pointer-events-none" /></button>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                                {branch.sectors.length === 0 && !addingSectorToBranchIndex && <p className="text-[10px] text-slate-400 italic text-center">Sem setores</p>}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
