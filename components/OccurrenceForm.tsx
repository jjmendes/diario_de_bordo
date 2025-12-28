
import React, { useState, useEffect } from 'react';
import { User, TeamMember, EscalationLevel, ReasonTree, TeamMemberRole } from '../types';
import { SupabaseDB } from '../services/supabaseDb';
import { Card, Button, CustomSelect, TextArea } from './UiComponents';
import { Save, User as UserIcon, Layers, Clock } from 'lucide-react';

interface OccurrenceFormProps {
  currentUser: User;
  onSubmit: (data: any[]) => void;
  onCancel: () => void;
}

export const OccurrenceForm: React.FC<OccurrenceFormProps> = ({ currentUser, onSubmit, onCancel }) => {
  const [mode, setMode] = useState<'SINGLE' | 'BATCH'>('SINGLE');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [reasonsHierarchy, setReasonsHierarchy] = useState<ReasonTree[]>([]);
  const [branchData, setBranchData] = useState<Record<string, string[]>>({});
  const [branchToClusterMap, setBranchToClusterMap] = useState<Record<string, string>>({});

  // --- Single Entry State ---
  const [singleTechId, setSingleTechId] = useState('');
  const [singleCategory, setSingleCategory] = useState('');
  const [singleReason, setSingleReason] = useState('');
  const [singleDescription, setSingleDescription] = useState('');
  const [singleEscalation, setSingleEscalation] = useState<EscalationLevel>(EscalationLevel.NONE);
  const [singleSector, setSingleSector] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  // --- Batch Entry State ---
  const [batchCategory, setBatchCategory] = useState<string>('');
  const [rows, setRows] = useState<Record<string, { reason: string, description: string, escalation: EscalationLevel, sector: string }>>({});

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  // State for fresh user data (fetched asynchronously)
  const [freshUser, setFreshUser] = useState<User>(currentUser);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [reasons, bData, bcMap, users] = await Promise.all([
          SupabaseDB.getReasonHierarchy(),
          SupabaseDB.getBranchDataMap(),
          SupabaseDB.getBranchToClusterMap(),
          SupabaseDB.getUsers()
        ]);

        setReasonsHierarchy(reasons);
        setBranchData(bData);
        setBranchToClusterMap(bcMap);

        const updatedUser = users.find(u => u.id === currentUser.id) || currentUser;
        setFreshUser(updatedUser);

        const team = await SupabaseDB.getMyTeam(updatedUser.id, updatedUser.role);
        // Filter active technicians
        setTeamMembers(team.filter(m => m.role === TeamMemberRole.TECNICO && m.active));

      } catch (err) {
        console.error("Error loading form data:", err);
      }
    };
    loadData();
  }, [currentUser]);

  // --- Helper: Get Available Sectors for Current User ---
  const getAvailableSectors = () => {
    const userToCheck = freshUser || currentUser;
    const allowedClusters = userToCheck.allowedClusters || [];
    const allowedBranches = userToCheck.allowedBranches || [];
    const role = userToCheck.role;

    let sectors: string[] = [];

    Object.keys(branchToClusterMap).forEach(branch => {
      const cluster = branchToClusterMap[branch];
      // Check if user has access to this cluster
      if (allowedClusters.includes(cluster)) {
        // Check if user has restricted branch access, or access to all in cluster
        const hasBranchAccess = allowedBranches.length === 0 || allowedBranches.includes(branch);

        if (hasBranchAccess) {
          const branchSectors = branchData[branch] || [];
          sectors = [...sectors, ...branchSectors];
        }
      }
    });
    return sectors.sort();
  };

  const availableSectors = getAvailableSectors();

  // --- SINGLE ENTRY HANDLERS ---
  const handleSingleSubmit = () => {
    if (!singleTechId || !singleCategory || !singleReason || !singleSector) {
      alert("Preencha todos os campos obrigatórios (Técnico, Setor, Categoria e Motivo).");
      return;
    }

    const selectedTech = teamMembers.find(t => t.id === singleTechId);

    const entry = {
      userId: singleTechId,
      userName: selectedTech?.name || 'Desconhecido',
      category: singleCategory,
      reason: singleReason,
      description: singleDescription,
      escalationLevel: singleEscalation,
      branch: selectedTech?.filial, // Inherit branch from technician
      sector: singleSector
    };

    onSubmit([entry]);
  };

  // --- BATCH ENTRY HANDLERS ---
  const updateBatchRow = (userId: string, field: string, value: string) => {
    setRows(prev => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || { reason: '', description: '', escalation: EscalationLevel.NONE, sector: '' }),
        [field]: value
      }
    }));
  };

  const handleBatchSubmit = () => {
    if (!batchCategory) return alert("Selecione uma categoria primeiro.");

    const entries = teamMembers
      .filter(m => rows[m.id]?.reason)
      .map(m => {
        const row = rows[m.id];
        return {
          userId: m.id,
          userName: m.name,
          category: batchCategory,
          reason: row.reason,
          description: row.description,
          escalationLevel: row.escalation,
          branch: m.filial,
          sector: row.sector
        };
      });

    if (entries.length === 0) return alert("Preencha pelo menos um registro.");

    // Validate Sectors in Batch
    const missingSector = entries.find(e => !e.sector);
    if (missingSector) return alert(`Selecione o setor para o técnico ${missingSector.userName}`);

    onSubmit(entries);
  };

  // --- RENDER HELPERS ---
  const availableReasonsSingle = reasonsHierarchy.find(r => r.category === singleCategory)?.reasons || [];
  const availableReasonsBatch = reasonsHierarchy.find(r => r.category === batchCategory)?.reasons || [];

  return (
    <div className="space-y-4">
      {/* Header / Tabs */}
      <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex bg-slate-100 p-1 rounded-md">
          <button
            onClick={() => setMode('SINGLE')}
            className={`px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-all ${mode === 'SINGLE' ? 'bg-[#940910] text-white shadow-md' : 'text-slate-500 hover:text-[#940910]'}`}
          >
            <UserIcon size={16} /> Individual
          </button>
          <button
            onClick={() => setMode('BATCH')}
            className={`px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-all ${mode === 'BATCH' ? 'bg-[#940910] text-white shadow-md' : 'text-slate-500 hover:text-[#940910]'}`}
          >
            <Layers size={16} /> Por Tipo (Em Lote)
          </button>
        </div>
        <div className="flex items-center gap-2 text-slate-400 bg-slate-50 px-3 py-1.5 rounded border border-slate-100">
          <Clock size={16} />
          <span className="font-mono text-sm font-bold text-[#940910]">{currentTime}</span>
        </div>
      </div>

      {/* --- SINGLE ENTRY FORM --- */}
      {mode === 'SINGLE' && (
        <Card title="Nova Ocorrência (Individual)" className="border-t-4 border-t-[#940910]">
          <div className="space-y-6">

            {/* Block 1: Sector & Technician */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div>
                <CustomSelect
                  label="Técnico (Sua Equipe)"
                  value={singleTechId}
                  onChange={setSingleTechId}
                  options={teamMembers.map(t => ({ label: t.name, value: t.id }))}
                  placeholder="Selecione o Técnico..."
                  required
                />
              </div>
              <div>
                <CustomSelect
                  label="Setor (BKT)"
                  value={singleSector}
                  onChange={setSingleSector}
                  options={availableSectors.map(s => ({ label: s, value: s }))}
                  placeholder="Selecione o Setor..."
                  required
                  helperText="Exibindo setores das filiais vinculadas ao seu perfil."
                />
              </div>
            </div>

            {/* Block 2: Category & Reason */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomSelect
                label="Categoria"
                value={singleCategory}
                onChange={(val) => { setSingleCategory(val); setSingleReason(''); }}
                options={reasonsHierarchy.map(h => ({ label: h.category, value: h.category }))}
                placeholder="Selecione..."
                required
              />
              <CustomSelect
                label="Motivo"
                value={singleReason}
                onChange={setSingleReason}
                options={availableReasonsSingle.map(r => ({ label: r, value: r }))}
                placeholder="Selecione..."
                disabled={!singleCategory}
                required
              />
            </div>

            {/* Block 3: Escalation & Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#404040] mb-1">Recorrência (Escalonamento)</label>
                <CustomSelect
                  value={singleEscalation}
                  onChange={(val) => setSingleEscalation(val as EscalationLevel)}
                  options={Object.values(EscalationLevel).map(l => ({ label: l, value: l }))}
                />
                <p className="text-xs text-slate-400 mt-1">Indique até qual nível este problema foi levado.</p>
              </div>
              <div>
                <TextArea
                  label="Descrição (Opcional)"
                  rows={3}
                  value={singleDescription}
                  onChange={e => setSingleDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
              <Button onClick={handleSingleSubmit} className="bg-[#940910] hover:bg-[#7a060c] text-white">
                Salvar Registro
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* --- BATCH ENTRY FORM --- */}
      {mode === 'BATCH' && (
        <Card title="Registro em Lote (Por Tipo)" className="border-t-4 border-t-[#940910]">
          <div className="mb-6">
            <label className="block text-sm font-bold text-[#404040] mb-2">1. Selecione o Tipo de Ocorrência (Comum a todos)</label>
            <CustomSelect
              value={batchCategory}
              onChange={(val) => { setBatchCategory(val); setRows({}); }}
              options={reasonsHierarchy.map(h => ({ label: h.category, value: h.category }))}
              placeholder="Selecione a Categoria..."
            />
          </div>

          {batchCategory && (
            <>
              <div className="overflow-x-visible mb-6">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-[#940910] text-white font-bold border-b border-[#940910]">
                    <tr>
                      <th className="p-3 pl-3 border-r border-white/20 w-1/5">Técnico</th>
                      <th className="p-3 border-r border-white/20 w-1/4">Motivo Específico</th>
                      <th className="p-3 border-r border-white/20 w-1/5">Setor (BKT)</th>
                      <th className="p-3 border-r border-white/20 w-1/6">Recorrência</th>
                      <th className="p-3">Observação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teamMembers.map((m: TeamMember) => {
                      const defaultRow = { reason: '', description: '', escalation: EscalationLevel.NONE, sector: '' };
                      const row = rows[m.id] || defaultRow;
                      const hasData = !!row.reason;

                      // Use current user's available sectors (not technician's filial)
                      const userSectors = availableSectors;

                      return (
                        <tr key={m.id} className={hasData ? 'bg-[#940910]/5' : 'hover:bg-slate-50'}>
                          <td className="p-2 font-medium text-[#404040] pl-3 border-r border-slate-200 align-middle">
                            <div>{m.name}</div>
                            <div className="text-xs text-slate-400">{m.filial || 'Sem Filial'}</div>
                          </td>

                          <td className="p-2 align-middle border-r border-slate-200">
                            <CustomSelect
                              value={row.reason}
                              onChange={(val) => updateBatchRow(m.id, 'reason', val)}
                              options={availableReasonsBatch.map(r => ({ label: r, value: r }))}
                              placeholder="Selecione..."
                            />
                          </td>

                          <td className="p-2 align-middle border-r border-slate-200">
                            <CustomSelect
                              value={row.sector}
                              onChange={(val) => updateBatchRow(m.id, 'sector', val)}
                              options={userSectors.map(s => ({ label: s, value: s }))}
                              placeholder={userSectors.length ? "Selecione..." : "Sem setores"}
                              disabled={userSectors.length === 0}
                            />
                          </td>

                          <td className="p-2 align-middle border-r border-slate-200">
                            <CustomSelect
                              value={row.escalation}
                              onChange={(val) => updateBatchRow(m.id, 'escalation', val as EscalationLevel)}
                              options={Object.values(EscalationLevel).map(l => ({ label: l, value: l }))}
                            />
                          </td>

                          <td className="p-2 align-middle">
                            <input
                              className="w-full border rounded-md p-2 text-sm bg-white border-slate-300 focus:ring-1 focus:ring-[#940910] outline-none h-[38px]"
                              value={row.description}
                              onChange={e => updateBatchRow(m.id, 'description', e.target.value)}
                              placeholder="Opcional"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
                <Button onClick={handleBatchSubmit} className="bg-[#940910] hover:bg-[#7a060c] text-white">
                  <Save size={18} /> Salvar Ocorrências Preenchidas
                </Button>
              </div>
            </>
          )}

          {!batchCategory && (
            <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
              <p>Selecione uma categoria acima para listar a equipe e registrar ocorrências.</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
