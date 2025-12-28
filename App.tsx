import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User, UserRole, Occurrence, OccurrenceStatus, EscalationLevel } from './types';
import { SupabaseDB } from './services/supabaseDb'; // CHANGED: Import SupabaseDB

import { Dashboard } from './components/Dashboard';
import { OccurrenceList } from './components/OccurrenceList';
import { OccurrenceForm } from './components/OccurrenceForm';
import { EditOccurrenceForm } from './components/EditOccurrenceForm';
import { AdminPanel } from './components/AdminPanel';
import { Login } from './components/Login';
import { UserProfileModal } from './components/UserProfileModal';
import { Layout } from './components/Layout';
import { Button, Card, Modal, Badge } from './components/UiComponents';
import { Shield } from 'lucide-react';
import { AuthProvider, useAuth } from './components/AuthProvider';

const AppContent = () => {
  const { user: currentUser, loading: authLoading, signOut, refreshUser } = useAuth();
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [users, setUsers] = useState<User[]>([]); // New Users State
  const [loadingOccurrences, setLoadingOccurrences] = useState(false);
  const [selectedOccurrence, setSelectedOccurrence] = useState<Occurrence | null>(null);
  const [editingOccurrence, setEditingOccurrence] = useState<Occurrence | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);



  // Load initial data
  useEffect(() => {
    if (currentUser) {
      fetchOccurrences();
      fetchUsers(); // Fetch users
    }
  }, [currentUser]);

  const fetchOccurrences = async () => {
    setLoadingOccurrences(true);
    // Fetch a large number for Dashboard stats (temporary until Dashboard is refactored)
    const { data } = await SupabaseDB.getOccurrences({}, 0, 1000);
    setOccurrences(data);
    setLoadingOccurrences(false);
  };

  const fetchUsers = async () => {
    const data = await SupabaseDB.getUsers();
    setUsers(data);
  };

  const handleLogout = async () => {
    await signOut();
    setOccurrences([]);
    setUsers([]);
  };

  // Helper to format date manually
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleAddOccurrence = async (data: any | any[]) => {
    const itemsToCheck = Array.isArray(data) ? data : [data];
    const branchToClusterMap = await SupabaseDB.getBranchToClusterMap(); // now async

    // Create local date string YYYY-MM-DD correctly for storage
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const localDateString = `${year}-${month}-${day}`;
    const localTimeString = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    for (const item of itemsToCheck) {
      const derivedCluster = item.branch ? (branchToClusterMap[item.branch] || 'OUTROS') : '';

      const newOcc: Occurrence = {
        // ID is optional/temp here, backend will generate UUID if not provided or if we send undefined
        id: `occ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: item.userId,
        userName: item.userName,
        registeredByUserId: currentUser!.id,
        date: localDateString,
        time: localTimeString,
        category: item.category,
        reason: item.reason,
        description: item.description,
        status: OccurrenceStatus.REGISTRADA,
        escalationLevel: item.escalationLevel || EscalationLevel.NONE,
        location: item.location,
        branch: item.branch,
        sector: item.sector,
        cluster: derivedCluster,
        auditTrail: [{
          id: `aud_${Date.now()}`,
          date: new Date().toISOString(),
          action: 'REGISTRO',
          user: currentUser!.name,
          details: 'Registro inicial'
        }]
      };
      await SupabaseDB.saveOccurrence(newOcc);
    }

    // REFRESH from DB
    await fetchOccurrences();
    window.location.hash = '#/list';
  };

  const handleUpdateStatus = async (id: string, newStatus: OccurrenceStatus, feedback?: string) => {
    const occ = occurrences.find(o => o.id === id);
    if (!occ || !currentUser) return;

    const updated: Occurrence = {
      ...occ,
      status: newStatus,
      feedback: feedback || occ.feedback,
      auditTrail: [
        ...occ.auditTrail,
        {
          id: `aud_${Date.now()}`,
          date: new Date().toISOString(),
          action: newStatus,
          user: currentUser.name,
          details: feedback ? `Status alterado para ${newStatus}. Motivo: ${feedback}` : `Status alterado para ${newStatus}`
        }
      ]
    };

    await SupabaseDB.saveOccurrence(updated);
    await fetchOccurrences();
  };

  const handleUpdateEscalation = async (id: string, newLevel: EscalationLevel) => {
    const occ = occurrences.find(o => o.id === id);
    if (!occ || !currentUser) return;

    if (occ.escalationLevel === newLevel) return;

    const updated: Occurrence = {
      ...occ,
      escalationLevel: newLevel,
      auditTrail: [
        ...occ.auditTrail,
        {
          id: `aud_${Date.now()}`,
          date: new Date().toISOString(),
          action: 'ESCALONAMENTO',
          user: currentUser.name,
          details: `Recorrência alterada de "${occ.escalationLevel || 'Sem'}" para "${newLevel}"`
        }
      ]
    };

    await SupabaseDB.saveOccurrence(updated);
    await fetchOccurrences();
  };

  const handleSaveEdit = async (updatedData: Partial<Occurrence>) => {
    if (!currentUser || !editingOccurrence) return;

    const updated: Occurrence = {
      ...editingOccurrence,
      ...updatedData,
      auditTrail: [
        ...editingOccurrence.auditTrail,
        {
          id: `aud_${Date.now()}`,
          date: new Date().toISOString(),
          action: 'EDICAO',
          user: currentUser.name,
          details: 'Ocorrência editada pelo usuário'
        }
      ]
    };

    await SupabaseDB.saveOccurrence(updated);
    await fetchOccurrences();
    setEditingOccurrence(null);
  };

  const handleDeleteOccurrence = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir permanentemente esta ocorrência?")) {
      await SupabaseDB.deleteOccurrence(id);
      setOccurrences(prev => prev.filter(o => o.id !== id)); // Optimistic Update
    }
  };



  if (authLoading) return <div className="flex h-screen items-center justify-center bg-slate-50 text-[#940910]">Carregando Sistema...</div>;

  if (!currentUser) return <Login />;

  return (
    <Router>
      <Layout user={currentUser} onLogout={handleLogout} onEditProfile={() => setIsProfileModalOpen(true)}>
        <Routes>
          <Route path="/" element={
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-[#404040]">Dashboard Operacional</h2>
                <div className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full border shadow-sm">
                  {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              {loadingOccurrences ? (
                <div className="text-center py-10 text-slate-500">Carregando dados do painel...</div>
              ) : (
                <Dashboard occurrences={occurrences} />
              )}


            </div>
          } />

          <Route path="/new" element={<OccurrenceForm currentUser={currentUser} onSubmit={handleAddOccurrence} onCancel={() => window.history.back()} />} />

          <Route path="/list" element={
            <OccurrenceList
              users={users} // Pass users prop
              currentUser={currentUser}
              onUpdateStatus={handleUpdateStatus}
              onUpdateEscalation={handleUpdateEscalation}
              onViewDetails={setSelectedOccurrence}
              onEdit={setEditingOccurrence}
              onDelete={handleDeleteOccurrence}
            />
          } />

          <Route path="/admin" element={
            currentUser.role !== UserRole.ADMIN ? <Navigate to="/" /> : <AdminPanel />
          } />
        </Routes>
      </Layout>

      {/* Details Modal */}
      <Modal
        isOpen={!!selectedOccurrence}
        onClose={() => setSelectedOccurrence(null)}
        title={`Detalhes da Ocorrência #${selectedOccurrence?.id}`}
      >
        {selectedOccurrence && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-lg text-[#404040]">{selectedOccurrence.category}</h4>
                <p className="text-[#940910] font-medium">{selectedOccurrence.reason}</p>
                <div className="mt-2 flex flex-col gap-1">
                  <p className="text-sm text-slate-500">Técnico: <strong className="text-slate-700">{selectedOccurrence.userName}</strong></p>
                  <p className="text-xs text-slate-400">Data: {formatDate(selectedOccurrence.date)} às {selectedOccurrence.time}</p>
                  <p className="text-xs text-slate-400">Registrado por: {selectedOccurrence.registeredByUserId}</p>
                </div>
              </div>
              <Badge status={selectedOccurrence.status} />
            </div>

            <div className="flex gap-4 text-sm">
              <div className="bg-slate-50 px-3 py-2 rounded border border-slate-100">
                <span className="block text-[10px] text-slate-400 uppercase font-bold">Cluster (Regional)</span>
                <span className="font-semibold text-slate-700">{selectedOccurrence.cluster || '-'}</span>
              </div>
              <div className="bg-slate-50 px-3 py-2 rounded border border-slate-100">
                <span className="block text-[10px] text-slate-400 uppercase font-bold">Filial</span>
                <span className="font-semibold text-slate-700">{selectedOccurrence.branch || '-'}</span>
              </div>
              <div className="bg-slate-50 px-3 py-2 rounded border border-slate-100">
                <span className="block text-[10px] text-slate-400 uppercase font-bold">Setor</span>
                <span className="font-semibold text-slate-700">{selectedOccurrence.sector || '-'}</span>
              </div>
            </div>

            {selectedOccurrence.escalationLevel && selectedOccurrence.escalationLevel !== EscalationLevel.NONE && (
              <div className="bg-[#F6B700]/10 p-3 rounded-lg text-[#940910] text-sm font-bold border border-[#F6B700]/30 flex items-center gap-2 shadow-sm">
                ⚠️ Recorrência Ativa: <span className="underline">{selectedOccurrence.escalationLevel}</span>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <h5 className="text-xs font-bold text-slate-400 uppercase mb-1">Descrição / Observações</h5>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedOccurrence.description}</p>
            </div>

            {selectedOccurrence.feedback && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                <p className="text-xs font-bold text-[#940910] uppercase mb-1">Motivo do Cancelamento/Obs</p>
                <p className="text-sm text-[#940910]">{selectedOccurrence.feedback}</p>
              </div>
            )}

            <div>
              <h5 className="font-semibold text-sm mb-3 flex items-center gap-2 text-[#404040]"><Shield size={14} /> Trilha de Auditoria</h5>
              <ul className="text-xs space-y-3 border-l-2 border-slate-200 pl-4">
                {selectedOccurrence.auditTrail.map((log) => (
                  <li key={log.id} className="relative">
                    <div className="absolute -left-[21px] top-0 w-2.5 h-2.5 rounded-full bg-white border-2 border-slate-300"></div>
                    <p className="text-slate-500 mb-0.5">{new Date(log.date).toLocaleString()}</p>
                    <p>
                      <span className="text-[#940910] font-bold">{log.user}</span>: {log.details}
                      <span className="ml-2 inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] border border-slate-200 font-mono">{log.action}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingOccurrence}
        onClose={() => setEditingOccurrence(null)}
        title="Editar Ocorrência"
      >
        {editingOccurrence && (

          <AsyncEditFormWrapper
            occurrence={editingOccurrence}
            currentUser={currentUser}
            onSave={handleSaveEdit}
            onCancel={() => setEditingOccurrence(null)}
          />
        )}
      </Modal>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={currentUser}
        onUpdateUser={async () => { await refreshUser(); }}
      />
    </Router>
  );
};

// Helper component to handle async data fetching for EditForm
const AsyncEditFormWrapper = ({ occurrence, currentUser, onSave, onCancel }: any) => {
  const [team, setTeam] = useState<any[]>([]);
  useEffect(() => {
    SupabaseDB.getMyTeam(currentUser.id, currentUser.role).then(setTeam);
  }, [currentUser]);

  return (
    <EditOccurrenceForm
      occurrence={occurrence}
      teamMembers={team}
      onSubmit={onSave}
      onCancel={onCancel}
    />
  );
};

const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
