import React, { useState, useEffect } from 'react';
import { SupabaseDB } from '../services/supabaseDb';
import { TeamMember, UserRole, User, ReasonTree, GeoCluster } from '../types';
import { Modal } from './UiComponents';
import { Trash2, Users, User as UserIcon, List, HardHat, AlertOctagon, RefreshCw, Database } from 'lucide-react';
import { AdminUserManagement } from './admin/AdminUserManagement';
import { AdminTeamManagement } from './admin/AdminTeamManagement';
import { AdminSystemConfig } from './admin/AdminSystemConfig';
import { AdminDatabaseOps } from './admin/AdminDatabaseOps';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'USERS' | 'GESTORES' | 'TEAM' | 'CONFIG' | 'DATABASE'>('USERS');

  // --- State for User Management ---
  const [systemUsers, setSystemUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // --- State for Config Management (Data Only) ---
  const [reasonsHierarchy, setReasonsHierarchy] = useState<ReasonTree[]>([]);
  const [geoHierarchy, setGeoHierarchy] = useState<GeoCluster[]>([]);
  const [uniqueClusters, setUniqueClusters] = useState<string[]>([]);
  const [branchToClusterMap, setBranchToClusterMap] = useState<Record<string, string>>({});

  // --- Import Modal State ---
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importType, setImportType] = useState<'TEAM' | 'USERS' | 'GESTORES'>('TEAM');
  const [pendingFileText, setPendingFileText] = useState<string>('');

  // --- State for Team Management ---
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoadingTeam(true);
    setLoadingUsers(true);

    try {
      const [team, users, reasons, geo, branchMap] = await Promise.all([
        SupabaseDB.getMyTeam('admin', UserRole.ADMIN),
        SupabaseDB.getUsers(),
        SupabaseDB.getReasonHierarchy(),
        SupabaseDB.getGeoHierarchy(),
        SupabaseDB.getBranchToClusterMap()
      ]);

      setTeamMembers(team);
      setSystemUsers(users);
      setReasonsHierarchy(reasons);
      setGeoHierarchy(geo);
      setUniqueClusters(geo.map(c => c.name));
      setBranchToClusterMap(branchMap);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      // Optional: alert user?
    } finally {
      setLoadingTeam(false);
      setLoadingUsers(false);
    }
  };

  // ================= IMPORT HANDLERS (Shared Modal) =================
  const confirmImport = async (mode: 'MERGE' | 'REPLACE') => {
    setLoadingTeam(true);
    setImportModalOpen(false);

    try {
      let result;
      if (importType === 'TEAM') {
        result = await SupabaseDB.importTeamFromCsv(pendingFileText, mode);
      } else if (importType === 'GESTORES') {
        result = await SupabaseDB.importGestoresFromCsv(pendingFileText, mode);
      } else {
        result = await SupabaseDB.importUsersFromCsv(pendingFileText, mode);
      }

      if (result) {
        alert(`Importação Concluída!\nTotal: ${result.total}\nNovos: ${result.new}\nAtualizados: ${result.updated}\nErros: ${result.errors.length}`);
        if (result.errors.length > 0) {
          console.error("Erros de importação:", result.errors);
          alert("Alguns erros ocorreram. Verifique o console.");
        }
      }
      await refreshData();
    } catch (error) {
      console.error(error);
      alert("Erro crítico na importação.");
    } finally {
      setLoadingTeam(false);
      setPendingFileText('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold text-[#404040]">Painel Administrativo</h2>
          <p className="text-sm text-slate-500">Gestão de acessos e estrutura operacional.</p>
        </div>
        <div className="flex bg-slate-200 p-1 rounded-lg">
          <button onClick={() => setActiveTab('USERS')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'USERS' ? 'bg-[#940910] text-white shadow' : 'text-[#404040] hover:text-[#940910]'}`}>
            <div className="flex items-center gap-2"><UserIcon size={16} /> Usuários</div>
          </button>
          <button onClick={() => setActiveTab('GESTORES')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'GESTORES' ? 'bg-[#940910] text-white shadow' : 'text-[#404040] hover:text-[#940910]'}`}>
            <div className="flex items-center gap-2"><Users size={16} /> Gestores</div>
          </button>
          <button onClick={() => setActiveTab('TEAM')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'TEAM' ? 'bg-[#940910] text-white shadow' : 'text-[#404040] hover:text-[#940910]'}`}>
            <div className="flex items-center gap-2"><HardHat size={16} /> Técnicos</div>
          </button>
          <button onClick={() => setActiveTab('CONFIG')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'CONFIG' ? 'bg-[#940910] text-white shadow' : 'text-[#404040] hover:text-[#940910]'}`}>
            <div className="flex items-center gap-2"><List size={16} /> Configurações</div>
          </button>
          <button onClick={() => setActiveTab('DATABASE')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'DATABASE' ? 'bg-[#940910] text-white shadow' : 'text-[#404040] hover:text-[#940910]'}`}>
            <div className="flex items-center gap-2"><Database size={16} /> Banco de Dados</div>
          </button>
        </div>
      </div>

      {/* --- IMPORT CONFIRMATION MODAL --- */}
      <Modal isOpen={importModalOpen} onClose={() => { setImportModalOpen(false); setPendingFileText(''); }} title={`Confirmar Importação de ${importType === 'TEAM' ? 'Técnicos' : importType === 'GESTORES' ? 'Gestores' : 'Usuários'}`}>
        <div className="space-y-6">
          <div className="flex items-start gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
            <AlertOctagon size={24} className="text-blue-600 shrink-0 mt-1" />
            <div>
              <h4 className="font-bold text-blue-800">Selecione o Modo de Importação</h4>
              <p className="text-sm text-blue-700 mt-1">Você deseja apenas adicionar os novos registros ou substituir completamente a base atual?</p>
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
              <h3 className="font-bold text-green-800">Acrescentar / Atualizar</h3>
              <p className="text-xs text-green-700 mt-1">Adiciona novos e atualiza existentes.<br />Mantém os registros que não estão na planilha.</p>
            </button>

            <button
              onClick={() => confirmImport('REPLACE')}
              className="flex flex-col items-center p-6 border-2 border-red-100 bg-red-50 hover:bg-red-100 hover:border-red-300 rounded-xl transition-all text-center group"
            >
              <div className="bg-white p-3 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                <Trash2 size={28} className="text-red-600" />
              </div>
              <h3 className="font-bold text-red-800">Substituir Base Completa</h3>
              <p className="text-xs text-red-700 mt-1">Apaga todos os registros atuais.<br />Mantém apenas o que está na planilha.</p>
            </button>
          </div>
        </div>
      </Modal>

      {/* USERS TAB */}
      {activeTab === 'USERS' && (
        <AdminUserManagement
          users={systemUsers}
          loading={loadingUsers}
          teamMembers={teamMembers}
          uniqueClusters={uniqueClusters}
          branchToClusterMap={branchToClusterMap}
          onRefresh={refreshData}
          onRequestImport={(text) => {
            setPendingFileText(text);
            setImportType('USERS');
            setImportModalOpen(true);
          }}
        />
      )}

      {/* TEAM TABS */}
      {activeTab === 'GESTORES' && (
        <AdminTeamManagement
          mode="GESTORES"
          teamMembers={teamMembers}
          users={systemUsers}
          uniqueClusters={uniqueClusters}
          loading={loadingTeam}
          onRefresh={refreshData}
          onRequestImport={(text, type) => {
            setPendingFileText(text);
            setImportType(type);
            setImportModalOpen(true);
          }}
        />
      )}

      {activeTab === 'TEAM' && (
        <AdminTeamManagement
          mode="TEAM"
          teamMembers={teamMembers}
          users={systemUsers}
          uniqueClusters={uniqueClusters}
          loading={loadingTeam}
          onRefresh={refreshData}
          onRequestImport={(text, type) => {
            setPendingFileText(text);
            setImportType(type);
            setImportModalOpen(true);
          }}
        />
      )}

      {/* CONFIG TAB */}
      {activeTab === 'CONFIG' && (
        <AdminSystemConfig
          reasonsHierarchy={reasonsHierarchy}
          geoHierarchy={geoHierarchy}
          onRefresh={refreshData}
        />
      )}

      {/* DATABASE TAB */}
      {activeTab === 'DATABASE' && (
        <AdminDatabaseOps
          onRefresh={refreshData}
        />
      )}
    </div>
  );
};
