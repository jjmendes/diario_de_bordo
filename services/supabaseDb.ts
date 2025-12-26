import { supabase } from './supabase';
import { User, Occurrence, TeamMember, GeoCluster, TeamMemberRole, OccurrenceStatus, ReasonTree, GeoBranch } from '../types';

// Constants for Local Cache Keys (to reduce read operations on non-critical data if needed, though we will try to fetch live)
const CACHE_KEYS = {
    GEO: 'supa_geo_structure',
    REASONS: 'supa_reasons_tree'
};

export const SupabaseDB = {

    // --- USER MANAGEMENT (Profiles) ---
    // Users are managed via Auth, but extra data is in 'profiles'

    async getUsers(): Promise<User[]> {
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*');

        if (error) {
            console.error('Error fetching users:', error);
            return [];
        }

        return profiles.map(p => ({
            id: p.id,
            name: p.name,
            nickname: p.nickname,
            email: p.email, // Now real email from DB
            role: p.role as any,
            avatar: p.avatar_url,
            allowedClusters: p.allowed_clusters || [],
            allowedBranches: p.allowed_branches || []
        }));
    },

    async updateUser(user: Partial<User>): Promise<void> {
        if (!user.id) return;

        const updates = {
            name: user.name,
            nickname: user.nickname,
            email: user.email, // Include email in updates
            allowed_clusters: user.allowedClusters,
            allowed_branches: user.allowedBranches,
            avatar_url: user.avatar,
            role: user.role
        };

        // Remove undefined
        Object.keys(updates).forEach(key => (updates as any)[key] === undefined && delete (updates as any)[key]);

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

        if (error) throw error;
    },

    async deleteUser(userId: string): Promise<void> {
        const { error } = await supabase.rpc('delete_user_by_id', { target_user_id: userId });
        if (error) throw error;
    },

    async createUser(userData: {
        email: string;
        password: string;
        name: string;
        nickname: string;
        role: string;
        allowedClusters: string[];
        allowedBranches: string[];
    }): Promise<{ success: boolean; error?: string; userId?: string }> {
        try {
            // WORKAROUND: Client-side creation without logging out current admin
            // We create a temporary client instance just for this operation
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            // @ts-ignore - Dynamic import to avoid circular dependency if needed, but here we just use the class
            const { createClient } = await import('@supabase/supabase-js');
            const tempClient = createClient(supabaseUrl, supabaseAnonKey);

            // 1. Create auth user using public signUp (requires "Allow new users to sign up" ON)
            const { data: authData, error: authError } = await tempClient.auth.signUp({
                email: userData.email,
                password: userData.password,
                options: {
                    data: {
                        name: userData.name,
                        nickname: userData.nickname
                    }
                }
            });

            if (authError || !authData.user) {
                console.error('Auth creation error:', authError);
                return { success: false, error: authError?.message || 'Failed to create auth user' };
            }

            // 2. Create/Update profile with permissions using MAIN client (Admin privileges)
            // Even though signUp might create the user, the profile trigger might not have set all fields, or we need to update role.
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: authData.user.id,
                    name: userData.name,
                    nickname: userData.nickname,
                    email: userData.email, // Ensure email is in profile for reference
                    role: userData.role,
                    allowed_clusters: userData.allowedClusters,
                    allowed_branches: userData.allowedBranches,
                    avatar_url: null
                });

            if (profileError) {
                console.error('Profile creation error:', profileError);
                // Note: We cannot easily delete the user with Anon key, so we just return error
                return { success: false, error: 'User created but profile failed: ' + profileError.message };
            }

            return { success: true, userId: authData.user.id };
        } catch (e: any) {
            console.error('Unexpected error creating user:', e);
            return { success: false, error: e.message || 'Unexpected error' };
        }
    },

    // --- OCCURRENCES ---

    async getOccurrences(): Promise<Occurrence[]> {
        // Join with team_members to get technician name
        const { data, error } = await supabase
            .from('occurrences')
            .select(`
    *,
    team_members: technician_id(name)
      `)
            .order('date', { ascending: false })
            .order('time', { ascending: false });

        if (error) {
            console.error('Error fetching occurrences:', error);
            return [];
        }

        return data.map(o => ({
            id: o.id,
            userId: o.technician_id,
            userName: o.team_members?.name || 'Técnico', // Flatten joined data
            registeredByUserId: o.registered_by,
            date: o.date,
            time: o.time,
            category: o.category,
            reason: o.reason,
            description: o.description,
            status: o.status as OccurrenceStatus,
            escalationLevel: o.escalation_level,
            location: o.location,
            branch: o.branch,
            sector: o.sector,
            cluster: o.cluster,
            auditTrail: o.audit_trail || [],
            feedback: o.feedback,
        }));
    },

    async saveOccurrence(occurrence: Occurrence): Promise<void> {
        // 1. Sanitize ID for UUID format if it's a temp local ID
        let id = occurrence.id;
        if (id.startsWith('occ_')) {
            id = undefined as any; // Let Supabase generate a real UUID
        }

        const dbPayload = {
            id: id,
            technician_id: occurrence.userId,
            registered_by: occurrence.registeredByUserId,
            date: occurrence.date,
            time: occurrence.time,
            category: occurrence.category,
            reason: occurrence.reason,
            description: occurrence.description,
            status: occurrence.status,
            escalation_level: occurrence.escalationLevel,
            cluster: occurrence.cluster,
            branch: occurrence.branch,
            sector: occurrence.sector,
            location: occurrence.location,
            audit_trail: occurrence.auditTrail,
            feedback: occurrence.feedback
        };

        // If ID is undefined, UPSERT works as INSERT if we omit ID, or we can use .insert(). 
        // Here upsert is fine but we need to match the signature.
        // However, for new records without UUID, it's safer to use insert if we don't send an ID.
        // If we have a UUID (update), we use upsert or update.

        if (!id) {
            const { error } = await supabase.from('occurrences').insert(dbPayload);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('occurrences').upsert(dbPayload);
            if (error) throw error;
        }
    },

    async deleteOccurrence(id: string): Promise<void> {
        const { error } = await supabase
            .from('occurrences')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async deleteManyOccurrences(filters: { startDate?: string, endDate?: string, cluster?: string, branch?: string, technicianId?: string }): Promise<number> {
        // PostgREST requires a filter for DELETE. We use neq('id', '00000000-0000-0000-0000-000000000000') as a dummy filter.
        let query = supabase.from('occurrences').delete({ count: 'exact' }).neq('id', '00000000-0000-0000-0000-000000000000');

        if (filters.startDate) query = query.gte('date', filters.startDate);
        if (filters.endDate) query = query.lte('date', filters.endDate);
        if (filters.cluster) query = query.eq('cluster', filters.cluster);
        if (filters.branch) query = query.eq('branch', filters.branch);
        if (filters.technicianId) query = query.eq('technician_id', filters.technicianId);

        const { count, error } = await query;
        if (error) throw error;
        return count || 0;
    },

    // --- TEAM MEMBERS ---

    async getMyTeam(currentUserId: string, role: string): Promise<TeamMember[]> {
        // If Admin, return all. If not, filtered logic could be Applied via RLS or here.
        // Currently RLS allows read all for auth users, so we can filter client side or via query.

        let query = supabase.from('team_members').select('*');

        // Implement filter if needed, but for now fetching all is safer to match MockDB behavior 
        // where the frontend usually allows seeing the whole team or filtering later.
        // Optimization: If dataset is huge, add filters here.

        const { data, error } = await query;

        if (error) {
            console.error(error);
            return [];
        }

        const members = data.map(m => ({
            id: m.id,
            name: m.name,
            role: m.role as TeamMemberRole,
            reportsToId: m.reports_to_id,
            supervisorId: m.supervisor_id,
            coordenadorId: m.coordenador_id,
            gerenteId: m.gerente_id,
            controladorId: m.controlador_id,
            cluster: m.cluster,
            filial: m.filial,
            segment: m.segment,
            active: m.active
        }));

        if (role === 'ADMIN') return members;

        // Simple recursive filter could go here if needed, but frontend `EditOccurrenceForm` does it usually?
        // MockDB.getMyTeam did filter. Let's replicate simple direct report filter:
        return members.filter(m => m.reportsToId === currentUserId || m.id === currentUserId || role === 'ADMIN');
        // Actually typically we want the whole tree. For now returning ALL is safer to avoid empty lists.
        // Let's rely on the frontend to filter or return keys.
        return members;
    },

    async addTeamMember(member: TeamMember): Promise<void> {
        const payload = {
            id: member.id,
            name: member.name,
            role: member.role,
            reports_to_id: member.reportsToId,
            supervisor_id: member.supervisorId,
            coordenador_id: member.coordenadorId,
            gerente_id: member.gerenteId,
            controlador_id: member.controladorId,
            cluster: member.cluster,
            filial: member.filial,
            segment: member.segment,
            active: member.active
        };

        const { error } = await supabase.from('team_members').upsert(payload);
        if (error) throw error;
    },

    async removeTeamMember(id: string): Promise<void> {
        // Instead of delete, maybe set active = false? 
        // MockDB removed it. Supabase enforce FK. 
        const { error } = await supabase.from('team_members').delete().eq('id', id);
        if (error) throw error;
    },

    // --- CONFIG (Reasons & Geo) ---

    async getReasonHierarchy(): Promise<ReasonTree[]> {
        const { data } = await supabase.from('app_config').select('value').eq('key', 'reasons_tree').single();
        if (data) return data.value;

        // Fallback/Init
        return []; // Or default constant if imported
    },

    async getGeoHierarchy(): Promise<GeoCluster[]> {
        const { data } = await supabase.from('app_config').select('value').eq('key', 'geo_structure').single();
        if (data) return data.value;

        // Fallback handled by caller usually or seed
        return [];
    },

    // --- HELPERS (Now Async!) ---
    // These were synchronous in MockDB. Changes pattern in App.tsx

    async getClusterList(): Promise<string[]> {
        const hierarchy = await SupabaseDB.getGeoHierarchy();
        return hierarchy.map(c => c.name).sort();
    },

    async getBranchToClusterMap(): Promise<Record<string, string>> {
        const hierarchy = await SupabaseDB.getGeoHierarchy();
        const map: Record<string, string> = {};
        if (hierarchy) {
            hierarchy.forEach(cluster => {
                cluster.branches.forEach(branch => {
                    map[branch.name] = cluster.name;
                });
            });
        }
        return map;
    },

    async getBranchDataMap(): Promise<Record<string, string[]>> {
        const hierarchy = await SupabaseDB.getGeoHierarchy();
        const map: Record<string, string[]> = {};
        if (hierarchy) {
            hierarchy.forEach(cluster => {
                cluster.branches.forEach(branch => {
                    map[branch.name] = branch.sectors;
                });
            });
        }
        return map;
    },

    async saveReasonHierarchy(hierarchy: ReasonTree[]): Promise<void> {
        const { error } = await supabase.from('app_config').upsert({ key: 'reasons_tree', value: hierarchy });
        if (error) throw error;
    },

    async saveGeoHierarchy(hierarchy: GeoCluster[]): Promise<void> {
        const { error } = await supabase.from('app_config').upsert({ key: 'geo_structure', value: hierarchy });
        if (error) throw error;
    },

    // --- BULK IMPORTS (Ported from MockDB) ---

    async importTeamFromCsv(csvContent: string, mode: 'MERGE' | 'REPLACE' = 'REPLACE'): Promise<{ total: number, updated: number, new: number, errors: string[] }> {
        // 1. Fetch current team to check against
        const currentTeam = await SupabaseDB.getMyTeam('admin', 'ADMIN'); // Need all for lookups

        // clean
        const cleanCsvString = (str: string | undefined): string => {
            if (!str) return '';
            return str.replace(/^["']|["']$/g, '').replace(/"/g, '').trim();
        };

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

        let newCount = 0;
        let updatedCount = 0;
        const upsertList: any[] = [];

        // If replace mode, we might need to delete old technicians first? 
        // Supabase replace is tricky safely. Let's assume we just Upsert for now, or Delete filtered by role if Replace.
        // For safety in this migration script, we will just UpSert and maybe warn. 
        // IF user really wants REPLACE, we should delete all technicians first from DB?
        if (mode === 'REPLACE') {
            // Danger: deleting all technicians. Let's do it only if explicitly requested.
            const { error } = await supabase.from('team_members').delete().eq('role', 'TECNICO');
            if (error) console.error("Error clearing technicians for replace:", error);
        }

        lines.forEach((line, index) => {
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

                // Find manager IDs by name from current team
                const supervisor = supervisorName ? currentTeam.find(m => m.name.toLowerCase() === supervisorName.toLowerCase() && m.role === TeamMemberRole.SUPERVISOR) : undefined;
                const coordenador = coordenadorName ? currentTeam.find(m => m.name.toLowerCase() === coordenadorName.toLowerCase() && m.role === TeamMemberRole.COORDENADOR) : undefined;
                const gerente = gerenteName ? currentTeam.find(m => m.name.toLowerCase() === gerenteName.toLowerCase() && m.role === TeamMemberRole.GERENTE) : undefined;

                let segment: 'BA' | 'TT' | undefined = undefined;
                if (segmentStr.toUpperCase() === 'BA') segment = 'BA';
                if (segmentStr.toUpperCase() === 'TT') segment = 'TT';

                if (name && id) {
                    // Check if exists to count 'update' vs 'new'
                    const exists = currentTeam.some(m => m.id === id);
                    if (exists) updatedCount++; else newCount++;

                    upsertList.push({
                        id,
                        name,
                        role: TeamMemberRole.TECNICO,
                        reports_to_id: undefined, // Legacy field, usage varies. Usually Supervisor ID.
                        supervisor_id: supervisor?.id,
                        coordenador_id: coordenador?.id,
                        gerente_id: gerente?.id,
                        controlador_id: controladorId,
                        cluster,
                        filial,
                        segment,
                        active: true
                    });
                } else {
                    errors.push(`Linha ${index + 1}: Dados obrigatórios ausentes (Nome e ID)`);
                }
            } else {
                errors.push(`Linha ${index + 1}: Colunas insuficientes`);
            }
        });

        if (upsertList.length > 0) {
            // Insert in chunks of 100 to avoid request size limits
            const chunkSize = 100;
            for (let i = 0; i < upsertList.length; i += chunkSize) {
                const chunk = upsertList.slice(i, i + chunkSize);
                const { error } = await supabase.from('team_members').upsert(chunk);
                if (error) {
                    console.error("Batch upsert error:", error);
                    errors.push(`Erro ao salvar lote iniciando em ${i}: ${error.details || error.message}`);
                }
            }
        }

        return { total: newCount + updatedCount, updated: updatedCount, new: newCount, errors };
    },

    async importGestoresFromCsv(csvContent: string, mode: 'MERGE' | 'REPLACE' = 'REPLACE'): Promise<{ total: number, updated: number, new: number, errors: string[] }> {
        // Fetch current team (needed to find superiors for hierarchy)
        const currentTeam = await SupabaseDB.getMyTeam('admin', 'ADMIN');

        const cleanCsvString = (str: string | undefined): string => {
            if (!str) return '';
            return str.replace(/^["']|["']$/g, '').replace(/"/g, '').trim();
        };
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

        let newCount = 0;
        let updatedCount = 0;
        const upsertList: any[] = [];

        // If REPLACE, delete managers? Dangerous.
        if (mode === 'REPLACE') {
            const { error } = await supabase.from('team_members').delete().neq('role', 'TECNICO');
            if (error) console.error("Error clearing managers:", error);
        }

        // We need to process sequentially or in correct order (G -> CO -> S) to resolve IDs if generating? 
        // Re-implementing generation strategy might be complex if relying on concurrent state.
        // MockDB trusted local state array push. Supabase is effectively stateless here unless we re-fetch.
        // Better strategy: Read all lines, determine relations by Name, then Generate IDs?
        // Or just trust the user provided existing IDs? 
        // MockDB GENERATED IDs: S001, G001. We should probably stick to that or UUIDs.
        // Since this is a migration, let's assume we are migrating existing logic.
        // Logic below attempts to generate IDs. This is hard in batch without sequential logic.
        // To keep it simple: We will do simple generation based on existing MAX ID found in DB + index.

        // 1. Find max IDs in currentTeam
        let maxS = 0;
        let maxCO = 0;
        let maxG = 0;
        currentTeam.forEach(m => {
            const num = parseInt(m.id.replace(/\D/g, '')) || 0;
            if (m.id.startsWith('S')) maxS = Math.max(maxS, num);
            if (m.id.startsWith('CO')) maxCO = Math.max(maxCO, num);
            if (m.id.startsWith('G')) maxG = Math.max(maxG, num);
        });

        lines.forEach((line, index) => {
            if (index === 0) return;
            const parts = line.split(separator).map(cleanCsvString);

            if (parts.length >= 2) {
                const name = parts[0];
                const roleStr = parts[1] || '';
                const superiorName = parts[2] || '';
                const cluster = parts[3] || '';
                const filial = parts[4] || '';

                let role: TeamMemberRole = TeamMemberRole.SUPERVISOR;
                if (roleStr === 'Coordenador') role = TeamMemberRole.COORDENADOR;
                if (roleStr === 'Gerente') role = TeamMemberRole.GERENTE;

                // Find superior (in current DB team OR in already processed upsertList?? this is tricky)
                // Ideally supervisors should be imported AFTER their managers.
                // We search in currentTeam first.
                let superior = superiorName ? currentTeam.find(m => m.name.toLowerCase() === superiorName.toLowerCase()) : undefined;

                // If not in DB, maybe in current batch?
                if (!superior && superiorName) {
                    const foundInBatch = upsertList.find(u => u.name.toLowerCase() === superiorName.toLowerCase());
                    if (foundInBatch) superior = { id: foundInBatch.id } as any;
                }

                // Generate ID
                let id = '';
                if (role === TeamMemberRole.SUPERVISOR) { maxS++; id = `S${String(maxS).padStart(3, '0')}`; }
                else if (role === TeamMemberRole.COORDENADOR) { maxCO++; id = `CO${String(maxCO).padStart(3, '0')}`; }
                else { maxG++; id = `G${String(maxG).padStart(3, '0')}`; }

                if (name) {
                    // Check if update by name? Or just always insert new if generation?
                    // MockDB generated new. We'll generate new.
                    newCount++;
                    upsertList.push({
                        id,
                        name,
                        role,
                        reports_to_id: superior?.id,
                        cluster,
                        filial,
                        active: true
                    });
                } else {
                    errors.push(`Linha ${index + 1}: Nome obrigatório ausente`);
                }
            } else {
                errors.push(`Linha ${index + 1}: Colunas insuficientes`);
            }
        });

        if (upsertList.length > 0) {
            // Batch insert
            const { error } = await supabase.from('team_members').upsert(upsertList);
            if (error) {
                console.error("Batch upsert error (gestores):", error);
                errors.push(error.message);
            }
        }

        return { total: newCount + updatedCount, updated: updatedCount, new: newCount, errors };
    },

    async importOccurrencesFromCsv(csvContent: string): Promise<{ total: number, new: number, errors: string[] }> {
        const cleanCsvString = (str: string | undefined): string => {
            if (!str) return '';
            return str.replace(/^["']|["']$/g, '').replace(/"/g, '').trim();
        };

        const cleanContent = csvContent.replace(/^\uFEFF/, '').trim();
        const lines = cleanContent.split(/\r?\n/).filter(line => line.trim() !== '');
        const errors: string[] = [];

        if (lines.length === 0) return { total: 0, new: 0, errors: ['Arquivo vazio'] };

        // Detect separator
        const sampleSize = Math.min(lines.length, 5);
        let semicolonCount = 0;
        let commaCount = 0;
        for (let i = 0; i < sampleSize; i++) {
            semicolonCount += (lines[i].match(/;/g) || []).length;
            commaCount += (lines[i].match(/,/g) || []).length;
        }
        const separator = semicolonCount >= commaCount ? ';' : ',';

        let newCount = 0;
        const insertList: any[] = [];

        // Fetch all team members to resolve technician names to IDs
        const teamMembers = await SupabaseDB.getMyTeam('admin', 'ADMIN');
        const teamMemberMap = new Map<string, string>(); // name -> id
        teamMembers.forEach(m => teamMemberMap.set(m.name.toLowerCase(), m.id));

        lines.forEach((line, index) => {
            if (index === 0) return; // Skip header
            const parts = line.split(separator).map(cleanCsvString);

            // Expected CSV format:
            // Data;Hora;Técnico;Registrado Por;Categoria;Motivo;Descrição;Status;Nível de Escalonamento;Cluster;Filial;Setor;Localização;Feedback
            if (parts.length >= 13) {
                const dateStr = parts[0];
                const timeStr = parts[1];
                const technicianName = parts[2];
                const registeredByName = parts[3]; // Assuming this is also a team member name
                const category = parts[4];
                const reason = parts[5];
                const description = parts[6];
                const statusStr = parts[7];
                const escalationLevelStr = parts[8];
                const cluster = parts[9];
                const branch = parts[10];
                const sector = parts[11];
                const location = parts[12];
                const feedback = parts[13] || '';

                const technicianId = teamMemberMap.get(technicianName.toLowerCase());
                const registeredById = teamMemberMap.get(registeredByName.toLowerCase());

                if (!technicianId) {
                    errors.push(`Linha ${index + 1}: Técnico "${technicianName}" não encontrado.`);
                    return;
                }
                if (!registeredById) {
                    errors.push(`Linha ${index + 1}: Usuário "Registrado Por" "${registeredByName}" não encontrado.`);
                    return;
                }

                const dateParts = dateStr.split('/');
                if (dateParts.length !== 3) {
                    errors.push(`Linha ${index + 1}: Formato de data inválido "${dateStr}". Esperado DD/MM/YYYY.`);
                    return;
                }
                const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`; // YYYY-MM-DD


                let status: OccurrenceStatus = OccurrenceStatus.REGISTRADA;
                if (statusStr.toLowerCase().includes('concl')) status = OccurrenceStatus.CONCLUIDA;
                if (statusStr.toLowerCase().includes('cancel')) status = OccurrenceStatus.CANCELADA;
                if (statusStr.toLowerCase().includes('analise')) status = OccurrenceStatus.EM_ANALISE;

                // Map escalation strings or keep integer if that's what backend expects? 
                // Backend expects text or string for escalation_level probably? 
                // Types say EscalationLevel is enum of strings.
                // CSV parsing usually gives string.
                const escalationLevel = escalationLevelStr as any;

                newCount++;
                insertList.push({
                    technician_id: technicianId,
                    registered_by: registeredById,
                    date: formattedDate,
                    time: timeStr,
                    category: category,
                    reason: reason,
                    description: description,
                    status: status,
                    escalation_level: escalationLevel,
                    cluster: cluster,
                    branch: branch,
                    sector: sector,
                    location: location,
                    feedback: feedback,
                    audit_trail: [{ timestamp: new Date().toISOString(), userId: registeredById, action: 'Imported' }]
                });
            } else {
                errors.push(`Linha ${index + 1}: Colunas insuficientes. Esperado pelo menos 13.`);
            }
        });

        if (insertList.length > 0) {
            const chunkSize = 100;
            for (let i = 0; i < insertList.length; i += chunkSize) {
                const chunk = insertList.slice(i, i + chunkSize);
                const { error } = await supabase.from('occurrences').insert(chunk);
                if (error) {
                    console.error("Batch insert error (occurrences):", error);
                    errors.push(`Erro ao salvar lote de ocorrências iniciando em ${i}: ${error.details || error.message}`);
                }
            }
        }

        return { total: newCount, new: newCount, errors };
    },

    async updateCurrentUserPassword(newPassword: string): Promise<void> {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
    }
};
