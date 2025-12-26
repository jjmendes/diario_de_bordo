
export enum UserRole {
  CONTROLADOR = 'CONTROLADOR',
  ADMIN = 'ADMIN'
}

export enum OccurrenceStatus {
  REGISTRADA = 'REGISTRADA',
  EM_ANALISE = 'EM_ANALISE',
  DEVOLVIDA = 'DEVOLVIDA',
  CONCLUIDA = 'CONCLUIDA',
  CANCELADA = 'CANCELADA'
}

export enum EscalationLevel {
  NONE = 'Sem Recorrência',
  SUPERVISOR = 'Supervisor',
  COORDENADOR = 'Coordenador',
  GERENTE = 'Gerente',
  DIRETOR = 'Diretor'
}

// Using generic keys with descriptive values to handle the complex sentences provided
export enum OccurrenceCategory {
  CAT_01 = '1 - Técnico não Iniciou até 08:30',
  CAT_02 = '2 - Prazo Perdido (Exec. 30 Min)',
  CAT_03 = '3 - Técnico Saiu da Força',
  CAT_04 = '4 - Técnico Entrou na Força',
  CAT_05 = '5 - Mínima Agenda Perdida',
  CAT_06 = '6 - Produção Zero 12:00',
  CAT_07 = '7 - Técnico Ainda na 1ª Atividade do Dia 12h',
  CAT_08 = '8 - Técnico Sem Atividade',
  CAT_09 = '9 - Produção Zero 15:00',
  CAT_10 = '10 - BA Longa >= 3h',
  CAT_11 = '11 - Técnico Não Iniciou a Primeira da Tarde 14:00',
  CAT_12 = '12 - Técnico Sem Execução',
  CAT_13 = '13 - Problema Sistêmico Geral',
  CAT_14 = '14 - Setor com Chuva (Produção Impactada)',
  CAT_15 = '15 - Pendência da Venda do Dia'
}

export interface User {
  id: string;
  name: string;
  nickname?: string; // Apelido
  email?: string;
  role: UserRole;
  password?: string;
  avatar?: string;
  allowedClusters?: string[];
  allowedBranches?: string[];
}

export enum TeamMemberRole {
  TECNICO = 'Técnico',
  SUPERVISOR = 'Supervisor',
  COORDENADOR = 'Coordenador',
  GERENTE = 'Gerente'
}

export interface TeamMember {
  id: string;
  name: string;
  role: TeamMemberRole;         // Cargo na hierarquia
  reportsToId?: string;          // ID do superior imediato (para Supervisores/Coordenadores)
  supervisorId?: string;         // ID do Supervisor (apenas para Técnicos)
  coordenadorId?: string;        // ID do Coordenador (apenas para Técnicos)
  gerenteId?: string;            // ID do Gerente (apenas para Técnicos)
  controladorId?: string;        // ID do Controlador (Operador do Sistema)
  cluster?: string;              // Regional/Cluster
  filial?: string;
  segment?: 'BA' | 'TT';         // BA (Installation) or TT (Repair)
  active: boolean;
}

export interface AuditLog {
  id: string;
  date: string;
  action: string;
  user: string;
  details: string;
}

export interface Occurrence {
  id: string;
  userId: string;
  userName: string;
  registeredByUserId: string;
  date: string;
  time: string;
  category: string;
  reason: string;
  description: string;
  status: OccurrenceStatus;
  escalationLevel: EscalationLevel;
  cluster?: string; // Regional Cluster
  branch?: string; // Cidade (Filial)
  sector?: string; // BKT (Setor)
  location?: { lat: number; lng: number };
  auditTrail: AuditLog[];
  feedback?: string;
}

export interface ReasonTree {
  category: OccurrenceCategory;
  reasons: string[];
}

// --- NEW DYNAMIC STRUCTURE INTERFACES ---
export interface GeoBranch {
  name: string;
  sectors: string[];
}

export interface GeoCluster {
  name: string;
  branches: GeoBranch[];
}
