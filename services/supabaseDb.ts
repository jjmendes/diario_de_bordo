import { supabase } from './supabase';
import { User, Occurrence, TeamMember, GeoCluster, TeamMemberRole, OccurrenceStatus, ReasonTree, GeoBranch } from '../types';

// Constants for Local Cache Keys (to reduce read operations on non-critical data if needed, though we will try to fetch live)
const CACHE_KEYS = {
    GEO: 'supa_geo_structure',
    REASONS: 'supa_reasons_tree'
};

export const SupabaseDB = {

    // --- HELPER: Get Subordinates ---
    async getSubordinateIds(managerId: string): Promise<string[]> {
        // 1. Resolve effective ID (if linked to a team member)
        // If the user logging in (managerId = auth.uid) is linked to a specific Team Member ID, use that.
        // Otherwise fallback to managerId (for legacy or direct matches).
        let effectiveId = String(managerId).trim();

        const { data: profile } = await supabase
            .from('profiles')
            .select('team_member_id')
            .eq('id', managerId)
            .single();

        if (profile?.team_member_id) {
            effectiveId = profile.team_member_id;
        }

        // 2. Fetch all team members where effectiveId appears in hierarchy
        const { data, error } = await supabase
            .from('team_members')
            .select('id')
            .or(`supervisor_id.eq.${effectiveId},coordenador_id.eq.${effectiveId},gerente_id.eq.${effectiveId},controlador_id.eq.${effectiveId}`);

        if (error) {
            console.error('Error fetching subordinates:', error);
            return [];
        }
        return data.map(m => m.id);
    },

    // --- USER MANAGEMENT (Profiles) ---
    // Users are managed via Auth, but extra data is in 'profiles'

    async getUsers(): Promise<User[]> {
        // console.log("Fetching users...");
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
            allowedBranches: p.allowed_branches || [],
            teamMemberId: p.team_member_id // Return linked ID
        }));
    },

    async updateUser(user: Partial<User>): Promise<void> {
        if (!user.id) return;

        // Use RPC V2 to update (upsert)
        const { error } = await supabase.rpc('admin_upsert_profile_v2', {
            target_id: user.id,
            new_email: user.email,
            new_name: user.name,
            new_nickname: user.nickname,
            new_role: user.role,
            new_clusters: user.allowedClusters,
            new_branches: user.allowedBranches,
            new_team_member_id: user.teamMemberId ?? null
        });

        if (error) throw error;

        // 2b. Update Avatar separately (RPC signature doesn't support it)
        if (user.avatar !== undefined) {
            const { error: avatarError } = await supabase
                .from('profiles')
                .update({ avatar_url: user.avatar })
                .eq('id', user.id);

            if (avatarError) {
                console.warn('Avatar update failed (RLS?):', avatarError);
            }
        }
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
        teamMemberId?: string; // Add link ID
    }): Promise<{ success: boolean; error?: string; userId?: string }> {
        try {
            // WORKAROUND: Client-side creation without logging out current admin
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            // @ts-ignore
            const { createClient } = await import('@supabase/supabase-js');
            const tempClient = createClient(supabaseUrl, supabaseAnonKey);

            // 1. Create auth user using public signUp
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

            // 2. Update profile using RPC V2
            // Supports 'team_member_id' linking
            const { error: rpcError } = await supabase.rpc('admin_upsert_profile_v2', {
                target_id: authData.user.id,
                new_email: userData.email,
                new_name: userData.name,
                new_nickname: userData.nickname,
                new_role: userData.role,
                new_clusters: userData.allowedClusters,
                new_branches: userData.allowedBranches,
                new_team_member_id: userData.teamMemberId
            });

            if (rpcError) {
                console.error('Profile update (RPC) error:', rpcError);
                // Try fallback to manual upsert only if RPC failed (e.g. if RPC doesn't exist)
                // usage of previous upsert logic here as absolute last resort, 
                // but usually RPC is the fix for RLS.
                return { success: false, error: 'User created but profile update failed: ' + rpcError.message };
            }

            return { success: true, userId: authData.user.id };
        } catch (e: any) {
            console.error('Unexpected error creating user:', e);
            return { success: false, error: e.message || 'Unexpected error' };
        }
    },

    // --- OCCURRENCES ---

    async getOccurrences(
        filters?: {
            startDate?: string;
            endDate?: string;
            status?: string;
            cluster?: string;
            branch?: string;
            search?: string;
            technicianId?: string; // Explicit technician filter
        },
        page: number = 0,
        pageSize: number = 50,
        viewingUser?: { id: string, role: string } // Context for permission filtering
    ): Promise<{ data: Occurrence[], count: number }> {

        // Base query with exact count
        let query = supabase
            .from('occurrences')
            .select(`
                *,
                team_members: technician_id(name),
                creator_profile: registered_by (name, nickname)
            `, { count: 'exact' });

        // ... filters ...

        // (Skipping filters setup lines for brevity in replacement if possible, but replace_file_content needs contiguous)
        // Actually, I can replace just the select part if I am careful with lines.
        // But I also need to replace the mapping part which is further down.
        // I will do 2 Replace calls.


        // --- HIERARCHY PERMISSION FILTER ---
        if (viewingUser && viewingUser.role !== 'ADMIN') {
            // Logic: Users see occurrences where technician_id is in their "subordinates list"
            // OR where they are the technician (if they are a technician).
            // OR if they are CONTROLADOR, do they see all? Assuming Controller sees all for simplicity explicitly unless restricted.
            // Assumption: Role 'CONTROLADOR' sees all? Or limited to Cluster? 
            // Current code in AdminPanel passes 'allowedClusters' to users. 
            // If viewingUser has allowedClusters, filter by cluster.

            // 1. Filter by Assigned Clusters (if any)
            // We need to fetch user profile to get allowed_clusters if not passed? 
            // Assuming 'viewingUser' passed here is generic, might usually fetch allowed_clusters.
            // But let's verify Hierarchy.

            // If Role is SUPERVISOR, COORDENADOR, GERENTE:
            if (['SUPERVISOR', 'COORDENADOR', 'GERENTE'].includes(viewingUser.role)) {
                const subIds = await this.getSubordinateIds(viewingUser.id);
                // Include self as well? Usually yes.
                subIds.push(viewingUser.id);
                query = query.in('technician_id', subIds);
            }
            // Controladores usually filtered by Cluster/Branch via `filters` which are set by UI based on profile.
            // If filters.cluster is set, it handles it.
        }

        // Apply filters
        if (filters?.startDate) query = query.gte('date', filters.startDate);
        if (filters?.endDate) query = query.lte('date', filters.endDate);
        if (filters?.status && filters.status !== 'ALL') query = query.eq('status', filters.status);
        if (filters?.cluster && filters.cluster !== 'ALL') query = query.eq('cluster', filters.cluster);
        if (filters?.branch && filters.branch !== 'ALL') query = query.eq('branch', filters.branch);
        if (filters?.technicianId) query = query.eq('technician_id', filters.technicianId); // Specific filter

        if (filters?.search) {
            // Simplified search on specific text columns
            const s = filters.search;
            query = query.or(`description.ilike.%${s}%,reason.ilike.%${s}%`);
            // Note: searching ID or joined name is harder with simple OR syntax. 
            // keeping it simple for performance.
        }

        // Pagination
        const from = page * pageSize;
        const to = from + pageSize - 1;

        query = query
            .order('date', { ascending: false })
            .order('time', { ascending: false })
            .range(from, to);

        const { data, error, count } = await query;

        if (error) {
            console.error('Error fetching occurrences:', error);
            return { data: [], count: 0 };
        }

        const mappedData = data.map(o => ({
            id: o.id,
            userId: o.technician_id,
            userName: o.team_members?.name || 'Técnico', // Flatten joined data
            registeredByUserId: o.registered_by,
            creatorName: (o.creator_profile?.nickname || o.creator_profile?.name) || 'Sistema',
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

        return { data: mappedData, count: count || 0 };
    },


    // --- DASHBOARD ANALYTICS (RPC) ---

    async getDashboardMetrics(filters: { startDate: string, endDate: string, cluster?: string, branch?: string, sector?: string }): Promise<any> {
        const { data, error } = await supabase.rpc('get_dashboard_metrics', {
            p_start_date: filters.startDate,
            p_end_date: filters.endDate,
            p_cluster: filters.cluster,
            p_branch: filters.branch,
            p_sector: filters.sector
        });

        if (error) {
            console.error("Error fetching dashboard metrics:", error);
            // Return empty structure to avoid crash
            return { kpi: { total: 0, treated: 0, pending: 0 }, category_counts: [], pareto_reasons: [], matrix_category: [], matrix_cluster: [] };
        }
        return data;
    },

    async getTechnicianRanking(filters: { year?: string, month?: string, category?: string, reason?: string }): Promise<any[]> {
        const { data, error } = await supabase.rpc('get_technician_ranking', {
            p_year: filters.year,
            p_month: filters.month,
            p_category: filters.category,
            p_reason: filters.reason
        });

        if (error) {
            console.error("Error fetching ranking:", error);
            return [];
        }
        return data;
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
        // 1. If Admin, return all.
        if (role === 'ADMIN') {
            const { data, error } = await supabase.from('team_members').select('*');
            if (error) {
                console.error('Error fetching team for admin:', error);
                return [];
            }
            return data.map(m => ({
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
        }

        // 2. Non-Admin: Fetch User Profile to get their "Control Code" (team_member_id)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('team_member_id')
            .eq('id', currentUserId)
            .single();

        if (profileError || !profile?.team_member_id) {
            console.warn('User has no Linked Code (team_member_id). Returning empty list.', profileError);
            return [];
        }

        // 3. Filter team members where technician's "Controlador Code" matches user's code
        // The column in team_members is 'controlador_id' (which stores the 4-digit code)
        const code = profile.team_member_id;

        const { data, error } = await supabase
            .from('team_members')
            .select('*')
            .or(`supervisor_id.eq.${code},coordenador_id.eq.${code},gerente_id.eq.${code},controlador_id.eq.${code}`);

        if (error) {
            console.error('Error fetching team for user:', error);
            return [];
        }

        return data.map(m => ({
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

        // If replace mode, we DO NOT delete records to preserve history.
        // Instead, we mark ALL existing technicians as INACTIVE. 
        // Then, the CSV import will "reactivate" only those present in the file (via upsert active: true).
        if (mode === 'REPLACE') {
            const { error } = await supabase
                .from('team_members')
                .update({ active: false })
                .eq('role', 'Técnico');

            if (error) {
                console.error("Error deactivating technicians for replacement:", error);
                errors.push("Falha ao desativar base antiga: " + error.message);
                return { total: 0, updated: 0, new: 0, errors };
            }
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

        // SOFT REPLACE LOGIC FOR MANAGERS: Deactivate existing managers before import
        if (mode === 'REPLACE') {
            const { error } = await supabase
                .from('team_members')
                .update({ active: false })
                .neq('role', 'Técnico'); // Deactivate Supervisors, Coordinators, Managers

            if (error) {
                console.error("Error deactivating managers for replacement:", error);
                errors.push("Falha ao desativar base antiga: " + error.message);
                return { total: 0, updated: 0, new: 0, errors };
            }
        }

        lines.forEach((line, index) => {
            if (index === 0) return;
            const parts = line.split(separator).map(cleanCsvString);

            // New Format: ID;Nome;Cargo;Superior Imediato;Cluster;Filial
            if (parts.length >= 3) {
                const idInput = parts[0];
                const name = parts[1];
                const roleStr = parts[2] || '';
                const superiorName = parts[3] || '';
                const cluster = parts[4] || '';
                const filial = parts[5] || '';

                let role: TeamMemberRole = TeamMemberRole.SUPERVISOR;
                if (roleStr.toUpperCase() === 'COORDENADOR') role = TeamMemberRole.COORDENADOR;
                if (roleStr.toUpperCase() === 'GERENTE') role = TeamMemberRole.GERENTE;

                // Find superior (in current DB team OR in already processed upsertList)
                // We search in currentTeam first.
                let superior = superiorName ? currentTeam.find(m => m.name.toLowerCase() === superiorName.toLowerCase()) : undefined;

                // If not in DB, maybe in current batch?
                if (!superior && superiorName) {
                    const foundInBatch = upsertList.find(u => u.name.toLowerCase() === superiorName.toLowerCase());
                    if (foundInBatch) superior = { id: foundInBatch.id } as any;
                }

                // Use provided ID or Generate ID if missing
                let id = idInput;
                if (!id) {
                    if (role === TeamMemberRole.SUPERVISOR) { maxS++; id = `S${String(maxS).padStart(3, '0')}`; }
                    else if (role === TeamMemberRole.COORDENADOR) { maxCO++; id = `CO${String(maxCO).padStart(3, '0')}`; }
                    else { maxG++; id = `G${String(maxG).padStart(3, '0')}`; }
                }

                if (name && id) {
                    // Check if exists to count 'update' vs 'new'
                    const exists = currentTeam.some(m => m.id === id);
                    if (exists) updatedCount++; else newCount++;

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
                    errors.push(`Linha ${index + 1}: Dados obrigatórios ausentes (ID ou Nome)`);
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

    async importUsersFromCsv(csvContent: string, mode: 'MERGE' | 'REPLACE' = 'MERGE'): Promise<{ total: number, new: number, errors: string[] }> {
        const cleanCsvString = (str: string | undefined): string => {
            if (!str) return '';
            return str.replace(/^["']|["']$/g, '').replace(/"/g, '').trim();
        };

        const cleanContent = csvContent.replace(/^\uFEFF/, '').trim();
        const lines = cleanContent.split(/\r?\n/).filter(line => line.trim() !== '');
        const errors: string[] = [];

        if (lines.length === 0) return { total: 0, new: 0, errors: ['Arquivo vazio'] };

        // Note: 'REPLACE' for Users is extremely dangerous (deletes all logins). 
        // We will IGNORE 'REPLACE' mode for Users and always 'MERGE' (Append/Update) for safety, 
        // or just warn in UI. Here we behave as MERGE.

        const sampleSize = Math.min(lines.length, 5);
        let semicolonCount = 0;
        let commaCount = 0;
        for (let i = 0; i < sampleSize; i++) {
            semicolonCount += (lines[i].match(/;/g) || []).length;
            commaCount += (lines[i].match(/,/g) || []).length;
        }
        const separator = semicolonCount >= commaCount ? ';' : ',';

        let newCount = 0;
        const currentUsers = await SupabaseDB.getUsers();

        // Sequential processing required for Auth calls
        for (let i = 0; i < lines.length; i++) {
            if (i === 0) continue; // Skip header
            const line = lines[i];
            const parts = line.split(separator).map(cleanCsvString);

            // Header Expected: Nome; Código Vínculo; Senha; Email; Apelido; Perfil; Clusters; Filiais
            // Previous Template: Nome; ID Login; Senha; Email; Apelido; Perfil; Clusters; Filiais
            if (parts.length >= 4) {
                const name = parts[0];
                const teamMemberId = parts[1]; // "ID Login" / Code
                const password = parts[2];
                const email = parts[3];
                const nickname = parts[4] || name.split(' ')[0];
                const role = parts[5] || 'CONTROLADOR';
                const clusters = parts[6] ? parts[6].split('|') : [];
                const branches = parts[7] ? parts[7].split('|') : [];

                // Validations
                if (!email || !password || !name) {
                    errors.push(`Linha ${i + 1}: Email, Senha e Nome são obrigatórios.`);
                    continue;
                }

                // Check if user exists (by email) to skip or update?
                // UPDATE user password/data if exists? 
                // `createUser` usually fails if email exists. 
                // We will rely on `createUser` logic. If it fails, we assume it exists. 
                // Updating via CSV is harder because we need the UUID.
                // We'll try to find by email in `currentUsers`.
                const existingUser = currentUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());

                if (existingUser) {
                    // Update profile
                    try {
                        const { error } = await supabase.rpc('admin_upsert_profile_v2', {
                            target_id: existingUser.id,
                            new_email: email,
                            new_name: name,
                            new_nickname: nickname,
                            new_role: role,
                            new_clusters: clusters,
                            new_branches: branches,
                            new_team_member_id: teamMemberId
                        });
                        // Note: Password update not supported via simple RPC, requires Admin Auth API.
                        if (error) throw error;
                        // updatedCount++; // We are tracking 'new' mostly.
                    } catch (e: any) {
                        errors.push(`Linha ${i + 1} (Atualização): ${e.message}`);
                    }
                } else {
                    // Create New
                    const result = await SupabaseDB.createUser({
                        email,
                        password,
                        name,
                        nickname,
                        role,
                        allowedClusters: clusters,
                        allowedBranches: branches,
                        teamMemberId
                    });

                    if (result.success) {
                        newCount++;
                    } else {
                        errors.push(`Linha ${i + 1} (Erro ao Criar): ${result.error}`);
                    }
                }
            } else {
                errors.push(`Linha ${i + 1}: Colunas insuficientes`);
            }
        }

        return { total: newCount, new: newCount, errors };
    },

    async importOccurrencesFromCsv(csvContent: string, mode: 'MERGE' | 'REPLACE' = 'MERGE'): Promise<{ total: number, new: number, errors: string[] }> {
        // Fetch geo for mapping
        const geoHierarchy = await SupabaseDB.getGeoHierarchy();
        // Create quick lookup map: BranchName -> ClusterName
        const branchToClusterMap: Record<string, string> = {};
        geoHierarchy.forEach(c => {
            c.branches.forEach(b => {
                branchToClusterMap[b.name.toUpperCase()] = c.name; // Uppercase key for case-insensitive lookup
            });
        });

        const cleanCsvString = (str: string | undefined): string => {
            if (!str) return '';
            return str.replace(/^["']|["']$/g, '').replace(/"/g, '').trim();
        };

        const cleanContent = csvContent.replace(/^\uFEFF/, '').trim();
        const lines = cleanContent.split(/\r?\n/).filter(line => line.trim() !== '');
        const errors: string[] = [];

        if (lines.length === 0) return { total: 0, new: 0, errors: ['Arquivo vazio'] };

        // REPLACE MODE: Delete all occurrences first? 
        // Logic in MockDB was: `currentOccurrences = []`.
        // In Supabase, this is dangerous. Let's assume naive REPLACE means "Delete all".
        // BUT, usually bulk import just appends or updates. 
        // Given the prompt "Import" usually implies append. 
        // If mode is 'REPLACE', we might want to warn or just ignore (MockDB implementation did clear it).
        if (mode === 'REPLACE') {
            const { error } = await supabase.from('occurrences').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
            if (error) {
                console.error("Error clearing occurrences for replace:", error);
                errors.push("Falha ao limpar banco de dados para substituição: " + error.message);
                return { total: 0, new: 0, errors };
            }
        }

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

        lines.forEach((line, index) => {
            if (index === 0) return; // Skip header

            const parts = line.split(separator).map(cleanCsvString);

            // Expected: Data; Hora; ID Tecnico; Nome Tecnico; Categoria; Motivo; Descricao; Filial; Setor; Status?
            // MockDB checked length >= 6
            if (parts.length >= 6) {
                const date = parts[0];
                const time = parts[1];
                const technicianId = parts[2];
                // const technicianName = parts[3]; // Not stored in DB, relational
                const category = parts[4];
                const reason = parts[5];
                const description = parts[6] || '';
                const branch = parts[7] || '';
                const sector = parts[8] || '';
                const statusStr = parts[9] || 'REGISTRADA';

                if (date && technicianId && category) {
                    const derivedCluster = branch ? (branchToClusterMap[branch.toUpperCase()] || 'OUTROS') : '';

                    const newOccPayload = {
                        // id: generated by DB
                        technician_id: technicianId,
                        registered_by: 'IMPORTACAO',
                        date,
                        time,
                        category,
                        reason,
                        description,
                        status: statusStr.toUpperCase() as OccurrenceStatus || OccurrenceStatus.REGISTRADA,
                        escalation_level: 'NONE', // Default
                        branch,
                        sector,
                        cluster: derivedCluster,
                        audit_trail: [{
                            id: `aud_${Date.now()}_${index}`,
                            date: new Date().toISOString(),
                            action: 'IMPORTACAO',
                            user: 'Sistema',
                            details: 'Importado via CSV'
                        }]
                    };
                    insertList.push(newOccPayload);
                    newCount++;
                } else {
                    errors.push(`Linha ${index + 1}: Faltando dados obrigatórios (Data, ID Técnico ou Categoria)`);
                }
            } else {
                errors.push(`Linha ${index + 1}: Colunas insuficientes`);
            }
        });

        if (insertList.length > 0) {
            const chunkSize = 100;
            for (let i = 0; i < insertList.length; i += chunkSize) {
                const chunk = insertList.slice(i, i + chunkSize);
                const { error } = await supabase.from('occurrences').insert(chunk);
                if (error) {
                    console.error("Batch insert error:", error);
                    errors.push(`Erro ao salvar lote iniciando em ${i}: ${error.details || error.message}`);
                }
            }
        }

        return { total: newCount, new: newCount, errors };
    },



    async updateCurrentUserPassword(newPassword: string): Promise<void> {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
    },

    // --- SYSTEM BACKUP & RESTORE ---

    async clearAllData(): Promise<void> {
        // Deleting Occurrences first (depend on Users/Team)
        await supabase.from('occurrences').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        // Deleting Team
        await supabase.from('team_members').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        // We do NOT delete profiles as it deletes Auth users if cascading, or causes issues. 
        // Restore will upsert/overwrite profiles.
    },

    async exportSystemData(): Promise<any> {
        const [team, users, occurrences, reasons, geo] = await Promise.all([
            SupabaseDB.getMyTeam('admin', 'ADMIN'), // Use string literal to avoid enum import issues
            SupabaseDB.getUsers(),
            SupabaseDB.getOccurrences(),
            SupabaseDB.getReasonHierarchy(),
            SupabaseDB.getGeoHierarchy()
        ]);

        return {
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
    },

    async restoreSystemData(backupData: any): Promise<{ success: boolean; errors: string[] }> {
        const errors: string[] = [];
        try {
            // 1. Validate Structure
            if (!backupData.data || !backupData.data.occurrences || !backupData.data.team) {
                return { success: false, errors: ["Arquivo de backup inválido ou corrompido."] };
            }

            // Note: Caller usually calls clearAllData() first, but we can do it here too if not.
            // The UI handles clearAllData call currently, but let's be safe.

            // 3. Restore Configs
            if (backupData.data.configs) {
                if (backupData.data.configs.reasons) await SupabaseDB.saveReasonHierarchy(backupData.data.configs.reasons);
                if (backupData.data.configs.geo) await SupabaseDB.saveGeoHierarchy(backupData.data.configs.geo);
            }

            // 4. Restore Team
            if (backupData.data.team && backupData.data.team.length > 0) {
                // Format for DB
                const teamPayload = backupData.data.team.map((m: any) => ({
                    id: m.id,
                    name: m.name,
                    role: m.role,
                    reports_to_id: m.reportsToId,
                    supervisor_id: m.supervisorId,
                    coordenador_id: m.coordenadorId,
                    gerente_id: m.gerenteId,
                    controlador_id: m.controladorId,
                    cluster: m.cluster,
                    filial: m.filial,
                    segment: m.segment,
                    active: m.active
                }));
                // Batch upsert
                const { error } = await supabase.from('team_members').upsert(teamPayload);
                if (error) errors.push("Erro ao restaurar Equipe: " + error.message);
            }

            // 5. Restore Profiles (Metadata only)
            if (backupData.data.users && backupData.data.users.length > 0) {
                const profilesPayload = backupData.data.users.map((u: any) => ({
                    id: u.id,
                    name: u.name,
                    nickname: u.nickname,
                    email: u.email,
                    role: u.role,
                    allowed_clusters: u.allowedClusters,
                    allowed_branches: u.allowedBranches,
                    avatar_url: u.avatar
                }));
                const { error } = await supabase.from('profiles').upsert(profilesPayload);
                if (error) errors.push("Erro ao restaurar Perfis: " + error.message);
            }

            // 6. Restore Occurrences
            if (backupData.data.occurrences && backupData.data.occurrences.length > 0) {
                const occPayload = backupData.data.occurrences.map((o: any) => ({
                    id: o.id,
                    technician_id: o.userId,
                    registered_by: o.registeredByUserId,
                    date: o.date,
                    time: o.time,
                    category: o.category,
                    reason: o.reason,
                    description: o.description,
                    status: o.status,
                    escalation_level: o.escalationLevel,
                    cluster: o.cluster,
                    branch: o.branch,
                    sector: o.sector,
                    location: o.location,
                    audit_trail: o.auditTrail,
                    feedback: o.feedback
                }));

                // Split into chunks if too large
                const chunkSize = 100;
                for (let i = 0; i < occPayload.length; i += chunkSize) {
                    const chunk = occPayload.slice(i, i + chunkSize);
                    const { error } = await supabase.from('occurrences').upsert(chunk);
                    if (error) errors.push(`Erro ao restaurar Ocorrências (Lote ${i}): ${error.message}`);
                }
            }

            return { success: errors.length === 0, errors };

        } catch (e: any) {
            console.error("Critical Restore Error:", e);
            return { success: false, errors: [e.message] };
        }
    },

    // --- SYSTEM ASSETS (Storage) ---
    async uploadSystemAsset(file: File, fileName: string = 'bg_login.png'): Promise<{ success: boolean; url?: string; error?: string }> {
        try {
            const bucket = 'system-assets';

            // Upload file (replace if exists)
            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(fileName, file, {
                    upsert: true,
                    cacheControl: '3600'
                });

            if (error) {
                // Try detecting if bucket missing
                if (error.message.includes("bucket not found")) {
                    return { success: false, error: "Bucket 'system-assets' não encontrado. Crie-o no painel do Supabase (Storage > New Bucket > 'system-assets' > Public)." };
                }
                throw error;
            }

            // Get Public URL
            const { data: publicUrlData } = supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);

            // Add a timestamp to force refresh on clients
            const finalUrl = `${publicUrlData.publicUrl}?t=${new Date().getTime()}`;

            return { success: true, url: finalUrl };

        } catch (e: any) {
            console.error("Asset Upload Error:", e);
            return { success: false, error: e.message || "Erro desconhecido no upload." };
        }
    },

    getSystemAssetUrl(fileName: string = 'bg_login.png'): string {
        const { data } = supabase.storage
            .from('system-assets')
            .getPublicUrl(fileName);
        return data.publicUrl;
    }
};
