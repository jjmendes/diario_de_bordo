import React, { useState, useEffect, useRef } from 'react';
import { SupabaseDB } from '../services/supabaseDb';
import { MockDB } from '../services/mockDatabase'; // Temporary keep for methods not yet migrated
import { TeamMember, TeamMemberRole, UserRole, User, ReasonTree, GeoCluster, GeoBranch } from '../types';
import { Card, Button, Modal, Badge } from './UiComponents';
import { Upload, Trash2, UserPlus, Users, Search, FileDown, User as UserIcon, Pencil, MapPin, List, Plus, Save, X, Download, ChevronDown, ChevronRight, Globe, Database, CheckCircle, FilterX, AlertOctagon, RefreshCw, AlertTriangle, HardHat } from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'USERS' | 'GESTORES' | 'TEAM' | 'CONFIG'>('USERS');

  // --- State for Team Management ---
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false); // Added loading state
  const [searchTeamTerm, setSearchTeamTerm] = useState('');
  const [showTeamErrorsOnly, setShowTeamErrorsOnly] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formType, setFormType] = useState<'GESTOR' | 'TECNICO'>('TECNICO');
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
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [editingOriginalId, setEditingOriginalId] = useState<string | null>(null);

  // --- State for User Management ---
  const [systemUsers, setSystemUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingOccurrences, setLoadingOccurrences] = useState(false);
  const [loadingRestore, setLoadingRestore] = useState(false);
  const [newUserProps, setNewUserProps] = useState<{ name: string, id: string, email: string, nickname: string, password: string, role: UserRole, allowedClusters: string[], allowedBranches: string[] }>({
    name: '', id: '', email: '', nickname: '', password: '', role: UserRole.CONTROLADOR, allowedClusters: [], allowedBranches: []
  });
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUserOriginalId, setEditingUserOriginalId] = useState<string | null>(null);
  const userFileInputRef = useRef<HTMLInputElement>(null);

  // --- State for Config Management ---
  const [configMode, setConfigMode] = useState<'REASONS' | 'GEO' | 'DB'>('REASONS');
  const dbInputRef = useRef<HTMLInputElement>(null);

  // Reasons
  const [reasonsHierarchy, setReasonsHierarchy] = useState<ReasonTree[]>([]);
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [tempCategoryName, setTempCategoryName] = useState('');

  const [editingReasonIndices, setEditingReasonIndices] = useState<{ cIdx: number, rIdx: number } | null>(null);
  const [tempReasonText, setTempReasonText] = useState('');
  const [newReasonText, setNewReasonText] = useState('');

  // Geo
  const [geoHierarchy, setGeoHierarchy] = useState<GeoCluster[]>([]);
  const [expandedClusters, setExpandedClusters] = useState<string[]>([]);
  const [expandedBranches, setExpandedBranches] = useState<string[]>([]);

  // Geo Add/Edit States
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

  const [uniqueClusters, setUniqueClusters] = useState<string[]>([]);
  const [branchToClusterMap, setBranchToClusterMap] = useState<Record<string, string>>({});

  // --- Import Modal State ---
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importType, setImportType] = useState<'TEAM' | 'USERS' | 'GESTORES'>('TEAM');
  const [pendingFileText, setPendingFileText] = useState<string>('');

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoadingTeam(true);
    setLoadingUsers(true);

    // FETCH ASYNC
    const team = await SupabaseDB.getMyTeam('admin', UserRole.ADMIN);
    setTeamMembers(team);
    setLoadingTeam(false);

    const users = await SupabaseDB.getUsers();
    setSystemUsers(users);
    setLoadingUsers(false);

    const reasons = await SupabaseDB.getReasonHierarchy();
    setReasonsHierarchy(reasons);

    const geo = await SupabaseDB.getGeoHierarchy();
    setGeoHierarchy(geo);
    setUniqueClusters(geo.map(c => c.name));
    setBranchToClusterMap(await SupabaseDB.getBranchToClusterMap());
  };

  // ================= TEAM MANAGEMENT HANDLERS =================
  const handleAddTeamMember = async () => {
    if (!newTeamName || !newTeamId) {
      alert("Nome e ID são obrigatórios");
      return;
    }

    setLoadingTeam(true);
    try {
      const newMember: TeamMember = {
        id: newTeamId,
        name: newTeamName,
        role: newTeamRole,
        reportsToId: newTeamReportsTo || undefined,
        supervisorId: newTeamSupervisor || undefined,
        coordenadorId: newTeamCoordenador || undefined,
        gerenteId: newTeamGerente || undefined,
        controladorId: newTeamControlador || undefined,
        cluster: newTeamCluster || undefined,
        filial: newTeamFilial || undefined,
        segment: newTeamSegment || undefined,
        active: true
      };

      await SupabaseDB.addTeamMember(newMember);

      // Reset Form
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
      setIsAddingTeam(false);
      setFormType('TECNICO');

      await refreshData();
      alert("Membro adicionado com sucesso!");
    } catch (error) {
      console.error(error);
      alert("Erro ao adicionar membro.");
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleDeleteTeamMember = async (id: string) => {
    if (window.confirm("CONFIRMAR EXCLUSÃO? Esta ação não pode ser desfeita.")) {
      setLoadingTeam(true);
      try {
        await SupabaseDB.removeTeamMember(id);
        await refreshData();
      } catch (error) {
        console.error(error);
        alert("Erro ao remover membro.");
      } finally {
        setLoadingTeam(false);
      }
    }
  };

  // ================= IMPORT HANDLERS =================
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'TEAM' | 'USERS' | 'GESTORES') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportType(type);
    setPendingFileText(file.name); // Using file name for display, actually we need to read it?
    // Wait, the modal asks for confirmation. We should read the file HERE or inside the confirm logic?
    // The previous logic read it in `handleFileUpload` which was called by `onChange`.
    // Let's stick to the previous pattern: Read file, store text content in `pendingFileText`.

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setPendingFileText(text); // Storing CONTENT here as typical in this app's logic
      setImportModalOpen(true);
    };
    reader.readAsText(file);

    // Clear input
    e.target.value = '';
  };

  const confirmImport = async (mode: 'MERGE' | 'REPLACE') => {
    setLoadingTeam(true);
    setImportModalOpen(false); // Close immediately or wait? Better close and show loading.

    try {
      let result;
      if (importType === 'TEAM') {
        result = await SupabaseDB.importTeamFromCsv(pendingFileText, mode);
      } else if (importType === 'GESTORES') {
        result = await SupabaseDB.importGestoresFromCsv(pendingFileText, mode);
      } else {
        // Users - not yet fully migrated to Supabase in this step
        // fallback to MockDB or simple alert
        alert("Importação de Usuários via CSV não suportada totalmente no Supabase ainda.");
        setLoadingTeam(false);
        return;
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

  const handleExportUsers = () => {
    const header = "Nome;ID Login;Email;Apelido;Perfil;Senha;Clusters Acesso;Filiais Acesso\n";
    const rows = systemUsers.map(u =>
      `${u.name};${u.id};${u.email || ''};${u.nickname || ''};${u.role};${u.password || ''};${(u.allowedClusters || []).join('|')};${(u.allowedBranches || []).join('|')}`
    ).join("\n");
    downloadCSV(`usuarios_sistema_${new Date().toISOString().split('T')[0]}.csv`, header + rows);
  };

  const handleExportTeam = () => {
    const header = "ID;Nome;Supervisor;Coordenador;Gerente;Controlador;Cluster;Filial;Segmento;Status\n";
    // Filter to export only Técnicos, not Gestores
    const rows = teamMembers
      .filter(m => m.role === TeamMemberRole.TECNICO)
      .map(m => {
        // For Técnicos, get manager names from direct fields
        const supervisorName = m.supervisorId ? teamMembers.find(tm => tm.id === m.supervisorId)?.name || '' : '';
        const coordenadorName = m.coordenadorId ? teamMembers.find(tm => tm.id === m.coordenadorId)?.name || '' : '';
        const gerenteName = m.gerenteId ? teamMembers.find(tm => tm.id === m.gerenteId)?.name || '' : '';

        return `${m.id};${m.name};${supervisorName};${coordenadorName};${gerenteName};${m.controladorId || ''};${m.cluster || ''};${m.filial || ''};${m.segment || ''};${m.active ? 'Ativo' : 'Inativo'}`;
      }).join("\n");
    downloadCSV(`base_tecnicos_${new Date().toISOString().split('T')[0]}.csv`, header + rows);
  };

  const handleExportGestores = () => {
    const header = "Nome;Cargo;Superior Imediato;Cluster;Filial;Status\n";
    // Filter to export only Gestores (Supervisor, Coordenador, Gerente)
    const rows = teamMembers
      .filter(m => m.role !== TeamMemberRole.TECNICO)
      .map(m => {
        // Get superior name
        const superiorName = m.reportsToId ? teamMembers.find(tm => tm.id === m.reportsToId)?.name || '' : '';
        return `${m.name};${m.role};${superiorName};${m.cluster || ''};${m.filial || ''};${m.active ? 'Ativo' : 'Inativo'}`;
      }).join("\n");
    downloadCSV(`base_gestores_${new Date().toISOString().split('T')[0]}.csv`, header + rows);
  };

  const handleDownloadGestoresTemplate = () => {
    const header = "Nome;Cargo;Superior Imediato;Cluster;Filial\n";
    const example = "Fernando Lima;Supervisor;Roberto Santos;SALVADOR;SALVADOR";
    downloadCSV("modelo_importacao_gestores.csv", header + example);
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
    downloadCSV(`estrutura_geo_${new Date().toISOString().split('T')[0]}.csv`, header + rows);
  };

  const handleSystemBackup = async () => {
    if (!window.confirm("Gerar backup completo do sistema em JSON? Isso pode levar alguns segundos.")) return;

    setLoadingTeam(true);
    try {
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
      setLoadingTeam(false);
    }
  };

  // ================= DATA MIGRATION LOGIC =================
  const handleMigrateToSupabase = async () => {
    if (!window.confirm("ATENÇÃO: Isso copiará os dados do LocalStorage (navegador) para a base do Supabase.\n\nISSO PODE DUPLICAR DADOS SE JÁ HOUVER REGISTROS.\n\nDeseja continuar?")) return;

    setLoadingTeam(true); // Enable loading overlay

    try {
      console.log("Iniciando migração de Configurações...");
      // 1. Configs
      const reasons = MockDB.getReasonHierarchy();
      if (reasons.length > 0) await SupabaseDB.saveReasonHierarchy(reasons);

      const geo = MockDB.getGeoHierarchy();
      if (geo.length > 0) await SupabaseDB.saveGeoHierarchy(geo);

      // 2. Team - SORTED BY HIERARCHY
      console.log("Iniciando migração de Equipe...");
      const team = MockDB.getMyTeam('admin', UserRole.ADMIN);

      const roleOrder = {
        [TeamMemberRole.GERENTE]: 1,
        [TeamMemberRole.COORDENADOR]: 2,
        [TeamMemberRole.SUPERVISOR]: 3,
        [TeamMemberRole.TECNICO]: 4
      };

      team.sort((a, b) => {
        const orderA = roleOrder[a.role] || 99;
        const orderB = roleOrder[b.role] || 99;
        return orderA - orderB;
      });

      let teamCount = 0;
      for (const m of team) {
        try {
          await SupabaseDB.addTeamMember(m);
          teamCount++;
        } catch (err: any) {
          console.error(`Falha ao migrar membro ${m.name}:`, err);
          // Continue to next member even if one fails
        }
      }

      // 3. Occurrences
      console.log("Iniciando migração de Ocorrências...");
      const occs = MockDB.getOccurrences();
      let occCount = 0;
      for (const o of occs) {
        try {
          await SupabaseDB.saveOccurrence(o);
          occCount++;
        } catch (err: any) {
          console.error(`Falha ao migrar ocorrência ${o.id}:`, err);
        }
      }

      alert(`Migração Concluída!\n\n- Motivos/Geo copiados\n- ${teamCount} Membros de equipe copiados\n- ${occCount} Ocorrências copiadas`);
      await refreshData();

    } catch (e) {
      console.error("Erro na migração:", e);
      alert("Erro durante a migração. Verifique o console para detalhes.");
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleRestoreFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("ATENÇÃO: Restaurar de um backup substituirá TODOS os dados existentes no sistema (Equipe, Usuários, Ocorrências, Configurações).\n\nEsta ação é irreversível. Deseja continuar?")) {
      e.target.value = ''; // Clear the file input
      return;
    }

    setLoadingRestore(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const jsonString = event.target?.result as string;
          const backupData = JSON.parse(jsonString);

          if (!backupData || !backupData.data) {
            alert("Arquivo de backup inválido. Estrutura de dados incorreta.");
            setLoadingRestore(false);
            return;
          }

          const { team, users, occurrences, configs } = backupData.data;

          // Clear existing data (this is a full replace)
          await SupabaseDB.clearAllData(); // This function needs to be implemented in SupabaseDB

          // Restore configs first
          if (configs?.reasons) await SupabaseDB.saveReasonHierarchy(configs.reasons);
          if (configs?.geo) await SupabaseDB.saveGeoHierarchy(configs.geo);

          // Restore users
          if (users) {
            for (const user of users) {
              // For restore, we might need to handle password hashing or direct insert
              // Assuming createUser handles this or we're just updating metadata for existing
              // For a full restore, we'd need to re-create auth users too, which is complex.
              // For now, let's assume we're just restoring the public.users table data.
              await SupabaseDB.createUser({
                email: user.email,
                password: user.password || 'default_password', // Passwords are not usually backed up in plain text
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
            for (const member of team) {
              await SupabaseDB.addTeamMember(member);
            }
          }

          // Restore occurrences
          if (occurrences) {
            for (const occ of occurrences) {
              await SupabaseDB.saveOccurrence(occ);
            }
          }

          alert("Restauração concluída com sucesso!");
          await refreshData();
        } catch (parseError) {
          console.error("Erro ao processar arquivo de backup:", parseError);
          alert("Erro ao processar arquivo de backup. Verifique o formato JSON.");
        } finally {
          setLoadingRestore(false);
          e.target.value = ''; // Clear the file input
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error("Erro ao iniciar restauração:", error);
      alert("Erro ao iniciar restauração.");
      setLoadingRestore(false);
      e.target.value = ''; // Clear the file input
    }
  };

  // ================= CONFIG (REASONS & GEO) LOGIC =================
  // ================= CONFIG (REASONS & GEO) LOGIC =================
  const handleUpdateCategoryName = async (index: number) => {
    if (!tempCategoryName.trim()) return;
    const updated = [...reasonsHierarchy];
    updated[index].category = tempCategoryName.trim() as any;
    try {
      await SupabaseDB.saveReasonHierarchy(updated);
      await refreshData();
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
      await refreshData();
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
        setReasonsHierarchy(updated);
      } catch (e) {
        console.error(e);
        alert("Erro ao excluir.");
        await refreshData();
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
        await refreshData();
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
        await refreshData();
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
      await refreshData();
    } catch (e) {
      console.error(e);
      alert("Erro ao atualizar motivo.");
    }
  };

  // --- GEO HANDLERS (Async) ---
  const saveGeo = async (newGeo: GeoCluster[]) => {
    try {
      await SupabaseDB.saveGeoHierarchy(newGeo);
      setGeoHierarchy(newGeo);
      setBranchToClusterMap(await SupabaseDB.getBranchToClusterMap());
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar estrutura geográfica.");
      await refreshData();
    }
  };

  // Re-implementing Geo Handlers to use `saveGeo` wrapper
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

  // ================= TEAM & USER MANUAL FORMS =================

  const handleGestoresFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => handleFileSelect(e, 'GESTORES');

  const handleManualTeamAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTeamName || (formType === 'TECNICO' && !newTeamId)) {
      alert(formType === 'TECNICO' ? "Campos obrigatórios: Nome e ID" : "Campo obrigatório: Nome");
      return;
    }

    setLoadingTeam(true);

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
      await refreshData();
      alert("Salvo com sucesso!");

    } catch (error) {
      console.error(error);
      alert("Erro ao salvar membro.");
    } finally {
      setLoadingTeam(false);
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

  const isSupervisorValid = (supId?: string) => {
    if (!supId) return false;
    return systemUsers.some(u => u.id.toLowerCase() === supId.toLowerCase());
  };
  const filteredTeam = teamMembers.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTeamTerm.toLowerCase()) || m.id.toLowerCase().includes(searchTeamTerm.toLowerCase()) || (m.filial && m.filial.toLowerCase().includes(searchTeamTerm.toLowerCase())) || (m.supervisorId && m.supervisorId.toLowerCase().includes(searchTeamTerm.toLowerCase()));
    const hasError = !m.supervisorId || !isSupervisorValid(m.supervisorId);
    if (showTeamErrorsOnly) return matchesSearch && hasError;
    return matchesSearch;
  });
  const getSupervisorName = (supId?: string) => {
    if (!supId) return '-';
    const user = systemUsers.find(u => u.id.toLowerCase() === supId.toLowerCase());
    return user ? user.name : '-';
  };
  const countTeamErrors = teamMembers.filter(m => !m.supervisorId || !isSupervisorValid(m.supervisorId)).length;

  // User Form Handlers
  const handleDownloadUserTemplate = () => {
    const csvHeader = "Nome;ID Login;Senha;Email;Apelido;Perfil (ADMIN ou CONTROLADOR);Clusters (Separados por |);Filiais (Separadas por |)\n";
    const csvRows = "Carlos Silva;op_carlos;123;carlos@empresa.com;Carlão;CONTROLADOR;SALVADOR|RECIFE;BKT_SALVADOR_CENTRO\nAdmin Geral;admin;123456;admin@empresa.com;Adm;ADMIN;SALVADOR|FORTALEZA|RECIFE;";
    const csvContent = `\uFEFF${csvHeader}${csvRows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", "modelo_importacao_usuarios.csv"); document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  };
  const handleDownloadTemplate = () => {
    const header = "ID;Nome;Supervisor;Coordenador;Gerente;Controlador;Cluster;Filial;Segmento\n";
    const example = "T001;João Silva;Fernando Lima;Roberto Santos;Carlos Silva;C001;SALVADOR;SALVADOR;BA";
    downloadCSV("modelo_importacao_tecnicos.csv", header + example);
  };

  const handleAddOrUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserProps.name && newUserProps.id && newUserProps.email && newUserProps.password) {
      setLoadingUsers(true);

      if (editingUserOriginalId) {
        // Update handling
        const userData: Partial<User> = {
          id: editingUserOriginalId,
          name: newUserProps.name,
          nickname: newUserProps.nickname,
          role: newUserProps.role,
          allowedClusters: newUserProps.allowedClusters,
          allowedBranches: newUserProps.allowedBranches
        };
        try {
          await SupabaseDB.updateUser(userData);
          alert("Usuário atualizado com sucesso!");
          setNewUserProps({ name: '', id: '', email: '', nickname: '', password: '', role: UserRole.CONTROLADOR, allowedClusters: [], allowedBranches: [] });
          setIsAddingUser(false);
          setEditingUserOriginalId(null);
          await refreshData();
        } catch (e: any) {
          console.error("Erro ao atualizar usuário:", e);
          alert(`Erro ao atualizar usuário: ${e.message || 'Erro desconhecido'}\n${e.details || ''}\n${e.hint || ''}`);
        } finally {
          setLoadingUsers(false);
        }
      } else {
        // Create new user
        try {
          const result = await SupabaseDB.createUser({
            email: newUserProps.email,
            password: newUserProps.password,
            name: newUserProps.name,
            nickname: newUserProps.nickname,
            role: newUserProps.role,
            allowedClusters: newUserProps.allowedClusters,
            allowedBranches: newUserProps.allowedBranches
          });

          if (result.success) {
            alert(`Usuário criado com sucesso!\n\nEmail: ${newUserProps.email}\nSenha: ${newUserProps.password}\n\nComunique essas credenciais ao colaborador de forma segura.`);
            setNewUserProps({ name: '', id: '', email: '', nickname: '', password: '', role: UserRole.CONTROLADOR, allowedClusters: [], allowedBranches: [] });
            setIsAddingUser(false);
            await refreshData();
          } else {
            alert(`Erro ao criar usuário: ${result.error}`);
          }
        } catch (e: any) {
          console.error(e);
          alert(`Erro ao criar usuário: ${e.message || 'Erro desconhecido'}`);
        } finally {
          setLoadingUsers(false);
        }
      }
    } else {
      alert("Preencha todos os dados obrigatórios (Nome, Email, Senha).");
    }
  };
  const handleEditUser = (user: User) => {
    setNewUserProps({ name: user.name, id: user.id, email: user.email || '', nickname: user.nickname || '', password: user.password || '', role: user.role, allowedClusters: user.allowedClusters || [], allowedBranches: user.allowedBranches || [] });
    setEditingUserOriginalId(user.id); setIsAddingUser(true);
  };
  const handleDeleteUser = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (window.confirm("ATENÇÃO: Excluir um usuário é irreversível!\n\nTem certeza que deseja excluir este usuário?")) {
      setLoadingUsers(true);
      try {
        await SupabaseDB.deleteUser(id);
        alert("Usuário excluído com sucesso!");
        await refreshData();
      } catch (e: any) {
        console.error(e);
        alert(`Erro ao excluir usuário: ${e.message || 'Erro desconhecido'}`);
      } finally {
        setLoadingUsers(false);
      }
    }
  };

  const handleCancelEditUser = () => {
    setIsAddingUser(false);
    setEditingUserOriginalId(null);
    setNewUserProps({ name: '', id: '', email: '', nickname: '', password: '', role: UserRole.CONTROLADOR, allowedClusters: [], allowedBranches: [] });
  };

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
  const availableBranchesForSelection = uniqueClusters.filter(c => newUserProps.allowedClusters.includes(c)).flatMap(cluster => Object.keys(branchToClusterMap).filter(branch => branchToClusterMap[branch] === cluster)).sort();
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

      {activeTab === 'CONFIG' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex border-b border-slate-200 mb-4">
            <button onClick={() => setConfigMode('REASONS')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${configMode === 'REASONS' ? 'border-[#940910] text-[#940910]' : 'border-transparent text-slate-500 hover:text-[#404040]'}`}>Motivos de Ocorrência</button>
            <button onClick={() => setConfigMode('GEO')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${configMode === 'GEO' ? 'border-[#940910] text-[#940910]' : 'border-transparent text-slate-500 hover:text-[#404040]'}`}>Estrutura Operacional</button>
            <button onClick={() => setConfigMode('DB')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${configMode === 'DB' ? 'border-[#940910] text-[#940910]' : 'border-transparent text-slate-500 hover:text-[#404040]'}`}>Banco de Dados</button>
          </div>

          {configMode === 'DB' && (
            <div className="space-y-6">
              <div className="bg-[#940910]/5 border border-[#940910]/20 rounded-lg p-4 text-sm text-[#940910]">
                <h4 className="font-bold flex items-center gap-2 mb-1"><Database size={16} /> Manutenção do Banco de Dados</h4>
                <p>O sistema agora utiliza <strong>Supabase (Nuvem)</strong>. Os backups são automáticos e gerenciados pela plataforma.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border border-slate-200 p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                  <div className="bg-slate-100 p-4 rounded-full mb-4"><RefreshCw size={32} className="text-[#940910]" /></div>
                  <h3 className="font-bold text-lg text-[#404040] mb-2">Migrar Dados Locais</h3>
                  <p className="text-sm text-slate-500 mb-6">Copia os dados que estavam salvos no seu navegador (versão antiga) para a nova base na nuvem.</p>
                  <Button onClick={handleMigrateToSupabase} className="bg-[#940910] hover:bg-[#7a060c] text-white w-full">Iniciar Migração</Button>
                </Card>
                <Card className="border border-slate-200 p-6 flex flex-col items-center text-center opacity-50">
                  <div className="bg-slate-100 p-4 rounded-full mb-4"><Download size={32} className="text-slate-400" /></div>
                  <h3 className="font-bold text-lg text-[#404040] mb-2">Backup / Restore</h3>
                  <p className="text-sm text-slate-500 mb-6">Funcionalidade desativada. Use o painel do Supabase para gerenciar backups.</p>
                </Card>
              </div>
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
      )}

      {/* USERS TAB */}
      {activeTab === 'USERS' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-end gap-2">
            <Button onClick={handleExportUsers} variant="outline" className="text-[#940910] border-[#940910]/20"><FileDown size={18} /> Exportar Lista</Button>
            <Button variant="ghost" onClick={handleDownloadUserTemplate} className="text-slate-600 border-slate-200 border"><FileDown size={18} /> Modelo CSV (Vazio)</Button>
            <Button variant="outline" onClick={() => userFileInputRef.current?.click()} className="text-[#940910] border-[#940910]/20"><Upload size={18} /> Importar CSV</Button>
            <input type="file" ref={userFileInputRef} className="hidden" accept=".csv,.txt" onChange={(e) => handleFileSelect(e, 'USERS')} />
            <Button onClick={() => { setIsAddingUser(!isAddingUser); setEditingUserOriginalId(null); setNewUserProps({ name: '', id: '', email: '', nickname: '', password: '', role: UserRole.CONTROLADOR, allowedClusters: [], allowedBranches: [] }); }} className="bg-[#940910] hover:bg-[#7a060c]">{isAddingUser ? 'Cancelar' : 'Novo Operador/Admin'} <UserPlus size={18} /></Button>
          </div>
          {/* ... Existing User Form ... */}
          {isAddingUser && (
            <Card title={editingUserOriginalId ? "Editar Dados de Acesso" : "Cadastrar Novo Acesso"} className="border-[#940910]/20 border">
              <form onSubmit={handleAddOrUpdateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium mb-1 text-[#404040]">Nome do Colaborador</label>
                    <input className="w-full border rounded p-2 text-sm bg-white" value={newUserProps.name} onChange={e => setNewUserProps({ ...newUserProps, name: e.target.value })} placeholder="Ex: Carlos Operador" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[#404040]">ID de Login</label>
                    <input className="w-full border rounded p-2 text-sm bg-white disabled:bg-slate-100 disabled:text-slate-500" value={newUserProps.id} onChange={e => setNewUserProps({ ...newUserProps, id: e.target.value })} placeholder="Ex: op_carlos" required disabled={!!editingUserOriginalId} />
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
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[#404040]">Apelido (Nome Curto)</label>
                    <input className="w-full border rounded p-2 text-sm bg-white" value={newUserProps.nickname} onChange={e => setNewUserProps({ ...newUserProps, nickname: e.target.value })} placeholder="Ex: Carlão" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-[#404040]">Perfil</label>
                  <select className="w-full border rounded p-2 text-sm bg-white" value={newUserProps.role} onChange={e => setNewUserProps({ ...newUserProps, role: e.target.value as UserRole })}>
                    <option value={UserRole.CONTROLADOR}>Controlador (Operador)</option>
                    <option value={UserRole.ADMIN}>Administrador</option>
                  </select>
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
                  <Button type="button" variant="ghost" onClick={handleCancelEditUser}>Cancelar</Button>
                  <Button type="submit" className="bg-[#940910] hover:bg-[#7a060c]">{editingUserOriginalId ? 'Atualizar Dados' : 'Salvar Acesso'}</Button>
                </div>
              </form>
            </Card>
          )}
          {/* User Table */}
          <Card title="Usuários Cadastrados no Sistema">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#940910] text-white border-b">
                  <tr>
                    <th className="px-4 py-3 border-r border-white/20">Usuário</th>
                    <th className="px-4 py-3 border-r border-white/20">Email</th>
                    <th className="px-4 py-3 border-r border-white/20">ID de Login</th>
                    <th className="px-4 py-3 border-r border-white/20">Perfil</th>
                    <th className="px-4 py-3 border-r border-white/20">Clusters Acesso</th>
                    <th className="px-4 py-3 border-r border-white/20">Filiais Específicas</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {systemUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 flex items-center gap-3">
                        <img src={u.avatar} alt="avatar" className="w-8 h-8 rounded-full bg-slate-200" />
                        <div className="flex flex-col"><span className="font-medium text-[#404040]">{u.name}</span>{u.nickname && <span className="text-[10px] text-slate-500 italic">({u.nickname})</span>}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{u.email || '-'}</td>
                      <td className="px-4 py-3 font-mono text-slate-500">{u.id}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-bold ${u.role === UserRole.ADMIN ? 'bg-[#940910]/10 text-[#940910]' : 'bg-[#F6B700]/10 text-[#b38600]'}`}>{u.role}</span></td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-xs line-clamp-2" title={u.allowedClusters?.join(', ')}>{u.allowedClusters?.length ? u.allowedClusters.join(', ') : 'Nenhum'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-xs line-clamp-2" title={u.allowedBranches?.join(', ')}>{u.allowedBranches && u.allowedBranches.length > 0 ? u.allowedBranches.join(', ') : <span className="italic text-slate-400">Todas do Cluster</span>}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleEditUser(u); }} className="text-slate-500 hover:text-[#940910] hover:bg-red-50 p-2 rounded relative z-20" title="Editar Acesso"><Pencil size={16} className="pointer-events-none" /></button>
                          <button type="button" onClick={(e) => handleDeleteUser(e, u.id)} className="text-red-500 hover:bg-red-50 p-2 rounded relative z-20" disabled={u.id === 'admin'} title="Remover Acesso"><Trash2 size={16} className="pointer-events-none" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'GESTORES' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex flex-wrap justify-between gap-2">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportGestores} className="text-[#940910] border-[#940910]/20"><Download size={18} /> Exportar Base Completa</Button>
              <Button variant="ghost" onClick={handleDownloadGestoresTemplate} className="text-slate-600 border-slate-200 border"><FileDown size={18} /> Modelo CSV (Vazio)</Button>
              <Button variant="outline" onClick={() => document.getElementById('gestores-csv-upload')?.click()} className="text-slate-600 border-slate-200"><Upload size={18} /> Importar Base CSV</Button>
              <input type="file" id="gestores-csv-upload" accept=".csv" className="hidden" onChange={handleGestoresFileUpload} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setFormType('GESTOR'); setIsAddingTeam(!isAddingTeam); setEditingOriginalId(null); setNewTeamName(''); setNewTeamId(''); setNewTeamRole(TeamMemberRole.SUPERVISOR); setNewTeamReportsTo(''); setNewTeamSupervisor(''); setNewTeamCoordenador(''); setNewTeamGerente(''); setNewTeamControlador(''); setNewTeamCluster(''); setNewTeamFilial(''); setNewTeamSegment(''); }}>
                <UserPlus size={18} /> {isAddingTeam && formType === 'GESTOR' && newTeamRole === TeamMemberRole.SUPERVISOR ? 'Ocultar' : 'Novo Supervisor'}
              </Button>
              <Button variant="outline" onClick={() => { setFormType('GESTOR'); setIsAddingTeam(!isAddingTeam); setEditingOriginalId(null); setNewTeamName(''); setNewTeamId(''); setNewTeamRole(TeamMemberRole.COORDENADOR); setNewTeamReportsTo(''); setNewTeamSupervisor(''); setNewTeamCoordenador(''); setNewTeamGerente(''); setNewTeamControlador(''); setNewTeamCluster(''); setNewTeamFilial(''); setNewTeamSegment(''); }}>
                <UserPlus size={18} /> {isAddingTeam && formType === 'GESTOR' && newTeamRole === TeamMemberRole.COORDENADOR ? 'Ocultar' : 'Novo Coordenador'}
              </Button>
              <Button variant="outline" onClick={() => { setFormType('GESTOR'); setIsAddingTeam(!isAddingTeam); setEditingOriginalId(null); setNewTeamName(''); setNewTeamId(''); setNewTeamRole(TeamMemberRole.GERENTE); setNewTeamReportsTo(''); setNewTeamSupervisor(''); setNewTeamCoordenador(''); setNewTeamGerente(''); setNewTeamControlador(''); setNewTeamCluster(''); setNewTeamFilial(''); setNewTeamSegment(''); }}>
                <UserPlus size={18} /> {isAddingTeam && formType === 'GESTOR' && newTeamRole === TeamMemberRole.GERENTE ? 'Ocultar' : 'Novo Gerente'}
              </Button>
            </div>
          </div>

          {isAddingTeam && formType === 'GESTOR' && (
            <Card title={editingOriginalId ? `Editar ${newTeamRole}` : `Cadastrar ${newTeamRole}`} className="border-[#940910]/20 border">
              <form onSubmit={handleManualTeamAdd} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[#404040]">Nome Completo *</label>
                    <input className="w-full border rounded p-2 text-sm bg-white" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} required placeholder="Ex: Fernando Lima" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {newTeamRole !== TeamMemberRole.GERENTE && (
                    <div>
                      <label className="block text-xs font-medium mb-1 text-[#404040]">Superior Imediato *</label>
                      <select
                        className="w-full border rounded p-2 text-sm bg-white"
                        value={newTeamReportsTo}
                        onChange={e => setNewTeamReportsTo(e.target.value)}
                        required
                      >
                        <option value="">Selecione...</option>
                        {teamMembers
                          .filter(m => {
                            if (newTeamRole === TeamMemberRole.SUPERVISOR) return m.role === TeamMemberRole.COORDENADOR;
                            if (newTeamRole === TeamMemberRole.COORDENADOR) return m.role === TeamMemberRole.GERENTE;
                            return false;
                          })
                          .map(m => (
                            <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                          ))
                        }
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[#404040]">Cluster</label>
                    <select className="w-full border rounded p-2 text-sm bg-white" value={newTeamCluster} onChange={e => setNewTeamCluster(e.target.value)}>
                      <option value="">Selecione...</option>
                      {uniqueClusters.map(cluster => (
                        <option key={cluster} value={cluster}>{cluster}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[#404040]">Filial</label>
                    <input className="w-full border rounded p-2 text-sm bg-white" value={newTeamFilial} onChange={e => setNewTeamFilial(e.target.value)} placeholder="Ex: SALVADOR" />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => setIsAddingTeam(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-[#940910] hover:bg-[#7a060c]">{editingOriginalId ? 'Atualizar' : 'Salvar'}</Button>
                </div>
              </form>
            </Card>
          )}

          <Card title={`Gestores Cadastrados (${teamMembers.filter(m => m.role !== TeamMemberRole.TECNICO).length})`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-[#940910] text-white font-medium border-b">
                  <tr>
                    <th className="px-4 py-3 border-l border-white/20">ID</th>
                    <th className="px-4 py-3 border-l border-white/20">Nome</th>
                    <th className="px-4 py-3 border-l border-white/20">Cargo</th>
                    <th className="px-4 py-3 border-l border-white/20">Superior Imediato</th>
                    <th className="px-4 py-3 border-l border-white/20">Controlador</th>
                    <th className="px-4 py-3 border-l border-white/20">Cluster</th>
                    <th className="px-4 py-3 border-l border-white/20">Filial</th>
                    <th className="px-4 py-3 text-center border-l border-white/20">Status</th>
                    <th className="px-4 py-3 text-right border-l border-white/20">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {teamMembers.filter(m => m.role !== TeamMemberRole.TECNICO).map(member => {
                    const superior = teamMembers.find(m => m.id === member.reportsToId);
                    const controladorName = systemUsers.find(u => u.id === member.controladorId)?.name || '-';
                    return (
                      <tr key={member.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 font-bold">{member.id}</td>
                        <td className="px-4 py-3 font-medium text-[#404040]">{member.name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${member.role === TeamMemberRole.GERENTE ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                            member.role === TeamMemberRole.COORDENADOR ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                              'bg-green-100 text-green-800 border border-green-200'
                            }`}>
                            {member.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{superior?.name || '-'}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{controladorName}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 font-bold uppercase">{member.cluster || '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{member.filial || '-'}</td>
                        <td className="px-4 py-3 text-center"><Badge status={member.active ? 'CONCLUIDA' : 'CANCELADA'} /></td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleEditTeamMember(member)} className="text-blue-600 hover:text-blue-800"><Pencil size={16} /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteTeamMember(member.id); }} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TEAM TAB */}
      {activeTab === 'TEAM' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={handleDownloadTemplate} className="text-slate-600 border-slate-200 border"><FileDown size={18} /> Modelo CSV (Vazio)</Button>
            <Button variant="outline" onClick={() => { setFormType('TECNICO'); setIsAddingTeam(!isAddingTeam); setEditingOriginalId(null); setNewTeamName(''); setNewTeamId(''); setNewTeamRole(TeamMemberRole.TECNICO); setNewTeamReportsTo(''); setNewTeamSupervisor(''); setNewTeamCoordenador(''); setNewTeamGerente(''); setNewTeamControlador(''); setNewTeamCluster(''); setNewTeamFilial(''); setNewTeamSegment(''); }}>
              <UserPlus size={18} /> {isAddingTeam && formType === 'TECNICO' ? 'Ocultar Formulário' : 'Novo Técnico'}
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} className="bg-[#940910] hover:bg-[#7a060c]">
              <Upload size={18} /> Importar Base CSV
            </Button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.txt" onChange={(e) => handleFileSelect(e, 'TEAM')} />
          </div>
          {/* ... Team Form and Table ... */}
          {isAddingTeam && formType === 'TECNICO' && (
            <Card title={editingOriginalId ? "Editar Técnico" : "Cadastrar Técnico"} className="border-[#940910]/20 border">
              <form onSubmit={handleManualTeamAdd} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[#404040]">ID *</label>
                    <input className="w-full border rounded p-2 text-sm bg-white" value={newTeamId} onChange={e => setNewTeamId(e.target.value)} required placeholder="Ex: T001" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium mb-1 text-[#404040]">Nome Completo *</label>
                    <input className="w-full border rounded p-2 text-sm bg-white" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} required placeholder="Ex: João Silva" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[#404040]">Supervisor *</label>
                    <select className="w-full border rounded p-2 text-sm bg-white" value={newTeamSupervisor} onChange={e => setNewTeamSupervisor(e.target.value)} required>
                      <option value="">Selecione...</option>
                      {teamMembers.filter(m => m.role === TeamMemberRole.SUPERVISOR).map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[#404040]">Coordenador *</label>
                    <select className="w-full border rounded p-2 text-sm bg-white" value={newTeamCoordenador} onChange={e => setNewTeamCoordenador(e.target.value)} required>
                      <option value="">Selecione...</option>
                      {teamMembers.filter(m => m.role === TeamMemberRole.COORDENADOR).map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[#404040]">Gerente *</label>
                    <select className="w-full border rounded p-2 text-sm bg-white" value={newTeamGerente} onChange={e => setNewTeamGerente(e.target.value)} required>
                      <option value="">Selecione...</option>
                      {teamMembers.filter(m => m.role === TeamMemberRole.GERENTE).map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[#404040]">Controlador</label>
                    <select className="w-full border rounded p-2 text-sm bg-white" value={newTeamControlador} onChange={e => setNewTeamControlador(e.target.value)}>
                      <option value="">Selecione...</option>
                      {systemUsers.filter(u => u.role === UserRole.CONTROLADOR || u.role === UserRole.ADMIN).map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.id})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[#404040]">Cluster</label>
                    <select className="w-full border rounded p-2 text-sm bg-white" value={newTeamCluster} onChange={e => setNewTeamCluster(e.target.value)}>
                      <option value="">Selecione...</option>
                      {uniqueClusters.map(cluster => (
                        <option key={cluster} value={cluster}>{cluster}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[#404040]">Filial</label>
                    <input className="w-full border rounded p-2 text-sm bg-white" value={newTeamFilial} onChange={e => setNewTeamFilial(e.target.value)} placeholder="Ex: SALVADOR" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[#404040]">Segmento *</label>
                    <select className="w-full border rounded p-2 text-sm bg-white" value={newTeamSegment} onChange={e => setNewTeamSegment(e.target.value as 'BA' | 'TT')} required>
                      <option value="">Selecione...</option>
                      <option value="BA">BA (Instalação)</option>
                      <option value="TT">TT (Reparo)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => setIsAddingTeam(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-[#940910] hover:bg-[#7a060c]">{editingOriginalId ? 'Atualizar' : 'Salvar'}</Button>
                </div>
              </form>
            </Card>
          )}
          <Card title={`Base de Técnicos (${teamMembers.filter(m => m.role === TeamMemberRole.TECNICO).length})`}>
            <div className="mb-4 flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input type="text" className="w-full pl-10 pr-4 py-2 border rounded-md text-sm bg-white focus:ring-2 focus:ring-[#940910] outline-none" placeholder="Buscar..." value={searchTeamTerm} onChange={e => setSearchTeamTerm(e.target.value)} />
              </div>
              {countTeamErrors === 0 ? (
                <div className="flex items-center gap-2 text-sm font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100"><CheckCircle size={16} /> Cadastros realizados com Sucesso</div>
              ) : (
                <label className="flex items-center gap-2 text-sm font-bold text-[#940910] cursor-pointer select-none bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-100 transition-colors">
                  <input type="checkbox" checked={showTeamErrorsOnly} onChange={e => setShowTeamErrorsOnly(e.target.checked)} className="rounded text-[#940910] focus:ring-[#940910]" />
                  <FilterX size={16} /> Ver erros de Cadastro ({countTeamErrors})
                </label>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-[#940910] text-white font-medium border-b">
                  <tr>
                    <th className="px-4 py-3 border-l border-white/20">ID</th>
                    <th className="px-4 py-3 border-l border-white/20">Nome</th>
                    <th className="px-4 py-3 border-l border-white/20">Cargo</th>
                    <th className="px-4 py-3 border-l border-white/20">Supervisor</th>
                    <th className="px-4 py-3 border-l border-white/20">Coordenador</th>
                    <th className="px-4 py-3 border-l border-white/20">Gerente</th>
                    <th className="px-4 py-3 border-l border-white/20">Controlador</th>
                    <th className="px-4 py-3 border-l border-white/20">Cluster</th>
                    <th className="px-4 py-3 border-l border-white/20">Filial</th>
                    <th className="px-4 py-3 border-l border-white/20 text-center">Segmento</th>
                    <th className="px-4 py-3 text-center border-l border-white/20">Status</th>
                    <th className="px-4 py-3 text-center border-l border-white/20">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredTeam.filter(m => m.role === TeamMemberRole.TECNICO).map(member => {
                    const supervisor = teamMembers.find(m => m.id === member.supervisorId);
                    const coordenador = teamMembers.find(m => m.id === member.coordenadorId);
                    const gerente = teamMembers.find(m => m.id === member.gerenteId);
                    const controladorName = systemUsers.find(u => u.id === member.controladorId)?.name || '-';

                    return (
                      <tr key={member.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 font-bold">{member.id}</td>
                        <td className="px-4 py-3 font-medium text-[#404040]">{member.name}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold px-2 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200">
                            {member.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{supervisor?.name || '-'}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{coordenador?.name || '-'}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{gerente?.name || '-'}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{controladorName}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 font-bold uppercase">{member.cluster || '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{member.filial || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          {member.segment === 'BA' && <span className="bg-sky-100 text-sky-800 border border-sky-200 text-[10px] font-bold px-2 py-0.5 rounded">BA</span>}
                          {member.segment === 'TT' && <span className="bg-orange-100 text-orange-800 border border-orange-200 text-[10px] font-bold px-2 py-0.5 rounded">TT</span>}
                          {!member.segment && <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-4 py-3 text-center"><Badge status={member.active ? 'CONCLUIDA' : 'CANCELADA'} /></td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={(e) => { e.stopPropagation(); handleEditTeamMember(member); }} className="text-slate-500 hover:text-[#940910] hover:bg-red-50 p-2 rounded transition-colors relative z-20" title="Editar"><Pencil size={16} className="pointer-events-none" /></button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteTeamMember(member.id); }} className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors relative z-20" title="Remover"><Trash2 size={16} className="pointer-events-none" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div >
      )}
      {activeTab === 'DATABASE' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Card title="Backup e Restauração de Dados" className="border-l-4 border-l-[#940910]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* EXPORT */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#940910] font-bold text-lg">
                  <Download size={24} /> Exportar Backup Completo
                </div>
                <p className="text-sm text-slate-600">
                  Gera um arquivo JSON contendo todos os dados do sistema: Usuários, Equipe Técnica, Ocorrências e Configurações (Cluster e Motivos).
                  Utilize este arquivo para criar pontos de restauração.
                </p>
                <Button onClick={handleSystemBackup} className="w-full bg-[#940910] hover:bg-[#7a060c] text-white py-6">
                  <Download size={20} className="mr-2" /> Baixar Backup (.json)
                </Button>
              </div>

              {/* IMPORT */}
              <div className="space-y-4 border-t md:border-t-0 md:border-l pt-6 md:pt-0 md:pl-8 border-slate-200">
                <div className="flex items-center gap-2 text-amber-600 font-bold text-lg">
                  <Upload size={24} /> Restaurar Backup
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
                  <p className="font-bold mb-1">⚠️ ATENÇÃO: AÇÃO DESTRUTIVA</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Esta ação irá <strong>APAGAR TODOS</strong> os dados atuais (Ocorrências, Equipes, Configurações).</li>
                    <li>Os dados serão substituídos pelo conteúdo do arquivo de backup.</li>
                    <li><strong>Logins e Senhas (Auth)</strong> não são restaurados automaticamente. Se os usuários foram excluídos do sistema de autenticação, eles precisarão ser recriados manualmente ou solicitar redefinição de senha.</li>
                  </ul>
                </div>

                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept=".json"
                    id="restore-file"
                    className="block w-full text-sm text-slate-500
                             file:mr-4 file:py-2 file:px-4
                             file:rounded-full file:border-0
                             file:text-sm file:font-semibold
                             file:bg-[#940910]/10 file:text-[#940910]
                             hover:file:bg-[#940910]/20
                          "
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      if (!window.confirm("CRÍTICO: Você está prestes a apagar todo o banco de dados e restaurar este backup. Os logins dos usuários NÃO serão restaurados.\n\nDeseja continuar?")) {
                        e.target.value = '';
                        return;
                      }

                      setLoadingRestore(true);
                      try {
                        const text = await file.text();
                        const json = JSON.parse(text);
                        const result = await SupabaseDB.restoreSystemData(json);

                        if (result.success) {
                          alert("Sistema restaurado com sucesso! A página será recarregada.");
                          window.location.reload();
                        } else {
                          alert("Erros na restauração:\n" + result.errors.join("\n"));
                        }
                      } catch (err: any) {
                        console.error(err);
                        alert("Erro ao processar arquivo: " + err.message);
                      } finally {
                        setLoadingRestore(false);
                        e.target.value = '';
                      }
                    }}
                  />
                  {loadingRestore && <p className="text-center text-sm text-slate-500 animate-pulse">Restaurando dados... aguarde...</p>}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
