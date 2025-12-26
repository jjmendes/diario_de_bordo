
import React, { useState, useEffect } from 'react';
import { Occurrence, TeamMember, EscalationLevel, ReasonTree } from '../types';
import { Button, CustomSelect } from './UiComponents';
import { SupabaseDB } from '../services/supabaseDb';

interface EditOccurrenceFormProps {
  occurrence: Occurrence;
  teamMembers: TeamMember[];
  onSubmit: (updatedData: Partial<Occurrence>) => void;
  onCancel: () => void;
}

export const EditOccurrenceForm: React.FC<EditOccurrenceFormProps> = ({ occurrence, teamMembers, onSubmit, onCancel }) => {
  const [userId, setUserId] = useState(occurrence.userId);
  const [category, setCategory] = useState<string>(occurrence.category);
  const [reason, setReason] = useState(occurrence.reason);
  const [description, setDescription] = useState(occurrence.description);
  const [escalationLevel, setEscalationLevel] = useState<EscalationLevel>(occurrence.escalationLevel || EscalationLevel.NONE);

  const [branch, setBranch] = useState(occurrence.branch || '');
  const [sector, setSector] = useState(occurrence.sector || '');

  const [reasonsHierarchy, setReasonsHierarchy] = useState<ReasonTree[]>([]);
  const [branchDataMap, setBranchDataMap] = useState<Record<string, string[]>>({});
  const [branchToClusterMap, setBranchToClusterMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadData = async () => {
      const [reasons, bData, bcMap] = await Promise.all([
        SupabaseDB.getReasonHierarchy(),
        SupabaseDB.getBranchDataMap(),
        SupabaseDB.getBranchToClusterMap()
      ]);
      setReasonsHierarchy(reasons);
      setBranchDataMap(bData);
      setBranchToClusterMap(bcMap);
    };
    loadData();
  }, []);

  const availableReasons = reasonsHierarchy.find(r => r.category === category)?.reasons || [];

  if (reason && !availableReasons.includes(reason) && category === occurrence.category) {
    availableReasons.push(reason);
  }

  const availableSectors = branch ? (branchDataMap[branch] || []) : [];
  const allBranches = Object.keys(branchDataMap).sort();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return alert('Técnico é obrigatório.');

    const selectedTech = teamMembers.find(t => t.id === userId);

    const newCluster = branch ? (branchToClusterMap[branch] || 'OUTROS') : occurrence.cluster;

    onSubmit({
      id: occurrence.id,
      userId,
      userName: selectedTech?.name || occurrence.userName,
      category,
      reason,
      description,
      escalationLevel,
      branch,
      sector,
      cluster: newCluster
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-[#940910]/5 p-3 rounded border border-[#940910]/20 grid grid-cols-2 gap-2">
        <div>
          <CustomSelect
            label="Filial"
            value={branch}
            onChange={(val) => { setBranch(val); setSector(''); }}
            options={[{ label: 'Selecione...', value: '' }, ...allBranches.map(b => ({ label: b, value: b }))]}
            placeholder="Selecione..."
          />
        </div>
        <div>
          <CustomSelect
            label="Setor"
            value={sector}
            onChange={setSector}
            options={[{ label: 'Selecione...', value: '' }, ...availableSectors.map(s => ({ label: s, value: s }))]}
            placeholder="Selecione..."
            disabled={!branch}
          />
        </div>
      </div>

      <div>
        <CustomSelect
          label="Técnico"
          value={userId}
          onChange={setUserId}
          options={teamMembers.map(m => ({ label: m.name, value: m.id }))}
          placeholder="Selecione o Técnico"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <CustomSelect
            label="Categoria"
            value={category}
            onChange={(val) => { setCategory(val); setReason(''); }}
            options={reasonsHierarchy.map(h => ({ label: h.category, value: h.category }))}
            placeholder="Selecione..."
            required
          />
        </div>
        <div>
          <CustomSelect
            label="Motivo"
            value={reason}
            onChange={setReason}
            options={[{ label: 'Selecione...', value: '' }, ...availableReasons.map(r => ({ label: r, value: r }))]}
            placeholder="Selecione..."
            disabled={!category}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <CustomSelect
            label="Recorrência (Escalonamento)"
            value={escalationLevel}
            onChange={(val) => setEscalationLevel(val as EscalationLevel)}
            options={Object.values(EscalationLevel).map(l => ({ label: l, value: l }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#404040] mb-1">Descrição</label>
          <textarea
            className="w-full border rounded-md p-2 bg-white focus:ring-2 focus:ring-[#940910]/20 outline-none h-[62px]"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" className="bg-[#940910] hover:bg-[#7a060c] text-white">Salvar Alterações</Button>
      </div>
    </form>
  );
};
