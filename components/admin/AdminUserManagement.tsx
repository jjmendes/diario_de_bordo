import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole, TeamMember, TeamMemberRole } from '../../types';
import { SupabaseDB } from '../../services/supabaseDb';
import { Card, Button } from '../UiComponents';
import { Upload, Trash2, UserPlus, FileDown, Pencil, MapPin, Search, Download, Users } from 'lucide-react';

interface AdminUserManagementProps {
    users: User[];
    loading: boolean;
    teamMembers: TeamMember[]; // List for linking
    uniqueClusters: string[];
    branchToClusterMap: Record<string, string>;
    onRefresh: () => Promise<void>;
    onRequestImport: (fileContent: string) => void;
}

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({
    users,
    loading,
    teamMembers,
    uniqueClusters,
    branchToClusterMap,
    onRefresh,
    onRequestImport
}) => {
    const [newUserProps, setNewUserProps] = useState<{
        name: string;
        id: string;
        email: string;
        nickname: string;
        password: string;
        role: UserRole;
        allowedClusters: string[];
        allowedBranches: string[];
        teamMemberId?: string;
    }>({
        name: '', id: '', email: '', nickname: '', password: '', role: UserRole.CONTROLADOR, allowedClusters: [], allowedBranches: [], teamMemberId: ''
    });

    const [isLinking, setIsLinking] = useState(false); // UI toggle for linking mode

    const [searchTerm, setSearchTerm] = useState('');
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [editingUserOriginalId, setEditingUserOriginalId] = useState<string | null>(null);
    const [internalLoading, setInternalLoading] = useState(false);
    const userFileInputRef = useRef<HTMLInputElement>(null);
    const [availableSupervisors, setAvailableSupervisors] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        const loadInitialData = async () => {
            const team = await SupabaseDB.getMyTeam('admin', 'ADMIN'); // Fetch all as admin
            const sups = team.filter(m => m.role === TeamMemberRole.SUPERVISOR).map(m => ({ id: m.id, name: m.name }));
            setAvailableSupervisors(sups.sort((a, b) => a.name.localeCompare(b.name)));
        };
        loadInitialData();
    }, []);

    // Helper: Download Template
    const handleDownloadUserTemplate = () => {
        const csvHeader = "Nome;Código Vínculo (Copiar para Técnico);Senha;Email;Apelido;Perfil (ADMIN ou CONTROLADOR);Clusters (Separados por |);Filiais (Separadas por |)\n";
        const csvRows = "Carlos Silva;4055;123;carlos@empresa.com;Carlão;CONTROLADOR;SALVADOR|RECIFE;BKT_SALVADOR_CENTRO\nAdmin Geral;admin;123456;admin@empresa.com;Adm;ADMIN;SALVADOR|FORTALEZA|RECIFE;";
        const csvContent = `\uFEFF${csvHeader}${csvRows}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "modelo_importacao_usuarios.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Helper: Export Users
    const handleExportUsers = () => {
        const header = "Nome;Código Vínculo;Email;Apelido;Perfil;Senha;Clusters Acesso;Filiais Acesso\n";
        const rows = users.map(u =>
            `${u.name};${u.teamMemberId || ''};${u.email || ''};${u.nickname || ''};${u.role};${u.password || ''};${(u.allowedClusters || []).join('|')};${(u.allowedBranches || []).join('|')}`
        ).join("\n");

        const blob = new Blob([`\uFEFF${header + rows}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `usuarios_sistema_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Handler: Add/Update User
    const handleAddOrUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();

        const isPasswordValid = editingUserOriginalId ? true : !!newUserProps.password;

        if (newUserProps.name && newUserProps.id && newUserProps.email && isPasswordValid) {
            setInternalLoading(true);

            if (editingUserOriginalId) {
                // Update
                const userData: Partial<User> = {
                    id: editingUserOriginalId,
                    name: newUserProps.name,
                    nickname: newUserProps.nickname,
                    role: newUserProps.role,
                    email: newUserProps.email,
                    allowedClusters: newUserProps.allowedClusters,
                    allowedBranches: newUserProps.allowedBranches,
                    teamMemberId: newUserProps.teamMemberId,
                    allowedSupervisors: newUserProps.allowedSupervisors,
                    ...(newUserProps.password ? { password: newUserProps.password } : {})
                };
                try {
                    await SupabaseDB.updateUser(userData);
                    alert("Usuário atualizado com sucesso!");
                    handleResetForm();
                    await onRefresh();
                } catch (e: any) {
                    console.error("Erro ao atualizar usuário:", e);
                    alert(`Erro ao atualizar usuário: ${e.message || 'Erro desconhecido'}`);
                } finally {
                    setInternalLoading(false);
                }
            } else {
                // Create
                try {
                    const result = await SupabaseDB.createUser({
                        email: newUserProps.email,
                        password: newUserProps.password,
                        name: newUserProps.name,
                        nickname: newUserProps.nickname,
                        role: newUserProps.role,
                        allowedClusters: newUserProps.allowedClusters,
                        allowedBranches: newUserProps.allowedBranches,
                        teamMemberId: newUserProps.teamMemberId,
                        allowedSupervisors: newUserProps.allowedSupervisors
                    });

                    if (result.success) {
                        alert(`Usuário criado com sucesso!\n\nEmail: ${newUserProps.email}\nSenha: ${newUserProps.password}\n\nComunique essas credenciais ao colaborador de forma segura.`);
                        handleResetForm();
                        await onRefresh();
                    } else {
                        alert(`Erro ao criar usuário: ${result.error}`);
                    }
                } catch (e: any) {
                    console.error(e);
                    alert(`Erro ao criar usuário: ${e.message || 'Erro desconhecido'}`);
                } finally {
                    setInternalLoading(false);
                }
            }
        } else {
            alert("Preencha todos os dados obrigatórios.\n\nPara novos usuários: Nome, ID, Email e Senha.\nPara edição: Nome, ID e Email.");
        }
    };

    // Handler: Delete User
    const handleDeleteUser = async (user: User) => {
        if (confirm(`Tem certeza que deseja excluir o usuário ${user.name}? Esta ação não pode ser desfeita.`)) {
            setInternalLoading(true);
            try {
                await SupabaseDB.deleteUser(user.id);
                alert("Usuário excluído com sucesso!");
                if (editingUserOriginalId === user.id) {
                    handleResetForm();
                }
                await onRefresh();
            } catch (e: any) {
                console.error("Erro ao excluir:", e);
                alert(`Erro ao excluir usuário: ${e.message}`);
            } finally {
                setInternalLoading(false);
            }
        }
    };

    // Utility: Reset Form
    const handleResetForm = () => {
        setNewUserProps({
            name: '',
            id: '',
            email: '',
            nickname: '',
            password: '',
            role: UserRole.CONTROLADOR,
            allowedClusters: [],
            allowedBranches: [],
            teamMemberId: '',
            allowedSupervisors: []
        });
        setIsAddingUser(false);
        setEditingUserOriginalId(null);
        setIsLinking(false);
    };

    const handleEditUser = (user: User) => {
        setNewUserProps({
            name: user.name,
            id: user.id, // Display ID (Auth ID)
            email: user.email || '',
            nickname: user.nickname || '',
            password: user.password || '',
            role: user.role,
            allowedClusters: user.allowedClusters || [],
            allowedBranches: user.allowedBranches || [],
            teamMemberId: user.teamMemberId,
            allowedSupervisors: user.allowedSupervisors || []
        });
        setEditingUserOriginalId(user.id);
        setIsAddingUser(true);
        // If has teamMemberId, enable linking mode visually (though ID input is disabled anyway)
        setIsLinking(!!user.teamMemberId);
    };

    // Checkbox Logic
    const toggleClusterPermission = (cluster: string) => {
        setNewUserProps(prev => {
            const current = prev.allowedClusters;
            if (current.includes(cluster)) return { ...prev, allowedClusters: current.filter(c => c !== cluster) };
            else return { ...prev, allowedClusters: [...current, cluster] };
        });
    };

    const toggleAllClusters = () => {
        setNewUserProps(prev => {
            if (prev.allowedClusters.length === uniqueClusters.length) return { ...prev, allowedClusters: [] };
            else return { ...prev, allowedClusters: [...uniqueClusters] };
        });
    };

    const availableBranchesForSelection = uniqueClusters
        .filter(c => newUserProps.allowedClusters.includes(c))
        .flatMap(cluster => Object.keys(branchToClusterMap).filter(branch => branchToClusterMap[branch] === cluster))
        .sort();

    const toggleBranchPermission = (branch: string) => {
        setNewUserProps(prev => {
            const current = prev.allowedBranches;
            if (current.includes(branch)) return { ...prev, allowedBranches: current.filter(b => b !== branch) };
            else return { ...prev, allowedBranches: [...current, branch] };
        });
    };

    const toggleAllBranches = () => {
        setNewUserProps(prev => {
            const currentlyAvailable = availableBranchesForSelection;
            const allSelected = currentlyAvailable.every(b => prev.allowedBranches.includes(b));
            if (allSelected) return { ...prev, allowedBranches: prev.allowedBranches.filter(b => !currentlyAvailable.includes(b)) };
            else return { ...prev, allowedBranches: Array.from(new Set([...prev.allowedBranches, ...currentlyAvailable])) };
        });
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            onRequestImport(text);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const isLoading = loading || internalLoading;

    // Filter Logic
    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header / Actions Area */}
            <div className="space-y-4">
                {/* Buttons Row */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-wrap gap-2 justify-end w-full">
                        <Button variant="outline" onClick={() => {
                            handleResetForm();
                            setIsAddingUser(true);
                            setTimeout(() => window.scrollTo({ top: 300, behavior: 'smooth' }), 100);
                        }} className="text-slate-600 border-slate-200 hover:bg-slate-50 text-sm h-9">
                            <UserPlus size={16} className="mr-2" /> Novo Operador/Admin
                        </Button>
                        <div className="flex items-center gap-1 pl-2 border-l border-slate-200 ml-2">
                            <button onClick={handleExportUsers} className="p-2 rounded hover:bg-slate-100 text-slate-500 transition-colors" title="Exportar Lista"><Download size={18} /></button>
                            <button onClick={handleDownloadUserTemplate} className="p-2 rounded hover:bg-slate-100 text-slate-500 transition-colors" title="Baixar Modelo CSV"><FileDown size={18} /></button>
                            <button onClick={() => userFileInputRef.current?.click()} className="p-2 rounded hover:bg-red-50 text-[#940910] transition-colors" title="Importar CSV"><Upload size={18} /></button>
                            <input type="file" ref={userFileInputRef} className="hidden" accept=".csv,.txt" onChange={handleFileSelect} />
                        </div>
                    </div>
                </div>
            </div>

            {isAddingUser && (
                <Card title={editingUserOriginalId ? "Editar Dados de Acesso" : "Cadastrar Novo Acesso"} className="border-[#940910]/20 border">
                    <form onSubmit={handleAddOrUpdateUser} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium mb-1 text-[#404040]">Nome do Colaborador</label>
                                <input className="w-full border rounded p-2 text-sm bg-white" value={newUserProps.name} onChange={e => setNewUserProps({ ...newUserProps, name: e.target.value })} placeholder="Ex: Carlos Operador" required />
                            </div>
                            <div>
                                {editingUserOriginalId && (
                                    <div className="mb-2">
                                        <label className="block text-xs font-medium mb-1 text-slate-400">ID do Sistema (Automático)</label>
                                        <input className="w-full border rounded p-2 text-xs bg-slate-100 text-slate-500" value={newUserProps.id} disabled />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1 text-[#404040]">Senha de Acesso</label>
                                <input className="w-full border rounded p-2 text-sm bg-white" type="text" value={newUserProps.password} onChange={e => setNewUserProps({ ...newUserProps, password: e.target.value })} placeholder="123" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium mb-1 text-[#404040]">Email</label>
                                <input type="email" className="w-full border rounded p-2 text-sm bg-white" value={newUserProps.email} onChange={e => setNewUserProps({ ...newUserProps, email: e.target.value })} placeholder="Ex: carlos@empresa.com" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-[#404040]">Apelido</label>
                                    <input className="w-full border rounded p-2 text-sm bg-white" value={newUserProps.nickname} onChange={e => setNewUserProps({ ...newUserProps, nickname: e.target.value })} placeholder="Ex: Carlão" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-[#404040]">Perfil</label>
                                    <select className="w-full border rounded p-2 text-sm bg-white" value={newUserProps.role} onChange={e => setNewUserProps({ ...newUserProps, role: e.target.value as UserRole })}>
                                        <option value={UserRole.CONTROLADOR}>Operador</option>
                                        <option value={UserRole.ADMIN}>Admin</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* --- SUPERVISOR LINKING SECTION --- */}
                        <div className="pt-4 border-t border-slate-100">
                            <h4 className="font-bold text-[#404040] mb-2 flex items-center gap-2">
                                <Users size={16} className="text-[#940910]" />
                                Vínculo com Equipe (Supervisores)
                            </h4>
                            <p className="text-xs text-slate-500 mb-4">Selecione os supervisores que este usuário deve monitorar. O usuário verá todos os técnicos subordinados a estes supervisores.</p>

                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div className="max-h-60 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {availableSupervisors.map(sup => (
                                        <label key={sup.id} className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 hover:border-[#940910] cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={newUserProps.allowedSupervisors?.includes(sup.id)}
                                                onChange={() => {
                                                    setNewUserProps(prev => {
                                                        const current = prev.allowedSupervisors || [];
                                                        if (current.includes(sup.id)) return { ...prev, allowedSupervisors: current.filter(id => id !== sup.id) };
                                                        else return { ...prev, allowedSupervisors: [...current, sup.id] };
                                                    });
                                                }}
                                                className="rounded text-[#940910] focus:ring-[#940910]"
                                            />
                                            <span className="text-xs font-medium text-[#404040] truncate" title={sup.name}>{sup.name}</span>
                                        </label>
                                    ))}
                                    {availableSupervisors.length === 0 && <p className="text-xs text-slate-400 col-span-3">Nenhum supervisor encontrado na base.</p>}
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded border border-slate-200">
                            <div className="flex justify-between items-center mb-2 border-b border-slate-200 pb-2">
                                <label className="block text-sm font-bold flex items-center gap-2 text-[#404040]"><MapPin size={16} /> Clusters Permitidos</label>
                                <label className="flex items-center gap-1.5 text-xs cursor-pointer font-bold text-[#940910] hover:text-[#7a060c] select-none">
                                    <input type="checkbox" checked={newUserProps.allowedClusters.length === uniqueClusters.length && uniqueClusters.length > 0} onChange={toggleAllClusters} className="rounded text-[#940910] focus:ring-[#940910]" />
                                    {newUserProps.allowedClusters.length === uniqueClusters.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                                </label>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                                {uniqueClusters.map(cluster => (
                                    <label key={cluster} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white p-1 rounded">
                                        <input type="checkbox" checked={newUserProps.allowedClusters.includes(cluster)} onChange={() => toggleClusterPermission(cluster)} className="rounded text-[#940910] focus:ring-[#940910]" />
                                        {cluster}
                                    </label>
                                ))}
                            </div>
                        </div>
                        {availableBranchesForSelection.length > 0 && (
                            <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                <div className="flex justify-between items-center mb-2 border-b border-slate-200 pb-2">
                                    <label className="block text-sm font-bold flex items-center gap-2 text-[#404040]"><MapPin size={16} /> Filiais Permitidas</label>
                                    <label className="flex items-center gap-1.5 text-xs cursor-pointer font-bold text-[#940910] hover:text-[#7a060c] select-none">
                                        <input type="checkbox" checked={availableBranchesForSelection.every(b => newUserProps.allowedBranches.includes(b))} onChange={toggleAllBranches} className="rounded text-[#940910] focus:ring-[#940910]" />
                                        {availableBranchesForSelection.every(b => newUserProps.allowedBranches.includes(b)) ? 'Desmarcar Filiais Visíveis' : 'Marcar Filiais Visíveis'}
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                                    {availableBranchesForSelection.map(branch => (
                                        <label key={branch} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white p-1 rounded">
                                            <input type="checkbox" checked={newUserProps.allowedBranches.includes(branch)} onChange={() => toggleBranchPermission(branch)} className="rounded text-[#940910] focus:ring-[#940910]" />
                                            {branch}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex justify-end mt-2 gap-2">
                            <Button type="button" variant="ghost" onClick={handleResetForm}>Cancelar</Button>
                            <Button type="submit" className="bg-[#940910] hover:bg-[#7a060c]" disabled={isLoading}>
                                {isLoading ? 'Salvando...' : (editingUserOriginalId ? 'Atualizar Dados' : 'Salvar Acesso')}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            <Card className="overflow-hidden border-slate-200 shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="font-bold text-[#404040] text-lg flex items-center gap-2">
                        Usuários Cadastrados no Sistema <span className="text-xs font-normal text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">{filteredUsers.length}</span>
                    </h3>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar usuários..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-1.5 border rounded-md text-sm w-full md:w-32 focus:ring-1 focus:ring-[#940910] outline-none h-9"
                            />
                        </div>


                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#940910] text-white font-bold border-b border-[#940910]">
                            <tr>
                                <th className="p-3 border-r border-white/20">Nome do Controlador</th>
                                <th className="p-3 border-r border-white/20">Perfil</th>
                                <th className="p-3 border-r border-white/20">Clusters Acesso</th>
                                <th className="p-3 border-r border-white/20">Filiais Específicas</th>
                                <th className="p-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#940910]"></div>
                                            Carregando...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        Nenhum usuário encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-3 text-slate-600">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{user.name}</span>
                                                {user.email && <span className="text-xs text-slate-400">{user.email}</span>}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${user.role === UserRole.ADMIN
                                                ? 'bg-red-50 text-red-700 border-red-100'
                                                : 'bg-amber-50 text-amber-700 border-amber-100'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="p-3 text-xs text-slate-500 max-w-[200px]">
                                            {user.allowedClusters?.length
                                                ? user.allowedClusters.join(', ')
                                                : <span className="italic text-slate-400">Todos do Global</span>}
                                        </td>
                                        <td className="p-3 text-xs text-slate-500 max-w-[200px]">
                                            {user.allowedBranches?.length
                                                ? <span title={user.allowedBranches.join(', ')}>{user.allowedBranches.length} filiais selecionadas</span>
                                                : <span className="italic text-slate-400">Todas do Cluster</span>}
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex items-center justify-center gap-2 transition-opacity">
                                                <button
                                                    onClick={() => handleEditUser(user)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    title="Editar"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Excluir"
                                                    disabled={user.id === 'admin'}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
