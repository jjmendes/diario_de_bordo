
import React, { useState, useRef } from 'react';
import { TeamMember, TeamMemberRole, UserRole, User } from '../../types';
import { SupabaseDB } from '../../services/supabaseDb';
import { Card, Button, Badge } from '../UiComponents';
import { Upload, Trash2, UserPlus, Users, Search, FileDown, HardHat, Download, Pencil, FilterX, AlertTriangle, CheckCircle, X } from 'lucide-react';

interface AdminTeamManagementProps {
    mode: 'TEAM' | 'GESTORES';
    teamMembers: TeamMember[];
    users: User[]; // For supervisor validation
    uniqueClusters: string[];
    loading: boolean;
    onRefresh: () => Promise<void>;
    onRequestImport: (fileContent: string, type: 'TEAM' | 'GESTORES') => void;
}

export const AdminTeamManagement: React.FC<AdminTeamManagementProps> = ({
    mode,
    teamMembers,
    users,
    uniqueClusters,
    loading,
    onRefresh,
    onRequestImport
}) => {
    // State
    const [searchTeamTerm, setSearchTeamTerm] = useState('');
    const [showTeamErrorsOnly, setShowTeamErrorsOnly] = useState(false);
    const [isAddingTeam, setIsAddingTeam] = useState(false);
    const [formType, setFormType] = useState<'GESTOR' | 'TECNICO'>(mode === 'TEAM' ? 'TECNICO' : 'GESTOR');
    const [editingOriginalId, setEditingOriginalId] = useState<string | null>(null);
    const [internalLoading, setInternalLoading] = useState(false);

    // Form Fields
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamId, setNewTeamId] = useState('');
    const [newTeamRole, setNewTeamRole] = useState<TeamMemberRole>(TeamMemberRole.TECNICO);
    const [newTeamReportsTo, setNewTeamReportsTo] = useState('');
    const [newTeamSupervisor, setNewTeamSupervisor] = useState('');
    const [newTeamCoordenador, setNewTeamCoordenador] = useState('');
    const [newTeamGerente, setNewTeamGerente] = useState('');
    const [newTeamControlador, setNewTeamControlador] = useState('');
    const [newTeamCluster, setNewTeamCluster] = useState('');
    const [newTeamFilial, setNewTeamFilial] = useState('');
    const [newTeamSegment, setNewTeamSegment] = useState<'BA' | 'TT' | ''>('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- HELPERS ---

    const downloadCSV = (filename: string, content: string) => {
        const blob = new Blob([`\uFEFF${content} `], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const isSupervisorValid = (supId?: string) => {
        if (!supId) return false;
        // Valida se o ID existe na lista de Gestores/Equipe (Hierarquia)
        return teamMembers.some(m => String(m.id).trim().toLowerCase() === String(supId).trim().toLowerCase());
    };

    const getSupervisorName = (supId?: string) => {
        if (!supId) return '-';
        const user = users.find(u => u.id.toLowerCase() === supId.toLowerCase());
        return user ? user.name : '-';
    };

    const countTeamErrors = teamMembers.filter(m => !m.supervisorId || !isSupervisorValid(m.supervisorId)).length;

    // Derive unique branches for dropdown, filtered by selected Cluster if any
    const uniqueBranches = Array.from(new Set(
        teamMembers
            .filter(m => !newTeamCluster || m.cluster === newTeamCluster)
            .map(m => m.filial)
            .filter(Boolean)
    )).sort();

    // Hierarchy Lists for Selects
    const supervisors = teamMembers.filter(m => m.role === TeamMemberRole.SUPERVISOR).sort((a, b) => a.name.localeCompare(b.name));
    const coordinators = teamMembers.filter(m => m.role === TeamMemberRole.COORDENADOR).sort((a, b) => a.name.localeCompare(b.name));
    const managers = teamMembers.filter(m => m.role === TeamMemberRole.GERENTE).sort((a, b) => a.name.localeCompare(b.name));

    const [showInactive, setShowInactive] = useState(false);

    const data = teamMembers.filter(m => mode === 'TEAM' ? m.role === TeamMemberRole.TECNICO : m.role !== TeamMemberRole.TECNICO);

    const filteredData = data.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(searchTeamTerm.toLowerCase()) ||
            m.id.toLowerCase().includes(searchTeamTerm.toLowerCase()) ||
            (m.filial && m.filial.toLowerCase().includes(searchTeamTerm.toLowerCase())) ||
            (m.supervisorId && m.supervisorId.toLowerCase().includes(searchTeamTerm.toLowerCase()));

        const hasError = !m.supervisorId || !isSupervisorValid(m.supervisorId);

        // Filter Inactive Logic
        if (!showInactive && !m.active) return false;

        if (showTeamErrorsOnly && mode === 'TEAM') return matchesSearch && hasError;
        return matchesSearch;
    });

    // --- HANDLERS ---

    const handleManualTeamAdd = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newTeamName || (formType === 'TECNICO' && !newTeamId)) {
            alert(formType === 'TECNICO' ? "Campos obrigatórios: Nome e ID" : "Campo obrigatório: Nome");
            return;
        }

        setInternalLoading(true);

        let generatedId = newTeamId;
        if (formType === 'GESTOR' && !editingOriginalId) {
            const prefix = newTeamRole === TeamMemberRole.SUPERVISOR ? 'S' :
                newTeamRole === TeamMemberRole.COORDENADOR ? 'CO' : 'G';

            const existingIds = teamMembers
                .filter(m => m.id.startsWith(prefix))
                .map(m => parseInt(m.id.replace(prefix, '')) || 0);

            const nextNumber = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
            generatedId = `${prefix}${String(nextNumber).padStart(3, '0')}`;
        }

        try {
            if (editingOriginalId && editingOriginalId !== generatedId) {
                await SupabaseDB.removeTeamMember(editingOriginalId);
            }

            const memberData: TeamMember = {
                id: generatedId,
                name: newTeamName,
                role: formType === 'TECNICO' ? TeamMemberRole.TECNICO : newTeamRole,
                active: true,
                supervisorId: formType === 'TECNICO' ? (newTeamSupervisor || undefined) : undefined,
                coordenadorId: formType === 'TECNICO' ? (newTeamCoordenador || undefined) : undefined,
                gerenteId: formType === 'TECNICO' ? (newTeamGerente || undefined) : undefined,
                reportsToId: formType === 'GESTOR' ? (newTeamReportsTo || undefined) : undefined,
                controladorId: newTeamControlador || undefined,
                cluster: newTeamCluster || undefined,
                filial: newTeamFilial || undefined,
                segment: formType === 'TECNICO' ? (newTeamSegment || undefined) : undefined
            };

            await SupabaseDB.addTeamMember(memberData);

            handleResetForm();
            await onRefresh();
            alert("Salvo com sucesso!");
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar membro.");
        } finally {
            setInternalLoading(false);
        }
    };

    const handleEditTeamMember = (member: TeamMember) => {
        setFormType(member.role === TeamMemberRole.TECNICO ? 'TECNICO' : 'GESTOR');
        setNewTeamName(member.name);
        setNewTeamId(member.id);
        setNewTeamRole(member.role);
        setNewTeamReportsTo(member.reportsToId || '');
        setNewTeamSupervisor(member.supervisorId || '');
        setNewTeamCoordenador(member.coordenadorId || '');
        setNewTeamGerente(member.gerenteId || '');
        setNewTeamControlador(member.controladorId || '');
        setNewTeamCluster(member.cluster || '');
        setNewTeamFilial(member.filial || '');
        setNewTeamSegment(member.segment || '');
        setEditingOriginalId(member.id);
        setIsAddingTeam(true);
    };

    const handleDeleteTeamMember = async (id: string) => {
        if (window.confirm("CONFIRMAR EXCLUSÃO? Esta ação não pode ser desfeita.")) {
            setInternalLoading(true);
            try {
                await SupabaseDB.removeTeamMember(id);
                await onRefresh();
            } catch (error) {
                console.error(error);
                alert("Erro ao remover membro.");
            } finally {
                setInternalLoading(false);
            }
        }
    };

    const handleResetForm = () => {
        setNewTeamName('');
        setNewTeamId('');
        setNewTeamRole(TeamMemberRole.TECNICO);
        setNewTeamReportsTo('');
        setNewTeamSupervisor('');
        setNewTeamCoordenador('');
        setNewTeamGerente('');
        setNewTeamControlador('');
        setNewTeamCluster('');
        setNewTeamFilial('');
        setNewTeamSegment('');
        setEditingOriginalId(null);
        setIsAddingTeam(false);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            onRequestImport(text, mode === 'TEAM' ? 'TEAM' : 'GESTORES');
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // Exports
    const handleExportTeam = () => {
        const header = "ID;Nome;Supervisor;Coordenador;Gerente;Controlador;Cluster;Filial;Segmento;Status\n";
        const rows = teamMembers
            .filter(m => m.role === TeamMemberRole.TECNICO)
            .map(m => {
                const supervisorName = m.supervisorId ? teamMembers.find(tm => tm.id === m.supervisorId)?.name || '' : '';
                const coordenadorName = m.coordenadorId ? teamMembers.find(tm => tm.id === m.coordenadorId)?.name || '' : '';
                const gerenteName = m.gerenteId ? teamMembers.find(tm => tm.id === m.gerenteId)?.name || '' : '';
                return `${m.id};${m.name};${supervisorName};${coordenadorName};${gerenteName};${m.controladorId || ''};${m.cluster || ''};${m.filial || ''};${m.segment || ''};${m.active ? 'Ativo' : 'Inativo'}`;
            }).join("\n");
        downloadCSV(`base_tecnicos_${new Date().toISOString().split('T')[0]}.csv`, header + rows);
    };

    const handleExportGestores = () => {
        const header = "ID;Nome;Cargo;Superior Imediato;Cluster;Filial;Status\n";
        const rows = teamMembers
            .filter(m => m.role !== TeamMemberRole.TECNICO)
            .map(m => {
                const superiorName = m.reportsToId ? teamMembers.find(tm => tm.id === m.reportsToId)?.name || '' : '';
                return `${m.id};${m.name};${m.role};${superiorName};${m.cluster || ''};${m.filial || ''};${m.active ? 'Ativo' : 'Inativo'}`;
            }).join("\n");
        downloadCSV(`base_gestores_${new Date().toISOString().split('T')[0]}.csv`, header + rows);
    };

    const handleDownloadTemplate = () => {
        if (mode === 'TEAM') {
            const header = "ID;Nome;Supervisor;Coordenador;Gerente;Controlador;Cluster;Filial;Segmento\n";
            const example = "T001;João Silva;Fernando Lima;Roberto Santos;Carlos Silva;C001;SALVADOR;SALVADOR;BA";
            downloadCSV("modelo_importacao_tecnicos.csv", header + example);
        } else {
            const header = "ID;Nome;Cargo;Superior Imediato;Cluster;Filial\n";
            const example = "S001;Fernando Lima;Supervisor;Roberto Santos;SALVADOR;SALVADOR";
            downloadCSV("modelo_importacao_gestores.csv", header + example);
        }
    };

    const isLoading = loading || internalLoading;

    const getMemberName = (id: string | null | undefined) => {
        if (!id) return '-';
        const cleanId = String(id).trim().toLowerCase();

        const member = teamMembers.find(m => String(m.id).trim().toLowerCase() === cleanId);
        if (member) return member.name;

        // Fallback: Check users list (for Controllers/Supervisors that might be in specific Users table)
        const user = users.find(u => String(u.id).trim().toLowerCase() === cleanId);
        return user ? user.name : id;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header / Actions Area */}
            <div className="space-y-4">

                {/* Buttons Row (Search moved to Table) */}
                <div className="flex flex-wrap items-center gap-3">
                    {mode === 'GESTORES' ? (
                        <div className="flex flex-col gap-3 w-full">

                            {/* Row 2: Add Actions */}
                            <div className="flex flex-wrap gap-2 justify-end w-full">
                                <Button variant="outline" onClick={() => {
                                    setFormType('GESTOR');
                                    setNewTeamRole(TeamMemberRole.SUPERVISOR);
                                    setIsAddingTeam(true);
                                    setEditingOriginalId(null);
                                    setTimeout(() => window.scrollTo({ top: 300, behavior: 'smooth' }), 100);
                                }} className="text-slate-600 border-slate-200 hover:bg-slate-50 text-sm h-9">
                                    <UserPlus size={16} className="mr-2" /> Novo Supervisor
                                </Button>
                                <Button variant="outline" onClick={() => {
                                    setFormType('GESTOR');
                                    setNewTeamRole(TeamMemberRole.COORDENADOR);
                                    setIsAddingTeam(true);
                                    setEditingOriginalId(null);
                                    setTimeout(() => window.scrollTo({ top: 300, behavior: 'smooth' }), 100);
                                }} className="text-slate-600 border-slate-200 hover:bg-slate-50 text-sm h-9">
                                    <UserPlus size={16} className="mr-2" /> Novo Coordenador
                                </Button>
                                <Button variant="outline" onClick={() => {
                                    setFormType('GESTOR');
                                    setNewTeamRole(TeamMemberRole.GERENTE);
                                    setIsAddingTeam(true);
                                    setEditingOriginalId(null);
                                    setTimeout(() => window.scrollTo({ top: 300, behavior: 'smooth' }), 100);
                                }} className="text-slate-600 border-slate-200 hover:bg-slate-50 text-sm h-9">
                                    <UserPlus size={16} className="mr-2" /> Novo Gerente
                                </Button>
                            </div>
                        </div>
                    ) : (
                        // TEAM MODE Buttons
                        <div className="flex flex-wrap items-center justify-end w-full gap-2 border-t pt-4 border-slate-100 md:border-t-0 md:pt-0">
                            <Button variant="outline" onClick={() => {
                                if (isAddingTeam) {
                                    setIsAddingTeam(false);
                                    handleResetForm();
                                } else {
                                    setFormType('TECNICO');
                                    setIsAddingTeam(true);
                                    setTimeout(() => window.scrollTo({ top: 300, behavior: 'smooth' }), 100);
                                }
                            }} className="text-slate-600 border-slate-200 text-sm h-9">
                                {isAddingTeam ? <><X size={16} className="mr-2" /> Ocultar Formulário</> : <><UserPlus size={16} className="mr-2" /> Novo Técnico</>}
                            </Button>
                        </div>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.txt" onChange={handleFileSelect} />
                </div>
            </div>

            {isAddingTeam && (
                <Card title={editingOriginalId ? "Editar Membro" : `Novo ${formType === 'TECNICO' ? 'Técnico' : newTeamRole}`} className="border-[#940910]/20 border relative scroll-mt-20">
                    <button onClick={() => { setIsAddingTeam(false); handleResetForm(); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
                    <form onSubmit={handleManualTeamAdd} className="space-y-4">
                        {/* Top Row: Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {formType === 'TECNICO' && (
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold mb-1 text-[#404040]">ID *</label>
                                    <input className="w-full border rounded p-2 text-sm bg-white font-mono" value={newTeamId} onChange={e => setNewTeamId(e.target.value)} required placeholder="Ex: T001" />
                                </div>
                            )}
                            <div className={formType === 'TECNICO' ? "md:col-span-3" : "md:col-span-4"}>
                                <label className="block text-xs font-bold mb-1 text-[#404040]">Nome Completo *</label>
                                <input className="w-full border rounded p-2 text-sm bg-white" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} required placeholder="Ex: João da Silva" />
                            </div>
                        </div>

                        {/* Middle Row: Hierarchy */}
                        {formType === 'TECNICO' ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-3 rounded border border-slate-200">
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-[#404040]">Supervisor Responsável *</label>
                                    <select className="w-full border rounded p-2 text-sm bg-white" value={newTeamSupervisor} onChange={e => setNewTeamSupervisor(e.target.value)}>
                                        <option value="">Selecione...</option>
                                        {supervisors.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-[#404040]">Coordenador *</label>
                                    <select className="w-full border rounded p-2 text-sm bg-white" value={newTeamCoordenador} onChange={e => setNewTeamCoordenador(e.target.value)}>
                                        <option value="">Selecione...</option>
                                        {coordinators.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-[#404040]">Gerente *</label>
                                    <select className="w-full border rounded p-2 text-sm bg-white" value={newTeamGerente} onChange={e => setNewTeamGerente(e.target.value)}>
                                        <option value="">Selecione...</option>
                                        {managers.map(g => (
                                            <option key={g.id} value={g.id}>{g.name} ({g.id})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-200">
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-[#404040]">Cargo</label>
                                    <select className="w-full border rounded p-2 text-sm bg-white" value={newTeamRole} onChange={e => setNewTeamRole(e.target.value as TeamMemberRole)}>
                                        <option value={TeamMemberRole.SUPERVISOR}>{TeamMemberRole.SUPERVISOR}</option>
                                        <option value={TeamMemberRole.COORDENADOR}>{TeamMemberRole.COORDENADOR}</option>
                                        <option value={TeamMemberRole.GERENTE}>{TeamMemberRole.GERENTE}</option>
                                    </select>
                                </div>
                                {newTeamRole !== TeamMemberRole.GERENTE && (
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-[#404040]">Superior Imediato (ID Reports To)</label>
                                        <select className="w-full border rounded p-2 text-sm bg-white" value={newTeamReportsTo} onChange={e => setNewTeamReportsTo(e.target.value)}>
                                            <option value="">Selecione...</option>
                                            {teamMembers
                                                .filter(m => {
                                                    if (newTeamRole === TeamMemberRole.SUPERVISOR) return m.role === TeamMemberRole.COORDENADOR;
                                                    if (newTeamRole === TeamMemberRole.COORDENADOR) return m.role === TeamMemberRole.GERENTE;
                                                    return false;
                                                })
                                                .map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)
                                            }
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Bottom Row: Location & Details */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-bold mb-1 text-[#404040]">Controlador/Despacho</label>
                                <input className="w-full border rounded p-2 text-sm bg-white" value={newTeamControlador} onChange={e => setNewTeamControlador(e.target.value)} placeholder="Opcional" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-[#404040]">Cluster (Região)</label>
                                <select className="w-full border rounded p-2 text-sm bg-white" value={newTeamCluster} onChange={e => setNewTeamCluster(e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {uniqueClusters.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-[#404040]">Filial</label>
                                <select className="w-full border rounded p-2 text-sm bg-white" value={newTeamFilial} onChange={e => setNewTeamFilial(e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            {formType === 'TECNICO' && (
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-[#404040]">Segmento</label>
                                    <select className="w-full border rounded p-2 text-sm bg-white" value={newTeamSegment} onChange={e => setNewTeamSegment(e.target.value as 'BA' | 'TT')}>
                                        <option value="">Selecione...</option>
                                        <option value="BA">BA (Banda Larga)</option>
                                        <option value="TT">TT (Técnico)</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                            <Button type="submit" className="bg-[#940910] hover:bg-[#7a060c]" disabled={isLoading}>
                                {editingOriginalId ? 'Atualizar Dados' : 'Salvar Registro'}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Table */}
            <Card>
                {/* Custom Header with Search */}
                <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="font-bold text-[#404040] text-lg">
                        {mode === 'TEAM' ? `Base de Técnicos (${filteredData.length})` : `Gestores Cadastrados (${filteredData.length})`}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                className="pl-9 pr-4 py-1.5 border rounded-md text-sm w-full md:w-64 focus:ring-1 focus:ring-[#940910] outline-none"
                                placeholder={mode === 'TEAM' ? "Buscar por nome..." : "Buscar gestor..."}
                                value={searchTeamTerm}
                                onChange={e => setSearchTeamTerm(e.target.value)}
                            />
                            {mode === 'TEAM' && (
                                <div className="absolute right-0 top-0 h-full flex items-center pr-2">
                                    <button
                                        onClick={() => setShowTeamErrorsOnly(!showTeamErrorsOnly)}
                                        className={`ml-2 p-1 rounded hover:bg-slate-100 text-slate-400 ${showTeamErrorsOnly ? 'text-amber-500' : ''}`}
                                        title="Ver erros de cadastro"
                                    >
                                        {showTeamErrorsOnly ? <FilterX size={14} /> : <AlertTriangle size={14} />}
                                    </button>
                                </div>
                            )}
                        </div>

                        {mode === 'TEAM' && (
                            <button
                                onClick={() => setShowInactive(!showInactive)}
                                className={`ml-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap ${showInactive ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                            >
                                {showInactive ? 'Ocultar Inativos' : 'Ver Inativos'}
                            </button>
                        )}

                        {(mode === 'GESTORES' || mode === 'TEAM') && (
                            <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                                <button onClick={mode === 'TEAM' ? handleExportTeam : handleExportGestores} className="p-2 rounded hover:bg-slate-100 text-slate-500 transition-colors" title="Exportar Base Completa"><Download size={18} /></button>
                                <button onClick={handleDownloadTemplate} className="p-2 rounded hover:bg-slate-100 text-slate-500 transition-colors" title="Modelo CSV (Vazio)"><FileDown size={18} /></button>
                                <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded hover:bg-red-50 text-[#940910] transition-colors" title="Importar Base CSV"><Upload size={18} /></button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto max-h-[600px]">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-[#940910] text-white">
                            <tr>
                                {mode === 'TEAM' ? (
                                    <>
                                        <th className="px-3 py-3 border-r border-white/20 whitespace-nowrap w-10 text-center">ID</th>
                                        <th className="px-3 py-3 border-r border-white/20 whitespace-nowrap min-w-[200px] text-center">Nome</th>
                                        <th className="px-3 py-3 border-r border-white/20 whitespace-nowrap w-32 text-center">Supervisor</th>
                                        <th className="px-3 py-3 border-r border-white/20 whitespace-nowrap w-32 text-center">Coordenador</th>
                                        <th className="px-3 py-3 border-r border-white/20 whitespace-nowrap w-32 text-center">Gerente</th>
                                        <th className="px-3 py-3 border-r border-white/20 whitespace-nowrap w-32 text-center">Controlador</th>
                                        <th className="px-3 py-3 border-r border-white/20 whitespace-nowrap text-center">Cluster</th>
                                        <th className="px-3 py-3 border-r border-white/20 whitespace-nowrap text-center">Filial</th>
                                        <th className="px-3 py-3 border-r border-white/20 whitespace-nowrap text-center">Segmento</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-3 py-3 border-r border-white/20 whitespace-nowrap w-14 text-center">ID</th>
                                        <th className="px-3 py-3 border-r border-white/20 whitespace-nowrap min-w-[200px] text-center">Nome</th>
                                        <th className="px-3 py-3 border-r border-white/20 whitespace-nowrap text-center">Cargo</th>
                                        <th className="px-3 py-3 border-r border-white/20 whitespace-nowrap text-center">Superior Imediato</th>
                                        <th className="px-3 py-3 border-r border-white/20 whitespace-nowrap text-center">Controlador</th>
                                        <th className="px-3 py-3 border-r border-white/20 whitespace-nowrap text-center">Cluster</th>
                                        <th className="px-3 py-3 border-r border-white/20 whitespace-nowrap text-center">Filial</th>
                                    </>
                                )}
                                <th className="px-3 py-3 border-r border-white/20 whitespace-nowrap text-center">Status</th>
                                <th className="px-3 py-3 text-center whitespace-nowrap">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-slate-600">
                            {filteredData.map(member => (
                                <tr key={member.id} className="hover:bg-slate-50 group transition-colors">
                                    {mode === 'TEAM' ? (
                                        <>
                                            <td className="px-3 py-2 text-[11px] font-mono font-bold text-[#404040] bg-white border-r border-[#940910]/5">
                                                {member.id}
                                            </td>
                                            <td className="px-3 py-2 font-bold text-[#404040] text-xs uppercase">
                                                {member.name}
                                            </td>

                                            <td className="px-3 py-2 max-w-[112px]">
                                                {member.supervisorId ? (
                                                    <div className="flex flex-col">
                                                        <span className={`${!isSupervisorValid(member.supervisorId) && 'text-red-500'} text-[11px] font-medium leading-tight`} title={getMemberName(member.supervisorId)}>
                                                            {getMemberName(member.supervisorId)}
                                                            {!isSupervisorValid(member.supervisorId) && <AlertTriangle size={10} className="inline ml-1 text-red-500" />}
                                                        </span>
                                                    </div>
                                                ) : <span className="text-red-300">-</span>}
                                            </td>
                                            <td className="px-3 py-2 text-[10px] uppercase leading-tight max-w-[112px]" title={getMemberName(member.coordenadorId)}>
                                                {member.coordenadorId ? getMemberName(member.coordenadorId) : '-'}
                                            </td>
                                            <td className="px-3 py-2 text-[10px] uppercase leading-tight max-w-[112px]" title={getMemberName(member.gerenteId)}>
                                                {member.gerenteId ? getMemberName(member.gerenteId) : '-'}
                                            </td>
                                            <td className="px-3 py-2 text-[10px] uppercase leading-tight max-w-[112px]" title={getMemberName(member.controladorId)}>
                                                {member.controladorId ? getMemberName(member.controladorId) : '-'}
                                            </td>
                                            <td className="px-3 py-2 text-[10px] uppercase">{member.cluster || '-'}</td>
                                            <td className="px-3 py-2 text-[10px] uppercase">{member.filial || '-'}</td>
                                            <td className="px-3 py-2">
                                                {member.segment && (
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${member.segment === 'BA' ? 'bg-sky-100 text-sky-700 border-sky-200' :
                                                        member.segment === 'TT' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                                            'bg-gray-100 text-gray-700 border-gray-200'
                                                        }`}>
                                                        {member.segment}
                                                    </span>
                                                )}
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-3 py-2 text-[11px] font-mono font-bold text-[#404040] bg-white border-r border-[#940910]/5">{member.id}</td>
                                            <td className="px-3 py-2 font-bold text-[#404040] text-xs uppercase">{member.name}</td>
                                            <td className="px-3 py-2">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold border ${member.role === TeamMemberRole.SUPERVISOR ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    member.role === TeamMemberRole.COORDENADOR ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        'bg-slate-50 text-slate-700 border-slate-200'
                                                    }`}>
                                                    {member.role}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-[11px] uppercase text-[#404040]">
                                                {member.reportsToId ? getMemberName(member.reportsToId) : '-'}
                                            </td>
                                            <td className="px-3 py-2 text-[11px] uppercase">{member.controladorId || '-'}</td>
                                            <td className="px-3 py-2 text-[11px] uppercase font-bold">{member.cluster || '-'}</td>
                                            <td className="px-3 py-2 text-[11px] uppercase">{member.filial || '-'}</td>
                                        </>
                                    )}
                                    <td className="px-3 py-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${member.active ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'} `}>
                                            {member.active ? 'ATIVO' : 'INATIVO'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button onClick={() => { handleEditTeamMember(member); setTimeout(() => window.scrollTo({ top: 300, behavior: 'smooth' }), 100); }} className="text-blue-500 hover:text-blue-700 p-1 hover:bg-blue-50 rounded transition-colors"><Pencil size={14} /></button>
                                            <button onClick={() => handleDeleteTeamMember(member.id)} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredData.length === 0 && <div className="p-8 text-center text-slate-400 italic">Nenhum registro encontrado.</div>}
                </div>
            </Card>
        </div>
    );
};
