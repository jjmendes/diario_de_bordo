import React, { useState } from 'react';
import { SupabaseDB } from '../../services/supabaseDb';

import { TeamMemberRole, UserRole } from '../../types';
import { Card, Button } from '../UiComponents';
import { Upload, Download, Database, AlertCircle, Loader2 } from 'lucide-react';

interface AdminDatabaseOpsProps {
    onRefresh: () => Promise<void>;
}

export const AdminDatabaseOps: React.FC<AdminDatabaseOpsProps> = ({ onRefresh }) => {
    const [loading, setLoading] = useState(false);

    const handleSystemBackup = async () => {
        if (!window.confirm("Gerar backup completo do sistema em JSON? Isso pode levar alguns segundos.")) return;

        setLoading(true);
        try {
            // Always fetch fresh data for backup, independent of UI state
            const [team, users, occurrences, reasons, geo] = await Promise.all([
                SupabaseDB.getMyTeam('admin', UserRole.ADMIN),
                SupabaseDB.getUsers(),
                SupabaseDB.getOccurrences(),
                SupabaseDB.getReasonHierarchy(),
                SupabaseDB.getGeoHierarchy()
            ]);

            const backupData = {
                metadata: {
                    timestamp: new Date().toISOString(),
                    version: "2.0",
                    generatedBy: "Admin Panel"
                },
                data: {
                    team,
                    users,
                    occurrences,
                    configs: {
                        reasons,
                        geo
                    }
                }
            };

            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `backup_sistema_db_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            alert("Backup gerado com sucesso!");
        } catch (e) {
            console.error("Erro no backup:", e);
            alert("Erro ao gerar backup. Verifique o console.");
        } finally {
            setLoading(false);
        }
    };



    const handleRestoreFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!window.confirm("ATENÇÃO: Restaurar de um backup substituirá TODOS os dados existentes no sistema.\n\nEsta ação é irreversível. Deseja continuar?")) {
            e.target.value = '';
            return;
        }

        setLoading(true);
        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const jsonString = event.target?.result as string;
                    const backupData = JSON.parse(jsonString);

                    if (!backupData || !backupData.data) {
                        alert("Arquivo de backup inválido. Estrutura de dados incorreta.");
                        setLoading(false);
                        return;
                    }

                    const { team, users, occurrences, configs } = backupData.data;

                    await SupabaseDB.clearAllData();

                    // Restore configs first
                    if (configs?.reasons) await SupabaseDB.saveReasonHierarchy(configs.reasons);
                    if (configs?.geo) await SupabaseDB.saveGeoHierarchy(configs.geo);

                    // Restore users
                    if (users) {
                        // @ts-ignore
                        for (const user of users) {
                            await SupabaseDB.createUser({
                                email: user.email,
                                password: user.password || 'default_password', // Passwords not restored plain
                                name: user.name,
                                nickname: user.nickname,
                                role: user.role,
                                allowedClusters: user.allowedClusters,
                                allowedBranches: user.allowedBranches
                            });
                        }
                    }

                    // Restore team members
                    if (team) {
                        // @ts-ignore
                        for (const member of team) {
                            await SupabaseDB.addTeamMember(member);
                        }
                    }

                    // Restore occurrences
                    if (occurrences) {
                        // @ts-ignore
                        for (const occ of occurrences) {
                            await SupabaseDB.saveOccurrence(occ);
                        }
                    }

                    alert("Restauração concluída com sucesso!");
                    await onRefresh();
                } catch (parseError) {
                    console.error("Erro ao processar arquivo de backup:", parseError);
                    alert("Erro ao processar arquivo de backup. Verifique o formato JSON.");
                } finally {
                    setLoading(false);
                    e.target.value = '';
                }
            };
            reader.readAsText(file);
        } catch (error) {
            console.error("Erro ao iniciar restauração:", error);
            alert("Erro ao iniciar restauração.");
            setLoading(false);
            e.target.value = '';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card title="Backup e Restauração de Dados" className="border-l-4 border-l-[#940910]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* EXPORT */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[#940910] font-bold text-lg">
                            <Download size={24} /> Exportar Backup Completo
                        </div>
                        <p className="text-sm text-slate-600">
                            Gera um arquivo JSON contendo todos os dados do sistema: Usuários, Equipe Técnica, Ocorrências e Configurações.
                        </p>
                        <Button onClick={handleSystemBackup} disabled={loading} className="w-full bg-[#940910] hover:bg-[#7a060c] text-white py-6">
                            {loading ? <Loader2 className="animate-spin mr-2" /> : <Download size={20} className="mr-2" />}
                            {loading ? 'Processando...' : 'Baixar Backup (.json)'}
                        </Button>
                    </div>

                    {/* IMPORT */}
                    <div className="space-y-4 border-t md:border-t-0 md:border-l pt-6 md:pt-0 md:pl-8 border-slate-200">
                        <div className="flex items-center gap-2 text-amber-600 font-bold text-lg">
                            <Upload size={24} /> Restaurar Backup
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
                            <p className="font-bold mb-1 flex items-center gap-1"><AlertCircle size={14} /> AÇÃO DESTRUTIVA</p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>Apaga <strong>TODOS</strong> os dados atuais.</li>
                                <li>Substitui pelo conteúdo do backup.</li>
                                <li>Logins (Auth) não são restaurados automaticamente.</li>
                            </ul>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="restore-file" className={`
                 flex items-center justify-center w-full px-4 py-3 border-2 border-dashed rounded-md cursor-pointer transition-colors
                 ${loading ? 'bg-slate-100 border-slate-300 cursor-not-allowed' : 'border-amber-300 bg-amber-50/50 hover:bg-amber-50'}
               `}>
                                {loading ? (
                                    <span className="flex items-center text-slate-500 text-sm"><Loader2 className="animate-spin mr-2" size={16} /> Restaurando...</span>
                                ) : (
                                    <span className="text-amber-700 text-sm font-bold">Clique para Selecionar Arquivo JSON</span>
                                )}
                                <input
                                    type="file"
                                    accept=".json"
                                    id="restore-file"
                                    className="hidden"
                                    disabled={loading}
                                    onChange={handleRestoreFromFile}
                                />
                            </label>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};
