
import { Occurrence, OccurrenceStatus, OccurrenceCategory, User, UserRole, TeamMember, TeamMemberRole, EscalationLevel, ReasonTree, GeoCluster, GeoBranch } from "../types";

const USERS_KEY = 'db_users';
const OCCURRENCES_KEY = 'db_occurrences';
const MY_TEAM_KEY = 'db_my_team';
const SETTINGS_KEY = 'db_settings_reasons';
const GEO_SETTINGS_KEY = 'db_settings_geo';

// --- CONSTANTS MOVED FROM types.ts ---

export const REASON_HIERARCHY: ReasonTree[] = [
  { category: OccurrenceCategory.CAT_01, reasons: ['1.1 Atraso Injustificado', '1.2 Ainda em Deslocamento', '1.3 Problemas Pessoais'] },
  { category: OccurrenceCategory.CAT_02, reasons: ['2.1 Trânsito', '2.2 Problema no Veículo', '2.3 Pneu Furado'] },
  { category: OccurrenceCategory.CAT_03, reasons: ['3.1 Desvio de Rota', '3.2 Abandono de Área'] },
  { category: OccurrenceCategory.CAT_04, reasons: ['4.1 Área de Risco', '4.2 Área Restrita'] },
  { category: OccurrenceCategory.CAT_05, reasons: ['5.1 Cliente Ausente', '5.2 Endereço Não Localizado'] },
  { category: OccurrenceCategory.CAT_06, reasons: ['6.1 Aguardando Material', '6.2 Ferramenta Quebrada'] },
  { category: OccurrenceCategory.CAT_07, reasons: ['7.1 Dificuldade Técnica', '7.2 Suporte N2 Acionado'] },
  { category: OccurrenceCategory.CAT_08, reasons: ['8.1 Sem Sinal GPS', '8.2 Celular Descarregado'] },
  { category: OccurrenceCategory.CAT_09, reasons: ['9.1 Baixa Demanda', '9.2 Lentidão Sistêmica'] },
  { category: OccurrenceCategory.CAT_10, reasons: ['10.1 Infraestrutura Complexa', '10.2 Rede Externa Danificada'] },
  { category: OccurrenceCategory.CAT_11, reasons: ['11.1 Almoço Estendido', '11.2 Pausa Não Programada'] },
  { category: OccurrenceCategory.CAT_12, reasons: ['12.1 Problema de Acesso', '12.2 Login Bloqueado'] },
  { category: OccurrenceCategory.CAT_13, reasons: ['13.1 Instabilidade Geral', '13.2 App Fora do Ar'] },
  { category: OccurrenceCategory.CAT_14, reasons: ['14.1 Chuva Forte', '14.2 Alagamento'] },
  { category: OccurrenceCategory.CAT_15, reasons: ['15.1 Erro de Cadastro', '15.2 Venda Cancelada'] }
];

// --- FULL GEO STRUCTURE RESTORED ---
export const INITIAL_BRANCH_TO_CLUSTER: Record<string, string> = {
  'SALVADOR': 'SALVADOR',
  'ARACAJU': 'ARACAJU', 'LAGARTO': 'ARACAJU',
  'MACEIO': 'MACEIO', 'ARAPIRACA': 'MACEIO',
  'VITORIA DA CONQUISTA': 'VITORIA DA CONQUISTA', 'ARRAIAL D AJUDA': 'VITORIA DA CONQUISTA',
  'BARREIRAS': 'VITORIA DA CONQUISTA', 'EUNAPOLIS': 'VITORIA DA CONQUISTA',
  'GUANAMBI': 'VITORIA DA CONQUISTA', 'ILHEUS': 'VITORIA DA CONQUISTA',
  'ITABUNA': 'VITORIA DA CONQUISTA', 'JEQUIE': 'VITORIA DA CONQUISTA',
  'LUIS EDUARDO MAGALHAES': 'VITORIA DA CONQUISTA', 'PORTO SEGURO': 'VITORIA DA CONQUISTA',
  'TEIXEIRA DE FREITAS': 'VITORIA DA CONQUISTA', 'TRANCOSO': 'VITORIA DA CONQUISTA',
  'FEIRA DE SANTANA': 'FEIRA DE SANTANA', 'SANTO ANTONIO DE JESUS': 'FEIRA DE SANTANA', 'PETROLINA': 'FEIRA DE SANTANA',
  'FORTALEZA': 'FORTALEZA', 'CRATO': 'FORTALEZA', 'CAUCAIA': 'FORTALEZA',
  'MARACANAU': 'FORTALEZA', 'JUAZEIRO DO NORTE': 'FORTALEZA', 'SOBRAL': 'FORTALEZA',
  'TERESINA': 'TERESINA', 'PARNAIBA': 'TERESINA', 'PICOS': 'TERESINA',
  'RECIFE': 'RECIFE', 'OLINDA': 'RECIFE'
};

export const INITIAL_BRANCH_DATA: Record<string, string[]> = {
  'SALVADOR': ['BKT_SALVADOR_AREA_01', 'BKT_SALVADOR_AREA_02', 'BKT_SALVADOR_AREA_03', 'BKT_SALVADOR_AREA_04', 'BKT_SALVADOR_AREA_05', 'BKT_SALVADOR_AREA_06', 'BKT_SALVADOR_AREA_07', 'BKT_LAURO_DE_FREITAS'],
  'FORTALEZA': ['BKT_FORTALEZA_R2_LESTE', 'BKT_FORTALEZA_R2_NORTE', 'BKT_FORTALEZA_R2_OESTE', 'BKT_FORTALEZA_R2_SUL', 'BKT_FORTALEZA_VIVO_LESTE'],
  'RECIFE': ['BKT_RECIFE_R2_01', 'BKT_RECIFE_R2_02'],
  'ARACAJU': ['BKT_ARACAJU'], 'LAGARTO': ['BKT_LAGARTO'],
  'MACEIO': ['BKT_MACEIO'], 'ARAPIRACA': ['BKT_ARAPIRACA'],
  'VITORIA DA CONQUISTA': ['BKT_VITORIA_DA_CONQUISTA'],
  'LUIS EDUARDO MAGALHAES': ['BKT_LUIS_EDUARDO_MAGALHAES'],
  'BARREIRAS': ['BKT_BARREIRAS'], 'GUANAMBI': ['BKT_GUANAMBI'],
  'ITABUNA': ['BKT_ITABUNA'], 'JEQUIE': ['BKT_JEQUIE'],
  'ILHEUS': ['BKT_ILHEUS'], 'PORTO SEGURO': ['BKT_PORTO_SEGURO'],
  'TRANCOSO': ['BKT_TRANCOSO'], 'ARRAIAL D AJUDA': ['BKT_ARRAIAL_DAJUDA'],
  'TEIXEIRA DE FREITAS': ['BKT_TEIXEIRA_DE_FREITAS'], 'EUNAPOLIS': ['BKT_EUNAPOLIS'],
  'SANTO ANTONIO DE JESUS': ['BKT_SANTO_ANTONIO_DE_JESUS'],
  'JUAZEIRO DO NORTE': ['BKT_JUAZEIRO_DO_NORTE'], 'CRATO': ['BKT_CRATO'], 'SOBRAL': ['BKT_SOBRAL'],
  'OLINDA': ['BKT_OLINDA'], 'PETROLINA': ['BKT_PETROLINA'],
  'TERESINA': ['BKT_TERESINA'], 'PARNAIBA': ['BKT_PARNAIBA'], 'PICOS': ['BKT_PICOS'],
  'CAUCAIA': ['BKT_CAUCAIA'], 'MARACANAU': ['BKT_MARACANAU']
};

// --- END CONSTANTS ---

// Initial Seed Data for Users
const SEED_USERS: User[] = [
  {
    id: 'admin',
    name: 'Administrador Geral',
    nickname: 'Admin',
    email: 'admin@diarioops.com',
    role: UserRole.ADMIN,
    password: '123',
    avatar: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff',
    allowedClusters: ['SALVADOR', 'FORTALEZA', 'RECIFE', 'ARACAJU', 'MACEIO', 'VITORIA DA CONQUISTA', 'FEIRA DE SANTANA', 'TERESINA'],
    allowedBranches: []
  },
  {
    id: 'C001',
    name: 'Controlador Alpha',
    nickname: 'Alpha',
    email: 'alpha@diarioops.com',
    role: UserRole.CONTROLADOR,
    password: '123',
    avatar: 'https://ui-avatars.com/api/?name=Controlador+A&background=random',
    allowedClusters: ['SALVADOR'],
    allowedBranches: ['SALVADOR']
  },
  {
    id: 'C002',
    name: 'Controlador Beta',
    nickname: 'Beta',
    email: 'beta@diarioops.com',
    role: UserRole.CONTROLADOR,
    password: '123',
    avatar: 'https://ui-avatars.com/api/?name=Controlador+B&background=random',
    allowedClusters: ['FORTALEZA', 'RECIFE'],
    allowedBranches: ['FORTALEZA', 'RECIFE']
  },
];

const SEED_OCCURRENCES: Occurrence[] = [
  {
    id: 'occ_1',
    userId: 'T001',
    userName: 'João Técnico',
    registeredByUserId: 'C001',
    date: new Date().toISOString().split('T')[0],
    time: '08:30',
    category: OccurrenceCategory.CAT_01,
    reason: '1.2 Ainda em Deslocamento',
    description: 'Trânsito intenso na avenida principal.',
    status: OccurrenceStatus.REGISTRADA,
    escalationLevel: EscalationLevel.NONE,
    branch: 'SALVADOR',
    sector: 'BKT_SALVADOR_AREA_01',
    cluster: 'SALVADOR',
    auditTrail: [
      { id: 'a1', date: new Date().toISOString(), action: 'REGISTRO', user: 'Controlador Alpha', details: 'Ocorrência criada' }
    ]
  }
];

// Default seed team
const DEFAULT_TEAM: TeamMember[] = [
  // Gerentes
  { id: 'G001', name: 'Carlos Silva', role: TeamMemberRole.GERENTE, reportsToId: undefined, controladorId: 'admin', cluster: 'SALVADOR', filial: undefined, segment: undefined, active: true },
  { id: 'G002', name: 'Ana Paula Costa', role: TeamMemberRole.GERENTE, reportsToId: undefined, controladorId: 'admin', cluster: 'FORTALEZA', filial: undefined, segment: undefined, active: true },

  // Coordenadores
  { id: 'CO001', name: 'Roberto Santos', role: TeamMemberRole.COORDENADOR, reportsToId: 'G001', controladorId: 'C001', cluster: 'SALVADOR', filial: undefined, segment: undefined, active: true },
  { id: 'CO002', name: 'Juliana Oliveira', role: TeamMemberRole.COORDENADOR, reportsToId: 'G002', controladorId: 'C002', cluster: 'FORTALEZA', filial: undefined, segment: undefined, active: true },

  // Supervisores
  { id: 'S001', name: 'Fernando Lima', role: TeamMemberRole.SUPERVISOR, reportsToId: 'CO001', controladorId: 'C001', cluster: 'SALVADOR', filial: 'SALVADOR', segment: undefined, active: true },
  { id: 'S002', name: 'Mariana Souza', role: TeamMemberRole.SUPERVISOR, reportsToId: 'CO001', controladorId: 'C001', cluster: 'SALVADOR', filial: 'FEIRA DE SANTANA', segment: undefined, active: true },
  { id: 'S003', name: 'Paulo Mendes', role: TeamMemberRole.SUPERVISOR, reportsToId: 'CO002', controladorId: 'C002', cluster: 'FORTALEZA', filial: 'FORTALEZA', segment: undefined, active: true },

  // Técnicos (com supervisorId, coordenadorId, gerenteId)
  { id: 'T001', name: 'João Técnico', role: TeamMemberRole.TECNICO, supervisorId: 'S001', coordenadorId: 'CO001', gerenteId: 'G001', controladorId: 'C001', cluster: 'SALVADOR', filial: 'SALVADOR', segment: 'BA', active: true },
  { id: 'T002', name: 'Pedro Campo', role: TeamMemberRole.TECNICO, supervisorId: 'S001', coordenadorId: 'CO001', gerenteId: 'G001', controladorId: 'C001', cluster: 'SALVADOR', filial: 'SALVADOR', segment: 'TT', active: true },
  { id: 'T003', name: 'Maria Externa', role: TeamMemberRole.TECNICO, supervisorId: 'S003', coordenadorId: 'CO002', gerenteId: 'G002', controladorId: 'C002', cluster: 'FORTALEZA', filial: 'FORTALEZA', segment: 'BA', active: true },
  { id: 'T004', name: 'José Silva', role: TeamMemberRole.TECNICO, supervisorId: 'S002', coordenadorId: 'CO001', gerenteId: 'G001', controladorId: 'C001', cluster: 'SALVADOR', filial: 'FEIRA DE SANTANA', segment: 'TT', active: true }
];

// Helper to convert flat constants to Hierarchical Tree for Seed
const generateInitialGeoHierarchy = (): GeoCluster[] => {
  const clustersMap: Record<string, GeoBranch[]> = {};

  // 1. Group branches by cluster from INITIAL_BRANCH_TO_CLUSTER
  Object.entries(INITIAL_BRANCH_TO_CLUSTER).forEach(([branchName, clusterName]) => {
    if (!clustersMap[clusterName]) {
      clustersMap[clusterName] = [];
    }

    // 2. Get sectors for this branch from INITIAL_BRANCH_DATA
    const sectors = INITIAL_BRANCH_DATA[branchName] || [`BKT_${branchName.replace(/\s+/g, '_').toUpperCase()}_GERAL`];

    clustersMap[clusterName].push({
      name: branchName,
      sectors: sectors
    });
  });

  // 3. Convert to array
  return Object.entries(clustersMap).map(([name, branches]) => ({
    name,
    branches: branches.sort((a, b) => a.name.localeCompare(b.name))
  })).sort((a, b) => a.name.localeCompare(b.name));
};

// Helper to clean strings from CSV artifacts
const cleanCsvString = (str: string | undefined): string => {
  if (!str) return '';
  // Remove surrounding quotes and extra spaces, remove BOM
  return str.replace(/^["']|["']$/g, '').replace(/"/g, '').trim();
};

export const MockDB = {
  // --- MIGRATION SYSTEM (Fix old data) ---
  runMigrations: () => {
    // 1. Fix Users without new fields
    const usersStr = localStorage.getItem(USERS_KEY);
    if (usersStr) {
      const users: User[] = JSON.parse(usersStr);
      const updatedUsers = users.map(u => ({
        ...u,
        allowedClusters: u.allowedClusters || [],
        allowedBranches: u.allowedBranches || [],
        email: u.email || '',
        nickname: u.nickname || u.name.split(' ')[0]
      }));
      localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
    }

    // 2. Fix Occurrences missing Clusters (Derive from Branch)
    const occStr = localStorage.getItem(OCCURRENCES_KEY);
    if (occStr) {
      const geoMap = MockDB.getBranchToClusterMap(); // Needs to load geo first
      const occurrences: Occurrence[] = JSON.parse(occStr);
      const updatedOcc = occurrences.map(o => {
        // If cluster is missing but branch exists, try to find it
        if (!o.cluster && o.branch) {
          return { ...o, cluster: geoMap[o.branch] || 'OUTROS' };
        }
        return o;
      });
      localStorage.setItem(OCCURRENCES_KEY, JSON.stringify(updatedOcc));
    }
  },

  // --- BACKUP & RESTORE ---
  exportDatabase: (): string => {
    const backup = {
      users: JSON.parse(localStorage.getItem(USERS_KEY) || '[]'),
      occurrences: JSON.parse(localStorage.getItem(OCCURRENCES_KEY) || '[]'),
      team: JSON.parse(localStorage.getItem(MY_TEAM_KEY) || '[]'),
      reasons: JSON.parse(localStorage.getItem(SETTINGS_KEY) || '[]'),
      geo: JSON.parse(localStorage.getItem(GEO_SETTINGS_KEY) || '[]'),
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    return JSON.stringify(backup, null, 2);
  },

  importDatabase: (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (!data.users || !data.occurrences) throw new Error("Invalid Backup File");

      localStorage.setItem(USERS_KEY, JSON.stringify(data.users));
      localStorage.setItem(OCCURRENCES_KEY, JSON.stringify(data.occurrences));
      localStorage.setItem(MY_TEAM_KEY, JSON.stringify(data.team || []));
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.reasons || []));
      localStorage.setItem(GEO_SETTINGS_KEY, JSON.stringify(data.geo || []));

      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },


  getUsers: (): User[] => {
    const stored = localStorage.getItem(USERS_KEY);
    if (stored) return JSON.parse(stored);
    localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
    return SEED_USERS;
  },

  addUser: (user: User): void => {
    const users = MockDB.getUsers();
    if (users.find(u => u.id.toLowerCase() === user.id.toLowerCase())) return;
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  updateUser: (user: User, originalId?: string): void => {
    const users = MockDB.getUsers();
    const searchId = originalId || user.id;
    const index = users.findIndex(u => u.id.toLowerCase() === searchId.toLowerCase());

    if (index !== -1) {
      // Preserve existing fields if not provided in update
      const existing = users[index];
      users[index] = { ...existing, ...user };

      localStorage.setItem(USERS_KEY, JSON.stringify(users));

      if (originalId && originalId !== user.id) {
        const storedTeam = localStorage.getItem(MY_TEAM_KEY);
        if (storedTeam) {
          const allMembers: TeamMember[] = JSON.parse(storedTeam);
          let hasChanges = false;

          const updatedMembers = allMembers.map(member => {
            if (member.reportsToId === originalId) {
              hasChanges = true;
              return { ...member, reportsToId: user.id };
            }
            return member;
          });

          if (hasChanges) {
            localStorage.setItem(MY_TEAM_KEY, JSON.stringify(updatedMembers));
          }
        }
      }
    }
  },

  removeUser: (id: string): void => {
    const users = MockDB.getUsers();
    const filtered = users.filter(u => u.id.toLowerCase() !== id.toLowerCase());
    localStorage.setItem(USERS_KEY, JSON.stringify(filtered));
  },

  importUsersFromCsv: (csvContent: string, mode: 'MERGE' | 'REPLACE' = 'MERGE'): { total: number, updated: number, new: number, errors: string[] } => {
    const cleanContent = csvContent.replace(/^\uFEFF/, '').trim();
    const lines = cleanContent.split(/\r?\n/).filter(line => line.trim() !== '');
    const errors: string[] = [];

    if (lines.length === 0) return { total: 0, updated: 0, new: 0, errors: ['Arquivo vazio'] };

    // Detect separator using the first 5 lines to average
    const sampleSize = Math.min(lines.length, 5);
    let semicolonCount = 0;
    let commaCount = 0;
    for (let i = 0; i < sampleSize; i++) {
      semicolonCount += (lines[i].match(/;/g) || []).length;
      commaCount += (lines[i].match(/,/g) || []).length;
    }
    const separator = semicolonCount >= commaCount ? ';' : ',';

    let newUsersCount = 0;
    let updatedUsersCount = 0;

    // If REPLACE, start with empty array (but keeping admin might be wise, implemented as safety check in loop)
    let currentUsers = mode === 'REPLACE' ? [] : MockDB.getUsers();

    lines.forEach((line, index) => {
      // Header check
      if (index === 0) return;

      const parts = line.split(separator).map(cleanCsvString);

      // Expected Format: Nome; ID Login; Senha; Email; Apelido; Perfil; Clusters; Filiais
      // Minimum required: Nome, ID, Senha
      if (parts.length >= 3) {
        const name = parts[0];
        const id = parts[1];
        const password = parts[2];
        const email = parts[3] || '';
        const nickname = parts[4] || '';
        const roleStr = parts[5] || 'CONTROLADOR';
        const clustersStr = parts[6] || '';
        const branchesStr = parts[7] || '';

        const role = roleStr.toUpperCase() === 'ADMIN' ? UserRole.ADMIN : UserRole.CONTROLADOR;
        const allowedClusters = clustersStr ? clustersStr.split('|').map(cleanCsvString).filter(Boolean) : [];
        const allowedBranches = branchesStr ? branchesStr.split('|').map(cleanCsvString).filter(Boolean) : [];

        if (name && id && password) {
          const existingIndex = currentUsers.findIndex(u => u.id.toLowerCase() === id.toLowerCase());

          const userObj: User = {
            id,
            name,
            password,
            email,
            nickname: nickname || name.split(' ')[0],
            role,
            allowedClusters,
            allowedBranches,
            avatar: `https://ui-avatars.com/api/?name=${name}&background=random`
          };

          if (existingIndex >= 0) {
            // Update existing (in MERGE mode)
            currentUsers[existingIndex] = { ...currentUsers[existingIndex], ...userObj };
            updatedUsersCount++;
          } else {
            // Add new
            currentUsers.push(userObj);
            newUsersCount++;
          }
        } else {
          errors.push(`Linha ${index + 1}: Faltando dados obrigatórios (Nome, ID ou Senha)`);
        }
      } else {
        errors.push(`Linha ${index + 1}: Formato inválido (poucas colunas)`);
      }
    });

    localStorage.setItem(USERS_KEY, JSON.stringify(currentUsers));
    return { total: newUsersCount + updatedUsersCount, updated: updatedUsersCount, new: newUsersCount, errors };
  },

  authenticate: (id: string, pass: string): User | null => {
    const users = MockDB.getUsers();
    const user = users.find(u => u.id.toLowerCase() === id.toLowerCase() && u.password === pass);
    return user || null;
  },

  getOccurrences: (): Occurrence[] => {
    const stored = localStorage.getItem(OCCURRENCES_KEY);
    if (stored) return JSON.parse(stored);
    localStorage.setItem(OCCURRENCES_KEY, JSON.stringify(SEED_OCCURRENCES));
    return SEED_OCCURRENCES;
  },

  saveOccurrence: (occurrence: Occurrence): void => {
    const all = MockDB.getOccurrences();
    const index = all.findIndex(o => o.id === occurrence.id);
    if (index >= 0) {
      all[index] = occurrence;
    } else {
      all.push(occurrence);
    }
    localStorage.setItem(OCCURRENCES_KEY, JSON.stringify(all));
  },

  deleteOccurrence: (id: string): void => {
    const all = MockDB.getOccurrences();
    const filtered = all.filter(o => o.id !== id);
    localStorage.setItem(OCCURRENCES_KEY, JSON.stringify(filtered));
  },

  // --- NEW: Import Occurrences from CSV ---
  importOccurrencesFromCsv: (csvContent: string, mode: 'MERGE' | 'REPLACE' = 'MERGE'): { total: number, new: number, errors: string[] } => {
    const cleanContent = csvContent.replace(/^\uFEFF/, '').trim();
    const lines = cleanContent.split(/\r?\n/).filter(line => line.trim() !== '');
    const errors: string[] = [];

    if (lines.length === 0) return { total: 0, new: 0, errors: ['Arquivo vazio'] };

    const firstLine = lines[0];
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const separator = semicolonCount >= commaCount ? ';' : ',';

    let currentOccurrences = mode === 'REPLACE' ? [] : MockDB.getOccurrences();
    let newCount = 0;

    const branchToClusterMap = MockDB.getBranchToClusterMap();

    lines.forEach((line, index) => {
      if (index === 0) return;

      const parts = line.split(separator).map(cleanCsvString);

      // Expected: Data; Hora; ID Tecnico; Nome Tecnico; Categoria; Motivo; Descricao; Filial; Setor
      if (parts.length >= 6) {
        const date = parts[0];
        const time = parts[1];
        const userId = parts[2];
        const userName = parts[3];
        const category = parts[4];
        const reason = parts[5];
        const description = parts[6] || '';
        const branch = parts[7] || '';
        const sector = parts[8] || '';
        const statusStr = parts[9] || 'REGISTRADA';

        // Simple validation
        if (date && userId && category) {
          const derivedCluster = branch ? (branchToClusterMap[branch] || 'OUTROS') : '';
          const newOcc: Occurrence = {
            id: `occ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            userName: userName || 'Técnico Importado',
            registeredByUserId: 'IMPORTACAO',
            date,
            time,
            category,
            reason,
            description,
            status: statusStr.toUpperCase() as OccurrenceStatus || OccurrenceStatus.REGISTRADA,
            escalationLevel: EscalationLevel.NONE,
            branch,
            sector,
            cluster: derivedCluster,
            auditTrail: [{
              id: `aud_${Date.now()}`,
              date: new Date().toISOString(),
              action: 'IMPORTACAO',
              user: 'Sistema',
              details: 'Importado via CSV'
            }]
          };
          currentOccurrences.push(newOcc);
          newCount++;
        } else {
          errors.push(`Linha ${index + 1}: Faltando dados obrigatórios (Data, ID Técnico ou Categoria)`);
        }
      } else {
        errors.push(`Linha ${index + 1}: Colunas insuficientes`);
      }
    });

    localStorage.setItem(OCCURRENCES_KEY, JSON.stringify(currentOccurrences));
    return { total: newCount, new: newCount, errors };
  },

  getMyTeam: (currentUserId: string, role: UserRole): TeamMember[] => {
    const stored = localStorage.getItem(MY_TEAM_KEY);

    if (!stored) {
      localStorage.setItem(MY_TEAM_KEY, JSON.stringify(DEFAULT_TEAM));
      if (role === UserRole.ADMIN) return DEFAULT_TEAM;
      return DEFAULT_TEAM.filter(m => m.reportsToId?.toLowerCase() === currentUserId.toLowerCase());
    }

    const allMembers: TeamMember[] = JSON.parse(stored);

    if (role === UserRole.ADMIN) {
      return allMembers;
    }
    return allMembers.filter(m => m.reportsToId?.toLowerCase() === currentUserId.toLowerCase());
  },

  addTeamMember: (member: TeamMember): void => {
    const stored = localStorage.getItem(MY_TEAM_KEY);
    let allMembers: TeamMember[] = stored ? JSON.parse(stored) : [...DEFAULT_TEAM];

    allMembers = allMembers.filter(m => m.id.toLowerCase() !== member.id.toLowerCase());
    allMembers.push(member);

    localStorage.setItem(MY_TEAM_KEY, JSON.stringify(allMembers));
  },

  removeTeamMember: (id: string): void => {
    const stored = localStorage.getItem(MY_TEAM_KEY);
    let allMembers: TeamMember[] = stored ? JSON.parse(stored) : [...DEFAULT_TEAM];
    allMembers = allMembers.filter(m => m.id.toLowerCase() !== id.toLowerCase());
    localStorage.setItem(MY_TEAM_KEY, JSON.stringify(allMembers));
  },

  importTeamFromCsv: (csvContent: string, mode: 'MERGE' | 'REPLACE' = 'REPLACE'): { total: number, updated: number, new: number, errors: string[] } => {
    const cleanContent = csvContent.replace(/^\uFEFF/, '').trim();
    const lines = cleanContent.split(/\r?\n/).filter(line => line.trim() !== '');
    const errors: string[] = [];

    if (lines.length === 0) return { total: 0, updated: 0, new: 0, errors: ['Arquivo vazio'] };

    // Detect separator using sample
    const sampleSize = Math.min(lines.length, 5);
    let semicolonCount = 0;
    let commaCount = 0;
    for (let i = 0; i < sampleSize; i++) {
      semicolonCount += (lines[i].match(/;/g) || []).length;
      commaCount += (lines[i].match(/,/g) || []).length;
    }
    const separator = semicolonCount >= commaCount ? ';' : ',';

    // Get existing team
    const existingTeam: TeamMember[] = JSON.parse(localStorage.getItem(MY_TEAM_KEY) || '[]');

    // If REPLACE mode for technicians, keep only managers and replace technicians
    // If MERGE mode, keep everything
    let currentTeam: TeamMember[] = mode === 'REPLACE'
      ? existingTeam.filter(m => m.role !== TeamMemberRole.TECNICO) // Keep only managers
      : existingTeam; // Keep everything

    let newCount = 0;
    let updatedCount = 0;

    lines.forEach((line, index) => {
      // Header check
      if (index === 0) return;

      const parts = line.split(separator).map(cleanCsvString);

      // New Format: ID; Nome; Supervisor; Coordenador; Gerente; Controlador; Cluster; Filial; Segmento
      if (parts.length >= 3) {
        const id = parts[0];
        const name = parts[1];
        const supervisorName = parts[2] || '';
        const coordenadorName = parts[3] || '';
        const gerenteName = parts[4] || '';
        const controladorId = parts[5] || undefined;
        const cluster = parts[6] || '';
        const filial = parts[7] || '';
        const segmentStr = parts[8] || '';

        // Find manager IDs by name from current team (includes existing managers)
        console.log('🔍 Buscando gestores para técnico:', name);
        console.log('   Supervisor procurado:', supervisorName);
        console.log('   Coordenador procurado:', coordenadorName);
        console.log('   Gerente procurado:', gerenteName);
        console.log('   Gestores disponíveis:', currentTeam.filter(m => m.role !== TeamMemberRole.TECNICO).map(m => `${m.name} (${m.role})`));

        const supervisor = supervisorName ? currentTeam.find(m => m.name.toLowerCase() === supervisorName.toLowerCase() && m.role === TeamMemberRole.SUPERVISOR) : undefined;
        const coordenador = coordenadorName ? currentTeam.find(m => m.name.toLowerCase() === coordenadorName.toLowerCase() && m.role === TeamMemberRole.COORDENADOR) : undefined;
        const gerente = gerenteName ? currentTeam.find(m => m.name.toLowerCase() === gerenteName.toLowerCase() && m.role === TeamMemberRole.GERENTE) : undefined;

        console.log('   ✅ Supervisor encontrado:', supervisor?.name, supervisor?.id);
        console.log('   ✅ Coordenador encontrado:', coordenador?.name, coordenador?.id);
        console.log('   ✅ Gerente encontrado:', gerente?.name, gerente?.id);

        // Validate Segment
        let segment: 'BA' | 'TT' | undefined = undefined;
        if (segmentStr.toUpperCase() === 'BA') segment = 'BA';
        if (segmentStr.toUpperCase() === 'TT') segment = 'TT';

        if (name && id) {
          const memberObj: TeamMember = {
            id,
            name,
            role: TeamMemberRole.TECNICO,
            supervisorId: supervisor?.id || undefined,
            coordenadorId: coordenador?.id || undefined,
            gerenteId: gerente?.id || undefined,
            controladorId: controladorId || undefined,
            cluster: cluster || undefined,
            filial: filial || undefined,
            segment,
            active: true
          };

          const existingIndex = currentTeam.findIndex(m => m.id.toLowerCase() === id.toLowerCase());

          if (existingIndex >= 0 && mode === 'MERGE') {
            currentTeam[existingIndex] = { ...currentTeam[existingIndex], ...memberObj };
            updatedCount++;
          } else {
            currentTeam.push(memberObj);
            newCount++;
          }
        } else {
          errors.push(`Linha ${index + 1}: Dados obrigatórios ausentes (Nome e ID)`);
        }
      } else {
        errors.push(`Linha ${index + 1}: Colunas insuficientes`);
      }
    });

    if (newCount > 0 || updatedCount > 0 || mode === 'REPLACE') {
      localStorage.setItem(MY_TEAM_KEY, JSON.stringify(currentTeam));
    }

    return { total: newCount + updatedCount, updated: updatedCount, new: newCount, errors };
  },

  importGestoresFromCsv: (csvContent: string, mode: 'MERGE' | 'REPLACE' = 'REPLACE'): { total: number, updated: number, new: number, errors: string[] } => {
    const cleanContent = csvContent.replace(/^\uFEFF/, '').trim();
    const lines = cleanContent.split(/\r?\n/).filter(line => line.trim() !== '');
    const errors: string[] = [];

    if (lines.length === 0) return { total: 0, updated: 0, new: 0, errors: ['Arquivo vazio'] };

    // Detect separator
    const sampleSize = Math.min(lines.length, 5);
    let semicolonCount = 0;
    let commaCount = 0;
    for (let i = 0; i < sampleSize; i++) {
      semicolonCount += (lines[i].match(/;/g) || []).length;
      commaCount += (lines[i].match(/,/g) || []).length;
    }
    const separator = semicolonCount >= commaCount ? ';' : ',';

    // Get existing team
    const existingTeam: TeamMember[] = JSON.parse(localStorage.getItem(MY_TEAM_KEY) || '[]');

    // If REPLACE mode for managers, keep only technicians and replace managers
    // If MERGE mode, keep everything
    let currentTeam: TeamMember[] = mode === 'REPLACE'
      ? existingTeam.filter(m => m.role === TeamMemberRole.TECNICO) // Keep only technicians
      : existingTeam; // Keep everything

    let newCount = 0;
    let updatedCount = 0;

    lines.forEach((line, index) => {
      if (index === 0) return; // Skip header

      const parts = line.split(separator).map(cleanCsvString);

      // Format: Nome; Cargo; Superior Imediato; Cluster; Filial
      if (parts.length >= 2) {
        const name = parts[0];
        const roleStr = parts[1] || '';
        const superiorName = parts[2] || '';
        const cluster = parts[3] || '';
        const filial = parts[4] || '';

        // Validate Role
        let role: TeamMemberRole = TeamMemberRole.SUPERVISOR;
        if (roleStr === 'Coordenador') role = TeamMemberRole.COORDENADOR;
        if (roleStr === 'Gerente') role = TeamMemberRole.GERENTE;

        // Find superior by name from current team
        const superior = superiorName ? currentTeam.find(m => m.name.toLowerCase() === superiorName.toLowerCase() && m.role !== TeamMemberRole.TECNICO) : undefined;

        // Generate ID
        const prefix = role === TeamMemberRole.SUPERVISOR ? 'S' :
          role === TeamMemberRole.COORDENADOR ? 'CO' : 'G';

        const existingIds = currentTeam
          .filter(m => m.id.startsWith(prefix))
          .map(m => parseInt(m.id.replace(prefix, '')) || 0);

        const nextNumber = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
        const generatedId = `${prefix}${String(nextNumber).padStart(3, '0')}`;

        if (name) {
          const memberObj: TeamMember = {
            id: generatedId,
            name,
            role,
            reportsToId: superior?.id || undefined,
            cluster: cluster || undefined,
            filial: filial || undefined,
            active: true
          };

          currentTeam.push(memberObj);
          newCount++;
        } else {
          errors.push(`Linha ${index + 1}: Nome obrigatório ausente`);
        }
      } else {
        errors.push(`Linha ${index + 1}: Colunas insuficientes`);
      }
    });

    if (newCount > 0 || updatedCount > 0 || mode === 'REPLACE') {
      localStorage.setItem(MY_TEAM_KEY, JSON.stringify(currentTeam));
    }

    return { total: newCount + updatedCount, updated: updatedCount, new: newCount, errors };
  },

  // --- Reasons Management ---
  getReasonHierarchy: (): ReasonTree[] => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) return JSON.parse(stored);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(REASON_HIERARCHY));
    return REASON_HIERARCHY;
  },

  saveReasonHierarchy: (hierarchy: ReasonTree[]): void => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(hierarchy));
  },

  // --- Geography / Cluster Management (DYNAMIC) ---
  getGeoHierarchy: (): GeoCluster[] => {
    const stored = localStorage.getItem(GEO_SETTINGS_KEY);
    if (stored) return JSON.parse(stored);

    // First time? Generate from old constants
    const initial = generateInitialGeoHierarchy();
    localStorage.setItem(GEO_SETTINGS_KEY, JSON.stringify(initial));
    return initial;
  },

  saveGeoHierarchy: (hierarchy: GeoCluster[]): void => {
    localStorage.setItem(GEO_SETTINGS_KEY, JSON.stringify(hierarchy));
  },

  // Helpers for Consumers to replace hardcoded constants
  getClusterList: (): string[] => {
    const hierarchy = MockDB.getGeoHierarchy();
    return hierarchy.map(c => c.name).sort();
  },

  getBranchToClusterMap: (): Record<string, string> => {
    const hierarchy = MockDB.getGeoHierarchy();
    const map: Record<string, string> = {};
    hierarchy.forEach(cluster => {
      cluster.branches.forEach(branch => {
        map[branch.name] = cluster.name;
      });
    });
    return map;
  },

  getBranchDataMap: (): Record<string, string[]> => {
    const hierarchy = MockDB.getGeoHierarchy();
    const map: Record<string, string[]> = {};
    hierarchy.forEach(cluster => {
      cluster.branches.forEach(branch => {
        map[branch.name] = branch.sectors;
      });
    });
    return map;
  },

  reset: () => {
    localStorage.removeItem(USERS_KEY);
    localStorage.removeItem(OCCURRENCES_KEY);
    localStorage.removeItem(MY_TEAM_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(GEO_SETTINGS_KEY);
    window.location.reload();
  }
};

// RUN MIGRATIONS ON LOAD
MockDB.runMigrations();
